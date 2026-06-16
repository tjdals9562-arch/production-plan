import { Row, Col, Card, Statistic, Table, Tag, Badge, Space, Typography } from 'antd'
import { WarningOutlined, CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'

const { Title, Text } = Typography

const KPI = [
  { label: '전체 주문 잔량', value: 48, suffix: '건', extra: '진행중 22 · 신규 15 · 완료 11', color: '#3B82F6', icon: <FileTextOutlined /> },
  { label: '납기 D-7 이내', value: 7,  suffix: '건', extra: '이 중 지연 3건', color: '#EF4444', icon: <WarningOutlined /> },
  { label: '공정 미등록',   value: 12, suffix: '종', extra: '등록 완료 36종', color: '#F59E0B', icon: <ClockCircleOutlined /> },
  { label: '이번달 완료',   value: 15, suffix: '건', extra: '목표 20건 대비 75%', color: '#10B981', icon: <CheckCircleOutlined /> },
]

const ddayOption = {
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => `${p[0].name}: <b>${p[0].value}건</b>` },
  grid: { left: 10, right: 20, top: 12, bottom: 8, containLabel: true },
  xAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#F1F5F9' } }, axisLabel: { fontSize: 11, color: '#94A3B8' } },
  yAxis: {
    type: 'category',
    data: ['여유 (D-30+)', 'D-30 이내', 'D-14 이내', 'D-7 이내', '지연'],
    axisLabel: { fontSize: 12, color: '#374151', fontWeight: 500 },
    axisLine: { show: false }, axisTick: { show: false },
  },
  series: [{
    type: 'bar', barMaxWidth: 22, barCategoryGap: '35%',
    data: [
      { value: 9,  itemStyle: { color: '#BFDBFE', borderRadius: [0, 4, 4, 0] } },
      { value: 18, itemStyle: { color: '#93C5FD', borderRadius: [0, 4, 4, 0] } },
      { value: 11, itemStyle: { color: '#F59E0B', borderRadius: [0, 4, 4, 0] } },
      { value: 7,  itemStyle: { color: '#F97316', borderRadius: [0, 4, 4, 0] } },
      { value: 3,  itemStyle: { color: '#EF4444', borderRadius: [0, 4, 4, 0] } },
    ],
    label: { show: true, position: 'right', fontSize: 11, fontWeight: 700, color: '#374151', formatter: '{c}건' },
  }],
}

const donutOption = {
  tooltip: { trigger: 'item', formatter: '{b}: {c}건 ({d}%)' },
  legend: { bottom: 0, icon: 'circle', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 12, color: '#374151' } },
  series: [{
    type: 'pie', radius: ['48%', '72%'], center: ['50%', '44%'],
    label: { show: false },
    data: [
      { value: 22, name: '진행중', itemStyle: { color: '#3B82F6' } },
      { value: 15, name: '신규',   itemStyle: { color: '#94A3B8' } },
      { value: 11, name: '완료',   itemStyle: { color: '#10B981' } },
    ],
  }],
}

const monthlyOption = {
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => `${p[0].axisValue}: <b>${p[0].value}건</b>` },
  grid: { left: 10, right: 10, top: 16, bottom: 8, containLabel: true },
  xAxis: {
    type: 'category', data: ['1월', '2월', '3월', '4월', '5월', '6월'],
    axisLine: { lineStyle: { color: '#E2E8F0' } }, axisLabel: { fontSize: 11, color: '#64748B' }, axisTick: { show: false },
  },
  yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#F1F5F9' } }, axisLabel: { fontSize: 11, color: '#64748B' } },
  series: [{
    type: 'bar', data: [31, 28, 35, 42, 48, 0], barMaxWidth: 28,
    itemStyle: { color: p => p.dataIndex === 5 ? '#E2E8F0' : '#3B82F6', borderRadius: [4, 4, 0, 0] },
    label: { show: true, position: 'top', fontSize: 10, color: '#64748B', formatter: p => p.value > 0 ? p.value : '' },
  }],
}

