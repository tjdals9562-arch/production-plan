-- ═══════════════════════════════════════════════════════════════════
--  schedule_results 테이블 생성 (자동 계획 생성 결과 저장)
--  Supabase Dashboard > SQL Editor 에서 실행하세요
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS schedule_results (
  id          BIGSERIAL PRIMARY KEY,
  label       TEXT NOT NULL,
  priority    TEXT,
  start_date  DATE,
  tasks       JSONB DEFAULT '[]',
  stat_total  INTEGER DEFAULT 0,
  stat_risk   INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE schedule_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON schedule_results
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_schedule_results_created ON schedule_results(created_at DESC);
