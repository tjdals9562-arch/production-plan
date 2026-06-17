import { Table, Card, Row, Col, Progress, Tag, Typography, Statistic, Space, Badge, Alert } from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'

const { Title, Text } = Typography

const EQUIP = [
  { key:1, id:'EQ-001', name:'파이버 레이저 #1', type:'레이저 절단', load:92, status:'가동', shift:'주/야', note:'과부하 — 야근 협의 필요' },
  { key:2, id:'EQ-002', name:'파이버 레이저 #2', type:'레이저 절단', load:88, status:'가동', shift:'주간', note:'' },
  { key:3, id:'EQ-003', name:'CNC 벤딩 #1',      type:'프레스/벤딩', load:78, status:'가동', shift:'주간', note:'' },
  { key:4, id:'EQ-004', name:'CNC 벤딩 #2',      type:'프레스/벤딩', load:72, status:'가동', shift:'주간', note:'' },
  { key:5, id:'EQ-005', name:'CO2 용접 라인 #1',  type:'용접',       load:85, status:'가동', shift:'주/야', note:'' },
  { key:6, id:'EQ-006', name:'CO2 용접 라인 #2',  type:'용접',       load:80, status:'가동', shift:'주간', note:'' },
  { key:7, id:'EQ-007', name:'도장 부스 #1',      type:'도장',       load:61, status:'가동', shift:'주간', note:'' },
  { key:8, id:'EQ-008', name:'자동화 조립라인',   type:'조립',       load:0,  status:'정지', shift:'—',    note:'정기 PM 중 (5/29~30)' },
]

const MANPOWER = [
  { key:1, team:'레이저팀', headcount:6, planHour:48, actualHour:44, overtime:4,  load:92 },
  { key:2, team:'벤딩팀',  headcount:4, planHour:32, actualHour:25, overtime:0,  load:78 },
  { key:3, team:'용접팀',  headcount:8, planHour:64, actualHour:54, overtime:8,  load:85 },
  { key:4, team:'도장팀',  headcount:3, planHour:24, actualHour:15, overtime:0,  load:61 },
  { key:5, team:'조립팀',  headcount:5, planHour:40, actualHour:22, overtime:0,  load:55 },
]

const radarOption = {
  tooltip: {},
  radar: {
    indicator:[{name:'레이저',max:100},{name:'벤딩',max:100},{name:'용접',max:100},{name:'도장',max:100},{name:'조립',max:100}],
    splitArea:{areaStyle:{color:['rgba(241,245,249,0.5)','rgba(255,255,255,0)']}},
    axisLine:{lineStyle:{color:'#E2E8F0'}},
    splitLine:{lineStyle:{color:'#E2E8F0'}},
    axisLabel:{fontSize:11,color:'#64748B'},
  },
  series:[{
    type:'radar',
    data:[
      {value:[90,75,82,61,55],name:'부하율(%)',
        areaStyle:{color:'rgba(59,130,246,0.15)'},
        lineStyle:{color:'#3B82F6',width:2},
        itemStyle:{color:'#3B82F6'}},
    ],
  }],
}

const equipColumns = [
  { title:'설비코드', dataIndex:'id', width:90, render:v=><Text strong style={{color:'#3B82F6',fontSize:12}}>{v}</Text> },
  { title:'설비명', dataIndex:'name', render:v=><Text strong>{v}</Text> },
  { title:'공정유형', dataIndex:'type', render:v=><Tag>{v}</Tag> },
  { title:'가동상태', dataIndex:'status', width:90,
    filters:[{text:'가동',value:'가동'},{text:'정지',value:'정지'}],onFilter:(v,r)=>r.status===v,
    render:v=><Badge status={v==='가동'?'success':'error'} text={v} /> },
  { title:'운영시프트', dataIndex:'shift', width:100, align:'center' },
  { title:'부하율', dataIndex:'load', width:160, sorter:(a,b)=>a.load-b.load,
    render:(v,r)=>r.status==='정지' ? <Text type="secondary">—</Text> : (
      <Space size={4}>
        <Progress percent={v} size="small" style={{width:100}} showInfo={false}
          strokeColor={v>90?'#EF4444':v>75?'#F59E0B':'#10B981'} trailColor="#F1F5F9" />
        <Text strong style={{fontSize:11,color:v>90?'#EF4444':v>75?'#F59E0B':'#10B981'}}>{v}%</Text>
      </Space>
    ),
  },
  { title:'비고', dataIndex:'note', render:v=><Text type="secondary" style={{fontSize:12,color:v&&v.includes('과부하')?'#EF4444':''}}>{v||'—'}</Text> },
]

