# 🏕️ Game Pramuka

Latihan sandi morse, semaphore, dan cerdas cermat untuk pramuka Indonesia.

https://game-morse.vercel.app

## Fitur

- **Tebak Morse** — tebak huruf dari kode morse (visual + suara)
- **Ketik Morse** — ketik kode morse untuk huruf yang ditampilkan
- **Semaphore** — tebak posisi bendera semaphore + chart referensi
- **Cerdas Cermat** — 25 soal pramuka, waktu 40 menit, skor kumulatif
- **Peringkat** — leaderboard per game + global (akumulasi semua game)
- **Mode Malam** — toggle 🌙 di player bar
- **Admin Panel** — kelola skor (edit/hapus) dengan password
- **PWA** — bisa di-install ke home screen, dukung offline

## Teknologi

- Static HTML + CSS + JS (vanilla, no bundler)
- Vercel serverless API (`api/score.js`)
- Redis (Upstash / Vercel KV) untuk penyimpanan skor global
- Service worker untuk cache offline

## Pengembangan

```bash
npm run dev       # vercel dev — serve lokal
npm run deploy    # vercel --prod
```

## Konfigurasi

| Variabel | Fungsi |
|---|---|
| `ADMIN_PASSWORD` | Password admin panel (default: `admin123`) |
| `UPSTASH_REDIS_REST_URL` | Redis REST URL untuk penyimpanan global |
| `UPSTASH_REDIS_REST_TOKEN` | Redis REST token |

Tanpa Redis, skor tersimpan di memory (hilang saat cold start).

## Struktur File

```
├── index.html         # Seluruh frontend (CSS + JS inline)
├── api/score.js       # API serverless untuk CRUD skor
├── sw.js              # Service worker PWA
├── manifest.json      # Manifest PWA
├── favicon.png        # Icon 1024×1024
├── icon-192.png       # Icon PWA 192×192
├── icon-512.png       # Icon PWA 512×512
└── AGENTS.md          # Konteks proyek untuk AI agent
```
