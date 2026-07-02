import { useState, useEffect } from 'react'
import { ConfigProvider, Layout, Menu, Breadcrumb, Avatar, Space, Tag, Typography, Flex } from 'antd'
import {
  DashboardOutlined, FileTextOutlined, CalendarOutlined,
  ToolOutlined, SettingOutlined, BarChartOutlined,
  CarOutlined, FileSearchOutlined, DatabaseOutlined,
  UserOutlined, LogoutOutlined, BellOutlined,
  RightOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import { Login }             from './pages/Login.jsx'
import { Dashboard }         from './pages/Dashboard.jsx'
import { OrderManagement }   from './pages/order/OrderManagement.jsx'
import { MasterPlan }        from './pages/mps/MasterPlan.jsx'
import { ProcessPlan }       from './pages/process/ProcessPlan.jsx'
import { ProductionResult }  from './pages/result/ProductionResult.jsx'
import { DeliveryMgmt }      from './pages/delivery/DeliveryMgmt.jsx'
import { Reports }           from './pages/report/Reports.jsx'
import { AutoSchedule }      from './pages/schedule/AutoSchedule.jsx'
import { UnregisteredProcess } from './pages/master/UnregisteredProcess.jsx'
import { ScheduleRules }      from './pages/master/ScheduleRules.jsx'

const { Sider, Content, Header } = Layout

const APP_THEME = {
  token: {
    colorPrimary: '#3B82F6',
    colorBgLayout: '#F1F5F9',
    borderRadius: 8,
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
  },
  components: {
    Layout: {
      siderBg: '#0F172A',
      headerBg: '#FFFFFF',
      bodyBg: '#F1F5F9',
    },
    Menu: {
      darkItemBg: '#0F172A',
      darkSubMenuItemBg: '#1E2A40',
      darkItemSelectedBg: '#3B82F6',
      darkItemHoverBg: 'rgba(255,255,255,0.07)',
      darkItemColor: 'rgba(255,255,255,0.60)',
      darkItemSelectedColor: '#FFFFFF',
      darkItemHoverColor: 'rgba(255,255,255,0.90)',
      itemHeight: 38,
      subMenuItemBg: '#1E2A40',
    },
    Table: { headerBg: '#F8FAFC', borderRadius: 8 },
    Card: { borderRadius: 12 },
    Button: { borderRadius: 6 },
    Select: { borderRadius: 6 },
    Input: { borderRadius: 6 },
  },
}

const MENUS = [
  { id:'dashboard',  icon:<DashboardOutlined />,    name:'대시보드' },
  { id:'autoSchedule', icon:<ThunderboltOutlined />, name:'자동 생산계획 생성', sub:[
    ['generate','계획 생성'],['gantt','일정계획 (Gantt)'],
    ['weekPlan','주간 생산계획'],['dayPlan','일일 생산계획'],['workerPlan','작업자별 생산계획'],
  ]},
  { id:'order',   icon:<FileTextOutlined />, name:'주문관리', sub:[
    ['orderList','주문현황'],['orderInput','주문등록'],
  ]},
  { id:'master', icon:<DatabaseOutlined />, name:'기준정보', sub:[
    ['processRoute','공정라우팅'],['bom','BOM (부품구성)'],['workerMaster','작업자 마스터'],['equipMaster','설비 마스터'],['scheduleRules','스케줄 규칙'],['unregistered','공정 미등록'],
  ]},
  { id:'result', icon:<BarChartOutlined />, name:'생산실적', sub:[
    ['resultInput','실적 입력'],['resultProcess','공정 진도현황'],['resultSummary','일/월별 집계'],
  ]},
]

const menuItems = MENUS.map(m => ({
  key: m.id,
  icon: m.icon,
  label: m.badge
    ? <span>{m.name} <span style={{fontSize:9,background:'#EF4444',color:'#fff',padding:'1px 5px',borderRadius:4,marginLeft:4,fontWeight:700,verticalAlign:'middle'}}>{m.badge}</span></span>
    : m.name,
  children: m.sub?.map(([sid, sname]) => ({ key: `${m.id}|${sid}`, label: sname })),
}))

const today = new Date()
const dateStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')} (${['일','월','화','수','목','금','토'][today.getDay()]})`

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pp_user') || 'null') } catch { return null }
  })

  if (!user) {
    return <Login onLogin={(account) => {
      localStorage.setItem('pp_user', JSON.stringify(account))
      setUser(account)
    }} />
  }

  return <AppMain user={user} onLogout={() => { localStorage.removeItem('pp_user'); setUser(null) }} />
}

