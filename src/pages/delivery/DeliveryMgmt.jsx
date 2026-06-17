import { Table, Card, Row, Col, Progress, Tag, Typography, Statistic, Space, Badge, Alert } from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'

const { Title, Text } = Typography

const DELIVERY = [
  { key:1, so:'SO-2605-003', product:'제관 판넬 A타입',   customer:'삼성중공업',     planDate:'2026-05-28', actualDate:'2026-05-28', plan:20, actual:20, gap:0,  status:'출하완료' },
  { key:2, so:'SO-2605-001', product:'EL-2000 카케이스',  customer:'현대엘리베이터', planDate:'2026-05-30', actualDate:'',           plan:12, actual:0,  gap:0,  status:'준비중' },
  { key:3, so:'SO-2605-002', product:'HH-프레임 ASSY',    customer:'현대중공업',     planDate:'2026-05-31', actualDate:'',           plan:8,  actual:0,  gap:0,  status:'생산중' },
  { key:4, so:'SO-2605-004', product:'구조체 브라켓 SET', customer:'두산에너빌리티', planDate:'2026-05-31', actualDate:'',           plan:15, actual:0,  gap:1,  status:'지연위험' },
  { key:5, so:'SO-2605-005', product:'도어프레임 EL',     customer:'현대엘리베이터', planDate:'2026-06-10', actualDate:'',           plan:6,  actual:0,  gap:0,  status:'대기' },
]

const RATE_HISTORY = [
  { key:1, month:'2026-01', total:32, ontime:29, rate:90.6 },
  { key:2, month:'2026-02', total:28, ontime:27, rate:96.4 },
  { key:3, month:'2026-03', total:35, ontime:33, rate:94.3 },
  { key:4, month:'2026-04', total:41, ontime:38, rate:92.7 },
  { key:5, month:'2026-05', total:48, ontime:null, rate:null },
]

const STATUS_BADGE = { 출하완료:'success', 준비중:'processing', 생산중:'processing', 지연위험:'error', 대기:'default' }

const rateLineOption = {
  tooltip:{ trigger:'axis', formatter:p=>`${p[0].axisValue}: <b>${p[0].value}%</b>` },
  grid:{ left:10,right:30,top:20,bottom:8,containLabel:true },
  xAxis:{ type:'category', data:['1월','2월','3월','4월'],axisLabel:{fontSize:11,color:'#64748B'},axisLine:{lineStyle:{color:'#E2E8F0'}},axisTick:{show:false} },
  yAxis:{ type:'value', min:87, max:100, axisLabel:{formatter:'{value}%',fontSize:11,color:'#64748B'},axisLine:{show:false},axisTick:{show:false},splitLine:{lineStyle:{color:'#F1F5F9'}} },
  series:[{
    type:'line', data:[90.6,96.4,94.3,92.7], smooth:true,
    symbol:'circle', symbolSize:8,
    lineStyle:{color:'#3B82F6',width:2.5},
    itemStyle:{color:'#3B82F6',borderColor:'#fff',borderWidth:2},
    areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'rgba(59,130,246,0.2)'},{offset:1,color:'rgba(59,130,246,0)'}]}},
    markLine:{data:[{yAxis:95}],symbol:'none',lineStyle:{color:'#10B981',type:'dashed',width:1.5},label:{formatter:'목표 95%',color:'#10B981',fontSize:11}},
  }],
}

const deliveryCols = [
  { title:'수주번호', dataIndex:'so', width:120, render:v=><Text strong style={{color:'#3B82F6',fontSize:12}}>{v}</Text> },
  { title:'제품명', dataIndex:'product', render:v=><Text strong>{v}</Text> },
  { title:'고객사', dataIndex:'customer', render:v=><Text type="secondary" style={{fontSize:12}}>{v}</Text> },
  { title:'계획수량', dataIndex:'plan', width:90, align:'center' },
  { title:'출하예정일', dataIndex:'planDate', width:110, render:(v,r)=><Text style={{color:r.status==='지연위험'?'#EF4444':'',fontWeight:r.status==='지연위험'?700:''}}>{v}</Text> },
  { title:'실출하일', dataIndex:'actualDate', width:110, render:v=>v?<Text style={{color:'#10B981'}}>{v}</Text>:<Text type="secondary">—</Text> },
  { title:'실출하수량', dataIndex:'actual', width:100, align:'center', render:v=>v>0?<Text strong style={{color:'#10B981'}}>{v}</Text>:<Text type="secondary">—</Text> },
  { title:'지연(일)', dataIndex:'gap', width:80, align:'center', render:v=>v>0?<Text strong style={{color:'#EF4444'}}>+{v}일</Text>:<Text type="secondary">—</Text> },
  { title:'상태', dataIndex:'status', width:90, render:v=><Badge status={STATUS_BADGE[v]} text={v} /> },
]

