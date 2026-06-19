-- 수주 테이블
CREATE TABLE IF NOT EXISTS orders (
  id           BIGSERIAL PRIMARY KEY,
  job_no       TEXT UNIQUE,
  product_code TEXT,
  product_name TEXT,
  spec         TEXT,
  group_code   TEXT,
  order_no     TEXT,
  order_qty    INTEGER     DEFAULT 0,
  remain_qty   INTEGER     DEFAULT 0,
  order_date   DATE,
  due_date     DATE,
  orig_due_date DATE,
  plan_date    DATE,
  prod_complete DATE,
  pack_complete DATE,
  ship_date    DATE,
  customer     TEXT,
  dept         TEXT,
  status       TEXT        DEFAULT '신규',
  progress     INTEGER     DEFAULT 0,
  batch_label  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 수주 묶음 (배치)
CREATE TABLE IF NOT EXISTS order_batches (
  id        BIGSERIAL PRIMARY KEY,
  label     TEXT UNIQUE NOT NULL,
  row_count INTEGER     DEFAULT 0,
  saved_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 작업자 마스터
CREATE TABLE IF NOT EXISTS workers (
  id                   BIGSERIAL PRIMARY KEY,
  emp_id               TEXT UNIQUE,
  name                 TEXT NOT NULL,
  primary_process      TEXT,
  secondary_processes  JSONB       DEFAULT '[]',
  work_days            JSONB       DEFAULT '["월","화","수","목","금"]',
  day_hours            INTEGER     DEFAULT 8,
  overtime             INTEGER     DEFAULT 0,
  note                 TEXT        DEFAULT '',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 설비 마스터
CREATE TABLE IF NOT EXISTS equipment (
  id         BIGSERIAL PRIMARY KEY,
  equip_id   TEXT UNIQUE,
  name       TEXT NOT NULL,
  process    TEXT,
  day_hours  INTEGER     DEFAULT 8,
  shift      TEXT        DEFAULT '주간',
  status     TEXT        DEFAULT '가동',
  setup_time NUMERIC     DEFAULT 0.5,
  note       TEXT        DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 공정경로 (제품별)
CREATE TABLE IF NOT EXISTS process_routes (
  id           BIGSERIAL PRIMARY KEY,
  product_code TEXT UNIQUE NOT NULL,
  product_name TEXT,
  spec         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 공정경로 단계
CREATE TABLE IF NOT EXISTS process_route_steps (
  id          BIGSERIAL PRIMARY KEY,
  route_id    BIGINT  NOT NULL REFERENCES process_routes(id) ON DELETE CASCADE,
  seq         INTEGER NOT NULL,
  name        TEXT,
  time_per_ea NUMERIC DEFAULT 0,
  setup_time  NUMERIC DEFAULT 0,
  workers     INTEGER DEFAULT 1,
  equip       TEXT    DEFAULT '—'
);

-- RLS 비활성화 (내부 전용 도구)
ALTER TABLE orders              DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_batches       DISABLE ROW LEVEL SECURITY;
ALTER TABLE workers             DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipment           DISABLE ROW LEVEL SECURITY;
ALTER TABLE process_routes      DISABLE ROW LEVEL SECURITY;
ALTER TABLE process_route_steps DISABLE ROW LEVEL SECURITY;
