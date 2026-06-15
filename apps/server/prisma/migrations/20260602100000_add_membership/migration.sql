-- AlterTable: User
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "membership" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS "membershipExpiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "maxKnowledgeBases" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS "maxDocuments" INTEGER NOT NULL DEFAULT 10;

-- CreateIndex: User phone unique
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");

-- CreateTable: SmsCode
CREATE TABLE IF NOT EXISTS "SmsCode" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmsCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PaymentOrder
CREATE TABLE IF NOT EXISTS "PaymentOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outTradeNo" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "totalAmount" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "membership" TEXT NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: PaymentOrder outTradeNo unique
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentOrder_outTradeNo_key" ON "PaymentOrder"("outTradeNo");
