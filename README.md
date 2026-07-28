# erhan-flowers-panel

Phase 1 MVP ERP admin panel for Erhan Flowers.

## Stack

- Frontend: Next.js, Tailwind CSS
- Backend: NestJS
- Database: PostgreSQL
- ORM: Prisma
- Auth: Email and password, system owner only
- Storage: Local upload folder for MVP

## Local Setup

1. Install Node.js 20+ and Docker Desktop.
2. Start PostgreSQL:

```bash
docker compose up -d postgres
```

3. Configure backend:

```bash
cd backend
copy .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed
npm run start:dev
```

4. Configure frontend:

```bash
cd frontend
npm install
npm run dev
```

5. Open `http://localhost:3000`.

Default owner:

- Email: `owner@erhanflowers.com`
- Password: `ErhanFlowers123!`

## MVP Flow

Login -> Add Product -> Generate Model Code -> Generate Barcode -> Upload Image -> See Dashboard Counts.

## Photoroom Integration

OpenAI integration is intentionally not included in Phase 1.

Product names, descriptions, categories, model codes, SEO text, and social media content are prepared manually and entered into the ERP by the user.

Photoroom is available only in the Media Center as a manual image action. It does not run automatically. API secrets must stay in `backend/.env`:

```bash
PHOTOROOM_API_URL="https://image-api.photoroom.com/v2/edit"
PHOTOROOM_API_KEY="your-photoroom-api-key"
```
