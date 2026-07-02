import * as XLSX from 'xlsx'

function downloadExcel(sheetData, fileName, sheetName = 'Sheet1') {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(sheetData)

  const colWidths = sheetData[0].map((h, i) => {
    const maxLen = Math.max(h.length, ...sheetData.slice(1).map(r => String(r[i] ?? '').length))
    return { wch: Math.min(Math.max(maxLen * 2 + 2, 10), 30) }
  })
  ws['!cols'] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, fileName)
}

// ── 공정 마스터 템플릿 ────────────────────────────────────────────
export function downloadProcessTemplate() {
  const data = [
    ['공정코드', '공정명', '소속반', '분류', '표준시간(분/EA)', '정렬순서', '사용여부', '비고'],
    ['M01', '절곡', '제관반', '성형', 20, 10, 'Y', ''],
    ['M02', '태핑', '제관반', '기타', 10, 11, 'Y', ''],
    ['M03', '용접', '제관반', '용접', 60, 12, 'Y', ''],
    ['M04', '도장', '제관반', '도장', 30, 13, 'Y', ''],
    ['M05', '프레스', '제관반', '성형', 15, 14, 'Y', ''],
    ['M06', '포장', '제관반', '기타', 10, 15, 'Y', ''],
    ['A01', '랜딩도어조립', '조립반', '조립', 60, 20, 'Y', ''],
    ['A02', '로프행거제작', '조립반', '조립', 40, 21, 'Y', ''],
    ['A03', '랜딩도어포장', '조립반', '기타', 20, 22, 'Y', ''],
    ['A04', '브라켓볼트포장', '조립반', '기타', 15, 23, 'Y', ''],
    ['A05', '카도어포장', '조립반', '기타', 20, 24, 'Y', ''],
  ]
  downloadExcel(data, '공정마스터_양식.xlsx', '공정마스터')
}

const PROC_COL_MAP = {
  '공정코드':'code', '코드':'code', 'Code':'code',
  '공정명':'name', '공정':'name', 'Process':'name',
  '소속반':'dept', '부서':'dept', '반':'dept', 'Dept':'dept',
  '분류':'category', '카테고리':'category', 'Category':'category',
  '표준시간(분/EA)':'stdTime', '표준시간':'stdTime', '시간(분)':'stdTime', '분/EA':'stdTime',
  '정렬순서':'sortOrder', '순서':'sortOrder', 'Order':'sortOrder',
  '사용여부':'isActive', '활성':'isActive', 'Active':'isActive',
  '비고':'note', 'Note':'note', '메모':'note',
}

export function parseProcessExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        if (raw.length < 2) { reject(new Error('데이터 없음')); return }

        let hIdx = 0
        for (let i = 0; i < Math.min(5, raw.length); i++) {
          if (raw[i].some(c => Object.keys(PROC_COL_MAP).includes(String(c).trim()))) { hIdx = i; break }
        }
        const headers = raw[hIdx].map(h => String(h).trim())
        const rows = raw.slice(hIdx + 1).filter(r => r.some(c => c !== ''))

        const result = rows.map(row => {
          const obj = {}
          headers.forEach((h, i) => { const f = PROC_COL_MAP[h]; if (f) obj[f] = row[i] ?? '' })
          const active = String(obj.isActive || 'Y').toUpperCase()
          return {
            code: String(obj.code || '').trim(),
            name: String(obj.name || '').trim(),
            dept: String(obj.dept || '').trim(),
            category: String(obj.category || '').trim(),
            stdTime: parseInt(obj.stdTime) || 0,
            sortOrder: parseInt(obj.sortOrder) || 0,
            isActive: active !== 'N' && active !== '비활성' && active !== 'FALSE' && active !== '0',
            note: String(obj.note || '').trim(),
          }
        }).filter(p => p.name)

        resolve(result)
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ── 작업자 마스터 템플릿 ──────────────────────────────────────────
export function downloadWorkerTemplate() {
  const data = [
    ['사번', '이름', '소속반', '주력공정', '겸직공정(쉼표구분)', '근무요일(쉼표구분)', '기본근무시간(h)', '잔업가능시간(h)', '비고'],
    ['EMP-001', '김철수', '제관반', '용접', '레이저', '월,화,수,목,금', 8, 2, ''],
    ['EMP-002', '이영희', '제관반', '레이저', '절곡', '월,화,수,목,금', 8, 0, ''],
    ['EMP-003', '박민준', '제관반', '도장', '', '월,화,수,목,금', 8, 0, ''],
    ['EMP-004', '정수진', '조립반', '랜딩도어조립', '절곡,태핑', '월,화,수,목,금', 8, 0, ''],
    ['EMP-005', '최민호', '제관반', '레이저', '용접', '월,화,수,목', 8, 4, '목요일까지 근무'],
    ['EMP-006', '강지원', '제관반', '절곡', '레이저,태핑', '월,화,수,목,금', 8, 0, ''],
  ]
  downloadExcel(data, '작업자마스터_양식.xlsx', '작업자')
}

