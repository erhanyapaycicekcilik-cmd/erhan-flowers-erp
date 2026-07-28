# Database

The Phase 1 database is managed by Prisma in `backend/prisma/schema.prisma`.

Tables:

- users
- categories
- products
- media_files
- barcode_logs

Run migrations from the backend folder:

```bash
npx prisma migrate dev --name init
```

