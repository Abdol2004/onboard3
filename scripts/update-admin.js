const fs = require('fs');
let content = fs.readFileSync('c:/Users/admin/Desktop/onboarder/views/admin/dashboard.ejs', 'utf8');

// ── New CSS block ──────────────────────────────────────────────────────────
const newCSS = `    <style>
        /* ONBOARD3 ADMIN — Forest Green Theme */
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        :root {
            --green:#5EC213; --green-dark:#45960E; --green-light:#78E02A;
            --bg:#0F1610; --bg-card:rgba(15,24,15,0.97); --bg-secondary:rgba(20,32,20,0.95);
            --border:rgba(94,194,19,0.16); --border-2:rgba(94,194,19,0.07);
            --text:#E8F5E2; --text-2:#8AAF85; --text-3:#5A7A56;
            --sb-w:260px; --radius:14px;
            /* compat aliases */
            --primary:#5EC213; --primary-dark:#45960E;
            --text-primary:#E8F5E2; --text-secondary:#8AAF85; --text-muted:#5A7A56;
        }
        html { scroll-behavior:smooth; }
        body { font-family:'Outfit',sans-serif; background:var(--bg); color:var(--text); -webkit-font-smoothing:antialiased; overflow-x:hidden; }
        ::selection { background:rgba(94,194,19,0.25); color:#fff; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(94,194,19,0.25); border-radius:10px; }
        ::-webkit-scrollbar-thumb:hover { background:rgba(94,194,19,0.45); }

        /* BG Grid */
        .grid-bg {
            position:fixed; inset:0; pointer-events:none; z-index:0;
            background-image:linear-gradient(rgba(94,194,19,0.05) 1px,transparent 1px),
                             linear-gradient(90deg,rgba(94,194,19,0.05) 1px,transparent 1px);
            background-size:52px 52px; opacity:0.5;
        }

        /* Scan line on sidebar */
        .admin-navbar::after {
            content:''; position:absolute; left:0; right:0; height:1px;
            background:linear-gradient(90deg,transparent,rgba(94,194,19,0.45),transparent);
            animation:sbScan 5s linear infinite; pointer-events:none; z-index:2;
        }
        @keyframes sbScan { 0%{top:0;opacity:0} 5%{opacity:1} 95%{opacity:1} 100%{top:100%;opacity:0} }

        /* ═══ SIDEBAR ═══ */
        .admin-navbar {
            position:fixed; top:0; left:0; bottom:0; width:var(--sb-w); z-index:1001;
            background:rgba(8,13,8,0.98); border-right:1px solid var(--border);
            display:flex; flex-direction:column; overflow:hidden;
            transition:transform 0.35s cubic-bezier(0.4,0,0.2,1);
        }
        .navbar-logo {
            display:flex; align-items:center; justify-content:space-between;
            padding:1.375rem 1.375rem 1.125rem; border-bottom:1px solid var(--border); flex-shrink:0;
        }
        .navbar-logo h1 {
            font-size:1.0625rem; font-weight:900; color:var(--text); letter-spacing:-0.3px;
            display:flex; align-items:center; gap:0.625rem;
        }
        .navbar-logo h1::before {
            content:''; display:block; width:28px; height:28px; border-radius:8px; flex-shrink:0;
            background:rgba(94,194,19,0.15) url('/img/logo.png') center/contain no-repeat;
            border:1.5px solid rgba(94,194,19,0.35);
        }
        .navbar-logo p { display:none !important; }
        .admin-badge {
            font-size:0.6rem; font-weight:900; letter-spacing:1.5px; text-transform:uppercase;
            padding:0.2rem 0.55rem; border-radius:5px;
            background:rgba(94,194,19,0.15); color:var(--green); border:1px solid rgba(94,194,19,0.3);
        }

        /* Sidebar nav */
        .navbar-menu {
            flex:1; overflow-y:auto; padding:0.875rem 0.75rem;
            display:flex; flex-direction:column; gap:1px;
        }
        .navbar-menu::-webkit-scrollbar { width:3px; }
        .nav-section-label {
            font-size:0.6rem; font-weight:800; letter-spacing:2.5px; text-transform:uppercase;
            color:var(--text-3); padding:0.75rem 0.5rem 0.35rem; margin-top:0.25rem;
        }
        .menu-item {
            display:flex; align-items:center; gap:0.75rem;
            padding:0.675rem 0.875rem; border-radius:11px; cursor:pointer;
            color:var(--text-2); text-decoration:none; font-size:0.875rem; font-weight:600;
            transition:all 0.22s cubic-bezier(0.4,0,0.2,1);
            position:relative; border-bottom:none !important; white-space:nowrap;
            font-family:'Outfit',sans-serif;
        }
        .menu-item i { font-size:0.875rem; width:16px; text-align:center; flex-shrink:0; }
        .menu-item:hover:not(.active) { background:rgba(94,194,19,0.08); color:var(--text); }
        .menu-item.active { background:rgba(94,194,19,0.13); color:var(--green); }
        .menu-item.active::before {
            content:''; position:absolute; left:0; top:6px; bottom:6px; width:3px;
            border-radius:0 3px 3px 0; background:var(--green);
            box-shadow:0 0 10px rgba(94,194,19,0.6);
        }
        .menu-item.active i { color:var(--green); }

        /* Sidebar footer */
        .sidebar-footer {
            padding:1rem 1.125rem; border-top:1px solid var(--border); flex-shrink:0;
            display:flex; align-items:center; gap:0.75rem; background:rgba(94,194,19,0.02);
        }
        .sidebar-footer-avatar {
            width:34px; height:34px; border-radius:9px; flex-shrink:0;
            background:linear-gradient(135deg,var(--green),var(--green-dark));
            display:flex; align-items:center; justify-content:center; font-size:0.9375rem; color:#000;
        }
        .sidebar-footer-info { flex:1; min-width:0; }
        .sidebar-footer-name { font-size:0.8125rem; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .sidebar-footer-role { font-size:0.68rem; font-weight:700; color:var(--green); }
        .sidebar-exit {
            width:32px; height:32px; border-radius:9px; border:1px solid var(--border);
            background:rgba(255,255,255,0.03); color:var(--text-3); cursor:pointer;
            display:flex; align-items:center; justify-content:center; font-size:0.8125rem;
            transition:all 0.2s; text-decoration:none;
        }
        .sidebar-exit:hover { border-color:rgba(239,68,68,0.35); color:#f87171; }

        /* Overlay */
        .asb-overlay {
            display:none; position:fixed; inset:0;
            background:rgba(0,0,0,0.75); backdrop-filter:blur(4px);
            z-index:1000; opacity:0; transition:opacity 0.3s;
        }
        .asb-overlay.active { display:block; opacity:1; }

        /* Mobile top bar */
        .admin-topbar {
            display:none; position:fixed; top:0; left:0; right:0; height:56px;
            background:rgba(8,13,8,0.98); border-bottom:1px solid var(--border);
            align-items:center; justify-content:space-between; padding:0 1.125rem; z-index:999;
        }
        .admin-topbar-toggle {
            width:36px; height:36px; border-radius:9px; border:1px solid var(--border);
            background:rgba(255,255,255,0.03); color:var(--text-2); cursor:pointer;
            display:flex; align-items:center; justify-content:center; transition:all 0.2s;
        }
        .admin-topbar-toggle:hover { border-color:var(--green); color:var(--green); }
        .admin-topbar-title { font-size:1rem; font-weight:900; color:var(--text); letter-spacing:-0.3px; }
        .admin-topbar-badge {
            font-size:0.6rem; font-weight:900; letter-spacing:1.5px; text-transform:uppercase;
            padding:0.2rem 0.55rem; border-radius:5px;
            background:rgba(94,194,19,0.15); color:var(--green); border:1px solid rgba(94,194,19,0.3);
        }

        /* Mobile sidebar drawer */
        .mobile-dropdown {
            position:fixed; top:0; left:0; bottom:0; width:var(--sb-w); z-index:1002;
            background:rgba(8,13,8,0.99); border-right:1px solid var(--border);
            transform:translateX(-100%); transition:transform 0.35s cubic-bezier(0.4,0,0.2,1);
            display:flex; flex-direction:column; padding:0.875rem 0.75rem; overflow-y:auto;
        }
        .mobile-dropdown.active { transform:translateX(0); }
        .mobile-dropdown .menu-item { margin-bottom:1px; }
        .mobile-close-btn {
            align-self:flex-end; width:32px; height:32px; border-radius:8px;
            border:1px solid var(--border); background:rgba(255,255,255,0.03);
            color:var(--text-2); cursor:pointer; display:flex; align-items:center;
            justify-content:center; font-size:0.9375rem; margin-bottom:0.75rem; transition:all 0.2s;
        }
        .mobile-close-btn:hover { border-color:var(--green); color:var(--green); }

        /* ═══ LAYOUT ═══ */
        .admin-container { position:relative; z-index:1; }
        .main-content {
            margin-left:var(--sb-w); min-height:100vh; padding:2rem 2.25rem;
        }

        /* ═══ HEADER ═══ */
        .header {
            display:flex; align-items:flex-start; justify-content:space-between;
            flex-wrap:wrap; gap:1rem; margin-bottom:2rem;
            padding-bottom:1.375rem; border-bottom:1px solid var(--border-2);
            animation:fadeUp 0.5s ease both;
        }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .header h2 {
            font-size:clamp(1.375rem,2.5vw,1.875rem); font-weight:900; letter-spacing:-0.5px;
            color:var(--text); display:flex; align-items:center; gap:0.625rem;
        }
        .header h2 i { color:var(--green); font-size:1.125rem; }
        .header p { color:var(--text-3); font-size:0.875rem; margin-top:2px; }

        /* ═══ STAT CARDS ═══ */
        .stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:1.125rem; margin-bottom:2rem; }
        .stat-card {
            background:var(--bg-card); border:1px solid var(--border);
            border-radius:var(--radius); padding:1.375rem; position:relative; overflow:hidden;
            animation:cardIn 0.5s cubic-bezier(0.4,0,0.2,1) both;
            transition:transform 0.3s,border-color 0.3s,box-shadow 0.3s; cursor:default;
        }
        @keyframes cardIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .stat-card:hover { transform:translateY(-4px); border-color:rgba(94,194,19,0.3); box-shadow:0 12px 40px rgba(0,0,0,0.35); }
        .stat-card::before {
            content:''; position:absolute; top:0; left:0; right:0; height:2px;
            background:linear-gradient(90deg,transparent,var(--green),var(--green-light),var(--green),transparent);
            opacity:0; transition:opacity 0.3s;
        }
        .stat-card:hover::before { opacity:1; }
        .stat-card::after {
            content:''; position:absolute; top:-40px; right:-40px; width:120px; height:120px;
            border-radius:50%; background:radial-gradient(circle,rgba(94,194,19,0.07),transparent 70%); pointer-events:none;
        }
        .stat-card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; }
        .stat-card-header h3 { font-size:0.72rem; font-weight:800; color:var(--text-3); text-transform:uppercase; letter-spacing:1px; }
        .stat-icon { width:38px; height:38px; border-radius:10px; background:rgba(94,194,19,0.1); border:1px solid rgba(94,194,19,0.2); display:flex; align-items:center; justify-content:center; font-size:0.9rem; color:var(--green); }
        .stat-value { font-size:2.25rem; font-weight:900; color:var(--green); letter-spacing:-1px; line-height:1; filter:drop-shadow(0 0 12px rgba(94,194,19,0.35)); }
        .stat-change { font-size:0.72rem; color:var(--text-3); margin-top:0.35rem; font-weight:600; }

        /* ═══ CARDS ═══ */
        .card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); padding:1.5rem; margin-bottom:1.5rem; animation:cardIn 0.5s ease both; transition:border-color 0.3s; }
        .card:hover { border-color:rgba(94,194,19,0.22); }
        .card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.375rem; padding-bottom:1rem; border-bottom:1px solid var(--border-2); flex-wrap:wrap; gap:0.75rem; }
        .card-header h3 { font-size:0.9375rem; font-weight:800; color:var(--text); display:flex; align-items:center; gap:0.5rem; letter-spacing:-0.2px; }
        .card-header h3 i { color:var(--green); font-size:0.875rem; }

        /* ═══ TABLES ═══ */
        .table-container { overflow-x:auto; overflow-y:auto; max-height:600px; border:1px solid var(--border); border-radius:12px; scrollbar-width:thin; -webkit-overflow-scrolling:touch; }
        .table-container::-webkit-scrollbar { width:5px; height:5px; }
        .table-container::-webkit-scrollbar-thumb { background:rgba(94,194,19,0.25); border-radius:10px; }
        table { width:100%; border-collapse:collapse; }
        thead { background:rgba(94,194,19,0.04); position:sticky; top:0; z-index:1; backdrop-filter:blur(10px); }
        th { padding:0.875rem 1rem; text-align:left; font-size:0.7rem; font-weight:800; color:var(--text-3); text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid var(--border); white-space:nowrap; }
        td { padding:0.875rem 1rem; color:var(--text-2); border-bottom:1px solid var(--border-2); font-size:0.875rem; transition:background 0.15s; }
        tr:hover td { background:rgba(94,194,19,0.03); color:var(--text); }
        tr:last-child td { border-bottom:none; }

        /* ═══ BUTTONS ═══ */
        .btn, button.btn {
            display:inline-flex; align-items:center; gap:0.45rem;
            padding:0.6rem 1.2rem; border-radius:10px; cursor:pointer; border:none;
            font-family:'Outfit',sans-serif; font-size:0.8375rem; font-weight:700;
            transition:all 0.25s cubic-bezier(0.4,0,0.2,1); text-decoration:none; white-space:nowrap;
        }
        .btn-primary { background:linear-gradient(135deg,var(--green),var(--green-dark)); color:#000; box-shadow:0 4px 16px rgba(94,194,19,0.3); }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(94,194,19,0.5); }
        .btn-secondary { background:rgba(255,255,255,0.06); color:var(--text-2); border:1px solid var(--border); }
        .btn-secondary:hover { background:rgba(255,255,255,0.1); color:var(--text); }
        .btn-danger { background:rgba(239,68,68,0.1); color:#f87171; border:1px solid rgba(239,68,68,0.3); }
        .btn-danger:hover { background:rgba(239,68,68,0.2); }
        .btn-warning { background:rgba(251,191,36,0.1); color:#fbbf24; border:1px solid rgba(251,191,36,0.3); }
        .btn-sm { padding:0.38rem 0.8rem; font-size:0.75rem; border-radius:8px; }
        .btn:disabled { opacity:0.5; cursor:not-allowed; transform:none !important; }

        /* ═══ FORMS ═══ */
        .form-group { margin-bottom:1.25rem; }
        .form-group label { display:block; font-size:0.72rem; font-weight:800; color:var(--text-3); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:0.45rem; }
        .form-group input, .form-group textarea, .form-group select {
            width:100%; padding:0.8rem 1rem;
            background:rgba(94,194,19,0.04); border:1.5px solid var(--border);
            border-radius:10px; color:var(--text); font-family:'Outfit',sans-serif; font-size:0.9rem; transition:all 0.25s;
        }
        .form-group input::placeholder, .form-group textarea::placeholder { color:var(--text-3); }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
            outline:none; border-color:var(--green); background:rgba(94,194,19,0.07); box-shadow:0 0 0 3px rgba(94,194,19,0.12);
        }
        .form-group textarea { resize:vertical; min-height:100px; }
        .form-group select { appearance:none; cursor:pointer; }
        .form-row { display:grid; grid-template-columns:1fr 1fr; gap:1.125rem; }

        /* ═══ BADGES ═══ */
        .badge { display:inline-flex; align-items:center; gap:0.3rem; padding:0.22rem 0.625rem; border-radius:50px; font-size:0.68rem; font-weight:800; letter-spacing:0.3px; text-transform:capitalize; }
        .badge-success { background:rgba(94,194,19,0.15); color:var(--green); border:1px solid rgba(94,194,19,0.3); }
        .badge-warning { background:rgba(251,191,36,0.12); color:#fbbf24; border:1px solid rgba(251,191,36,0.3); }
        .badge-danger  { background:rgba(239,68,68,0.12);  color:#f87171;  border:1px solid rgba(239,68,68,0.3); }
        .badge-info    { background:rgba(59,130,246,0.12); color:#60a5fa;  border:1px solid rgba(59,130,246,0.3); }
        .badge-neutral { background:rgba(255,255,255,0.07); color:var(--text-2); border:1px solid var(--border); }

        /* ═══ ALERTS ═══ */
        .alert { padding:0.875rem 1.125rem; border-radius:12px; margin-bottom:1.25rem; font-size:0.875rem; font-weight:600; display:none; animation:alertIn 0.3s ease both; }
        @keyframes alertIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .alert.show, .alert.active { display:flex; align-items:center; gap:0.5rem; }
        .alert-success { background:rgba(94,194,19,0.09); border:1px solid rgba(94,194,19,0.3); color:var(--green); }
        .alert-error   { background:rgba(239,68,68,0.09);  border:1px solid rgba(239,68,68,0.3);  color:#f87171; }
        .alert-warning { background:rgba(251,191,36,0.09); border:1px solid rgba(251,191,36,0.3); color:#fbbf24; }
        .alert-info    { background:rgba(59,130,246,0.09); border:1px solid rgba(59,130,246,0.3); color:#60a5fa; }

        /* ═══ CONTENT SECTIONS ═══ */
        .content-section { display:none; animation:fadeUp 0.4s ease both; }
        .content-section.active { display:block; }

        /* ═══ MODAL ═══ */
        .modal-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(6px); z-index:2000; align-items:center; justify-content:center; padding:1rem; }
        .modal-overlay.active { display:flex; }
        .modal-content { background:rgba(12,20,12,0.98); border:1px solid var(--border); border-radius:20px; padding:2rem; max-width:560px; width:100%; box-shadow:0 24px 80px rgba(0,0,0,0.5); animation:cardIn 0.35s ease both; max-height:90vh; overflow-y:auto; }
        .modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid var(--border); }
        .modal-header h3 { font-size:1.0625rem; font-weight:800; color:var(--text); letter-spacing:-0.3px; }
        .modal-close { width:32px; height:32px; border-radius:9px; border:1px solid var(--border); background:rgba(255,255,255,0.03); color:var(--text-2); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1rem; transition:all 0.2s; }
        .modal-close:hover { background:rgba(255,255,255,0.1); color:var(--text); transform:rotate(90deg); }

        /* ═══ MISC ═══ */
        option { color:#000; }
        .mobile-nav-toggle { display:none; }
        .spinner { display:inline-block; width:18px; height:18px; border:2px solid rgba(94,194,19,0.2); border-top-color:var(--green); border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }

        /* Search box */
        .search-box { display:flex; align-items:center; gap:0.5rem; background:rgba(94,194,19,0.04); border:1.5px solid var(--border); border-radius:10px; padding:0.6rem 1rem; transition:border-color 0.25s; }
        .search-box:focus-within { border-color:var(--green); }
        .search-box i { color:var(--text-3); font-size:0.8rem; }
        .search-box input { background:none; border:none; outline:none; color:var(--text); font-family:'Outfit',sans-serif; font-size:0.875rem; width:100%; }
        .search-box input::placeholder { color:var(--text-3); }

        /* Admin toast */
        .admin-toast { position:fixed; top:1.5rem; right:1.5rem; z-index:9999; padding:0.875rem 1.25rem; border-radius:14px; min-width:260px; font-size:0.875rem; font-weight:600; font-family:'Outfit',sans-serif; box-shadow:0 12px 40px rgba(0,0,0,0.4); display:flex; align-items:center; gap:0.625rem; animation:toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes toastIn { from{opacity:0;transform:translateX(80px)} to{opacity:1;transform:translateX(0)} }
        .admin-toast--success { background:rgba(10,18,10,0.97); border:1px solid rgba(94,194,19,0.4); color:var(--green); }
        .admin-toast--error   { background:rgba(20,10,10,0.97); border:1px solid rgba(239,68,68,0.4);  color:#f87171; }

        /* ═══ RESPONSIVE ═══ */
        @media (max-width:900px) {
            .admin-navbar { transform:translateX(-100%) !important; }
            .mobile-dropdown { display:flex !important; }
            .admin-topbar { display:flex !important; }
            .main-content { margin-left:0 !important; padding:1.25rem 1rem; padding-top:calc(56px + 1.25rem); }
            .mobile-nav-toggle { display:none; }
            .form-row { grid-template-columns:1fr; }
            .stats-grid { grid-template-columns:repeat(2,1fr); }
        }
        @media (max-width:520px) {
            .stats-grid { grid-template-columns:1fr; }
            .card { padding:1.125rem; }
        }
    </style>`;

