@echo off
echo Starting SamDesk...
cd /d "%~dp0"
set DATABASE_URL=file:./prisma/dev.db
set NEXTAUTH_SECRET=samdesk-secret-2024
set NEXTAUTH_URL=http://localhost:3000
npx prisma@6 db push
npm run dev
