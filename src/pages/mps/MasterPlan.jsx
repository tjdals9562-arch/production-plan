import { Table, Card, Row, Col, Statistic, Progress, Button, Space, Select, Typography, Tag, Tabs } from 'antd'
import { DownloadOutlined, PlusOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'

const { Title, Text } = Typography

const MONTH_PLAN = [
  { key:1, product:'EL-2000 카케이스',  customer:'현대엘리베이터', w1:4, w2:4, w3:4, w4:0,  total:12, done:10, rate:83  },
  { key:2, product:'HH-프레임 ASSY',    customer:'현대중공업',     w1:2, w2:3, w3:3, w4:0,  total:8,  done:5,  rate:62  },
  { key:3, product:'제관 판넬 A타입',   customer:'삼성중공업',     w1:5, w2:5, w3:5, w4:5,  total:20, done:20, rate:100 },
  { key:4, product:'구조체 브라켓 SET', customer:'두산에너빌리티', w1:4, w2:4, w3:4, w4:3,  total:15, done:8,  rate:53  },
  { key:5, product:'도어프레임 EL',     customer:'현대엘리베이터', w1:0, w2:2, w3:2, w4:2,  total:6,  done:0,  rate:0   },
]

const CAPACITY = [
  { name:'레이저 절단', load:92 },
  { name:'프레스/벤딩', load:78 },
  { name:'용접',        load:85 },
  { name:'도장',        load:61 },
  { name:'조립',        load:55 },
]

const wCell = v => v>0
  ? <Text strong style={{color:'#3B82F6'}}>{v}</Text>
  : <Text type="secondary">—</Text>

const monthColumns = [
  { title:'제품명', dataIndex:'product', key:'product', render:v=><Text strong>{v}</Text> },
  { title:'고객사', dataIndex:'customer', key:'customer', render:v=><Text type="secondary" style={{fontSize:12}}>{v}</Text> },
  { title:'1주 (5/1~7)',   dataIndex:'w1', align:'center', render:wCell },
  { title:'2주 (5/8~14)',  dataIndex:'w2', align:'center', render:wCell },
  { title:'3주 (5/15~21)', dataIndex:'w3', align:'center', render:wCell },
  { title:'4주 (5/22~31)', dataIndex:'w4', align:'center', render:wCell },
  { title:'합계', dataIndex:'total', align:'center', render:v=><Text strong>{v}</Text>,
    sorter:(a,b)=>a.total-b.total },
  { title:'실적', dataIndex:'done', align:'center', render:v=><Text strong style={{color:'#10B981'}}>{v}</Text> },
  { title:'달성률', dataIndex:'rate', width:130,
    sorter:(a,b)=>a.rate-b.rate,
    render:v=>(
      <Space size={4}>
        <Progress percent={v} size="small" style={{width:80}} showInfo={false}
          strokeColor={v===100?'#10B981':v>60?'#3B82F6':'#F59E0B'} trailColor="#F1F5F9" />
        <Text style={{fontSize:11,fontWeight:700,color:v===100?'#10B981':v>60?'#3B82F6':'#F59E0B'}}>{v}%</Text>
      </Space>
    ),
  },
]

const capOption = {
  tooltip: { trigger:'axis', axisPointer:{type:'shadow'}, formatter:p=>`${p[0].name}: <b>${p[0].value}%</b>` },
  grid: { left:10, right:60, top:8, bottom:8, containLabel:true },
  xAxis: { type:'value', max:100, axisLabel:{formatter:'{value}%',fontSize:11}, axisLine:{show:false}, axisTick:{show:false}, splitLine:{lineStyle:{color:'#F1F5F9'}} },
  yAxis: { type:'category', data:CAPACITY.map(c=>c.name), axisLabel:{fontSize:12,fontWeight:500}, axisLine:{show:false}, axisTick:{show:false} },
  series: [{
    type:'bar', data:CAPACITY.map(c=>c.load), barMaxWidth:20,
    itemStyle:{borderRadius:[0,4,4,0], color:p=>p.value>90?'#EF4444':p.value>75?'#F59E0B':'#10B981'},
    label:{show:true,position:'right',fontSize:11,fontWeight:700,formatter:'{c}%',
      color:p=>p.value>90?'#EF4444':p.value>75?'#F59E0B':'#10B981'},
    markLine:{data:[{xAxis:90},{xAxis:75}],symbol:'none',lineStyle:{color:'#94A3B8',type:'dashed'},label:{show:false}},
  }],
}

function MonthPlan() {
  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>월간 생산계획 (MPS)</Title>
        <Text type="secondary">2026년 5월 — 제품별 주차 생산계획</Text>
      </div>
      <Row gutter={12} style={{marginBottom:16}}>
        {[{l:'계획 품목',v:'5 품목'},{l:'계획 수량',v:'61 EA'},{l:'완료',v:'43 EA'},{l:'진행률',v:'70.5%'}].map((s,i)=>(
          <Col key={i} span={6}>
            <Card bordered={false} style={{borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}} styles={{body:{padding:'14px 16px'}}}>
              <Statistic title={<Text style={{fontSize:12,color:'#64748B'}}>{s.l}</Text>} value={s.v} valueStyle={{fontSize:20,fontWeight:800}} />
            </Card>
          </Col>
        ))}
      </Row>
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <Space style={{marginBottom:16}} size={8}>
          <Select defaultValue="2026-05" style={{width:130}} options={[{label:'2026년 5월',value:'2026-05'},{label:'2026년 6월',value:'2026-06'}]} />
          <Select placeholder="고객사" style={{width:150}} allowClear options={[{label:'현대엘리베이터',value:'현대엘리베이터'},{label:'현대중공업',value:'현대중공업'}]} />
          <Button type="primary">조회</Button>
          <Button icon={<DownloadOutlined />}>Excel</Button>
          <Button type="primary" icon={<PlusOutlined />} style={{marginLeft:'auto',background:'#10B981',borderColor:'#10B981'}}>계획 추가</Button>
        </Space>
        <Table columns={monthColumns} dataSource={MONTH_PLAN} pagination={false} size="small" bordered
          summary={data=>(
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}><Text strong>합계</Text></Table.Summary.Cell>
              {[data.reduce((s,r)=>s+r.w1,0),data.reduce((s,r)=>s+r.w2,0),data.reduce((s,r)=>s+r.w3,0),data.reduce((s,r)=>s+r.w4,0)].map((v,i)=>(
                <Table.Summary.Cell key={i} index={i+2} align="center"><Text strong>{v}</Text></Table.Summary.Cell>
              ))}
              <Table.Summary.Cell index={6} align="center"><Text strong>{data.reduce((s,r)=>s+r.total,0)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="center"><Text strong style={{color:'#10B981'}}>{data.reduce((s,r)=>s+r.done,0)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={8} />
            </Table.Summary.Row>
          )}
        />
      </Card>
    </div>
  )
}

function CapacityCheck() {
  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>생산능력 검토</Title>
        <Text type="secondary">공정별 부하 vs 능력 비교 분석</Text>
      </div>
      <Row gutter={[16,16]}>
        <Col span={14}>
          <Card title={<Text strong>공정별 부하율 (금주)</Text>} bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
            <ReactECharts option={capOption} style={{height:260}} />
            <div style={{marginTop:8,fontSize:12,color:'#94A3B8'}}>세로 점선: 주의(75%) / 위험(90%) 기준선</div>
          </Card>
        </Col>
        <Col span={10}>
          <Card title={<Text strong>공정별 현황 요약</Text>} bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',height:'100%'}}>
            {CAPACITY.map((c,i)=>(
              <div key={i} style={{marginBottom:i<CAPACITY.length-1?16:0}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <Text strong style={{fontSize:13}}>{c.name}</Text>
                  <Space>
                    <Text style={{fontSize:12}} type="secondary">부하</Text>
                    <Text strong style={{color:c.load>90?'#EF4444':c.load>75?'#F59E0B':'#10B981'}}>{c.load}%</Text>
                    <Tag color={c.load>90?'error':c.load>75?'warning':'success'} style={{margin:0}}>
                      {c.load>90?'과부하':c.load>75?'주의':'여유'}
                    </Tag>
                  </Space>
                </div>
                <Progress percent={c.load} size="small" showInfo={false}
                  strokeColor={c.load>90?'#EF4444':c.load>75?'#F59E0B':'#10B981'} trailColor="#F1F5F9" />
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

function PlaceholderPage({ title }) {
  return (
    <div>
      <div style={{marginBottom:20}}><Title level={4} style={{margin:0}}>{title}</Title><Text type="secondary">개발 예정</Text></div>
      <Card bordered={false} style={{borderRadius:12,textAlign:'center',padding:'48px 0'}}><Text type="secondary">🚧 개발 예정</Text></Card>
    </div>
  )
}

export function MasterPlan({ sub }) {
  if (!sub || sub==='mpsMonth') return <MonthPlan />
  if (sub==='mpsCapacity') return <CapacityCheck />
  return <PlaceholderPage title={sub} />
}
