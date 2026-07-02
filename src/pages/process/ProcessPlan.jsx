import { useState, useCallback, useEffect, useMemo } from 'react'
import { Table, Card, Row, Col, Button, Space, Select, Tag, Typography, Badge, Progress, Tooltip,
  Form, Input, InputNumber, Modal, Drawer, Steps, Divider, Alert, message, Empty, Popconfirm, Statistic, Spin,
  AutoComplete, Switch } from 'antd'
import {
  fetchWorkers, saveWorker, deleteWorkerById, seedWorkers,
  fetchEquipment, saveEquipment, deleteEquipmentById, seedEquipment,
  fetchProcessRoutes, upsertProcessRoute, deleteProcessRouteById, seedProcessRoutes,
  fetchProcesses, saveProcess, deleteProcessById, seedProcesses,
} from '../../api/db.js'
import { PlusOutlined, PrinterOutlined, DownloadOutlined, SettingOutlined,
  InboxOutlined, FileExcelOutlined, CheckCircleOutlined, EditOutlined, DeleteOutlined,
  ArrowRightOutlined, ClockCircleOutlined, TeamOutlined, ToolOutlined, SearchOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import {
  downloadProcessTemplate, parseProcessExcel,
  downloadWorkerTemplate, parseWorkerExcel,
  downloadEquipTemplate, parseEquipExcel,
  downloadRouteTemplate,
} from '../../utils/excelTemplates.js'

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
        <Table columns={woColumns} dataSource={WORK_ORDERS} pagination={{pageSize:10}} size="small" bordered scroll={{x:1100}} />
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

const procColor = () => '#3B82F6'

// ─── 공정라우팅 마스터 데이터 (초기 샘플) ─────────────────────────
const INIT_ROUTES = [
  { key:'r1', productCode:'4UF0062*A', productName:'SILL SUPPORT', spec:'T4.5*60*109 W',
    processes:[
      { seq:1, name:'레이저', dept:'제관반', timePerEa:0.5, setupTime:0.5, workers:1, equip:'파이버 레이저 #1' },
      { seq:2, name:'벤딩',   dept:'제관반', timePerEa:0.3, setupTime:0.3, workers:1, equip:'CNC 벤딩 #1' },
      { seq:3, name:'탭핑',   dept:'제관반', timePerEa:0.2, setupTime:0.2, workers:1, equip:'탭핑 머신' },
      { seq:4, name:'포장',   dept:'제관반', timePerEa:0.1, setupTime:0.0, workers:1, equip:'—' },
    ]},
  { key:'r2', productCode:'3HH-001B', productName:'HH-프레임 ASSY', spec:'T3.2 SS400',
    processes:[
      { seq:1, name:'레이저', dept:'제관반', timePerEa:0.8, setupTime:0.5, workers:1, equip:'파이버 레이저 #2' },
      { seq:2, name:'용접',   dept:'제관반', timePerEa:1.5, setupTime:0.5, workers:2, equip:'CO2 용접 #1' },
      { seq:3, name:'도장',   dept:'제관반', timePerEa:0.5, setupTime:1.0, workers:1, equip:'도장 부스 #1' },
      { seq:4, name:'조립',   dept:'조립반', timePerEa:0.8, setupTime:0.3, workers:2, equip:'조립 라인' },
    ]},
  { key:'r3', productCode:'BKT-SET', productName:'구조체 브라켓 SET', spec:'T4.5 SS400',
    processes:[
      { seq:1, name:'레이저', dept:'제관반', timePerEa:0.6, setupTime:0.5, workers:1, equip:'파이버 레이저 #1' },
      { seq:2, name:'프레스', dept:'제관반', timePerEa:0.4, setupTime:0.5, workers:1, equip:'CNC 벤딩 #2' },
      { seq:3, name:'용접',   dept:'제관반', timePerEa:2.0, setupTime:0.5, workers:2, equip:'CO2 용접 #2' },
      { seq:4, name:'조립',   dept:'조립반', timePerEa:1.0, setupTime:0.3, workers:2, equip:'조립 라인' },
    ]},
]

// 엑셀 컬럼 매핑 (사용자 공정 엑셀 포맷)
const ROUTE_COL_MAP = {
  '제품코드':'productCode', '주문PT#':'productCode', 'Product Code':'productCode',
  '품명':'productName',     'Product Name':'productName',
  '규격':'spec',            'Spec':'spec',
  '공정순서':'seq',          '순서':'seq', 'Seq':'seq',
  '공정명':'name',           '공정':'name', 'Process':'name',
  '작업구분':'dept',         '소속반':'dept', '반':'dept', 'Dept':'dept',
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
              dept: String(obj.dept || '').trim(),
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
              <div><strong>{p.name}</strong>{p.dept && <span style={{marginLeft:6,opacity:0.7}}>({p.dept})</span>}</div>
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

// ─── 공정라우팅 등록/수정 Drawer ───────────────────────────────────
function RouteFormDrawer({ route, open, onClose, onSaved }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const isNew = !route

  useEffect(() => {
    if (!open) return
    if (route) {
      form.setFieldsValue({
        productCode: route.productCode,
        productName: route.productName,
        spec:        route.spec,
        processes:   route.processes.map(p => ({ ...p })),
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ processes: [{ seq:1, name:'', dept:'', timePerEa:0, setupTime:0, workers:1, equip:'—' }] })
    }
  }, [open, route])

  const handleSave = async () => {
    try {
      const vals = await form.validateFields()
      setSaving(true)
      const routeData = {
        ...vals,
        key: route?.key,
        processes: (vals.processes || []).map((p, i) => ({ ...p, seq: i + 1 })),
      }
      await upsertProcessRoute(routeData)
      message.success(isNew ? '등록 완료' : '수정 완료')
      onSaved()
      onClose()
    } catch(e) {
      if (e?.errorFields) return
      message.error('저장 실패: ' + e.message)
    } finally { setSaving(false) }
  }

  return (
    <Drawer
      title={
        <Space>
          <SettingOutlined style={{color:'#3B82F6'}} />
          <Text strong>{isNew ? '공정라우팅 신규 등록' : `${route?.productCode} 수정`}</Text>
        </Space>
      }
      open={open} onClose={onClose} width={700}
      footer={
        <Space style={{justifyContent:'flex-end',width:'100%'}}>
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" loading={saving} onClick={handleSave}
            style={{background:'#10B981',borderColor:'#10B981'}}>저장</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" size="small">
        <Row gutter={12}>
          <Col span={7}><Form.Item label="주문PT#" name="productCode" rules={[{required:true,message:'필수'}]}><Input /></Form.Item></Col>
          <Col span={11}><Form.Item label="품명" name="productName" rules={[{required:true,message:'필수'}]}><Input /></Form.Item></Col>
          <Col span={6}><Form.Item label="규격" name="spec"><Input /></Form.Item></Col>
        </Row>

        <Divider style={{margin:'4px 0 12px'}}>공정 단계</Divider>

        <div style={{display:'flex',gap:4,marginBottom:6,padding:'0 4px'}}>
          {['#','공정명','작업구분','소요(h/EA)','셋업(h)','인원','설비',''].map((h,i)=>(
            <div key={i} style={{flex:[0.4,1.8,1.2,1,1,0.7,1.6,0.5][i],fontSize:11,fontWeight:600,color:'#64748B'}}>{h}</div>
          ))}
        </div>

        <Form.List name="processes">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, idx) => (
                <div key={field.key} style={{display:'flex',gap:4,marginBottom:6,alignItems:'center'}}>
                  <div style={{flex:0.4,textAlign:'center',color:'#94A3B8',fontSize:12}}>{idx+1}</div>
                  <div style={{flex:1.8}}><Form.Item name={[field.name,'name']} noStyle rules={[{required:true,message:''}]}><Input placeholder="공정명" /></Form.Item></div>
                  <div style={{flex:1.2}}><Form.Item name={[field.name,'dept']} noStyle><Select placeholder="작업구분" allowClear options={DEPT_OPTIONS.map(d=>({label:d,value:d}))} /></Form.Item></div>
                  <div style={{flex:1}}><Form.Item name={[field.name,'timePerEa']} noStyle><InputNumber min={0} step={0.1} style={{width:'100%'}} placeholder="0" /></Form.Item></div>
                  <div style={{flex:1}}><Form.Item name={[field.name,'setupTime']} noStyle><InputNumber min={0} step={0.1} style={{width:'100%'}} placeholder="0" /></Form.Item></div>
                  <div style={{flex:0.7}}><Form.Item name={[field.name,'workers']} noStyle><InputNumber min={1} style={{width:'100%'}} placeholder="1" /></Form.Item></div>
                  <div style={{flex:1.6}}><Form.Item name={[field.name,'equip']} noStyle><Input placeholder="설비명" /></Form.Item></div>
                  <div style={{flex:0.5}}>
                    <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                  </div>
                </div>
              ))}
              <Button type="dashed" block icon={<PlusOutlined />} style={{marginTop:4}}
                onClick={() => add({ seq:fields.length+1, name:'', dept:'', timePerEa:0, setupTime:0, workers:1, equip:'—' })}>
                공정 추가
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Drawer>
  )
}

