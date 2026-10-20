/* Daftar — app shell, routing, screens */
window.App = (() => {
  const { t, money, fmtDate, fmtDateShort, weekday } = I18N;
  const S = Store;
  let db = S.load();
  let session = JSON.parse(sessionStorage.getItem('daftar.session') || 'null');
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lang = () => I18N.getLang();
  const L = (obj) => lang() === 'ar' ? (obj.ar ?? obj.name) : (obj.en ?? obj.nameEn ?? obj.ar ?? obj.name);

  // ---------- icons ----------
  const I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    sales: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>',
    suppliers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
    eod: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg>',
    reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"/><path d="M6 16V9M11 16V5M16 16v-6"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 20h16"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 8v5M12 17h.01"/><path d="M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10-4-4L4 16z"/><path d="m13 7 4 4"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>',
    logo: '<svg class="logo" viewBox="0 0 64 64" fill="none"><rect x="6" y="10" width="52" height="44" rx="12" fill="var(--accent)"/><path d="M20 22h24M20 32h24M20 42h14" stroke="var(--accent-ink)" stroke-width="4.5" stroke-linecap="round"/><circle cx="46" cy="42" r="4" fill="var(--c2)"/></svg>',
  };

  // ---------- permissions ----------
  const PERMS = {
    admin: ['home', 'sales', 'suppliers', 'invoices', 'eod', 'reports', 'settings', 'users', 'post', 'reopen', 'accounts'],
    accountant: ['home', 'sales', 'suppliers', 'invoices', 'eod', 'reports', 'post', 'reopen', 'accounts'],
    operator: ['home', 'sales', 'suppliers', 'invoices', 'eod', 'post'],
  };
  const NAV = {
    admin: ['home', 'sales', 'suppliers', 'eod', 'reports'],
    accountant: ['home', 'sales', 'suppliers', 'eod', 'reports'],
    operator: ['home', 'sales', 'suppliers', 'eod'],
  };
  const user = () => db.users.find(u => u.id === session?.userId) || null;
  const role = () => user()?.role || 'operator';
  const can = (p) => (PERMS[role()] || []).includes(p);
  const userName = (u) => u ? (lang() === 'ar' ? u.name : (u.nameEn || u.name)) : '—';

  // ---------- lookups ----------
  const branch = (id) => db.branches.find(b => b.id === id);
  const branchName = (id) => { const b = branch(id); return b ? L(b) : '—'; };
  const acct = (code) => db.accounts.find(a => a.code === code);
  const acctName = (code) => { const a = acct(code); return a ? `${a.code} · ${L(a)}` : code; };
  const sup = (id) => db.suppliers.find(s => s.id === id);
  const supName = (id) => { const s = sup(id); return s ? L(s) : '—'; };
  const methodName = (m) => t(m);
  const today = () => S.todayISO();
  const initials = (name) => (name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('');
  const persist = () => S.save();

  function memoText(je) {
    const m = je.memo || '';
    if (m.startsWith('__sales__')) { const [, b, me, n] = m.split('|'); return t('memo_sales', { branch: branchName(b), method: methodName(me) }) + ` (${n})`; }
    if (m.startsWith('__invoice__')) { const [, no, sid] = m.split('|'); return t('memo_invoice', { no, supplier: supName(sid) }); }
    if (m.startsWith('__payment__')) { const [, no, sid] = m.split('|'); return t('memo_payment', { supplier: supName(sid) }) + ` — ${no}`; }
    if (m.startsWith('__eod__')) { const [, b, k] = m.split('|'); return t(k === 'over' ? 'memo_eod_over' : 'memo_eod_short', { branch: branchName(b) }); }
    if (m.includes(' / ')) { const [ar, en] = m.split(' / '); return lang() === 'ar' ? ar : en; }
    return m;
  }
  function statusPill(st) {
    const map = { draft: 'neutral', posted: 'info', paid: 'good', partial: 'warn', overdue: 'bad', due: 'info' };
    return `<span class="pill ${map[st] || 'neutral'}">${esc(t('status_' + st))}</span>`;
  }

  // ---------- UI primitives ----------
  let toastTimer;
  function toast(msg) {
    let el = $('#toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  let sheetEl = null, backdropEl = null;
  function openSheet({ title, body, wide, onMount }) {
    closeSheet(true);
    backdropEl = document.createElement('div'); backdropEl.className = 'backdrop'; backdropEl.addEventListener('click', () => closeSheet());
    sheetEl = document.createElement('div'); sheetEl.className = 'sheet' + (wide ? ' wide' : ''); sheetEl.setAttribute('role', 'dialog'); sheetEl.setAttribute('aria-modal', 'true');
    sheetEl.innerHTML = `<div class="handle"></div><div class="sh"><h2>${esc(title)}</h2><button class="iconbtn" data-close aria-label="${esc(t('close'))}">${I.close}</button></div><div class="sb">${body}</div>`;
    document.body.append(backdropEl, sheetEl);
    sheetEl.querySelector('[data-close]').addEventListener('click', () => closeSheet());
    requestAnimationFrame(() => { backdropEl.classList.add('show'); sheetEl.classList.add('show'); });
    if (onMount) onMount(sheetEl);
    return sheetEl;
  }
  function closeSheet(immediate) {
    if (!sheetEl) return;
    const s = sheetEl, b = backdropEl; sheetEl = null; backdropEl = null;
    if (immediate) { s.remove(); b.remove(); return; }
    s.classList.remove('show'); b.classList.remove('show'); setTimeout(() => { s.remove(); b.remove(); }, 260);
  }
  function confirmInline(container, msg, onYes) {
    container.innerHTML = `<div class="notice warn" style="justify-content:space-between;align-items:center"><span>${esc(msg)}</span><span class="actions-inline"><button class="btn sm danger" data-yes>${esc(t('yes_delete'))}</button><button class="btn sm secondary" data-no>${esc(t('keep'))}</button></span></div>`;
    container.querySelector('[data-yes]').onclick = onYes; container.querySelector('[data-no]').onclick = () => { container.innerHTML = ''; };
  }
  const field = (label, inner, hint) => `<div class="field"><label>${esc(label)}</label>${inner}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`;
  const inp = (name, val = '', attrs = '') => `<input class="input" name="${name}" value="${esc(val)}" ${attrs}>`;
  const sel = (name, options, val, attrs = '') => `<select class="select" name="${name}" ${attrs}>${options.map(o => `<option value="${esc(o.v)}" ${String(o.v) === String(val) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
  const branchOptions = () => db.branches.map(b => ({ v: b.id, l: L(b) }));
  const dateInput = (name, val) => `<input class="input" type="date" name="${name}" value="${val}" dir="ltr">`;
  const moneyInput = (name, val = '', attrs = '') => `<input class="input money" type="number" inputmode="decimal" step="0.01" min="0" name="${name}" value="${val === '' ? '' : val}" dir="ltr" ${attrs}>`;
  const formData = (form) => Object.fromEntries(new FormData(form).entries());
  function download(filename, content, type = 'text/csv;charset=utf-8') {
    const blob = new Blob(['﻿' + content], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const csv = (rows) => rows.map(r => r.map(c => { const s = String(c ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n');

  // ---------- routing ----------
  function route() { const h = location.hash.replace(/^#\/?/, ''); const [path, ...rest] = h.split('/'); return { path: path || 'home', args: rest }; }
  function go(path) { location.hash = '#/' + path; }
  window.addEventListener('hashchange', () => { closeSheet(true); render(); window.scrollTo(0, 0); });

  // ---------- render root ----------
  function render() {
    db = S.load();
    document.title = `${t('app')} — ${lang() === 'ar' ? db.company.name : db.company.nameEn}`;
    const app = $('#app');
    if (!session || !user()) { app.innerHTML = renderLogin(); bindLogin(app); return; }
    const r = route();
    const nav = NAV[role()];
    let screen = r.path;
    if (!can(screen) && screen !== 'more') { screen = 'home'; }
    const titles = { home: t('nav_home'), sales: t('sales'), suppliers: t('suppliers'), eod: t('eod'), reports: t('reports'), more: t('more') };
    const tabs = nav.map(n => `<button class="tab ${screen === n ? 'active' : ''}" data-go="${n}">${I[n]}<span>${esc(t('nav_' + n))}</span>${badge(n)}</button>`).join('');
    app.innerHTML = `
      <div class="app">
        <nav class="rail"><div class="brand">${I.logo}<div><b>${esc(t('app'))}</b><small>${esc(lang() === 'ar' ? db.company.name : db.company.nameEn)}</small></div></div>${tabs}<div class="spacer"></div>
          <button class="tab ${screen === 'more' ? 'active' : ''}" data-go="more">${I.more}<span>${esc(t('more'))}</span></button>
          <div class="who"><b>${esc(userName(user()))}</b><br><span class="muted">${esc(t('role_' + role()))}</span></div></nav>
        <div class="content">
          <header class="topbar"><h1 id="title">${esc(titles[screen] || '')}</h1><button class="langbtn" data-lang>${lang() === 'ar' ? 'EN' : 'عربي'}</button><button class="iconbtn" data-go="more" aria-label="${esc(t('more'))}">${I.user}</button></header>
          <main id="main" class="${screen === 'reports' ? 'wide' : ''}"></main>
        </div>
      </div>
      <nav class="tabbar">${tabs}</nav>`;
    $$('[data-go]', app).forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
    $('[data-lang]', app).addEventListener('click', () => { I18N.setLang(lang() === 'ar' ? 'en' : 'ar'); render(); });
    const screens = { home: screenHome, sales: screenSales, suppliers: screenSuppliers, eod: screenEOD, reports: window.Reports ? window.Reports.screen : () => {}, more: screenMore };
    (screens[screen] || screenHome)($('#main'), r.args);
  }
  function badge(nav) {
    if (nav === 'eod') { const n = openDays().length; return n ? `<span class="badge">${n}</span>` : ''; }
    if (nav === 'suppliers') { const n = db.supplierInvoices.filter(i => i.status === 'draft').length; return n ? `<span class="badge">${n}</span>` : ''; }
    return '';
  }
  function openDays() {
    const out = []; const t0 = today();
    for (let d = 7; d >= 1; d--) { const date = S.addDays(t0, -d); for (const b of db.branches) { if (S.daySales(db, date, b.id).n > 0 && !S.isClosed(db, date, b.id)) out.push({ date, branch: b.id }); } }
    return out;
  }

  // ---------- login ----------
  function renderLogin() {
    const roleHint = { admin: 'role_admin_desc', accountant: 'role_accountant_desc', operator: 'role_operator_desc' };
    return `<div class="login">
      <button class="langbtn lang" data-lang>${lang() === 'ar' ? 'EN' : 'عربي'}</button>
      <div class="mark">${I.logo}<h1>${esc(t('app'))}</h1><p>${esc(t('tagline'))}</p><p class="small muted">${esc(lang() === 'ar' ? db.company.name : db.company.nameEn)} · ${esc(t('byHunters'))}</p></div>
      <h2 style="font-size:16px;color:var(--ink-2)">${esc(t('login_title'))}</h2>
      <div class="users">${db.users.filter(u => u.active).map(u => `<button class="row" data-user="${u.id}"><span class="avatar">${esc(initials(userName(u)))}</span><span class="main"><span class="t">${esc(userName(u))}</span><span class="m">${esc(t(roleHint[u.role]))}</span></span><span class="pill ${u.role === 'admin' ? 'info' : u.role === 'accountant' ? 'good' : 'neutral'}">${esc(t('role_' + u.role))}</span></button>`).join('')}</div>
      <p class="small muted">${esc(t('login_hint'))}</p>
    </div>`;
  }
  function bindLogin(app) {
    $('[data-lang]', app).addEventListener('click', () => { I18N.setLang(lang() === 'ar' ? 'en' : 'ar'); render(); });
    $$('[data-user]', app).forEach(b => b.addEventListener('click', () => {
      const u = db.users.find(x => x.id === b.dataset.user);
      openSheet({ title: userName(u), body: `<form id="pinform"><div class="pinbox">${field(t('pin'), `<input class="input pin" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="one-time-code">`)}<div class="err hidden" id="pinerr">${esc(t('wrongPin'))}</div><button class="btn primary" type="submit">${esc(t('signin'))}</button></div></form>`, onMount: (s) => {
        const f = $('#pinform', s); setTimeout(() => $('[name=pin]', f).focus(), 300);
        f.addEventListener('submit', (e) => { e.preventDefault(); if (formData(f).pin === u.pin) { session = { userId: u.id }; sessionStorage.setItem('daftar.session', JSON.stringify(session)); closeSheet(true); go('home'); render(); } else { $('#pinerr', f).classList.remove('hidden'); $('[name=pin]', f).value = ''; } });
      } });
    }));
  }

  // ---------- home ----------
  function screenHome(main) {
    const t0 = today(), y0 = S.addDays(t0, -1);
    const td = S.daySales(db, t0), yd = S.daySales(db, y0);
    const delta = yd.total ? (td.total - yd.total) / yd.total * 100 : null;
    const open = openDays();
    const drafts = db.supplierInvoices.filter(i => i.status === 'draft');
    const weekEnd = S.addDays(t0, 7);
    const dueWeek = db.supplierInvoices.filter(i => i.status === 'posted' && i.paid < i.total && i.due && i.due <= weekEnd).reduce((a, i) => a + i.total - i.paid, 0);
    const notImported = db.branches.filter(b => S.daySales(db, t0, b.id).n === 0);
    const colors = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)'];
    const byBranch = db.branches.map((b, i) => ({ b, v: S.daySales(db, t0, b.id).total, c: colors[i % 4] }));
    const spark = []; let max = 1;
    for (let d = 13; d >= 0; d--) { const date = S.addDays(t0, -d); const v = S.daySales(db, date).total; max = Math.max(max, v); spark.push({ date, v, dow: new Date(date + 'T00:00:00').getDay() }); }
    const attention = [];
    if (open.length) attention.push(`<a class="tile warn" href="#/eod"><span class="k">${esc(t('days_not_closed'))}</span><span class="v">${open.length}</span></a>`);
    if (drafts.length) attention.push(`<a class="tile warn" href="#/suppliers/invoices"><span class="k">${esc(t('unposted_invoices'))}</span><span class="v">${drafts.length}</span></a>`);
    if (dueWeek > 0) attention.push(`<a class="tile" href="#/suppliers/invoices"><span class="k">${esc(t('due_this_week'))}</span><span class="v money">${money(dueWeek, { whole: true })}</span></a>`);
    if (notImported.length) attention.push(`<a class="tile bad" href="#/sales"><span class="k">${esc(t('no_sales_today'))}</span><span class="v" style="font-size:15px">${esc(notImported.map(b => L(b)).join(' · '))}</span></a>`);
    const quick = [
      can('sales') && `<button data-go="sales">${I.upload}${esc(t('quick_import'))}</button>`,
      can('invoices') && `<button data-act="scan">${I.camera}${esc(t('quick_scan'))}</button>`,
      can('eod') && `<button data-go="eod">${I.eod}${esc(t('quick_eod'))}</button>`,
      can('reports') ? `<button data-go="reports">${I.reports}${esc(t('reports'))}</button>` : `<button data-act="invoice">${I.file}${esc(t('quick_invoice'))}</button>`,
    ].filter(Boolean).join('');
    main.innerHTML = `
      <div class="card hero">
        <div class="label">${esc(t('sales_today'))} · ${esc(weekday(t0))} ${esc(fmtDateShort(t0))}</div>
        <div class="big"><span class="money">${money(td.total)}</span><span class="cur">${esc(t('sar'))} · ${esc(t('incl_vat'))}</span></div>
        ${delta !== null ? `<div class="delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} <span class="num">${Math.abs(delta).toFixed(1)}%</span> ${esc(t('vs_yesterday'))} · <span class="num">${td.n}</span> ${esc(t('invoices_n', { n: '' })).trim()}</div>` : ''}
        <div class="spark" aria-hidden="true">${spark.map(s => `<span class="${s.date === t0 ? 'today' : ''} ${s.dow === 5 || s.dow === 4 ? 'weekend' : ''}" style="height:${Math.max(4, s.v / max * 100)}%" title="${s.date}: ${money(s.v)}"></span>`).join('')}</div>
        <div class="stack">${byBranch.map(x => td.total ? `<span style="width:${x.v / td.total * 100}%;background:${x.c}"></span>` : '').join('')}</div>
        <div class="legend">${byBranch.map(x => `<span><i style="background:${x.c}"></i>${esc(L(x.b))} <b>${money(x.v, { whole: true })}</b></span>`).join('')}</div>
      </div>
      <div class="section"><h2>${esc(t('needs_attention'))}</h2>${attention.length ? `<div class="tiles">${attention.join('')}</div>` : `<div class="notice good">${I.check}<span>${esc(t('all_clear'))}</span></div>`}</div>
      <div class="section"><div class="quick">${quick}</div></div>
      <div class="section"><h2>${esc(t('by_payment'))}</h2><div class="card">${['cash', 'mada', 'visa', 'tabby', 'transfer'].filter(m => td.byMethod[m]).map(m => `<div class="kv"><span class="k">${esc(methodName(m))}</span><span class="v money">${money(td.byMethod[m])}</span></div>`).join('') || `<div class="empty">${esc(t('no_sales_today'))}</div>`}</div></div>
      <p class="small muted" style="text-align:center;margin-top:20px">${esc(t('demo_banner'))}</p>`;
    $$('[data-go]', main).forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
    $$('[data-act]', main).forEach(b => b.addEventListener('click', () => b.dataset.act === 'scan' ? invoiceForm({ scan: true }) : invoiceForm({})));
  }

  // ---------- sales ----------
  let salesMode = 'import';
  function screenSales(main) {
    const imports = [...db.imports].reverse().slice(0, 12);
    main.innerHTML = `
      <div class="seg" style="margin-bottom:14px"><button class="${salesMode === 'import' ? 'active' : ''}" data-mode="import">${esc(t('import_from_pos'))}</button><button class="${salesMode === 'manual' ? 'active' : ''}" data-mode="manual">${esc(t('manual_sales'))}</button></div>
      <div id="salesbody"></div>
      <div class="section"><h2>${esc(t('recent_imports'))}</h2><div class="list">${imports.length ? imports.map(im => `<div class="row"><span class="avatar">${im.source === 'manual' ? '✎' : I.file}</span><span class="main"><span class="t">${esc(im.file || t('source_manual'))}</span><span class="m">${esc(im.dates.length === 1 ? fmtDate(im.dates[0]) : fmtDateShort(im.dates[0]) + ' → ' + fmtDateShort(im.dates[im.dates.length - 1]))} · ${esc(t('invoices_n', { n: im.count }))} · ${esc(userName(db.users.find(u => u.id === im.user)))}</span></span><span class="end"><span class="money">${money(im.total)}</span></span></div>`).join('') : `<div class="empty">${esc(t('no_imports'))}</div>`}</div></div>`;
    $$('[data-mode]', main).forEach(b => b.addEventListener('click', () => { salesMode = b.dataset.mode; screenSales(main); }));
    const body = $('#salesbody', main);
    if (salesMode === 'import') {
      body.innerHTML = `<div class="card"><p class="muted" style="margin:0 0 12px;font-size:14px">${esc(t('import_hint'))}</p>
        <label class="dropzone" for="posfile">${I.upload}<p>${esc(t('choose_file'))}</p><small>CSV · XLSX</small></label><input id="posfile" type="file" accept=".csv,.xlsx,.xls,text/csv" class="sr">
        <div class="btnrow"><button class="btn secondary sm" data-sample>${I.download}${esc(t('download_sample'))}</button></div></div>`;
      $('#posfile', body).addEventListener('change', async (e) => { const f = e.target.files[0]; if (f) await importFlow(f); e.target.value = ''; });
      $('[data-sample]', body).addEventListener('click', () => { const b = db.branches[2] || db.branches[0]; download(`skysystem_sales_${b.code}_${today()}.csv`, PosImport.sampleCSV(b.code, today())); toast(t('download_sample')); });
    } else {
      body.innerHTML = `<form class="card" id="manualform"><p class="muted" style="margin:0 0 12px;font-size:14px">${esc(t('manual_sales_hint'))}</p>
        <div class="grid2">${field(t('date'), dateInput('date', today()))}${field(t('branch'), sel('branch', branchOptions(), user().branch || db.branches[0].id))}</div>
        <div class="grid2">${field(t('cash'), moneyInput('cash'))}${field(t('mada'), moneyInput('mada'))}${field(t('visa'), moneyInput('visa'))}${field(t('tabby'), moneyInput('tabby'))}</div>
        <div class="kv total"><span class="k">${esc(t('total'))} (${esc(t('incl_vat'))})</span><span class="v money" id="mtotal">0.00</span></div>
        <button class="btn primary" type="submit" style="margin-top:12px">${esc(t('post_sales'))}</button></form>`;
      const f = $('#manualform', body);
      const recalc = () => { const d = formData(f); $('#mtotal', f).textContent = money(['cash', 'mada', 'visa', 'tabby'].reduce((a, k) => a + (parseFloat(d[k]) || 0), 0)); };
      f.addEventListener('input', recalc);
      f.addEventListener('submit', (e) => {
        e.preventDefault(); const d = formData(f); const invs = [];
        for (const m of ['cash', 'mada', 'visa', 'tabby']) { const v = parseFloat(d[m]) || 0; if (v > 0) { const sub = +(v / 1.15).toFixed(2); invs.push({ no: `MAN-${d.date}-${branch(d.branch).code}-${m}`, date: d.date, branch: d.branch, method: m, total: v, subtotal: sub, vat: +(v - sub).toFixed(2) }); } }
        if (!invs.length) return toast(t('nothing_to_post'));
        const res = S.postSalesBatch(db, invs, { source: 'manual', user: user().id }); persist();
        toast(res.posted ? t('posted_sales', { n: res.posted }) : t('nothing_to_post')); screenSales(main);
      });
    }
  }
  async function importFlow(file) {
    let rows;
    try { rows = await PosImport.parseFile(file); } catch (e) { return toast(t('read_failed')); }
    if (!rows || rows.length < 2) return toast(t('nothing_to_post'));
    const headers = rows[0].map(h => String(h ?? ''));
    const map = PosImport.autoMap(headers);
    const fields = ['date', 'branch', 'invoice', 'subtotal', 'vat', 'total', 'method'];
    const hopts = [{ v: '', l: t('ignore') }, ...headers.map((h, i) => ({ v: i, l: h || `#${i + 1}` }))];
    const defBranch = user().branch || db.branches[0].id;
    openSheet({ title: t('import_sales'), wide: true, body: `<form id="mapform">
        <div class="notice info" style="margin-bottom:12px">${I.file}<span><b>${esc(file.name)}</b> · ${rows.length - 1} ${esc(t('rows'))}</span></div>
        <h3 style="font-size:14px;margin:0 0 8px;color:var(--ink-2)">${esc(t('map_columns'))}</h3>
        <div class="grid2">${fields.map(f => field(t('col_' + f), sel('m_' + f, hopts, map[f] ?? ''))).join('')}${field(t('branch') + ' (' + t('ignore').toLowerCase() + ' → )', sel('defbranch', branchOptions(), defBranch))}</div>
        <div id="preview"></div>
        <button class="btn primary" type="submit" id="postbtn" style="margin-top:12px">${esc(t('post_sales'))}</button></form>`, onMount: (s) => {
      const f = $('#mapform', s);
      const build = () => { const d = formData(f); const m = {}; for (const k of fields) m[k] = d['m_' + k] === '' ? undefined : +d['m_' + k]; return PosImport.buildInvoices(rows, m, { branches: db.branches, defaultBranch: d.defbranch }); };
      const preview = () => {
        const { invoices, errors } = build();
        const existing = new Set(db.salesInvoices.map(i => i.no)); const dup = invoices.filter(i => existing.has(i.no)).length;
        const fresh = invoices.filter(i => !existing.has(i.no)); const total = fresh.reduce((a, i) => a + i.total, 0);
        const byB = {}; for (const i of fresh) byB[i.branch] = (byB[i.branch] || 0) + i.total;
        $('#preview', f).innerHTML = `<div class="card" style="margin-top:4px"><div class="kv"><span class="k">${esc(t('preview'))}</span><span class="v">${fresh.length} ${esc(t('rows'))}${dup ? ` · ${dup} ${esc(t('duplicates_skipped'))}` : ''}${errors.length ? ` · <span style="color:var(--bad)">${errors.length} ✕</span>` : ''}</span></div>
          ${Object.entries(byB).map(([b, v]) => `<div class="kv"><span class="k">${esc(branchName(b))}</span><span class="v money">${money(v)}</span></div>`).join('')}
          <div class="kv total"><span class="k">${esc(t('total'))}</span><span class="v money">${money(total)}</span></div>
          <div class="tablewrap" style="margin-top:10px"><table class="tbl"><thead><tr><th>${esc(t('col_invoice'))}</th><th>${esc(t('col_date'))}</th><th>${esc(t('col_branch'))}</th><th>${esc(t('col_method'))}</th><th class="money">${esc(t('col_total'))}</th></tr></thead><tbody>${fresh.slice(0, 5).map(i => `<tr><td class="code">${esc(i.no)}</td><td class="num">${i.date}</td><td>${esc(branchName(i.branch))}</td><td>${esc(methodName(i.method))}</td><td class="money">${money(i.total)}</td></tr>`).join('')}</tbody></table></div></div>`;
        $('#postbtn', f).disabled = !fresh.length;
      };
      f.addEventListener('change', preview); preview();
      f.addEventListener('submit', (e) => { e.preventDefault(); const { invoices } = build(); const res = S.postSalesBatch(db, invoices, { source: 'skysystem_export', file: file.name, user: user().id }); persist(); closeSheet(); toast(res.posted ? t('posted_sales', { n: res.posted }) : t('nothing_to_post')); render(); });
    } });
  }

  // ---------- suppliers & invoices ----------
  let supTab = 'suppliers', supQuery = '', invFilter = 'all';
  function screenSuppliers(main, args) {
    if (args && args[0] === 'invoices') { supTab = 'invoices'; }
    main.innerHTML = `<div class="seg" style="margin-bottom:12px"><button class="${supTab === 'suppliers' ? 'active' : ''}" data-tab="suppliers">${esc(t('suppliers'))}</button><button class="${supTab === 'invoices' ? 'active' : ''}" data-tab="invoices">${esc(t('invoices'))}</button></div><div id="supbody"></div>
      <button class="fab" id="fab" aria-label="${esc(t('add'))}">${I.plus}</button>`;
    $$('[data-tab]', main).forEach(b => b.addEventListener('click', () => { supTab = b.dataset.tab; history.replaceState(null, '', '#/suppliers'); screenSuppliers(main); }));
    $('#fab', main).addEventListener('click', () => supTab === 'suppliers' ? supplierForm({}) : invoiceForm({}));
    const body = $('#supbody', main);
    if (supTab === 'suppliers') {
      const q = supQuery.trim().toLowerCase();
      const list = db.suppliers.filter(s => !q || L(s).toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q) || (s.vat || '').includes(q)).map(s => ({ s, bal: S.supplierBalance(db, s.id) })).sort((a, b) => b.bal - a.bal);
      body.innerHTML = `<div class="search">${I.search}<input class="input" id="supq" placeholder="${esc(t('search_suppliers'))}" value="${esc(supQuery)}"></div>
        <div class="list">${list.length ? list.map(({ s, bal }) => `<button class="row" data-sup="${s.id}"><span class="avatar">${esc(initials(L(s)))}</span><span class="main"><span class="t">${esc(L(s))}</span><span class="m num">${esc(t('vat_number'))}: ${esc(s.vat)}</span></span><span class="end"><span class="money ${bal > 0 ? '' : ''}">${money(bal)}</span><span class="small muted">${bal > 0 ? esc(t('we_owe')) : '—'}</span></span></button>`).join('') : `<div class="empty">${esc(q ? t('no_results') : t('no_suppliers'))}</div>`}</div>`;
      $('#supq', body).addEventListener('input', (e) => { supQuery = e.target.value; screenSuppliers(main); const i = $('#supq', main); i.focus(); i.setSelectionRange(i.value.length, i.value.length); });
      $$('[data-sup]', body).forEach(b => b.addEventListener('click', () => supplierSheet(b.dataset.sup)));
    } else {
      const all = db.supplierInvoices.map(i => ({ i, st: S.invoiceStatus(i) })).sort((a, b) => b.i.date.localeCompare(a.i.date));
      const counts = {}; for (const x of all) counts[x.st] = (counts[x.st] || 0) + 1;
      const filters = ['all', 'draft', 'due', 'overdue', 'partial', 'paid'];
      const list = all.filter(x => invFilter === 'all' || x.st === invFilter);
      body.innerHTML = `<div class="chips">${filters.map(f => `<button class="chip ${invFilter === f ? 'active' : ''}" data-f="${f}">${esc(f === 'all' ? t('all') : t('status_' + f))}${f !== 'all' && counts[f] ? ` <b>${counts[f]}</b>` : ''}</button>`).join('')}</div>
        <div class="list">${list.length ? list.map(({ i, st }) => `<button class="row" data-inv="${i.id}"><span class="avatar">${esc(initials(supName(i.supplierId)))}</span><span class="main"><span class="t">${esc(supName(i.supplierId))}</span><span class="m"><span class="num">${esc(i.no)}</span> · ${esc(fmtDateShort(i.date))}${i.due ? ` · ${esc(t('due_date'))} ${esc(fmtDateShort(i.due))}` : ''}</span></span><span class="end"><span class="money">${money(i.total)}</span>${statusPill(st)}</span></button>`).join('') : `<div class="empty">${esc(t('empty_list'))}</div>`}</div>`;
      $$('[data-f]', body).forEach(b => b.addEventListener('click', () => { invFilter = b.dataset.f; screenSuppliers(main); }));
      $$('[data-inv]', body).forEach(b => b.addEventListener('click', () => invoiceSheet(b.dataset.inv)));
    }
  }
  function addressText(a) { if (!a) return ''; return [a.building, a.street, a.district, a.city, a.postal, a.additional].filter(Boolean).join(lang() === 'ar' ? '، ' : ', '); }
  function supplierSheet(id) {
    const s = sup(id); const bal = S.supplierBalance(db, id);
    const invs = db.supplierInvoices.filter(i => i.supplierId === id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    openSheet({ title: L(s), body: `
      <div class="kv total"><span class="k">${esc(t('balance'))} · ${esc(t('we_owe'))}</span><span class="v money">${money(bal)} <span class="small muted" style="font-family:var(--font)">${esc(t('sar'))}</span></span></div>
      <div class="kv"><span class="k">${esc(t('vat_number'))}</span><span class="v num">${esc(s.vat)}</span></div>
      ${s.cr ? `<div class="kv"><span class="k">${esc(t('cr_number'))}</span><span class="v num">${esc(s.cr)}</span></div>` : ''}
      ${s.phone ? `<div class="kv"><span class="k">${esc(t('phone'))}</span><span class="v num"><a href="tel:${esc(s.phone)}">${esc(s.phone)}</a></span></div>` : ''}
      <div class="kv"><span class="k">${esc(t('national_address'))}</span><span class="v" style="font-weight:500;max-width:60%">${esc(addressText(s.addr))}${s.addr?.short ? `<br><span class="num muted small">${esc(s.addr.short)}</span>` : ''}</span></div>
      <div class="kv"><span class="k">${esc(t('payment_terms'))}</span><span class="v num">${s.terms || 0}</span></div>
      <div class="btnrow"><button class="btn primary" data-newinv>${I.plus}${esc(t('new_invoice'))}</button>${can('reports') ? `<button class="btn secondary" data-stmt>${esc(t('statement_of_account'))}</button>` : ''}<button class="btn secondary" data-edit aria-label="${esc(t('edit'))}" style="flex:0 0 52px">${I.pen}</button></div>
      <div class="section"><h2>${esc(t('invoices'))}</h2><div class="list">${invs.length ? invs.map(i => `<button class="row" data-inv="${i.id}"><span class="main"><span class="t num">${esc(i.no)}</span><span class="m">${esc(fmtDate(i.date))}</span></span><span class="end"><span class="money">${money(i.total)}</span>${statusPill(S.invoiceStatus(i))}</span></button>`).join('') : `<div class="empty">${esc(t('empty_list'))}</div>`}</div></div>`,
      onMount: (sh) => {
        $('[data-newinv]', sh).addEventListener('click', () => invoiceForm({ supplierId: id }));
        $('[data-edit]', sh).addEventListener('click', () => supplierForm(s));
        const st = $('[data-stmt]', sh); if (st) st.addEventListener('click', () => { closeSheet(true); go('reports/statement/supplier:' + id); });
        $$('[data-inv]', sh).forEach(b => b.addEventListener('click', () => invoiceSheet(b.dataset.inv)));
      } });
  }
  function supplierForm(s, onSaved) {
    const a = s.addr || {};
    openSheet({ title: s.id ? t('edit_supplier') : t('add_supplier'), body: `<form id="supform">
      ${field(t('supplier_name'), inp('name', s.name || '', 'required'))}
      ${field(t('vat_number'), inp('vat', s.vat || '', 'inputmode="numeric" dir="ltr" maxlength="15" required'), t('vat_number_hint'))}<div class="err hidden" id="vaterr">${esc(t('invalid_vat'))}</div>
      <div class="grid2">${field(t('cr_number'), inp('cr', s.cr || '', 'inputmode="numeric" dir="ltr"'))}${field(t('phone'), inp('phone', s.phone || '', 'type="tel" dir="ltr"'))}</div>
      <div class="grid2">${field(t('payment_terms'), inp('terms', s.terms ?? 30, 'type="number" inputmode="numeric" dir="ltr"'))}${field(t('email'), inp('email', s.email || '', 'type="email" dir="ltr"'))}</div>
      <h3 style="font-size:14px;margin:6px 0 10px;color:var(--ink-2)">${esc(t('national_address'))}</h3>
      <div class="grid2">${field(t('building_no'), inp('building', a.building || '', 'inputmode="numeric" dir="ltr"'))}${field(t('additional_no'), inp('additional', a.additional || '', 'inputmode="numeric" dir="ltr"'))}</div>
      ${field(t('street'), inp('street', a.street || ''))}
      <div class="grid2">${field(t('district'), inp('district', a.district || ''))}${field(t('city'), inp('city', a.city || ''))}</div>
      <div class="grid2">${field(t('postal_code'), inp('postal', a.postal || '', 'inputmode="numeric" dir="ltr"'))}${field(t('short_address'), inp('short', a.short || '', 'dir="ltr" style="text-transform:uppercase"'))}</div>
      <button class="btn primary" type="submit">${esc(t('save_supplier'))}</button></form>`, onMount: (sh) => {
      const f = $('#supform', sh);
      f.addEventListener('submit', (e) => {
        e.preventDefault(); const d = formData(f);
        if (!S.validVAT(d.vat)) { $('#vaterr', f).classList.remove('hidden'); $('[name=vat]', f).classList.add('invalid'); return; }
        const saved = S.saveSupplier(db, { id: s.id, name: d.name.trim(), nameEn: s.nameEn || d.name.trim(), vat: d.vat.replace(/\D/g, ''), cr: d.cr, phone: d.phone, email: d.email, terms: +d.terms || 0, addr: { building: d.building, additional: d.additional, street: d.street, district: d.district, city: d.city, postal: d.postal, short: d.short.toUpperCase() } });
        persist(); closeSheet(); toast(t('supplier_saved')); if (onSaved) onSaved(saved); else render();
      });
    } });
  }

  // invoice form: scan + manual in one sheet
  function invoiceForm(opts) {
    const t0 = today(); const defSup = opts.supplierId ? sup(opts.supplierId) : null;
    const expAccounts = db.accounts.filter(a => a.type === 'expense').map(a => ({ v: a.code, l: `${a.code} · ${L(a)}` }));
    const supOpts = [{ v: '', l: '— ' + t('supplier') + ' —' }, ...db.suppliers.map(s => ({ v: s.id, l: L(s) })), { v: '__new__', l: '+ ' + t('add_supplier') }];
    openSheet({ title: t('new_invoice'), wide: true, body: `<form id="invform">
      <div class="seg" style="margin-bottom:12px"><button type="button" class="${opts.scan ? 'active' : ''}" data-im="scan">${esc(t('scan_invoice'))}</button><button type="button" class="${!opts.scan ? 'active' : ''}" data-im="manual">${esc(t('manual_entry'))}</button></div>
      <div id="scanbox" class="${opts.scan ? '' : 'hidden'}">
        <label class="dropzone" for="invphoto">${I.camera}<p>${esc(t('take_photo'))}</p><small>JPG · PNG · PDF (${lang() === 'ar' ? 'صورة' : 'image'})</small></label><input id="invphoto" class="sr" type="file" accept="image/*" capture="environment">
        <div id="scanstate" style="margin-top:10px"></div>
      </div>
      <input type="hidden" name="attachment" value="">
      ${field(t('supplier'), sel('supplierId', supOpts, defSup?.id || ''))}
      <div id="newsup" class="hidden"><div class="grid2">${field(t('supplier_name'), inp('ns_name', ''))}${field(t('vat_number'), inp('ns_vat', '', 'inputmode="numeric" dir="ltr" maxlength="15"'))}</div></div>
      <div id="supnote"></div>
      <div class="grid2">${field(t('invoice_no'), inp('no', '', 'dir="ltr" required'))}${field(t('invoice_date'), dateInput('date', t0))}</div>
      <div class="grid2">${field(t('due_date'), dateInput('due', S.addDays(t0, defSup?.terms || 30)))}${field(t('branch'), sel('branch', branchOptions(), user().branch || db.branches[0].id))}</div>
      <div class="grid3">${field(t('subtotal'), moneyInput('subtotal'))}${field(t('vat_15'), moneyInput('vat'))}${field(t('total'), moneyInput('total', '', 'required'))}</div>
      ${field(t('expense_account'), sel('account', expAccounts, '5010'))}
      ${field(t('notes'), `<textarea class="input" name="notes" rows="2"></textarea>`)}
      <div class="btnrow"><button class="btn primary" type="submit" data-post>${esc(t('post_invoice'))}</button><button class="btn secondary" type="button" data-draft>${esc(t('save_draft'))}</button></div></form>`,
      onMount: (sh) => {
        const f = $('#invform', sh);
        $$('[data-im]', f).forEach(b => b.addEventListener('click', () => { $$('[data-im]', f).forEach(x => x.classList.toggle('active', x === b)); $('#scanbox', f).classList.toggle('hidden', b.dataset.im !== 'scan'); }));
        const supSel = $('[name=supplierId]', f);
        const syncSup = () => { $('#newsup', f).classList.toggle('hidden', supSel.value !== '__new__'); const s = sup(supSel.value); if (s) { const d = $('[name=date]', f).value; $('[name=due]', f).value = S.addDays(d, s.terms || 30); } };
        supSel.addEventListener('change', syncSup);
        // amounts auto-calc
        let last = 'total';
        for (const k of ['subtotal', 'vat', 'total']) $(`[name=${k}]`, f).addEventListener('input', (e) => { last = k; const v = parseFloat(e.target.value) || 0; if (k === 'total') { const sb = +(v / 1.15).toFixed(2); $('[name=subtotal]', f).value = sb; $('[name=vat]', f).value = +(v - sb).toFixed(2); } else if (k === 'subtotal') { const vt = +(v * 0.15).toFixed(2); $('[name=vat]', f).value = vt; $('[name=total]', f).value = +(v + vt).toFixed(2); } else { const sb = parseFloat($('[name=subtotal]', f).value) || 0; $('[name=total]', f).value = +(sb + v).toFixed(2); } });
        // scan
        $('#invphoto', f).addEventListener('change', async (e) => { const file = e.target.files[0]; if (file) await scanInto(f, file); });
        const collect = () => {
          const d = formData(f);
          let supplierId = d.supplierId;
          if (supplierId === '__new__') { if (!d.ns_name.trim() || !S.validVAT(d.ns_vat)) { toast(t('invalid_vat')); return null; } supplierId = S.saveSupplier(db, { name: d.ns_name.trim(), vat: d.ns_vat.replace(/\D/g, ''), terms: 30, addr: {} }).id; }
          if (!supplierId) { toast(t('required') + ': ' + t('supplier')); supSel.focus(); return null; }
          const total = parseFloat(d.total) || 0; if (!total) { toast(t('required') + ': ' + t('total')); return null; }
          return { supplierId, no: d.no.trim() || `INV-${Date.now().toString(36).toUpperCase()}`, date: d.date, due: d.due, subtotal: parseFloat(d.subtotal) || 0, vat: parseFloat(d.vat) || 0, total, account: d.account, branch: d.branch, notes: d.notes, attachment: d.attachment || null, user: user().id };
        };
        f.addEventListener('submit', (e) => { e.preventDefault(); const data = collect(); if (!data) return; const inv = S.createSupplierInvoice(db, data); S.postSupplierInvoice(db, inv.id, user().id); persist(); closeSheet(); toast(t('invoice_posted')); render(); });
        $('[data-draft]', f).addEventListener('click', () => { const data = collect(); if (!data) return; S.createSupplierInvoice(db, data); persist(); closeSheet(); toast(t('draft_saved')); render(); });
      } });
  }
  async function scanInto(f, file) {
    const st = $('#scanstate', f);
    const setp = (label, p) => { st.innerHTML = `<div class="notice info">${I.info}<span>${esc(label)}</span></div><div class="progress"><i style="width:${Math.round(p * 100)}%"></i></div>`; };
    setp(t('reading_invoice'), 0.02);
    let previewUrl = null;
    try {
      const res = await InvoiceReader.recognize(file, (m) => { if (m.status === 'recognizing text') setp(t('ocr_recognizing', { p: Math.round(m.progress * 100) }), 0.5 + m.progress / 2); else if (m.progress != null) setp(t('ocr_loading', { p: Math.round(m.progress * 100) }), m.progress / 2); });
      previewUrl = res.previewUrl;
      const found = InvoiceReader.parse(res.text, { companyVat: db.company.vat });
      // small thumbnail stored with the invoice (demo: data URL)
      try { const thumb = await InvoiceReader.prepareImage(file, 600); $('[name=attachment]', f).value = thumb.dataUrl; } catch (e) { /* ignore */ }
      const matched = found.vat ? db.suppliers.find(s => s.vat === found.vat) : null;
      const set = (n, v) => { if (v !== undefined && v !== null && v !== '') { const el = $(`[name=${n}]`, f); el.value = v; el.classList.add('found'); } };
      if (matched) { set('supplierId', matched.id); $('[name=supplierId]', f).dispatchEvent(new Event('change')); $('#supnote', f).innerHTML = `<div class="notice good" style="margin-bottom:12px">${I.check}<span>${esc(t('matched_supplier'))}: <b>${esc(L(matched))}</b></span></div>`; }
      else if (found.vat) { set('supplierId', '__new__'); $('[name=supplierId]', f).dispatchEvent(new Event('change')); set('ns_vat', found.vat); if (found.name) set('ns_name', found.name); $('#supnote', f).innerHTML = `<div class="notice warn" style="margin-bottom:12px">${I.alert}<span>${esc(t('unknown_supplier'))}</span></div>`; }
      set('no', found.no); set('date', found.date);
      if (found.total != null) { set('total', found.total); set('subtotal', found.subtotal); set('vat', found.vatAmount); }
      if (found.date) { const s = sup($('[name=supplierId]', f).value); set('due', S.addDays(found.date, s?.terms || 30)); }
      const ok = found.score >= 0.75;
      st.innerHTML = `<div class="scanprev"><img src="${previewUrl}" alt=""></div><div class="notice ${ok ? 'good' : 'warn'}" style="margin-top:8px">${ok ? I.check : I.alert}<span>${esc(ok ? t('read_done') : t('read_partial'))}</span></div><details style="margin-top:6px"><summary class="small muted">OCR</summary><div class="ocrtext">${esc(res.text.trim().slice(0, 1500))}</div></details>`;
    } catch (err) {
      console.error(err);
      st.innerHTML = `${previewUrl ? `<div class="scanprev"><img src="${previewUrl}" alt=""></div>` : ''}<div class="notice bad" style="margin-top:8px">${I.alert}<span>${esc(t('read_failed'))}</span></div>`;
    }
  }
  function invoiceSheet(id) {
    const inv = db.supplierInvoices.find(x => x.id === id); const st = S.invoiceStatus(inv); const open = +(inv.total - inv.paid).toFixed(2);
    const pays = db.payments.filter(p => p.invoiceId === id);
    openSheet({ title: inv.no, body: `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span class="strong">${esc(supName(inv.supplierId))}</span>${statusPill(st)}</div>
      ${inv.attachment ? `<div class="scanprev" style="margin-bottom:10px"><img src="${inv.attachment}" alt=""></div>` : ''}
      <div class="kv"><span class="k">${esc(t('invoice_date'))}</span><span class="v">${esc(fmtDate(inv.date))}</span></div>
      <div class="kv"><span class="k">${esc(t('due_date'))}</span><span class="v">${esc(fmtDate(inv.due))}</span></div>
      <div class="kv"><span class="k">${esc(t('branch'))}</span><span class="v">${esc(branchName(inv.branch))}</span></div>
      <div class="kv"><span class="k">${esc(t('expense_account'))}</span><span class="v">${esc(acctName(inv.account))}</span></div>
      <div class="kv"><span class="k">${esc(t('subtotal'))}</span><span class="v money">${money(inv.subtotal)}</span></div>
      <div class="kv"><span class="k">${esc(t('vat_15'))}</span><span class="v money">${money(inv.vat)}</span></div>
      <div class="kv total"><span class="k">${esc(t('total'))}</span><span class="v money">${money(inv.total)}</span></div>
      ${inv.status !== 'draft' ? `<div class="kv"><span class="k">${esc(t('remaining'))}</span><span class="v money ${open > 0 ? '' : ''}">${money(open)}</span></div>` : ''}
      ${inv.notes ? `<p class="small muted">${esc(inv.notes)}</p>` : ''}
      ${pays.length ? `<div class="section"><h2>${esc(t('record_payment'))}</h2>${pays.map(p => `<div class="kv"><span class="k">${esc(fmtDate(p.date))} · ${esc(acctName(p.from))}</span><span class="v money">${money(p.amount)}</span></div>`).join('')}</div>` : ''}
      <div id="payform"></div>
      <div class="btnrow">${inv.status === 'draft' && can('post') ? `<button class="btn primary" data-post>${esc(t('post_invoice'))}</button>` : ''}${inv.status !== 'draft' && open > 0 ? `<button class="btn primary" data-pay>${esc(t('record_payment'))}</button>` : ''}${inv.status === 'draft' ? `<button class="btn danger" data-del style="flex:0 0 52px" aria-label="${esc(t('delete'))}">${I.close}</button>` : ''}</div>
      <div id="confirm"></div>`, onMount: (sh) => {
      const p = $('[data-post]', sh); if (p) p.addEventListener('click', () => { S.postSupplierInvoice(db, id, user().id); persist(); closeSheet(); toast(t('invoice_posted')); render(); });
      const d = $('[data-del]', sh); if (d) d.addEventListener('click', () => confirmInline($('#confirm', sh), t('are_you_sure'), () => { db.supplierInvoices = db.supplierInvoices.filter(x => x.id !== id); persist(); closeSheet(); toast(t('deleted')); render(); }));
      const pay = $('[data-pay]', sh); if (pay) pay.addEventListener('click', () => {
        pay.classList.add('hidden');
        $('#payform', sh).innerHTML = `<form id="pf" class="card" style="margin-top:8px"><div class="grid2">${field(t('payment_amount'), moneyInput('amount', open))}${field(t('date'), dateInput('date', today()))}</div>${field(t('paid_from'), sel('from', [{ v: '1020', l: acctName('1020') }, { v: '1010', l: acctName('1010') }], '1020'))}<button class="btn primary" type="submit">${esc(t('record_payment'))}</button></form>`;
        $('#pf', sh).addEventListener('submit', (e) => { e.preventDefault(); const d = formData(e.target); S.recordPayment(db, { invoiceId: id, amount: parseFloat(d.amount) || 0, date: d.date, from: d.from, user: user().id }); persist(); closeSheet(); toast(t('payment_recorded')); render(); });
      });
    } });
  }

  // ---------- EOD ----------
  let eodBranch = null, eodDate = null;
  function screenEOD(main) {
    const t0 = today(); eodBranch = eodBranch || user().branch || db.branches[0].id; eodDate = eodDate || t0;
    const ds = S.daySales(db, eodDate, eodBranch); const expected = S.expectedCash(db, eodDate, eodBranch);
    const closed = db.eod.find(e => e.date === eodDate && e.branch === eodBranch && !e.reopened);
    const invToday = db.supplierInvoices.filter(i => i.date === eodDate && i.branch === eodBranch);
    const open = openDays(); const recent = [...db.eod].filter(e => !e.reopened).sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at)).slice(0, 8);
    main.innerHTML = `
      <div class="chips">${db.branches.map(b => `<button class="chip ${eodBranch === b.id ? 'active' : ''}" data-b="${b.id}">${esc(L(b))}</button>`).join('')}</div>
      <div class="card"><div class="grid2">${field(t('date'), dateInput('date', eodDate))}<div class="field"><label>${esc(t('invoices_today'))}</label><div class="input" style="display:flex;align-items:center;justify-content:space-between"><span class="num">${ds.n}</span><span class="money strong">${money(ds.total)}</span></div></div></div>
        ${['cash', 'mada', 'visa', 'tabby', 'transfer'].filter(m => ds.byMethod[m]).map(m => `<div class="kv"><span class="k">${esc(methodName(m))}</span><span class="v money">${money(ds.byMethod[m])}</span></div>`).join('')}
        ${invToday.length ? `<div class="kv"><span class="k">${esc(t('supplier_invoices'))} (${invToday.length})</span><span class="v money">${money(invToday.reduce((a, i) => a + i.total, 0))}</span></div>` : ''}
      </div>
      ${closed ? `<div class="card" style="margin-top:12px"><div class="notice good">${I.check}<span>${esc(t('already_closed'))} · ${esc(t('closed_by'))} ${esc(userName(db.users.find(u => u.id === closed.user)))}</span></div>
          <div class="kv"><span class="k">${esc(t('expected_cash'))}</span><span class="v money">${money(closed.expected)}</span></div><div class="kv"><span class="k">${esc(t('counted_cash'))}</span><span class="v money">${money(closed.counted)}</span></div>
          <div class="kv total"><span class="k">${esc(t('difference'))}</span><span class="v money">${diffPill(closed.diff)}</span></div>
          ${closed.notes ? `<p class="small muted">${esc(closed.notes)}</p>` : ''}
          ${can('reopen') ? `<button class="btn secondary" data-reopen style="margin-top:10px">${esc(t('reopen'))}</button>` : ''}</div>`
        : ds.n === 0 ? `<div class="empty" style="margin-top:12px">${esc(t('no_sales_for_day'))}</div>`
        : `<form class="card" id="eodform" style="margin-top:12px">
          <div class="kv total"><span class="k">${esc(t('expected_cash'))}</span><span class="v money">${money(expected)}</span></div>
          ${field(t('counted_cash'), moneyInput('counted', '', 'required autofocus style="font-size:24px;height:56px"'))}
          <div class="kv total"><span class="k">${esc(t('difference'))}</span><span class="v" id="diff">${diffPill(0)}</span></div>
          ${field(t('notes'), `<textarea class="input" name="notes" rows="2"></textarea>`)}
          <button class="btn primary" type="submit">${esc(t('close_day'))} · ${esc(branchName(eodBranch))} · ${esc(fmtDateShort(eodDate))}</button></form>`}
      ${open.length ? `<div class="section"><h2>${esc(t('open_days'))} <span class="pill warn">${open.length}</span></h2><div class="list">${open.map(o => `<button class="row" data-open="${o.date}|${o.branch}"><span class="avatar ${o.branch}">${esc(branch(o.branch).code)}</span><span class="main"><span class="t">${esc(weekday(o.date))} ${esc(fmtDateShort(o.date))}</span><span class="m">${esc(branchName(o.branch))}</span></span><span class="end"><span class="money">${money(S.daySales(db, o.date, o.branch).total)}</span><span class="pill warn">${esc(t('status_open'))}</span></span></button>`).join('')}</div></div>` : ''}
      <div class="section"><h2>${esc(t('recent_closings'))}</h2><div class="list">${recent.length ? recent.map(e => `<div class="row"><span class="avatar ${e.branch}">${esc(branch(e.branch).code)}</span><span class="main"><span class="t">${esc(fmtDate(e.date))} · ${esc(branchName(e.branch))}</span><span class="m">${esc(t('counted_cash'))} <span class="money">${money(e.counted)}</span> · ${esc(userName(db.users.find(u => u.id === e.user)))}</span></span><span class="end">${diffPill(e.diff)}</span></div>`).join('') : `<div class="empty">${esc(t('empty_list'))}</div>`}</div></div>`;
    $$('[data-b]', main).forEach(b => b.addEventListener('click', () => { eodBranch = b.dataset.b; screenEOD(main); }));
    $('[name=date]', main).addEventListener('change', (e) => { eodDate = e.target.value; screenEOD(main); });
    $$('[data-open]', main).forEach(b => b.addEventListener('click', () => { const [d, br] = b.dataset.open.split('|'); eodDate = d; eodBranch = br; screenEOD(main); window.scrollTo(0, 0); }));
    const f = $('#eodform', main);
    if (f) {
      $('[name=counted]', f).addEventListener('input', (e) => { $('#diff', f).innerHTML = diffPill(+((parseFloat(e.target.value) || 0) - expected).toFixed(2)); });
      f.addEventListener('submit', (e) => { e.preventDefault(); const d = formData(f); S.closeDay(db, { date: eodDate, branch: eodBranch, counted: parseFloat(d.counted) || 0, notes: d.notes, user: user().id }); persist(); toast(t('day_closed')); render(); });
    }
    const ro = $('[data-reopen]', main); if (ro) ro.addEventListener('click', () => { S.reopenDay(db, closed.id); persist(); toast(t('day_reopened')); render(); });
  }
  function diffPill(d) { if (Math.abs(d) < 0.005) return `<span class="pill good">${esc(t('exact'))}</span>`; return `<span class="pill ${d > 0 ? 'warn' : 'bad'}"><span class="money">${d > 0 ? '+' : '−'}${money(Math.abs(d))}</span> ${esc(t(d > 0 ? 'over' : 'short'))}</span>`; }

  // ---------- more / settings ----------
  function screenMore(main, args) {
    const u = user(); const theme = localStorage.getItem('daftar.theme') || 'auto';
    const sub = args && args[0];
    if (sub === 'users' && can('users')) return screenUsers(main);
    if (sub === 'branches' && can('settings')) return screenBranches(main);
    if (sub === 'accounts' && can('accounts')) return screenAccounts(main);
    main.innerHTML = `
      <div class="card" style="display:flex;align-items:center;gap:12px"><span class="avatar">${esc(initials(userName(u)))}</span><div style="flex:1"><div class="strong">${esc(userName(u))}</div><div class="small muted">${esc(t('role_' + u.role))}${u.branch ? ' · ' + esc(branchName(u.branch)) : ''}</div></div><button class="btn secondary sm" data-signout>${esc(t('signout'))}</button></div>
      <div class="section"><h2>${esc(t('language'))}</h2><div class="seg"><button class="${lang() === 'ar' ? 'active' : ''}" data-setlang="ar">العربية</button><button class="${lang() === 'en' ? 'active' : ''}" data-setlang="en">English</button></div></div>
      <div class="section"><h2>${esc(t('theme'))}</h2><div class="seg">${['auto', 'light', 'dark'].map(x => `<button class="${theme === x ? 'active' : ''}" data-theme="${x}">${esc(t('theme_' + x))}</button>`).join('')}</div></div>
      ${can('settings') ? `<div class="section"><h2>${esc(t('settings'))}</h2><div class="list">
        <button class="row" data-sub="company"><span class="main"><span class="t">${esc(t('company'))}</span><span class="m">${esc(L({ ar: db.company.name, en: db.company.nameEn }))} · ${esc(t('vat_number'))} <span class="num">${esc(db.company.vat)}</span></span></span>${I.chevron}</button>
        <button class="row" data-sub="branches"><span class="main"><span class="t">${esc(t('branches'))}</span><span class="m">${db.branches.length}</span></span>${I.chevron}</button>
        ${can('users') ? `<button class="row" data-sub="users"><span class="main"><span class="t">${esc(t('users'))}</span><span class="m">${db.users.length}</span></span>${I.chevron}</button>` : ''}
        <button class="row" data-sub="accounts"><span class="main"><span class="t">${esc(t('chart_of_accounts'))}</span><span class="m">${db.accounts.length}</span></span>${I.chevron}</button></div></div>` : can('accounts') ? `<div class="section"><div class="list"><button class="row" data-sub="accounts"><span class="main"><span class="t">${esc(t('chart_of_accounts'))}</span><span class="m">${db.accounts.length}</span></span>${I.chevron}</button></div></div>` : ''}
      <div class="section"><h2>${esc(t('backup'))}</h2><div class="actions-inline"><button class="btn secondary sm" data-export>${I.download}${esc(t('export_backup'))}</button><label class="btn secondary sm" for="bkfile">${I.upload}${esc(t('import_backup'))}</label><input id="bkfile" type="file" accept="application/json" class="sr">${can('settings') ? `<button class="btn sm danger" data-reset>${esc(t('reset_demo'))}</button>` : ''}</div><div id="confirm" style="margin-top:10px"></div></div>
      <p class="small muted" style="text-align:center;margin-top:28px">${esc(t('app'))} · ${esc(t('byHunters'))} · v0.1 prototype</p>`;
    $('[data-signout]', main).addEventListener('click', () => { session = null; sessionStorage.removeItem('daftar.session'); go('home'); render(); });
    $$('[data-setlang]', main).forEach(b => b.addEventListener('click', () => { I18N.setLang(b.dataset.setlang); render(); }));
    $$('[data-theme]', main).forEach(b => b.addEventListener('click', () => { applyTheme(b.dataset.theme); screenMore(main, args); }));
    $$('[data-sub]', main).forEach(b => b.addEventListener('click', () => b.dataset.sub === 'company' ? companyForm() : go('more/' + b.dataset.sub)));
    $('[data-export]', main).addEventListener('click', () => { download(`daftar-backup-${today()}.json`, JSON.stringify(db), 'application/json'); });
    $('#bkfile', main).addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; try { const obj = JSON.parse(await f.text()); if (obj.version && obj.journal) { S.replace(obj); toast(t('done')); render(); } } catch (err) { toast(t('read_failed')); } });
    const rs = $('[data-reset]', main); if (rs) rs.addEventListener('click', () => confirmInline($('#confirm', main), t('reset_confirm'), () => { S.reset(); session = null; sessionStorage.removeItem('daftar.session'); toast(t('reset_done')); go('home'); render(); }));
  }
  function applyTheme(x) { localStorage.setItem('daftar.theme', x); if (x === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', x); }
  function companyForm() {
    const c = db.company;
    openSheet({ title: t('company'), body: `<form id="cf">${field(t('company_name') + ' (ع)', inp('name', c.name))}${field(t('company_name') + ' (EN)', inp('nameEn', c.nameEn))}<div class="grid2">${field(t('vat_number'), inp('vat', c.vat, 'dir="ltr" inputmode="numeric"'))}${field(t('cr_number'), inp('cr', c.cr, 'dir="ltr" inputmode="numeric"'))}</div><button class="btn primary" type="submit">${esc(t('save'))}</button></form>`, onMount: (sh) => { $('#cf', sh).addEventListener('submit', (e) => { e.preventDefault(); Object.assign(db.company, formData(e.target)); persist(); closeSheet(); toast(t('done')); render(); }); } });
  }
  function subHeader(main, title) { $('#title').innerHTML = `<button class="iconbtn" data-back style="margin-inline-end:8px;vertical-align:middle">${I.back}</button>${esc(title)}`; $('[data-back]').addEventListener('click', () => go('more')); }
  function screenUsers(main) {
    subHeader(main, t('users'));
    main.innerHTML = `<div class="list">${db.users.map(u => `<button class="row" data-u="${u.id}"><span class="avatar">${esc(initials(userName(u)))}</span><span class="main"><span class="t">${esc(userName(u))}</span><span class="m">${esc(t('role_' + u.role))}${u.branch ? ' · ' + esc(branchName(u.branch)) : ''}</span></span><span class="pill ${u.active ? 'good' : 'neutral'}">${esc(t(u.active ? 'active' : 'inactive'))}</span></button>`).join('')}</div><button class="fab" id="fab">${I.plus}</button>`;
    $$('[data-u]', main).forEach(b => b.addEventListener('click', () => userForm(db.users.find(x => x.id === b.dataset.u))));
    $('#fab', main).addEventListener('click', () => userForm({}));
  }
  function userForm(u) {
    openSheet({ title: u.id ? t('edit_user') : t('add_user'), body: `<form id="uf"><div class="grid2">${field(t('user_name') + ' (ع)', inp('name', u.name || '', 'required'))}${field(t('user_name') + ' (EN)', inp('nameEn', u.nameEn || ''))}</div>
      ${field(t('role'), sel('role', ['admin', 'accountant', 'operator'].map(r => ({ v: r, l: t('role_' + r) })), u.role || 'operator'))}
      <div class="grid2">${field(t('branch'), sel('branch', [{ v: '', l: t('all') }, ...branchOptions()], u.branch || ''))}${field(t('pin'), inp('pin', u.pin || '1234', 'inputmode="numeric" dir="ltr" maxlength="6"'))}</div>
      ${field(t('active'), sel('active', [{ v: '1', l: t('active') }, { v: '0', l: t('inactive') }], u.active === false ? '0' : '1'))}
      <button class="btn primary" type="submit">${esc(t('save'))}</button></form>`, onMount: (sh) => { $('#uf', sh).addEventListener('submit', (e) => { e.preventDefault(); const d = formData(e.target); const rec = { id: u.id || S.uid(), name: d.name, nameEn: d.nameEn || d.name, role: d.role, branch: d.branch || null, pin: d.pin, active: d.active === '1' }; const i = db.users.findIndex(x => x.id === rec.id); if (i >= 0) db.users[i] = rec; else db.users.push(rec); persist(); closeSheet(); toast(t('user_saved')); render(); }); } });
  }
  function screenBranches(main) {
    subHeader(main, t('branches'));
    main.innerHTML = `<div class="list">${db.branches.map(b => `<button class="row" data-b="${b.id}"><span class="avatar ${b.id}">${esc(b.code)}</span><span class="main"><span class="t">${esc(L(b))}</span><span class="m">${esc(b.city || '')}</span></span>${I.chevron}</button>`).join('')}</div><button class="fab" id="fab">${I.plus}</button>`;
    const form = (b) => openSheet({ title: b.id ? t('edit') : t('add_branch'), body: `<form id="bf">${field(t('branch_name') + ' (ع)', inp('ar', b.ar || '', 'required'))}${field(t('branch_name') + ' (EN)', inp('en', b.en || ''))}<div class="grid2">${field(t('code'), inp('code', b.code || '', 'dir="ltr" style="text-transform:uppercase" maxlength="4"'))}${field(t('city'), inp('city', b.city || ''))}</div><button class="btn primary" type="submit">${esc(t('save'))}</button></form>`, onMount: (sh) => { $('#bf', sh).addEventListener('submit', (e) => { e.preventDefault(); const d = formData(e.target); const rec = { id: b.id || S.uid(), ar: d.ar, en: d.en || d.ar, code: (d.code || d.ar.slice(0, 3)).toUpperCase(), city: d.city }; const i = db.branches.findIndex(x => x.id === rec.id); if (i >= 0) db.branches[i] = rec; else db.branches.push(rec); persist(); closeSheet(); toast(t('branch_saved')); render(); }); } });
    $$('[data-b]', main).forEach(x => x.addEventListener('click', () => form(branch(x.dataset.b))));
    $('#fab', main).addEventListener('click', () => form({}));
  }
  function screenAccounts(main) {
    subHeader(main, t('chart_of_accounts'));
    const types = ['asset', 'liability', 'equity', 'revenue', 'expense'];
    main.innerHTML = types.map(ty => `<div class="section"><h2>${esc(t('type_' + ty))}</h2><div class="list">${db.accounts.filter(a => a.type === ty).map(a => `<div class="row" style="min-height:48px;padding:8px 14px"><span class="code" style="font-family:var(--mono);color:var(--muted);font-size:13px">${a.code}</span><span class="main"><span class="t" style="font-weight:500">${esc(L(a))}</span></span><span class="end"><span class="money" style="font-weight:500;font-size:13.5px">${money(Math.abs(S.accountBalance(db, a.code)))}</span></span></div>`).join('')}</div></div>`).join('') + (can('settings') ? `<button class="fab" id="fab">${I.plus}</button>` : '');
    const fab = $('#fab', main); if (fab) fab.addEventListener('click', () => openSheet({ title: t('add_account'), body: `<form id="af"><div class="grid2">${field(t('code'), inp('code', '', 'dir="ltr" inputmode="numeric" required'))}${field(t('account_type'), sel('type', types.map(x => ({ v: x, l: t('type_' + x) })), 'expense'))}</div>${field(t('account') + ' (ع)', inp('ar', '', 'required'))}${field(t('account') + ' (EN)', inp('en', ''))}<button class="btn primary" type="submit">${esc(t('save'))}</button></form>`, onMount: (sh) => { $('#af', sh).addEventListener('submit', (e) => { e.preventDefault(); const d = formData(e.target); if (acct(d.code)) return toast(t('code') + ' ✕'); db.accounts.push({ code: d.code, ar: d.ar, en: d.en || d.ar, type: d.type }); db.accounts.sort((a, b) => a.code.localeCompare(b.code)); persist(); closeSheet(); toast(t('account_saved')); render(); }); } }));
  }

  // ---------- boot ----------
  applyTheme(localStorage.getItem('daftar.theme') || 'auto');
  document.addEventListener('DOMContentLoaded', render);
  return { render, go, openSheet, closeSheet, toast, esc, money, t, L, lang, user, can, branchName, acctName, supName, memoText, methodName, download, csv, field, sel, dateInput, inp, today, get db() { return db; }, branchOptions, I, supplierSheet, invoiceSheet };
})();
