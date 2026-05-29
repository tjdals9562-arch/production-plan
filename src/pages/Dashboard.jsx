import { Row, Col, Card, Statistic, Table, Tag, Progress, Alert, Badge, Space, Button, Typography, Divider } from 'antd'
import {
  ArrowUpOutlined, ArrowDownOutlined, ExclamationCircleOutlined,
  CheckCircleOutlined, ClockCircleOutlined, WarningOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'

const { Title, Text } = Typography

// ─── KPI 데이터 ───
const KPI = [
  { label:'이번달 수주잔량', value:48,   suffix:'건', extra:'금액 12.5억원', color:'#3B82F6', trend:+3,   bg:'#EFF6FF', icon:'📋' },
  { label:'금주 생산진행률',  value:73,   suffix:'%',  extra:'목표 85% 대비', color:'#F59E0B', trend:-12,  bg:'#FFFBEB', icon:'🏭' },
  { label:'납기 준수율 (월)', value:94.2, suffix:'%',  extra:'전월 91.8%',   color:'#10B981', trend:+2.4, bg:'#ECFDF5', icon:'✅' },
  { label:'설비 가동률',     value:87.3, suffix:'%',  extra:'가동 7 / 정지 1', color:'#8B5CF6', trend:+1.2, bg:'#F5F3FF', icon:'⚙️' },
]

// ─── 차트 옵션: 주차별 계획 vs 실적 ───
const planActualOption = {
  tooltip: { trigger:'axis', axisPointer:{ type:'shadow' }, formatter: params => params.map(p=>`${p.seriesName}: ${p.value}EA`).join('<br/>') },
  legend: { data:['계획','실적'], bottom:0, icon:'roundRect', itemWidth:12, itemHeight:12, textStyle:{fontSize:12} },
  grid: { left:10, right:10, top:16, bottom:32, containLabel:true },
  xAxis: {
    type:'category',
    data:['1주 (5/1~7)','2주 (5/8~14)','3주 (5/15~21)','4주 (5/22~31)'],
    axisLine:{lineStyle:{color:'#E2E8F0'}}, axisLabel:{fontSize:11,color:'#64748B'},
    axisTick:{show:false},
  },
  yAxis: { type:'value', name:'EA', axisLine:{show:false}, axisTick:{show:false}, splitLine:{lineStyle:{color:'#F1F5F9'}}, axisLabel:{fontSize:11,color:'#64748B'} },
  series: [
    { name:'계획', type:'bar', data:[22,20,18,10], barGap:'0%', barMaxWidth:28,
      itemStyle:{color:'#BAE6FD',borderRadius:[4,4,0,0]},
      label:{show:true,position:'top',fontSize:10,color:'#64748B',formatter:'{c}'},
    },
    { name:'실적', type:'bar', data:[22,18,7,0], barMaxWidth:28,
      itemStyle:{color:'#3B82F6',borderRadius:[4,4,0,0]},
      label:{show:true,position:'top',fontSize:10,color:'#3B82F6',formatter:'{c}'},
    },
  ],
}

// ─── 차트 옵션: 공정별 부하율 (가로 막대) ───
const processLoadOption = {
  tooltip: { trigger:'axis', axisPointer:{type:'shadow'}, formatter: p => `${p[0].name}: <b>${p[0].value}%</b>` },
  grid: { left:10, right:50, top:8, bottom:8, containLabel:true },
  xAxis: { type:'value', max:100, axisLabel:{formatter:'{value}%',fontSize:11,color:'#64748B'}, axisLine:{show:false}, axisTick:{show:false}, splitLine:{lineStyle:{color:'#F1F5F9'}} },
  yAxis: {
    type:'category',
    data:['검사/출하','조립','도장','용접','프레스/벤딩','레이저 절단'],
    axisLabel:{fontSize:12,color:'#374151',fontWeight:500}, axisLine:{show:false}, axisTick:{show:false},
  },
  series: [{
    type:'bar', data:[40,55,61,85,78,92],
    barMaxWidth:18, barCategoryGap:'40%',
    itemStyle:{
      borderRadius:[0,4,4,0],
      color: p => p.value>90 ? '#EF4444' : p.value>75 ? '#F59E0B' : '#10B981',
    },
    label:{ show:true, position:'right', fontSize:11, fontWeight:700, formatter:'{c}%',
      color: p => p.value>90 ? '#EF4444' : p.value>75 ? '#F59E0B' : '#10B981' },
    markLine:{
      data:[{xAxis:90,name:'위험선'},{xAxis:75,name:'주의선'}],
      symbol:'none',
      lineStyle:[{color:'#EF4444',type:'dashed',width:1},{color:'#F59E0B',type:'dashed',width:1}],
      label:{show:false},
    },
  }],
}

// ─── 차트 옵션: 납기 준수율 추이 ───
const deliveryRateOption = {
  tooltip: { trigger:'axis', formatter: p => `${p[0].axisValue}: <b>${p[0].value}%</b>` },
  grid: { left:10, right:10, top:16, bottom:8, containLabel:true },
  xAxis: { type:'category', data:['1월','2월','3월','4월','5월'], axisLine:{lineStyle:{color:'#E2E8F0'}}, axisLabel:{fontSize:11,color:'#64748B'}, axisTick:{show:false} },
  yAxis: { type:'value', min:86, max:100, axisLabel:{formatter:'{value}%',fontSize:11,color:'#64748B'}, axisLine:{show:false}, axisTick:{show:false}, splitLine:{lineStyle:{color:'#F1F5F9'}} },
  series: [{
    type:'line', data:[90.6,96.4,94.3,92.7,94.2],
    smooth:true,
    symbol:'circle', symbolSize:7,
    lineStyle:{color:'#3B82F6',width:2.5},
    itemStyle:{color:'#3B82F6',borderColor:'#fff',borderWidth:2},
    areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'rgba(59,130,246,0.2)'},{offset:1,color:'rgba(59,130,246,0)'}]}},
    markLine:{
      data:[{yAxis:95,name:'목표(95%)'}],
      symbol:'none',
      lineStyle:{color:'#10B981',type:'dashed',width:1.5},
      label:{formatter:'목표 95%',color:'#10B981',fontSize:11},
    },
  }],
}

