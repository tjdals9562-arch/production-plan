import { useState } from 'react'
import { Form, Input, Button, Alert } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'

const ACCOUNTS = [
  { id: 'admin', pw: '9256', name: '관리자', dept: '생산계획팀' },
  { id: 'order', pw: '1234', name: '수주담당', dept: '영업팀' },
]

export function Login({ onLogin }) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = ({ username, password }) => {
    setLoading(true)
    setTimeout(() => {
      const account = ACCOUNTS.find(a => a.id === username && a.pw === password)
      if (account) {
        onLogin(account)
      } else {
        setError(true)
        setLoading(false)
      }
    }, 400)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: 380,
        background: '#fff',
        borderRadius: 16,
        padding: '40px 36px 36px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56, height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
            marginBottom: 16,
            boxShadow: '0 8px 20px rgba(59,130,246,0.4)',
          }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>PP</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
            생산<span style={{ color: '#3B82F6' }}>계획</span>시스템
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
            Production Planning System
          </div>
        </div>

        {error && (
          <Alert
            message="아이디 또는 비밀번호가 올바르지 않습니다."
            type="error"
            showIcon
            style={{ marginBottom: 20, borderRadius: 8 }}
            closable
            onClose={() => setError(false)}
          />
        )}

        <Form onFinish={handleSubmit} size="large" layout="vertical">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '아이디를 입력하세요' }]}
            style={{ marginBottom: 16 }}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#94A3B8' }} />}
              placeholder="아이디"
              style={{ borderRadius: 8 }}
              onChange={() => setError(false)}
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '비밀번호를 입력하세요' }]}
            style={{ marginBottom: 24 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
              placeholder="비밀번호"
              style={{ borderRadius: 8 }}
              onChange={() => setError(false)}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 44,
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
                border: 'none',
              }}
            >
              로그인
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#CBD5E1' }}>
          금산산기 생산계획팀
        </div>
      </div>
    </div>
  )
}
