import { supabase } from '../supabaseClient.js'

// ── 날짜 변환 helper ────────────────────────────────────────────────
const nullDate = v => (v && String(v).length >= 8 ? v : null)

// ═══════════════════════════════════════════════════════════════════
//  ORDERS
// ═══════════════════════════════════════════════════════════════════

function toOrder(row) {
  return {
    key:          String(row.id),
    jobNo:        row.job_no        ?? '',
    productCode:  row.product_code  ?? '',
    productName:  row.product_name  ?? '',
    spec:         row.spec          ?? '',
    group:        row.group_code    ?? '',
    orderNo:      row.order_no      ?? '',
    orderQty:     row.order_qty     ?? 0,
    remainQty:    row.remain_qty    ?? 0,
    orderDate:    row.order_date    ?? '',
    dueDate:      row.due_date      ?? '',
    origDueDate:  row.orig_due_date ?? '',
    planDate:     row.plan_date     ?? '',
    prodComplete: row.prod_complete ?? '',
    packComplete: row.pack_complete ?? '',
    shipDate:     row.ship_date     ?? '',
    customer:     row.customer      ?? '',
    dept:         row.dept          ?? '',
    status:       row.status        ?? '신규',
    progress:     row.progress      ?? 0,
    batchLabel:   row.batch_label   ?? '',
  }
}

function fromOrder(o, batchLabel) {
  return {
    job_no:       o.jobNo       || null,
    product_code: o.productCode || null,
    product_name: o.productName || null,
    spec:         o.spec        || null,
    group_code:   o.group       || null,
    order_no:     o.orderNo     || null,
    order_qty:    parseInt(o.orderQty)  || 0,
    remain_qty:   parseInt(o.remainQty) || 0,
    order_date:   nullDate(o.orderDate),
    due_date:     nullDate(o.dueDate),
    orig_due_date:nullDate(o.origDueDate),
    plan_date:    nullDate(o.planDate),
    prod_complete:nullDate(o.prodComplete),
    pack_complete:nullDate(o.packComplete),
    ship_date:    nullDate(o.shipDate),
    customer:     o.customer || null,
    dept:         o.dept     || null,
    status:       o.status   || '신규',
    progress:     o.progress || 0,
    batch_label:  batchLabel !== undefined ? batchLabel : (o.batchLabel || null),
  }
}

export async function fetchOrders(batchLabel) {
  let q = supabase.from('orders').select('*').order('created_at', { ascending: false })
  if (batchLabel) q = q.eq('batch_label', batchLabel)
  const { data, error } = await q
  if (error) throw error
  return data.map(toOrder)
}

export async function upsertOrders(orders, batchLabel) {
  if (!orders.length) return
  const rows = orders.map(o => fromOrder(o, batchLabel))

  // 제번+주문PT# 조합으로 중복 제거
  const dedupMap = new Map()
  rows.forEach(r => {
    const k = `${r.job_no ?? ''}|${r.product_code ?? ''}|${Math.random()}`
    const key = (r.job_no || r.product_code) ? `${r.job_no ?? ''}|${r.product_code ?? ''}` : k
    dedupMap.set(key, r)
  })
  const deduped = [...dedupMap.values()]

  const withKey    = deduped.filter(r => r.job_no || r.product_code)
  const withoutKey = deduped.filter(r => !r.job_no && !r.product_code)

  if (withKey.length > 0) {
    const { error } = await supabase.from('orders').upsert(withKey, { onConflict: 'job_no,product_code' })
    if (error) throw error
  }
  if (withoutKey.length > 0) {
    const { error } = await supabase.from('orders').insert(withoutKey)
    if (error) throw error
  }
}

export async function insertOrder(order) {
  const { error } = await supabase.from('orders').insert(fromOrder(order))
  if (error) throw error
}

export async function deleteOrderById(id) {
  const { error } = await supabase.from('orders').delete().eq('id', parseInt(id))
  if (error) throw error
}