// ─── 공정라우팅 관리 메인 ──────────────────────────────────────────
function ProcessRouteMaster() {
  const [routes, setRoutes] = useState([])
  const [dbLoading, setDbLoading] = useState(true)
  const [parsing, setParsing] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [formRoute, setFormRoute] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [importLog, setImportLog] = useState([])

  const loadRoutes = async () => {
    setDbLoading(true)
    try {
      const data = await fetchProcessRoutes()
      if (data.length) { setRoutes(data) }
      else { await seedProcessRoutes(INIT_ROUTES); setRoutes(await fetchProcessRoutes()) }
    } catch { message.error('공정라우팅 로드 실패'); setRoutes(INIT_ROUTES) }
    finally { setDbLoading(false) }
  }

  useEffect(() => { loadRoutes() }, [])

  const handleFile = useCallback(async file => {
    if (!/\.(xlsx?|xls)$/i.test(file.name)) { message.error('xlsx/xls 파일만 가능합니다'); return false }
    setParsing(true)
    try {
      const rows = await parseRouteExcel(file)
      if (rows.length === 0) { message.warning('공정 데이터를 찾을 수 없습니다. 컬럼명을 확인하세요.'); return false }
      let added = 0, updated = 0
      for (const r of rows) {
        const exists = routes.find(x => x.productCode === r.productCode)
        await upsertProcessRoute(r)
        exists ? updated++ : added++
      }
      message.success(`${added}건 추가, ${updated}건 갱신`)
      setImportLog(l => [{ filename:file.name, added, updated, at:new Date().toLocaleTimeString() }, ...l.slice(0,4)])
      await loadRoutes()
    } catch(e) { message.error(`파싱 오류: ${e.message}`) }
    finally { setParsing(false) }
    return false
  }, [routes])

  const filtered = routes.filter(r => {
    const q = searchText.toLowerCase()
    return !q || [r.productCode,r.productName,r.spec].some(v=>v?.toLowerCase().includes(q))
  })

  const cols = [
    { title:'주문PT#', dataIndex:'productCode', width:130, fixed:'left',
      render:v=><Text strong style={{color:'#3B82F6',fontSize:12,fontFamily:'monospace'}}>{v}</Text> },
    { title:'품명', dataIndex:'productName', width:200, ellipsis:true, render:v=><Text strong>{v}</Text> },
    { title:'규격', dataIndex:'spec', width:130, ellipsis:true, render:v=><Text type="secondary" style={{fontSize:12}}>{v}</Text> },
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
            onClick={()=>{ setFormRoute(r); setFormOpen(true) }}>상세</Button>
          <Popconfirm title="이 공정라우팅를 삭제할까요?" okText="삭제" cancelText="취소" okButtonProps={{danger:true}}
            onConfirm={async()=>{ try { await deleteProcessRouteById(r.key); await loadRoutes() } catch { message.error('삭제 실패') } }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )},
  ]

  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>공정라우팅</Title>
        <Text type="secondary">제품별 공정순서 · 소요시간 · 필요인원 · 설비 마스터 관리</Text>
      </div>

      {/* 엑셀 업로드 */}
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',marginBottom:20}}>
        <div style={{marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
          <FileExcelOutlined style={{fontSize:16,color:'#10B981'}} />
          <Text strong>공정정보 엑셀 업로드</Text>
          <Text type="secondary" style={{fontSize:12}}>— 제품별 공정라우팅 엑셀을 드래그하세요</Text>
          <Button size="small" icon={<DownloadOutlined />} onClick={downloadRouteTemplate}>양식 다운로드</Button>
          <Tooltip title={
            <div>
              <div style={{fontWeight:700,marginBottom:4}}>필요 컬럼명 (순서 무관)</div>
              <div>제품코드 / 주문PT#</div>
              <div>품명, 규격, 공정순서</div>
              <div>공정명, 작업구분 (제관반/조립반)</div>
              <div>소요시간 (h/EA), 셋업시간 (h)</div>
              <div>필요인원, 사용설비</div>
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
              <Text type="secondary" style={{fontSize:13}}>공정라우팅 엑셀 파일을 드래그하거나 클릭하여 선택</Text></>}
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
            style={{marginLeft:'auto',background:'#10B981',borderColor:'#10B981'}}
            onClick={()=>{ setFormRoute(null); setFormOpen(true) }}>수동 등록</Button>
        </Space>

        <Spin spinning={dbLoading}>
          <Table columns={cols} dataSource={filtered} pagination={{pageSize:15,showTotal:t=>`총 ${t}개 제품`}}
            bordered size="small" scroll={{x:1000}}
            locale={{emptyText:<Empty description="공정라우팅 데이터가 없습니다. 위에서 엑셀을 업로드하세요." />}} />
        </Spin>
      </Card>

      <RouteFormDrawer route={formRoute} open={formOpen} onClose={()=>setFormOpen(false)} onSaved={loadRoutes} />
    </div>
  )
}

