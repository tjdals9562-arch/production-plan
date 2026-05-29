import { createRoot } from 'react-dom/client'
import App from './App.jsx'

const s = document.createElement('style')
s.textContent = '.ant-layout-sider-children{display:flex!important;flex-direction:column!important;height:100%!important;overflow:hidden!important}'
document.head.appendChild(s)

createRoot(document.getElementById('root')).render(<App />)
