# FLORAX Vercel Deployer — Clean

### Deploy
1. Upload folder project ini ke GitHub atau langsung import ke Vercel.
2. Di Vercel buka **Project Settings → Environment Variables**.
3. Tambahkan:
   - `VERCEL_TOKEN` = token Vercel kamu
   - `VERCEL_TEAM_ID` = opsional, hanya untuk Team
4. Bisa pakai tombol **Import .env** di Vercel kalau kamu memang sudah punya file `.env`. Token tetap tidak ditulis di frontend.
5. Deploy.

### Video
Edit satu baris di `public/app.js`:

```js
const HERO_VIDEO_URL = "https://www.image2url.com/r2/default/videos/1787982481527-74f5d3f0-661f-47bb-a5df-d6d54d0e803f.mp4";
```

Tidak perlu menyimpan file video di project.

### Catatan
Vercel membatasi ukuran payload Function. Versi ini sengaja dibuat untuk website kecil. Untuk website besar, paling aman memakai Vercel Drop atau upload langsung ke Vercel. 

### Struktur
```text
florax-vercel-deployer/
├── api/
│   ├── deploy.js
│   └── package.json
├── public/
│   ├── app.js
│   ├── index.html
│   └── style.css
├── package.json
├── vercel.json
└── README.md
```
By ferry 
code public Free byFerry 
