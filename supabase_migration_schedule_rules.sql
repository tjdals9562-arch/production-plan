-- ═══════════════════════════════════════════════════════════════════
--  schedule_rules 테이블 생성
--  Supabase Dashboard > SQL Editor 에서 실행하세요
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS schedule_rules (
  id            BIGSERIAL PRIMARY KEY,
  rule_type     TEXT NOT NULL,          -- process_day, worker_fix, equip_block, process_equip
  target_name   TEXT NOT NULL,          -- 대상 (공정명/작업자명/설비명)
  days          TEXT[] DEFAULT '{}',    -- 적용 요일 ['월','화','수']
  process_name  TEXT,                   -- worker_fix: 고정 공정명
  equip_name    TEXT,                   -- process_equip: 지정 설비명
  is_active     BOOLEAN DEFAULT true,
  note          TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- RLS 비활성화 (내부 시스템용)
ALTER TABLE schedule_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON schedule_rules
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_schedule_rules_type ON schedule_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_schedule_rules_active ON schedule_rules(is_active);
