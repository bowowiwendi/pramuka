// ========================================
// API Peringkat Morse Pramuka — Vercel
// Support: Upstash Redis, Vercel KV, fallback
// Parameter `game` untuk pisah per mode
// ========================================

const morseScores = [];
const semaScores = [];
const ccScores = [];

function getStore(game) {
  if (game === 'cc') return ccScores;
  if (game === 'semaphore') return semaScores;
  return morseScores;
}

function getPrefix(game) {
  if (game === 'cc') return 'ccscore:';
  if (game === 'semaphore') return 'semascore:';
  return 'morsescore:';
}

function createRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) return { url, token };
  return null;
}

async function redisGet(redis, key) {
  const res = await fetch(`${redis.url}/get/${key}`, {
    headers: { Authorization: `Bearer ${redis.token}` },
  });
  const data = await res.json();
  return data.result !== undefined && data.result !== null ? Number(data.result) : null;
}

async function redisSet(redis, key, value) {
  await fetch(`${redis.url}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redis.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
}

async function redisDel(redis, key) {
  await fetch(`${redis.url}/del/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redis.token}` },
  });
}

async function redisKeys(redis, pattern) {
  const res = await fetch(`${redis.url}/keys/${pattern}`, {
    headers: { Authorization: `Bearer ${redis.token}` },
  });
  const data = await res.json();
  return Array.isArray(data.result) ? data.result : [];
}

function getAdminPass() {
  return process.env.ADMIN_PASSWORD || 'admin123';
}

// === ADMIN HANDLER ===
async function handleAdmin(req, res) {
  const { password, action, game, name, newName, score } = req.body || {};

  if (password !== getAdminPass()) {
    return res.status(403).json({ error: 'Password salah' });
  }

  const redis = createRedisClient();

  if (redis) {
    try {
      if (action === 'list') {
        const allGames = ['morse', 'semaphore', 'cc'];
        const result = {};
        for (const g of allGames) {
          const prefix = getPrefix(g);
          const keys = await redisKeys(redis, `${prefix}*`);
          const entries = [];
          for (const key of keys) {
            const n = key.replace(prefix, '');
            const val = await redisGet(redis, key);
            if (val !== null) entries.push({ name: n, score: val });
          }
          entries.sort((a, b) => b.score - a.score);
          result[g] = entries;
        }
        return res.json(result);
      }

      if (action === 'delete') {
        const prefix = getPrefix(game || '');
        await redisDel(redis, `${prefix}${name}`);
        return res.json({ ok: true });
      }

      if (action === 'update') {
        const prefix = getPrefix(game || '');
        const key = `${prefix}${name}`;
        const newKey = newName && newName !== name ? `${prefix}${newName}` : key;
        if (newKey !== key) await redisDel(redis, key);
        await redisSet(redis, newKey, score);
        return res.json({ ok: true });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Redis error: ' + err.message });
    }
  }

  // Fallback in-memory
  if (action === 'list') {
    const result = {
      morse: [...morseScores].sort((a, b) => b.score - a.score),
      semaphore: [...semaScores].sort((a, b) => b.score - a.score),
      cc: [...ccScores].sort((a, b) => b.score - a.score)
    };
    return res.json(result);
  }

  if (action === 'delete') {
    const store = getStore(game || '');
    const idx = store.findIndex(s => s.name === name);
    if (idx !== -1) store.splice(idx, 1);
    return res.json({ ok: true });
  }

  if (action === 'update') {
    const store = getStore(game || '');
    const entry = store.find(s => s.name === name);
    if (entry) {
      if (newName && newName !== name) entry.name = newName;
      entry.score = score;
      store.sort((a, b) => b.score - a.score);
    }
    return res.json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}

// === MAIN HANDLER ===
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Route admin actions
  const body = req.body || {};
  if (body.action === 'list' || body.action === 'delete' || body.action === 'update') {
    return handleAdmin(req, res);
  }

  const redis = createRedisClient();
  const game = body.game || req.query?.game || '';
  const prefix = getPrefix(game);

  if (redis) {
    try {
      if (req.method === 'POST') {
        const { name, score } = body;
        if (!name || typeof score !== 'number') {
          return res.status(400).json({ error: 'Field name (string) dan score (number) wajib' });
        }
        const key = `${prefix}${name}`;
        const existing = await redisGet(redis, key);
        const newScore = existing !== null ? Math.max(existing, score) : score;
        await redisSet(redis, key, newScore);
        return res.json({ ok: true });
      }

      if (req.method === 'GET') {
        const keys = await redisKeys(redis, `${prefix}*`);
        const entries = [];
        for (const key of keys) {
          const n = key.replace(prefix, '');
          const val = await redisGet(redis, key);
          if (val !== null) entries.push({ name: n, score: val });
        }
        entries.sort((a, b) => b.score - a.score);
        return res.json(entries);
      }
    } catch (err) {
      return res.status(500).json({ error: 'Redis error: ' + err.message });
    }
  }

  const store = getStore(game);

  if (req.method === 'POST') {
    const { name, score } = body;
    if (!name || typeof score !== 'number') {
      return res.status(400).json({ error: 'Field name (string) dan score (number) wajib' });
    }
    const existing = store.find(s => s.name === name);
    if (existing) existing.score = Math.max(existing.score, score);
    else store.push({ name, score });
    store.sort((a, b) => b.score - a.score);
    if (store.length > 100) store.length = 100;
    return res.json({ ok: true, note: 'in-memory' });
  }

  if (req.method === 'GET') {
    return res.json(store.slice(0, 100));
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
