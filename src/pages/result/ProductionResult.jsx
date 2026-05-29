import { Table, Card, Form, Row, Col, Input, Select, DatePicker, Button, Space, Tag, Typography, Statistic, Steps, Progress, Badge } from 'antd'
import { SaveOutlined, ClearOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const RESULTS = [
  { key:1, date:'2026-05-28', wo:'WO-2605-001', product:'EL-2000 카케이스', process:'용접',   worker:'김철수', plan:3, actual:3, defect:0, note:'' },
  { key:2, date:'2026-05-28', wo:'WO-2605-002', product:'HH-프레임 ASSY',   process:'레이저', worker:'이영희', plan:2, actual:2, defect:0, note:'' },
  { key:3, date:'2026-05-28', wo:'WO-2605-004', product:'구조체 브라켓 SET', process:'프레스', worker:'정수진', plan:3, actual:2, defect:1, note:'찍힘 불량 1EA → 재작업' },
  { key:4, date:'2026-05-27', wo:'WO-2605-001', product:'EL-2000 카케이스', process:'벤딩',   worker:'김철수', plan:3, actual:3, defect:0, note:'' },
  { key:5, date:'2026-05-27', wo:'WO-2605-003', product:'제관 판넬 A타입',  process:'도장',   worker:'박민준', plan:5, actual:5, defect:0, note:'' },
]

const DEFECTS = [
  { key:1, date:'2026-05-28', wo:'WO-2605-004', product:'구조체 브라켓', process:'프레스', type:'찍힘',  qty:1, action:'재작업',   status:'재작업중' },
  { key:2, date:'2026-05-25', wo:'WO-2605-002', product:'HH-프레임',    process:'용접',   type:'기공',  qty:1, action:'보수용접', status:'완료' },
]

const PROCESS_STEPS = [
  { wo:'WO-2605-001', product:'EL-2000 카케이스', steps:['레이저','벤딩','용접','도장','검사'], current:3, plan:12, done:10 },
  { wo:'WO-2605-002', product:'HH-프레임 ASSY',   steps:['레이저','용접','도장','조립','검사'], current:2, plan:8,  done:5  },
  { wo:'WO-2605-004', product:'구조체 브라켓 SET', steps:['레이저','프레스','용접','조립','검사'],current:2, plan:15, done:8 },
]

const resultColumns = [
  { title:'작업일', dataIndex:'date', width:100 },
  { title:'작업지시', dataIndex:'wo', width:120, render:v=><Text strong style={{color:'#3B82F6',fontSize:12}}>{v}</Text> },
  { title:'제품명', dataIndex:'product', render:v=><Text strong>{v}</Text> },
  { title:'공정', dataIndex:'process', width:90, render:v=><Tag>{v}</Tag> },
  { title:'작업자', dataIndex:'worker', width:80 },
  { title:'계획', dataIndex:'plan', width:60, align:'center' },
  { title:'실적', dataIndex:'actual', width:60, align:'center', render:v=><Text strong style={{color:'#10B981'}}>{v}</Text> },
  { title:'불량', dataIndex:'defect', width:60, align:'center', render:v=>v>0?<Text strong style={{color:'#EF4444'}}>{v}</Text>:<Text type="secondary">—</Text> },
  { title:'비고', dataIndex:'note', render:v=><Text type="secondary" style={{fontSize:12}}>{v||'—'}</Text> },
]

const defectColumns = [
  { title:'발생일', dataIndex:'date', width:100 },
  { title:'작업지시', dataIndex:'wo', width:120, render:v=><Text strong style={{color:'#3B82F6',fontSize:12}}>{v}</Text> },
  { title:'제품명', dataIndex:'product', render:v=><Text strong>{v}</Text> },
  { title:'공정', dataIndex:'process', width:80, render:v=><Tag>{v}</Tag> },
  { title:'불량유형', dataIndex:'type', width:90, render:v=><Text strong style={{color:'#EF4444'}}>{v}</Text> },
  { title:'수량', dataIndex:'qty', width:60, align:'center', render:v=><Text strong style={{color:'#EF4444'}}>{v}</Text> },
  { title:'조치내용', dataIndex:'action' },
  { title:'처리상태', dataIndex:'status', width:90, render:v=><Badge status={v==='완료'?'success':'warning'} text={v} /> },
]

function ResultInput() {
  const [form] = Form.useForm()
  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>실적 입력</Title>
        <Text type="secondary">공정별 생산실적 및 불량 입력</Text>
      </div>
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',marginBottom:16}}>
        <Title level={5} style={{marginBottom:16}}>실적 입력</Title>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}><Form.Item label="작업일" name="date" rules={[{required:true}]}><DatePicker style={{width:'100%'}} /></Form.Item></Col>
            <Col span={8}><Form.Item label="작업지시번호" name="wo" rules={[{required:true}]}><Select options={[{label:'WO-2605-001',value:'WO-2605-001'},{label:'WO-2605-002',value:'WO-2605-002'},{label:'WO-2605-004',value:'WO-2605-004'}]} /></Form.Item></Col>
            <Col span={8}><Form.Item label="공정" name="process" rules={[{required:true}]}><Select options={[{label:'레이저 절단',value:'레이저'},{label:'프레스/벤딩',value:'벤딩'},{label:'용접',value:'용접'},{label:'도장',value:'도장'},{label:'조립',value:'조립'}]} /></Form.Item></Col>
            <Col span={8}><Form.Item label="작업자" name="worker"><Input placeholder="작업자명" /></Form.Item></Col>
            <Col span={8}><Form.Item label="계획수량" name="plan"><Input type="number" placeholder="0" /></Form.Item></Col>
            <Col span={8}><Form.Item label="실적수량" name="actual" rules={[{required:true}]}><Input type="number" placeholder="0" /></Form.Item></Col>
            <Col span={8}><Form.Item label="불량수량" name="defect"><Input type="number" defaultValue={0} /></Form.Item></Col>
            <Col span={8}><Form.Item label="불량유형" name="defectType"><Select allowClear placeholder="없음" options={[{label:'찍힘',value:'찍힘'},{label:'기공',value:'기공'},{label:'치수불량',value:'치수불량'},{label:'도장불량',value:'도장불량'},{label:'기타',value:'기타'}]} /></Form.Item></Col>
            <Col span={8}><Form.Item label="비고" name="note"><Input placeholder="특이사항" /></Form.Item></Col>
          </Row>
          <Form.Item style={{textAlign:'right',marginBottom:0}}>
            <Space>
              <Button icon={<ClearOutlined />} onClick={()=>form.resetFields()}>초기화</Button>
              <Button type="primary" icon={<SaveOutlined />}>실적 저장</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <Title level={5} style={{marginBottom:12}}>최근 실적 목록</Title>
        <Table columns={resultColumns} dataSource={RESULTS} pagination={{pageSize:10}} size="middle" />
      </Card>
    </div>
  )
}