export async function deleteAllOrders() {
  const { error } = await supabase.from('orders').delete().gt('id', 0)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════════════
//  ORDER BATCHES
// ═══════════════════════════════════════════════════════════════════

export async function fetchBatches() {
  const { data, error } = await supabase
    .from('order_batches').select('*').order('saved_at', { ascending: false })
  if (error) throw error
  return data.map(b => ({
    label:   b.label,
    count:   b.row_count,
    savedAt: new Date(b.saved_at).toLocaleString('ko-KR'),
  }))
}

export async function saveBatch(label, count) {
  const { error } = await supabase
    .from('order_batches')
    .upsert({ label, row_count: count }, { onConflict: 'label' })
  if (error) throw error
}

export async function deleteBatch(label) {
  const { error } = await supabase.from('order_batches').delete().eq('label', label)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════════════
//  WORKERS
// ═══════════════════════════════════════════════════════════════════

function toWorker(w) {
  return {
    key:       String(w.id),
    empId:     w.emp_id             ?? '',
    name:      w.name               ?? '',
    primary:   w.primary_process    ?? '',
    secondary: Array.isArray(w.secondary_processes) ? w.secondary_processes : [],
    days:      Array.isArray(w.work_days)            ? w.work_days            : [],
    dayHours:  w.day_hours          ?? 8,
    overtime:  w.overtime           ?? 0,
    note:      w.note               ?? '',
  }
}

export async function fetchWorkers() {
  const { data, error } = await supabase.from('workers').select('*').order('id')
  if (error) throw error
  return data.map(toWorker)
}

export async function saveWorker(worker, isNew) {
  const row = {
    emp_id:               worker.empId   || null,
    name:                 worker.name,
    primary_process:      worker.primary || null,
    secondary_processes:  worker.secondary ?? [],
    work_days:            worker.days      ?? [],
    day_hours:            worker.dayHours  ?? 8,
    overtime:             worker.overtime  ?? 0,
    note:                 worker.note      ?? '',
  }
  if (!isNew) {
    const { error } = await supabase.from('workers').update(row).eq('id', parseInt(worker.key))
    if (error) throw error
  } else {
    const { error } = await supabase.from('workers').insert(row)
    if (error) throw error
  }
}

export async function deleteWorkerById(id) {
  const { data, error } = await supabase.from('workers').delete().eq('id', parseInt(id)).select()
  if (error) throw error
  if (!data?.length) throw new Error('삭제 실패 — Supabase RLS 정책을 확인하세요')
}

export async function seedWorkers(workers) {
  const rows = workers.map(w => ({
    emp_id: w.empId, name: w.name, primary_process: w.primary,
    secondary_processes: w.secondary ?? [],
    work_days: w.days ?? [],
    day_hours: w.dayHours ?? 8, overtime: w.overtime ?? 0, note: w.note ?? '',
  }))
  const { error } = await supabase.from('workers').insert(rows)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════════════
//  EQUIPMENT
// ═══════════════════════════════════════════════════════════════════

function toEquip(e) {
  return {
    key:       String(e.id),
    equipId:   e.equip_id   ?? '',
    name:      e.name       ?? '',
    process:   e.process    ?? '',
    dayHours:  e.day_hours  ?? 8,
    shift:     e.shift      ?? '주간',
    status:    e.status     ?? '가동',
    setupTime: e.setup_time ?? 0,
    note:      e.note       ?? '',
  }
}

export async function fetchEquipment() {
  const { data, error } = await supabase.from('equipment').select('*').order('id')
  if (error) throw error
  return data.map(toEquip)
}

export async function saveEquipment(equip, isNew) {
  const row = {
    equip_id:   equip.equipId   || null,
    name:       equip.name,
    process:    equip.process   || null,
    day_hours:  equip.dayHours  ?? 8,
    shift:      equip.shift     ?? '주간',
    status:     equip.status    ?? '가동',
    setup_time: equip.setupTime ?? 0,
    note:       equip.note      ?? '',
  }
  if (!isNew) {
    const { error } = await supabase.from('equipment').update(row).eq('id', parseInt(equip.key))
    if (error) throw error
  } else {
    const { error } = await supabase.from('equipment').insert(row)
    if (error) throw error
  }
}

export async function deleteEquipmentById(id) {
  const { data, error } = await supabase.from('equipment').delete().eq('id', parseInt(id)).select()
  if (error) throw error
  if (!data?.length) throw new Error('삭제 실패 — Supabase RLS 정책을 확인하세요')
}

export async function seedEquipment(equips) {
  const rows = equips.map(e => ({
    equip_id: e.equipId, name: e.name, process: e.process,
    day_hours: e.dayHours ?? 8, shift: e.shift ?? '주간',
    status: e.status ?? '가동', setup_time: e.setupTime ?? 0, note: e.note ?? '',
  }))
  const { error } = await supabase.from('equipment').insert(rows)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════════════
//  PROCESS ROUTES
// ═══════════════════════════════════════════════════════════════════

function toRoute(r) {
  return {
    key:         String(r.id),
    jobNo:       r.job_no       ?? '',
    productCode: r.product_code ?? '',
    productName: r.product_name ?? '',
    spec:        r.spec         ?? '',
    processes:   (r.process_route_steps ?? [])
      .sort((a, b) => a.seq - b.seq)
      .map(s => ({
        seq:       s.seq,
        name:      s.name,
        timePerEa: s.time_per_ea,
        setupTime: s.setup_time,
        workers:   s.workers,
        equip:     s.equip,
      })),
  }
}

export async function fetchProcessRoutes() {
  const { data, error } = await supabase
    .from('process_routes')
    .select('*, process_route_steps(*)')
    .order('id')
  if (error) throw error
  return data.map(toRoute)
}

export async function upsertProcessRoute(route) {
  const { data, error } = await supabase
    .from('process_routes')
    .upsert(
      { job_no: route.jobNo || null, product_code: route.productCode, product_name: route.productName, spec: route.spec },
      { onConflict: 'product_code' }
    )
    .select('id')
    .single()
  if (error) throw error

  const routeId = data.id
  await supabase.from('process_route_steps').delete().eq('route_id', routeId)
  if (route.processes?.length > 0) {
    const steps = route.processes.map(p => ({
      route_id:    routeId,
      seq:         p.seq,
      name:        p.name,
      time_per_ea: p.timePerEa,
      setup_time:  p.setupTime,
      workers:     p.workers,
      equip:       p.equip,
    }))
    const { error: e2 } = await supabase.from('process_route_steps').insert(steps)
    if (e2) throw e2
  }
}

export async function deleteProcessRouteById(id) {
  const { data, error } = await supabase.from('process_routes').delete().eq('id', parseInt(id)).select()
  if (error) throw error
  if (!data?.length) throw new Error('삭제 실패 — Supabase RLS 정책을 확인하세요')
}

export async function seedProcessRoutes(routes) {
  for (const route of routes) {
    await upsertProcessRoute(route)
  }
}

// ═══════════════════════════════════════════════════════════════════
//  PROCESSES (공정마스터)
// ═══════════════════════════════════════════════════════════════════

function toProcess(p) {
  return {
    key:       String(p.id),
    code:      p.code          ?? '',
    name:      p.name          ?? '',
    dept:      p.dept          ?? '',
    category:  p.category      ?? '',
    stdTime:   p.std_time_min  ?? 0,
    sortOrder: p.sort_order    ?? 0,
    isActive:  p.is_active     ?? true,
    note:      p.note          ?? '',
  }
}

export async function fetchProcesses() {
  const { data, error } = await supabase
    .from('processes').select('*').order('sort_order').order('id')
  if (error) throw error
  return data.map(toProcess)
}

export async function saveProcess(proc, isNew) {
  const row = {
    code:         proc.code      || null,
    name:         proc.name,
    dept:         proc.dept      || null,
    category:     proc.category  || null,
    std_time_min: proc.stdTime   ?? 0,
    sort_order:   proc.sortOrder ?? 0,
    is_active:    proc.isActive  ?? true,
    note:         proc.note      ?? '',
  }
  if (!isNew) {
    const { error } = await supabase.from('processes').update(row).eq('id', parseInt(proc.key))
    if (error) throw error
  } else {
    const { error } = await supabase.from('processes').insert(row)
    if (error) throw error
  }
}

export async function deleteProcessById(id) {
  const { data, error } = await supabase.from('processes').delete().eq('id', parseInt(id)).select()
  if (error) throw error
  if (!data?.length) throw new Error('삭제 실패 — Supabase RLS 정책을 확인하세요')
}

// ═══════════════════════════════════════════════════════════════════
//  SCHEDULE RESULTS (스케줄 저장/불러오기)
// ═══════════════════════════════════════════════════════════════════

export async function saveSchedule({ label, priority, startDate, tasks }) {
  const statTotal = tasks.length
  const statRisk  = tasks.filter(t => t.status === '위험').length
  const { error } = await supabase.from('schedule_results').insert({
    label,
    priority,
    start_date: startDate,
    tasks,
    stat_total: statTotal,
    stat_risk:  statRisk,
  })
  if (error) throw error
}

export async function fetchSchedules() {
  const { data, error } = await supabase
    .from('schedule_results')
    .select('id, label, priority, start_date, stat_total, stat_risk, created_at')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data
}

export async function fetchScheduleById(id) {
  const { data, error } = await supabase
    .from('schedule_results')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function deleteSchedule(id) {
  const { error } = await supabase.from('schedule_results').delete().eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════════════
//  SCHEDULE RULES (스케줄 규칙)
// ═══════════════════════════════════════════════════════════════════

function toRule(r) {
  return {
    id:          String(r.id),
    ruleType:    r.rule_type     ?? '',
    targetName:  r.target_name   ?? '',
    days:        Array.isArray(r.days) ? r.days : [],
    processName: r.process_name  ?? '',
    equipName:   r.equip_name    ?? '',
    isActive:    r.is_active     ?? true,
    note:        r.note          ?? '',
  }
}

function fromRule(rule) {
  return {
    rule_type:    rule.ruleType    || null,
    target_name:  rule.targetName  || null,
    days:         rule.days        ?? [],
    process_name: rule.processName || null,
    equip_name:   rule.equipName   || null,
    is_active:    rule.isActive    ?? true,
    note:         rule.note        ?? '',
  }
}

export async function fetchScheduleRules() {
  const { data, error } = await supabase
    .from('schedule_rules').select('*').order('id')
  if (error) throw error
  return data.map(toRule)
}

export async function saveScheduleRule(rule, isNew) {
  const row = fromRule(rule)
  if (!isNew && rule.id) {
    const { error } = await supabase.from('schedule_rules').update(row).eq('id', parseInt(rule.id))
    if (error) throw error
  } else {
    const { error } = await supabase.from('schedule_rules').insert(row)
    if (error) throw error
  }
}

export async function deleteScheduleRule(id) {
  const { error } = await supabase.from('schedule_rules').delete().eq('id', parseInt(id))
  if (error) throw error
}

export async function seedProcesses(rows) {
  const { error } = await supabase.from('processes').insert(rows.map(p => ({
    code: p.code || null, name: p.name, dept: p.dept || null,
    category: p.category || null, std_time_min: p.stdTime ?? 0,
    sort_order: p.sortOrder ?? 0, is_active: p.isActive ?? true, note: p.note ?? '',
  })))
  if (error) throw error
}
