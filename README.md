# ALJABR AI Business Operations Platform — AI Command Center

**ALJABR AI Business Operations Platform** tarkibidagi korporativ **AI Command Center** va **AI Tasks** moduli.

## Arxitektura

```text
Frontend (React 19 + TypeScript Strict + Tailwind CSS v4)
   └──► Same-Origin BFF (/api/v1/* — Express server.ts)
           └──► FastAPI Business Backend (server-side FASTAPI_BACKEND_URL)
                   └──► AI Engine / Gemini Server SDK
```

- **Yagona Platforma:** Umumiy Sidebar, Header, Navigation, Tashkilot (Tenant) almashtirgich va Frontend 1 SSO sessiya modeli. Alohida Login/Registration yoki `?embed` bypass mavjud emas.
- **TypeScript Strict Mode:** `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`.
- **BFF API standarti (`/api/v1/*`):**
  - `GET /api/v1/auth/session` — Frontend 1 sessiyasini tekshirish
  - `POST /api/v1/auth/signout` — sessiyani yopish va maxfiy lokal keshni tozalash
  - `GET /api/v1/system/config` — faqat o‘qish uchun server konfiguratsiyasi
  - `GET /api/v1/chats` — tashkilot va foydalanuvchi bo‘yicha ajratilgan suhbatlar
  - `POST /api/v1/chat/stream` — `text/event-stream` (SSE) real vaqtli javob oqimi (`AbortController` bilan to‘xtatish)
  - `POST /api/v1/files/upload` — server va mijoz tomonida tekshiriladigan fayl yuklash (`PDF, DOCX, XLSX, CSV, TXT, PNG, JPG`, maks. 10 MB)
  - `GET /api/v1/tasks` & `POST /api/v1/tasks/:id/decision` — AI Tasks ro‘yxati va ruxsat etilgan operatsion tasdiqlashlar (moliyaviy to‘lov amallari bloklangan)

## Ishga tushirish

```bash
npm install
npm run dev
```

Brauzerda `http://localhost:3000` manzilini oching.

## Sifat, Test va Audit Buyruqlari

```bash
npm run lint        # TypeScript strict check + ESLint
npm test            # Vitest unit va integratsiya testlari
npm run build       # Production build
npm run test:e2e    # Playwright E2E testlari
```

## Muhit O‘zgaruvchilari (`.env.example`)

`.env.example` faylidan nusxa olib `.env` yarating (`.env` Git’dan himoyalangan):

- `GEMINI_API_KEY` — Server BFF ichida ixtiyoriy jonli AI streaming uchun
- `FASTAPI_BACKEND_URL` — Server BFF orqali FastAPI Business Backend manzili (brauzerga uzatilmaydi)
- `API_MODE` — `demo` (standart) yoki `live`
