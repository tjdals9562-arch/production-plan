import { Table, Card, Row, Col, Statistic, Progress, Button, Space, Select, Tag, Typography, Badge, Alert } from 'antd'
import { SearchOutlined, DownloadOutlined, CheckOutlined, SyncOutlined, WarningOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const MRP_DATA = [
  { key:1, mat:'SS400 T2.0',   unit:'kg', gross:520, stock:180, net:340, leadtime:5, orderDate:'2026-05-24', dueDate:'2026-05-29', status:'발주중',   supplier:'포스코' },
  { key:2, mat:'STS304 T1.6',  unit:'kg', gross:280, stock:95,  net:185, leadtime:7, orderDate:'2026-05-22', dueDate:'2026-05-29', status:'미확정',   supplier:'세아제강' },
  { key:3, mat:'SS400 T3.2',   unit:'kg', gross:640, stock:420, net:220, leadtime:5, orderDate:'2026-05-26', dueDate:'2026-05-31', status:'미확정',   supplier:'포스코' },
  { key:4, mat:'볼트 M10×25', unit:'EA', gross:1200,stock:800, net:400, leadtime:2, orderDate:'2026-05-27', dueDate:'2026-05-29', status:'완료',     supplier:'주성볼트' },
  { key:5, mat:'AL T2.3',      unit:'kg', gross:120, stock:200, net:0,   leadtime:7, orderDate:'—',           dueDate:'—',          status:'재고충분',  supplier:'알코아' },
]

const STOCK_DATA = [
  { key:1, code:'M-001', name:'SS400 T2.0',   unit:'kg', qty:180, safe:200, status:'부족',  location:'A-01' },
  { key:2, code:'M-002', name:'STS304 T1.6',  unit:'kg', qty:95,  safe:150, status:'부족',  location:'A-03' },
  { key:3, code:'M-003', name:'SS400 T3.2',   unit:'kg', qty:420, safe:400, status:'정상',  location:'A-02' },
  { key:4, code:'M-004', name:'볼트 M10×25', unit:'EA', qty:800, safe:1000,status:'부족',  location:'B-05' },
  { key:5, code:'M-005', name:'AL T2.3',      unit:'kg', qty:200, safe:100, status:'충분',  location:'C-01' },
  { key:6, code:'M-006', name:'용접봉 3.2φ',  unit:'kg', qty:45,  safe:60,  status:'부족',  location:'D-02' },
]

const statusTagProps = { '미확정':['warning','error'], '발주중':['processing','processing'], '완료':['success','success'], '재고충분':['success','cyan'] }
const stockTag = { 부족:'error', 정상:'success', 충분:'cyan' }

const mrpColumns = [
  { title:'자재명', dataIndex:'mat', key:'mat', render:v=><Text strong>{v}</Text> },
  { title:'단위', dataIndex:'unit', width:60, render:v=><Text type="secondary">{v}</Text> },
  { title:'총소요량', dataIndex:'gross', align:'right', sorter:(a,b)=>a.gross-b.gross, render:v=><Text>{v.toLocaleString()}</Text> },
  { title:'현재고', dataIndex:'stock', align:'right', sorter:(a,b)=>a.stock-b.stock, render:(v,r)=><Text strong style={{color:v<r.net?'#EF4444':'#10B981'}}>{v.toLocaleString()}</Text> },
  { title:'순소요량', dataIndex:'net', align:'right', sorter:(a,b)=>a.net-b.net, render:v=><Text strong style={{color:v>0?'#EF4444':'#94A3B8'}}>{v>0?v.toLocaleString():'—'}</Text> },
  { title:'조달기간', dataIndex:'leadtime', align:'center', width:90, render:v=><Text>{v}일</Text> },
  { title:'발주예정일', dataIndex:'orderDate', width:110 },
  { title:'입고필요일', dataIndex:'dueDate', width:110, render:(v,r)=><Text style={{color:r.status==='미확정'?'#EF4444':'',fontWeight:r.status==='미확정'?700:''}}>{v}</Text> },
  { title:'공급업체', dataIndex:'supplier', render:v=><Text type="secondary" style={{fontSize:12}}>{v}</Text> },
  { title:'상태', dataIndex:'status', width:90, filters:[{text:'미확정',value:'미확정'},{text:'발주중',value:'발주중'},{text:'완료',value:'완료'}], onFilter:(v,r)=>r.status===v,
    render:v=><Badge status={(statusTagProps[v]||['default','default'])[1]} text={v} /> },
  { title:'액션', key:'action', width:100,
    render:(_,r)=>r.status==='미확정'
      ? <Button size="small" type="primary" icon={<CheckOutlined />}>발주확정</Button>
      : <Button size="small" icon={<SyncOutlined />}>이력</Button> },
]

const stockColumns = [
  { title:'자재코드', dataIndex:'code', width:90, render:v=><Text strong style={{color:'#3B82F6',fontSize:12}}>{v}</Text> },
  { title:'자재명', dataIndex:'name', render:v=><Text strong>{v}</Text> },
  { title:'단위', dataIndex:'unit', width:60, render:v=><Text type="secondary">{v}</Text> },
  { title:'현재고', dataIndex:'qty', align:'right', sorter:(a,b)=>a.qty-b.qty, render:(v,r)=><Text strong style={{color:v<r.safe?'#EF4444':'#10B981'}}>{v.toLocaleString()}</Text> },
  { title:'안전재고', dataIndex:'safe', align:'right', render:v=><Text type="secondary">{v.toLocaleString()}</Text> },
  { title:'재고수준', key:'level', width:140,
    render:(_,r)=>{
      const pct = Math.min(Math.round((r.qty/r.safe)*100),150)
      return <Space size={4}><Progress percent={Math.min(pct,100)} size="small" style={{width:90}} showInfo={false} strokeColor={pct>=100?'#10B981':pct>=60?'#F59E0B':'#EF4444'} trailColor="#F1F5F9"/><Text style={{fontSize:11}}>{pct}%</Text></Space>
    },
  },
  { title:'위치', dataIndex:'location', width:80, render:v=><Text type="secondary">{v}</Text> },
  { title:'상태', dataIndex:'status', width:80, filters:[{text:'부족',value:'부족'},{text:'정상',value:'정상'},{text:'충분',value:'충분'}], onFilter:(v,r)=>r.status===v,
    render:v=><Tag color={stockTag[v]}>{v}</Tag> },
]

function MrpExplosion() {
  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>소요량 전개 (MRP)</Title>
        <Text type="secondary">생산계획 기반 자재 소요량 자동 산출 — 2026년 5월</Text>
      </div>
      <Alert type="warning" showIcon icon={<WarningOutlined />} message="발주 미확정 2건 (STS304 T1.6, SS400 T3.2) — 입고 필요일 D-7 이내입니다. 즉시 발주 확정 바랍니다." style={{marginBottom:16,borderRadius:10}} />
      <Row gutter={12} style={{marginBottom:16}}>
        {[{l:'소요 자재',v:'5종'},{l:'발주 필요',v:'3종'},{l:'미확정',v:'2건',c:'#EF4444'},{l:'발주완료',v:'1건'}].map((s,i)=>(
          <Col key={i} span={6}>
            <Card bordered={false} style={{borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}} styles={{body:{padding:'14px 16px'}}}>
              <Statistic title={<Text style={{fontSize:12,color:'#64748B'}}>{s.l}</Text>} value={s.v} valueStyle={{fontSize:20,fontWeight:800,color:s.c||'#0F172A'}} />
            </Card>
          </Col>
        ))}
      </Row>
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <Space style={{marginBottom:16}} size={8}>
          <Select defaultValue="monthly" style={{width:160}} options={[{label:'월간계획 기준',value:'monthly'},{label:'작업지시 기준',value:'wo'}]} />
          <Button type="primary" icon={<SyncOutlined />}>소요량 전개 실행</Button>
          <Button icon={<DownloadOutlined />}>Excel</Button>
        </Space>
        <Table columns={mrpColumns} dataSource={MRP_DATA} pagination={false} size="middle" scroll={{x:900}} />
      </Card>
    </div>
  )
}

