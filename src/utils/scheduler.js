/**
 * 유한능력 작업 스케줄링 엔진 (Finite Capacity Scheduling)
 *
 * 입력:
 *   orders    [{ jobNo, productCode, productName, orderQty, dueDate }]
 *   routes    [{ productCode, processes:[{ seq, name, timePerEa, setupTime, workers, equip }] }]
 *   workers   [{ empId, name, primary, secondary, days, dayHours, overtime }]
 *   equips    [{ equipId, name, process, dayHours, setupTime, status }]
 *   startDate 스케줄링 시작일 (Date 객체)
 *
 * 출력:
 *   tasks [{ jobNo, productCode, productName, qty, dueDate, seq, processName,
 *            assignedWorker, assignedEquip, startDate, endDate, hours, setupHours }]
 */

import dayjs from 'dayjs'

// 요일 문자 → dayjs 요일 번호 (0=일, 1=월, ... 6=토)
const DAY_NUM = { '일':0,'월':1,'화':2,'수':3,'목':4,'금':5,'토':6 }

// 날짜 d가 근무일인지 확인 (workDays: ['월','화','수','목','금'])
function isWorkDay(d, workDays) {
  const dayOfWeek = d.day()
  return workDays.some(dk => DAY_NUM[dk] === dayOfWeek)
}

// d 이후 첫 근무일 (당일 포함)
function nextWorkDay(d, workDays) {
  let cur = d.clone()
  for (let i = 0; i < 14; i++) {
    if (isWorkDay(cur, workDays)) return cur
    cur = cur.add(1, 'day')
  }
  return d.add(1, 'day')
}

// 특정 공정을 담당할 수 있는 작업자 목록 (주력 또는 겸직)
function getCapableWorkers(processName, workers) {
  return workers.filter(w =>
    w.primary === processName || (w.secondary || []).includes(processName)
  )
}

// 특정 공정의 설비 목록 (가동 중인 것만)
function getCapableEquips(processName, equips) {
  return equips.filter(e =>
    e.status === '가동' &&
    (e.process === processName || processName.includes(e.process) || e.process.includes(processName))
  )
}

// 여유시간(Slack) 계산: 납기까지 남은 일수 - 총 공정 소요일수
function calcSlack(order, routes, baseDate) {
  if (!order.dueDate) return 9999
  const daysLeft = dayjs(order.dueDate).diff(baseDate, 'day')
  const route = routes.find(r => r.productCode?.toUpperCase() === order.productCode?.toUpperCase())
  if (!route?.processes?.length) return daysLeft
  const qty = Number(order.remainQty || order.orderQty || 1)
  const totalHours = route.processes.reduce((s, p) => s + (p.timePerEa||0) * qty + (p.setupTime||0), 0)
  return daysLeft - totalHours / 8
}

/**
 * 메인 스케줄링 함수
 * options.priorityRule: 'EDD'(납기우선) | 'SLACK'(여유시간우선) | 'FIFO'(투입순)
 */