function AppMain({ user, onLogout }) {
  const [menuKey, setMenuKey]     = useState('dashboard')
  const [subKey, setSubKey]       = useState('')
  const [openKeys, setOpenKeys]   = useState(['mps'])
  const [collapsed, setCollapsed] = useState(false)
  const [tabs, setTabs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pp_tabs') || '[]') } catch { return [] }
  })

  useEffect(() => { localStorage.setItem('pp_tabs', JSON.stringify(tabs)) }, [tabs])

  const pushTab = (mid, sid) => {
    const menuDef = MENUS.find(m => m.id === mid)
    if (!menuDef) return
    const subDef = menuDef.sub?.find(s => s[0] === sid)
    const label = subDef ? subDef[1] : menuDef.name
    const key = sid ? `${mid}|${sid}` : mid
    setTabs(prev => [
      { key, menuKey: mid, subKey: sid || '', label },
      ...prev.filter(t => t.key !== key),
    ].slice(0, 7))
  }

  const goTab = (tab) => {
    setMenuKey(tab.menuKey)
    setSubKey(tab.subKey)
    setOpenKeys(k => [...new Set([...k, tab.menuKey])])
  }

  const closeTab = (e, tab) => {
    e.stopPropagation()
    const next = tabs.filter(t => t.key !== tab.key)
    setTabs(next)
    const isActive = tab.menuKey === menuKey && tab.subKey === subKey
    if (isActive) {
      if (next.length > 0) goTab(next[0])
      else { setMenuKey('dashboard'); setSubKey('') }
    }
  }

  const handleSelect = ({ key }) => {
    const [mid, sid] = key.split('|')
    setMenuKey(mid)
    setSubKey(sid || '')
    pushTab(mid, sid || '')
  }

  const curMenu = MENUS.find(m => m.id === menuKey)
  const curSub  = curMenu?.sub?.find(s => s[0] === subKey)

  const breadItems = [
    { title: '생산계획시스템' },
    curMenu && { title: curMenu.name },
    curSub  && { title: curSub[1] },
  ].filter(Boolean)

  function renderPage() {
    const nav = (m, s) => { setMenuKey(m); setSubKey(s); setOpenKeys(k => [...new Set([...k, m])]); pushTab(m, s) }
    switch (menuKey) {
      case 'dashboard':      return <Dashboard onNav={nav} />
      case 'autoSchedule': {
        if (subKey === 'workOrder' || subKey === 'processLoad') return <ProcessPlan sub={subKey} />
        const AS_TAB = { gantt:'gantt', weekPlan:'week', dayPlan:'day', workerPlan:'worker' }
        return <AutoSchedule key={subKey || 'generate'} initialTab={AS_TAB[subKey]} />
      }
      case 'order':          return <OrderManagement sub={subKey} />
      case 'mps':       return <MasterPlan sub={subKey} />
      case 'process':   return <ProcessPlan sub={subKey} />
      case 'master':    return subKey === 'unregistered' ? <UnregisteredProcess />
                               : subKey === 'scheduleRules' ? <ScheduleRules />
                               : <ProcessPlan sub={subKey} />
      case 'result':    return <ProductionResult sub={subKey} />
      case 'delivery':  return <DeliveryMgmt sub={subKey} />
      case 'report':    return <Reports sub={subKey} />
      default:          return <Dashboard onNav={nav} />
    }
  }

  return (
    <ConfigProvider theme={APP_THEME}>
      <Layout style={{ minHeight: '100vh' }}>

        {/* ─── SIDER ─── */}
        <Sider
          theme="dark"
          width={240}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          style={{ position:'fixed', left:0, top:0, bottom:0, zIndex:200, overflow:'hidden' }}
          trigger={null}
        >
          {/* Logo */}
          <div style={{
            padding: collapsed ? '20px 12px' : '18px 20px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            cursor: 'pointer',
            transition: 'padding 0.2s',
          }} onClick={() => setCollapsed(c => !c)}>
            {!collapsed ? (
              <>
                <div style={{ fontSize:15, fontWeight:800, color:'#fff', letterSpacing:'-0.3px', lineHeight:1.3 }}>
                  생산<span style={{color:'#60A5FA'}}>계획</span>시스템
                </div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:3 }}>Production Planning System</div>
              </>
            ) : (
              <div style={{ fontSize:18, fontWeight:800, color:'#60A5FA', textAlign:'center' }}>PP</div>
            )}
          </div>

          {/* Nav */}
          <div style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[subKey ? `${menuKey}|${subKey}` : menuKey]}
              openKeys={collapsed ? [] : openKeys}
              onOpenChange={keys => {
                const latest = keys.find(k => !openKeys.includes(k))
                setOpenKeys(latest ? [latest] : [])
              }}
              onSelect={handleSelect}
              items={menuItems}
              style={{ border:'none', background:'transparent', fontSize:13 }}
            />
          </div>

          {/* User footer */}
          {!collapsed && (
            <div style={{
              padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.07)',
              display:'flex', alignItems:'center', gap:8,
            }}>
              <Avatar size={28} style={{ background:'linear-gradient(135deg,#3B82F6,#7C3AED)', flexShrink:0, fontSize:11 }}>
                {user.name[0]}
              </Avatar>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{user.name}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{user.dept}</div>
              </div>
              <LogoutOutlined
                onClick={onLogout}
                style={{ color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:14 }}
                title="로그아웃"
              />
            </div>
          )}
        </Sider>

        {/* ─── MAIN ─── */}
        <Layout style={{ marginLeft: collapsed ? 80 : 240, transition:'margin-left 0.2s' }}>

          {/* Header */}
          <Header style={{
            height:54, padding:'0 24px', background:'#fff',
            borderBottom:'1px solid #E8ECF4',
            display:'flex', alignItems:'center', gap:12,
            position:'sticky', top:0, zIndex:100,
            boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <Breadcrumb items={breadItems} separator={<RightOutlined style={{fontSize:10,color:'#94A3B8'}} />} />
            <Space style={{ marginLeft:'auto' }}>
              <Tag style={{ fontSize:12, color:'#64748B', border:'none', background:'#F1F5F9' }}>{dateStr}</Tag>
              <BellOutlined style={{ fontSize:18, color:'#64748B', cursor:'pointer' }} />
              <Tag color="blue" style={{ fontSize:11 }}>v1.0</Tag>
            </Space>
          </Header>

          {/* ─── 탭 바 ─── */}
          {tabs.length > 0 && (
            <div style={{
              position:'sticky', top:54, zIndex:99,
              background:'#fff', borderBottom:'1px solid #E8ECF4',
              display:'flex', alignItems:'flex-end', padding:'0 16px', gap:2,
              overflowX:'auto', overflowY:'hidden', flexShrink:0,
            }}>
              {tabs.map(tab => {
                const isActive = tab.menuKey === menuKey && tab.subKey === subKey
                return (
                  <div key={tab.key}
                    onClick={() => goTab(tab)}
                    style={{
                      display:'flex', alignItems:'center', gap:6, flexShrink:0,
                      padding:'0 10px', height:36, cursor:'pointer',
                      borderBottom: isActive ? '2px solid #3B82F6' : '2px solid transparent',
                      color: isActive ? '#1D4ED8' : '#64748B',
                      fontSize:12, fontWeight: isActive ? 600 : 400,
                      background: isActive ? '#EFF6FF' : 'transparent',
                      borderRadius:'6px 6px 0 0',
                      transition:'all 0.15s',
                    }}
                  >
                    <span>{tab.label}</span>
                    <span
                      onClick={e => closeTab(e, tab)}
                      style={{
                        width:15, height:15, borderRadius:'50%',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:9, color: isActive ? '#3B82F6' : '#94A3B8',
                        marginLeft:2, cursor:'pointer',
                        transition:'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background='#F1F5F9'; e.currentTarget.style.color='#EF4444' }}
                      onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color=isActive?'#3B82F6':'#94A3B8' }}
                    >✕</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Content */}
          <Content style={{ padding:24, minHeight:'calc(100vh - 54px)' }}>
            {renderPage()}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}

