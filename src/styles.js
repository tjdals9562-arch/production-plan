export const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --sidebar-w: 230px;
    --header-h: 52px;
    --bg: #F0F2F5;
    --sidebar-bg: #1A2340;
    --sidebar-hover: rgba(255,255,255,0.07);
    --sidebar-active: #2563EB;
    --card-bg: #FFFFFF;
    --border: #E2E6EE;
    --border-hover: #C5CCE0;
    --text: #111827;
    --muted: #6B7280;
    --primary: #2563EB;
    --primary-light: rgba(37,99,235,0.1);
    --danger: #DC2626;
    --danger-light: rgba(220,38,38,0.1);
    --success: #16A34A;
    --success-light: rgba(22,163,74,0.1);
    --warning: #D97706;
    --warning-light: rgba(217,119,6,0.1);
    --purple: #7C3AED;
    --purple-light: rgba(124,58,237,0.1);
    --teal: #0D9488;
    --teal-light: rgba(13,148,136,0.1);
    --sky: #0284C7;
    --sky-light: rgba(2,132,199,0.1);
    --radius: 8px;
    --radius-lg: 12px;
    --shadow: 0 1px 4px rgba(0,0,0,0.08);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.1);
  }
  html, body { height: 100%; overflow: hidden; }
  body {
    font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
    line-height: 1.5;
  }
  #root { height: 100vh; overflow: hidden; }
  .app { display: flex; height: 100vh; width: 100vw; overflow: hidden; }

  /* ─── SIDEBAR ─── */
  .sidebar {
    position: fixed; left: 0; top: 0; bottom: 0; z-index: 200;
    width: var(--sidebar-w);
    background: var(--sidebar-bg);
    display: flex; flex-direction: column;
    overflow: hidden;
  }
  .sidebar-logo {
    padding: 20px 18px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
  }
  .sidebar-logo .brand {
    font-size: 15px; font-weight: 800; color: #fff;
    letter-spacing: -0.3px; line-height: 1.3;
  }
  .sidebar-logo .brand span { color: #60A5FA; }
  .sidebar-logo .sub { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 3px; }
  .sidebar-section-label {
    padding: 16px 14px 6px;
    font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.3);
    letter-spacing: 0.8px; text-transform: uppercase;
  }
  .sidebar-nav { padding: 4px 8px; flex: 1; overflow-y: auto; overflow-x: hidden; }
  .sidebar-nav::-webkit-scrollbar { width: 3px; }
  .sidebar-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
  .nav-item {
    display: flex; align-items: center; gap: 8px;
    padding: 9px 10px; border-radius: 6px; cursor: pointer;
    margin-bottom: 1px; color: rgba(255,255,255,0.65);
    font-size: 13px; font-weight: 600;
    transition: all 0.12s; white-space: nowrap;
  }
  .nav-item:hover { background: var(--sidebar-hover); color: #fff; }
  .nav-item.active { background: var(--sidebar-active); color: #fff; }
  .nav-item .nav-icon { font-size: 16px; flex-shrink: 0; width: 20px; text-align: center; }
  .nav-item .nav-arrow {
    margin-left: auto; font-size: 10px; opacity: 0.5;
    transition: transform 0.15s;
  }
  .nav-item.open .nav-arrow { transform: rotate(90deg); opacity: 0.8; }
  .nav-sub-group { overflow: hidden; }
  .nav-sub {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 10px 7px 36px;
    font-size: 12.5px; color: rgba(255,255,255,0.5); cursor: pointer;
    border-radius: 5px; transition: all 0.1s; margin-bottom: 1px;
    white-space: nowrap;
  }
  .nav-sub::before { content: ''; width: 4px; height: 4px; border-radius: 50%; background: currentColor; flex-shrink: 0; opacity: 0.5; }
  .nav-sub:hover { background: var(--sidebar-hover); color: rgba(255,255,255,0.85); }
  .nav-sub.active { color: #93C5FD; background: rgba(37,99,235,0.2); font-weight: 600; }
  .nav-sub.active::before { opacity: 1; }
  .sidebar-footer {
    padding: 12px 14px; border-top: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;
    display: flex; align-items: center; gap: 8px;
  }
  .avatar {
    width: 28px; height: 28px; border-radius: 50%;
    background: linear-gradient(135deg, #2563EB, #7C3AED);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 11px; font-weight: 700; flex-shrink: 0;
  }
  .footer-info .name { font-size: 13px; font-weight: 700; color: #fff; }
  .footer-info .role { font-size: 11px; color: rgba(255,255,255,0.4); }
  .logout-btn {
    margin-left: auto; font-size: 12px; color: rgba(255,255,255,0.35);
    cursor: pointer; padding: 4px 6px; border-radius: 4px;
    transition: all 0.1s;
  }
  .logout-btn:hover { color: rgba(255,255,255,0.7); background: var(--sidebar-hover); }

  /* ─── MAIN ─── */
  .main {
    margin-left: var(--sidebar-w);
    flex: 1; display: flex; flex-direction: column;
    height: 100vh; overflow: hidden;
  }
  .topbar {
    height: var(--header-h); background: var(--card-bg);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; padding: 0 24px;
    flex-shrink: 0; gap: 8px;
  }
  .topbar-breadcrumb { font-size: 13px; color: var(--muted); display: flex; align-items: center; gap: 6px; }
  .topbar-breadcrumb .sep { opacity: 0.4; }
  .topbar-breadcrumb .current { color: var(--text); font-weight: 600; }
  .topbar-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
  .topbar-date { font-size: 12px; color: var(--muted); }
  .topbar-badge {
    padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 600;
    background: var(--primary-light); color: var(--primary);
  }

  .content { flex: 1; overflow-y: auto; padding: 24px; }
  .content::-webkit-scrollbar { width: 5px; }
  .content::-webkit-scrollbar-thumb { background: var(--border-hover); border-radius: 3px; }

  /* ─── PAGE HEADER ─── */
  .page-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
  .page-header-icon {
    width: 40px; height: 40px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
  }
  .page-header-icon.blue { background: var(--primary-light); }
  .page-header-icon.green { background: var(--success-light); }
  .page-header-icon.orange { background: var(--warning-light); }
  .page-header-icon.purple { background: var(--purple-light); }
  .page-header-icon.teal { background: var(--teal-light); }
  .page-header-icon.red { background: var(--danger-light); }
  .page-header-icon.sky { background: var(--sky-light); }
  .page-title { font-size: 20px; font-weight: 800; color: var(--text); }
  .page-desc { font-size: 13px; color: var(--muted); margin-top: 2px; }

  /* ─── CARDS ─── */
  .card {
    background: var(--card-bg); border-radius: var(--radius-lg);
    border: 1px solid var(--border); padding: 20px;
    box-shadow: var(--shadow);
  }
  .card-title {
    font-size: 13px; font-weight: 700; color: var(--muted);
    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;
    display: flex; align-items: center; justify-content: space-between;
  }

  /* ─── KPI CARDS ─── */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
  .kpi-card {
    background: var(--card-bg); border-radius: var(--radius-lg);
    border: 1px solid var(--border); padding: 18px 20px;
    box-shadow: var(--shadow); position: relative; overflow: hidden;
  }
  .kpi-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  }
  .kpi-card.blue::before { background: var(--primary); }
  .kpi-card.green::before { background: var(--success); }
  .kpi-card.orange::before { background: var(--warning); }
  .kpi-card.purple::before { background: var(--purple); }
  .kpi-card.teal::before { background: var(--teal); }
  .kpi-card.red::before { background: var(--danger); }
  .kpi-label { font-size: 12px; font-weight: 600; color: var(--muted); margin-bottom: 8px; }
  .kpi-value { font-size: 28px; font-weight: 800; color: var(--text); line-height: 1; }
  .kpi-value span { font-size: 14px; font-weight: 600; color: var(--muted); margin-left: 4px; }
  .kpi-sub { font-size: 12px; color: var(--muted); margin-top: 6px; display: flex; align-items: center; gap: 4px; }
  .kpi-sub .up { color: var(--success); font-weight: 600; }
  .kpi-sub .down { color: var(--danger); font-weight: 600; }
  .kpi-icon {
    position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
    font-size: 36px; opacity: 0.08;
  }

  /* ─── GRID LAYOUTS ─── */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
  .grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 16px; }
  .grid-1-2 { display: grid; grid-template-columns: 1fr 2fr; gap: 16px; margin-bottom: 16px; }

  /* ─── TABLE ─── */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead th {
    background: #F8FAFC; padding: 9px 12px; text-align: left;
    font-size: 11.5px; font-weight: 700; color: var(--muted);
    border-bottom: 1px solid var(--border); white-space: nowrap;
    letter-spacing: 0.3px;
  }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #F1F5F9; color: var(--text); }
  tbody tr:hover { background: #F8FAFF; }
  tbody tr:last-child td { border-bottom: none; }

  /* ─── BADGES ─── */
  .badge {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 2px 8px; border-radius: 20px;
    font-size: 11px; font-weight: 600; white-space: nowrap;
  }
  .badge.blue { background: var(--primary-light); color: var(--primary); }
  .badge.green { background: var(--success-light); color: var(--success); }
  .badge.orange { background: var(--warning-light); color: var(--warning); }
  .badge.red { background: var(--danger-light); color: var(--danger); }
  .badge.purple { background: var(--purple-light); color: var(--purple); }
  .badge.gray { background: #F1F5F9; color: var(--muted); }
  .badge.teal { background: var(--teal-light); color: var(--teal); }

  /* ─── PROGRESS BAR ─── */
  .progress-bar { height: 6px; background: #EEF2FF; border-radius: 4px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
  .progress-fill.blue { background: var(--primary); }
  .progress-fill.green { background: var(--success); }
  .progress-fill.orange { background: var(--warning); }
  .progress-fill.red { background: var(--danger); }

  /* ─── FILTER BAR ─── */
  .filter-bar {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    margin-bottom: 16px; padding: 14px 16px;
    background: var(--card-bg); border-radius: var(--radius);
    border: 1px solid var(--border);
  }
  .filter-bar label { font-size: 12px; font-weight: 600; color: var(--muted); }
  .filter-bar input, .filter-bar select {
    height: 32px; padding: 0 10px; border-radius: 6px;
    border: 1px solid var(--border); font-size: 13px; color: var(--text);
    background: #fff; outline: none;
  }
  .filter-bar input:focus, .filter-bar select:focus { border-color: var(--primary); }
  .filter-bar .sep { width: 1px; height: 20px; background: var(--border); }

  /* ─── BUTTONS ─── */
  .btn {
    height: 32px; padding: 0 14px; border-radius: 6px;
    font-size: 13px; font-weight: 600; cursor: pointer;
    display: inline-flex; align-items: center; gap: 5px;
    border: none; transition: all 0.12s;
  }
  .btn-primary { background: var(--primary); color: #fff; }
  .btn-primary:hover { background: #1D4ED8; }
  .btn-secondary { background: #F1F5F9; color: var(--text); border: 1px solid var(--border); }
  .btn-secondary:hover { background: var(--border); }
  .btn-success { background: var(--success); color: #fff; }
  .btn-success:hover { background: #15803D; }
  .btn-danger { background: var(--danger); color: #fff; }
  .btn-danger:hover { background: #B91C1C; }
  .btn-sm { height: 26px; padding: 0 10px; font-size: 12px; }

  /* ─── GANTT ─── */
  .gantt-wrap { overflow-x: auto; }
  .gantt-header { display: flex; border-bottom: 1px solid var(--border); }
  .gantt-task-col { width: 220px; flex-shrink: 0; padding: 8px 12px; font-size: 12px; font-weight: 700; color: var(--muted); }
  .gantt-timeline { flex: 1; display: flex; }
  .gantt-day { flex: 1; min-width: 28px; text-align: center; font-size: 10px; color: var(--muted); padding: 8px 2px; border-left: 1px solid var(--border); }
  .gantt-row { display: flex; border-bottom: 1px solid #F1F5F9; align-items: center; }
  .gantt-row:hover { background: #F8FAFF; }
  .gantt-row-label { width: 220px; flex-shrink: 0; padding: 10px 12px; }
  .gantt-row-name { font-size: 13px; font-weight: 600; color: var(--text); }
  .gantt-row-sub { font-size: 11px; color: var(--muted); }
  .gantt-bar-area { flex: 1; position: relative; height: 44px; }
  .gantt-bar {
    position: absolute; top: 50%; transform: translateY(-50%);
    height: 20px; border-radius: 4px; display: flex; align-items: center;
    padding: 0 6px; font-size: 11px; color: #fff; font-weight: 600;
    cursor: pointer; transition: filter 0.1s;
  }
  .gantt-bar:hover { filter: brightness(0.9); }
  .gantt-bar.blue { background: var(--primary); }
  .gantt-bar.green { background: var(--success); }
  .gantt-bar.orange { background: var(--warning); }
  .gantt-bar.purple { background: var(--purple); }

  /* ─── LOAD BAR ─── */
  .load-bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .load-bar-label { width: 120px; font-size: 12px; font-weight: 600; color: var(--text); flex-shrink: 0; }
  .load-bar-track { flex: 1; height: 14px; background: #EEF2FF; border-radius: 8px; overflow: hidden; position: relative; }
  .load-bar-fill { height: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: flex-end; padding-right: 6px; }
  .load-bar-fill span { font-size: 10px; font-weight: 700; color: #fff; }
  .load-bar-pct { width: 44px; font-size: 12px; font-weight: 700; text-align: right; flex-shrink: 0; }

  /* ─── ALERT ITEMS ─── */
  .alert-item {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 10px 0; border-bottom: 1px solid #F1F5F9;
  }
  .alert-item:last-child { border-bottom: none; }
  .alert-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
  .alert-dot.red { background: var(--danger); }
  .alert-dot.orange { background: var(--warning); }
  .alert-dot.blue { background: var(--primary); }
  .alert-dot.green { background: var(--success); }
  .alert-title { font-size: 13px; font-weight: 600; color: var(--text); }
  .alert-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }

  /* ─── STAT ROW ─── */
  .stat-row { display: flex; gap: 0; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; margin-bottom: 16px; }
  .stat-cell { flex: 1; padding: 14px 16px; border-right: 1px solid var(--border); text-align: center; }
  .stat-cell:last-child { border-right: none; }
  .stat-cell-label { font-size: 11px; font-weight: 600; color: var(--muted); margin-bottom: 4px; }
  .stat-cell-value { font-size: 20px; font-weight: 800; color: var(--text); }
  .stat-cell-value small { font-size: 12px; font-weight: 500; color: var(--muted); }

  /* ─── MONTH PLAN GRID ─── */
  .month-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .month-day-header { background: #F8FAFC; padding: 6px; text-align: center; font-size: 11px; font-weight: 700; color: var(--muted); border-bottom: 1px solid var(--border); border-right: 1px solid var(--border); }
  .month-day-header:last-child { border-right: none; }
  .month-day {
    min-height: 80px; padding: 6px; border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border); font-size: 11px;
    vertical-align: top; background: #fff;
  }
  .month-day:last-child { border-right: none; }
  .month-day.other-month { background: #F8FAFC; }
  .month-day.today { background: #EFF6FF; }
  .month-day-num { font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .month-event {
    padding: 2px 5px; border-radius: 3px; font-size: 10px; font-weight: 600;
    margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .month-event.blue { background: var(--primary-light); color: var(--primary); }
  .month-event.green { background: var(--success-light); color: var(--success); }
  .month-event.orange { background: var(--warning-light); color: var(--warning); }

  /* ─── FORM ─── */
  .form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .form-group { display: flex; flex-direction: column; gap: 5px; }
  .form-label { font-size: 12px; font-weight: 600; color: var(--muted); }
  .form-input {
    height: 36px; padding: 0 12px; border-radius: 6px;
    border: 1px solid var(--border); font-size: 13px; color: var(--text);
    background: #fff; outline: none; width: 100%;
  }
  .form-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); }
  .form-select {
    height: 36px; padding: 0 10px; border-radius: 6px;
    border: 1px solid var(--border); font-size: 13px; color: var(--text);
    background: #fff; outline: none; width: 100%;
  }

  /* ─── EMPTY STATE ─── */
  .empty-state { text-align: center; padding: 48px 20px; color: var(--muted); }
  .empty-state .empty-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.5; }
  .empty-state .empty-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .empty-state .empty-desc { font-size: 13px; }

  /* ─── TABS ─── */
  .tabs { display: flex; gap: 2px; margin-bottom: 16px; border-bottom: 1px solid var(--border); }
  .tab {
    padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer;
    color: var(--muted); border-bottom: 2px solid transparent; margin-bottom: -1px;
    transition: all 0.12s;
  }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--primary); border-bottom-color: var(--primary); }

  /* ─── RESPONSIVE ─── */
  @media (max-width: 1200px) {
    .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    .grid-2 { grid-template-columns: 1fr; }
    .grid-2-1 { grid-template-columns: 1fr; }
  }
`
