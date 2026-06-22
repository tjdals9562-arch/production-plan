import { useState, useEffect, useCallback } from 'react'
import {
  Card, Table, Button, Space, Tag, Typography, Row, Col, Statistic,
  Modal, Form, Select, Switch, Input, Popconfirm, Badge, message, Empty,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import {
  fetchProcesses, fetchWorkers, fetchEquipment,
  fetchScheduleRules, saveScheduleRule, deleteScheduleRule as deleteRuleFromDB,
} from '../../api/db.js'

const { Title, Text } = Typography

const DAYS_KR = ['월','화','수','목','금','토','일']
const STORAGE_KEY = 'pp_schedule_rules'

const RULE_TYPES = [
  { value: 'process_day',  label: '공정 요일 제한',   desc: '특정 공정을 특정 요일에만 작업 가능',       color: '#3B82F6' },
  { value: 'worker_fix',   label: '작업자 공정 고정',  desc: '특정 작업자를 특정 요일에 특정 공정 고정',   color: '#10B981' },
  { value: 'equip_block',  label: '설비 사용불가 요일', desc: '특정 설비를 특정 요일에 사용불가 처리',      color: '#F59E0B' },
  { value: 'process_equip',label: '공정 설비 지정',    desc: '특정 공정은 반드시 특정 설비 사용',          color: '#7C3AED' },
]

function loadRulesFromStorage() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function saveRulesToStorage(rules) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
}

export async function loadScheduleRules() {
  try {
    const rules = await fetchScheduleRules()
    if (rules.length) {
      saveRulesToStorage(rules)
      return rules.filter(r => r.isActive)
    }
  } catch {}
  return loadRulesFromStorage().filter(r => r.isActive)
}

function ruleToSentence(r) {
  const type = RULE_TYPES.find(t => t.value === r.ruleType)
  const days = (r.days || []).join(', ')
  switch (r.ruleType) {
    case 'process_day':
      return <span><Text strong style={{color:'#3B82F6'}}>[{r.targetName}]</Text> 공정은 <Text strong>[{days}]</Text> 요일에만 작업 가능</span>
    case 'worker_fix':
      return <span><Text strong style={{color:'#10B981'}}>[{r.targetName}]</Text> 작업자는 <Text strong>[{days}]</Text>에 <Text strong style={{color:'#7C3AED'}}>[{r.processName}]</Text> 고정</span>
    case 'equip_block':
      return <span><Text strong style={{color:'#F59E0B'}}>[{r.targetName}]</Text> 설비는 <Text strong>[{days}]</Text> 사용불가</span>
    case 'process_equip':
      return <span><Text strong style={{color:'#7C3AED'}}>[{r.targetName}]</Text> 공정은 반드시 <Text strong>[{r.equipName}]</Text> 설비 사용</span>
    default:
      return <span>{type?.label || r.ruleType}</span>
  }
}