// ─── 금주 작업지시 테이블 컬럼 ───
const woColumns = [
  { title:'작업지시', dataIndex:'wo', key:'wo', width:130,
    render: v => <Text strong style={{color:'#3B82F6',fontSize:12}}>{v}</Text> },
  { title:'제품명', dataIndex:'product', key:'product',
    render: v => <Text strong>{v}</Text> },
  { title:'고객사', dataIndex:'customer', key:'customer',
    render: v => <Text type="secondary" style={{fontSize:12}}>{v}</Text> },
  { title:'계획', dataIndex:'plan', key:'plan', width:60, align:'center' },
  { title:'완료', dataIndex:'done', key:'done', width:60, align:'center',
    render: v => <Text strong style={{color:'#10B981'}}>{v}</Text> },
  { title:'진행', dataIndex:'ing', key:'ing', width:60, align:'center',
    render: v => v > 0 ? <Text strong style={{color:'#F59E0B'}}>{v}</Text> : <Text type="secondary">—</Text> },
  { title:'진행률', dataIndex:'rate', key:'rate', width:130,
    render: v => (
      <Space>
        <Progress percent={v} size="small" style={{width:80,margin:0}}
          strokeColor={v===100?'#10B981':v>60?'#3B82F6':'#F59E0B'}
          trailColor="#F1F5F9" showInfo={false} />
        <Text style={{fontSize:11,fontWeight:700,color:v===100?'#10B981':v>60?'#3B82F6':'#F59E0B'}}>{v}%</Text>
      </Space>
    ),
  },
  { title:'상태', dataIndex:'status', key:'status',
    render: v => {
      const map = {green:['완료','success'],orange:['진행중','warning'],blue:['일부완료','processing'],gray:['대기','default']}
      const [label, color] = map[v] || ['—','default']
      return <Badge status={color} text={<Text style={{fontSize:12}}>{label}</Text>} />
    },
  },
]

const woData = [
  { key:1, wo:'WO-2605-001', product:'EL-2000 카케이스',  customer:'현대엘리베이터', plan:12, done:10, ing:1, wait:1, rate:83,  status:'orange' },
  { key:2, wo:'WO-2605-002', product:'HH-프레임 ASSY',    customer:'현대중공업',     plan:8,  done:5,  ing:2, wait:1, rate:62,  status:'orange' },
  { key:3, wo:'WO-2605-003', product:'제관 판넬 A타입',   customer:'삼성중공업',     plan:20, done:20, ing:0, wait:0, rate:100, status:'green'  },
  { key:4, wo:'WO-2605-004', product:'구조체 브라켓 SET', customer:'두산에너빌리티', plan:15, done:8,  ing:4, wait:3, rate:53,  status:'orange' },
  { key:5, wo:'WO-2605-005', product:'도어프레임 EL',     customer:'현대엘리베이터', plan:6,  done:0,  ing:0, wait:6, rate:0,   status:'gray'   },
]

