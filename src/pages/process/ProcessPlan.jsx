import { useState, useCallback } from 'react'
import { Table, Card, Row, Col, Button, Space, Select, Tag, Typography, Badge, Progress, Tooltip,
  Form, Input, InputNumber, Modal, Drawer, Steps, Divider, Alert, message, Empty, Popconfirm, Statistic } from 'antd'
import { PlusOutlined, PrinterOutlined, DownloadOutlined, SettingOutlined,
  InboxOutlined, FileExcelOutlined, CheckCircleOutlined, EditOutlined, DeleteOutlined,
  ArrowRightOutlined, ClockCircleOutlined, TeamOutlined, ToolOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'

const { Title, Text } = Typography

const WORK_ORDERS = [
  { key:1, wo:'WO-2605-001', so:'SO-2605-001', product:'EL-2000 카케이스',   process:'레이저→벤딩→용접→도장',     assignee:'김철수', start:'2026-05-19', end:'2026-05-30', plan:12, done:10, status:'진행' },
  { key:2, wo:'WO-2605-002', so:'SO-2605-002', product:'HH-프레임 ASSY',     process:'레이저→용접→도장→조립',     assignee:'이영희', start:'2026-05-19', end:'2026-05-31', plan:8,  done:5,  status:'진행' },
  { key:3, wo:'WO-2605-003', so:'SO-2605-003', product:'제관 판넬 A타입',    process:'레이저→벤딩→도장',          assignee:'박민준', start:'2026-05-08', end:'2026-05-28', plan:20, done:20, status:'완료' },
  { key:4, wo:'WO-2605-004', so:'SO-2605-004', product:'구조체 브라켓 SET',  process:'레이저→프레스→용접→조립',   assignee:'정수진', start:'2026-05-15', end:'2026-05-31', plan:15, done:8,  status:'지연' },
  { key:5, wo:'WO-2605-005', so:'SO-2605-005', product:'도어프레임 EL',      process:'레이저→벤딩→도장',          assignee:'미배정', start:'2026-05-29', end:'2026-06-10', plan:6,  done:0,  status:'대기' },
]

const STATUS = { 완료:{color:'success',badge:'success'}, 진행:{color:'processing',badge:'processing'}, 지연:{color:'error',badge:'error'}, 대기:{color:'default',badge:'default'} }

const woColumns = [
  { title:'작업지시', dataIndex:'wo', width:130, fixed:'left', render:v=><Text strong style={{color:'#3B82F6',fontSize:12}}>{v}</Text> },
  { title:'수주번호', dataIndex:'so', width:120, render:v=><Text type="secondary" style={{fontSize:12}}>{v}</Text> },
  { title:'제품명', dataIndex:'product', render:v=><Text strong>{v}</Text> },
  { title:'공정순서', dataIndex:'process', render:v=>(
    <Space size={2} wrap>
      {v.split('→').map((p,i,arr)=>[
        <Tag key={p} style={{fontSize:11,margin:0}}>{p}</Tag>,
        i<arr.length-1 && <Text key={`a${i}`} type="secondary" style={{fontSize:10}}>→</Text>
      ])}
    </Space>
  )},
  { title:'담당자', dataIndex:'assignee', width:90, render:v=><Text style={{color:v==='미배정'?'#EF4444':'',fontWeight:v==='미배정'?700:''}}>{v}</Text> },
  { title:'시작일', dataIndex:'start', width:100 },
  { title:'완료예정', dataIndex:'end', width:100, render:(v,r)=><Text style={{color:r.status==='지연'?'#EF4444':'',fontWeight:r.status==='지연'?700:''}}>{v}</Text> },
  { title:'계획/완료', key:'qty', width:90, align:'center', render:(_,r)=><><Text strong style={{color:'#10B981'}}>{r.done}</Text><Text type="secondary"> / {r.plan}</Text></> },
  { title:'진행률', key:'rate', width:110,
    render:(_,r)=>{
      const pct = Math.round(r.done/r.plan*100)
      return <Space size={4}><Progress percent={pct} size="small" style={{width:70}} showInfo={false} strokeColor={pct===100?'#10B981':pct>60?'#3B82F6':'#F59E0B'} trailColor="#F1F5F9"/><Text style={{fontSize:11,fontWeight:700}}>{pct}%</Text></Space>
    },
  },
  { title:'상태', dataIndex:'status', width:80, filters:[{text:'완료',value:'완료'},{text:'진행',value:'진행'},{text:'지연',value:'지연'},{text:'대기',value:'대기'}], onFilter:(v,r)=>r.status===v,
    render:v=><Badge status={STATUS[v]?.badge} text={v} /> },
  { title:'액션', key:'action', width:100, fixed:'right',
    render:()=><Space size={4}><Button size="small">상세</Button><Button size="small" icon={<PrinterOutlined />}>출력</Button></Space> },
]

// ── Gantt 차트 (CSS 기반) ──
const DAYS = ['19','20','21','22','23','26','27','28','29','30','31']
const DAY_W = 42

const GANTT = [
  { wo:'WO-2605-001', product:'EL-2000 카케이스', bars:[
    {label:'레이저',start:0,len:3,color:'#3B82F6'},{label:'벤딩',start:3,len:2,color:'#7C3AED'},
    {label:'용접',start:5,len:3,color:'#F59E0B'},{label:'도장',start:8,len:2,color:'#10B981'},
  ]},
  { wo:'WO-2605-002', product:'HH-프레임 ASSY', bars:[
    {label:'레이저',start:0,len:2,color:'#3B82F6'},{label:'용접',start:2,len:5,color:'#F59E0B'},
    {label:'도장',start:7,len:3,color:'#10B981'},{label:'조립',start:10,len:1,color:'#0D9488'},
  ]},
  { wo:'WO-2605-004', product:'구조체 브라켓 SET', bars:[
    {label:'레이저',start:0,len:3,color:'#3B82F6'},{label:'프레스',start:3,len:3,color:'#7C3AED'},
    {label:'용접',start:6,len:4,color:'#F59E0B'},{label:'조립',start:10,len:1,color:'#0D9488'},
  ]},
]

function WorkOrder() {
  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>작업지시 발행</Title>
        <Text type="secondary">수주 기반 공정별 작업지시서 발행 및 관리</Text>
      </div>
      <Row gutter={12} style={{marginBottom:16}}>
        {[{l:'완료',v:1,c:'#10B981'},{l:'진행중',v:2,c:'#3B82F6'},{l:'지연',v:1,c:'#EF4444'},{l:'대기',v:1,c:'#94A3B8'}].map((s,i)=>(
          <Col key={i} span={6}>
            <Card bordered={false} style={{borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',borderLeft:`4px solid ${s.c}`}} styles={{body:{padding:'12px 16px'}}}>
              <Text style={{fontSize:12,color:'#64748B',display:'block'}}>{s.l}</Text>
              <Text strong style={{fontSize:22,color:s.c}}>{s.v}건</Text>
            </Card>
          </Col>
        ))}
      </Row>
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <Space style={{marginBottom:16,flexWrap:'wrap'}} size={8}>
          <Select defaultValue="2026-05" style={{width:130}} options={[{label:'2026년 5월',value:'2026-05'}]} />
          <Select placeholder="상태" style={{width:110}} allowClear options={[{label:'진행',value:'진행'},{label:'완료',value:'완료'},{label:'지연',value:'지연'},{label:'대기',value:'대기'}]} />
          <Button type="primary">조회</Button>
          <Button type="primary" icon={<PlusOutlined />} style={{marginLeft:'auto',background:'#10B981',borderColor:'#10B981'}}>작업지시 발행</Button>
          <Button>일괄 발행</Button>
        </Space>
        <Table columns={woColumns} dataSource={WORK_ORDERS} pagination={{pageSize:10}} size="middle" scroll={{x:1100}} />
      </Card>
    </div>
  )
}

function GanttChart() {
  const totalW = DAY_W * DAYS.length
  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>일정계획 (Gantt 차트)</Title>
        <Text type="secondary">공정별 작업일정 시각화 — 2026년 5월 4주차 (5/19~31)</Text>
      </div>
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <Space style={{marginBottom:16}} size={8}>
          <Select defaultValue="may" style={{width:200}} options={[{label:'2026년 5월 (19~31일)',value:'may'}]} />
          <Select defaultValue="day" style={{width:100}} options={[{label:'일별',value:'day'},{label:'주별',value:'week'}]} />
          <Button type="primary">조회</Button>
          <Button icon={<DownloadOutlined />}>PNG 저장</Button>
        </Space>

        <div style={{overflowX:'auto'}}>
          {/* 헤더 */}
          <div style={{display:'flex',borderBottom:'2px solid #E2E8F0',marginBottom:0}}>
            <div style={{width:220,flexShrink:0,padding:'8px 12px',fontSize:12,fontWeight:700,color:'#64748B',borderRight:'1px solid #E2E8F0'}}>작업지시 / 제품</div>
            <div style={{display:'flex',minWidth:totalW}}>
              {DAYS.map(d=>(
                <div key={d} style={{width:DAY_W,flexShrink:0,textAlign:'center',fontSize:11,color:'#64748B',padding:'8px 0',borderRight:'1px solid #F1F5F9',fontWeight:600}}>
                  5/{d}
                </div>
              ))}
            </div>
          </div>

          {/* 행 */}
          {GANTT.map((row,ri)=>(
            <div key={ri} style={{display:'flex',borderBottom:'1px solid #F8FAFC',alignItems:'center'}}>
              <div style={{width:220,flexShrink:0,padding:'10px 12px',borderRight:'1px solid #E2E8F0'}}>
                <div style={{fontSize:13,fontWeight:700,color:'#3B82F6'}}>{row.wo}</div>
                <div style={{fontSize:11,color:'#64748B',marginTop:1}}>{row.product}</div>
              </div>
              <div style={{position:'relative',height:48,minWidth:totalW}}>
                {/* 격자 */}
                {DAYS.map((_,i)=>(
                  <div key={i} style={{position:'absolute',left:i*DAY_W,top:0,bottom:0,width:1,background:'#F8FAFC'}} />
                ))}
                {/* 바 */}
                {row.bars.map((bar,bi)=>(
                  <Tooltip key={bi} title={`${bar.label} (${bar.len}일)`}>
                    <div style={{
                      position:'absolute', top:'50%', transform:'translateY(-50%)',
                      left: bar.start*DAY_W+3, width: bar.len*DAY_W-6,
                      height:22, borderRadius:5, background:bar.color,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:10, fontWeight:700, color:'#fff', cursor:'pointer',
                      boxShadow:'0 1px 4px rgba(0,0,0,0.2)', transition:'filter 0.1s',
                    }}>
                      {bar.len>1?bar.label:''}
                    </div>
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 범례 */}
        <div style={{marginTop:16,display:'flex',gap:16,flexWrap:'wrap'}}>
          {[{c:'#3B82F6',l:'레이저 절단'},{c:'#7C3AED',l:'프레스/벤딩'},{c:'#F59E0B',l:'용접'},{c:'#10B981',l:'도장'},{c:'#0D9488',l:'조립'}].map((leg,i)=>(
            <Space key={i} size={6}>
              <div style={{width:14,height:14,borderRadius:3,background:leg.c}} />
              <Text style={{fontSize:12,color:'#64748B'}}>{leg.l}</Text>
            </Space>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── 공정 색상 맵 ────────────────────────────────────────────────
const PROC_COLOR = {
  '레이저':'#3B82F6', '레이저절단':'#3B82F6',
  '벤딩':'#7C3AED',   '절곡':'#7C3AED',
  '용접':'#F59E0B',
  '탭핑':'#EC4899',   '탭':'#EC4899',
  '도장':'#10B981',   '도색':'#10B981',
  '포장':'#0D9488',   '조립':'#0D9488',
  '프레스':'#DC2626', '검사':'#64748B',
}
const procColor = name => PROC_COLOR[name] || PROC_COLOR[Object.keys(PROC_COLOR).find(k=>name?.includes(k))] || '#94A3B8'

// ─── 공정경로 마스터 데이터 (초기 샘플) ─────────────────────────
const INIT_ROUTES = [
  { key:'r1', productCode:'4UF0062*A', productName:'SILL SUPPORT', spec:'T4.5*60*109 W',
    processes:[
      { seq:1, name:'레이저', timePerEa:0.5, setupTime:0.5, workers:1, equip:'파이버 레이저 #1' },
      { seq:2, name:'벤딩',   timePerEa:0.3, setupTime:0.3, workers:1, equip:'CNC 벤딩 #1' },
      { seq:3, name:'탭핑',   timePerEa:0.2, setupTime:0.2, workers:1, equip:'탭핑 머신' },
      { seq:4, name:'포장',   timePerEa:0.1, setupTime:0.0, workers:1, equip:'—' },
    ]},
  { key:'r2', productCode:'3HH-001B', productName:'HH-프레임 ASSY', spec:'T3.2 SS400',
    processes:[
      { seq:1, name:'레이저', timePerEa:0.8, setupTime:0.5, workers:1, equip:'파이버 레이저 #2' },
      { seq:2, name:'용접',   timePerEa:1.5, setupTime:0.5, workers:2, equip:'CO2 용접 #1' },
      { seq:3, name:'도장',   timePerEa:0.5, setupTime:1.0, workers:1, equip:'도장 부스 #1' },
      { seq:4, name:'조립',   timePerEa:0.8, setupTime:0.3, workers:2, equip:'조립 라인' },
    ]},
  { key:'r3', productCode:'BKT-SET', productName:'구조체 브라켓 SET', spec:'T4.5 SS400',
    processes:[
      { seq:1, name:'레이저', timePerEa:0.6, setupTime:0.5, workers:1, equip:'파이버 레이저 #1' },
      { seq:2, name:'프레스', timePerEa:0.4, setupTime:0.5, workers:1, equip:'CNC 벤딩 #2' },
      { seq:3, name:'용접',   timePerEa:2.0, setupTime:0.5, workers:2, equip:'CO2 용접 #2' },
      { seq:4, name:'조립',   timePerEa:1.0, setupTime:0.3, workers:2, equip:'조립 라인' },
    ]},
]

// 엑셀 컬럼 매핑 (사용자 공정 엑셀 포맷)
const ROUTE_COL_MAP = {
  '제품코드':'productCode', '주문PT#':'productCode', 'Product Code':'productCode',
  '품명':'productName',     'Product Name':'productName',
  '규격':'spec',            'Spec':'spec',
  '공정순서':'seq',          '순서':'seq', 'Seq':'seq',
  '공정명':'name',           '공정':'name', 'Process':'name',
  '소요시간':'timePerEa',    'EA당시간(h)':'timePerEa', 'Time/EA':'timePerEa', '시간/EA':'timePerEa',
  '셋업시간':'setupTime',    'Setup(h)':'setupTime', '준비시간':'setupTime',
  '필요인원':'workers',      '인원':'workers', 'Workers':'workers',
  '사용설비':'equip',        '설비':'equip', 'Equipment':'equip',
}

function parseRouteExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type:'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' })
        if (raw.length < 2) { reject(new Error('데이터 없음')); return }

        // 헤더 탐색
        let hIdx = 0
        for (let i = 0; i < Math.min(5, raw.length); i++) {
          if (raw[i].some(c => ['공정명','Process','공정순서','제품코드'].includes(String(c).trim()))) { hIdx = i; break }
        }
        const headers = raw[hIdx].map(h => String(h).trim())
        const rows = raw.slice(hIdx+1).filter(r => r.some(c => c !== ''))

        // 제품별 그루핑
        const productMap = {}
        rows.forEach(row => {
          const obj = {}
          headers.forEach((h,i) => { const f = ROUTE_COL_MAP[h]; if(f) obj[f] = row[i] ?? '' })
          const key = String(obj.productCode || '').trim()
          if (!key) return
          if (!productMap[key]) productMap[key] = { productCode:key, productName:String(obj.productName||key), spec:String(obj.spec||''), processes:[] }
          if (obj.name) {
            productMap[key].processes.push({
              seq: Number(obj.seq) || productMap[key].processes.length + 1,
              name: String(obj.name || '').trim(),
              timePerEa: parseFloat(obj.timePerEa) || 0,
              setupTime: parseFloat(obj.setupTime) || 0,
              workers: parseInt(obj.workers) || 1,
              equip: String(obj.equip || '—'),
            })
          }
        })
        const result = Object.values(productMap).map((p,i) => ({
          ...p, key:`xl_${i}`,
          processes: p.processes.sort((a,b)=>a.seq-b.seq),
        }))
        resolve(result)
      } catch(err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ─── 공정 플로우 시각화 ──────────────────────────────────────────
function ProcessFlow({ processes }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
      {processes.map((p,i)=>(
        <Space key={i} size={4} style={{display:'flex',alignItems:'center'}}>
          <Tooltip title={
            <div>
              <div><strong>{p.name}</strong></div>
              <div>소요: {p.timePerEa}h/EA</div>
              <div>셋업: {p.setupTime}h</div>
              <div>인원: {p.workers}명</div>
              <div>설비: {p.equip}</div>
            </div>
          }>
            <div style={{
              padding:'3px 10px', borderRadius:12, fontSize:12, fontWeight:600,
              background:procColor(p.name)+'22', color:procColor(p.name), border:`1px solid ${procColor(p.name)}55`,
              whiteSpace:'nowrap', cursor:'default',
            }}>{p.name}</div>
          </Tooltip>
          {i < processes.length-1 && <ArrowRightOutlined style={{fontSize:10,color:'#CBD5E1'}} />}
        </Space>
      ))}
    </div>
  )
}

// ─── 공정 상세 Drawer ────────────────────────────────────────────
function RouteDetailDrawer({ route, open, onClose }) {
  if (!route) return null
  const totalTime = route.processes.reduce((s,p) => s + p.timePerEa, 0)
  const totalSetup = route.processes.reduce((s,p) => s + p.setupTime, 0)
  const maxWorkers = Math.max(...route.processes.map(p=>p.workers))

  const procCols = [
    { title:'순서', dataIndex:'seq', width:55, align:'center', render:v=><Tag style={{margin:0,fontWeight:700}}>{v}</Tag> },
    { title:'공정명', dataIndex:'name', render:(v)=>(
      <Space size={6}>
        <div style={{width:10,height:10,borderRadius:3,background:procColor(v),flexShrink:0}} />
        <Text strong>{v}</Text>
      </Space>
    )},
    { title:'소요시간/EA', dataIndex:'timePerEa', align:'center', render:v=><Text strong style={{color:'#3B82F6'}}>{v}h</Text> },
    { title:'셋업시간', dataIndex:'setupTime', align:'center', render:v=><Text type="secondary">{v}h</Text> },
    { title:'필요인원', dataIndex:'workers', align:'center', render:v=><Text><TeamOutlined /> {v}명</Text> },
    { title:'사용설비', dataIndex:'equip', render:v=><Text type="secondary" style={{fontSize:12}}>{v}</Text> },
  ]

  return (
    <Drawer title={
      <Space>
        <SettingOutlined style={{color:'#3B82F6'}} />
        <Text strong>{route.productCode}</Text>
        <Text type="secondary" style={{fontSize:13}}>{route.productName}</Text>
      </Space>
    } open={open} onClose={onClose} width={640}>
      <Row gutter={12} style={{marginBottom:20}}>
        {[
          {l:'공정 수',    v:`${route.processes.length}단계`, c:'#3B82F6'},
          {l:'총 소요시간', v:`${totalTime.toFixed(1)}h/EA`, c:'#7C3AED'},
          {l:'총 셋업시간', v:`${totalSetup.toFixed(1)}h`,   c:'#F59E0B'},
          {l:'최대 투입인원',v:`${maxWorkers}명`,            c:'#10B981'},
        ].map((s,i)=>(
          <Col key={i} span={6}>
            <Card bordered={false} size="small"
              style={{borderRadius:8,borderTop:`3px solid ${s.c}`,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}
              styles={{body:{padding:'10px 12px'}}}>
              <Text style={{fontSize:11,color:'#64748B',display:'block'}}>{s.l}</Text>
              <Text strong style={{fontSize:16,color:s.c}}>{s.v}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Text strong style={{display:'block',marginBottom:10,color:'#374151'}}>공정 플로우</Text>
      <div style={{background:'#F8FAFC',borderRadius:10,padding:'16px',marginBottom:20}}>
        <ProcessFlow processes={route.processes} />
      </div>

      <Text strong style={{display:'block',marginBottom:10,color:'#374151'}}>공정 상세</Text>
      <Table columns={procCols} dataSource={route.processes.map((p,i)=>({...p,key:i}))}
        pagination={false} size="small" />
    </Drawer>
  )
}

// ─── 공정경로 관리 메인 ──────────────────────────────────────────
function ProcessRouteMaster() {
  const [routes, setRoutes] = useState(INIT_ROUTES)
  const [parsing, setParsing] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [detailRoute, setDetailRoute] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [importLog, setImportLog] = useState([])

  const handleFile = useCallback(async file => {
    if (!/\.(xlsx?|xls)$/i.test(file.name)) { message.error('xlsx/xls 파일만 가능합니다'); return false }
    setParsing(true)
    try {
      const rows = await parseRouteExcel(file)
      if (rows.length === 0) { message.warning('공정 데이터를 찾을 수 없습니다. 컬럼명을 확인하세요.'); return false }
      setRoutes(prev => {
        const next = [...prev]
        let added = 0, updated = 0
        rows.forEach(r => {
          const idx = next.findIndex(x => x.productCode === r.productCode)
          if (idx >= 0) { next[idx] = r; updated++ } else { next.push(r); added++ }
        })
        message.success(`${added}건 추가, ${updated}건 갱신`)
        setImportLog(l => [{ filename:file.name, added, updated, at:new Date().toLocaleTimeString() }, ...l.slice(0,4)])
        return next
      })
    } catch(e) { message.error(`파싱 오류: ${e.message}`) }
    finally { setParsing(false) }
    return false
  }, [])

  const filtered = routes.filter(r => {
    const q = searchText.toLowerCase()
    return !q || [r.productCode,r.productName,r.spec].some(v=>v?.toLowerCase().includes(q))
  })

  const cols = [
    { title:'제품코드', dataIndex:'productCode', width:130, fixed:'left',
      render:v=><Text strong style={{color:'#3B82F6',fontSize:12,fontFamily:'monospace'}}>{v}</Text> },
    { title:'품명', dataIndex:'productName', render:v=><Text strong>{v}</Text> },
    { title:'규격', dataIndex:'spec', width:150, render:v=><Text type="secondary" style={{fontSize:12}}>{v}</Text> },
    { title:'공정 수', key:'cnt', width:65, align:'center',
      render:(_,r)=><Tag color="blue">{r.processes.length}단계</Tag> },
    { title:'공정 플로우', key:'flow', render:(_,r)=><ProcessFlow processes={r.processes} /> },
    { title:'소요시간/EA', key:'time', width:110, align:'center',
      render:(_,r)=>{
        const t = r.processes.reduce((s,p)=>s+p.timePerEa,0)
        return <Text strong style={{color:'#7C3AED'}}>{t.toFixed(1)}h</Text>
      }},
    { title:'액션', key:'act', width:100, fixed:'right',
      render:(_,r)=>(
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />}
            onClick={()=>{ setDetailRoute(r); setDrawerOpen(true) }}>상세</Button>
          <Popconfirm title="이 공정경로를 삭제할까요?" okText="삭제" cancelText="취소" okButtonProps={{danger:true}}
            onConfirm={()=>setRoutes(prev=>prev.filter(x=>x.key!==r.key))}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )},
  ]

  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>공정경로 관리</Title>
        <Text type="secondary">제품별 공정순서 · 소요시간 · 필요인원 · 설비 마스터 관리</Text>
      </div>

      {/* 엑셀 업로드 */}
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',marginBottom:20}}>
        <div style={{marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
          <FileExcelOutlined style={{fontSize:16,color:'#10B981'}} />
          <Text strong>공정정보 엑셀 업로드</Text>
          <Text type="secondary" style={{fontSize:12}}>— 제품별 공정경로 엑셀을 드래그하세요</Text>
          <Tooltip title={
            <div>
              <div style={{fontWeight:700,marginBottom:4}}>필요 컬럼명 (순서 무관)</div>
              <div>제품코드 / 주문PT#</div>
              <div>품명, 규격, 공정순서</div>
              <div>공정명, 소요시간 (h/EA)</div>
              <div>셋업시간 (h), 필요인원, 사용설비</div>
            </div>
          }>
            <Tag color="blue" style={{cursor:'help',fontSize:11}}>컬럼 형식 안내</Tag>
          </Tooltip>
        </div>

        <div
          onDragOver={e=>{ e.preventDefault(); e.currentTarget.style.borderColor='#3B82F6'; e.currentTarget.style.background='rgba(59,130,246,0.04)' }}
          onDragLeave={e=>{ e.currentTarget.style.borderColor=''; e.currentTarget.style.background='' }}
          onDrop={e=>{ e.preventDefault(); e.currentTarget.style.borderColor=''; e.currentTarget.style.background=''; const f=e.dataTransfer.files[0]; if(f) handleFile(f) }}
          onClick={()=>document.getElementById('routeExcelInput').click()}
          style={{border:'2px dashed #CBD5E1',borderRadius:10,padding:'24px',textAlign:'center',cursor:'pointer',transition:'all 0.2s',background:'#FAFBFC'}}
        >
          <input id="routeExcelInput" type="file" accept=".xlsx,.xls" style={{display:'none'}}
            onChange={e=>{ if(e.target.files[0]) handleFile(e.target.files[0]); e.target.value='' }} />
          {parsing
            ? <Text type="secondary">⏳ 파싱 중...</Text>
            : <><InboxOutlined style={{fontSize:28,color:'#94A3B8',display:'block',marginBottom:6}} />
              <Text type="secondary" style={{fontSize:13}}>공정경로 엑셀 파일을 드래그하거나 클릭하여 선택</Text></>}
        </div>

        {importLog.length > 0 && (
          <Alert type="success" showIcon icon={<CheckCircleOutlined />} style={{marginTop:12,borderRadius:8}}
            message={importLog.map((l,i)=>
              <Text key={i} style={{fontSize:12}}>{l.filename} — 추가 {l.added}건 · 갱신 {l.updated}건 <Text type="secondary">{l.at}</Text></Text>
            )} closable />
        )}
      </Card>

      {/* 목록 */}
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <Space style={{marginBottom:14}} size={8}>
          <Input placeholder="제품코드 / 품명 / 규격" prefix={<SearchOutlined />}
            style={{width:240}} value={searchText} onChange={e=>setSearchText(e.target.value)} allowClear />
          <Button icon={<DownloadOutlined />}>Excel 내보내기</Button>
          <Button type="primary" icon={<PlusOutlined />}
            style={{marginLeft:'auto',background:'#10B981',borderColor:'#10B981'}}>수동 등록</Button>
        </Space>

        <Table columns={cols} dataSource={filtered} pagination={{pageSize:15,showTotal:t=>`총 ${t}개 제품`}}
          size="middle" scroll={{x:1000}}
          locale={{emptyText:<Empty description="공정경로 데이터가 없습니다. 위에서 엑셀을 업로드하세요." />}} />
      </Card>

      <RouteDetailDrawer route={detailRoute} open={drawerOpen} onClose={()=>setDrawerOpen(false)} />
    </div>
  )
}

// ─── 작업자 마스터 ───────────────────────────────────────────────
const DAYS_KR = ['월','화','수','목','금','토','일']
const ALL_PROCESSES = ['레이저','벤딩','용접','탭핑','도장','포장','조립','프레스','검사']

const INIT_WORKERS = [
  { key:'w1', empId:'EMP-001', name:'김철수', primary:'용접',   secondary:['레이저'],      days:['월','화','수','목','금'], dayHours:8,  overtime:2, note:'' },
  { key:'w2', empId:'EMP-002', name:'이영희', primary:'레이저', secondary:['벤딩'],         days:['월','화','수','목','금'], dayHours:8,  overtime:0, note:'' },
  { key:'w3', empId:'EMP-003', name:'박민준', primary:'도장',   secondary:[],               days:['월','화','수','목','금'], dayHours:8,  overtime:0, note:'' },
  { key:'w4', empId:'EMP-004', name:'정수진', primary:'조립',   secondary:['벤딩','탭핑'],  days:['월','화','수','목','금'], dayHours:8,  overtime:0, note:'' },
  { key:'w5', empId:'EMP-005', name:'최민호', primary:'레이저', secondary:['용접'],          days:['월','화','수','목'],      dayHours:8,  overtime:4, note:'목요일까지 근무' },
  { key:'w6', empId:'EMP-006', name:'강지원', primary:'벤딩',   secondary:['레이저','탭핑'],days:['월','화','수','목','금'], dayHours:8,  overtime:0, note:'' },
]

function WorkerMaster() {
  const [workers, setWorkers] = useState(INIT_WORKERS)
  const [editWorker, setEditWorker] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const openEdit = (w = null) => {
    setEditWorker(w)
    form.setFieldsValue(w ? { ...w } : { days:['월','화','수','목','금'], dayHours:8, overtime:0 })
    setModalOpen(true)
  }

  const handleSave = () => {
    form.validateFields().then(vals => {
      if (editWorker) {
        setWorkers(prev => prev.map(w => w.key === editWorker.key ? { ...w, ...vals } : w))
      } else {
        setWorkers(prev => [...prev, { ...vals, key:`w${Date.now()}`, empId:`EMP-${String(prev.length+1).padStart(3,'0')}` }])
      }
      setModalOpen(false)
    })
  }

  const cols = [
    { title:'사원번호', dataIndex:'empId', width:100, render:v=><Text style={{color:'#3B82F6',fontSize:12,fontFamily:'monospace'}}>{v}</Text> },
    { title:'이름', dataIndex:'name', width:90, render:v=><Text strong>{v}</Text> },
    { title:'주력공정', dataIndex:'primary', width:100,
      render:v=><Tag style={{background:procColor(v)+'22',color:procColor(v),border:`1px solid ${procColor(v)}55`,fontWeight:600}}>{v}</Tag> },
    { title:'겸직공정', dataIndex:'secondary', render:v=>(
      <Space size={4} wrap>
        {(v||[]).map(p=><Tag key={p} style={{fontSize:11,margin:0}}>{p}</Tag>)}
        {(!v||v.length===0) && <Text type="secondary">—</Text>}
      </Space>
    )},
    { title:'근무요일', dataIndex:'days', width:170,
      render:v=>(
        <Space size={3}>
          {DAYS_KR.map(d=>(
            <div key={d} style={{
              width:22,height:22,borderRadius:11,display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:11,fontWeight:700,
              background:v?.includes(d)?'#3B82F6':'#F1F5F9',
              color:v?.includes(d)?'#fff':'#CBD5E1',
            }}>{d}</div>
          ))}
        </Space>
      )},
    { title:'기본(h/일)', dataIndex:'dayHours', width:90, align:'center', render:v=><Text strong>{v}h</Text> },
    { title:'잔업(h/일)', dataIndex:'overtime', width:90, align:'center',
      render:v=><Text style={{color:v>0?'#EF4444':'#94A3B8',fontWeight:v>0?700:400}}>{v>0?`+${v}h`:'—'}</Text> },
    { title:'비고', dataIndex:'note', render:v=><Text type="secondary" style={{fontSize:12}}>{v||'—'}</Text> },
    { title:'', key:'act', width:80, fixed:'right',
      render:(_,r)=>(
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={()=>openEdit(r)} />
          <Popconfirm title="삭제할까요?" okText="삭제" cancelText="취소" okButtonProps={{danger:true}}
            onConfirm={()=>setWorkers(prev=>prev.filter(w=>w.key!==r.key))}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )},
  ]

  const summary = {
    total: workers.length,
    withOt: workers.filter(w=>(w.overtime||0)>0).length,
    processes: [...new Set(workers.map(w=>w.primary))].length,
  }

  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>작업자 마스터</Title>
        <Text type="secondary">작업자별 주력공정 · 겸직공정 · 근무요일 · 근무시간 관리</Text>
      </div>

      <Row gutter={12} style={{marginBottom:16}}>
        {[{l:'총 작업자',v:summary.total+'명',c:'#3B82F6'},{l:'잔업 가능',v:summary.withOt+'명',c:'#F59E0B'},{l:'담당 공정종류',v:summary.processes+'개',c:'#10B981'}].map((s,i)=>(
          <Col key={i} span={8}>
            <Card bordered={false} style={{borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',borderTop:`3px solid ${s.c}`}} styles={{body:{padding:'12px 16px'}}}>
              <Statistic title={<Text style={{fontSize:12,color:'#64748B'}}>{s.l}</Text>} value={s.v} valueStyle={{fontSize:20,fontWeight:800,color:s.c}} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <div style={{marginBottom:12,textAlign:'right'}}>
          <Button type="primary" icon={<PlusOutlined />} onClick={()=>openEdit()}
            style={{background:'#10B981',borderColor:'#10B981'}}>작업자 추가</Button>
        </div>
        <Table columns={cols} dataSource={workers} pagination={false} size="middle" scroll={{x:1000}} />
      </Card>

      <Modal title={editWorker ? '작업자 수정' : '작업자 추가'} open={modalOpen}
        onOk={handleSave} onCancel={()=>setModalOpen(false)} okText="저장" cancelText="취소" width={580}>
        <Form form={form} layout="vertical" style={{marginTop:16}}>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="이름" name="name" rules={[{required:true}]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item label="주력공정" name="primary" rules={[{required:true}]}>
              <Select options={ALL_PROCESSES.map(p=>({label:p,value:p}))} />
            </Form.Item></Col>
            <Col span={24}><Form.Item label="겸직공정 (복수 선택)">
              <Form.Item name="secondary" noStyle>
                <Select mode="multiple" options={ALL_PROCESSES.map(p=>({label:p,value:p}))} placeholder="없으면 비워두세요" />
              </Form.Item>
            </Form.Item></Col>
            <Col span={24}><Form.Item label="근무요일" name="days" rules={[{required:true}]}>
              <Select mode="multiple" options={DAYS_KR.map(d=>({label:d,value:d}))} />
            </Form.Item></Col>
            <Col span={12}><Form.Item label="기본 근무시간 (h/일)" name="dayHours" rules={[{required:true}]}>
              <InputNumber min={1} max={12} style={{width:'100%'}} addonAfter="h" />
            </Form.Item></Col>
            <Col span={12}><Form.Item label="최대 잔업시간 (h/일)" name="overtime">
              <InputNumber min={0} max={6} style={{width:'100%'}} addonAfter="h" />
            </Form.Item></Col>
            <Col span={24}><Form.Item label="비고" name="note"><Input placeholder="특이사항" /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

// ─── 설비 마스터 ─────────────────────────────────────────────────
const INIT_EQUIP = [
  { key:'eq1', equipId:'EQ-001', name:'파이버 레이저 #1', process:'레이저', dayHours:16, shift:'주/야', status:'가동', setupTime:0.5, note:'' },
  { key:'eq2', equipId:'EQ-002', name:'파이버 레이저 #2', process:'레이저', dayHours:8,  shift:'주간',  status:'가동', setupTime:0.5, note:'' },
  { key:'eq3', equipId:'EQ-003', name:'CNC 벤딩 #1',      process:'벤딩',   dayHours:8,  shift:'주간',  status:'가동', setupTime:0.3, note:'' },
  { key:'eq4', equipId:'EQ-004', name:'CNC 벤딩 #2',      process:'벤딩',   dayHours:8,  shift:'주간',  status:'가동', setupTime:0.3, note:'' },
  { key:'eq5', equipId:'EQ-005', name:'CO2 용접 라인 #1',  process:'용접',   dayHours:16, shift:'주/야', status:'가동', setupTime:0.5, note:'' },
  { key:'eq6', equipId:'EQ-006', name:'CO2 용접 라인 #2',  process:'용접',   dayHours:8,  shift:'주간',  status:'가동', setupTime:0.5, note:'' },
  { key:'eq7', equipId:'EQ-007', name:'도장 부스 #1',      process:'도장',   dayHours:8,  shift:'주간',  status:'가동', setupTime:1.0, note:'' },
  { key:'eq8', equipId:'EQ-008', name:'자동화 조립라인',   process:'조립',   dayHours:0,  shift:'—',     status:'정지', setupTime:0.5, note:'정기 PM 중 (5/29~30)' },
]

function EquipMaster() {
  const [equips, setEquips] = useState(INIT_EQUIP)
  const [editEquip, setEditEquip] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const openEdit = (eq = null) => {
    setEditEquip(eq)
    form.setFieldsValue(eq ? { ...eq } : { shift:'주간', status:'가동', dayHours:8, setupTime:0.5 })
    setModalOpen(true)
  }

  const handleSave = () => {
    form.validateFields().then(vals => {
      if (editEquip) {
        setEquips(prev => prev.map(e => e.key === editEquip.key ? { ...e, ...vals } : e))
      } else {
        setEquips(prev => [...prev, { ...vals, key:`eq${Date.now()}`, equipId:`EQ-${String(prev.length+1).padStart(3,'0')}` }])
      }
      setModalOpen(false)
    })
  }

  const cols = [
    { title:'설비코드', dataIndex:'equipId', width:100, render:v=><Text style={{color:'#3B82F6',fontSize:12,fontFamily:'monospace'}}>{v}</Text> },
    { title:'설비명', dataIndex:'name', render:v=><Text strong>{v}</Text> },
    { title:'담당공정', dataIndex:'process', width:110,
      render:v=><Tag style={{background:procColor(v)+'22',color:procColor(v),border:`1px solid ${procColor(v)}55`,fontWeight:600}}>{v}</Tag> },
    { title:'운영시프트', dataIndex:'shift', width:90, align:'center', render:v=><Tag>{v}</Tag> },
    { title:'일일가동(h)', dataIndex:'dayHours', width:100, align:'center',
      render:(v,r)=>r.status==='정지'?<Text type="secondary">—</Text>:<Text strong style={{color:v>=16?'#7C3AED':v>=8?'#3B82F6':'#F59E0B'}}>{v}h</Text> },
    { title:'셋업시간', dataIndex:'setupTime', width:90, align:'center', render:v=><Text type="secondary">{v}h</Text> },
    { title:'가동상태', dataIndex:'status', width:90,
      render:v=><Badge status={v==='가동'?'success':'error'} text={v} /> },
    { title:'비고', dataIndex:'note', render:v=><Text type="secondary" style={{fontSize:12}}>{v||'—'}</Text> },
    { title:'', key:'act', width:80, fixed:'right',
      render:(_,r)=>(
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={()=>openEdit(r)} />
          <Popconfirm title="삭제할까요?" okText="삭제" cancelText="취소" okButtonProps={{danger:true}}
            onConfirm={()=>setEquips(prev=>prev.filter(e=>e.key!==r.key))}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )},
  ]

  const summary = {
    total: equips.length,
    active: equips.filter(e=>e.status==='가동').length,
    stopped: equips.filter(e=>e.status==='정지').length,
    totalHours: equips.filter(e=>e.status==='가동').reduce((s,e)=>s+e.dayHours,0),
  }

  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>설비 마스터</Title>
        <Text type="secondary">설비별 담당공정 · 가동시간 · 시프트 · 셋업시간 관리</Text>
      </div>

      <Row gutter={12} style={{marginBottom:16}}>
        {[{l:'총 설비',v:summary.total+'대',c:'#3B82F6'},{l:'가동중',v:summary.active+'대',c:'#10B981'},{l:'정지',v:summary.stopped+'대',c:'#F59E0B'},{l:'총 가동시간',v:summary.totalHours+'h/일',c:'#7C3AED'}].map((s,i)=>(
          <Col key={i} span={6}>
            <Card bordered={false} style={{borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',borderTop:`3px solid ${s.c}`}} styles={{body:{padding:'12px 16px'}}}>
              <Statistic title={<Text style={{fontSize:12,color:'#64748B'}}>{s.l}</Text>} value={s.v} valueStyle={{fontSize:20,fontWeight:800,color:s.c}} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <div style={{marginBottom:12,textAlign:'right'}}>
          <Button type="primary" icon={<PlusOutlined />} onClick={()=>openEdit()}
            style={{background:'#10B981',borderColor:'#10B981'}}>설비 추가</Button>
        </div>
        <Table columns={cols} dataSource={equips} pagination={false} size="middle" scroll={{x:900}} />
      </Card>

      <Modal title={editEquip ? '설비 수정' : '설비 추가'} open={modalOpen}
        onOk={handleSave} onCancel={()=>setModalOpen(false)} okText="저장" cancelText="취소" width={520}>
        <Form form={form} layout="vertical" style={{marginTop:16}}>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="설비명" name="name" rules={[{required:true}]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item label="담당공정" name="process" rules={[{required:true}]}>
              <Select options={ALL_PROCESSES.map(p=>({label:p,value:p}))} />
            </Form.Item></Col>
            <Col span={12}><Form.Item label="운영시프트" name="shift">
              <Select options={['주간','야간','주/야'].map(v=>({label:v,value:v}))} />
            </Form.Item></Col>
            <Col span={12}><Form.Item label="가동상태" name="status">
              <Select options={['가동','정지'].map(v=>({label:v,value:v}))} />
            </Form.Item></Col>
            <Col span={12}><Form.Item label="일일 가동시간 (h)" name="dayHours" rules={[{required:true}]}>
              <InputNumber min={0} max={24} style={{width:'100%'}} addonAfter="h" />
            </Form.Item></Col>
            <Col span={12}><Form.Item label="셋업시간 (h)" name="setupTime">
              <InputNumber min={0} max={4} step={0.1} style={{width:'100%'}} addonAfter="h" />
            </Form.Item></Col>
            <Col span={24}><Form.Item label="비고" name="note"><Input placeholder="특이사항" /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

function PlaceholderPage({ title }) {
  return (
    <div>
      <div style={{marginBottom:20}}><Title level={4} style={{margin:0}}>{title}</Title></div>
      <Card bordered={false} style={{borderRadius:12,textAlign:'center',padding:'48px 0'}}><Text type="secondary">🚧 개발 예정</Text></Card>
    </div>
  )
}

export function ProcessPlan({ sub }) {
  if (!sub || sub==='workOrder')   return <WorkOrder />
  if (sub==='gantt')               return <GanttChart />
  if (sub==='processRoute')        return <ProcessRouteMaster />
  if (sub==='workerMaster')        return <WorkerMaster />
  if (sub==='equipMaster')         return <EquipMaster />
  return <PlaceholderPage title={sub} />
}