export function ScheduleRules() {
  const [rules, setRules] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editRule, setEditRule] = useState(null)
  const [form] = Form.useForm()
  const ruleType = Form.useWatch('ruleType', form)

  const [processOpts, setProcessOpts] = useState([])
  const [workerOpts, setWorkerOpts] = useState([])
  const [equipOpts, setEquipOpts] = useState([])
  const [useDB, setUseDB] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadAll = async () => {
    setLoading(true)
    try {
      const dbRules = await fetchScheduleRules()
      setRules(dbRules)
      saveRulesToStorage(dbRules)
      setUseDB(true)
    } catch {
      setRules(loadRulesFromStorage())
      setUseDB(false)
    }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    Promise.all([
      fetchProcesses().catch(() => []),
      fetchWorkers().catch(() => []),
      fetchEquipment().catch(() => []),
    ]).then(([procs, workers, equips]) => {
      setProcessOpts(procs.filter(p => p.isActive).map(p => ({ label: p.name, value: p.name })))
      setWorkerOpts(workers.map(w => ({ label: w.name, value: w.name })))
      setEquipOpts(equips.map(e => ({ label: e.name, value: e.name })))
    })
  }, [])

  const persist = useCallback((next) => {
    setRules(next)
    saveRulesToStorage(next)
  }, [])

  const openEdit = (rule = null) => {
    setEditRule(rule)
    setModalOpen(true)
    setTimeout(() => {
      form.resetFields()
      if (rule) {
        form.setFieldsValue({ ...rule })
      } else {
        form.setFieldsValue({ ruleType: 'process_day', days: ['월','화','수','목','금'], isActive: true })
      }
    }, 0)
  }

  const handleSave = async () => {
    let vals
    try { vals = await form.validateFields() } catch { return }

    try {
      if (useDB) {
        const merged = editRule ? { ...editRule, ...vals } : vals
        await saveScheduleRule(merged, !editRule)
        await loadAll()
      } else {
        if (editRule) {
          persist(rules.map(r => r.id === editRule.id ? { ...r, ...vals } : r))
        } else {
          persist([...rules, { ...vals, id: Date.now().toString() }])
        }
      }
    } catch (e) {
      if (editRule) {
        persist(rules.map(r => r.id === editRule.id ? { ...r, ...vals } : r))
      } else {
        persist([...rules, { ...vals, id: Date.now().toString() }])
      }
    }
    setModalOpen(false)
    message.success('규칙이 저장되었습니다.')
  }

  const handleDelete = async (id) => {
    try {
      if (useDB) { await deleteRuleFromDB(id); await loadAll() }
      else { persist(rules.filter(r => r.id !== id)) }
    } catch { persist(rules.filter(r => r.id !== id)) }
    message.success('삭제되었습니다.')
  }

  const handleToggle = async (id, checked) => {
    const updated = rules.map(r => r.id === id ? { ...r, isActive: checked } : r)
    persist(updated)
    try {
      if (useDB) {
        const rule = updated.find(r => r.id === id)
        if (rule) await saveScheduleRule(rule, false)
      }
    } catch {}
  }

  const targetOptions = () => {
    switch (ruleType) {
      case 'process_day':   return processOpts
      case 'worker_fix':    return workerOpts
      case 'equip_block':   return equipOpts
      case 'process_equip': return processOpts
      default:              return []
    }
  }

  const targetLabel = () => {
    switch (ruleType) {
      case 'process_day':   return '대상 공정'
      case 'worker_fix':    return '대상 작업자'
      case 'equip_block':   return '대상 설비'
      case 'process_equip': return '대상 공정'
      default:              return '대상'
    }
  }

  const cols = [
    { title: '규칙', key: 'sentence', render: (_, r) => (
      <div>
        <div style={{ fontSize: 13 }}>{ruleToSentence(r)}</div>
        {r.note && <Text type="secondary" style={{ fontSize: 11 }}>{r.note}</Text>}
      </div>
    )},
    { title: '유형', dataIndex: 'ruleType', width: 140,
      render: v => {
        const t = RULE_TYPES.find(x => x.value === v)
        return <Tag color={v === 'process_day' ? 'blue' : v === 'worker_fix' ? 'green' : v === 'equip_block' ? 'orange' : 'purple'}>{t?.label || v}</Tag>
      },
      filters: RULE_TYPES.map(t => ({ text: t.label, value: t.value })),
      onFilter: (v, r) => r.ruleType === v,
    },
    { title: '활성', dataIndex: 'isActive', width: 70, align: 'center',
      render: (v, r) => <Switch size="small" checked={v} onChange={c => handleToggle(r.id, c)} /> },
    { title: '', key: 'act', width: 80, fixed: 'right',
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="삭제할까요?" okText="삭제" cancelText="취소" okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const activeCount = rules.filter(r => r.isActive).length
  const byType = RULE_TYPES.map(t => ({
    ...t,
    count: rules.filter(r => r.ruleType === t.value && r.isActive).length,
  }))

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>스케줄 규칙</Title>
        <Text type="secondary">공정 요일 제한 · 작업자 고정 · 설비 제한 — 자동 생산계획 생성 시 적용됩니다</Text>
      </div>

      <Row gutter={12} style={{ marginBottom: 16 }}>
        {[
          { l: '총 규칙', v: rules.length + '건', c: '#3B82F6' },
          { l: '활성', v: activeCount + '건', c: '#10B981' },
          { l: '비활성', v: (rules.length - activeCount) + '건', c: '#94A3B8' },
        ].map((s, i) => (
          <Col key={i} span={8}>
            <Card bordered={false} style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderTop: `3px solid ${s.c}` }} styles={{ body: { padding: '12px 16px' } }}>
              <Statistic title={<Text style={{ fontSize: 12, color: '#64748B' }}>{s.l}</Text>} value={s.v} valueStyle={{ fontSize: 20, fontWeight: 800, color: s.c }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 규칙 유형별 현황 */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        {byType.map((t, i) => (
          <Col key={i} span={6}>
            <Card bordered={false} size="small" style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', borderLeft: `4px solid ${t.color}` }} styles={{ body: { padding: '10px 14px' } }}>
              <Text style={{ fontSize: 12, color: '#64748B' }}>{t.label}</Text>
              <div><Text strong style={{ fontSize: 16, color: t.color }}>{t.count}건</Text></div>
              <Text type="secondary" style={{ fontSize: 11 }}>{t.desc}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}
            style={{ background: '#10B981', borderColor: '#10B981' }}>규칙 추가</Button>
        </div>

        <Table
          columns={cols}
          dataSource={rules.map(r => ({ ...r, key: r.id }))}
          pagination={false}
          size="small"
          bordered
          locale={{ emptyText: <Empty description="등록된 규칙이 없습니다. '규칙 추가'를 클릭하세요." /> }}
        />
      </Card>

      <Modal
        title={editRule ? '규칙 수정' : '규칙 추가'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="저장"
        cancelText="취소"
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="규칙 유형" name="ruleType" rules={[{ required: true }]}>
            <Select options={RULE_TYPES.map(t => ({ label: t.label, value: t.value }))} />
          </Form.Item>

          <Form.Item label={targetLabel()} name="targetName" rules={[{ required: true, message: '대상을 선택하세요' }]}>
            <Select options={targetOptions()} showSearch placeholder="선택" />
          </Form.Item>

          {(ruleType === 'process_day' || ruleType === 'worker_fix' || ruleType === 'equip_block') && (
            <Form.Item label="요일" name="days" rules={[{ required: true, message: '요일을 선택하세요' }]}>
              <Select mode="multiple" options={DAYS_KR.map(d => ({ label: d, value: d }))} />
            </Form.Item>
          )}

          {ruleType === 'worker_fix' && (
            <Form.Item label="고정 공정" name="processName" rules={[{ required: true, message: '공정을 선택하세요' }]}>
              <Select options={processOpts} showSearch placeholder="선택" />
            </Form.Item>
          )}

          {ruleType === 'process_equip' && (
            <Form.Item label="지정 설비" name="equipName" rules={[{ required: true, message: '설비를 선택하세요' }]}>
              <Select options={equipOpts} showSearch placeholder="선택" />
            </Form.Item>
          )}

          <Form.Item label="활성" name="isActive" valuePropName="checked">
            <Switch checkedChildren="활성" unCheckedChildren="비활성" />
          </Form.Item>

          <Form.Item label="비고" name="note">
            <Input placeholder="규칙 설명 (선택)" />
          </Form.Item>

          {/* 미리보기 */}
          <Card size="small" style={{ background: '#F8FAFC', borderRadius: 8 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>미리보기</Text>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              <Form.Item noStyle shouldUpdate>
                {() => {
                  const v = form.getFieldsValue()
                  if (!v.targetName) return <Text type="secondary">대상을 선택하면 규칙 문장이 표시됩니다</Text>
                  return ruleToSentence(v)
                }}
              </Form.Item>
            </div>
          </Card>
        </Form>
      </Modal>
    </div>
  )
}
