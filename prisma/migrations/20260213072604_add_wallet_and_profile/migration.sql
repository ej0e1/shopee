-- CreateTable
CREATE TABLE "ShopeeToken" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopeeToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "shopeeItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'NORMAL',
    "shopId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isAutoBump" BOOLEAN NOT NULL DEFAULT false,
    "lastBumpedAt" TIMESTAMP(3),
    "variants" JSONB,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationSetting" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),

    CONSTRAINT "AutomationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopeeOrder" (
    "id" TEXT NOT NULL,
    "shopId" INTEGER NOT NULL,
    "orderSn" TEXT NOT NULL,
    "buyerName" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "createTime" TIMESTAMP(3) NOT NULL,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productNames" TEXT,

    CONSTRAINT "ShopeeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Seller Pro',
    "totalEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopeeToken_shopId_key" ON "ShopeeToken"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_shopeeItemId_key" ON "Product"("shopeeItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopeeOrder_orderSn_key" ON "ShopeeOrder"("orderSn");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_referenceId_key" ON "WalletTransaction"("referenceId");
