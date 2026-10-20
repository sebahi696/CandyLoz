/* Daftar — app shell: session, permissions, feature flags, navigation, login, dashboard, Hunters platform */
window.Screens = window.Screens || {};
window.App = (() => {
  const { t, money, fmtDateShort, weekday } = I18N;
  const S = Store; const U = UI; const { $, $$, esc, L, icon } = U;

  let session = null; try { session = JSON.parse(sessionStorage.getItem('daftar.session') || 'null'); } catch (e) { session = null; }
  let db = null;
  const platform = () => S.getPlatform();
  const lastTenant = () => { try { return localStorage.getItem('daftar.lastTenant'); } catch (e) { return null; } };
  const tenantId = () => (session && session.tenant) || lastTenant() || 'candyloz';
  const tenant = () => platform().tenants.find(x => x.id === tenantId()) || platform().tenants[0];
  const isSuper = () => !!(session && session.super);
  const user = () => isSuper() ? { id: 'sa', name: platform().superadmins[0].name, nameEn: platform().superadmins[0].nameEn, role: 'superadmin' } : (db && session ? db.users.find(u => u.id === session.userId) : null);
  const role = () => (user() || {}).role || 'operator';
  const feat = (k) => !k || (tenant().features || {})[k] !== false;
  const permFeature = Object.fromEntries(S.PERMS.map(p => [p.key, p.f]));
  function can(p) {
    if (!p) return true; if (Array.isArray(p)) return p.some(can);
    if (!feat(permFeature[p])) return false;
    if (isSuper() || role() === 'admin') return true;
    return ((db && db.roles) ? db.roles[role()] || [] : []).includes(p);
  }
  const userName = (u) => u ? (I18N.getLang() === 'ar' ? u.name : (u.nameEn || u.name)) : '—';
  const save = () => S.save(tenantId());
  const commit = (msg) => { save(); if (msg) U.toast(msg); render(); };
  const setSession = (s) => { session = s; if (s) sessionStorage.setItem('daftar.session', JSON.stringify(s)); else sessionStorage.removeItem('daftar.session'); };

  // ---------------------------------------------------------------- navigation model
  const NAV = [
    { id: 'home', icon: 'home', label: 'nav_home', perm: 'dashboard' },
    { group: 'g_sales', items: [
      { id: 'sales', icon: 'sales', label: 'nav_sales', perm: ['import_sales', 'manual_sales'] },
      { id: 'eod', icon: 'eod', label: 'nav_eod', perm: 'eod_close' },
      { id: 'customers', icon: 'customers', label: 'nav_customers', perm: 'customers' }] },
    { group: 'g_purchases', items: [
      { id: 'suppliers', icon: 'suppliers', label: 'nav_suppliers', perm: 'suppliers' },
      { id: 'purchases', icon: 'purchases', label: 'nav_purchases', perm: 'purchases' },
      { id: 'expenses', icon: 'expenses', label: 'nav_expenses', perm: 'expenses' }] },
    { group: 'g_accounting', items: [
      { id: 'coa', icon: 'coa', label: 'nav_coa', perm: 'coa_view' },
      { id: 'journal', icon: 'journal', label: 'nav_journal', perm: 'journal_view' },
      { id: 'receipts', icon: 'receipts', label: 'nav_receipts', perm: 'vouchers', f: 'receipts' },
      { id: 'payments', icon: 'payments', label: 'nav_payments', perm: 'vouchers', f: 'payments' },
      { id: 'transfers', icon: 'transfers', label: 'nav_transfers', perm: 'vouchers', f: 'transfers' },
      { id: 'assets', icon: 'assets', label: 'nav_assets', perm: 'assets' },
      { id: 'paymethods', icon: 'paymethods', label: 'nav_paymethods', perm: 'paymethods' }] },
    { group: 'g_reports', items: [{ id: 'reports', icon: 'reports', label: 'nav_reports', perm: 'reports' }] },
    { group: 'g_settings', items: [
      { id: 'settings', icon: 'settings', label: 'nav_settings', perm: 'settings' },
      { id: 'branches', icon: 'branches', label: 'nav_branches', perm: 'settings', f: 'multi_branch' },
      { id: 'users', icon: 'users', label: 'nav_users', perm: 'users' },
      { id: 'roles', icon: 'roles', label: 'nav_roles', perm: 'users' },
      { id: 'company', icon: 'company', label: 'nav_company', perm: 'settings' }] },
  ];
  const allItems = () => NAV.flatMap(n => n.items || [n]);
  const allowed = (it) => can(it.perm) && feat(it.f);
  const itemById = (id) => allItems().find(i => i.id === id);
  function openDays() {
    const out = []; if (!db || !feat('eod')) return out; const t0 = S.todayISO();
    for (let d = 7; d >= 1; d--) { const date = S.addDays(t0, -d); for (const b of db.branches) if (S.daySales(db, date, b.id).n > 0 && !S.isClosed(db, date, b.id)) out.push({ date, branch: b.id }); }
    return out;
  }
  function badge(id) {
    if (!db) return 0;
    if (id === 'eod') return openDays().length;
    if (id === 'purchases') return db.supplierInvoices.filter(i => i.status === 'draft').length;
    return 0;
  }

  // ---------------------------------------------------------------- routing
  function route() { const h = location.hash.replace(/^#\/?/, ''); const [path, ...rest] = h.split('/'); return { path: path || 'home', args: rest.map(decodeURIComponent) }; }
  function go(path) { if (location.hash === '#/' + path) render(); else location.hash = '#/' + path; }
  window.addEventListener('hashchange', () => { U.closeSheet(true); render(); window.scrollTo(0, 0); });

  // ---------------------------------------------------------------- shell
  function render() {
    const app = $('#app');
    if (!session) { db = S.load(tenantId()); app.innerHTML = renderLogin(); bindLogin(app); return; }
    if (!isSuper() && !feat('english') && I18N.getLang() !== 'ar') I18N.setLang('ar');
    if (isSuper() && !session.tenant) { db = null; renderShell(app, 'platform', []); return; }
    db = S.load(tenantId());
    if (!isSuper() && !user()) { signOut(); return; }
    if (!isSuper() && !tenant().active) { app.innerHTML = `<div class="login">${U.logo}<div class="notice bad">${icon('lock')}<span>${esc(t('tenant_inactive'))}</span></div><button class="btn secondary sm" data-out>${esc(t('signout'))}</button></div>`; $('[data-out]', app).onclick = signOut; return; }
    const r = route(); let screen = r.path;
    const it = itemById(screen);
    if (screen === 'platform' && !isSuper()) screen = 'home';
    else if (it && !allowed(it)) screen = 'denied';
    else if (!it && !['more', 'platform', 'denied'].includes(screen)) screen = 'home';
    if (screen === 'home' && !can('dashboard')) { const first = allItems().find(allowed); screen = first ? first.id : 'more'; }
    renderShell(app, screen, r.args);
  }
  function navHtml(active) {
    if (!db) return `<div class="navgroup"><div class="navlabel">${esc(t('g_platform'))}</div>${navItem({ id: 'platform', icon: 'platform', label: 'nav_platform' }, active)}</div>`;
    let h = '';
    for (const n of NAV) {
      if (!n.group) { if (allowed(n)) h += navItem(n, active); continue; }
      const items = n.items.filter(allowed); if (!items.length) continue;
      h += `<div class="navgroup"><div class="navlabel">${esc(t(n.group))}</div>${items.map(i => navItem(i, active)).join('')}</div>`;
    }
    if (isSuper()) h += `<div class="navgroup"><div class="navlabel">${esc(t('g_platform'))}</div>${navItem({ id: 'platform', icon: 'platform', label: 'nav_platform' }, active)}</div>`;
    return h;
  }
  const navItem = (i, active) => { const b = badge(i.id); return `<button class="tab ${active === i.id ? 'active' : ''}" data-go="${i.id}">${icon(i.icon)}<span>${esc(t(i.label))}</span>${b ? `<span class="badge">${b}</span>` : ''}</button>`; };
  function mobileTabs(active) {
    let list;
    if (!db) list = [['platform', 'nav_platform', 'platform']];
    else list = [['home', 'tab_home', 'home'], ['sales', 'tab_sales', 'sales'], ['purchases', 'tab_purchases', 'purchases'], ['eod', 'tab_eod', 'eod'], ['reports', 'nav_reports', 'reports'], ['journal', 'nav_journal', 'journal']].filter(([id]) => { const it = itemById(id); return it && allowed(it); }).slice(0, 4);
    return list.map(([id, label, ic]) => { const b = badge(id); return `<button class="tab ${active === id ? 'active' : ''}" data-go="${id}">${icon(ic)}<span>${esc(t(label))}</span>${b ? `<span class="badge">${b}</span>` : ''}</button>`; }).join('') + `<button class="tab ${active === 'more' ? 'active' : ''}" data-go="more">${icon('more')}<span>${esc(t('nav_more'))}</span></button>`;
  }
  function renderShell(app, screen, args) {
    const tn = tenant();
    const it = itemById(screen); const title = screen === 'platform' ? t('nav_platform') : screen === 'more' ? t('nav_more') : it ? t(it.label) : '';
    const companyLabel = db ? L({ ar: db.company.name, en: db.company.nameEn }) : 'Hunters';
    app.innerHTML = `
      <div class="app">
        <nav class="rail" aria-label="nav"><div class="brand">${U.logo}<div><b>${esc(t('app'))}</b><small>${esc(companyLabel)}</small></div></div>
          ${isSuper() && session.tenant ? `<button class="superbar" data-go="platform">${icon('platform')}<span>${esc(t('viewing_as'))}<b>${esc(L(tn))}</b></span></button>` : ''}
          <div class="railnav">${navHtml(screen)}</div>
          <div class="who"><span class="avatar sm">${esc(U.initials(userName(user())))}</span><div class="grow"><b>${esc(userName(user()))}</b><span class="muted">${esc(t('role_' + role()))}</span></div><button class="iconbtn sm" data-out title="${esc(t('signout'))}" aria-label="${esc(t('signout'))}">${icon('logout')}</button></div></nav>
        <div class="content">
          <header class="topbar"><h1 id="title">${esc(title)}</h1>${isSuper() && session.tenant ? `<button class="langbtn m-only" data-go="platform" aria-label="${esc(t('back_to_platform'))}">${icon('platform')}</button>` : ''}${feat('english') || isSuper() ? `<button class="langbtn" data-lang>${I18N.getLang() === 'ar' ? 'EN' : 'عربي'}</button>` : ''}<button class="iconbtn" data-go="more" aria-label="${esc(t('nav_more'))}">${icon('users')}</button></header>
          <main id="main"></main>
        </div>
      </div>
      <nav class="tabbar">${mobileTabs(screen)}</nav>`;
    $$('[data-go]', app).forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
    $$('[data-out]', app).forEach(b => b.addEventListener('click', signOut));
    const lb = $('[data-lang]', app); if (lb) lb.addEventListener('click', () => { I18N.setLang(I18N.getLang() === 'ar' ? 'en' : 'ar'); render(); });
    const main = $('#main');
    const fn = screen === 'home' ? screenHome : screen === 'more' ? screenMore : screen === 'platform' ? screenPlatform : screen === 'denied' ? (m) => { m.innerHTML = U.empty(t('no_access')); } : Screens[screen];
    try { (fn || screenHome)(main, args || []); } catch (e) { console.error(e); main.innerHTML = `<div class="notice bad">${icon('alert')}<span>${esc(e.message)}</span></div>`; }
  }
  const setTitle = (txt, backTo) => { const h = $('#title'); if (!h) return; h.innerHTML = (backTo ? `<button class="iconbtn back" data-back aria-label="${esc(t('back'))}">${icon('back')}</button>` : '') + esc(txt); if (backTo) $('[data-back]', h).onclick = () => go(backTo); };
  function signOut() { setSession(null); location.hash = '#/home'; render(); }

  // ---------------------------------------------------------------- login
  function renderLogin() {
    const p = platform(); const tn = tenant();
    const roleHint = { admin: 'role_admin_desc', accountant: 'role_accountant_desc', operator: 'role_operator_desc' };
    return `<div class="login">
      <button class="langbtn lang" data-lang>${I18N.getLang() === 'ar' ? 'EN' : 'عربي'}</button>
      <div class="mark">${U.logo}<h1>${esc(t('app'))}</h1><p>${esc(t('tagline'))}</p></div>
      ${p.tenants.length > 1 ? `<div class="chips center">${p.tenants.map(x => `<button class="chip ${x.id === tn.id ? 'active' : ''}" data-tenant="${x.id}">${esc(L(x))}</button>`).join('')}</div>` : `<p class="muted strong">${esc(L(tn))}</p>`}
      <h2 class="login-h">${esc(t('login_title'))}</h2>
      <div class="users">${db.users.filter(u => u.active).map(u => `<button class="row" data-user="${u.id}"><span class="avatar">${esc(U.initials(userName(u)))}</span><span class="main"><span class="t">${esc(userName(u))}</span><span class="m">${esc(t(roleHint[u.role] || 'role_operator_desc'))}${u.branch ? ' · ' + esc(L(db.branches.find(b => b.id === u.branch))) : ''}</span></span>${U.pill(t('role_' + u.role), u.role === 'admin' ? 'info' : u.role === 'accountant' ? 'good' : 'neutral')}</button>`).join('')}</div>
      <button class="row superrow" data-super>${icon('platform')}<span class="main"><span class="t">${esc(t('platform_login'))}</span><span class="m">${esc(t('byHunters'))}</span></span>${icon('chevron')}</button>
      <p class="small muted center">${esc(t('login_hint'))}</p></div>`;
  }
  function pinSheet(title, check, onOk) {
    U.openSheet({ title, body: `<form id="pinform">${U.field(t('pin'), `<input class="input pin" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="one-time-code">`)}<div class="err hidden" id="pinerr">${esc(t('wrongPin'))}</div><button class="btn primary" type="submit">${esc(t('signin'))}</button></form>`, onMount: (s) => {
      const f = $('#pinform', s); setTimeout(() => $('[name=pin]', f).focus(), 250);
      f.addEventListener('submit', (e) => { e.preventDefault(); if (check(U.formData(f).pin)) { U.closeSheet(true); onOk(); } else { $('#pinerr', f).classList.remove('hidden'); $('[name=pin]', f).value = ''; } });
    } });
  }
  function bindLogin(app) {
    $('[data-lang]', app).addEventListener('click', () => { I18N.setLang(I18N.getLang() === 'ar' ? 'en' : 'ar'); render(); });
    $$('[data-tenant]', app).forEach(b => b.addEventListener('click', () => { localStorage.setItem('daftar.lastTenant', b.dataset.tenant); render(); }));
    $$('[data-user]', app).forEach(b => b.addEventListener('click', () => { const u = db.users.find(x => x.id === b.dataset.user); pinSheet(userName(u), (p) => p === u.pin, () => { setSession({ tenant: tenantId(), userId: u.id }); location.hash = '#/home'; render(); }); }));
    $('[data-super]', app).addEventListener('click', () => pinSheet(t('platform_login'), (p) => platform().superadmins.some(s => s.pin === p), () => { setSession({ super: true, tenant: null }); location.hash = '#/platform'; render(); }));
  }

  // ---------------------------------------------------------------- dashboard
  function screenHome(main) {
    const t0 = S.todayISO(), y0 = S.addDays(t0, -1), m0 = t0.slice(0, 8) + '01';
    const td = S.daySales(db, t0), yd = S.daySales(db, y0);
    const delta = yd.total ? (td.total - yd.total) / yd.total * 100 : null;
    const open = openDays(); const drafts = db.supplierInvoices.filter(i => i.status === 'draft');
    const weekEnd = S.addDays(t0, 7);
    const dueWeek = db.supplierInvoices.filter(i => i.status === 'posted' && i.paid < i.total && i.due && i.due <= weekEnd).reduce((a, i) => a + i.total - i.paid, 0);
    const notImported = db.branches.filter(b => S.daySales(db, t0, b.id).n === 0);
    const colors = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)'];
    const byBranch = db.branches.map((b, i) => ({ b, v: S.daySales(db, t0, b.id).total, c: colors[i % 4] }));
    const spark = []; let max = 1;
    for (let d = 13; d >= 0; d--) { const date = S.addDays(t0, -d); const v = S.daySales(db, date).total; max = Math.max(max, v); spark.push({ date, v, dow: new Date(date + 'T00:00:00').getDay() }); }
    let kpis = '';
    if (can('reports')) {
      const is = S.incomeStatement(db, { from: m0, to: t0, level: 1 }); const cash = S.accountBalance(db, '1101', { to: t0 }); const ap = -S.accountBalance(db, db.sys.apGroup, { to: t0 });
      const ms = S.salesReport(db, { from: m0, to: t0 }).total;
      kpis = `<div class="kpis">
        <a class="kpi" href="#/reports/sales"><span class="k">${esc(t('month_sales'))}</span><span class="v money">${money(ms, { whole: true })}</span></a>
        <a class="kpi" href="#/reports/is"><span class="k">${esc(t('month_profit'))}</span><span class="v money ${is.net < 0 ? 'neg' : ''}">${money(is.net, { whole: true, paren: true })}</span></a>
        <a class="kpi" href="#/reports/cash"><span class="k">${esc(t('cash_position'))}</span><span class="v money">${money(cash, { whole: true })}</span></a>
        <a class="kpi" href="#/reports/supbal"><span class="k">${esc(t('suppliers'))} · ${esc(t('we_owe'))}</span><span class="v money">${money(ap, { whole: true })}</span></a></div>`;
    }
    const att = [];
    if (open.length) att.push(`<a class="tile warn" href="#/eod"><span class="k">${esc(t('days_not_closed'))}</span><span class="v">${open.length}</span></a>`);
    if (drafts.length && can('purchases')) att.push(`<a class="tile warn" href="#/purchases"><span class="k">${esc(t('unposted_invoices'))}</span><span class="v">${drafts.length}</span></a>`);
    if (dueWeek > 0 && can('purchases')) att.push(`<a class="tile" href="#/purchases"><span class="k">${esc(t('due_this_week'))}</span><span class="v money">${money(dueWeek, { whole: true })}</span></a>`);
    if (notImported.length && can('import_sales')) att.push(`<a class="tile bad" href="#/sales"><span class="k">${esc(t('no_sales_today'))}</span><span class="v small-v">${esc(notImported.map(b => L(b)).join(' · '))}</span></a>`);
    const quick = [
      can('import_sales') && `<button data-go="sales">${icon('upload')}${esc(t('q_import'))}</button>`,
      can('purchases') && feat('ocr') && `<button data-act="scan">${icon('camera')}${esc(t('q_scan'))}</button>`,
      can('eod_close') && `<button data-go="eod">${icon('eod')}${esc(t('q_eod'))}</button>`,
      can('expenses') && `<button data-go="expenses/new">${icon('expenses')}${esc(t('q_expense'))}</button>`,
      can('vouchers') && feat('receipts') && `<button data-go="receipts/new">${icon('receipts')}${esc(t('q_receipt'))}</button>`,
      can('vouchers') && feat('payments') && `<button data-go="payments/new">${icon('payments')}${esc(t('q_payment'))}</button>`,
      can('journal') && `<button data-go="journal/new">${icon('journal')}${esc(t('q_journal'))}</button>`,
      can('reports') && `<button data-go="reports">${icon('reports')}${esc(t('nav_reports'))}</button>`,
    ].filter(Boolean).slice(0, 6).join('');
    const due = db.supplierInvoices.filter(i => i.status === 'posted' && i.paid < i.total - 0.005).sort((x, y) => (x.due || x.date).localeCompare(y.due || y.date)).slice(0, 7);
    main.innerHTML = `${kpis}<div class="home">
      <div class="card hero a-hero">
        <div class="label">${esc(t('sales_today'))} · ${esc(weekday(t0))} ${esc(fmtDateShort(t0))}</div>
        <div class="big"><span class="money">${money(td.total)}</span><span class="cur">${esc(t('sar'))} · ${esc(t('incl_vat'))}</span></div>
        ${delta !== null ? `<div class="delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} <span class="num">${Math.abs(delta).toFixed(1)}%</span> ${esc(t('vs_yesterday'))} · ${esc(t('invoices_n', { n: td.n }))}</div>` : ''}
        <div class="spark" aria-hidden="true">${spark.map(s => `<span class="${s.date === t0 ? 'today' : ''} ${s.dow === 5 || s.dow === 4 ? 'weekend' : ''}" style="height:${Math.max(4, s.v / max * 100)}%" title="${s.date}: ${money(s.v)}"></span>`).join('')}</div>
        <div class="stack">${byBranch.map(x => td.total ? `<span style="width:${x.v / td.total * 100}%;background:${x.c}"></span>` : '').join('')}</div>
        <div class="legend">${byBranch.map(x => `<span><i style="background:${x.c}"></i>${esc(L(x.b))} <b>${money(x.v, { whole: true })}</b></span>`).join('')}</div>
        <div class="tablewrap d-only" style="margin-top:14px"><table class="tbl compact">${U.th([{ l: t('branch') }, { l: t('invoices'), r: 1 }, { l: t('m_cash'), r: 1 }, { l: t('cards'), r: 1 }, { l: t('total'), r: 1 }, { l: t('nav_eod') }])}<tbody>${db.branches.map(b => { const d = S.daySales(db, t0, b.id); const closed = S.isClosed(db, t0, b.id); return `<tr><td>${esc(L(b))}</td><td class="money">${d.n}</td><td class="money">${money(d.byMethod.cash || 0)}</td><td class="money">${money(d.total - (d.byMethod.cash || 0))}</td><td class="money strong">${money(d.total)}</td><td>${d.n === 0 ? U.pill(t('not_imported'), 'bad') : closed ? U.pill(t('day_closed'), 'good') : U.pill(t('status_open'), 'warn')}</td></tr>`; }).join('')}</tbody></table></div>
      </div>
      <div class="section a-att"><h2>${esc(t('needs_attention'))}</h2>${att.length ? `<div class="tiles">${att.join('')}</div>` : `<div class="notice good">${icon('check')}<span>${esc(t('all_clear'))}</span></div>`}</div>
      <div class="section a-quick"><div class="quick">${quick}</div></div>
      <div class="section a-pay"><h2>${esc(t('by_payment'))}</h2><div class="card">${Object.entries(td.byMethod).sort((a, b) => b[1] - a[1]).map(([m, v]) => `<div class="kv"><span class="k">${esc(t('m_' + m))}</span><span class="v money">${money(v)}</span></div>`).join('') || U.empty(t('no_sales_today'))}</div></div>
      ${can('purchases') ? `<div class="section a-due"><h2>${esc(t('upcoming_payments'))}</h2>${due.length ? `<div class="tablewrap"><table class="tbl compact">${U.th([{ l: t('supplier') }, { l: t('due_date') }, { l: t('remaining'), r: 1 }])}<tbody>${due.map(i => { const st = S.invoiceStatus(i); return `<tr class="click" data-inv="${i.id}"><td class="strong">${esc(supName(i.supplierId))}</td><td class="num ${st === 'overdue' ? 'bad-t' : ''}">${i.due || ''}${st === 'overdue' ? ' · ' + esc(t('st_overdue')) : ''}</td><td class="money">${money(i.total - i.paid)}</td></tr>`; }).join('')}</tbody></table></div>` : `<div class="notice good">${icon('check')}<span>${esc(t('all_clear'))}</span></div>`}</div>` : ''}
      </div><p class="small muted center" style="margin-top:20px">${esc(t('demo_banner'))}</p>`;
    $$('[data-go]', main).forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
    $$('[data-act=scan]', main).forEach(b => b.addEventListener('click', () => Screens.invoiceForm({ scan: true })));
    $$('[data-inv]', main).forEach(r => r.addEventListener('click', () => Screens.invoiceSheet(r.dataset.inv)));
  }

  // ---------------------------------------------------------------- more (mobile hub + preferences)
  function screenMore(main) {
    const u = user(); const theme = (() => { try { return localStorage.getItem('daftar.theme') || 'auto'; } catch (e) { return 'auto'; } })();
    const groups = db ? NAV.filter(n => n.group).map(n => ({ n, items: n.items.filter(allowed) })).filter(g => g.items.length) : [];
    main.innerHTML = `<div class="cols eq"><div>
      <div class="card userbox"><span class="avatar">${esc(U.initials(userName(u)))}</span><div class="grow"><div class="strong">${esc(userName(u))}</div><div class="small muted">${esc(t('role_' + role()))}${u.branch && db ? ' · ' + esc(branchName(u.branch)) : ''}${db ? ' · ' + esc(L({ ar: db.company.name, en: db.company.nameEn })) : ''}</div></div><button class="btn secondary sm" data-out>${esc(t('signout'))}</button></div>
      ${isSuper() ? `<div class="section"><button class="row" data-go="platform">${icon('platform')}<span class="main"><span class="t">${esc(t('nav_platform'))}</span><span class="m">${esc(t('back_to_platform'))}</span></span>${icon('chevron')}</button></div>` : ''}
      ${feat('english') || isSuper() ? `<div class="section"><h2>${esc(t('language'))}</h2>${U.seg('lang', [{ v: 'ar', l: 'العربية' }, { v: 'en', l: 'English' }], I18N.getLang())}</div>` : ''}
      <div class="section"><h2>${esc(t('theme'))}</h2>${U.seg('theme', ['auto', 'light', 'dark'].map(x => ({ v: x, l: t('theme_' + x) })), theme)}</div>
      ${db && feat('backup') && can('settings') ? `<div class="section"><h2>${esc(t('backup'))}</h2><div class="actions-inline"><button class="btn secondary sm" data-export>${icon('download')}${esc(t('export_backup'))}</button><label class="btn secondary sm" for="bkfile">${icon('upload')}${esc(t('import_backup'))}</label><input id="bkfile" type="file" accept="application/json" class="sr"><button class="btn sm danger" data-reset>${esc(t('reset_demo'))}</button></div><div id="confirm" style="margin-top:10px"></div></div>` : ''}
      </div><div class="m-only">${groups.map(g => `<div class="section"><h2>${esc(t(g.n.group))}</h2><div class="list">${g.items.map(i => `<button class="row" data-go="${i.id}">${icon(i.icon)}<span class="main"><span class="t">${esc(t(i.label))}</span></span>${badge(i.id) ? U.pill(badge(i.id), 'warn') : ''}${icon('chevron')}</button>`).join('')}</div></div>`).join('')}</div></div>
      <p class="small muted center" style="margin-top:28px">${esc(t('app'))} · ${esc(t('byHunters'))} · v0.2</p>`;
    $$('[data-go]', main).forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
    $('[data-out]', main).addEventListener('click', signOut);
    U.bindSeg(main, 'lang', (v) => { I18N.setLang(v); render(); });
    U.bindSeg(main, 'theme', (v) => applyTheme(v));
    const ex = $('[data-export]', main); if (ex) ex.addEventListener('click', () => U.download(`daftar-${tenantId()}-${S.todayISO()}.json`, JSON.stringify(db), 'application/json'));
    const bk = $('#bkfile', main); if (bk) bk.addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; try { const o = JSON.parse(await f.text()); if (o.version === 2 && o.journal) { S.replace(tenantId(), o); commit(t('done')); } else U.toast(t('read_failed'), 'bad'); } catch (er) { U.toast(t('read_failed'), 'bad'); } });
    const rs = $('[data-reset]', main); if (rs) rs.addEventListener('click', () => U.confirmInline($('#confirm', main), t('reset_confirm'), () => { S.resetTenant(tenantId()); U.toast(t('done')); if (!isSuper()) signOut(); else render(); }));
  }
  function applyTheme(x) { try { localStorage.setItem('daftar.theme', x); } catch (e) { /* ignore */ } if (x === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', x); }

  // ---------------------------------------------------------------- Hunters platform (super admin)
  function screenPlatform(main) {
    const p = platform();
    main.innerHTML = `<p class="muted lead">${esc(t('platform_hint'))}</p>
      <div class="toolbar"><h2 class="h2">${esc(t('clients'))}</h2><button class="btn primary sm" data-add>${icon('plus')}${esc(t('add_client'))}</button></div>
      <div class="client-grid">${p.tenants.map(x => { const tdb = S.load(x.id); const on = S.FEATURES.filter(f => x.features[f.key] !== false).length; return `<div class="card client"><div class="client-h"><span class="avatar">${esc(U.initials(L(x)))}</span><div class="grow"><b>${esc(L(x))}</b><div class="small muted num">${esc(x.id)}${x.vat ? ' · ' + esc(x.vat) : ''}</div></div>${U.pill(t(x.active ? 'active' : 'inactive'), x.active ? 'good' : 'bad')}</div>
        <div class="kv"><span class="k">${esc(t('plan'))}</span><span class="v">${esc(t('plan_' + x.plan))}</span></div>
        <div class="kv"><span class="k">${esc(t('features'))}</span><span class="v num">${on} / ${S.FEATURES.length}</span></div>
        <div class="kv"><span class="k">${esc(t('limits'))}</span><span class="v">${esc(t('users_n', { n: tdb.users.length + '/' + x.limits.users }))} · ${esc(t('branches_n', { n: tdb.branches.length + '/' + x.limits.branches }))}</span></div>
        <div class="btnrow"><button class="btn primary sm" data-open="${x.id}">${esc(t('open_as_admin'))}</button><button class="btn secondary sm" data-manage="${x.id}">${icon('settings')}${esc(t('features'))}</button></div></div>`; }).join('')}</div>`;
    S.load(tenantId());
    $('[data-add]', main).addEventListener('click', addClientSheet);
    $$('[data-open]', main).forEach(b => b.addEventListener('click', () => { setSession({ ...session, tenant: b.dataset.open }); try { localStorage.setItem('daftar.lastTenant', b.dataset.open); } catch (e) { /* ignore */ } location.hash = '#/home'; render(); }));
    $$('[data-manage]', main).forEach(b => b.addEventListener('click', () => manageClient(b.dataset.manage)));
  }
  function manageClient(id) {
    const x = platform().tenants.find(y => y.id === id);
    const groups = ['sales', 'purchases', 'accounting', 'reports', 'platform'];
    U.openSheet({ title: L(x), xwide: true, body: `<form id="cf">
      <div class="grid3">${U.field(t('plan'), U.sel('plan', ['starter', 'pro', 'enterprise'].map(v => ({ v, l: t('plan_' + v) })), x.plan))}${U.field(t('max_users'), U.inp('users', x.limits.users, 'type="number" min="1" dir="ltr"'))}${U.field(t('max_branches'), U.inp('branches', x.limits.branches, 'type="number" min="1" dir="ltr"'))}</div>
      <label class="featrow strong">${esc(t('status'))}: ${esc(t('active'))} ${U.toggle('active', x.active)}</label>
      <div class="toolbar" style="margin-top:14px"><h3 class="h3">${esc(t('features'))}</h3><button type="button" class="btn ghost sm" data-all>${esc(t('enable_all'))}</button></div>
      <div class="featgrid">${groups.map(g => `<div class="featcol"><div class="navlabel">${esc(t('fg_' + g))}</div>${S.FEATURES.filter(f => f.group === g).map(f => `<label class="featrow"><span>${esc(L(f))}</span>${U.toggle('f_' + f.key, x.features[f.key] !== false)}</label>`).join('')}</div>`).join('')}</div>
      <div class="btnrow"><button class="btn primary" type="submit">${esc(t('save'))}</button></div></form>`, onMount: (sh) => {
      const f = $('#cf', sh);
      $('[data-all]', f).onclick = () => $$('input[name^=f_]', f).forEach(c => { c.checked = true; });
      f.addEventListener('submit', (e) => { e.preventDefault(); const d = U.formData(f); x.plan = d.plan; x.limits = { users: +d.users || 1, branches: +d.branches || 1 }; x.active = d.active; for (const ft of S.FEATURES) x.features[ft.key] = !!d['f_' + ft.key]; S.savePlatform(); U.closeSheet(); U.toast(t('feature_toggled')); render(); });
    } });
  }
  function addClientSheet() {
    U.openSheet({ title: t('add_client'), body: `<form id="nf">${U.field(t('company_name') + ' (ع)', U.inp('name', '', 'required'))}${U.field(t('company_name') + ' (EN)', U.inp('nameEn', '', 'dir="ltr" required'))}
      <div class="grid2">${U.field(t('vat_number'), U.inp('vat', '', 'dir="ltr" inputmode="numeric" maxlength="15"'))}${U.field(t('city'), U.inp('city', 'جدة'))}</div>
      <div class="grid2">${U.field(t('admin_user'), U.inp('adminName', '', 'required'))}${U.field(t('admin_pin'), U.inp('adminPin', '1234', 'dir="ltr" inputmode="numeric" maxlength="6"'))}</div>
      <div class="grid2">${U.field(t('plan'), U.sel('plan', ['starter', 'pro', 'enterprise'].map(v => ({ v, l: t('plan_' + v) })), 'starter'))}${U.field(t('branch_name'), U.inp('branchName', 'الفرع الرئيسي'))}</div>
      <button class="btn primary" type="submit">${esc(t('add_client'))}</button></form>`, onMount: (sh) => {
      $('#nf', sh).addEventListener('submit', (e) => { e.preventDefault(); const d = U.formData(e.target); try { S.createTenant({ ...d, adminNameEn: d.adminName }); U.closeSheet(); U.toast(t('client_saved')); render(); } catch (er) { U.fail(er); } });
    } });
  }

  // ---------------------------------------------------------------- shared lookups for screens
  const branchName = (id) => { const b = db && db.branches.find(x => x.id === id); return b ? L(b) : '—'; };
  const accName = (code) => { const a = S.acc(db, code); return a ? `${a.code} · ${L(a)}` : (code || '—'); };
  const accShort = (code) => { const a = S.acc(db, code); return a ? L(a) : (code || '—'); };
  const supName = (id) => { const s = db.suppliers.find(x => x.id === id); return s ? L({ ar: s.name, en: s.nameEn }) : '—'; };
  const custName = (id) => { const s = db.customers.find(x => x.id === id); return s ? L({ ar: s.name, en: s.nameEn }) : '—'; };
  const memoText = (m) => !m ? '' : typeof m === 'string' ? m : L(m);
  const branchOptions = (withAll) => [...(withAll ? [{ v: '', l: t('all_branches') }] : []), ...db.branches.map(b => ({ v: b.id, l: L(b) }))];
  const defaultBranch = () => (user() && user().branch) || db.settings.defaultBranch || db.branches[0].id;
  const branchField = (name, val, withAll) => feat('multi_branch') ? U.field(t('branch'), U.sel(name, branchOptions(withAll), val ?? defaultBranch())) : `<input type="hidden" name="${name}" value="${esc(val ?? defaultBranch())}">`;

  function periodRange(p) {
    const t0 = S.todayISO(); const y = t0.slice(0, 4), m = +t0.slice(5, 7);
    if (p.preset === 'custom' && p.from && p.to) return [p.from, p.to];
    if (p.preset === 'last_month') { const ym = S.addMonths(t0.slice(0, 7), -1); return [ym + '-01', S.monthEnd(ym)]; }
    if (p.preset === 'this_quarter') { const qm = Math.floor((m - 1) / 3) * 3 + 1; return [`${y}-${String(qm).padStart(2, '0')}-01`, t0]; }
    if (p.preset === 'ytd') return [`${y}-01-01`, t0];
    return [`${t0.slice(0, 8)}01`, t0];
  }
  function filterBar(p, { branch = true, extra = '', presets = ['this_month', 'last_month', 'this_quarter', 'ytd', 'custom'], actions = true, asOf = false } = {}) {
    const [from, to] = periodRange(p);
    return `<div class="filterbar no-print">
      ${asOf ? `<label class="inline-lbl">${esc(t('as_of'))} <input class="input dt" type="date" data-asof value="${p.asOf || S.todayISO()}" dir="ltr"></label>` : `<div class="chips">${presets.map(x => `<button class="chip ${p.preset === x ? 'active' : ''}" data-p="${x}">${esc(t(x))}</button>`).join('')}</div>
      ${p.preset === 'custom' ? `<input class="input dt" type="date" data-from value="${from}" dir="ltr" aria-label="${esc(t('from'))}"><input class="input dt" type="date" data-to value="${to}" dir="ltr" aria-label="${esc(t('to'))}">` : ''}`}
      ${branch && feat('multi_branch') ? `<select class="select fb" data-branch aria-label="${esc(t('branch'))}">${branchOptions(true).map(o => `<option value="${o.v}" ${o.v === (p.branch || '') ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>` : ''}
      ${extra}<span class="grow"></span>
      ${actions ? `<button class="btn secondary sm" data-csv>${icon('download')}${esc(t('export_csv'))}</button><button class="btn secondary sm" data-print>${icon('print')}${esc(t('print'))}</button>` : ''}</div>`;
  }
  function bindFilter(main, p, rerender) {
    $$('[data-p]', main).forEach(b => b.addEventListener('click', () => { p.preset = b.dataset.p; if (p.preset === 'custom' && !p.from) { const [f, x] = periodRange({ preset: 'this_month' }); p.from = f; p.to = x; } rerender(); }));
    const f = $('[data-from]', main), to = $('[data-to]', main), br = $('[data-branch]', main), ao = $('[data-asof]', main);
    if (f) f.addEventListener('change', () => { p.from = f.value; rerender(); });
    if (to) to.addEventListener('change', () => { p.to = to.value; rerender(); });
    if (ao) ao.addEventListener('change', () => { p.asOf = ao.value; rerender(); });
    if (br) br.addEventListener('change', () => { p.branch = br.value; rerender(); });
    const pr = $('[data-print]', main); if (pr) pr.addEventListener('click', () => window.print());
  }

  try { applyTheme(localStorage.getItem('daftar.theme') || 'auto'); } catch (e) { /* ignore */ }
  document.addEventListener('DOMContentLoaded', render);

  return {
    render, go, commit, save, can, feat, user, role, isSuper, tenant, userName, setTitle, openDays,
    get db() { return db; }, branchName, accName, accShort, supName, custName, memoText, branchOptions, defaultBranch, branchField, periodRange, filterBar, bindFilter,
  };
})();
