/* Daftar — reports (admin / accountant) */
window.Reports = (() => {
  const S = Store;
  const A = () => window.App;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const { t, money, fmtDate } = I18N;
  const esc = (s) => A().esc(s);

  let period = { preset: 'this_month', from: null, to: null };
  function periodRange() {
    const t0 = S.todayISO(); const y = t0.slice(0, 4), m = +t0.slice(5, 7);
    const p = period.preset;
    if (p === 'custom' && period.from && period.to) return [period.from, period.to];
    if (p === 'last_month') { const d = new Date(Date.UTC(+y, m - 2, 1)); const from = d.toISOString().slice(0, 10); const to = new Date(Date.UTC(+y, m - 1, 0)).toISOString().slice(0, 10); return [from, to]; }
    if (p === 'this_quarter') { const qm = Math.floor((m - 1) / 3) * 3 + 1; return [`${y}-${String(qm).padStart(2, '0')}-01`, t0]; }
    if (p === 'ytd') return [`${y}-01-01`, t0];
    return [`${t0.slice(0, 8)}01`, t0];
  }
  function periodBar(extra = '') {
    const [from, to] = periodRange();
    return `<div class="report-head no-print">
      <div class="chips" style="padding:0;margin:0;flex:1">${['this_month', 'last_month', 'this_quarter', 'ytd', 'custom'].map(p => `<button class="chip ${period.preset === p ? 'active' : ''}" data-p="${p}">${esc(t(p))}</button>`).join('')}</div>
      ${period.preset === 'custom' ? `<input class="input" type="date" data-from value="${from}" dir="ltr"><input class="input" type="date" data-to value="${to}" dir="ltr">` : ''}
      ${extra}
      <button class="btn secondary sm" data-csv>${A().I.download}${esc(t('export_csv'))}</button><button class="btn secondary sm" data-print>${A().I.print}${esc(t('print'))}</button></div>`;
  }
  function bindPeriod(main, rerender) {
    $$('[data-p]', main).forEach(b => b.addEventListener('click', () => { period.preset = b.dataset.p; if (b.dataset.p === 'custom') { const [f, to] = periodRange(); period.from = period.from || f; period.to = period.to || to; } rerender(); }));
    const f = $('[data-from]', main), to = $('[data-to]', main);
    if (f) f.addEventListener('change', () => { period.from = f.value; rerender(); });
    if (to) to.addEventListener('change', () => { period.to = to.value; rerender(); });
    $('[data-print]', main).addEventListener('click', () => window.print());
  }
  function title(main, name, sub) {
    $('#title').innerHTML = `<button class="iconbtn" data-back style="margin-inline-end:8px;vertical-align:middle">${A().I.back}</button>${esc(name)}`;
    $('[data-back]').addEventListener('click', () => A().go('reports'));
    const [from, to] = periodRange();
    return `<div class="report-title"><h2>${esc(A().lang() === 'ar' ? A().db.company.name : A().db.company.nameEn)} — ${esc(name)}</h2><div class="muted">${esc(sub || `${t('period')}: ${fmtDate(from)} → ${fmtDate(to)}`)}</div></div>`;
  }
  const th = (cols) => `<thead><tr>${cols.map(c => `<th class="${c.r ? 'money' : ''}">${esc(c.l)}</th>`).join('')}</tr></thead>`;

  function screen(main, args) {
    const which = args && args[0];
    if (!A().can('reports')) { main.innerHTML = `<div class="empty">${esc(t('no_access'))}</div>`; return; }
    const map = { tb: trialBalance, statement, pnl, vat, sales, aged, journal };
    if (which && map[which]) return map[which](main, args.slice(1));
    const items = [
      ['tb', 'trial_balance'], ['statement', 'statement_of_account'], ['pnl', 'pnl'], ['vat', 'vat_report'], ['sales', 'sales_report'], ['aged', 'aged_payables'], ['journal', 'general_journal'],
    ];
    const desc = { tb: ['أرصدة كل الحسابات مدين/دائن مع الافتتاحي والختامي', 'All accounts, debit/credit with opening and closing'], statement: ['حركة مورد أو حساب مع الرصيد الجاري', 'Movements for a supplier or account with running balance'], pnl: ['الإيرادات وتكلفة المبيعات والمصروفات وصافي الربح', 'Revenue, cost of sales, expenses, net profit'], vat: ['ضريبة المخرجات والمدخلات وصافي المستحق', 'Output vs input VAT and net payable'], sales: ['المبيعات حسب الفرع وطريقة الدفع واليوم', 'Sales by branch, payment method and day'], aged: ['المستحق للموردين حسب عمر الدين', 'What is owed to suppliers by age'], journal: ['كل القيود بتفاصيل الأطراف', 'Every entry with its lines'] };
    main.innerHTML = `<div class="list report-cards">${items.map(([k, l]) => `<button class="row" data-r="${k}"><span class="avatar">${A().I.reports}</span><span class="main"><span class="t">${esc(t(l))}</span><span class="m">${esc(A().lang() === 'ar' ? desc[k][0] : desc[k][1])}</span></span>${A().I.chevron}</button>`).join('')}</div>`;
    $$('[data-r]', main).forEach(b => b.addEventListener('click', () => A().go('reports/' + b.dataset.r)));
  }

  function trialBalance(main) {
    const db = A().db; const [from, to] = periodRange(); const tb = S.trialBalance(db, from, to);
    const rows = tb.rows;
    main.innerHTML = periodBar() + title(main, t('trial_balance')) + `
      <div class="notice ${tb.balanced ? 'good' : 'bad'}" style="margin-bottom:12px">${tb.balanced ? A().I.check : A().I.alert}<span>${esc(t(tb.balanced ? 'balanced' : 'not_balanced'))}</span></div>
      <div class="tablewrap"><table class="tbl">${th([{ l: t('code') }, { l: t('account') }, { l: t('opening') + ' ' + t('debit'), r: 1 }, { l: t('opening') + ' ' + t('credit'), r: 1 }, { l: t('debit'), r: 1 }, { l: t('credit'), r: 1 }, { l: t('closing') + ' ' + t('debit'), r: 1 }, { l: t('closing') + ' ' + t('credit'), r: 1 }])}
      <tbody>${rows.map(r => `<tr><td class="code">${r.code}</td><td>${esc(A().L(r))}</td><td class="money">${r.opening > 0 ? money(r.opening) : ''}</td><td class="money">${r.opening < 0 ? money(-r.opening) : ''}</td><td class="money">${r.debit ? money(r.debit) : ''}</td><td class="money">${r.credit ? money(r.credit) : ''}</td><td class="money">${r.closing > 0 ? money(r.closing) : ''}</td><td class="money">${r.closing < 0 ? money(-r.closing) : ''}</td></tr>`).join('')}
      <tr class="total"><td></td><td>${esc(t('totals'))}</td><td class="money">${money(tb.totals.openingDr)}</td><td class="money">${money(tb.totals.openingCr)}</td><td class="money">${money(tb.totals.debit)}</td><td class="money">${money(tb.totals.credit)}</td><td class="money">${money(tb.totals.closingDr)}</td><td class="money">${money(tb.totals.closingCr)}</td></tr></tbody></table></div>`;
    bindPeriod(main, () => trialBalance(main));
    $('[data-csv]', main).addEventListener('click', () => A().download(`trial-balance-${from}-${to}.csv`, A().csv([[t('code'), t('account'), 'Opening Dr', 'Opening Cr', t('debit'), t('credit'), 'Closing Dr', 'Closing Cr'], ...rows.map(r => [r.code, A().L(r), r.opening > 0 ? r.opening : 0, r.opening < 0 ? -r.opening : 0, r.debit, r.credit, r.closing > 0 ? r.closing : 0, r.closing < 0 ? -r.closing : 0])])));
  }

  let stmtSubject = null;
  function statement(main, args) {
    const db = A().db;
    if (args && args[0]) { const [type, id] = args[0].split(':'); stmtSubject = { type, id, code: id }; history.replaceState(null, '', '#/reports/statement'); }
    const [from, to] = periodRange();
    const opts = [{ v: '', l: t('pick_subject') }, ...db.suppliers.map(s => ({ v: 'supplier:' + s.id, l: `${t('supplier')}: ${A().L(s)}` })), ...db.accounts.map(a => ({ v: 'account:' + a.code, l: `${a.code} · ${A().L(a)}` }))];
    const cur = stmtSubject ? `${stmtSubject.type}:${stmtSubject.id || stmtSubject.code}` : '';
    let body = '';
    let st = null, name = '';
    if (stmtSubject) {
      st = S.statement(db, stmtSubject, from, to);
      name = stmtSubject.type === 'supplier' ? A().supName(stmtSubject.id) : A().acctName(stmtSubject.code);
      body = `<div class="tablewrap"><table class="tbl">${th([{ l: t('date') }, { l: t('reference') }, { l: t('description') }, { l: t('debit'), r: 1 }, { l: t('credit'), r: 1 }, { l: t('running_balance'), r: 1 }])}<tbody>
        <tr class="group"><td colspan="5">${esc(t('opening_balance'))}</td><td class="money">${money(st.opening)}</td></tr>
        ${st.lines.map(l => `<tr><td class="num">${l.date}</td><td class="code">${l.no}</td><td class="memo">${esc(A().memoText(l))}</td><td class="money">${l.debit ? money(l.debit) : ''}</td><td class="money">${l.credit ? money(l.credit) : ''}</td><td class="money">${money(l.balance)}</td></tr>`).join('')}
        <tr class="total"><td colspan="3">${esc(t('closing_balance'))}</td><td class="money">${money(st.totalDebit)}</td><td class="money">${money(st.totalCredit)}</td><td class="money">${money(st.closing)}</td></tr></tbody></table></div>
        ${stmtSubject.type === 'supplier' ? `<p class="small muted" style="margin-top:8px">${esc(A().lang() === 'ar' ? 'الرصيد الموجب = مستحق للمورد' : 'Positive balance = owed to supplier')}</p>` : ''}`;
    } else body = `<div class="empty">${esc(t('pick_subject'))}</div>`;
    main.innerHTML = periodBar(`<select class="select" data-subject>${opts.map(o => `<option value="${o.v}" ${o.v === cur ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`) + title(main, t('statement_of_account'), stmtSubject ? `${name} · ${fmtDate(from)} → ${fmtDate(to)}` : null) + body;
    bindPeriod(main, () => statement(main));
    $('[data-subject]', main).addEventListener('change', (e) => { const v = e.target.value; if (!v) { stmtSubject = null; } else { const [type, id] = v.split(':'); stmtSubject = { type, id, code: id }; } statement(main); });
    $('[data-csv]', main).addEventListener('click', () => { if (!st) return; A().download(`statement-${from}-${to}.csv`, A().csv([[t('date'), t('reference'), t('description'), t('debit'), t('credit'), t('running_balance')], [from, '', t('opening_balance'), '', '', st.opening], ...st.lines.map(l => [l.date, l.no, A().memoText(l), l.debit, l.credit, l.balance])])); });
  }

  function pnl(main) {
    const db = A().db; const [from, to] = periodRange(); const p = S.pnl(db, from, to);
    const sec = (label, rows, total) => `<tr class="group"><td colspan="2">${esc(label)}</td><td class="money">${money(total)}</td></tr>${rows.map(r => `<tr><td class="code">${r.code}</td><td>${esc(A().L(r))}</td><td class="money">${money(r.amount)}</td></tr>`).join('')}`;
    main.innerHTML = periodBar() + title(main, t('pnl')) + `<div class="tablewrap" style="max-width:720px"><table class="tbl">${th([{ l: t('code') }, { l: t('account') }, { l: t('sar'), r: 1 }])}<tbody>
      ${sec(t('revenue'), p.revenue, p.totalRevenue)}${sec(t('cogs'), p.cogs, p.totalCogs)}
      <tr class="total"><td colspan="2">${esc(t('gross_profit'))}</td><td class="money">${money(p.grossProfit)}</td></tr>
      ${sec(t('expenses'), p.expenses, p.totalExpenses)}
      <tr class="total"><td colspan="2">${esc(t(p.net >= 0 ? 'net_profit' : 'net_loss'))}</td><td class="money" style="color:${p.net >= 0 ? 'var(--good)' : 'var(--bad)'}">${money(Math.abs(p.net))}</td></tr></tbody></table></div>`;
    bindPeriod(main, () => pnl(main));
    $('[data-csv]', main).addEventListener('click', () => A().download(`pnl-${from}-${to}.csv`, A().csv([[t('account'), t('sar')], ...p.revenue.map(r => [A().L(r), r.amount]), ...p.cogs.map(r => [A().L(r), -r.amount]), ...p.expenses.map(r => [A().L(r), -r.amount]), [t('net_profit'), p.net]])));
  }

  function vat(main) {
    const db = A().db; const [from, to] = periodRange(); const v = S.vatReport(db, from, to);
    main.innerHTML = periodBar() + title(main, t('vat_report')) + `<div class="card" style="max-width:560px">
      <div class="kv"><span class="k">${esc(t('taxable_sales'))}</span><span class="v money">${money(v.taxableSales)}</span></div>
      <div class="kv"><span class="k">${esc(t('output_vat'))} (15%)</span><span class="v money">${money(v.output)}</span></div>
      <div class="kv"><span class="k">${esc(t('taxable_purchases'))}</span><span class="v money">${money(v.taxablePurchases)}</span></div>
      <div class="kv"><span class="k">${esc(t('input_vat'))}</span><span class="v money">${money(v.input)}</span></div>
      <div class="kv total"><span class="k">${esc(t(v.net >= 0 ? 'net_vat' : 'vat_refundable'))}</span><span class="v money">${money(Math.abs(v.net))}</span></div></div>`;
    bindPeriod(main, () => vat(main));
    $('[data-csv]', main).addEventListener('click', () => A().download(`vat-${from}-${to}.csv`, A().csv([[t('taxable_sales'), v.taxableSales], [t('output_vat'), v.output], [t('taxable_purchases'), v.taxablePurchases], [t('input_vat'), v.input], [t('net_vat'), v.net]])));
  }

  function sales(main) {
    const db = A().db; const [from, to] = periodRange(); const r = S.salesReport(db, from, to);
    const days = Object.keys(r.byDay).sort(); const max = Math.max(1, ...Object.values(r.byDay));
    main.innerHTML = periodBar() + title(main, t('sales_report')) + `
      <div class="tiles" style="margin-bottom:12px"><div class="tile"><span class="k">${esc(t('total'))}</span><span class="v money">${money(r.total, { whole: true })}</span></div><div class="tile"><span class="k">${esc(t('invoices'))}</span><span class="v num">${r.n}</span></div><div class="tile"><span class="k">${esc(A().lang() === 'ar' ? 'متوسط الفاتورة' : 'Average ticket')}</span><span class="v money">${money(r.avg)}</span></div><div class="tile"><span class="k">${esc(A().lang() === 'ar' ? 'أيام' : 'Days')}</span><span class="v num">${days.length}</span></div></div>
      <div class="card" style="margin-bottom:12px"><div class="spark" style="height:90px;margin-top:0">${days.map(d => `<span style="height:${Math.max(3, r.byDay[d] / max * 100)}%" title="${d}: ${money(r.byDay[d])}"></span>`).join('')}</div></div>
      <div class="grid2" style="align-items:start">
        <div class="card"><h3 style="font-size:14px;margin-bottom:6px">${esc(t('by_branch'))}</h3>${db.branches.map(b => `<div class="kv"><span class="k">${esc(A().L(b))}</span><span class="v money">${money(r.byBranch[b.id] || 0)}</span></div>`).join('')}</div>
        <div class="card"><h3 style="font-size:14px;margin-bottom:6px">${esc(t('by_payment'))}</h3>${['cash', 'mada', 'visa', 'tabby', 'transfer'].filter(m => r.byMethod[m]).map(m => `<div class="kv"><span class="k">${esc(A().methodName(m))}</span><span class="v money">${money(r.byMethod[m])}</span></div>`).join('')}</div></div>
      <div class="tablewrap" style="margin-top:12px;max-width:720px"><table class="tbl">${th([{ l: t('date') }, ...db.branches.map(b => ({ l: A().L(b), r: 1 })), { l: t('total'), r: 1 }])}<tbody>${days.map(d => { const bb = db.branches.map(b => db.salesInvoices.filter(i => i.date === d && i.branch === b.id).reduce((a, i) => a + i.total, 0)); return `<tr><td class="num">${d}</td>${bb.map(v => `<td class="money">${money(v)}</td>`).join('')}<td class="money strong">${money(r.byDay[d])}</td></tr>`; }).join('')}</tbody></table></div>`;
    bindPeriod(main, () => sales(main));
    $('[data-csv]', main).addEventListener('click', () => A().download(`sales-${from}-${to}.csv`, A().csv([[t('date'), t('total')], ...days.map(d => [d, r.byDay[d]])])));
  }

  function aged(main) {
    const db = A().db; const a = S.agedPayables(db); const to = S.todayISO();
    main.innerHTML = periodBar() + title(main, t('aged_payables'), `${fmtDate(to)}`) + `<div class="tablewrap"><table class="tbl">${th([{ l: t('supplier') }, { l: t('current'), r: 1 }, { l: t('days_1_30'), r: 1 }, { l: t('days_31_60'), r: 1 }, { l: t('days_61_90'), r: 1 }, { l: t('days_90p'), r: 1 }, { l: t('total'), r: 1 }])}<tbody>
      ${a.rows.map(r => `<tr><td>${esc(A().supName(r.supplierId))}</td><td class="money">${r.current ? money(r.current) : ''}</td><td class="money">${r.d30 ? money(r.d30) : ''}</td><td class="money">${r.d60 ? money(r.d60) : ''}</td><td class="money">${r.d90 ? money(r.d90) : ''}</td><td class="money">${r.d90p ? money(r.d90p) : ''}</td><td class="money strong">${money(r.total)}</td></tr>`).join('')}
      <tr class="total"><td>${esc(t('totals'))}</td><td class="money">${money(a.totals.current)}</td><td class="money">${money(a.totals.d30)}</td><td class="money">${money(a.totals.d60)}</td><td class="money">${money(a.totals.d90)}</td><td class="money">${money(a.totals.d90p)}</td><td class="money">${money(a.totals.total)}</td></tr></tbody></table></div>`;
    bindPeriod(main, () => aged(main));
    $('[data-csv]', main).addEventListener('click', () => A().download(`aged-payables-${to}.csv`, A().csv([[t('supplier'), t('current'), t('days_1_30'), t('days_31_60'), t('days_61_90'), t('days_90p'), t('total')], ...a.rows.map(r => [A().supName(r.supplierId), r.current, r.d30, r.d60, r.d90, r.d90p, r.total])])));
  }

  function journal(main) {
    const db = A().db; const [from, to] = periodRange();
    const list = db.journal.filter(j => j.date >= from && j.date <= to).sort((a, b) => b.date.localeCompare(a.date) || b.no.localeCompare(a.no)).slice(0, 300);
    main.innerHTML = periodBar() + title(main, t('general_journal')) + `<div class="tablewrap"><table class="tbl">${th([{ l: t('date') }, { l: t('reference') }, { l: t('description') }, { l: t('account') }, { l: t('debit'), r: 1 }, { l: t('credit'), r: 1 }])}<tbody>
      ${list.map(j => j.lines.map((l, i) => `<tr>${i === 0 ? `<td class="num" rowspan="${j.lines.length}">${j.date}</td><td class="code" rowspan="${j.lines.length}">${j.no}</td><td class="memo" rowspan="${j.lines.length}">${esc(A().memoText(j))}</td>` : ''}<td style="${l.credit ? 'padding-inline-start:28px' : ''}">${esc(A().acctName(l.account))}${l.branch ? ` <span class="small muted">${esc(A().branchName(l.branch))}</span>` : ''}</td><td class="money">${l.debit ? money(l.debit) : ''}</td><td class="money">${l.credit ? money(l.credit) : ''}</td></tr>`).join('')).join('')}</tbody></table></div>`;
    bindPeriod(main, () => journal(main));
    $('[data-csv]', main).addEventListener('click', () => A().download(`journal-${from}-${to}.csv`, A().csv([[t('date'), t('reference'), t('description'), t('account'), t('debit'), t('credit')], ...list.flatMap(j => j.lines.map(l => [j.date, j.no, A().memoText(j), A().acctName(l.account), l.debit, l.credit]))])));
  }

  return { screen };
})();
