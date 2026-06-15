ALTER TABLE "Document"
ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "parentDocumentId" TEXT;

CREATE TABLE IF NOT EXISTS "MessageFeedback" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageFeedback_pkey" PRIMARY KEY ("id")
);