const urgentColumns = [
  { title: '제번',   dataIndex: 'jobNo',       width: 130, render: v => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v}</span> },
  { title: '품명',   dataIndex: 'productName', ellipsis: true },
  { title: '주문PT', dataIndex: 'productCode', width: 130, render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
  { title: '수량',   dataIndex: 'qty',         width: 60, align: 'center' },
  { title: '납기일', dataIndex: 'dueDate',     width: 100 },
  {
    title: 'D-day', dataIndex: 'dday', width: 80, align: 'center',
    render: v => {
      const color = v < 0 ? '#EF4444' : v <= 7 ? '#F97316' : '#F59E0B'
      const label = v < 0 ? `D+${Math.abs(v)}` : `D-${v}`
      return <Tag color={color} style={{ fontWeight: 700, fontSize: 12, margin: 0 }}>{label}</Tag>
    },
  },
  {
    title: '상태', dataIndex: 'status', width: 80, align: 'center',
    render: v => {
      const map = { '지연': 'error', '임박': 'warning', '진행': 'processing' }
      return <Badge status={map[v] || 'default'} text={v} />
    },
  },
]

const urgentData = [
  { key: 1, jobNo: 'DK26D-0312', productName: 'M/C BEAM & SILL BRACKET', productCode: 'DM09A029A', qty: 4, dueDate: '2026-05-30', dday: -2, status: '지연' },
  { key: 2, jobNo: 'DK26D-0405', productName: 'ROPE END BEAM BRACKET',   productCode: 'DM09A319A', qty: 2, dueDate: '2026-06-02', dday: 1,  status: '임박' },
  { key: 3, jobNo: 'DK26D-0501', productName: 'Y/C BEAM & HITCH BEAM',   productCode: 'DM09A029B', qty: 1, dueDate: '2026-06-03', dday: 2,  status: '임박' },
  { key: 4, jobNo: 'DK26D-0318', productName: 'M/C BEAM (DOWN)',          productCode: 'DM09A373A', qty: 3, dueDate: '2026-06-05', dday: 4,  status: '진행' },
  { key: 5, jobNo: 'DK26D-0422', productName: 'CAR FRAME ASSY',           productCode: 'DM09B102A', qty: 1, dueDate: '2026-06-06', dday: 5,  status: '진행' },
  { key: 6, jobNo: 'DK26D-0390', productName: 'GUIDE RAIL BRACKET',       productCode: 'DM09C055A', qty: 6, dueDate: '2026-06-07', dday: 6,  status: '진행' },
  { key: 7, jobNo: 'DK26D-0461', productName: 'COUNTER WEIGHT BRACKET',   productCode: 'DM09A210B', qty: 2, dueDate: '2026-06-08', dday: 7,  status: '진행' },
]

export function Dashboard({ onNav }) {
  const today = new Date()
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, color: '#0F172A' }}>생산계획 대시보드</Title>
        <Text type="secondary">{dateStr} 기준 — 수주 현황 및 납기 모니터링</Text>
      </div>

      {/* KPI */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {KPI.map((k, i) => (
          <Col key={i} xs={24} sm={12} xl={6}>
            <Card bordered={false}
              style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderTop: `3px solid ${k.color}` }}
              styles={{ body: { padding: '16px 20px' } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Text style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>{k.label}</Text>
                  <Statistic value={k.value} suffix={k.suffix}
                    valueStyle={{ fontSize: 30, fontWeight: 800, color: k.color, lineHeight: 1.2 }}
                    style={{ marginTop: 2 }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>{k.extra}</Text>
                </div>
                <span style={{ fontSize: 28, color: k.color, opacity: 0.25 }}>{k.icon}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 차트 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={10}>
          <Card title={<Text strong>납기 D-day 분포</Text>} bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', height: '100%' }}>
            <ReactECharts option={ddayOption} style={{ height: 210 }} />
          </Card>
        </Col>
        <Col xs={24} lg={7}>
          <Card title={<Text strong>생산 진행 현황</Text>} bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', height: '100%' }}>
            <ReactECharts option={donutOption} style={{ height: 210 }} />
          </Card>
        </Col>
        <Col xs={24} lg={7}>
          <Card title={<Text strong>월별 주문 추이</Text>} bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', height: '100%' }}>
            <ReactECharts option={monthlyOption} style={{ height: 210 }} />
          </Card>
        </Col>
      </Row>

      {/* 납기 임박 테이블 */}
      <Card title={
        <Space>
          <Text strong>납기 임박 현황</Text>
          <Tag color="error">지연 3건</Tag>
          <Tag color="warning">D-7 이내 7건</Tag>
        </Space>
      } bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <Table
          columns={urgentColumns}
          dataSource={urgentData}
          pagination={false}
          size="small"
          bordered
          scroll={{ x: 700 }}
          rowClassName={r => r.dday < 0 ? 'row-overdue' : r.dday <= 7 ? 'row-urgent' : ''}
        />
        <style>{`
          .row-overdue td { background: #FFF0F0 !important; }
          .row-urgent  td { background: #FFFBEB !important; }
        `}</style>
      </Card>
    </div>
  )
}