// ─── 작업자 마스터 ───────────────────────────────────────────────
const DAYS_KR = ['월','화','수','목','금','토','일']
const ALL_PROCESSES = ['레이저','NCT','샤링','밴드쏘','절곡','태핑','용접','도장','프레스','포장','랜딩도어조립','로프행거제작','랜딩도어포장','브라켓볼트포장','카도어포장','페시아포장']

// ─── 공정마스터 초기 데이터 (금산산기 기준) ──────────────────────
const INIT_PROCESSES = [
  // 레이저반
  { code:'L01', name:'레이저',         dept:'레이저반', category:'절단', stdTime:30,  sortOrder:1,  isActive:true,  note:'' },
  { code:'L02', name:'NCT',            dept:'레이저반', category:'절단', stdTime:0,   sortOrder:2,  isActive:true,  note:'' },
  { code:'L03', name:'샤링',           dept:'레이저반', category:'절단', stdTime:0,   sortOrder:3,  isActive:true,  note:'' },
  { code:'L04', name:'밴드쏘',         dept:'레이저반', category:'절단', stdTime:0,   sortOrder:4,  isActive:true,  note:'' },
  // 제관반
  { code:'M01', name:'절곡',           dept:'제관반',   category:'성형', stdTime:20,  sortOrder:10, isActive:true,  note:'' },
  { code:'M02', name:'태핑',           dept:'제관반',   category:'기타', stdTime:10,  sortOrder:11, isActive:true,  note:'' },
  { code:'M03', name:'용접',           dept:'제관반',   category:'용접', stdTime:60,  sortOrder:12, isActive:true,  note:'' },
  { code:'M04', name:'도장',           dept:'제관반',   category:'도장', stdTime:30,  sortOrder:13, isActive:true,  note:'' },
  { code:'M05', name:'프레스',         dept:'제관반',   category:'성형', stdTime:15,  sortOrder:14, isActive:true,  note:'' },
  { code:'M06', name:'포장',           dept:'제관반',   category:'기타', stdTime:10,  sortOrder:15, isActive:true,  note:'' },
  // 조립반
  { code:'A01', name:'랜딩도어조립',   dept:'조립반',   category:'조립', stdTime:60,  sortOrder:20, isActive:true,  note:'' },
  { code:'A02', name:'로프행거제작',   dept:'조립반',   category:'조립', stdTime:40,  sortOrder:21, isActive:true,  note:'' },
  { code:'A03', name:'랜딩도어포장',   dept:'조립반',   category:'기타', stdTime:20,  sortOrder:22, isActive:true,  note:'' },
  { code:'A04', name:'브라켓볼트포장', dept:'조립반',   category:'기타', stdTime:15,  sortOrder:23, isActive:true,  note:'' },
  { code:'A05', name:'카도어포장',     dept:'조립반',   category:'기타', stdTime:20,  sortOrder:24, isActive:true,  note:'' },
  { code:'A06', name:'페시아포장',     dept:'조립반',   category:'기타', stdTime:0,   sortOrder:25, isActive:true,  note:'' },
]
const CATEGORIES = ['절단', '성형', '용접', '도장', '조립', '기타']
const DEPT_OPTIONS = ['레이저반', '제관반', '조립반']
const DEPT_COLOR = { '레이저반': 'blue', '제관반': 'orange', '조립반': 'green' }