const ALERTS = [
  { type:'error',   icon:<ExclamationCircleOutlined />, msg:'WO-2605-004 납기 위험 — 두산에너빌리티 잔여 7건, 납기 D-2' },
  { type:'warning', icon:<WarningOutlined />,            msg:'레이저 절단 설비 과부하 (92%) — 야근 또는 외주 검토 필요' },
  { type:'warning', icon:<WarningOutlined />,            msg:'MRP 발주 미확정 3건 — SS400 / STS304 납기 D-7 초과 위험' },
  { type:'info',    icon:<ClockCircleOutlined />,        msg:'신규 수주 등록 — WO-2606-001 현대엘리베이터 EL-2500' },
  { type:'success', icon:<CheckCircleOutlined />,        msg:'WO-2605-003 출하완료 — 삼성중공업 제관 판넬 A타입 20EA' },
]

export function Dashboard({ onNav }) {
  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <Title level={4} style={{ margin:0, color:'#0F172A' }}>생산계획 대시보드</Title>
        <Text type="secondary">전체 생산현황 및 핵심 KPI 모니터링 — 2026년 5월</Text>
      </div>

      {/* ─── KPI 카드 ─── */}
      <Row gutter={[16,16]} style={{ marginBottom:16 }}>
        {KPI.map((k,i) => (
          <Col key={i} xs={24} sm={12} xl={6}>
            <Card
              bordered={false}
              style={{ borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,0.07)', overflow:'hidden', borderTop:`3px solid ${k.color}` }}
              styles={{ body:{ padding:'18px 20px' } }}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <Text type="secondary" style={{ fontSize:12, fontWeight:600 }}>{k.label}</Text>
                  <Statistic
                    value={k.value}
                    suffix={k.suffix}
                    valueStyle={{ fontSize:28, fontWeight:800, color:'#0F172A', lineHeight:1.2 }}
                    style={{ marginTop:4 }}
                  />
                  <Space style={{ marginTop:4 }}>
                    {k.trend > 0
                      ? <Text style={{ fontSize:12, color:'#10B981', fontWeight:600 }}><ArrowUpOutlined /> +{k.trend}{k.suffix}</Text>
                      : <Text style={{ fontSize:12, color:'#EF4444', fontWeight:600 }}><ArrowDownOutlined /> {k.trend}{k.suffix}</Text>
                    }
                    <Text type="secondary" style={{ fontSize:12 }}>{k.extra}</Text>
                  </Space>
                </div>
                <span style={{ fontSize:32, opacity:0.15 }}>{k.icon}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ─── 차트 행 ─── */}
      <Row gutter={[16,16]} style={{ marginBottom:16 }}>
        <Col xs={24} lg={11}>
          <Card
            title={<Text strong>주차별 생산계획 vs 실적 (EA)</Text>}
            bordered={false}
            style={{ borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,0.07)', height:'100%' }}
          >
            <ReactECharts option={planActualOption} style={{ height:200 }} />
          </Card>
        </Col>
        <Col xs={24} lg={7}>
          <Card
            title={<Text strong>공정별 부하율</Text>}
            bordered={false}
            style={{ borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,0.07)', height:'100%' }}
            extra={<Button size="small" type="link" onClick={()=>onNav?.('crp','crpEquip')}>상세 →</Button>}
          >
            <ReactECharts option={processLoadOption} style={{ height:200 }} />
          </Card>
        </Col>
        <Col xs={24} lg={6}>
          <Card
            title={<Text strong>납기준수율 추이</Text>}
            bordered={false}
            style={{ borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,0.07)', height:'100%' }}
          >
            <ReactECharts option={deliveryRateOption} style={{ height:200 }} />
          </Card>
        </Col>
      </Row>

      {/* ─── 테이블 + 알림 ─── */}
      <Row gutter={[16,16]}>
        <Col xs={24} xl={16}>
          <Card
            title={<Text strong>금주 작업지시 현황</Text>}
            bordered={false}
            style={{ borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}
            extra={<Button size="small" onClick={()=>onNav?.('process','gantt')}>Gantt 보기</Button>}
          >
            <Table
              columns={woColumns}
              dataSource={woData}
              pagination={false}
              size="small"
              scroll={{ x:600 }}
            />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            title={<Text strong>알림 / 이슈</Text>}
            bordered={false}
            style={{ borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,0.07)', height:'100%' }}
          >
            <Space direction="vertical" style={{ width:'100%' }} size={8}>
              {ALERTS.map((a,i) => (
                <Alert key={i} type={a.type} message={a.msg} icon={a.icon} showIcon style={{ fontSize:12, padding:'8px 10px', borderRadius:8 }} />
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