export function schedule(orders, routes, workers, equips, startDate = new Date(), options = {}) {
  const { priorityRule = 'EDD' } = options
  const baseDate = dayjs(startDate)

  const activeOrders = [...orders].filter(o => (o.remainQty || o.orderQty || 0) > 0)

  const sortedOrders = activeOrders.sort((a, b) => {
    if (priorityRule === 'SLACK') {
      return calcSlack(a, routes, baseDate) - calcSlack(b, routes, baseDate)
    }
    if (priorityRule === 'FIFO') {
      return 0
    }
    // EDD (기본값)
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  })

  // 자원별 가용 시간 추적 (workerKey → 다음 가용 dayjs)
  const workerAvail = {}
  workers.forEach(w => { workerAvail[w.empId] = baseDate.clone() })

  const equipAvail = {}
  equips.filter(e => e.status === '가동').forEach(e => { equipAvail[e.equipId] = baseDate.clone() })

  const tasks = []

  for (const order of sortedOrders) {
    const route = routes.find(r =>
      r.productCode && order.productCode &&
      r.productCode.toUpperCase() === order.productCode.toUpperCase()
    )
    if (!route || !route.processes?.length) {
      // 공정경로 없음 → 단순 1단계 작업지시만 생성
      tasks.push({
        jobNo: order.jobNo,
        productCode: order.productCode,
        productName: order.productName,
        qty: order.orderQty,
        dueDate: order.dueDate,
        seq: 1,
        processName: '(경로 미정의)',
        assignedWorker: null,
        assignedEquip: null,
        startDate: baseDate.format('YYYY-MM-DD'),
        endDate: order.dueDate || baseDate.format('YYYY-MM-DD'),
        hours: 0,
        setupHours: 0,
        status: '대기',
        warning: '공정경로 미등록',
      })
      continue
    }

    let prevEndDate = baseDate.clone()

    for (const proc of route.processes) {
      const qty = Number(order.remainQty || order.orderQty) || 1
      const totalWorkHours = (proc.timePerEa || 0) * qty
      const setupHours = proc.setupTime || 0
      const totalHours = totalWorkHours + setupHours
      const neededWorkers = Math.max(1, proc.workers || 1)

      // 담당 가능 작업자 (주력 우선 정렬)
      const capWorkers = getCapableWorkers(proc.name, workers)
      const capEquips  = getCapableEquips(proc.name, equips)
      const prioritized = [
        ...capWorkers.filter(w => w.primary === proc.name),
        ...capWorkers.filter(w => w.primary !== proc.name),
      ]

      // ── 다수 작업자 배정 ─────────────────────────────────────
      // 필요 인원만큼 가장 빨리 가용한 작업자 선택
      // 모두 준비된 날이 시작일
      const assignedWorkerList = []
      let workerReadyDate = prevEndDate.clone()

      const sortedByAvail = [...prioritized].sort((a, b) => {
        const aA = workerAvail[a.empId] || baseDate
        const bA = workerAvail[b.empId] || baseDate
        return aA.isBefore(bA) ? -1 : 1
      })

      for (let i = 0; i < Math.min(neededWorkers, sortedByAvail.length); i++) {
        const w = sortedByAvail[i]
        const avail = (workerAvail[w.empId] || baseDate.clone())
        const ready = avail.isBefore(prevEndDate) ? prevEndDate : avail
        assignedWorkerList.push(w)
        if (ready.isAfter(workerReadyDate)) workerReadyDate = ready
      }

      const bestWorker = assignedWorkerList[0] || null
      const workerShortage = assignedWorkerList.length < neededWorkers

      // ── 설비 배정 ─────────────────────────────────────────────
      let bestEquip = null
      let equipReadyDate = prevEndDate.clone()
      for (const eq of capEquips) {
        const avail = (equipAvail[eq.equipId] || baseDate.clone())
        const ready = avail.isBefore(prevEndDate) ? prevEndDate : avail
        if (!bestEquip || ready.isBefore(equipReadyDate)) {
          bestEquip = eq
          equipReadyDate = ready
        }
      }

      // ── 시작일: 작업자 + 설비 모두 준비된 날 ─────────────────
      let constraintDate = workerReadyDate.clone()
      if (bestEquip && equipReadyDate.isAfter(constraintDate)) {
        constraintDate = equipReadyDate
      }

      // ── 일일 가용시간 (다수 작업자 시 병렬 처리로 시간 단축) ──
      const workerDayHours = bestWorker
        ? (bestWorker.dayHours || 8) + (bestWorker.overtime || 0)
        : 8
      const equipDayHours   = bestEquip ? (bestEquip.dayHours || 8) : 24
      const parallelFactor  = Math.max(1, assignedWorkerList.length)
      const effectiveDayHours = Math.max(1, Math.min(workerDayHours * parallelFactor, equipDayHours))

      // ── 근무일 기준 기간 계산 ─────────────────────────────────
      const workDays = bestWorker?.days || ['월','화','수','목','금']
      let startDay   = nextWorkDay(constraintDate, workDays)
      let remainHours = totalHours
      let curDay  = startDay.clone()
      let endDay  = startDay.clone()

      let loopGuard = 0
      while (remainHours > 0 && loopGuard < 365) {
        if (isWorkDay(curDay, workDays)) {
          remainHours -= effectiveDayHours
          endDay = curDay.clone()
        }
        if (remainHours > 0) curDay = curDay.add(1, 'day')
        loopGuard++
      }

      // ── task 객체 생성 ─────────────────────────────────────────
      const workerNames = assignedWorkerList.map(w => w.name).join(', ') || '미배정'
      const task = {
        jobNo:              order.jobNo,
        productCode:        order.productCode,
        productName:        order.productName,
        qty,
        dueDate:            order.dueDate,
        seq:                proc.seq,
        processName:        proc.name,
        neededWorkers,
        assignedWorkerCount: assignedWorkerList.length,
        assignedWorker:     workerNames,
        assignedWorkerName: bestWorker?.name || null,
        assignedWorkerList: assignedWorkerList.map(w => w.name),
        assignedEquip:      bestEquip ? bestEquip.name : (capEquips.length === 0 ? '설비불필요' : '미배정'),
        startDate:          startDay.format('YYYY-MM-DD'),
        endDate:            endDay.format('YYYY-MM-DD'),
        hours:              totalWorkHours,
        setupHours,
        totalHours,
        status: '예정',
      }

      // ── 경고 처리 ─────────────────────────────────────────────
      const warnings = []
      if (order.dueDate && endDay.isAfter(dayjs(order.dueDate))) {
        warnings.push(`납기(${order.dueDate}) 초과 예상`)
        task.status = '위험'
      }
      if (assignedWorkerList.length === 0) {
        warnings.push(`${proc.name} 담당 가능 작업자 없음`)
        task.status = task.status === '위험' ? '위험' : '주의'
      } else if (workerShortage) {
        warnings.push(`필요인원 ${neededWorkers}명 중 ${assignedWorkerList.length}명만 배정`)
        if (task.status === '예정') task.status = '주의'
      }
      if (warnings.length) task.warning = warnings.join(' / ')

      tasks.push(task)

      // ── 자원 가용시간 업데이트 ────────────────────────────────
      const nextAvail = endDay.add(1, 'day')
      assignedWorkerList.forEach(w => { workerAvail[w.empId] = nextAvail })
      if (bestEquip) equipAvail[bestEquip.equipId] = nextAvail

      prevEndDate = endDay.add(1, 'day')
    }
  }

  return tasks
}