const INIT_WORKERS = [
  { key:'w1', empId:'EMP-001', name:'김철수', dept:'제관반', primary:'용접',   secondary:['레이저'],      days:['월','화','수','목','금'], dayHours:8,  overtime:2, note:'' },
  { key:'w2', empId:'EMP-002', name:'이영희', dept:'제관반', primary:'레이저', secondary:['벤딩'],         days:['월','화','수','목','금'], dayHours:8,  overtime:0, note:'' },
  { key:'w3', empId:'EMP-003', name:'박민준', dept:'제관반', primary:'도장',   secondary:[],               days:['월','화','수','목','금'], dayHours:8,  overtime:0, note:'' },
  { key:'w4', empId:'EMP-004', name:'정수진', dept:'조립반', primary:'조립',   secondary:['벤딩','탭핑'],  days:['월','화','수','목','금'], dayHours:8,  overtime:0, note:'' },
  { key:'w5', empId:'EMP-005', name:'최민호', dept:'제관반', primary:'레이저', secondary:['용접'],          days:['월','화','수','목'],      dayHours:8,  overtime:4, note:'목요일까지 근무' },
  { key:'w6', empId:'EMP-006', name:'강지원', dept:'제관반', primary:'벤딩',   secondary:['레이저','탭핑'],days:['월','화','수','목','금'], dayHours:8,  overtime:0, note:'' },
]

