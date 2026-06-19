import { createRoot } from 'react-dom/client'
import App from './App.jsx'

const s = document.createElement('style')
s.textContent = `
  .ant-layout-sider-children{display:flex!important;flex-direction:column!important;height:100%!important;overflow:hidden!important}
  .ant-table-bordered .ant-table-cell{border-color:#CBD5E1!important}
  .ant-table-bordered .ant-table-thead>tr>th{border-color:#CBD5E1!important;background:#F8FAFC!important}
  .ant-table-small .ant-table-cell{padding:0 8px!important;font-size:13px!important;color:#374151!important;font-weight:400!important;line-height:28px!important}
  .ant-table-small .ant-table-thead .ant-table-cell{padding:0 8px!important;font-size:12px!important;font-weight:600!important;color:#374151!important;line-height:28px!important}
  .ant-table-small .ant-table-cell .ant-typography{font-size:13px!important;color:#374151!important;font-weight:400!important}
  .ant-table-small .ant-table-cell .ant-tag{font-size:12px!important}
  .ant-table-small .ant-table-cell b,.ant-table-small .ant-table-cell strong{font-weight:600!important;color:#374151!important}
`
document.head.appendChild(s)

createRoot(document.getElementById('root')).render(<App />)