const WORKER_COL_MAP = {
  '사번':'empId', '직원번호':'empId', 'EmpId':'empId', 'ID':'empId',
  '이름':'name', '성명':'name', '작업자':'name', 'Name':'name',
  '소속반':'dept', '반':'dept', '부서':'dept', 'Dept':'dept',
  '주력공정':'primary', '주공정':'primary', '담당공정':'primary', 'Primary':'primary',
  '겸직공정(쉼표구분)':'secondary', '겸직공정':'secondary', '보조공정':'secondary', 'Secondary':'secondary',
  '근무요일(쉼표구분)':'days', '근무요일':'days', '근무일':'days', 'Days':'days',
  '기본근무시간(h)':'dayHours', '기본시간':'dayHours', '근무시간':'dayHours', 'Hours':'dayHours',
  '잔업가능시간(h)':'overtime', '잔업시간':'overtime', '잔업':'overtime', 'Overtime':'overtime',
  '비고':'note', 'Note':'note', '메모':'note',
}

export function parseWorkerExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        if (raw.length < 2) { reject(new Error('데이터 없음')); return }

        let hIdx = 0
        for (let i = 0; i < Math.min(5, raw.length); i++) {
          if (raw[i].some(c => Object.keys(WORKER_COL_MAP).includes(String(c).trim()))) { hIdx = i; break }
        }
        const headers = raw[hIdx].map(h => String(h).trim())
        const rows = raw.slice(hIdx + 1).filter(r => r.some(c => c !== ''))

        const result = rows.map(row => {
          const obj = {}
          headers.forEach((h, i) => { const f = WORKER_COL_MAP[h]; if (f) obj[f] = row[i] ?? '' })
          const secStr = String(obj.secondary || '')
          const dayStr = String(obj.days || '월,화,수,목,금')
          return {
            empId: String(obj.empId || '').trim(),
            name: String(obj.name || '').trim(),
            dept: String(obj.dept || '').trim(),
            primary: String(obj.primary || '').trim(),
            secondary: secStr ? secStr.split(/[,，、\s]+/).map(s => s.trim()).filter(Boolean) : [],
            days: dayStr.split(/[,，、\s]+/).map(s => s.trim()).filter(Boolean),
            dayHours: parseInt(obj.dayHours) || 8,
            overtime: parseInt(obj.overtime) || 0,
            note: String(obj.note || '').trim(),
          }
        }).filter(w => w.name)

        resolve(result)
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ── 설비 마스터 템플릿 ────────────────────────────────────────────
export function downloadEquipTemplate() {
  const data = [
    ['설비코드', '설비명', '담당공정', '운영시프트', '일일가동시간(h)', '셋업시간(h)', '가동상태', '비고'],
    ['EQ-001', '파이버 레이저 #1', '레이저', '주/야', 16, 0.5, '가동', ''],
    ['EQ-002', '파이버 레이저 #2', '레이저', '주간', 8, 0.5, '가동', ''],
    ['EQ-003', 'CNC 벤딩 #1', '절곡', '주간', 8, 0.3, '가동', ''],
    ['EQ-004', 'CO2 용접 라인 #1', '용접', '주/야', 16, 0.5, '가동', ''],
    ['EQ-005', '도장 부스 #1', '도장', '주간', 8, 1.0, '가동', ''],
  ]
  downloadExcel(data, '설비마스터_양식.xlsx', '설비')
}

