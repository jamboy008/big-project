# ALJABR Platform

Bitta loyiha: ALJABR sayti (`/`) va AI yordamchi (`/ai`).

## Ishga tushirish

    npm install
    npm run dev

Brauzerda http://localhost:5173 ni oching.

## Sahifalar

- `/` bosh sahifa, `/mahsulotlar`, `/narxlar`, `/biz-haqimizda`, `/aloqa`, `/ariza`
- `/kirish` va `/kabinet` (sayt va AI uchun umumiy akkaunt)
- `/ai` AI yordamchi (landing, kirish, chat, sozlamalar)

## Backend ulash

`.env.example` ni `.env` qilib nusxalang va `VITE_API_URL=https://sizning-backend.uz` yozing.

- `POST /applications` ariza formasi
- `POST /contact` aloqa formasi
- `POST /chat` AI chat: `{ message, history, company, site }` yuboriladi, `{ reply }` kutiladi

`VITE_API_URL` bo'sh bo'lsa, hammasi demo rejimda ishlaydi.
Kirish hozircha brauzer localStorage'da (`src/hooks/useAuth.js`), backend tayyor bo'lgach shu faylni API chaqiruvlariga almashtiring.

## Deploy

`npm run build`, so'ng `dist` papkasini Netlify yoki Vercel'ga joylang (`_redirects` va `vercel.json` tayyor).