function MrpStock() {
  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>재고현황</Title>
        <Text type="secondary">현재 자재 재고 및 안전재고 대비 현황</Text>
      </div>
      <Row gutter={12} style={{marginBottom:16}}>
        {[{l:'전체',v:6,c:'#3B82F6'},{l:'재고부족',v:3,c:'#EF4444'},{l:'정상',v:2,c:'#10B981'},{l:'충분',v:1,c:'#0D9488'}].map((s,i)=>(
          <Col key={i} span={6}>
            <Card bordered={false} style={{borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',borderTop:`3px solid ${s.c}`}} styles={{body:{padding:'14px 16px'}}}>
              <Statistic title={<Text style={{fontSize:12,color:'#64748B'}}>{s.l}</Text>} value={s.v} suffix="종" valueStyle={{fontSize:20,fontWeight:800,color:s.c}} />
            </Card>
          </Col>
        ))}
      </Row>
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <Space style={{marginBottom:16}} size={8}>
          <Select placeholder="상태" style={{width:110}} allowClear options={[{label:'부족',value:'부족'},{label:'정상',value:'정상'},{label:'충분',value:'충분'}]} />
          <Button type="primary" icon={<SearchOutlined />}>조회</Button>
        </Space>
        <Table columns={stockColumns} dataSource={STOCK_DATA} pagination={false} size="middle" />
      </Card>
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

export function MaterialPlan({ sub }) {
  if (!sub || sub==='mrpExplosion') return <MrpExplosion />
  if (sub==='mrpStock') return <MrpStock />
  return <PlaceholderPage title={sub} />
}