const rateCols = [
  { title:'월', dataIndex:'month', width:90 },
  { title:'총 수주건', dataIndex:'total', align:'center' },
  { title:'납기준수', dataIndex:'ontime', align:'center', render:v=>v!=null?<Text strong style={{color:'#10B981'}}>{v}</Text>:<Text type="secondary">—</Text> },
  { title:'지연', key:'late', align:'center', render:(_,r)=>r.ontime!=null?<Text strong style={{color:'#EF4444'}}>{r.total-r.ontime}</Text>:<Text type="secondary">—</Text> },
  { title:'준수율', dataIndex:'rate', width:160, render:v=>v!=null?(
    <Space size={4}>
      <Progress percent={v} size="small" style={{width:100}} showInfo={false} strokeColor={v>=95?'#10B981':v>=90?'#3B82F6':'#F59E0B'} trailColor="#F1F5F9"/>
      <Text strong style={{fontSize:12}}>{v}%</Text>
    </Space>
  ):<Tag color="processing">진행중</Tag> },
]

function DeliveryPlan() {
  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>출하 계획 / 실적</Title>
        <Text type="secondary">수주별 출하 일정 및 실적 관리 — 2026년 5월</Text>
      </div>
      <Alert type="error" showIcon icon={<WarningOutlined />} message="SO-2605-004 (두산에너빌리티 구조체 브라켓 SET) — 납기 D-2, 생산진행 53%. 즉시 대응 필요." style={{marginBottom:16,borderRadius:10}} />
      <Row gutter={12} style={{marginBottom:16}}>
        {[{l:'출하완료',v:1,c:'#10B981'},{l:'출하예정',v:2,c:'#3B82F6'},{l:'지연위험',v:1,c:'#EF4444'},{l:'대기',v:1,c:'#94A3B8'}].map((s,i)=>(
          <Col key={i} span={6}>
            <Card bordered={false} style={{borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',borderLeft:`4px solid ${s.c}`}} styles={{body:{padding:'12px 16px'}}}>
              <Text style={{fontSize:12,color:'#64748B',display:'block'}}>{s.l}</Text>
              <Text strong style={{fontSize:22,color:s.c}}>{s.v}건</Text>
            </Card>
          </Col>
        ))}
      </Row>
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <Table columns={deliveryCols} dataSource={DELIVERY} pagination={false} size="small" bordered scroll={{x:900}} />
      </Card>
    </div>
  )
}

function DeliveryRate() {
  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>납기 준수율</Title>
        <Text type="secondary">월별 납기 준수율 추이 분석</Text>
      </div>
      <Row gutter={[16,16]} style={{marginBottom:16}}>
        <Col span={8}>
          <Card title={<Text strong>납기준수율 추이</Text>} bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
            <ReactECharts option={rateLineOption} style={{height:200}} />
          </Card>
        </Col>
        <Col span={16}>
          <Row gutter={[12,12]}>
            {[{l:'전월 납기준수율',v:'92.7%',c:'#10B981'},{l:'이번달 (진행중)',v:'94.2%',c:'#3B82F6'},{l:'납기위험 건수',v:'1건',c:'#EF4444'},{l:'연간 평균',v:'93.5%',c:'#7C3AED'}].map((s,i)=>(
              <Col key={i} span={12}>
                <Card bordered={false} style={{borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',borderTop:`3px solid ${s.c}`}} styles={{body:{padding:'14px 16px'}}}>
                  <Statistic title={<Text style={{fontSize:12,color:'#64748B'}}>{s.l}</Text>} value={s.v} valueStyle={{fontSize:22,fontWeight:800,color:s.c}} />
                </Card>
              </Col>
            ))}
          </Row>
        </Col>
      </Row>
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <Table columns={rateCols} dataSource={RATE_HISTORY} pagination={false} size="small" bordered />
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

export function DeliveryMgmt({ sub }) {
  if (!sub || sub==='deliveryPlan') return <DeliveryPlan />
  if (sub==='deliveryRate') return <DeliveryRate />
  return <PlaceholderPage title={sub} />
}
