import { Table, Card, Row, Col, Progress, Tag, Typography, Statistic, Space, Badge } from 'antd'
import { DownloadOutlined, FilePdfOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { Button } from 'antd'

const { Title, Text } = Typography

const KPI_ITEMS = [
  { key:1, label:'납기준수율',    value:94.2, target:95,  unit:'%',  status:'주의' },
  { key:2, label:'생산진행률',    value:73.0, target:85,  unit:'%',  status:'미달' },
  { key:3, label:'설비가동률',    value:87.3, target:90,  unit:'%',  status:'주의' },
  { key:4, label:'불량률',        value:0.8,  target:1.0, unit:'%',  status:'달성' },
  { key:5, label:'인력가동률',    value:74.2, target:80,  unit:'%',  status:'주의' },
  { key:6, label:'원가절감율',    value:2.1,  target:3.0, unit:'%',  status:'주의' },
]

const PROD_ANALYSIS = [
  { key:1, team:'레이저팀', output:320, plan:350, rate:91.4, defect:0, workHour:264 },
  { key:2, team:'벤딩팀',  output:180, plan:200, rate:90.0, defect:0, workHour:160 },
  { key:3, team:'용접팀',  output:210, plan:250, rate:84.0, defect:1, workHour:320 },
  { key:4, team:'도장팀',  output:150, plan:160, rate:93.8, defect:0, workHour:120 },
  { key:5, team:'조립팀',  output:90,  plan:100, rate:90.0, defect:1, workHour:160 },
]

const STATUS_COLOR = { 달성:'success', 주의:'warning', 미달:'error' }

const kpiBarOption = {
  tooltip:{ trigger:'axis' },
  legend:{ data:['실적','목표'], bottom:0, icon:'roundRect', itemWidth:12, itemHeight:12, textStyle:{fontSize:11} },
  grid:{ left:10, right:10, top:16, bottom:32, containLabel:true },
  xAxis:{ type:'category', data:KPI_ITEMS.map(k=>k.label), axisLabel:{fontSize:10,color:'#64748B',rotate:10}, axisLine:{lineStyle:{color:'#E2E8F0'}}, axisTick:{show:false} },
  yAxis:{ type:'value', max:100, axisLabel:{formatter:'{value}%',fontSize:11}, axisLine:{show:false}, axisTick:{show:false}, splitLine:{lineStyle:{color:'#F1F5F9'}} },
  series:[
    { name:'목표', type:'bar', data:KPI_ITEMS.map(k=>k.target), barGap:'0%', barMaxWidth:22, itemStyle:{color:'#BAE6FD',borderRadius:[4,4,0,0]} },
    { name:'실적', type:'bar', data:KPI_ITEMS.map(k=>k.value), barMaxWidth:22,
      itemStyle:{borderRadius:[4,4,0,0], color:p=>KPI_ITEMS[p.dataIndex].status==='달성'?'#10B981':KPI_ITEMS[p.dataIndex].status==='주의'?'#F59E0B':'#EF4444'},
      label:{show:true,position:'top',fontSize:10,formatter:p=>`${p.value}%`},
    },
  ],
}

const prodGaugeOption = {
  series: PROD_ANALYSIS.map((p,i)=>({
    type:'gauge', center:[`${10+i*19}%`,'60%'], radius:'35%',
    min:0, max:100, splitNumber:4,
    axisLine:{ lineStyle:{width:8, color:[[p.rate/100,'#3B82F6'],[1,'#F1F5F9']]} },
    axisTick:{show:false}, splitLine:{show:false}, axisLabel:{show:false},
    pointer:{length:'60%',width:4},
    detail:{fontSize:12,fontWeight:700,formatter:`${p.rate}%`,offsetCenter:[0,'30%']},
    title:{fontSize:11,offsetCenter:[0,'80%'],color:'#64748B'},
    data:[{value:p.rate,name:p.team}],
  })),
}

const kpiColumns = [
  { title:'KPI 항목', dataIndex:'label', render:v=><Text strong>{v}</Text> },
  { title:'목표', dataIndex:'target', align:'right', render:(v,r)=><Text>{v}{r.unit}</Text> },
  { title:'실적', dataIndex:'value', align:'right', render:(v,r)=><Text strong>{v}{r.unit}</Text> },
  { title:'갭', key:'gap', align:'right', render:(_,r)=>{
    const gap = (r.value-r.target).toFixed(1)
    return <Text strong style={{color:parseFloat(gap)>=0?'#10B981':'#EF4444'}}>{parseFloat(gap)>=0?'+':''}{gap}{r.unit}</Text>
  }},
  { title:'달성도', key:'ach', width:160, render:(_,r)=>(
    <Space size={4}>
      <Progress percent={Math.round(r.value/r.target*100)} size="small" style={{width:100}} showInfo={false}
        strokeColor={r.status==='달성'?'#10B981':r.status==='주의'?'#F59E0B':'#EF4444'} trailColor="#F1F5F9"/>
      <Text style={{fontSize:11}}>{Math.round(r.value/r.target*100)}%</Text>
    </Space>
  )},
  { title:'평가', dataIndex:'status', width:80, render:v=><Badge status={STATUS_COLOR[v]} text={v} /> },
]

const prodColumns = [
  { title:'팀명', dataIndex:'team', render:v=><Text strong>{v}</Text> },
  { title:'실적(EA)', dataIndex:'output', align:'right', sorter:(a,b)=>a.output-b.output, render:v=><Text strong>{v}</Text> },
  { title:'계획(EA)', dataIndex:'plan', align:'right', render:v=><Text type="secondary">{v}</Text> },
  { title:'달성률', dataIndex:'rate', width:150, sorter:(a,b)=>a.rate-b.rate, render:v=>(
    <Space size={4}>
      <Progress percent={v} size="small" style={{width:90}} showInfo={false} strokeColor={v>=95?'#10B981':v>=88?'#3B82F6':'#F59E0B'} trailColor="#F1F5F9"/>
      <Text strong style={{fontSize:11}}>{v}%</Text>
    </Space>
  )},
  { title:'불량(건)', dataIndex:'defect', align:'center', render:v=>v>0?<Text strong style={{color:'#EF4444'}}>{v}</Text>:<Text type="secondary">—</Text> },
  { title:'투입공수(h)', dataIndex:'workHour', align:'right' },
  { title:'생산성(EA/h)', key:'prod', align:'right', sorter:(a,b)=>a.output/a.workHour-b.output/b.workHour,
    render:(_,r)=><Text strong style={{color:'#3B82F6'}}>{(r.output/r.workHour).toFixed(2)}</Text> },
]

function KpiReport() {
  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>KPI 리포트</Title>
        <Text type="secondary">2026년 5월 — 핵심성과지표 목표 vs 실적 분석</Text>
      </div>
      <Row gutter={12} style={{marginBottom:16}}>
        {[{l:'달성',v:1,c:'#10B981'},{l:'주의',v:4,c:'#F59E0B'},{l:'미달',v:1,c:'#EF4444'},{l:'전체 KPI',v:6,c:'#3B82F6'}].map((s,i)=>(
          <Col key={i} span={6}>
            <Card bordered={false} style={{borderRadius:10,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',borderTop:`3px solid ${s.c}`}} styles={{body:{padding:'14px 16px'}}}>
              <Statistic title={<Text style={{fontSize:12,color:'#64748B'}}>{s.l}</Text>} value={s.v} suffix="항목" valueStyle={{fontSize:20,fontWeight:800,color:s.c}} />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16,16]}>
        <Col span={14}>
          <Card title={<Text strong>KPI 목표 vs 실적</Text>} bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}
            extra={<Space><Button size="small" icon={<FilePdfOutlined />}>PDF</Button><Button size="small" icon={<DownloadOutlined />}>Excel</Button></Space>}>
            <ReactECharts option={kpiBarOption} style={{height:240}} />
          </Card>
        </Col>
        <Col span={10}>
          <Card title={<Text strong>KPI 상세 목록</Text>} bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',height:'100%'}}>
            <Table columns={kpiColumns} dataSource={KPI_ITEMS} pagination={false} size="small" />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

function ProductivityAnalysis() {
  return (
    <div>
      <div style={{marginBottom:20}}>
        <Title level={4} style={{margin:0}}>생산성 분석</Title>
        <Text type="secondary">팀/공정별 생산성 및 효율 분석 — 2026년 5월</Text>
      </div>
      <Card title={<Text strong>팀별 달성률 Gauge</Text>} bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',marginBottom:16}}>
        <ReactECharts option={prodGaugeOption} style={{height:180}} />
      </Card>
      <Card bordered={false} style={{borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
        <Title level={5} style={{marginBottom:12}}>팀별 생산성 상세</Title>
        <Table columns={prodColumns} dataSource={PROD_ANALYSIS} pagination={false} size="small" bordered />
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

export function Reports({ sub }) {
  if (!sub || sub==='reportKPI') return <KpiReport />
  if (sub==='reportProd') return <ProductivityAnalysis />
  return <PlaceholderPage title={sub} />
}
