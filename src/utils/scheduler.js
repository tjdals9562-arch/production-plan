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

/**
 * 메인 스케줄링 함수
 * 우선순위: 납기일 빠른 순 → FIFO
 */
export function schedule(orders, routes, workers, equips, startDate = new Date()) {
  const baseDate = dayjs(startDate)

  // 납기일 기준 정렬
  const sortedOrders = [...orders]
    .filter(o => o.orderQty > 0)
    .sort((a, b) => {
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
      const qty = Number(order.orderQty) || 1
      const totalWorkHours = (proc.timePerEa || 0) * qty
      const setupHours = proc.setupTime || 0
      const totalHours = totalWorkHours + setupHours

      // 담당 가능 작업자 찾기
      const capWorkers = getCapableWorkers(proc.name, workers)
      const capEquips = getCapableEquips(proc.name, equips)

      // 가장 빨리 가용한 작업자 선택 (주력 우선)
      let bestWorker = null
      let bestWorkerAvail = null
      const prioritized = [
        ...capWorkers.filter(w => w.primary === proc.name),
        ...capWorkers.filter(w => w.primary !== proc.name),
      ]
      for (const w of prioritized) {
        const avail = workerAvail[w.empId] || baseDate.clone()
        const readyDate = avail.isBefore(prevEndDate) ? prevEndDate : avail
        if (!bestWorker || readyDate.isBefore(bestWorkerAvail)) {
          bestWorker = w
          bestWorkerAvail = readyDate
        }
      }

      // 가장 빨리 가용한 설비 선택
      let bestEquip = null
      let bestEquipAvail = null
      for (const eq of capEquips) {
        const avail = equipAvail[eq.equipId] || baseDate.clone()
        const readyDate = avail.isBefore(prevEndDate) ? prevEndDate : avail
        if (!bestEquip || readyDate.isBefore(bestEquipAvail)) {
          bestEquip = eq
          bestEquipAvail = readyDate
        }
      }

      // 시작일: 작업자와 설비 모두 준비된 날 (이전 공정 완료 이후)
      const resourceReadyDate = bestWorkerAvail || bestEquipAvail || prevEndDate
      const constraintDate = resourceReadyDate.isBefore(prevEndDate) ? prevEndDate : resourceReadyDate

      // 해당 작업자의 일일 가용시간
      const workerDayHours = bestWorker
        ? (bestWorker.dayHours || 8) + (bestWorker.overtime || 0)
        : 8
      const equipDayHours = bestEquip ? (bestEquip.dayHours || 8) : 8
      const effectiveDayHours = Math.min(workerDayHours, equipDayHours)

      // 근무일 기준으로 기간 계산
      const workDays = bestWorker?.days || ['월','화','수','목','금']
      let startDay = nextWorkDay(constraintDate, workDays)
      let remainHours = totalHours
      let curDay = startDay.clone()
      let endDay = startDay.clone()

      while (remainHours > 0) {
        if (isWorkDay(curDay, workDays)) {
          remainHours -= effectiveDayHours
          endDay = curDay.clone()
        }
        if (remainHours > 0) curDay = curDay.add(1, 'day')
      }

      const task = {
        jobNo: order.jobNo,
        productCode: order.productCode,
        productName: order.productName,
        qty,
        dueDate: order.dueDate,
        seq: proc.seq,
        processName: proc.name,
        assignedWorker: bestWorker ? `${bestWorker.name}(${bestWorker.empId})` : '미배정',
        assignedWorkerName: bestWorker?.name || null,
        assignedEquip: bestEquip ? bestEquip.name : (proc.equip || '미배정'),
        startDate: startDay.format('YYYY-MM-DD'),
        endDate: endDay.format('YYYY-MM-DD'),
        hours: totalWorkHours,
        setupHours,
        totalHours,
        status: '예정',
      }

      // 납기 초과 경고
      if (order.dueDate && endDay.isAfter(dayjs(order.dueDate))) {
        task.warning = `납기(${order.dueDate}) 초과 예상`
        task.status = '위험'
      }

      tasks.push(task)

      // 자원 가용시간 업데이트
      const nextAvail = endDay.add(1, 'day')
      if (bestWorker) workerAvail[bestWorker.empId] = nextAvail
      if (bestEquip)  equipAvail[bestEquip.equipId] = nextAvail

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
  tasks.forEach(t => {
    if (!jobs[t.jobNo]) {
      jobs[t.jobNo] = { jobNo:t.jobNo, productName:t.productName, dueDate:t.dueDate, qty:t.qty, bars:[] }
    }
    jobs[t.jobNo].bars.push({
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