// New navbar HTML
const newNav = `    <!-- Overlay -->
    <div class="asb-overlay" id="asbOverlay" onclick="closeMobileNav()"></div>

    <!-- Sidebar -->
    <nav class="admin-navbar" id="adminSidebar">
        <div class="navbar-logo">
            <h1>ONBOARD3</h1>
            <span class="admin-badge">ADMIN</span>
        </div>
        <div class="navbar-menu" id="navbarMenu">
            <div class="nav-section-label">Dashboard</div>
            <a class="menu-item active" data-tab="overview"><i class="fas fa-chart-line"></i><span>Overview</span></a>
            <a class="menu-item" data-tab="users"><i class="fas fa-users"></i><span>Users</span></a>
            <a class="menu-item" data-tab="withdrawals"><i class="fas fa-wallet"></i><span>Withdrawals</span></a>

            <div class="nav-section-label">Content</div>
            <a class="menu-item" data-tab="quests"><i class="fas fa-trophy"></i><span>Quests</span></a>
            <a class="menu-item" data-tab="events"><i class="fas fa-calendar-alt"></i><span>Events</span></a>
            <a class="menu-item" data-tab="projects"><i class="fas fa-rocket"></i><span>Projects</span></a>

            <div class="nav-section-label">Community</div>
            <a class="menu-item" data-tab="applications"><i class="fas fa-graduation-cap"></i><span>Applications</span></a>
            <a class="menu-item" data-tab="ambassadors"><i class="fas fa-building-columns"></i><span>Campus</span></a>
            <a class="menu-item" data-tab="banned-users"><i class="fas fa-user-slash"></i><span>Banned Users</span></a>

            <div class="nav-section-label">Tools</div>
            <a class="menu-item" data-tab="quiz"><i class="fas fa-gamepad"></i><span>Quiz</span></a>
            <a class="menu-item" href="/admin/partners"><i class="fas fa-handshake"></i><span>Partners</span></a>
            <a class="menu-item" href="/admin/leaderboard"><i class="fas fa-ranking-star"></i><span>Leaderboard</span></a>
        </div>
        <div class="sidebar-footer">
            <div class="sidebar-footer-avatar"><i class="fas fa-shield-halved" style="font-size:.875rem"></i></div>
            <div class="sidebar-footer-info">
                <div class="sidebar-footer-name"><%= admin ? admin.username : 'Admin' %></div>
                <div class="sidebar-footer-role">Super Admin</div>
            </div>
            <a href="/" class="sidebar-exit" title="Exit Admin"><i class="fas fa-right-from-bracket"></i></a>
        </div>
    </nav>

    <!-- Mobile top bar -->
    <div class="admin-topbar" id="adminTopbar">
        <button class="admin-topbar-toggle" onclick="toggleMobileNav()"><i class="fas fa-bars"></i></button>
        <span class="admin-topbar-title">ONBOARD3</span>
        <span class="admin-topbar-badge">ADMIN</span>
    </div>

    <!-- Mobile sidebar (keeps mobileDropdown id for JS compat) -->
    <div class="mobile-dropdown" id="mobileDropdown">
        <button class="mobile-close-btn" onclick="closeMobileNav()"><i class="fas fa-times"></i></button>
        <div class="nav-section-label">Dashboard</div>
        <a class="menu-item active" data-tab="overview"><i class="fas fa-chart-line"></i><span>Overview</span></a>
        <a class="menu-item" data-tab="users"><i class="fas fa-users"></i><span>Users</span></a>
        <a class="menu-item" data-tab="withdrawals"><i class="fas fa-wallet"></i><span>Withdrawals</span></a>
        <div class="nav-section-label">Content</div>
        <a class="menu-item" data-tab="quests"><i class="fas fa-trophy"></i><span>Quests</span></a>
        <a class="menu-item" data-tab="events"><i class="fas fa-calendar-alt"></i><span>Events</span></a>
        <a class="menu-item" data-tab="projects"><i class="fas fa-rocket"></i><span>Projects</span></a>
        <div class="nav-section-label">Community</div>
        <a class="menu-item" data-tab="applications"><i class="fas fa-graduation-cap"></i><span>Applications</span></a>
        <a class="menu-item" data-tab="ambassadors"><i class="fas fa-building-columns"></i><span>Campus</span></a>
        <a class="menu-item" data-tab="banned-users"><i class="fas fa-user-slash"></i><span>Banned Users</span></a>
        <div class="nav-section-label">Tools</div>
        <a class="menu-item" data-tab="quiz"><i class="fas fa-gamepad"></i><span>Quiz</span></a>
        <a class="menu-item" href="/admin/partners"><i class="fas fa-handshake"></i><span>Partners</span></a>
        <a class="menu-item" href="/admin/leaderboard"><i class="fas fa-ranking-star"></i><span>Leaderboard</span></a>
    </div>

`;

// Replace CSS
const styleStart = content.indexOf('    <style>');
const styleEnd   = content.indexOf('    </style>') + '    </style>'.length;
content = content.slice(0, styleStart) + newCSS + content.slice(styleEnd);

// Replace navbar
const navStart = content.indexOf('    <!-- Top Navigation Bar -->');
const navEnd   = content.indexOf('    <div class="admin-container">');
content = content.slice(0, navStart) + newNav + content.slice(navEnd);

fs.writeFileSync('c:/Users/admin/Desktop/onboarder/views/admin/dashboard.ejs', content, 'utf8');
console.log('Done. Lines:', content.split('\n').length);