/**
 * 작업자별 일일 계획 생성
 * tasks → { workerName: [{ date, jobNo, processName, hours, equip }] }
 */
export function buildWorkerDailyPlan(tasks, workers) {
  const plan = {}
  workers.forEach(w => { plan[w.name] = [] })

  tasks.forEach(task => {
    if (!task.assignedWorkerName) return
    const start = dayjs(task.startDate)
    const end = dayjs(task.endDate)
    let cur = start.clone()
    while (!cur.isAfter(end)) {
      const workerDays = workers.find(w => w.name === task.assignedWorkerName)?.days || ['월','화','수','목','금']
      if (isWorkDay(cur, workerDays)) {
        if (!plan[task.assignedWorkerName]) plan[task.assignedWorkerName] = []
        plan[task.assignedWorkerName].push({
          date: cur.format('YYYY-MM-DD'),
          jobNo: task.jobNo,
          productName: task.productName,
          processName: task.processName,
          equip: task.assignedEquip,
          status: task.status,
        })
      }
      cur = cur.add(1, 'day')
    }
  })

  // 날짜순 정렬
  Object.keys(plan).forEach(name => {
    plan[name].sort((a, b) => a.date.localeCompare(b.date))
  })

  return plan
}

/**
 * Gantt 차트용 데이터 변환
 * tasks → jobNo별로 그루핑한 배열
 */
export function buildGanttData(tasks) {
  const jobs = {}
  tasks.forEach((t, idx) => {
    if (!jobs[t.jobNo]) {
      jobs[t.jobNo] = { jobNo:t.jobNo, productName:t.productName, dueDate:t.dueDate, qty:t.qty, bars:[] }
    }
    jobs[t.jobNo].bars.push({
      taskIdx: idx,
      seq: t.seq,
      label: t.processName,
      startDate: t.startDate,
      endDate: t.endDate,
      worker: t.assignedWorkerName,
      equip: t.assignedEquip,
      status: t.status,
      warning: t.warning,
    })
  })

  return Object.values(jobs).map(j => ({
    ...j,
    bars: j.bars.sort((a, b) => a.seq - b.seq),
    overallEnd: j.bars.reduce((m, b) => b.endDate > m ? b.endDate : m, ''),
    isAtRisk: j.bars.some(b => b.status === '위험'),
  })).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
}
