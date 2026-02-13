### Start Database

Run:

docker compose up -d

Then:

npx prisma generate
npx prisma migrate dev --name init