const mpColumns = [
  { title:'팀명', dataIndex:'team', render:v=><Text strong>{v}</Text> },
  { title:'인원(명)', dataIndex:'headcount', align:'center', render:v=><Text>{v}</Text> },
  { title:'계획공수(h)', dataIndex:'planHour', align:'right' },
  { title:'실투입공수(h)', dataIndex:'actualHour', align:'right', render:v=><Text strong style={{color:'#3B82F6'}}>{v}</Text> },
  { title:'잔업(h)', dataIndex:'overtime', align:'center', render:v=>v>0?<Text strong style={{color:'#EF4444'}}>{v}</Text>:<Text type="secondary">—</Text> },
  { title:'부하율', dataIndex:'load', width:160, sorter:(a,b)=>a.load-b.load,
    render:v=>(
      <Space size={4}>
        <Progress percent={v} size="small" style={{width:100}} showInfo={false}
          strokeColor={v>90?'#EF4444':v>75?'#F59E0B':'#10B981'} trailColor="#F1F5F9" />
        <Text strong style={{fontSize:11,color:v>90?'#EF4444':v>75?'#F59E0B':'#10B981'}}>{v}%</Text>
      </Space>
    ),
  },
]

function EquipLoad() {
  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>설비 부하현황</Title>
        <Text type="secondary">공정별 설비 가동률 및 부하 분석</Text>
      </div>
      <Alert type="error" showIcon icon={<WarningOutlined />} message="파이버 레이저 #1 (EQ-001) — 부하율 92% 과부하. 야근 편성 또는 외주 검토를 권고합니다." style={{marginBottom:16,borderRadius:10}} />
      <Row gutter={12} style={{marginBottom:16}}>
        {[{l:'총 설비',v:'8대',c:'#3B82F6'},{l:'가동중',v:'7대',c:'#10B981'},{l:'정지',v:'1대',c:'#F59E0B'},{l:'과부하',v:'2대',c:'#EF4444'}].map((s,i)=>(
          <Col key={i} span={6}>
            <Card bordered={false} style={{borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',borderTop:`3px solid ${s.c}`}} styles={{body:{padding:'14px 16px'}}}>
              <Statistic title={<Text style={{fontSize:12,color:'#64748B'}}>{s.l}</Text>} value={s.v} valueStyle={{fontSize:20,fontWeight:800,color:s.c}} />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16,16]}>
        <Col span={17}>
          <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
            <Table columns={equipColumns} dataSource={EQUIP} pagination={false} size="small" bordered
              rowClassName={r=>r.load>90?'ant-table-row-danger':''} />
          </Card>
        </Col>
        <Col span={7}>
          <Card title={<Text strong>공정별 부하율 레이더</Text>} bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',height:'100%'}}>
            <ReactECharts option={radarOption} style={{height:260}} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

function ManpowerLoad() {
  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>인력 부하현황</Title>
        <Text type="secondary">팀별 인력 투입 현황 및 잔업 분석</Text>
      </div>
      <Row gutter={12} style={{marginBottom:16}}>
        {[{l:'총 인원',v:'26명',c:'#3B82F6'},{l:'잔업 발생팀',v:'2팀',c:'#EF4444'},{l:'평균 부하율',v:'74%',c:'#F59E0B'},{l:'총 잔업공수',v:'12h',c:'#EF4444'}].map((s,i)=>(
          <Col key={i} span={6}>
            <Card bordered={false} style={{borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}} styles={{body:{padding:'14px 16px'}}}>
              <Statistic title={<Text style={{fontSize:12,color:'#64748B'}}>{s.l}</Text>} value={s.v} valueStyle={{fontSize:20,fontWeight:800,color:s.c}} />
            </Card>
          </Col>
        ))}
      </Row>
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <Table columns={mpColumns} dataSource={MANPOWER} pagination={false} size="small" bordered />
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

export function CapacityPlan({ sub }) {
  if (!sub || sub==='crpEquip') return <EquipLoad />
  if (sub==='crpManpower') return <ManpowerLoad />
  return <PlaceholderPage title={sub} />
}
