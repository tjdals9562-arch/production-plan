import { useState, useEffect } from 'react'
import {
  Table, Card, Row, Col, Button, Space, Tag, Typography, Statistic,
  Drawer, Form, Input, InputNumber, AutoComplete, Divider, message, Spin, Empty, Badge,
} from 'antd'
import {
  fetchOrders, fetchProcessRoutes, upsertProcessRoute, fetchProcesses,
} from '../../api/db.js'
import {
  PlusOutlined, SettingOutlined, DeleteOutlined, CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography

// 주문PT에서 * 이전 코드만 추출 (예: DM09A029A*01 → DM09A029A)
const baseCode = (code) => (code || '').split('*')[0].trim()

function RouteDrawer({ order, open, onClose, onSaved }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [procOptions, setProcOptions] = useState([])

  useEffect(() => {
    if (!open) return
    fetchProcesses().then(list => {
      setProcOptions((list || []).filter(p => p.isActive).map(p => ({ value: p.name })))
    }).catch(() => {})
  }, [open])

  useEffect(() => {
    if (!open) return
    form.resetFields()
    form.setFieldsValue({
      productCode: order?.productCode || '',
      productName: order?.productName || '',
      spec:        order?.spec || '',
      processes:   [{ seq: 1, name: '', timePerEa: 0, setupTime: 0, workers: 1, equip: '—' }],
    })
  }, [open, order])

  const handleSave = async () => {
    try {
      const vals = await form.validateFields()
      setSaving(true)
      await upsertProcessRoute({
        ...vals,
        processes: (vals.processes || []).map((p, i) => ({ ...p, seq: i + 1 })),
      })
      message.success('공정 등록 완료')
      onSaved()
      onClose()
    } catch (e) {
      if (e?.errorFields) return
      message.error('저장 실패: ' + e.message)
    } finally { setSaving(false) }
  }

  return (
    <Drawer
      title={
        <Space>
          <SettingOutlined style={{ color: '#3B82F6' }} />
          <Text strong>공정 등록 — {order?.productCode}</Text>
        </Space>
      }
      open={open} onClose={onClose} width={700}
      footer={
        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" loading={saving} onClick={handleSave}
            style={{ background: '#10B981', borderColor: '#10B981' }}>저장</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" size="small">
        <Row gutter={12}>
          <Col span={7}>
            <Form.Item label="주문PT#" name="productCode" rules={[{ required: true, message: '필수' }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={11}>
            <Form.Item label="품명" name="productName" rules={[{ required: true, message: '필수' }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="규격" name="spec">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '4px 0 12px' }}>공정 단계</Divider>

        <div style={{ display: 'flex', gap: 4, marginBottom: 6, padding: '0 4px' }}>
          {['#', '공정명', '소요(분/EA)', '셋업(분)', '인원', '설비', ''].map((h, i) => (
            <div key={i} style={{ flex: [0.4, 2, 1.2, 1.2, 0.8, 2, 0.5][i], fontSize: 11, fontWeight: 600, color: '#64748B' }}>{h}</div>
          ))}
        </div>

        <Form.List name="processes">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, idx) => (
                <div key={field.key} style={{ display: 'flex', gap: 4, marginBottom: 6, alignItems: 'center' }}>
                  <div style={{ flex: 0.4, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>{idx + 1}</div>
                  <div style={{ flex: 2 }}>
                    <Form.Item name={[field.name, 'name']} noStyle rules={[{ required: true, message: '' }]}>
                      <AutoComplete
                        placeholder="공정명"
                        options={procOptions}
                        popupMatchSelectWidth={220}
                        filterOption={(input, opt) => opt.value.toLowerCase().includes(input.toLowerCase())}
                      />
                    </Form.Item>
                  </div>
                  <div style={{ flex: 1.2 }}><Form.Item name={[field.name, 'timePerEa']} noStyle><InputNumber min={0} step={1} style={{ width: '100%' }} placeholder="0" /></Form.Item></div>
                  <div style={{ flex: 1.2 }}><Form.Item name={[field.name, 'setupTime']} noStyle><InputNumber min={0} step={1} style={{ width: '100%' }} placeholder="0" /></Form.Item></div>
                  <div style={{ flex: 0.8 }}><Form.Item name={[field.name, 'workers']} noStyle><InputNumber min={1} style={{ width: '100%' }} placeholder="1" /></Form.Item></div>
                  <div style={{ flex: 2 }}><Form.Item name={[field.name, 'equip']} noStyle><Input placeholder="설비명" /></Form.Item></div>
                  <div style={{ flex: 0.5 }}>
                    <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                  </div>
                </div>
              ))}
              <Button type="dashed" block icon={<PlusOutlined />} style={{ marginTop: 4 }}
                onClick={() => add({ seq: fields.length + 1, name: '', timePerEa: 0, setupTime: 0, workers: 1, equip: '—' })}>
                공정 추가
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Drawer>
  )
}

export function UnregisteredProcess() {
  const [orders, setOrders] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOrder, setDrawerOrder] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [o, r] = await Promise.all([fetchOrders(), fetchProcessRoutes()])
      setOrders(o)
      setRoutes(r)
    } catch { message.error('데이터 로드 실패') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // 등록된 공정코드 셋 (baseCode 기준)
  const registeredCodes = new Set(routes.map(r => baseCode(r.productCode)))

  // 주문 중 공정 미등록 항목 (baseCode 중복 제거)
  const seen = new Set()
  const unregistered = orders.filter(o => {
    const k = baseCode(o.productCode)
    if (!k || registeredCodes.has(k)) return false
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  const openDrawer = (order) => {
    setDrawerOrder(order)
    setDrawerOpen(true)
  }

  const cell = { fontSize: 13, color: '#374151' }

  const cols = [
    {
      title: '제번', dataIndex: 'jobNo', width: 130, fixed: 'left',
      render: v => <span style={cell}>{v || '—'}</span>,
    },
    {
      title: '주문PT#', dataIndex: 'productCode', width: 150,
      render: v => <span style={cell}>{v || '—'}</span>,
    },
    {
      title: '품명', dataIndex: 'productName', width: 120, ellipsis: true,
      render: v => <span style={cell}>{v || '—'}</span>,
    },
    {
      title: '규격', dataIndex: 'spec', width: 130, ellipsis: true,
      render: v => <span style={cell}>{v || '—'}</span>,
    },
    {
      title: '주문수량', dataIndex: 'orderQty', width: 80, align: 'center',
      render: v => <span style={cell}>{v}</span>,
    },
    {
      title: '납기일', dataIndex: 'dueDate', width: 100,
      render: v => {
        if (!v) return <span style={cell}>—</span>
        const diff = Math.ceil((new Date(v) - new Date()) / 86400000)
        const color = diff < 0 ? '#EF4444' : diff <= 14 ? '#F59E0B' : cell.color
        return <span style={{ ...cell, color }}>{v}</span>
      },
    },
    {
      title: '상태', key: 'status', width: 80, align: 'center',
      render: () => <span style={{ ...cell, color: '#F59E0B' }}>미등록</span>,
    },
    {
      title: '', key: 'action', width: 90, fixed: 'right',
      render: (_, r) => (
        <Button size="small" onClick={() => openDrawer(r)}>공정 등록</Button>
      ),
    },
  ]

  const stats = [
    { label: '공정 미등록', value: unregistered.length + '종', color: '#EF4444', icon: <WarningOutlined /> },
    { label: '전체 수주 품목', value: [...new Set(orders.map(o => baseCode(o.productCode)).filter(Boolean))].length + '종', color: '#3B82F6' },
    { label: '공정 등록 완료', value: [...new Set(orders.map(o => baseCode(o.productCode)).filter(Boolean))].filter(k => registeredCodes.has(k)).length + '종', color: '#10B981', icon: <CheckCircleOutlined /> },
  ]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>공정 미등록 현황</Title>
        <Text type="secondary">수주 품목 중 공정경로가 등록되지 않은 항목 — 등록 후 자동 생산계획에 반영됩니다</Text>
      </div>

      <Row gutter={12} style={{ marginBottom: 20 }}>
        {stats.map((s, i) => (
          <Col key={i} span={8}>
            <Card bordered={false} style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderTop: `3px solid ${s.color}` }} styles={{ body: { padding: '12px 16px' } }}>
              <Statistic
                title={<Text style={{ fontSize: 12, color: '#64748B' }}>{s.label}</Text>}
                value={s.value}
                valueStyle={{ fontSize: 22, fontWeight: 800, color: s.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card bordered style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #CBD5E1' }}>
        <Spin spinning={loading}>
          <Table
            columns={cols}
            dataSource={unregistered.map((o, i) => ({ ...o, key: o.key || i }))}
            pagination={false}
            bordered size="small" scroll={{ x: 900 }}
            locale={{ emptyText: <Empty description={<Text type="secondary">공정 미등록 항목이 없습니다 ✅</Text>} /> }}
          />
        </Spin>
      </Card>

      <RouteDrawer
        order={drawerOrder}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={load}
      />
    </div>
  )
}
