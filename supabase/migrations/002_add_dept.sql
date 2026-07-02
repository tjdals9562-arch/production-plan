-- 작업자 마스터에 소속반 추가
ALTER TABLE workers ADD COLUMN IF NOT EXISTS dept TEXT DEFAULT '';

-- 공정라우팅 단계에 작업구분(소속반) 추가
ALTER TABLE process_route_steps ADD COLUMN IF NOT EXISTS dept TEXT DEFAULT '';