const EQUIP_COL_MAP = {
  '설비코드':'equipId', '코드':'equipId', 'EquipId':'equipId', 'ID':'equipId',
  '설비명':'name', '이름':'name', 'Name':'name',
  '담당공정':'process', '공정':'process', 'Process':'process',
  '운영시프트':'shift', '시프트':'shift', 'Shift':'shift',
  '일일가동시간(h)':'dayHours', '가동시간':'dayHours', '가동시간(h)':'dayHours', 'Hours':'dayHours',
  '셋업시간(h)':'setupTime', '셋업시간':'setupTime', 'Setup':'setupTime',
  '가동상태':'status', '상태':'status', 'Status':'status',
  '비고':'note', 'Note':'note', '메모':'note',
}

export function parseEquipExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        if (raw.length < 2) { reject(new Error('데이터 없음')); return }

        let hIdx = 0
        for (let i = 0; i < Math.min(5, raw.length); i++) {
          if (raw[i].some(c => Object.keys(EQUIP_COL_MAP).includes(String(c).trim()))) { hIdx = i; break }
        }
        const headers = raw[hIdx].map(h => String(h).trim())
        const rows = raw.slice(hIdx + 1).filter(r => r.some(c => c !== ''))

        const result = rows.map(row => {
          const obj = {}
          headers.forEach((h, i) => { const f = EQUIP_COL_MAP[h]; if (f) obj[f] = row[i] ?? '' })
          return {
            equipId: String(obj.equipId || '').trim(),
            name: String(obj.name || '').trim(),
            process: String(obj.process || '').trim(),
            shift: String(obj.shift || '주간').trim(),
            dayHours: parseFloat(obj.dayHours) || 8,
            setupTime: parseFloat(obj.setupTime) || 0,
            status: String(obj.status || '가동').trim(),
            note: String(obj.note || '').trim(),
          }
        }).filter(eq => eq.name)

        resolve(result)
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ── 공정라우팅 템플릿 ─────────────────────────────────────────────
export function downloadRouteTemplate() {
  const data = [
    ['제품코드', '품명', '규격', '공정순서', '공정명', '작업구분', 'EA당시간(분)', '셋업시간(분)', '인원', '설비'],
    ['4UF0062*A', 'SILL SUPPORT', 'T4.5*60*109 W', 1, '레이저', '제관반', 30, 30, 1, '파이버 레이저 #1'],
    ['4UF0062*A', 'SILL SUPPORT', 'T4.5*60*109 W', 2, '절곡', '제관반', 18, 18, 1, 'CNC 벤딩 #1'],
    ['4UF0062*A', 'SILL SUPPORT', 'T4.5*60*109 W', 3, '태핑', '제관반', 12, 12, 1, '태핑 머신'],
    ['4UF0062*A', 'SILL SUPPORT', 'T4.5*60*109 W', 4, '포장', '제관반', 6, 0, 1, '—'],
    ['3HH-001B', 'HH-프레임 ASSY', 'T3.2 SS400', 1, '레이저', '제관반', 48, 30, 1, '파이버 레이저 #2'],
    ['3HH-001B', 'HH-프레임 ASSY', 'T3.2 SS400', 2, '용접', '제관반', 90, 30, 2, 'CO2 용접 #1'],
    ['3HH-001B', 'HH-프레임 ASSY', 'T3.2 SS400', 3, '도장', '제관반', 30, 60, 1, '도장 부스 #1'],
    ['3HH-001B', 'HH-프레임 ASSY', 'T3.2 SS400', 4, '랜딩도어조립', '조립반', 48, 18, 2, '—'],
  ]
  downloadExcel(data, '공정라우팅_양식.xlsx', '공정라우팅')
}

// ── BOM(부품구성) 템플릿 ──────────────────────────────────────────
export function downloadBomTemplate() {
  const data = [
    ['완제품코드', '완제품명', '부품도번', '부품명', '수량', '단위'],
    ['AEA05B170', 'A타입 도어 ASSY', 'RP-0170-A', '로프부품', 1, 'EA'],
    ['AEA05B170', 'A타입 도어 ASSY', 'HG-0170-A', '행거부품', 1, 'EA'],
  ]
  downloadExcel(data, 'BOM_양식.xlsx', 'BOM')
}