function ResultProcess() {
  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>공정 진도현황</Title>
        <Text type="secondary">작업지시별 공정별 진행 현황</Text>
      </div>
      {PROCESS_STEPS.map((p,i)=>{
        const pct = Math.round(p.done/p.plan*100)
        return (
          <Card key={i} bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <Space>
                <Text strong style={{color:'#3B82F6'}}>{p.wo}</Text>
                <Text strong>{p.product}</Text>
                <Text type="secondary" style={{fontSize:12}}>계획 {p.plan}EA</Text>
              </Space>
              <Space>
                <Text type="secondary" style={{fontSize:12}}>현재공정: <Text strong style={{color:'#F59E0B'}}>{p.steps[p.current]}</Text></Text>
                <Tag color={pct===100?'success':pct>60?'processing':'warning'}>{pct}%</Tag>
              </Space>
            </div>
            <Steps
              current={p.current}
              size="small"
              items={p.steps.map((s,j)=>({
                title: s,
                status: j<p.current?'finish':j===p.current?'process':'wait',
              }))}
              style={{marginBottom:12}}
            />
            <Progress percent={pct} strokeColor={pct===100?'#10B981':pct>60?'#3B82F6':'#F59E0B'} trailColor="#F1F5F9" size="small" />
          </Card>
        )
      })}
    </div>
  )
}

function DefectStatus() {
  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>불량 현황</Title>
        <Text type="secondary">공정별 불량 발생 및 처리 현황</Text>
      </div>
      <Row gutter={12} style={{marginBottom:16}}>
        {[{l:'이번달 불량',v:'2건',c:'#EF4444'},{l:'재작업중',v:'1건',c:'#F59E0B'},{l:'처리완료',v:'1건',c:'#10B981'},{l:'불량률',v:'0.8%',c:'#3B82F6'}].map((s,i)=>(
          <Col key={i} span={6}>
            <Card bordered={false} style={{borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',borderTop:`3px solid ${s.c}`}} styles={{body:{padding:'14px 16px'}}}>
              <Statistic title={<Text style={{fontSize:12,color:'#64748B'}}>{s.l}</Text>} value={s.v} valueStyle={{fontSize:20,fontWeight:800,color:s.c}} />
            </Card>
          </Col>
        ))}
      </Row>
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <Table columns={defectColumns} dataSource={DEFECTS} pagination={false} size="middle" />
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

export function ProductionResult({ sub }) {
  if (!sub || sub==='resultInput') return <ResultInput />
  if (sub==='resultProcess') return <ResultProcess />
  if (sub==='resultDefect') return <DefectStatus />
  return <PlaceholderPage title={sub} />
}
