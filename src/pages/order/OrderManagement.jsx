import { useState, useCallback, useEffect } from 'react'
import {
  Table, Tag, Button, Space, Form, Input, Select, DatePicker, Row, Col, Card,
  Progress, Typography, Badge, Statistic, Divider, Alert, Modal, message, Tooltip,
  Steps, Empty, Popconfirm, Drawer, Tabs, Spin,
} from 'antd'
import {
  fetchOrders, upsertOrders, insertOrder, deleteOrderById, deleteAllOrders,
  fetchBatches, saveBatch, deleteBatch,
} from '../../api/db.js'
import {
  PlusOutlined, SearchOutlined, DownloadOutlined, WarningOutlined,
  InboxOutlined, CheckCircleOutlined, FileExcelOutlined, DeleteOutlined,
  CalendarOutlined, TeamOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons'
import * as XLSX from 'xlsx'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

// ─── ERP 엑셀 컬럼 → 내부 필드 매핑 ──────────────────────────────
const COL_MAP = {
  '파트':    'part',
  '주문PT#': 'productCode',
  '품명':    'productName',
  '규격':    'spec',
  '군별':    'group',
  '제번':    'jobNo',
  '주문수량': 'orderQty',
  '주문잔량': 'remainQty',
  '주문일자': 'orderDate',
  '납기일자': 'dueDate',
  '최초납기': 'origDueDate',
  '주문번호': 'orderNo',
  '거래선':  'customer',
  '생산계획': 'planDate',
  '생산완료': 'prodComplete',
  '포장완료': 'packComplete',
  '출고일자': 'shipDate',
  '작업부서': 'dept',
}

const DATE_FIELDS = new Set(['orderDate','dueDate','origDueDate','planDate','prodComplete','packComplete','shipDate'])

function fmtExcelDate(val) {
  if (val == null || val === '') return ''

  if (typeof val === 'number') {
    const n = Math.round(val)
    // ERP가 날짜를 YYYYMMDD 숫자로 저장하는 경우 (예: 20260609)
    if (n >= 19000101 && n <= 20991231) {
      const s = String(n)
      return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`
    }
    // Excel 날짜 시리얼 (2026년 = 약 46100~46500 범위)
    if (n > 0 && n < 200000) {
      const d = new Date((n - 25569) * 86400000)
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`
    }
  }

  const s = String(val).trim()
  // YYYYMMDD 문자열
  if (/^\d{8}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`
  // YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
  if (/^\d{4}[-/.]\d{2}[-/.]\d{2}/.test(s)) return s.slice(0,10).replace(/[/.]/g, '-')
  return s
}

function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type:'array', cellDates:false })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' })

        if (raw.length < 2) { reject(new Error('데이터가 없습니다')); return }

        // 헤더 행 자동 탐색 (최대 5행 이내에서 '제번' 또는 '주문PT#' 포함 행)
        let hIdx = 0
        for (let i = 0; i < Math.min(6, raw.length); i++) {
          if (raw[i].some(c => ['제번','주문PT#','파트'].includes(String(c).trim()))) { hIdx = i; break }
        }

        const headers = raw[hIdx].map(h => String(h).trim())
        const rows = raw.slice(hIdx + 1).filter(r => r.some(c => c !== ''))

        const data = rows.map((row, idx) => {
          const obj = { key: idx + 1, status:'신규', progress:0 }
          headers.forEach((h, i) => {
            const f = COL_MAP[h]
            if (f) obj[f] = DATE_FIELDS.has(f) ? fmtExcelDate(row[i]) : String(row[i] ?? '').trim()
          })
          return obj
        }).filter(r => {
          // 제번(jobNo)과 주문PT# 둘 다 없으면 소계/합계 행으로 판단 → 제외
          if (!r.jobNo && !r.productCode) return false
          // 품명이 소계류 키워드인 경우도 제외
          const name = String(r.productName || '').trim()
          if (['소계','합계','총계','계','합 계','소 계'].includes(name)) return false
          return true
        })

        resolve(data)
      } catch(err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// 오늘 날짜 기준 D-day 계산
function calcDday(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const due = new Date(dateStr); due.setHours(0,0,0,0)
  return Math.round((due - today) / 86400000)
}


// 납기일 범위 자동 감지 → "YYYYMMDD~YYYYMMDD" 형식 라벨
function autoLabel(rows) {
  const dates = rows.map(r => r.dueDate).filter(Boolean).sort()
  if (!dates.length) return ''
  const min = dates[0].replace(/-/g, '')
  const max = dates[dates.length - 1].replace(/-/g, '')
  return min === max ? min : `${min}~${max}`
}

// ─── 엑셀 업로드 영역 ─────────────────────────────────────────────
function ExcelUploadZone({ onImport }) {
  const [parsing, setParsing] = useState(false)
  const [preview, setPreview] = useState(null)   // { rows, filename }
  const [modalOpen, setModalOpen] = useState(false)
  const [saveLabel, setSaveLabel] = useState('')

  const handleFile = useCallback(async file => {
    if (!/\.(xlsx?|xls)$/i.test(file.name)) {
      message.error('xlsx / xls 파일만 업로드 가능합니다')
      return false
    }
    setParsing(true)
    try {
      const rows = await parseExcel(file)
      const label = autoLabel(rows)
      setPreview({ rows, filename: file.name })
      setSaveLabel(label)
      setModalOpen(true)
    } catch(e) {
      message.error(`파싱 오류: ${e.message}`)
    } finally {
      setParsing(false)
    }
    return false
  }, [])

  const handleImport = () => {
    if (!preview) return
    onImport(preview.rows, preview.filename, saveLabel)
    setModalOpen(false); setPreview(null)
  }

  const previewCols = [
    { title:'제번', dataIndex:'jobNo', width:120, fixed:'left', render:v=><Text strong style={{color:'#3B82F6',fontSize:12,fontFamily:'monospace'}}>{v}</Text> },
    { title:'주문PT#', dataIndex:'productCode', width:110, render:v=><Text style={{fontSize:12,fontFamily:'monospace'}}>{v}</Text> },
    { title:'품명', dataIndex:'productName', width:160, ellipsis:true, render:v=><Text strong>{v}</Text> },
    { title:'규격', dataIndex:'spec', width:120, ellipsis:true, render:v=><Text type="secondary" style={{fontSize:11}}>{v}</Text> },
    { title:'잔량', dataIndex:'remainQty', width:65, align:'center', render:v=><Text strong>{v}</Text> },
    { title:'납기일', dataIndex:'dueDate', width:110, render:v=>{
      const d = calcDday(v)
      return <Space size={3}>
        <Text>{v}</Text>
        {d != null && v && <Tag color={d<=1?'error':d<=3?'warning':'default'} style={{fontSize:10,padding:'0 3px',margin:0}}>D{d>=0?'-':'+'}{Math.abs(d)}</Tag>}
      </Space>
    }},
    { title:'거래선', dataIndex:'customer', width:130, ellipsis:true },
    { title:'부서', dataIndex:'dept', width:70 },
  ]

  return (
    <>
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',height:'100%'}}>
        <div style={{marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
          <FileExcelOutlined style={{fontSize:18,color:'#10B981'}} />
          <Text strong style={{fontSize:15}}>ERP 주문 엑셀 업로드</Text>
          <Text type="secondary" style={{fontSize:12}}>— 소계 행 자동 제외</Text>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='#3B82F6'; e.currentTarget.style.background='rgba(59,130,246,0.04)' }}
          onDragLeave={e => { e.currentTarget.style.borderColor=''; e.currentTarget.style.background='' }}
          onDrop={e => {
            e.preventDefault()
            e.currentTarget.style.borderColor=''; e.currentTarget.style.background=''
            const f = e.dataTransfer.files[0]
            if (f) handleFile(f)
          }}
          style={{ border:'2px dashed #CBD5E1', borderRadius:10, padding:'28px 20px', textAlign:'center', cursor:'pointer', transition:'all 0.2s', background:'#FAFBFC' }}
          onClick={() => document.getElementById('excelFileInput').click()}
        >
          <input id="excelFileInput" type="file" accept=".xlsx,.xls" style={{display:'none'}}
            onChange={e => { if(e.target.files[0]) handleFile(e.target.files[0]); e.target.value='' }} />
          {parsing
            ? <Text type="secondary">⏳ 파싱 중...</Text>
            : <>
                <InboxOutlined style={{fontSize:32,color:'#94A3B8',marginBottom:6,display:'block'}} />
                <Text strong style={{color:'#475569',display:'block',marginBottom:3}}>엑셀 파일을 드래그하거나 클릭하여 선택</Text>
                <Text type="secondary" style={{fontSize:12}}>.xlsx / .xls &nbsp;|&nbsp; 소계·합계 행 자동 스킵</Text>
              </>}
        </div>
      </Card>

      <Modal
        title={
          <Space>
            <FileExcelOutlined style={{color:'#10B981'}} />
            <Text strong>ERP 주문 미리보기</Text>
            {preview && <Tag color="blue">{preview.filename}</Tag>}
            {preview && <Tag color="processing">{preview.rows.length}건</Tag>}
          </Space>
        }
        open={modalOpen}
        onOk={handleImport}
        onCancel={() => { setModalOpen(false); setPreview(null) }}
        okText="가져오기"
        cancelText="취소"
        width={1000}
        okButtonProps={{icon:<CheckCircleOutlined />, style:{background:'#10B981',borderColor:'#10B981'}}}
        styles={{body:{padding:'12px 0'}}}
      >
        {preview && (
          <>
            <Alert type="info" showIcon
              message={`총 ${preview.rows.length}건 (소계/합계 행 제외됨). 저장 이름을 확인 후 "저장 + 가져오기"를 누르세요.`}
              style={{marginBottom:12,borderRadius:8,marginLeft:24,marginRight:24}}
            />
            <Table
              columns={previewCols}
              dataSource={preview.rows}
              pagination={{ pageSize:12, showTotal:t=>`총 ${t}건` }}
              size="small"
              scroll={{x:830}}
              rowClassName={r => calcDday(r.dueDate) < 0 ? 'row-overdue' : calcDday(r.dueDate) <= 3 ? 'row-urgent' : ''}
            />
          </>
        )}
      </Modal>
    </>
  )
}

// ─── 저장된 주문 묶음 ─────────────────────────────────────────────
function SavedBatches({ onLoad }) {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try { setBatches(await fetchBatches()) } catch { /* silent */ } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [])

  const handleLoad = async (b) => {
    try {
      const rows = await fetchOrders(b.label)
      onLoad(rows, b.label)
      message.success(`"${b.label}" ${b.count}건 불러왔습니다.`)
    } catch { message.error('불러오기 실패') }
  }

  const handleDelete = async (label) => {
    try {
      await deleteBatch(label)
      refresh()
      message.success(`"${label}" 삭제 완료`)
    } catch { message.error('삭제 실패') }
  }

  return (
    <Card bordered={false} size="small"
      style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',height:'100%'}}
      title={<Space><CalendarOutlined style={{color:'#3B82F6'}} /><Text strong style={{fontSize:13}}>저장된 주문 묶음</Text></Space>}>
      <Spin spinning={loading}>
        {batches.length === 0 && !loading
          ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Text type="secondary" style={{fontSize:12}}>저장된 묶음이 없습니다.<br/>엑셀 가져오기 후 저장하세요.</Text>} style={{margin:'16px 0'}} />
          : <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {batches.map(b => (
                <div key={b.label} style={{
                  display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',
                  border:'1px solid #E2E8F0',borderRadius:8,padding:'8px 12px',
                  background:'#F8FAFC',cursor:'pointer',transition:'background 0.15s',
                }}
                  onMouseEnter={e=>e.currentTarget.style.background='#EFF6FF'}
                  onMouseLeave={e=>e.currentTarget.style.background='#F8FAFC'}
                >
                  <CalendarOutlined style={{color:'#3B82F6',fontSize:13,flexShrink:0}} />
                  <Text strong style={{fontSize:12,fontFamily:'monospace',flex:1,minWidth:0}}>{b.label}</Text>
                  <Tag color="blue" style={{margin:0,fontSize:11,flexShrink:0}}>{b.count}건</Tag>
                  <Text type="secondary" style={{fontSize:10,flexShrink:0}}>{b.savedAt}</Text>
                  <Button size="small" type="primary" ghost style={{padding:'0 8px',height:22,fontSize:11,flexShrink:0}} onClick={() => handleLoad(b)}>불러오기</Button>
                  <Popconfirm title={`"${b.label}" 삭제?`} okText="삭제" cancelText="취소" okButtonProps={{danger:true}} onConfirm={() => handleDelete(b.label)}>
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} style={{padding:'0 2px',height:22,flexShrink:0}} />
                  </Popconfirm>
                </div>
              ))}
            </div>
        }
      </Spin>
    </Card>
  )
}

// ─── 상태 색상 ────────────────────────────────────────────────────
const STATUS_COLOR = { 완료:'success', 진행:'processing', 위험:'error', 대기:'default', 신규:'purple' }

// ─── 수주현황 ─────────────────────────────────────────────────────
const DUMMY_ORDERS = [
  { key:'d1', jobNo:'26T0406R01', productCode:'4UF0062*A', productName:'SILL SUPPORT',    spec:'T4.5*60*109 W', orderQty:12, remainQty:12, orderDate:'2026-05-16', dueDate:'2026-06-09', customer:'오티스엘리베이터', dept:'ST', status:'진행', progress:45 },
  { key:'d2', jobNo:'26T0512B02', productCode:'3HH-001B',  productName:'HH-프레임 ASSY',   spec:'T3.2 SS400',    orderQty:8,  remainQty:8,  orderDate:'2026-05-12', dueDate:'2026-05-31', customer:'현대중공업',      dept:'WS', status:'위험', progress:62 },
  { key:'d3', jobNo:'26T0508S03', productCode:'SMP-A',     productName:'제관 판넬 A타입',   spec:'T1.6 SS400',    orderQty:20, remainQty:0,  orderDate:'2026-05-08', dueDate:'2026-05-28', customer:'삼성중공업',      dept:'PNT',status:'완료', progress:100},
  { key:'d4', jobNo:'26T0515D04', productCode:'BKT-SET',   productName:'구조체 브라켓 SET', spec:'T4.5 SS400',    orderQty:15, remainQty:15, orderDate:'2026-05-15', dueDate:'2026-05-31', customer:'두산에너빌리티',   dept:'ASM',status:'위험', progress:53 },
  { key:'d5', jobNo:'26T0520E05', productCode:'DFR-EL',    productName:'도어프레임 EL',     spec:'T2.3 AL',       orderQty:6,  remainQty:6,  orderDate:'2026-05-20', dueDate:'2026-06-10', customer:'현대엘리베이터',   dept:'ST', status:'대기', progress:0  },
]

function OrderList() {
  const [orders, setOrders] = useState([])
  const [dbLoading, setDbLoading] = useState(true)

  const loadOrders = async () => {
    setDbLoading(true)
    try {
      const data = await fetchOrders()
      setOrders(data)
    } catch {
      message.error('수주 데이터 로드 실패')
      setOrders([])
    } finally { setDbLoading(false) }
  }

  useEffect(() => { loadOrders() }, [])
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState(null)
  const [importLog, setImportLog] = useState([])    // { filename, count, at }

  const [pendingSave, setPendingSave] = useState(null)  // { rows, autoLabel } — 저장 대기 중
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState('excel')
  const [addForm] = Form.useForm()
  const [drawerParsing, setDrawerParsing] = useState(false)
  const [drawerRows, setDrawerRows] = useState(null)  // parsed excel rows

  const handleDrawerExcel = useCallback(async file => {
    if (!/\.(xlsx?|xls)$/i.test(file.name)) { message.error('xlsx / xls 파일만 가능합니다'); return false }
    setDrawerParsing(true)
    try {
      const rows = await parseExcel(file)
      setDrawerRows(rows)
    } catch(e) { message.error(`파싱 오류: ${e.message}`) }
    finally { setDrawerParsing(false) }
    return false
  }, [])

  const handleDrawerExcelAdd = () => {
    if (!drawerRows?.length) return
    let added = 0
    setOrders(prev => {
      const merged = [...prev]
      drawerRows.forEach(r => {
        if (!merged.find(o => o.jobNo && o.jobNo === r.jobNo)) {
          merged.push({ ...r, key: `xl_${Date.now()}_${added}` }); added++
        }
      })
      return merged
    })
    message.success(`${drawerRows.length}건 파싱 완료 (신규 ${added}건 추가)`)
    setDrawerRows(null)
    setDrawerOpen(false)
  }

  const handleAddOrder = async (vals) => {
    const newOrder = {
      ...vals,
      orderDate: vals.orderDate?.format('YYYY-MM-DD') || '',
      dueDate:   vals.dueDate?.format('YYYY-MM-DD')   || '',
      remainQty: vals.orderQty,
      status:    '신규',
      progress:  0,
    }
    try {
      await insertOrder(newOrder)
      await loadOrders()
    } catch(e) {
      message.error('등록 실패: ' + e.message)
      return
    }
    addForm.resetFields()
    setDrawerOpen(false)
    message.success('추가주문이 등록되었습니다.')
  }

  const handleImport = async (rows, filename, suggestedLabel) => {
    let added = 0
    const merged = [...orders]
    rows.forEach(r => {
      if (!merged.find(o => o.jobNo && o.jobNo === r.jobNo)) {
        merged.push({ ...r, key: `imp_${Date.now()}_${added}` }); added++
      }
    })
    setOrders(merged)
    setImportLog(l => [{ filename, count:rows.length, added, at:new Date().toLocaleTimeString() }, ...l.slice(0,4)])
    try {
      await upsertOrders(rows, suggestedLabel || null)
    } catch(e) {
      console.error('upsertOrders error:', e)
      message.error('DB 저장 실패: ' + (e?.message || JSON.stringify(e)))
    }
    setPendingSave({ rows, label: suggestedLabel || '' })
  }

  const handleLoadBatch = (rows, label) => {
    setOrders(rows.length ? rows : DUMMY_ORDERS)
  }

  const filtered = orders.filter(o => {
    const q = searchText.toLowerCase()
    const matchSearch = !q || [o.jobNo,o.productCode,o.productName,o.customer].some(v => v?.toLowerCase().includes(q))
    const matchStatus = !statusFilter || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const summary = {
    total: orders.length,
    done:  orders.filter(o=>o.status==='완료').length,
    going: orders.filter(o=>o.status==='진행').length,
    risk:  orders.filter(o=>o.status==='위험').length,
    new_:  orders.filter(o=>o.status==='신규').length,
  }

  const C = { fontSize:13, fontWeight:400, color:'#0F172A' }  // 셀 공통 스타일

  const columns = [
    { title:'제번', dataIndex:'jobNo', key:'jobNo', width:120, fixed:'left',
      sorter:(a,b)=>a.jobNo?.localeCompare(b.jobNo),
      render:v=><span style={{...C,fontFamily:'monospace'}}>{v}</span> },
    { title:'주문PT#', dataIndex:'productCode', key:'productCode', width:110,
      render:v=><span style={{...C,fontFamily:'monospace'}}>{v}</span> },
    { title:'품명', dataIndex:'productName', key:'productName', width:160, ellipsis:true,
      render:v=><span style={C}>{v}</span> },
    { title:'규격', dataIndex:'spec', key:'spec', width:120, ellipsis:true,
      render:v=><span style={C}>{v}</span> },
    { title:'잔량', dataIndex:'remainQty', key:'remainQty', width:65, align:'center',
      render:v=><span style={C}>{v}</span> },
    { title:'납기일', dataIndex:'dueDate', key:'dueDate', width:110,
      sorter:(a,b)=>a.dueDate?.localeCompare(b.dueDate),
      render:(v)=>{
        const d = calcDday(v)
        return <span>
          <span style={C}>{v}</span>
          {d != null && v && <Tag color={d<=1?'error':d<=3?'warning':'default'} style={{fontSize:10,padding:'0 4px',marginLeft:4}}>(D{d>=0?'-':'+'}{Math.abs(d)})</Tag>}
        </span>
      }},
    { title:'거래선', dataIndex:'customer', key:'customer', width:140, ellipsis:true,
      render:v=><span style={C}>{v}</span> },
    { title:'진행률', dataIndex:'progress', key:'progress', width:140,
      sorter:(a,b)=>a.progress-b.progress,
      render:v=>(
        <Space size={4}>
          <Progress percent={v} size="small" style={{width:80}} showInfo={false}
            strokeColor={v===100?'#10B981':v>60?'#3B82F6':'#F59E0B'} trailColor="#F1F5F9" />
          <span style={C}>{v}%</span>
        </Space>
      )},
    { title:'상태', dataIndex:'status', key:'status', width:80,
      filters:[{text:'완료',value:'완료'},{text:'진행',value:'진행'},{text:'위험',value:'위험'},{text:'대기',value:'대기'},{text:'신규',value:'신규'}],
      onFilter:(v,r)=>r.status===v,
      render:v=><Badge status={STATUS_COLOR[v]} text={<span style={C}>{v}</span>} /> },
    { title:'액션', key:'action', width:140, fixed:'right',
      render:(_,r)=>(
        <Space size={4}>
          <Button size="small">상세</Button>
          <Button size="small" type="primary" disabled={r.status==='완료'}>계획</Button>
          <Popconfirm title="이 주문을 삭제할까요?" okText="삭제" cancelText="취소" okButtonProps={{danger:true}}
            onConfirm={async()=>{
              if (!isNaN(parseInt(r.key))) {
                try { await deleteOrderById(r.key); await loadOrders() } catch { message.error('삭제 실패') }
              } else {
                setOrders(prev => prev.filter(o => o.key !== r.key))
              }
            }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )},
  ]

  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>주문현황</Title>
        <Text type="secondary">ERP 엑셀 업로드 또는 직접 등록 — 전체 주문 목록 및 진행 상태 관리</Text>
      </div>

      {/* 엑셀 업로드 + 저장된 묶음 — 좌우 배치 */}
      <Row gutter={16} style={{marginBottom:16}} align="stretch">
        <Col span={12}><ExcelUploadZone onImport={handleImport} /></Col>
        <Col span={12}><SavedBatches onLoad={handleLoadBatch} /></Col>
      </Row>

      {/* 가져오기 이력 */}
      {importLog.length > 0 && (
        <Alert type="success" showIcon icon={<CheckCircleOutlined />}
          message={<Space split={<span style={{color:'#CBD5E1'}}>|</span>}>
            {importLog.map((l,i)=>(
              <Text key={i} style={{fontSize:12}}>
                <Text strong>{l.filename}</Text> — {l.count}건 처리 (신규 {l.added}건 추가) <Text type="secondary">{l.at}</Text>
              </Text>
            ))}
          </Space>}
          style={{marginBottom:12,borderRadius:10}} closable />
      )}

      {/* 저장 배너 — 가져오기 직후 표시 */}
      {pendingSave && (
        <Card bordered={false}
          style={{borderRadius:12,marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',borderLeft:'4px solid #3B82F6',background:'#EFF6FF'}}>
          <Space size={12} style={{flexWrap:'wrap'}}>
            <CalendarOutlined style={{fontSize:18,color:'#3B82F6'}} />
            <Text strong style={{color:'#1E40AF'}}>이 데이터를 저장하시겠어요?</Text>
            <Text type="secondary" style={{fontSize:12}}>납기일 범위로 이름을 지정하면 나중에 불러올 수 있습니다.</Text>
            <Space.Compact>
              <Input
                value={pendingSave.label}
                onChange={e => setPendingSave(p => ({...p, label: e.target.value}))}
                placeholder="예: 20260601~20260607"
                style={{width:200}}
                onPressEnter={async () => {
                  if (!pendingSave.label.trim()) { message.warning('이름을 입력하세요'); return }
                  try { await saveBatch(pendingSave.label.trim(), pendingSave.rows.length); setPendingSave(null); message.success(`"${pendingSave.label}" 저장 완료`) }
                  catch { message.error('저장 실패') }
                }}
              />
              <Button type="primary" icon={<CheckCircleOutlined />}
                onClick={async () => {
                  if (!pendingSave.label.trim()) { message.warning('이름을 입력하세요'); return }
                  try { await saveBatch(pendingSave.label.trim(), pendingSave.rows.length); setPendingSave(null); message.success(`"${pendingSave.label}" 저장 완료`) }
                  catch { message.error('저장 실패') }
                }}>저장</Button>
            </Space.Compact>
            <Button type="text" onClick={() => setPendingSave(null)}>나중에</Button>
          </Space>
        </Card>
      )}

      {/* ── 틀 고정 영역: KPI 카드 + 검색 툴바 ── */}
      <div style={{
        position:'sticky', top:90, zIndex:50,
        background:'#F1F5F9', padding:'0 0 10px',
        marginLeft:-24, marginRight:-24, paddingLeft:24, paddingRight:24,
      }}>
        {/* KPI 카드 */}
        <Row gutter={10} style={{marginBottom:8}}>
          {[
            {l:'총 주문',  v:summary.total, c:'#3B82F6', f:null},
            {l:'신규',     v:summary.new_,  c:'#7C3AED', f:'신규'},
            {l:'진행중',   v:summary.going, c:'#F59E0B', f:'진행'},
            {l:'납기위험', v:summary.risk,  c:'#EF4444', f:'위험'},
            {l:'완료',     v:summary.done,  c:'#10B981', f:'완료'},
          ].map((s,i)=>(
            <Col key={i} flex={1}>
              <Card bordered={false}
                style={{borderRadius:8,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',borderTop:`3px solid ${s.c}`,cursor:'pointer',
                  outline: statusFilter===s.f && s.f!==null ? `2px solid ${s.c}` : 'none'}}
                styles={{body:{padding:'6px 12px'}}}
                onClick={()=>setStatusFilter(p => p===s.f ? null : s.f)}>
                <div style={{fontSize:11,color:'#64748B',marginBottom:1}}>{s.l}</div>
                <div style={{fontSize:16,fontWeight:800,color:s.c,lineHeight:1.3}}>{s.v}<span style={{fontSize:12,fontWeight:500,marginLeft:2}}>건</span></div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 검색 툴바 */}
        <Card bordered={false} style={{borderRadius:10,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
          <Space style={{flexWrap:'wrap'}} size={8}>
            <Input placeholder="제번 / 주문PT# / 품명 / 거래선" prefix={<SearchOutlined />}
              style={{width:240}} value={searchText} onChange={e=>setSearchText(e.target.value)} allowClear />
            <Select placeholder="상태" style={{width:110}} allowClear value={statusFilter} onChange={setStatusFilter}
              options={['신규','진행','위험','완료','대기'].map(v=>({label:v,value:v}))} />
            <Button icon={<DownloadOutlined />}>Excel 내보내기</Button>
            <Popconfirm
              title="전체 삭제"
              description={`현재 목록 ${filtered.length}건을 모두 삭제할까요?`}
              okText="전체 삭제" cancelText="취소" okButtonProps={{danger:true}}
              onConfirm={async()=>{ try { await deleteAllOrders(); setOrders([]); message.success('전체 삭제 완료') } catch { message.error('삭제 실패') } }}>
              <Button danger icon={<DeleteOutlined />}>전체 삭제</Button>
            </Popconfirm>
            <Button type="primary" icon={<PlusOutlined />}
              style={{marginLeft:'auto',background:'#10B981',borderColor:'#10B981'}}
              onClick={() => setDrawerOpen(true)}>추가주문</Button>
          </Space>
        </Card>
      </div>

      {/* 목록 */}
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',marginTop:10,border:'1px solid #CBD5E1'}}>
        <Spin spinning={dbLoading}>
          <Table
            columns={columns}
            dataSource={filtered}
            pagination={false}
            bordered
            size="small"
            scroll={{x:1150}}
            rowClassName={r=>r.status==='위험'?'row-risk':''}
            locale={{emptyText:<Empty description="주문 데이터가 없습니다. ERP 엑셀을 업로드하세요." />}}
          />
        </Spin>
      </Card>

      <Drawer
        title={<Space><PlusOutlined style={{color:'#10B981'}} /><span>추가주문 등록</span></Space>}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); addForm.resetFields(); setDrawerRows(null) }}
        width={480}
        footer={
          <Space style={{justifyContent:'flex-end',width:'100%'}}>
            <Button onClick={() => { setDrawerOpen(false); addForm.resetFields(); setDrawerRows(null) }}>취소</Button>
            {drawerTab === 'excel'
              ? <Button type="primary" style={{background:'#10B981',borderColor:'#10B981'}}
                  disabled={!drawerRows?.length} onClick={handleDrawerExcelAdd}>
                  목록에 추가 {drawerRows ? `(${drawerRows.length}건)` : ''}
                </Button>
              : <Button type="primary" style={{background:'#10B981',borderColor:'#10B981'}}
                  onClick={() => addForm.submit()}>등록</Button>
            }
          </Space>
        }
      >
        <Tabs activeKey={drawerTab} onChange={k => { setDrawerTab(k); setDrawerRows(null) }} size="small"
          items={[
            {
              key:'excel', label:'엑셀 업로드',
              children: (
                <div>
                  <div
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='#10B981'; e.currentTarget.style.background='rgba(16,185,129,0.04)' }}
                    onDragLeave={e => { e.currentTarget.style.borderColor=''; e.currentTarget.style.background='' }}
                    onDrop={e => {
                      e.preventDefault()
                      e.currentTarget.style.borderColor=''; e.currentTarget.style.background=''
                      const f = e.dataTransfer.files[0]; if (f) handleDrawerExcel(f)
                    }}
                    style={{ border:'2px dashed #CBD5E1', borderRadius:10, padding:'32px 20px', textAlign:'center', cursor:'pointer', transition:'all 0.2s', background:'#FAFBFC', marginBottom:16 }}
                    onClick={() => document.getElementById('drawerExcelInput').click()}
                  >
                    <input id="drawerExcelInput" type="file" accept=".xlsx,.xls" style={{display:'none'}}
                      onChange={e => { if(e.target.files[0]) handleDrawerExcel(e.target.files[0]); e.target.value='' }} />
                    {drawerParsing
                      ? <span style={{color:'#64748B'}}>⏳ 파싱 중...</span>
                      : <>
                          <InboxOutlined style={{fontSize:36,color:'#94A3B8',marginBottom:8,display:'block'}} />
                          <div style={{fontWeight:600,color:'#475569',marginBottom:4}}>엑셀 파일을 드래그하거나 클릭</div>
                          <div style={{fontSize:12,color:'#94A3B8'}}>.xlsx / .xls · 소계 행 자동 제외</div>
                        </>
                    }
                  </div>
                  {drawerRows && (
                    <Alert type="success" showIcon
                      message={<span><b>{drawerRows.length}건</b> 파싱 완료 — 아래 "목록에 추가" 버튼을 누르세요.</span>}
                      style={{borderRadius:8}}
                    />
                  )}
                </div>
              ),
            },
            {
              key:'manual', label:'수동 입력',
              children: (
                <Form form={addForm} layout="vertical" onFinish={handleAddOrder}>
                  <Row gutter={12}>
                    <Col span={12}><Form.Item label="제번" name="jobNo" rules={[{required:true,message:'제번 입력'}]}><Input placeholder="예: 26T0601A01" /></Form.Item></Col>
                    <Col span={12}><Form.Item label="주문PT#" name="productCode"><Input placeholder="예: 4UF0062*A" /></Form.Item></Col>
                    <Col span={24}><Form.Item label="품명" name="productName" rules={[{required:true,message:'품명 입력'}]}><Input /></Form.Item></Col>
                    <Col span={24}><Form.Item label="규격" name="spec"><Input placeholder="예: T4.5*60*109 W" /></Form.Item></Col>
                    <Col span={12}><Form.Item label="주문수량" name="orderQty" rules={[{required:true,message:'수량 입력'}]}><Input type="number" addonAfter="EA" /></Form.Item></Col>
                    <Col span={12}><Form.Item label="작업부서" name="dept"><Select options={['ST','WS','PNT','ASM','LSR'].map(v=>({label:v,value:v}))} /></Form.Item></Col>
                    <Col span={12}><Form.Item label="주문일자" name="orderDate" rules={[{required:true,message:'주문일자 입력'}]}><DatePicker style={{width:'100%'}} /></Form.Item></Col>
                    <Col span={12}><Form.Item label="납기일자" name="dueDate" rules={[{required:true,message:'납기일자 입력'}]}><DatePicker style={{width:'100%'}} /></Form.Item></Col>
                    <Col span={24}><Form.Item label="거래선" name="customer"><Select options={['현대엘리베이터','현대중공업','삼성중공업','두산에너빌리티','오티스엘리베이터'].map(v=>({label:v,value:v}))} /></Form.Item></Col>
                  </Row>
                </Form>
              ),
            },
          ]}
        />
      </Drawer>

      <style>{`
        .row-risk td { background: #FFF8F8 !important; }
        .row-overdue td { background: #FEF2F2 !important; }
        .row-urgent td { background: #FFFBEB !important; }
      `}</style>
    </div>
  )
}

// ─── 수주 등록 (수동) ─────────────────────────────────────────────
function OrderInput() {
  const [form] = Form.useForm()
  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>주문 수동 등록</Title>
        <Text type="secondary">신규 주문 정보 직접 입력 (ERP 엑셀 미사용 시)</Text>
      </div>
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <Form form={form} layout="vertical">
          <Title level={5} style={{marginBottom:16,color:'#374151'}}>주문 기본정보</Title>
          <Row gutter={16}>
            <Col span={8}><Form.Item label="제번" name="jobNo" rules={[{required:true}]}><Input placeholder="예: 26T0601A01" /></Form.Item></Col>
            <Col span={8}><Form.Item label="주문PT#" name="productCode"><Input placeholder="예: 4UF0062*A" /></Form.Item></Col>
            <Col span={8}><Form.Item label="거래선" name="customer" rules={[{required:true}]}>
              <Select options={['현대엘리베이터','현대중공업','삼성중공업','두산에너빌리티','오티스엘리베이터'].map(v=>({label:v,value:v}))} />
            </Form.Item></Col>
            <Col span={8}><Form.Item label="품명" name="productName" rules={[{required:true}]}><Input placeholder="제품명 입력" /></Form.Item></Col>
            <Col span={8}><Form.Item label="규격" name="spec"><Input placeholder="예: T4.5*60*109 W" /></Form.Item></Col>
            <Col span={8}><Form.Item label="군별" name="group"><Input placeholder="군별 코드" /></Form.Item></Col>
            <Col span={8}><Form.Item label="주문수량" name="orderQty" rules={[{required:true}]}><Input type="number" placeholder="0" addonAfter="EA" /></Form.Item></Col>
            <Col span={8}><Form.Item label="주문일자" name="orderDate" rules={[{required:true}]}><DatePicker style={{width:'100%'}} /></Form.Item></Col>
            <Col span={8}><Form.Item label="납기일자" name="dueDate" rules={[{required:true}]}><DatePicker style={{width:'100%'}} /></Form.Item></Col>
            <Col span={8}><Form.Item label="작업부서" name="dept"><Select options={['ST','WS','PNT','ASM','LSR'].map(v=>({label:v,value:v}))} /></Form.Item></Col>
          </Row>
          <Form.Item style={{marginTop:8,textAlign:'right'}}>
            <Space>
              <Button onClick={()=>form.resetFields()}>초기화</Button>
              <Button type="primary" onClick={()=>form.submit()}>주문 등록</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

// ─── 납기검토 ─────────────────────────────────────────────────────
function DeliveryCheck() {
  const items = [
    { key:1, jobNo:'26T0515D04', productName:'구조체 브라켓 SET', dueDate:'2026-05-31', remain:2, plan:15, done:8,  risk:'critical', note:'설비 과부하, 야근 필요' },
    { key:2, jobNo:'26T0512B02', productName:'HH-프레임 ASSY',    dueDate:'2026-05-31', remain:2, plan:8,  done:5,  risk:'high',     note:'자재 납기 지연 가능성' },
    { key:3, jobNo:'26T0406R01', productName:'SILL SUPPORT',       dueDate:'2026-06-09', remain:11,plan:12, done:10, risk:'low',      note:'정상 진행' },
  ]
  const riskMap = { critical:['납기위험','error'], high:['주의','warning'], low:['정상','success'] }
  const cols = [
    { title:'제번', dataIndex:'jobNo', width:130, render:v=><Text strong style={{color:'#3B82F6',fontSize:12,fontFamily:'monospace'}}>{v}</Text> },
    { title:'제품명', dataIndex:'productName', render:v=><Text strong>{v}</Text> },
    { title:'납기일', dataIndex:'dueDate', width:110, render:(v,r)=>{
      const d = calcDday(v)
      return <Space direction="vertical" size={0}>
        <Text style={{color:r.risk==='critical'?'#EF4444':'',fontWeight:r.risk!=='low'?700:''}}>{v}</Text>
        <Text style={{fontSize:11,color:'#94A3B8'}}>D-{d}</Text>
      </Space>
    }},
    { title:'잔여(일)', dataIndex:'remain', width:80, align:'center', render:v=><Text strong style={{color:v<=2?'#EF4444':'#0F172A'}}>{v}일</Text> },
    { title:'계획(EA)', dataIndex:'plan', width:80, align:'center' },
    { title:'완료(EA)', dataIndex:'done', width:80, align:'center', render:v=><Text strong style={{color:'#10B981'}}>{v}</Text> },
    { title:'잔여(EA)', key:'left', width:80, align:'center', render:(_,r)=><Text strong style={{color:'#EF4444'}}>{r.plan-r.done}</Text> },
    { title:'진행률', key:'pct', width:130, render:(_,r)=>{
      const pct = Math.round(r.done/r.plan*100)
      return <Space size={4}><Progress percent={pct} size="small" style={{width:80}} showInfo={false} strokeColor={pct===100?'#10B981':pct>60?'#3B82F6':'#F59E0B'} /><Text style={{fontSize:11}}>{pct}%</Text></Space>
    }},
    { title:'위험도', dataIndex:'risk', width:90, render:v=><Tag color={riskMap[v][1]}>{riskMap[v][0]}</Tag> },
    { title:'비고', dataIndex:'note', render:v=><Text type="secondary" style={{fontSize:12}}>{v}</Text> },
  ]
  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>납기 검토</Title>
        <Text type="secondary">납기 준수 가능 여부 분석 및 위험 주문 관리</Text>
      </div>
      <Alert type="warning" showIcon icon={<WarningOutlined />}
        message="납기 D-7 이내 주문 2건이 있습니다. 납기위험 1건에 대한 즉시 조치가 필요합니다."
        style={{marginBottom:16,borderRadius:10}} />
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <Table columns={cols} dataSource={items} pagination={false} size="small" bordered />
      </Card>
    </div>
  )
}

// ─── Placeholder ──────────────────────────────────────────────────
function PlaceholderPage({ title }) {
  return (
    <div>
      <div style={{marginBottom:20}}><Title level={4} style={{margin:0}}>{title}</Title></div>
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',textAlign:'center',padding:'48px 0'}}>
        <Text type="secondary" style={{fontSize:15}}>🚧 개발 예정</Text>
      </Card>
    </div>
  )
}

export function OrderManagement({ sub }) {
  if (!sub || sub==='orderList')   return <OrderList />
  if (sub==='orderInput')          return <OrderInput />
  if (sub==='deliveryCheck')       return <DeliveryCheck />
  return <PlaceholderPage title={sub} />
}