function WorkerMaster() {
  const [workers, setWorkers] = useState([])
  const [dbLoading, setDbLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editWorker, setEditWorker] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [procOpts, setProcOpts] = useState(ALL_PROCESSES.map(p=>({label:p,value:p})))
  const [parsing, setParsing] = useState(false)

  useEffect(() => {
    fetchProcesses()
      .then(data => {
        const active = data.filter(p => p.isActive)
        if (active.length) setProcOpts(active.map(p => ({label:p.name,value:p.name})))
      })
      .catch(() => {})
  }, [])

  const loadWorkers = async () => {
    setDbLoading(true)
    try {
      const data = await fetchWorkers()
      if (data.length) { setWorkers(data) }
      else { await seedWorkers(INIT_WORKERS); setWorkers(await fetchWorkers()) }
    } catch { message.error('작업자 데이터 로드 실패'); setWorkers(INIT_WORKERS) }
    finally { setDbLoading(false) }
  }

  useEffect(() => { loadWorkers() }, [])

  const handleWorkerFile = useCallback(async file => {
    if (!/\.(xlsx?|xls)$/i.test(file.name)) { message.error('xlsx/xls 파일만 가능합니다'); return false }
    setParsing(true)
    try {
      const rows = await parseWorkerExcel(file)
      if (!rows.length) { message.warning('작업자 데이터를 찾을 수 없습니다'); return false }
      let count = 0
      for (const r of rows) { await saveWorker(r, true); count++ }
      message.success(`${count}명 업로드 완료`)
      await loadWorkers()
    } catch (e) { message.error(`파싱 오류: ${e.message}`) }
    finally { setParsing(false) }
    return false
  }, [])

  const openEdit = (w = null) => {
    setEditWorker(w)
    setModalOpen(true)
    setTimeout(() => {
      form.resetFields()
      form.setFieldsValue(w ? { ...w } : { days:['월','화','수','목','금'], dayHours:8, overtime:0 })
    }, 0)
  }

  const handleSave = async () => {
    let vals
    try { vals = await form.validateFields() } catch { return }
    setSaving(true)
    try {
      const merged = editWorker ? { ...editWorker, ...vals } : vals
      await saveWorker(merged, !editWorker)
      await loadWorkers()
      setModalOpen(false)
      message.success('저장되었습니다.')
    } catch(e) { message.error('저장 실패: ' + e.message) }
    finally { setSaving(false) }
  }

  const cols = [
    { title:'이름', dataIndex:'name', width:90, render:v=><Text strong>{v}</Text> },
    { title:'소속반', dataIndex:'dept', width:80,
      render:v=>v ? <Tag color={DEPT_COLOR[v]||'default'}>{v}</Tag> : <Text type="secondary">—</Text>,
      filters: DEPT_OPTIONS.map(d=>({text:d,value:d})), onFilter:(v,r)=>r.dept===v },
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
            onConfirm={async()=>{ try { await deleteWorkerById(r.key); await loadWorkers() } catch { message.error('삭제 실패') } }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )},
  ]

  const summary = {
    total: workers.length,
    jegwan: workers.filter(w=>w.dept==='제관반').length,
    jorip: workers.filter(w=>w.dept==='조립반').length,
    withOt: workers.filter(w=>(w.overtime||0)>0).length,
  }

  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>작업자 마스터</Title>
        <Text type="secondary">작업자별 주력공정 · 겸직공정 · 근무요일 · 근무시간 관리</Text>
      </div>

      <Row gutter={12} style={{marginBottom:16}}>
        {[{l:'총 작업자',v:summary.total+'명',c:'#3B82F6'},{l:'제관반',v:summary.jegwan+'명',c:'#F97316'},{l:'조립반',v:summary.jorip+'명',c:'#10B981'},{l:'잔업 가능',v:summary.withOt+'명',c:'#F59E0B'}].map((s,i)=>(
          <Col key={i} span={6}>
            <Card bordered={false} style={{borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',borderTop:`3px solid ${s.c}`}} styles={{body:{padding:'12px 16px'}}}>
              <Statistic title={<Text style={{fontSize:12,color:'#64748B'}}>{s.l}</Text>} value={s.v} valueStyle={{fontSize:20,fontWeight:800,color:s.c}} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',marginBottom:20}}>
        <div style={{marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
          <FileExcelOutlined style={{fontSize:16,color:'#10B981'}} />
          <Text strong>엑셀 일괄 등록</Text>
          <Button size="small" icon={<DownloadOutlined />} onClick={downloadWorkerTemplate}>양식 다운로드</Button>
        </div>
        <div
          onDragOver={e=>{ e.preventDefault(); e.currentTarget.style.borderColor='#3B82F6'; e.currentTarget.style.background='rgba(59,130,246,0.04)' }}
          onDragLeave={e=>{ e.currentTarget.style.borderColor=''; e.currentTarget.style.background='' }}
          onDrop={e=>{ e.preventDefault(); e.currentTarget.style.borderColor=''; e.currentTarget.style.background=''; const f=e.dataTransfer.files[0]; if(f) handleWorkerFile(f) }}
          onClick={()=>document.getElementById('workerExcelInput').click()}
          style={{border:'2px dashed #CBD5E1',borderRadius:10,padding:'16px',textAlign:'center',cursor:'pointer',background:'#FAFBFC'}}
        >
          <input id="workerExcelInput" type="file" accept=".xlsx,.xls" style={{display:'none'}}
            onChange={e=>{ if(e.target.files[0]) handleWorkerFile(e.target.files[0]); e.target.value='' }} />
          {parsing
            ? <Text type="secondary">파싱 중...</Text>
            : <Text type="secondary" style={{fontSize:13}}>작업자마스터 엑셀 파일을 드래그하거나 클릭하여 선택</Text>}
        </div>
      </Card>

      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <div style={{marginBottom:12,textAlign:'right'}}>
          <Button type="primary" icon={<PlusOutlined />} onClick={()=>openEdit()}
            style={{background:'#10B981',borderColor:'#10B981'}}>작업자 추가</Button>
        </div>
        <Spin spinning={dbLoading}>
          <Table columns={cols} dataSource={workers} pagination={false} size="small" bordered scroll={{x:1000}} />
        </Spin>
      </Card>

      <Modal title={editWorker ? '작업자 수정' : '작업자 추가'} open={modalOpen}
        onOk={handleSave} onCancel={()=>setModalOpen(false)} okText="저장" cancelText="취소"
        confirmLoading={saving} width={580}>
        <Form form={form} layout="vertical" style={{marginTop:16}}>
          <Row gutter={16}>
            <Col span={8}><Form.Item label="이름" name="name" rules={[{required:true}]}><Input /></Form.Item></Col>
            <Col span={8}><Form.Item label="소속반" name="dept" rules={[{required:true}]}>
              <Select options={DEPT_OPTIONS.map(d=>({label:d,value:d}))} placeholder="선택" />
            </Form.Item></Col>
            <Col span={8}><Form.Item label="주력공정" name="primary" rules={[{required:true}]}>
              <Select options={procOpts} showSearch />
            </Form.Item></Col>
            <Col span={24}><Form.Item label="겸직공정 (복수 선택)">
              <Form.Item name="secondary" noStyle>
                <Select mode="multiple" options={procOpts} placeholder="없으면 비워두세요" />
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
  const [equips, setEquips] = useState([])
  const [dbLoading, setDbLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editEquip, setEditEquip] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [procOpts, setProcOpts] = useState(ALL_PROCESSES.map(p=>({label:p,value:p})))
  const [parsing, setParsing] = useState(false)

  useEffect(() => {
    fetchProcesses()
      .then(data => {
        const active = data.filter(p => p.isActive)
        if (active.length) setProcOpts(active.map(p => ({label:p.name,value:p.name})))
      })
      .catch(() => {})
  }, [])

  const loadEquipment = async () => {
    setDbLoading(true)
    try {
      const data = await fetchEquipment()
      if (data.length) { setEquips(data) }
      else { await seedEquipment(INIT_EQUIP); setEquips(await fetchEquipment()) }
    } catch { message.error('설비 데이터 로드 실패'); setEquips(INIT_EQUIP) }
    finally { setDbLoading(false) }
  }

  useEffect(() => { loadEquipment() }, [])

  const handleEquipFile = useCallback(async file => {
    if (!/\.(xlsx?|xls)$/i.test(file.name)) { message.error('xlsx/xls 파일만 가능합니다'); return false }
    setParsing(true)
    try {
      const rows = await parseEquipExcel(file)
      if (!rows.length) { message.warning('설비 데이터를 찾을 수 없습니다'); return false }
      let count = 0
      for (const r of rows) { await saveEquipment(r, true); count++ }
      message.success(`${count}대 업로드 완료`)
      await loadEquipment()
    } catch (e) { message.error(`파싱 오류: ${e.message}`) }
    finally { setParsing(false) }
    return false
  }, [])

  const openEdit = (eq = null) => {
    setEditEquip(eq)
    setModalOpen(true)
    setTimeout(() => {
      form.resetFields()
      form.setFieldsValue(eq ? { ...eq } : { shift:'주간', status:'가동', dayHours:8, setupTime:0.5 })
    }, 0)
  }

  const handleSave = async () => {
    let vals
    try { vals = await form.validateFields() } catch { return }
    setSaving(true)
    try {
      const merged = editEquip ? { ...editEquip, ...vals } : vals
      await saveEquipment(merged, !editEquip)
      await loadEquipment()
      setModalOpen(false)
      message.success('저장되었습니다.')
    } catch(e) { message.error('저장 실패: ' + e.message) }
    finally { setSaving(false) }
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
            onConfirm={async()=>{ try { await deleteEquipmentById(r.key); await loadEquipment() } catch { message.error('삭제 실패') } }}>
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

      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',marginBottom:20}}>
        <div style={{marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
          <FileExcelOutlined style={{fontSize:16,color:'#10B981'}} />
          <Text strong>엑셀 일괄 등록</Text>
          <Button size="small" icon={<DownloadOutlined />} onClick={downloadEquipTemplate}>양식 다운로드</Button>
        </div>
        <div
          onDragOver={e=>{ e.preventDefault(); e.currentTarget.style.borderColor='#3B82F6'; e.currentTarget.style.background='rgba(59,130,246,0.04)' }}
          onDragLeave={e=>{ e.currentTarget.style.borderColor=''; e.currentTarget.style.background='' }}
          onDrop={e=>{ e.preventDefault(); e.currentTarget.style.borderColor=''; e.currentTarget.style.background=''; const f=e.dataTransfer.files[0]; if(f) handleEquipFile(f) }}
          onClick={()=>document.getElementById('equipExcelInput').click()}
          style={{border:'2px dashed #CBD5E1',borderRadius:10,padding:'16px',textAlign:'center',cursor:'pointer',background:'#FAFBFC'}}
        >
          <input id="equipExcelInput" type="file" accept=".xlsx,.xls" style={{display:'none'}}
            onChange={e=>{ if(e.target.files[0]) handleEquipFile(e.target.files[0]); e.target.value='' }} />
          {parsing
            ? <Text type="secondary">파싱 중...</Text>
            : <Text type="secondary" style={{fontSize:13}}>설비마스터 엑셀 파일을 드래그하거나 클릭하여 선택</Text>}
        </div>
      </Card>

      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <div style={{marginBottom:12,textAlign:'right'}}>
          <Button type="primary" icon={<PlusOutlined />} onClick={()=>openEdit()}
            style={{background:'#10B981',borderColor:'#10B981'}}>설비 추가</Button>
        </div>
        <Spin spinning={dbLoading}>
          <Table columns={cols} dataSource={equips} pagination={false} size="small" bordered scroll={{x:900}} />
        </Spin>
      </Card>

      <Modal title={editEquip ? '설비 수정' : '설비 추가'} open={modalOpen}
        onOk={handleSave} onCancel={()=>setModalOpen(false)} okText="저장" cancelText="취소"
        confirmLoading={saving} width={520}>
        <Form form={form} layout="vertical" style={{marginTop:16}}>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="설비명" name="name" rules={[{required:true}]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item label="담당공정" name="process" rules={[{required:true}]}>
              <Select options={procOpts} showSearch />
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

// ─── 공정마스터 ──────────────────────────────────────────────────
function ProcessMaster() {
  const [processes, setProcesses] = useState([])
  const [dbLoading, setDbLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editProc, setEditProc] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [parsing, setParsing] = useState(false)

  const deptSuggest = useMemo(() => {
    const extra = [...new Set(processes.map(p => p.dept).filter(Boolean))]
    return [...new Set([...DEPT_OPTIONS, ...extra])].map(d => ({ value: d }))
  }, [processes])

  const loadProcesses = async () => {
    setDbLoading(true)
    try {
      const data = await fetchProcesses()
      if (data.length) { setProcesses(data) }
      else { await seedProcesses(INIT_PROCESSES); setProcesses(await fetchProcesses()) }
    } catch { message.error('공정 데이터 로드 실패'); setProcesses(INIT_PROCESSES.map((p,i)=>({...p,key:String(i)}))) }
    finally { setDbLoading(false) }
  }

  useEffect(() => { loadProcesses() }, [])

  const handleProcessFile = useCallback(async file => {
    if (!/\.(xlsx?|xls)$/i.test(file.name)) { message.error('xlsx/xls 파일만 가능합니다'); return false }
    setParsing(true)
    try {
      const rows = await parseProcessExcel(file)
      if (!rows.length) { message.warning('공정 데이터를 찾을 수 없습니다'); return false }
      let count = 0
      for (const r of rows) { await saveProcess(r, true); count++ }
      message.success(`${count}건 업로드 완료`)
      await loadProcesses()
    } catch (e) { message.error(`파싱 오류: ${e.message}`) }
    finally { setParsing(false) }
    return false
  }, [])

  const openEdit = (p = null) => {
    setEditProc(p)
    setModalOpen(true)
    setTimeout(() => {
      form.resetFields()
      form.setFieldsValue(p ? { ...p } : { isActive: true, sortOrder: (processes.length + 1) * 5, stdTime: 0 })
    }, 0)
  }

  const handleSave = async () => {
    let vals
    try { vals = await form.validateFields() } catch { return }
    setSaving(true)
    try {
      await saveProcess(editProc ? { ...editProc, ...vals } : vals, !editProc)
      await loadProcesses()
      setModalOpen(false)
      message.success('저장되었습니다.')
    } catch(e) { message.error('저장 실패: ' + e.message) }
    finally { setSaving(false) }
  }

  const deptGroups = useMemo(() => {
    const g = {}
    processes.forEach(p => { if (p.dept) g[p.dept] = (g[p.dept] || 0) + 1 })
    return g
  }, [processes])

  const cols = [
    { title:'코드', dataIndex:'code', width:80, fixed:'left',
      render:v=><Text style={{color:'#3B82F6',fontSize:12,fontFamily:'monospace'}}>{v||'—'}</Text> },
    { title:'공정명', dataIndex:'name', width:130, render:v=><Text strong>{v}</Text> },
    { title:'소속반', dataIndex:'dept', width:110,
      render:v=>v?<Tag color={DEPT_COLOR[v]||'default'}>{v}</Tag>:<Text type="secondary">—</Text> },
    { title:'분류', dataIndex:'category', width:80,
      render:v=>v?<Tag>{v}</Tag>:<Text type="secondary">—</Text> },
    { title:'표준시간(분/EA)', dataIndex:'stdTime', width:130, align:'center',
      render:v=><Text strong style={{color:'#7C3AED'}}>{v}분</Text> },
    { title:'정렬순서', dataIndex:'sortOrder', width:80, align:'center',
      render:v=><Text type="secondary">{v}</Text> },
    { title:'사용여부', dataIndex:'isActive', width:90, align:'center',
      render:v=><Badge status={v?'success':'default'} text={v?'활성':'비활성'} /> },
    { title:'비고', dataIndex:'note', ellipsis:true,
      render:v=><Text type="secondary" style={{fontSize:12}}>{v||'—'}</Text> },
    { title:'', key:'act', width:80, fixed:'right',
      render:(_,r)=>(
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={()=>openEdit(r)} />
          <Popconfirm title="삭제할까요?" okText="삭제" cancelText="취소" okButtonProps={{danger:true}}
            onConfirm={async()=>{ try { await deleteProcessById(r.key); await loadProcesses() } catch { message.error('삭제 실패') } }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )},
  ]

  const statCards = [
    {l:'총 공정수', v:processes.length+'개', c:'#3B82F6'},
    {l:'제관반',    v:(deptGroups['제관반']||0)+'개', c:'#F97316'},
    {l:'조립반',    v:(deptGroups['조립반']||0)+'개', c:'#10B981'},
    {l:'비활성',    v:processes.filter(p=>!p.isActive).length+'개', c:'#94A3B8'},
  ]

  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>공정라우팅</Title>
        <Text type="secondary">반별 공정 목록 · 분류 · 표준시간 관리 — 작업자·설비마스터 드롭다운과 연동</Text>
      </div>

      <Row gutter={12} style={{marginBottom:16}}>
        {statCards.map((s,i)=>(
          <Col key={i} span={6}>
            <Card bordered={false} style={{borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',borderTop:`3px solid ${s.c}`}} styles={{body:{padding:'12px 16px'}}}>
              <Statistic title={<Text style={{fontSize:12,color:'#64748B'}}>{s.l}</Text>}
                value={s.v} valueStyle={{fontSize:20,fontWeight:800,color:s.c}} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',marginBottom:20}}>
        <div style={{marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
          <FileExcelOutlined style={{fontSize:16,color:'#10B981'}} />
          <Text strong>엑셀 일괄 등록</Text>
          <Button size="small" icon={<DownloadOutlined />} onClick={downloadProcessTemplate}>양식 다운로드</Button>
        </div>
        <div
          onDragOver={e=>{ e.preventDefault(); e.currentTarget.style.borderColor='#3B82F6'; e.currentTarget.style.background='rgba(59,130,246,0.04)' }}
          onDragLeave={e=>{ e.currentTarget.style.borderColor=''; e.currentTarget.style.background='' }}
          onDrop={e=>{ e.preventDefault(); e.currentTarget.style.borderColor=''; e.currentTarget.style.background=''; const f=e.dataTransfer.files[0]; if(f) handleProcessFile(f) }}
          onClick={()=>document.getElementById('procExcelInput').click()}
          style={{border:'2px dashed #CBD5E1',borderRadius:10,padding:'16px',textAlign:'center',cursor:'pointer',background:'#FAFBFC'}}
        >
          <input id="procExcelInput" type="file" accept=".xlsx,.xls" style={{display:'none'}}
            onChange={e=>{ if(e.target.files[0]) handleProcessFile(e.target.files[0]); e.target.value='' }} />
          {parsing
            ? <Text type="secondary">파싱 중...</Text>
            : <Text type="secondary" style={{fontSize:13}}>공정마스터 엑셀 파일을 드래그하거나 클릭하여 선택</Text>}
        </div>
      </Card>

      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <div style={{marginBottom:12,display:'flex',justifyContent:'flex-end'}}>
          <Button type="primary" icon={<PlusOutlined />} onClick={()=>openEdit()}
            style={{background:'#10B981',borderColor:'#10B981'}}>공정 추가</Button>
        </div>
        <Spin spinning={dbLoading}>
          <Table columns={cols} dataSource={processes} pagination={false} size="small" bordered scroll={{x:900}}
            rowClassName={r=>!r.isActive?'proc-inactive':''} />
        </Spin>
      </Card>

      <Modal title={editProc?'공정 수정':'공정 추가'} open={modalOpen}
        onOk={handleSave} onCancel={()=>setModalOpen(false)} okText="저장" cancelText="취소"
        confirmLoading={saving} width={520}>
        <Form form={form} layout="vertical" style={{marginTop:16}}>
          <Row gutter={16}>
            <Col span={10}><Form.Item label="공정코드" name="code">
              <Input placeholder="M01, A01 등 (선택)" />
            </Form.Item></Col>
            <Col span={14}><Form.Item label="공정명" name="name" rules={[{required:true,message:'공정명을 입력하세요'}]}>
              <Input placeholder="절곡, 용접, 랜딩도어조립 등" />
            </Form.Item></Col>
            <Col span={12}><Form.Item label="소속반" name="dept">
              <AutoComplete options={deptSuggest} placeholder="레이저반 / 제관반 / 조립반" allowClear />
            </Form.Item></Col>
            <Col span={12}><Form.Item label="공정분류" name="category">
              <Select allowClear placeholder="분류 선택"
                options={CATEGORIES.map(c=>({label:c,value:c}))} />
            </Form.Item></Col>
            <Col span={12}><Form.Item label="표준시간 (분/EA)" name="stdTime">
              <InputNumber min={0} style={{width:'100%'}} addonAfter="분" placeholder="0" />
            </Form.Item></Col>
            <Col span={12}><Form.Item label="정렬순서" name="sortOrder">
              <InputNumber min={0} style={{width:'100%'}} />
            </Form.Item></Col>
            <Col span={12}><Form.Item label="사용여부" name="isActive" valuePropName="checked">
              <Switch checkedChildren="활성" unCheckedChildren="비활성" defaultChecked />
            </Form.Item></Col>
            <Col span={24}><Form.Item label="비고" name="note">
              <Input placeholder="특이사항" />
            </Form.Item></Col>
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
  if (sub==='processMaster')       return <ProcessMaster />
  if (sub==='processRoute')        return <ProcessRouteMaster />
  if (sub==='workerMaster')        return <WorkerMaster />
  if (sub==='equipMaster')         return <EquipMaster />
  return <PlaceholderPage title={sub} />
}
