/**
 * 자동 스케줄링 페이지
 * 수주 데이터 + 공정경로 마스터 + 작업자/설비 마스터를 기반으로
 * 유한능력 자동 스케줄을 생성하고 Gantt / 작업자 일일계획으로 시각화
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Card, Row, Col, Button, Space, Select, Tag, Typography, Badge, Progress,
  Table, Tooltip, Alert, Statistic, Tabs, Steps, Divider, Empty, Switch,
  Spin, message, Modal, Popconfirm, Segmented, Input,
} from 'antd'
import {
  ThunderboltOutlined, CalendarOutlined, UserOutlined, ToolOutlined,
  WarningOutlined, CheckCircleOutlined, ClockCircleOutlined, BarChartOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { schedule, buildWorkerDailyPlan, buildGanttData } from '../../utils/scheduler.js'
import { loadScheduleRules } from '../master/ScheduleRules.jsx'
import { fetchOrders, fetchProcessRoutes, fetchWorkers, fetchEquipment, fetchBom,
  saveSchedule, fetchSchedules, fetchScheduleById, deleteSchedule } from '../../api/db.js'
import { SaveOutlined, HistoryOutlined, ClearOutlined, ScheduleOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

// ─── 샘플 마스터 데이터 (실제로는 상위 컴포넌트에서 prop으로 받음) ───
const SAMPLE_ORDERS = [
  { jobNo:'26T0406R01', productCode:'4UF0062*A', productName:'SILL SUPPORT',    orderQty:12, dueDate:'2026-06-09', customer:'오티스엘리베이터' },
  { jobNo:'26T0512B02', productCode:'3HH-001B',  productName:'HH-프레임 ASSY',  orderQty:8,  dueDate:'2026-05-31', customer:'현대중공업' },
  { jobNo:'26T0515D04', productCode:'BKT-SET',   productName:'구조체 브라켓 SET',orderQty:15, dueDate:'2026-05-31', customer:'두산에너빌리티' },
]

const SAMPLE_ROUTES = [
  { productCode:'4UF0062*A', productName:'SILL SUPPORT', processes:[
    { seq:1, name:'레이저', timePerEa:0.5, setupTime:0.5, workers:1, equip:'파이버 레이저 #1' },
    { seq:2, name:'벤딩',   timePerEa:0.3, setupTime:0.3, workers:1, equip:'CNC 벤딩 #1' },
    { seq:3, name:'탭핑',   timePerEa:0.2, setupTime:0.2, workers:1, equip:'탭핑 머신' },
    { seq:4, name:'포장',   timePerEa:0.1, setupTime:0.0, workers:1, equip:'—' },
  ]},
  { productCode:'3HH-001B', productName:'HH-프레임 ASSY', processes:[
    { seq:1, name:'레이저', timePerEa:0.8, setupTime:0.5, workers:1, equip:'파이버 레이저 #2' },
    { seq:2, name:'용접',   timePerEa:1.5, setupTime:0.5, workers:2, equip:'CO2 용접 라인 #1' },
    { seq:3, name:'도장',   timePerEa:0.5, setupTime:1.0, workers:1, equip:'도장 부스 #1' },
    { seq:4, name:'조립',   timePerEa:0.8, setupTime:0.3, workers:2, equip:'자동화 조립라인' },
  ]},
  { productCode:'BKT-SET', productName:'구조체 브라켓 SET', processes:[
    { seq:1, name:'레이저', timePerEa:0.6, setupTime:0.5, workers:1, equip:'파이버 레이저 #1' },
    { seq:2, name:'프레스', timePerEa:0.4, setupTime:0.5, workers:1, equip:'CNC 벤딩 #2' },
    { seq:3, name:'용접',   timePerEa:2.0, setupTime:0.5, workers:2, equip:'CO2 용접 라인 #2' },
    { seq:4, name:'조립',   timePerEa:1.0, setupTime:0.3, workers:2, equip:'자동화 조립라인' },
  ]},
]

const SAMPLE_WORKERS = [
  { empId:'EMP-001', name:'김철수', primary:'용접',   secondary:['레이저'],      days:['월','화','수','목','금'], dayHours:8, overtime:2 },
  { empId:'EMP-002', name:'이영희', primary:'레이저', secondary:['벤딩'],         days:['월','화','수','목','금'], dayHours:8, overtime:0 },
  { empId:'EMP-003', name:'박민준', primary:'도장',   secondary:[],               days:['월','화','수','목','금'], dayHours:8, overtime:0 },
  { empId:'EMP-004', name:'정수진', primary:'조립',   secondary:['벤딩','탭핑'],  days:['월','화','수','목','금'], dayHours:8, overtime:0 },
  { empId:'EMP-005', name:'최민호', primary:'레이저', secondary:['용접'],          days:['월','화','수','목'],      dayHours:8, overtime:4 },
  { empId:'EMP-006', name:'강지원', primary:'벤딩',   secondary:['레이저','탭핑'],days:['월','화','수','목','금'], dayHours:8, overtime:0 },
]

const SAMPLE_EQUIPS = [
  { equipId:'EQ-001', name:'파이버 레이저 #1', process:'레이저', dayHours:16, status:'가동', setupTime:0.5 },
  { equipId:'EQ-002', name:'파이버 레이저 #2', process:'레이저', dayHours:8,  status:'가동', setupTime:0.5 },
  { equipId:'EQ-003', name:'CNC 벤딩 #1',      process:'벤딩',   dayHours:8,  status:'가동', setupTime:0.3 },
  { equipId:'EQ-004', name:'CNC 벤딩 #2',      process:'벤딩',   dayHours:8,  status:'가동', setupTime:0.3 },
  { equipId:'EQ-005', name:'CO2 용접 라인 #1',  process:'용접',   dayHours:16, status:'가동', setupTime:0.5 },
  { equipId:'EQ-006', name:'CO2 용접 라인 #2',  process:'용접',   dayHours:8,  status:'가동', setupTime:0.5 },
  { equipId:'EQ-007', name:'도장 부스 #1',      process:'도장',   dayHours:8,  status:'가동', setupTime:1.0 },
  { equipId:'EQ-008', name:'자동화 조립라인',   process:'조립',   dayHours:0,  status:'정지', setupTime:0.5 },
]

// ─── 공정 색상 ────────────────────────────────────────────────────
const PROC_COLOR = {
  '레이저':'#3B82F6','벤딩':'#7C3AED','용접':'#F59E0B','탭핑':'#EC4899',
  '도장':'#10B981','포장':'#0D9488','조립':'#0D9488','프레스':'#DC2626','검사':'#64748B',
}
const pc = name => PROC_COLOR[name] || PROC_COLOR[Object.keys(PROC_COLOR).find(k => name?.includes(k))] || '#94A3B8'

// ─── 인터랙티브 Gantt 차트 (드래그 앤 드롭) ─────────────────────
function GanttView({ ganttData, tasks, workers, startDate, endDate, onTaskUpdate }) {
  const [viewMode, setViewMode] = useState('job')
  const [searchText, setSearchText] = useState('')
  const [dragInfo, setDragInfo] = useState(null)
  const dragRef = useRef(null)

  const start = dayjs(startDate)
  const end = dayjs(endDate)
  const totalDays = end.diff(start, 'day') + 1
  const dayWidth = Math.max(28, Math.min(52, Math.round(900 / totalDays)))
  const today = dayjs().format('YYYY-MM-DD')
  const ROW_H = viewMode === 'job' ? 60 : 70
  const LEFT_W = viewMode === 'job' ? 260 : 180

  const dates = useMemo(() => {
    const arr = []
    for (let i = 0; i < totalDays; i++) arr.push(start.add(i, 'day'))
    return arr
  }, [startDate, totalDays])

  const barLeft = (d) => Math.max(0, dayjs(d).diff(start, 'day')) * dayWidth
  const barW = (s, e) => Math.max(dayWidth, (dayjs(e).diff(dayjs(s), 'day') + 1) * dayWidth)
  const totalW = totalDays * dayWidth

  const workerRows = useMemo(() => {
    if (!tasks) return []
    const map = {}
    workers.forEach(w => { map[w.name] = { key: w.name, workerName: w.name, primary: w.primary, bars: [] } })
    map['미배정'] = { key:'미배정', workerName:'미배정', primary:null, bars:[] }
    tasks.forEach((t, idx) => {
      const wn = t.assignedWorkerName || '미배정'
      if (!map[wn]) map[wn] = { key:wn, workerName:wn, primary:null, bars:[] }
      map[wn].bars.push({
        taskIdx:idx, jobNo:t.jobNo, productName:t.productName, partName:t.partName || null,
        label:t.processName, startDate:t.startDate, endDate:t.endDate,
        status:t.status, warning:t.warning, equip:t.assignedEquip, worker:t.assignedWorkerName,
      })
    })
    return Object.values(map)
      .filter(r => r.bars.length > 0 || workers.some(w => w.name === r.workerName))
      .sort((a, b) => a.workerName === '미배정' ? 1 : b.workerName === '미배정' ? -1 : a.workerName.localeCompare(b.workerName))
  }, [tasks, workers])

  const filteredGantt = searchText
    ? ganttData?.filter(r => r.jobNo?.toLowerCase().includes(searchText.toLowerCase()) || r.productName?.toLowerCase().includes(searchText.toLowerCase()))
    : ganttData
  const filteredWorker = searchText
    ? workerRows.map(r => ({ ...r, bars: r.bars.filter(b => b.jobNo?.toLowerCase().includes(searchText.toLowerCase()) || b.productName?.toLowerCase().includes(searchText.toLowerCase())) })).filter(r => r.bars.length > 0)
    : workerRows
  const rows = viewMode === 'job' ? filteredGantt : filteredWorker

  const onBarDown = (e, bar, ri) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = { bar, ri, x0: e.clientX, y0: e.clientY }
    setDragInfo({ taskIdx: bar.taskIdx, ri, dx: 0, dy: 0 })

    const onMove = (ev) => {
      setDragInfo({ taskIdx: dragRef.current.bar.taskIdx, ri: dragRef.current.ri,
        dx: ev.clientX - dragRef.current.x0, dy: ev.clientY - dragRef.current.y0 })
    }
    const onUp = (ev) => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      if (!dragRef.current) { setDragInfo(null); return }

      const { bar: b, ri: origRi } = dragRef.current
      const dx = ev.clientX - dragRef.current.x0
      const dy = ev.clientY - dragRef.current.y0
      const dd = Math.round(dx / dayWidth)
      const updates = {}
      let changed = false

      if (dd !== 0) {
        updates.startDate = dayjs(b.startDate).add(dd, 'day').format('YYYY-MM-DD')
        updates.endDate = dayjs(b.endDate).add(dd, 'day').format('YYYY-MM-DD')
        changed = true
      }
      if (viewMode === 'worker') {
        const rd = Math.round(dy / ROW_H)
        const newRi = Math.max(0, Math.min(rows.length - 1, origRi + rd))
        if (newRi !== origRi && rows[newRi]) {
          const target = rows[newRi]
          const w = workers.find(wk => wk.name === target.workerName)
          if (w) {
            updates.assignedWorkerName = w.name
            updates.assignedWorker = w.name
            updates.assignedWorkerList = [w.name]
            updates.assignedWorkerCount = 1
          } else {
            updates.assignedWorkerName = null
            updates.assignedWorker = '미배정'
            updates.assignedWorkerList = []
            updates.assignedWorkerCount = 0
          }
          changed = true
        }
      }
      if (changed) onTaskUpdate(b.taskIdx, updates)
      dragRef.current = null
      setDragInfo(null)
    }
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const getSnap = (taskIdx) => {
    if (!dragInfo || dragInfo.taskIdx !== taskIdx) return null
    const dd = Math.round(dragInfo.dx / dayWidth)
    const rd = viewMode === 'worker' ? Math.round(dragInfo.dy / ROW_H) : 0
    return { sx: dd * dayWidth, sy: rd * ROW_H, dd, rd }
  }

  const targetRi = dragInfo && viewMode === 'worker'
    ? Math.max(0, Math.min((rows?.length||1) - 1, dragInfo.ri + Math.round(dragInfo.dy / ROW_H)))
    : -1

  // 행이 많을 때(주문 다수) 보이는 범위만 렌더링 — 가상 스크롤
  const rowsWrapRef = useRef(null)
  const [rowScrollTop, setRowScrollTop] = useState(0)
  const [rowViewH, setRowViewH] = useState(600)
  const rafRef = useRef(null)

  useEffect(() => {
    const el = rowsWrapRef.current
    if (!el) return
    const upd = () => setRowViewH(el.clientHeight)
    upd()
    const ro = new ResizeObserver(upd)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleRowScroll = useCallback(e => {
    const top = e.currentTarget.scrollTop
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => { rafRef.current = null; setRowScrollTop(top) })
  }, [])

  const ROW_BUFFER = 6
  const totalRowCount = rows?.length || 0
  const rowStartIdx = Math.max(0, Math.floor(rowScrollTop / ROW_H) - ROW_BUFFER)
  const rowEndIdx = Math.min(totalRowCount, Math.ceil((rowScrollTop + rowViewH) / ROW_H) + ROW_BUFFER)
  const rowPadTop = rowStartIdx * ROW_H
  const rowPadBottom = Math.max(0, (totalRowCount - rowEndIdx) * ROW_H)
  const visibleRows = (rows || []).slice(rowStartIdx, rowEndIdx)

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12,flexWrap:'wrap'}}>
        <Segmented size="small" value={viewMode} onChange={setViewMode}
          options={[{label:'제번별',value:'job'},{label:'작업자별',value:'worker'}]} />
        <Input.Search
          placeholder="제번 / 제품명 검색"
          allowClear
          size="small"
          style={{width:200}}
          onChange={e => setSearchText(e.target.value)}
          value={searchText}
        />
        <Text type="secondary" style={{fontSize:11}}>
          {viewMode === 'worker' ? '바를 드래그하여 일정 변경 / 다른 작업자 행으로 이동하여 재배치' : '바를 좌우로 드래그하여 일정 변경'}
        </Text>
      </div>

      <div style={{overflowX:'auto'}}>
        {/* 날짜 헤더 */}
        <div style={{display:'flex',borderBottom:'2px solid #E2E8F0',position:'sticky',top:0,background:'#fff',zIndex:10}}>
          <div style={{width:LEFT_W,flexShrink:0,padding:'8px 12px',fontSize:12,fontWeight:700,color:'#64748B',borderRight:'1px solid #E2E8F0',background:'#F8FAFC'}}>
            {viewMode === 'job' ? '제번 / 제품' : '작업자'}
          </div>
          <div style={{display:'flex',minWidth:totalW}}>
            {dates.map((d,i)=>{
              const isToday = d.format('YYYY-MM-DD') === today
              const isWE = d.day() === 0 || d.day() === 6
              return (
                <div key={i} style={{
                  width:dayWidth,flexShrink:0,textAlign:'center',fontSize:10,padding:'4px 0',
                  borderRight:'1px solid #F1F5F9',fontWeight:isToday?800:isWE?400:600,
                  color:isToday?'#3B82F6':isWE?'#CBD5E1':'#64748B',
                  background:isToday?'#EFF6FF':isWE?'#F8FAFC':'transparent',
                }}>
                  <div>{d.format('M/D')}</div>
                  <div style={{fontSize:9}}>{'일월화수목금토'[d.day()]}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Gantt 행 — 보이는 범위만 렌더링 */}
        <div ref={rowsWrapRef} onScroll={handleRowScroll} style={{maxHeight:600, overflowY:'auto'}}>
        {rowPadTop > 0 && <div style={{height:rowPadTop}} />}
        {visibleRows.map((row, localI) => {
          const ri = rowStartIdx + localI
          const isDropTarget = ri === targetRi && ri !== dragInfo?.ri
          return (
            <div key={row.key || row.jobNo || ri} style={{
              display:'flex',
              borderBottom:`1px solid ${row.isAtRisk?'#FECACA':'#F8FAFC'}`,
              background: isDropTarget ? '#DBEAFE' : row.isAtRisk ? '#FFF8F8' : 'transparent',
              transition:'background 0.12s',
            }}>
              {/* 좌측 정보 */}
              <div style={{width:LEFT_W,flexShrink:0,padding:'10px 12px',borderRight:'1px solid #E2E8F0'}}>
                {viewMode === 'job' ? (
                  <>
                    <div style={{fontSize:13,fontWeight:700,color:'#3B82F6',fontFamily:'monospace'}}>{row.jobNo}</div>
                    <div style={{fontSize:11,color:'#64748B',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{row.productName}</div>
                    <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                      <Text style={{fontSize:10,color:'#94A3B8'}}>납기 {row.dueDate}</Text>
                      {row.isAtRisk && <Tag color="error" style={{fontSize:10,padding:'0 4px',margin:0}}>위험</Tag>}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{fontSize:13,fontWeight:700,color:row.workerName==='미배정'?'#EF4444':'#0F172A'}}>{row.workerName}</div>
                    {row.primary && <Tag style={{fontSize:10,padding:'0 4px',margin:'2px 0 0',background:pc(row.primary)+'20',color:pc(row.primary),border:'none'}}>{row.primary}</Tag>}
                    <Text style={{fontSize:10,color:'#94A3B8',display:'block',marginTop:2}}>{row.bars.length}건</Text>
                  </>
                )}
              </div>

              {/* 바 영역 */}
              <div style={{position:'relative',height:ROW_H,minWidth:totalW}}>
                {barLeft(today) >= 0 && barLeft(today) <= totalW && (
                  <div style={{position:'absolute',left:barLeft(today),top:0,bottom:0,width:2,background:'#3B82F6',opacity:0.4,zIndex:5}} />
                )}
                {viewMode === 'job' && row.dueDate && (
                  <div style={{position:'absolute',left:barLeft(row.dueDate)+dayWidth/2,top:0,bottom:0,width:2,background:'#EF4444',opacity:0.5,zIndex:5}} />
                )}
                {dates.map((d,i) => (
                  <div key={i} style={{position:'absolute',left:i*dayWidth,top:0,bottom:0,width:dayWidth,
                    background:(d.day()===0||d.day()===6)?'rgba(241,245,249,0.7)':'transparent',
                    borderRight:'1px solid #F8FAFC'}} />
                ))}

                {row.bars.map((bar, bi) => {
                  const snap = getSnap(bar.taskIdx)
                  const isDrag = !!snap
                  const left = barLeft(bar.startDate) + 2
                  const width = Math.max(barW(bar.startDate, bar.endDate) - 4, dayWidth - 4)
                  const showLabel = width > dayWidth + 10
                  const labelText = viewMode === 'worker'
                    ? (showLabel ? `${(bar.jobNo||'').slice(-5)} ${bar.label}` : '')
                    : (showLabel ? bar.label : '')

                  return (
                    <div key={bi}>
                      {isDrag && (snap.dd !== 0 || snap.rd !== 0) && (
                        <div style={{
                          position:'absolute',top:'50%',transform:'translateY(-50%)',
                          left,width,height:24,borderRadius:5,
                          border:'2px dashed #CBD5E1',opacity:0.5,pointerEvents:'none',
                        }} />
                      )}
                      <Tooltip title={isDrag ? '' : (
                        <div>
                          <div><strong>{viewMode==='worker' ? `${bar.jobNo} — ${bar.label}` : bar.label}</strong>{bar.partName && <span style={{marginLeft:6,opacity:0.8}}>({bar.partName})</span>}</div>
                          <div>{bar.startDate} ~ {bar.endDate}</div>
                          <div>작업자: {bar.worker || '미배정'}</div>
                          <div>설비: {bar.equip || '—'}</div>
                          {bar.warning && <div style={{color:'#FCA5A5'}}>⚠ {bar.warning}</div>}
                        </div>
                      )} open={isDrag ? false : undefined}>
                        <div
                          onMouseDown={e => onBarDown(e, bar, ri)}
                          style={{
                            position:'absolute',top:'50%',
                            transform: isDrag ? `translateY(-50%) translate(${snap.sx}px,${snap.sy}px)` : 'translateY(-50%)',
                            left,width,height:24,borderRadius:5,
                            background: bar.status==='위험' ? '#EF4444' : pc(bar.label),
                            opacity: isDrag ? 0.92 : 0.88,
                            display:'flex',alignItems:'center',justifyContent:'center',
                            fontSize:10,fontWeight:700,color:'#fff',
                            cursor: isDrag ? 'grabbing' : 'grab',
                            boxShadow: isDrag ? '0 4px 16px rgba(0,0,0,0.35)' : '0 1px 4px rgba(0,0,0,0.18)',
                            border: bar.warning ? '2px solid #FCA5A5' : 'none',
                            zIndex: isDrag ? 100 : 1,
                            transition: isDrag ? 'none' : 'box-shadow 0.15s',
                            userSelect:'none',
                          }}
                        >
                          {isDrag && (snap.dd !== 0 || snap.rd !== 0) && (
                            <div style={{
                              position:'absolute',top:-22,left:'50%',transform:'translateX(-50%)',
                              fontSize:10,background:'#1E293B',color:'#fff',
                              padding:'2px 8px',borderRadius:4,whiteSpace:'nowrap',zIndex:101,
                              boxShadow:'0 2px 8px rgba(0,0,0,0.3)',
                            }}>
                              {dayjs(bar.startDate).add(snap.dd,'day').format('M/D')}~{dayjs(bar.endDate).add(snap.dd,'day').format('M/D')}
                              {snap.rd !== 0 && rows[Math.max(0,Math.min(rows.length-1,ri+snap.rd))]
                                ? ` → ${rows[Math.max(0,Math.min(rows.length-1,ri+snap.rd))].workerName||''}` : ''}
                            </div>
                          )}
                          {labelText}
                        </div>
                      </Tooltip>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {rowPadBottom > 0 && <div style={{height:rowPadBottom}} />}
        </div>

        {/* 범례 */}
        <div style={{marginTop:16,display:'flex',gap:12,flexWrap:'wrap',padding:'8px 0',borderTop:'1px solid #F1F5F9'}}>
          {Object.entries(PROC_COLOR).map(([name, color]) => (
            <Space key={name} size={5}>
              <div style={{width:12,height:12,borderRadius:3,background:color}} />
              <Text style={{fontSize:11,color:'#64748B'}}>{name}</Text>
            </Space>
          ))}
          <Space size={5}><div style={{width:2,height:12,background:'#3B82F6',opacity:0.5}} /><Text style={{fontSize:11,color:'#64748B'}}>오늘</Text></Space>
          <Space size={5}><div style={{width:2,height:12,background:'#EF4444',opacity:0.5}} /><Text style={{fontSize:11,color:'#64748B'}}>납기</Text></Space>
        </div>
      </div>
    </div>
  )
}

// ─── 작업자 일일계획 뷰 ──────────────────────────────────────────
function WorkerPlanView({ workerPlan, dateRange }) {
  const [selectedDate, setSelectedDate] = useState(dateRange[0])

  const start = dayjs(dateRange[0])
  const end = dayjs(dateRange[1])
  const dates = []
  for (let d = start.clone(); !d.isAfter(end); d = d.add(1, 'day')) {
    dates.push(d.format('YYYY-MM-DD'))
  }

  return (
    <div>
      <Space style={{marginBottom:16}} size={8}>
        <Text strong>날짜 선택:</Text>
        <Select style={{width:160}} value={selectedDate} onChange={setSelectedDate}
          options={dates.map(d => ({ label:`${d} (${['일','월','화','수','목','금','토'][dayjs(d).day()]})`, value:d }))} />
      </Space>

      <Row gutter={12}>
        {Object.entries(workerPlan).map(([workerName, tasks]) => {
          const dayTasks = tasks.filter(t => t.date === selectedDate)
          return (
            <Col key={workerName} span={8} style={{marginBottom:12}}>
              <Card bordered={false} size="small"
                style={{borderRadius:10, boxShadow:'0 1px 3px rgba(0,0,0,0.06)', borderTop:`3px solid ${dayTasks.length>0?'#3B82F6':'#E2E8F0'}`}}
                styles={{body:{padding:'12px'}}}>
                <Space style={{marginBottom:8}}>
                  <UserOutlined style={{color:'#3B82F6'}} />
                  <Text strong>{workerName}</Text>
                  <Tag color={dayTasks.length>0?'blue':'default'} style={{fontSize:10}}>{dayTasks.length}건</Tag>
                </Space>
                {dayTasks.length === 0 ? (
                  <Text type="secondary" style={{fontSize:12}}>작업 없음</Text>
                ) : (
                  dayTasks.map((t, i) => (
                    <div key={i} style={{
                      padding:'6px 10px', marginBottom:4, borderRadius:8,
                      background:pc(t.processName)+'15', borderLeft:`3px solid ${pc(t.processName)}`,
                    }}>
                      <div style={{fontSize:12,fontWeight:700,color:'#0F172A',fontFamily:'monospace'}}>{t.jobNo}</div>
                      <div style={{fontSize:11,color:'#64748B'}}>{t.productName}</div>
                      <Space size={4} style={{marginTop:3}}>
                        <Tag style={{fontSize:10,padding:'0 6px',margin:0,background:pc(t.processName)+'20',color:pc(t.processName),border:'none'}}>{t.processName}</Tag>
                        <Text style={{fontSize:10,color:'#94A3B8'}}>{t.equip}</Text>
                      </Space>
                    </div>
                  ))
                )}
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}

// ─── 일자별 확장 (task가 걸친 모든 근무일에 카운트) ──────────────
function expandTasksByDate(tasks) {
  const map = {}
  tasks.forEach(t => {
    if (!t.startDate || !t.endDate) return
    let cur = dayjs(t.startDate)
    const end = dayjs(t.endDate)
    let guard = 0
    while (!cur.isAfter(end) && guard < 400) {
      const key = cur.format('YYYY-MM-DD')
      if (!map[key]) map[key] = []
      map[key].push(t)
      cur = cur.add(1, 'day')
      guard++
    }
  })
  return map
}

// 주차 시작일 — 일요일~토요일 기준 (금산산기 주차 관례)
function weekBucketStart(dateStr) {
  const d = dayjs(dateStr)
  return d.subtract(d.day(), 'day').format('YYYY-MM-DD')
}

function summarizeTasks(dayTasks) {
  const byProcess = {}
  let qty = 0, risk = 0
  dayTasks.forEach(t => {
    byProcess[t.processName] = (byProcess[t.processName] || 0) + 1
    qty += t.qty || 0
    if (t.status === '위험') risk++
  })
  return { count: dayTasks.length, qty, risk, byProcess }
}

function ProcessBreakdownTags({ byProcess }) {
  return (
    <Space size={4} wrap>
      {Object.entries(byProcess).map(([name, cnt]) => (
        <Tag key={name} style={{background:pc(name)+'20',color:pc(name),border:`1px solid ${pc(name)}55`,fontSize:11}}>{name} {cnt}</Tag>
      ))}
    </Space>
  )
}

// ─── 일일 생산계획 뷰 — 자동계획 결과를 날짜별로 집계 ──────────────
function DailyPlanView({ tasks }) {
  const byDate = useMemo(() => expandTasksByDate(tasks), [tasks])
  const dates = useMemo(() => Object.keys(byDate).sort(), [byDate])

  if (!dates.length) return <Empty description="계획 생성 후 확인 가능합니다" />

  const dataSource = dates.map(date => ({ key: date, date, ...summarizeTasks(byDate[date]) }))

  const cols = [
    { title:'날짜', dataIndex:'date', width:110, render:v=><Text strong style={{fontFamily:'monospace'}}>{v}</Text> },
    { title:'요일', dataIndex:'date', width:60, align:'center',
      render:v=>{ const d=dayjs(v); const isWE=d.day()===0||d.day()===6
        return <Text style={{color:isWE?'#EF4444':'#0F172A'}}>{'일월화수목금토'[d.day()]}</Text> } },
    { title:'작업건수', dataIndex:'count', width:90, align:'center', render:v=><Tag color="blue">{v}건</Tag> },
    { title:'총수량', dataIndex:'qty', width:100, align:'center', render:v=><Text strong>{v.toLocaleString()}</Text> },
    { title:'공정별 건수', key:'byProcess', render:(_,r)=><ProcessBreakdownTags byProcess={r.byProcess} /> },
    { title:'위험', dataIndex:'risk', width:70, align:'center',
      render:v=>v>0 ? <Tag color="error">{v}건</Tag> : <Text type="secondary">—</Text> },
  ]

  return <Table columns={cols} dataSource={dataSource} pagination={false} bordered size="small" virtual scroll={{y:560}} />
}

// ─── 주간 생산계획 뷰 — 자동계획 결과를 주(일~토) 단위로 집계 ──────
function WeeklyPlanView({ tasks }) {
  const byDate = useMemo(() => expandTasksByDate(tasks), [tasks])
  const byWeek = useMemo(() => {
    const map = {}
    Object.entries(byDate).forEach(([date, dayTasks]) => {
      const wk = weekBucketStart(date)
      if (!map[wk]) map[wk] = []
      map[wk].push(...dayTasks)
    })
    return map
  }, [byDate])
  const weeks = useMemo(() => Object.keys(byWeek).sort(), [byWeek])

  if (!weeks.length) return <Empty description="계획 생성 후 확인 가능합니다" />

  const dataSource = weeks.map(wk => ({
    key: wk,
    range: `${dayjs(wk).format('MM/DD')} ~ ${dayjs(wk).add(6,'day').format('MM/DD')}`,
    ...summarizeTasks(byWeek[wk]),
  }))

  const cols = [
    { title:'주차 (일~토)', dataIndex:'range', width:160, render:v=><Text strong>{v}</Text> },
    { title:'작업건수', dataIndex:'count', width:90, align:'center', render:v=><Tag color="blue">{v}건</Tag> },
    { title:'총수량', dataIndex:'qty', width:100, align:'center', render:v=><Text strong>{v.toLocaleString()}</Text> },
    { title:'공정별 건수', key:'byProcess', render:(_,r)=><ProcessBreakdownTags byProcess={r.byProcess} /> },
    { title:'위험', dataIndex:'risk', width:70, align:'center',
      render:v=>v>0 ? <Tag color="error">{v}건</Tag> : <Text type="secondary">—</Text> },
  ]

  return <Table columns={cols} dataSource={dataSource} pagination={false} bordered size="small" />
}

// ─── 작업지시 목록 뷰 ────────────────────────────────────────────
function TaskListView({ tasks }) {
  const dataSource = useMemo(() => tasks.map((t,i)=>({...t,key:i})), [tasks])
  const cols = [
    { title:'제번', dataIndex:'jobNo', width:120, fixed:'left', render:v=><Text strong style={{color:'#3B82F6',fontSize:12,fontFamily:'monospace'}}>{v}</Text> },
    { title:'제품명', dataIndex:'productName', width:160, ellipsis:true, render:v=><Text>{v}</Text> },
    { title:'부품', dataIndex:'partName', width:110, ellipsis:true,
      render:v=>v ? <Tag color="purple" style={{fontSize:11}}>{v}</Tag> : <Text type="secondary">완제품</Text> },
    { title:'공정', dataIndex:'processName', render:v=><Tag style={{background:pc(v)+'20',color:pc(v),border:`1px solid ${pc(v)}55`,fontWeight:600,fontSize:11}}>{v}</Tag> },
    { title:'수량', dataIndex:'qty', width:50, align:'center' },
    { title:'시작일', dataIndex:'startDate', width:100 },
    { title:'완료예정', dataIndex:'endDate', width:100,
      render:(v,r)=><Text style={{color:r.status==='위험'?'#EF4444':'',fontWeight:r.status==='위험'?700:400}}>{v}</Text> },
    { title:'납기일', dataIndex:'dueDate', width:100, render:v=><Text type="secondary">{v||'—'}</Text> },
    { title:'작업자', dataIndex:'assignedWorker', width:130,
      render:(v,r)=>(
        <Space direction="vertical" size={0}>
          <Text style={{fontSize:12,color:r.assignedWorkerList?.length?'':'#EF4444'}}>{v||'미배정'}</Text>
          {r.neededWorkers > 1 && (
            <Text style={{fontSize:10,color:r.assignedWorkerCount>=r.neededWorkers?'#10B981':'#F59E0B'}}>
              {r.assignedWorkerCount||0}/{r.neededWorkers}명
            </Text>
          )}
        </Space>
      )},
    { title:'설비', dataIndex:'assignedEquip', width:80, render:v=><Text style={{fontSize:12}}>{v||'—'}</Text> },
    { title:'소요(분)', dataIndex:'hours', width:70, align:'center', render:v=><Text strong style={{color:'#7C3AED'}}>{Math.round((v||0)*60)}분</Text> },
    { title:'상태', dataIndex:'status', width:200,
      render:(v,r)=>(
        <span style={{whiteSpace:'nowrap'}}>
          <Badge status={v==='위험'?'error':v==='주의'?'warning':v==='예정'?'processing':'default'} text={v} />
          {r.warning && <Text style={{fontSize:10,color:v==='위험'?'#EF4444':'#F59E0B',marginLeft:10}}>({r.warning})</Text>}
        </span>
      )},
  ]

  return (
    <Table columns={cols} dataSource={dataSource}
      pagination={false} size="small"
      bordered
      virtual
      scroll={{y:560}}
      style={{fontSize:12}}
      rowClassName={() => 'compact-row'}
    />
  )
}

const PRIORITY_OPTIONS = [
  { label: '납기우선 (EDD)', value: 'EDD', desc: '납기일이 가장 빠른 수주 먼저 배정' },
  { label: '여유시간우선 (Slack)', value: 'SLACK', desc: '납기까지 여유가 가장 적은 수주 먼저' },
  { label: '투입순 (FIFO)', value: 'FIFO', desc: '수주 입력 순서대로 배정' },
]

// 페이지를 이동했다 돌아와도 생성된 계획이 사라지지 않도록 localStorage에 보존 —
// 사용자가 명시적으로 "초기화"를 누르기 전까지는 유지한다.
const PERSIST_KEY = 'pp_autoschedule_state'
function loadPersisted() {
  try { return JSON.parse(localStorage.getItem(PERSIST_KEY) || 'null') } catch { return null }
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────
export function AutoSchedule({ initialTab } = {}) {
  const persisted = loadPersisted()
  const [tasks, setTasks] = useState(persisted?.tasks ?? null)
  const [modifiedCount, setModifiedCount] = useState(persisted?.modifiedCount ?? 0)
  const [generating, setGenerating] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [startDateStr, setStartDateStr] = useState(persisted?.startDateStr ?? dayjs().format('YYYY-MM-DD'))
  const [activeTab, setActiveTab] = useState(initialTab || 'gantt')
  const [priorityRule, setPriorityRule] = useState(persisted?.priorityRule ?? 'EDD')
  const [saving, setSaving] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyList, setHistoryList] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // 실제 DB 데이터
  const [orders, setOrders] = useState(SAMPLE_ORDERS)
  const [routes, setRoutes] = useState(SAMPLE_ROUTES)
  const [workers, setWorkers] = useState(SAMPLE_WORKERS)
  const [equips, setEquips] = useState(SAMPLE_EQUIPS)
  const [bomItems, setBomItems] = useState([])
  const [usingRealData, setUsingRealData] = useState(false)

  const ganttData = useMemo(() => tasks ? buildGanttData(tasks) : null, [tasks])
  const workerPlan = useMemo(() => tasks ? buildWorkerDailyPlan(tasks, workers) : null, [tasks, workers])

  useEffect(() => {
    try {
      if (tasks) localStorage.setItem(PERSIST_KEY, JSON.stringify({ tasks, modifiedCount, startDateStr, priorityRule }))
      else localStorage.removeItem(PERSIST_KEY)
    } catch { /* localStorage 용량 초과 등은 무시 — 계획은 화면에서는 계속 유지됨 */ }
  }, [tasks, modifiedCount, startDateStr, priorityRule])

  const handleReset = () => {
    setTasks(null)
    setModifiedCount(0)
  }

  useEffect(() => {
    Promise.all([
      fetchOrders().catch(() => []),
      fetchProcessRoutes().catch(() => []),
      fetchWorkers().catch(() => []),
      fetchEquipment().catch(() => []),
      fetchBom().catch(() => []),
    ]).then(([ords, rts, wkrs, eqs, bom]) => {
      let real = false
      if (ords.length)  { setOrders(ords.filter(o => (o.remainQty || o.orderQty || 0) > 0)); real = true }
      if (rts.length)   { setRoutes(rts);   real = true }
      if (wkrs.length)  { setWorkers(wkrs); real = true }
      if (eqs.length)   { setEquips(eqs);   real = true }
      setBomItems(bom)
      setUsingRealData(real)
    }).finally(() => setDataLoading(false))
  }, [])

  const handleSave = async () => {
    if (!tasks?.length) return
    setSaving(true)
    try {
      const label = `${startDateStr} 계획 (${PRIORITY_OPTIONS.find(p=>p.value===priorityRule)?.label})`
      await saveSchedule({ label, priority: priorityRule, startDate: startDateStr, tasks })
      message.success('계획이 저장되었습니다.')
    } catch(e) { message.error('저장 실패: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleOpenHistory = async () => {
    setHistoryOpen(true)
    setHistoryLoading(true)
    try {
      const list = await fetchSchedules()
      setHistoryList(list)
    } catch { message.error('이력 조회 실패') }
    finally { setHistoryLoading(false) }
  }

  const handleLoadSchedule = async (id) => {
    try {
      const row = await fetchScheduleById(id)
      const loaded = row.tasks
      setTasks(loaded)
      setModifiedCount(0)
      setHistoryOpen(false)
      message.success(`"${row.label}" 불러왔습니다.`)
    } catch(e) { message.error('불러오기 실패: ' + e.message) }
  }

  const handleDeleteSchedule = async (id) => {
    try {
      await deleteSchedule(id)
      setHistoryList(prev => prev.filter(r => r.id !== id))
      message.success('삭제되었습니다.')
    } catch { message.error('삭제 실패') }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const startDate = new Date(startDateStr)
      const activeRules = await loadScheduleRules()
      const result = schedule(orders, routes, workers, equips, bomItems, startDate, { priorityRule, rules: activeRules })
      setTasks(result)
      setModifiedCount(0)
      const ruleCount = activeRules.length
      message.success(`${result.length}개 작업 일정 생성${ruleCount ? ` (규칙 ${ruleCount}건 적용)` : ''}`)
    } catch(e) {
      message.error(`스케줄링 오류: ${e.message}`)
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  const handleTaskUpdate = (taskIdx, updates) => {
    const old = tasks[taskIdx]
    const parts = []
    if (updates.startDate) parts.push(`${old.startDate}~${old.endDate} → ${updates.startDate}~${updates.endDate}`)
    if (updates.assignedWorkerName !== undefined) parts.push(`${old.assignedWorkerName || '미배정'} → ${updates.assignedWorkerName || '미배정'}`)
    message.info(`${old.jobNo} ${old.processName}: ${parts.join(' / ')}`)

    setTasks(prev => prev.map((t, i) => {
      if (i !== taskIdx) return t
      const u = { ...t, ...updates }
      if (u.dueDate && dayjs(u.endDate).isAfter(dayjs(u.dueDate))) {
        u.status = '위험'
        u.warning = `납기(${u.dueDate}) 초과 예상`
      } else if (u.status === '위험') {
        u.status = '예정'
        u.warning = null
      }
      return u
    }))
    setModifiedCount(c => c + 1)
  }

  // Gantt 날짜 범위 계산
  const { ganttStart, ganttEnd } = useMemo(() => {
    if (!tasks || tasks.length === 0) return { ganttStart: startDateStr, ganttEnd: dayjs(startDateStr).add(14,'day').format('YYYY-MM-DD') }
    const allDates = tasks.flatMap(t => [t.startDate, t.endDate]).filter(Boolean)
    const minDate = allDates.reduce((m,d) => d < m ? d : m, allDates[0])
    const maxDate = allDates.reduce((m,d) => d > m ? d : m, allDates[0])
    // 범위 ±3일 여유
    return {
      ganttStart: dayjs(minDate).subtract(1,'day').format('YYYY-MM-DD'),
      ganttEnd:   dayjs(maxDate).add(3,'day').format('YYYY-MM-DD'),
    }
  }, [tasks, startDateStr])

  const riskTasks = tasks?.filter(t => t.status === '위험') || []
  const unassigned = tasks?.filter(t => !t.assignedWorkerName) || []

  const tabItems = [
    {
      key: 'gantt',
      label: <Space><CalendarOutlined />Gantt 차트</Space>,
      children: ganttData
        ? <GanttView ganttData={ganttData} tasks={tasks} workers={workers} startDate={ganttStart} endDate={ganttEnd} onTaskUpdate={handleTaskUpdate} />
        : <Empty description="좌측 상단에서 '자동 계획 생성'을 클릭하세요" />,
    },
    {
      key: 'worker',
      label: <Space><UserOutlined />작업자 일일계획</Space>,
      children: workerPlan
        ? <WorkerPlanView workerPlan={workerPlan} dateRange={[ganttStart, ganttEnd]} />
        : <Empty description="계획 생성 후 확인 가능합니다" />,
    },
    {
      key: 'day',
      label: <Space><ClockCircleOutlined />일일 생산계획</Space>,
      children: tasks
        ? <DailyPlanView tasks={tasks} />
        : <Empty description="계획 생성 후 확인 가능합니다" />,
    },
    {
      key: 'week',
      label: <Space><ScheduleOutlined />주간 생산계획</Space>,
      children: tasks
        ? <WeeklyPlanView tasks={tasks} />
        : <Empty description="계획 생성 후 확인 가능합니다" />,
    },
    {
      key: 'list',
      label: <Space><BarChartOutlined />작업지시 목록</Space>,
      children: tasks
        ? <TaskListView tasks={tasks} />
        : <Empty description="계획 생성 후 확인 가능합니다" />,
    },
  ]

  const activeEquips = equips.filter(e => e.status === '가동')
  const priorityDesc = PRIORITY_OPTIONS.find(p => p.value === priorityRule)?.desc || ''

  return (
    <div>
      <div style={{marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <Title level={4} style={{margin:0}}>자동 생산계획 생성</Title>
          <Text type="secondary">수주 + 공정경로 + 작업자/설비 마스터 기반 유한능력 스케줄링</Text>
        </div>
        <Space wrap>
          {!usingRealData && (
            <Tag color="warning" style={{fontSize:11}}>샘플 데이터 사용 중 — 마스터 데이터 입력 후 실데이터로 전환됩니다</Tag>
          )}
          <Select
            value={startDateStr}
            onChange={setStartDateStr}
            style={{width:160}}
            options={Array.from({length:14},(_,i)=>{
              const d = dayjs().add(i,'day')
              return { label:`${d.format('MM/DD')} (${['일','월','화','수','목','금','토'][d.day()]}) 시작`, value:d.format('YYYY-MM-DD') }
            })}
          />
          <Tooltip title={priorityDesc}>
            <Select
              value={priorityRule}
              onChange={setPriorityRule}
              style={{width:170}}
              options={PRIORITY_OPTIONS.map(p => ({label:p.label, value:p.value}))}
            />
          </Tooltip>
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            loading={generating || dataLoading}
            onClick={handleGenerate}
            style={{background:'linear-gradient(135deg,#3B82F6,#7C3AED)',border:'none',fontWeight:700}}
          >
            자동 계획 생성
          </Button>
          {tasks && (
            <Button icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
              계획 저장
            </Button>
          )}
          {modifiedCount > 0 && <Tag color="orange" style={{fontSize:11}}>수동 조정 {modifiedCount}건</Tag>}
          <Button icon={<HistoryOutlined />} onClick={handleOpenHistory}>이력</Button>
          {tasks && (
            <Popconfirm title="화면의 계획을 초기화할까요?" description="저장하지 않은 수동 조정 내용은 사라집니다."
              okText="초기화" cancelText="취소" okButtonProps={{danger:true}} onConfirm={handleReset}>
              <Button icon={<ClearOutlined />} danger>초기화</Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* 저장 이력 Modal */}
      <Modal title="저장된 계획 이력" open={historyOpen} onCancel={()=>setHistoryOpen(false)}
        footer={null} width={700}>
        <Spin spinning={historyLoading}>
          {historyList.length === 0 ? (
            <Empty description="저장된 계획이 없습니다" />
          ) : (
            <Table
              size="small"
              pagination={false}
              dataSource={historyList.map(r=>({...r,key:r.id}))}
              columns={[
                { title:'계획명', dataIndex:'label', render:v=><Text strong style={{fontSize:12}}>{v}</Text> },
                { title:'우선순위', dataIndex:'priority', width:100, render:v=><Tag>{v}</Tag> },
                { title:'작업 수', dataIndex:'stat_total', width:80, align:'center', render:v=><Text>{v}건</Text> },
                { title:'위험', dataIndex:'stat_risk', width:70, align:'center',
                  render:v=><Text style={{color:v>0?'#EF4444':'#94A3B8',fontWeight:v>0?700:400}}>{v}건</Text> },
                { title:'저장일시', dataIndex:'created_at', width:140,
                  render:v=><Text type="secondary" style={{fontSize:11}}>{new Date(v).toLocaleString('ko-KR')}</Text> },
                { title:'', width:100, render:(_,r)=>(
                  <Space size={4}>
                    <Button size="small" type="link" onClick={()=>handleLoadSchedule(r.id)}>불러오기</Button>
                    <Popconfirm title="삭제할까요?" okText="삭제" cancelText="취소" okButtonProps={{danger:true}}
                      onConfirm={()=>handleDeleteSchedule(r.id)}>
                      <Button size="small" type="link" danger>삭제</Button>
                    </Popconfirm>
                  </Space>
                )},
              ]}
            />
          )}
        </Spin>
      </Modal>

      {/* 입력 데이터 상태 */}
      <Spin spinning={dataLoading}>
        <Row gutter={12} style={{marginBottom:16}}>
          {[
            {l:'수주',        v:`${orders.length}건`,          c:'#3B82F6', icon:<CalendarOutlined />},
            {l:'공정경로 등록', v:`${routes.length}개 제품`,   c:'#7C3AED', icon:<ToolOutlined />},
            {l:'작업자',      v:`${workers.length}명`,         c:'#10B981', icon:<UserOutlined />},
            {l:'가동 설비',   v:`${activeEquips.length}대`,    c:'#F59E0B', icon:<ToolOutlined />},
          ].map((s,i)=>(
            <Col key={i} span={6}>
              <Card bordered={false} style={{borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',borderLeft:`4px solid ${s.c}`}} styles={{body:{padding:'12px 16px'}}}>
                <Space><Text style={{fontSize:12,color:s.c}}>{s.icon}</Text><Text style={{fontSize:12,color:'#64748B'}}>{s.l}</Text></Space>
                <Text strong style={{fontSize:20,color:s.c,display:'block',marginTop:4}}>{s.v}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>

      {/* 생성 결과 경고 */}
      {tasks && riskTasks.length > 0 && (
        <Alert
          type="error" showIcon icon={<WarningOutlined />}
          message={`납기 초과 위험 ${riskTasks.length}건 — ${[...new Set(riskTasks.map(t=>t.jobNo))].join(', ')}`}
          style={{marginBottom:16,borderRadius:10}}
        />
      )}
      {tasks && unassigned.length > 0 && (
        <Alert
          type="warning" showIcon icon={<WarningOutlined />}
          message={`작업자 미배정 ${unassigned.length}건 — 공정 담당 가능 작업자를 확인하세요`}
          style={{marginBottom:16,borderRadius:10}}
        />
      )}
      {tasks && riskTasks.length === 0 && unassigned.length === 0 && (
        <Alert
          type="success" showIcon icon={<CheckCircleOutlined />}
          message="모든 수주의 납기 내 일정 수립 완료 — 작업자 및 설비 전량 배정됨"
          style={{marginBottom:16,borderRadius:10}}
        />
      )}

      {/* 생성 결과 KPI */}
      {tasks && (
        <Row gutter={12} style={{marginBottom:16}}>
          {[
            {l:'총 작업지시',    v:tasks.length+'건',                       c:'#3B82F6'},
            {l:'납기위험',       v:riskTasks.length+'건',                    c:'#EF4444'},
            {l:'미배정',         v:unassigned.length+'건',                   c:'#F59E0B'},
            {l:'총 소요시간',    v:Math.round(tasks.reduce((s,t)=>s+(t.totalHours||0),0)*60).toLocaleString()+'분', c:'#7C3AED'},
          ].map((s,i)=>(
            <Col key={i} span={6}>
              <Card bordered={false} style={{borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',borderTop:`3px solid ${s.c}`}} styles={{body:{padding:'12px 16px'}}}>
                <Statistic title={<Text style={{fontSize:12,color:'#64748B'}}>{s.l}</Text>} value={s.v} valueStyle={{fontSize:20,fontWeight:800,color:s.c}} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* 결과 탭 */}
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  )
}
