-- 1. 文档表加 tags 字段
ALTER TABLE "Document"
ADD COLUMN IF NOT EXISTS "tags" TEXT NOT NULL DEFAULT '';

-- 2. 启用 pg_trgm 扩展（三元组模糊匹配，支撑混合搜索）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 3. 在 DocumentChunk.content 上建 GIN 索引，加速全文检索
CREATE INDEX IF NOT EXISTS idx_chunk_content_trgm
  ON "DocumentChunk" USING gin ("content" gin_trgm_ops);
