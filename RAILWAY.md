# Railway Deployment Guide

This project is optimized for deployment on [Railway](https://railway.app).

## Deployment Steps

1. **Connect GitHub**: Create a new project on Railway and connect this repository: `ej0e1/shopee`.
2. **Setup Database**: 
   - Click **"New"** -> **"Database"** -> **"Add PostgreSQL"**.
   - Railway will automatically add the `DATABASE_URL` variable to your main service once the database is provisioned.
3. **Setup Variables**: Add the following Environment Variables in Railway settings for your web service:
   - `DATABASE_URL`: Add a MySQL or PostgreSQL service and let Railway provide this.
   - `SHOPEE_PARTNER_ID`: From Shopee Partner Console.
   - `SHOPEE_PARTNER_KEY`: From Shopee Partner Console.
   - `SHOPEE_REDIRECT_URL`: `https://your-app.up.railway.app/api/shopee/auth/callback`
   - `NEXT_PUBLIC_APP_URL`: `https://your-app.up.railway.app`
   - `SHOPEE_BASE_URL`: `https://partner.shopeemobile.com/api/v2` (for Production).
   - `SHOPEE_HOST`: `https://partner.shopeemobile.com` (for Production).

## Automated Features

- **Prisma Generation**: Automatically runs during build (`prisma generate`).
- **Background Automation**: The auto-bump service starts automatically via `instrumentation.ts` when the server boots.

## Verification
- Visit `/orders` to switch between marketplaces.
- Visit `/shopee` to connect your production account.
