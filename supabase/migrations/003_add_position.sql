-- 작업자 마스터에 직급 추가 (계장/반장은 일 우선순위 배정에서 제외하기 위함)
ALTER TABLE workers ADD COLUMN IF NOT EXISTS position TEXT DEFAULT '';
