-- ═══════════════════════════════════════════════════════════════════
--  bom_items 테이블 생성 (완제품 → 부품 구성, 단일 레벨 BOM)
--  Supabase Dashboard > SQL Editor 에서 실행하세요
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bom_items (
  id           BIGSERIAL PRIMARY KEY,
  product_code TEXT NOT NULL,
  product_name TEXT,
  part_code    TEXT NOT NULL,
  part_name    TEXT,
  qty_per      NUMERIC DEFAULT 1,
  unit         TEXT DEFAULT 'EA',
  note         TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bom_items DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_bom_items_product ON bom_items(product_code);
