/* Daftar — reports & financial statements */
(() => {
  const { t, money, fmtDate, fmtMonth } = I18N;
  const S = Store, U = UI, A = App; const { $, $$, esc, L, icon } = U;
  const db = () => A.db;
  const P = { preset: 'this_month', branch: '', asOf: null };
  const REPORTS = [
    { g: 'rep_g_statements', items: [['tb', 'rep_tb'], ['is', 'rep_is'], ['bs', 'rep_bs'], ['cf', 'rep_cf']] },
    { g: 'rep_g_ledgers', items: [['statement', 'rep_statement'], ['supbal', 'rep_supbal'], ['custbal', 'rep_custbal'], ['cash', 'rep_cash'], ['aged', 'rep_aged']] },
    { g: 'rep_g_ops', items: [['vat', 'rep_vat'], ['sales', 'rep_sales'], ['exp', 'rep_exp'], ['journal', 'rep_journal']] },
  ];
  const FEAT = Object.fromEntries(REPORTS.flatMap(g => g.items));
  const feature = (k) => S.FEATURES.find(f => f.key === FEAT[k]);
  const fmt = (v) => money(v, { paren: true });
  const company = () => L({ ar: db().company.name, en: db().company.nameEn });

  Screens.reports = (main, args) => {
    const k = args[0];
    if (k && FEAT[k]) { if (!A.feat(FEAT[k])) { main.innerHTML = U.empty(t('no_access')); return; } if (k === 'journal') { A.go('journal'); return; } A.setTitle(L(feature(k)), 'reports'); return R[k](main, args.slice(1)); }
    main.innerHTML = REPORTS.map(g => { const items = g.items.filter(([, f]) => A.feat(f) && (f !== 'rep_custbal' || A.feat('customers'))); return items.length ? `<div class="section"><h2>${esc(t(g.g))}</h2><div class="report-cards">${items.map(([key, f]) => `<button class="row" data-r="${key}"><span class="avatar">${icon('reports')}</span><span class="main"><span class="t">${esc(L(S.FEATURES.find(x => x.key === f)))}</span><span class="m">${esc(t('rep_hint_' + key))}</span></span>${icon('chevron')}</button>`).join('')}</div></div>` : ''; }).join('');
    $$('[data-r]', main).forEach(b => b.onclick = () => A.go('reports/' + b.dataset.r));
  };
  const head = (name, sub) => `<div class="report-title"><h2>${esc(company())} — ${esc(name)}</h2><div class="muted">${esc(sub)}</div></div>`;
  const periodSub = () => { const [f, to] = A.periodRange(P); return `${t('period')}: ${fmtDate(f)} → ${fmtDate(to)}${P.branch ? ' · ' + A.branchName(P.branch) : ''}`; };
  const R = {};

  // ---------------------------------------------------------------- trial balance
  const TB = { level: 3, mode: 'tree', type: '', hideZero: true, q: '' };
  R.tb = (main) => {
    const d = db(); const [from, to] = A.periodRange(P);
    const r = S.trialBalance(d, { from, to, branch: P.branch, level: TB.level, mode: TB.mode, type: TB.type, hideZero: TB.hideZero, q: TB.q });
    const extra = `<select class="select fb" data-lv aria-label="${esc(t('level'))}">${[1, 2, 3, 4, 5].map(l => `<option value="${l}" ${TB.level === l ? 'selected' : ''}>${esc(t('level'))} ${l}</option>`).join('')}</select>
      <select class="select fb" data-mode>${['tree', 'level', 'leaf'].map(m => `<option value="${m}" ${TB.mode === m ? 'selected' : ''}>${esc(t('mode_' + m))}</option>`).join('')}</select>
      <select class="select fb" data-ty><option value="">${esc(t('acc_type'))}: ${esc(t('all'))}</option>${['asset', 'liability', 'equity', 'revenue', 'cogs', 'expense'].map(x => `<option value="${x}" ${TB.type === x ? 'selected' : ''}>${esc(t('t_' + x))}</option>`).join('')}</select>
      <input class="input fb" data-q placeholder="${esc(t('search'))}" value="${esc(TB.q)}"><label class="check sm"><input type="checkbox" data-hz ${TB.hideZero ? 'checked' : ''}><span>${esc(t('hide_zero'))}</span></label>`;
    const cell = (v, side) => side === 'dr' ? (v > 0.005 ? money(v) : '') : (v < -0.005 ? money(-v) : '');
    main.innerHTML = A.filterBar(P, { extra }) + head(t('rep_tb'), periodSub()) + `
      <div class="notice ${r.balanced ? 'good' : 'bad'}">${icon(r.balanced ? 'check' : 'alert')}<span>${esc(t(r.balanced ? 'balanced' : 'not_balanced'))}</span></div>
      <div class="tablewrap mt"><table class="tbl tb"><thead><tr><th rowspan="2">${esc(t('code'))}</th><th rowspan="2">${esc(t('account'))}</th><th colspan="2" class="ctr">${esc(t('opening'))}</th><th colspan="2" class="ctr">${esc(t('movement'))}</th><th colspan="2" class="ctr">${esc(t('closing'))}</th></tr><tr><th class="money">${esc(t('debit'))}</th><th class="money">${esc(t('credit'))}</th><th class="money">${esc(t('debit'))}</th><th class="money">${esc(t('credit'))}</th><th class="money">${esc(t('debit'))}</th><th class="money">${esc(t('credit'))}</th></tr></thead>
      <tbody>${r.rows.map(x => `<tr class="${x.group ? 'group' : ''} click" data-acc="${x.code}"><td class="code">${x.code}</td><td style="padding-inline-start:${10 + (TB.mode === 'tree' ? (x.level - 1) * 14 : 0)}px">${esc(L(x))}</td><td class="money">${cell(x.open, 'dr')}</td><td class="money">${cell(x.open, 'cr')}</td><td class="money">${money(x.dr, { blankZero: true })}</td><td class="money">${money(x.cr, { blankZero: true })}</td><td class="money">${cell(x.close, 'dr')}</td><td class="money">${cell(x.close, 'cr')}</td></tr>`).join('')}
      <tr class="total"><td></td><td>${esc(t('totals'))}</td><td class="money">${money(r.totals.openDr)}</td><td class="money">${money(r.totals.openCr)}</td><td class="money">${money(r.totals.dr)}</td><td class="money">${money(r.totals.cr)}</td><td class="money">${money(r.totals.closeDr)}</td><td class="money">${money(r.totals.closeCr)}</td></tr></tbody></table></div>`;
    A.bindFilter(main, P, () => R.tb(main));
    $('[data-lv]', main).onchange = (e) => { TB.level = +e.target.value; R.tb(main); };
    $('[data-mode]', main).onchange = (e) => { TB.mode = e.target.value; R.tb(main); };
    $('[data-ty]', main).onchange = (e) => { TB.type = e.target.value; R.tb(main); };
    $('[data-q]', main).onchange = (e) => { TB.q = e.target.value.trim(); R.tb(main); };
    $('[data-hz]', main).onchange = (e) => { TB.hideZero = e.target.checked; R.tb(main); };
    $$('[data-acc]', main).forEach(x => x.onclick = () => A.feat('rep_statement') && A.go('reports/statement/' + x.dataset.acc));
    $('[data-csv]', main).onclick = () => U.download(`trial-balance-${from}-${to}.csv`, U.csv([[t('code'), t('account'), 'Opening Dr', 'Opening Cr', t('debit'), t('credit'), 'Closing Dr', 'Closing Cr'], ...r.rows.map(x => [x.code, L(x), x.open > 0 ? x.open : 0, x.open < 0 ? -x.open : 0, x.dr, x.cr, x.close > 0 ? x.close : 0, x.close < 0 ? -x.close : 0])]));
  };

  // ---------------------------------------------------------------- income statement
  const IS = { level: 3 };
  R.is = (main) => {
    const d = db(); const [from, to] = A.periodRange(P); const r = S.incomeStatement(d, { from, to, branch: P.branch, level: IS.level });
    const sec = (label, rows, total) => `<tr class="group"><td colspan="2">${esc(label)}</td><td class="money">${fmt(total)}</td></tr>${rows.map(x => `<tr class="${x.group ? 'sub' : ''} click" data-acc="${x.code}"><td class="code">${x.code}</td><td style="padding-inline-start:${10 + (x.level - 2) * 14}px">${esc(L(x))}</td><td class="money">${fmt(x.amount)}</td></tr>`).join('')}`;
    const zakat = r.zakatOn && A.feat('zakat') && r.net > 0 ? S.r2(r.net * 0.025) : 0;
    main.innerHTML = A.filterBar(P, { extra: `<select class="select fb" data-lv>${[2, 3, 4].map(l => `<option value="${l}" ${IS.level === l ? 'selected' : ''}>${esc(t('level'))} ${l}</option>`).join('')}</select>` }) + head(t('rep_is'), periodSub()) + `
      <div class="tablewrap narrow"><table class="tbl">${U.th([{ l: t('code') }, { l: t('account') }, { l: t('sar'), r: 1 }])}<tbody>
      ${sec(t('revenue'), r.revenue, r.totalRevenue)}${sec(t('cogs'), r.cogs, r.totalCogs)}
      <tr class="total"><td colspan="2">${esc(t('gross_profit'))}</td><td class="money">${fmt(r.gross)}</td></tr>
      ${sec(t('expenses'), r.expenses, r.totalExpenses)}
      <tr class="total big"><td colspan="2">${esc(t(r.net >= 0 ? 'net_profit' : 'net_loss'))}</td><td class="money ${r.net >= 0 ? 'good-t' : 'bad-t'}">${fmt(r.net)}</td></tr>
      ${zakat ? `<tr><td colspan="2">${esc(t('zakat_est'))}</td><td class="money">${fmt(-zakat)}</td></tr><tr class="total"><td colspan="2">${esc(t('after_zakat'))}</td><td class="money">${fmt(r.net - zakat)}</td></tr>` : ''}
      </tbody></table></div>`;
    A.bindFilter(main, P, () => R.is(main));
    $('[data-lv]', main).onchange = (e) => { IS.level = +e.target.value; R.is(main); };
    $$('[data-acc]', main).forEach(x => x.onclick = () => A.feat('rep_statement') && A.go('reports/statement/' + x.dataset.acc));
    $('[data-csv]', main).onclick = () => U.download(`income-statement-${from}-${to}.csv`, U.csv([[t('code'), t('account'), t('sar')], ...[...r.revenue, ...r.cogs, ...r.expenses].map(x => [x.code, L(x), x.amount]), ['', t('net_profit'), r.net]]));
  };

  // ---------------------------------------------------------------- balance sheet
  const BS = { level: 3 };
  R.bs = (main) => {
    const d = db(); const asOf = P.asOf || S.todayISO(); const r = S.balanceSheet(d, { asOf, branch: P.branch, level: BS.level });
    const rows = (list) => list.map(x => `<tr class="${x.group ? 'sub' : ''} click" data-acc="${x.code}"><td class="code">${x.code}</td><td style="padding-inline-start:${10 + (x.level - 2) * 14}px">${esc(L(x))}</td><td class="money">${fmt(x.amount)}</td></tr>`).join('');
    main.innerHTML = A.filterBar(P, { asOf: true, extra: `<select class="select fb" data-lv>${[2, 3, 4].map(l => `<option value="${l}" ${BS.level === l ? 'selected' : ''}>${esc(t('level'))} ${l}</option>`).join('')}</select>` }) + head(t('rep_bs'), `${t('as_of')} ${fmtDate(asOf)}${P.branch ? ' · ' + A.branchName(P.branch) : ''}`) + `
      <div class="notice ${r.balanced ? 'good' : 'bad'}">${icon(r.balanced ? 'check' : 'alert')}<span>${esc(t(r.balanced ? 'balanced' : 'not_balanced'))} — ${esc(t('total_assets'))} = ${esc(t('total_le'))}</span></div>
      <div class="cols eq mt"><div class="tablewrap"><table class="tbl">${U.th([{ l: t('code') }, { l: t('t_asset') }, { l: t('sar'), r: 1 }])}<tbody>${rows(r.assets)}<tr class="total big"><td colspan="2">${esc(t('total_assets'))}</td><td class="money">${fmt(r.totalAssets)}</td></tr></tbody></table></div>
      <div class="tablewrap"><table class="tbl">${U.th([{ l: t('code') }, { l: t('t_liability') + ' / ' + t('t_equity') }, { l: t('sar'), r: 1 }])}<tbody>${rows(r.liabilities)}<tr class="total"><td colspan="2">${esc(t('total_liabilities'))}</td><td class="money">${fmt(r.totalLiabilities)}</td></tr>
        ${rows(r.equity)}<tr><td></td><td>${esc(t('current_profit'))}</td><td class="money">${fmt(r.currentProfit)}</td></tr><tr class="total"><td colspan="2">${esc(t('total_equity'))}</td><td class="money">${fmt(r.totalEquity + r.currentProfit)}</td></tr>
        <tr class="total big"><td colspan="2">${esc(t('total_le'))}</td><td class="money">${fmt(r.totalLE)}</td></tr></tbody></table></div></div>`;
    A.bindFilter(main, P, () => R.bs(main));
    $('[data-lv]', main).onchange = (e) => { BS.level = +e.target.value; R.bs(main); };
    $$('[data-acc]', main).forEach(x => x.onclick = () => A.feat('rep_statement') && A.go('reports/statement/' + x.dataset.acc));
    $('[data-csv]', main).onclick = () => U.download(`balance-sheet-${asOf}.csv`, U.csv([[t('code'), t('account'), t('sar')], ...[...r.assets, ...r.liabilities, ...r.equity].map(x => [x.code, L(x), x.amount]), ['', t('current_profit'), r.currentProfit]]));
  };

  // ---------------------------------------------------------------- cash flow
  R.cf = (main) => {
    const d = db(); const [from, to] = A.periodRange(P); const r = S.cashFlow(d, { from, to, branch: P.branch });
    const sec = (title, rows, total) => `<tr class="group"><td>${esc(title)}</td><td></td></tr>${rows.map(x => `<tr><td style="padding-inline-start:24px">${esc(t(x.k))}</td><td class="money">${fmt(x.v)}</td></tr>`).join('')}<tr class="total"><td>${esc(t('total'))}</td><td class="money">${fmt(total)}</td></tr>`;
    main.innerHTML = A.filterBar(P) + head(t('rep_cf'), periodSub()) + `
      <div class="notice ${r.reconciles ? 'good' : 'bad'}">${icon(r.reconciles ? 'check' : 'alert')}<span>${esc(t('cf_reconciled'))}</span></div>
      <div class="tablewrap narrow mt"><table class="tbl">${U.th([{ l: '' }, { l: t('sar'), r: 1 }])}<tbody>${sec(t('cf_operating'), r.op, r.operating)}${sec(t('cf_investing'), r.inv, r.investing)}${sec(t('cf_financing'), r.fin, r.financing)}
      <tr class="total big"><td>${esc(t('cf_net'))}</td><td class="money">${fmt(r.net)}</td></tr><tr><td>${esc(t('cf_open'))}</td><td class="money">${fmt(r.openingCash)}</td></tr><tr class="total"><td>${esc(t('cf_close'))}</td><td class="money">${fmt(r.closingCash)}</td></tr></tbody></table></div>`;
    A.bindFilter(main, P, () => R.cf(main));
    $('[data-csv]', main).onclick = () => U.download(`cash-flow-${from}-${to}.csv`, U.csv([...r.op, ...r.inv, ...r.fin].map(x => [t(x.k), x.v]).concat([[t('cf_net'), r.net]])));
  };

  // ---------------------------------------------------------------- statement of account
  const ST = { code: '', view: 'detail', type: '' };
  R.statement = (main, args) => {
    const d = db(); if (args[0]) { ST.code = args[0]; history.replaceState(null, '', '#/reports/statement'); }
    const [from, to] = A.periodRange(P);
    const opts = [{ v: '', l: t('pick_subject') }, { group: t('suppliers'), options: d.suppliers.map(s => ({ v: s.account, l: L({ ar: s.name, en: s.nameEn }) })) }, { group: t('customers'), options: d.customers.map(s => ({ v: s.account, l: L({ ar: s.name, en: s.nameEn }) })) }, ...U.accountOptions(d, { includeGroups: true })];
    const extra = `<span class="grow-sel">${U.sel('subject', opts, ST.code, 'data-subject')}</span><select class="select fb" data-view><option value="detail" ${ST.view === 'detail' ? 'selected' : ''}>${esc(t('detail'))}</option><option value="monthly" ${ST.view === 'monthly' ? 'selected' : ''}>${esc(t('monthly'))}</option></select>
      <select class="select fb" data-ty><option value="">${esc(t('entry_type'))}: ${esc(t('all'))}</option>${['sales', 'credit_sale', 'purchase', 'expense', 'receipt', 'payment', 'transfer', 'manual', 'opening', 'depreciation', 'eod', 'reversal'].map(x => `<option value="${x}" ${ST.type === x ? 'selected' : ''}>${esc(t('jt_' + x))}</option>`).join('')}</select>`;
    let body = U.empty(t('pick_subject')), st = null;
    if (ST.code && S.acc(d, ST.code)) {
      st = S.statement(d, { code: ST.code, from, to, branch: P.branch, type: ST.type || undefined });
      body = ST.view === 'detail' ? `<div class="tablewrap"><table class="tbl">${U.th([{ l: t('date') }, { l: t('entry_no') }, { l: t('entry_type') }, { l: t('description') }, { l: t('debit'), r: 1 }, { l: t('credit'), r: 1 }, { l: t('balance'), r: 1 }])}<tbody>
        <tr class="group"><td colspan="6">${esc(t('opening_balance'))}</td><td class="money">${fmt(st.opening)}</td></tr>
        ${st.lines.map(l => `<tr class="click" data-j="${l.id}"><td class="num">${l.date}</td><td class="code">${l.no}</td><td>${esc(t('jt_' + l.type))}</td><td class="memo">${esc(A.memoText(l.memo))}${l.note ? ' — ' + esc(l.note) : ''}</td><td class="money">${money(l.debit, { blankZero: true })}</td><td class="money">${money(l.credit, { blankZero: true })}</td><td class="money">${fmt(l.balance)}</td></tr>`).join('')}
        <tr class="total"><td colspan="4">${esc(t('closing_balance'))}</td><td class="money">${money(st.totalDebit)}</td><td class="money">${money(st.totalCredit)}</td><td class="money">${fmt(st.closing)}</td></tr></tbody></table></div>`
        : `<div class="tablewrap narrow"><table class="tbl">${U.th([{ l: t('month') }, { l: t('opening'), r: 1 }, { l: t('debit'), r: 1 }, { l: t('credit'), r: 1 }, { l: t('closing'), r: 1 }])}<tbody>${st.monthly.map(m => `<tr><td>${esc(fmtMonth(m.month))}</td><td class="money">${fmt(m.opening)}</td><td class="money">${money(m.debit)}</td><td class="money">${money(m.credit)}</td><td class="money strong">${fmt(m.closing)}</td></tr>`).join('')}
        <tr class="total"><td>${esc(t('totals'))}</td><td class="money">${fmt(st.opening)}</td><td class="money">${money(st.totalDebit)}</td><td class="money">${money(st.totalCredit)}</td><td class="money">${fmt(st.closing)}</td></tr></tbody></table></div>`;
    }
    const sub = ST.code ? `${A.accName(ST.code)} · ${periodSub()}` : periodSub();
    main.innerHTML = A.filterBar(P, { extra }) + head(t('rep_statement'), sub) + body;
    A.bindFilter(main, P, () => R.statement(main, []));
    $('[data-subject]', main).onchange = (e) => { ST.code = e.target.value; R.statement(main, []); };
    $('[data-view]', main).onchange = (e) => { ST.view = e.target.value; R.statement(main, []); };
    $('[data-ty]', main).onchange = (e) => { ST.type = e.target.value; R.statement(main, []); };
    $$('[data-j]', main).forEach(x => x.onclick = () => Screens.entrySheet(x.dataset.j));
    $('[data-csv]', main).onclick = () => { if (!st) return; U.download(`statement-${ST.code}-${from}-${to}.csv`, U.csv([[t('date'), t('entry_no'), t('description'), t('debit'), t('credit'), t('balance')], ['', '', t('opening_balance'), '', '', st.opening], ...st.lines.map(l => [l.date, l.no, A.memoText(l.memo), l.debit, l.credit, l.balance])])); };
  };

  // ---------------------------------------------------------------- party & cash balances
  function balancesTable(main, title, kind) {
    const d = db(); const [from, to] = A.periodRange(P);
    const r = kind === 'cash' ? S.cashBalances(d, { from, to, branch: P.branch }) : S.partyBalances(d, kind, { from, to, branch: P.branch });
    const name = (x) => kind === 'cash' ? `${x.code} · ${L(x)}` : L({ ar: x.name, en: x.nameEn });
    const acct = (x) => kind === 'cash' ? x.code : x.account;
    main.innerHTML = A.filterBar(P) + head(title, periodSub()) + `<div class="tablewrap"><table class="tbl">${U.th([{ l: kind === 'cash' ? t('account') : t('party_name') }, ...(kind !== 'cash' ? [{ l: t('vat_number') }] : []), { l: t('opening'), r: 1 }, { l: t('debit'), r: 1 }, { l: t('credit'), r: 1 }, { l: t('balance'), r: 1 }])}<tbody>
      ${r.rows.filter(x => x.open || x.dr || x.cr || x.close).map(x => `<tr class="click" data-acc="${acct(x)}"><td class="strong">${esc(name(x))}</td>${kind !== 'cash' ? `<td class="num">${esc(x.vat || '')}</td>` : ''}<td class="money">${fmt(x.open)}</td><td class="money">${money(x.dr, { blankZero: true })}</td><td class="money">${money(x.cr, { blankZero: true })}</td><td class="money strong">${fmt(x.close)}</td></tr>`).join('')}
      <tr class="total"><td ${kind !== 'cash' ? 'colspan="2"' : ''}>${esc(t('totals'))}</td><td class="money">${fmt(r.totals.open)}</td><td class="money">${money(r.totals.dr)}</td><td class="money">${money(r.totals.cr)}</td><td class="money">${fmt(r.totals.close)}</td></tr></tbody></table></div>`;
    A.bindFilter(main, P, () => balancesTable(main, title, kind));
    $$('[data-acc]', main).forEach(x => x.onclick = () => A.feat('rep_statement') && A.go('reports/statement/' + x.dataset.acc));
    $('[data-csv]', main).onclick = () => U.download(`${kind}-balances-${from}-${to}.csv`, U.csv([[t('name'), t('opening'), t('debit'), t('credit'), t('balance')], ...r.rows.map(x => [name(x), x.open, x.dr, x.cr, x.close])]));
  }
  R.supbal = (main) => balancesTable(main, t('rep_supbal'), 'supplier');
  R.custbal = (main) => balancesTable(main, t('rep_custbal'), 'customer');
  R.cash = (main) => balancesTable(main, t('rep_cash'), 'cash');

  // ---------------------------------------------------------------- VAT
  R.vat = (main) => {
    const d = db(); const [from, to] = A.periodRange(P); const v = S.vatReport(d, { from, to, branch: P.branch });
    main.innerHTML = A.filterBar(P) + head(t('rep_vat'), periodSub()) + `<div class="card narrow">
      <div class="kv"><span class="k">${esc(t('sales_base'))}</span><span class="v money">${money(v.salesBase)}</span></div><div class="kv"><span class="k">${esc(t('output_vat'))} (15%)</span><span class="v money">${money(v.output)}</span></div>
      <div class="kv"><span class="k">${esc(t('purch_base'))}</span><span class="v money">${money(v.purchBase)}</span></div><div class="kv"><span class="k">${esc(t('input_vat'))}</span><span class="v money">${money(v.input)}</span></div>
      <div class="kv total"><span class="k">${esc(t(v.net >= 0 ? 'net_vat' : 'vat_refundable'))}</span><span class="v money">${money(Math.abs(v.net))}</span></div></div>`;
    A.bindFilter(main, P, () => R.vat(main));
    $('[data-csv]', main).onclick = () => U.download(`vat-${from}-${to}.csv`, U.csv([[t('sales_base'), v.salesBase], [t('output_vat'), v.output], [t('purch_base'), v.purchBase], [t('input_vat'), v.input], [t('net_vat'), v.net]]));
  };

  // ---------------------------------------------------------------- sales
  R.sales = (main) => {
    const d = db(); const [from, to] = A.periodRange(P); const r = S.salesReport(d, { from, to, branch: P.branch });
    const days = Object.keys(r.byDay).sort(); const max = Math.max(1, ...Object.values(r.byDay));
    main.innerHTML = A.filterBar(P) + head(t('rep_sales'), periodSub()) + `
      <div class="tiles"><div class="tile"><span class="k">${esc(t('total'))}</span><span class="v money">${money(r.total, { whole: true })}</span></div><div class="tile"><span class="k">${esc(t('invoices'))}</span><span class="v num">${r.n}</span></div><div class="tile"><span class="k">${esc(t('avg_ticket'))}</span><span class="v money">${money(r.avg)}</span></div><div class="tile"><span class="k">${esc(t('credit_sales'))}</span><span class="v money">${money(r.credit, { whole: true })}</span></div></div>
      <div class="card mt"><div class="spark tall">${days.map(x => `<span style="height:${Math.max(3, r.byDay[x] / max * 100)}%" title="${x}: ${money(r.byDay[x])}"></span>`).join('')}</div></div>
      <div class="cols eq mt"><div class="card"><h3 class="h3 mt0">${esc(t('by_branch'))}</h3>${d.branches.map(b => `<div class="kv"><span class="k">${esc(L(b))}</span><span class="v money">${money(r.byBranch[b.id] || 0)}</span></div>`).join('')}</div>
      <div class="card"><h3 class="h3 mt0">${esc(t('by_payment'))}</h3>${Object.entries(r.byMethod).sort((a, b) => b[1] - a[1]).map(([m, v]) => `<div class="kv"><span class="k">${esc(t('m_' + m))}</span><span class="v money">${money(v)}</span></div>`).join('')}</div></div>
      <div class="tablewrap mt narrow"><table class="tbl compact">${U.th([{ l: t('date') }, ...d.branches.map(b => ({ l: L(b), r: 1 })), { l: t('total'), r: 1 }])}<tbody>${days.map(x => `<tr><td class="num">${x}</td>${d.branches.map(b => `<td class="money">${money(d.salesInvoices.filter(i => i.date === x && i.branch === b.id).reduce((a, i) => a + i.total, 0))}</td>`).join('')}<td class="money strong">${money(r.byDay[x])}</td></tr>`).join('')}</tbody></table></div>`;
    A.bindFilter(main, P, () => R.sales(main));
    $('[data-csv]', main).onclick = () => U.download(`sales-${from}-${to}.csv`, U.csv([[t('date'), t('total')], ...days.map(x => [x, r.byDay[x]])]));
  };

  // ---------------------------------------------------------------- expenses
  R.exp = (main) => {
    const d = db(); const [from, to] = A.periodRange(P); const r = S.expensesReport(d, { from, to, branch: P.branch });
    main.innerHTML = A.filterBar(P) + head(t('rep_exp'), periodSub()) + `<div class="cols eq">
      <div class="tablewrap"><table class="tbl">${U.th([{ l: t('ledger_expenses') }, { l: t('sar'), r: 1 }])}<tbody>${r.ledger.map(x => `<tr class="click" data-acc="${x.code}"><td><span class="code">${x.code}</span> ${esc(L(x))}</td><td class="money">${money(x.amount)}</td></tr>`).join('')}<tr class="total"><td>${esc(t('total'))}</td><td class="money">${money(r.ledgerTotal)}</td></tr></tbody></table></div>
      <div class="tablewrap"><table class="tbl">${U.th([{ l: t('documents') + ' — ' + t('by_account') }, { l: t('sar'), r: 1 }])}<tbody>${Object.entries(r.byAccount).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<tr><td>${esc(A.accName(c))}</td><td class="money">${money(v)}</td></tr>`).join('')}<tr><td>${esc(t('vat'))}</td><td class="money">${money(r.vat)}</td></tr><tr class="total"><td>${esc(t('total_with_vat'))}</td><td class="money">${money(r.total)}</td></tr></tbody></table></div></div>`;
    A.bindFilter(main, P, () => R.exp(main));
    $$('[data-acc]', main).forEach(x => x.onclick = () => A.feat('rep_statement') && A.go('reports/statement/' + x.dataset.acc));
    $('[data-csv]', main).onclick = () => U.download(`expenses-${from}-${to}.csv`, U.csv([[t('code'), t('account'), t('sar')], ...r.ledger.map(x => [x.code, L(x), x.amount])]));
  };

  // ---------------------------------------------------------------- aged payables
  R.aged = (main) => {
    const d = db(); const asOf = P.asOf || S.todayISO(); const a = S.agedPayables(d, asOf);
    main.innerHTML = A.filterBar(P, { asOf: true, branch: false }) + head(t('rep_aged'), `${t('as_of')} ${fmtDate(asOf)}`) + `<div class="tablewrap"><table class="tbl">${U.th([{ l: t('supplier') }, { l: t('current_b'), r: 1 }, { l: t('d30'), r: 1 }, { l: t('d60'), r: 1 }, { l: t('d90'), r: 1 }, { l: t('d90p'), r: 1 }, { l: t('total'), r: 1 }])}<tbody>
      ${a.rows.map(x => `<tr><td class="strong">${esc(A.supName(x.supplierId))}</td>${['current', 'd30', 'd60', 'd90', 'd90p'].map(k => `<td class="money ${k !== 'current' && x[k] ? 'bad-t' : ''}">${money(x[k], { blankZero: true })}</td>`).join('')}<td class="money strong">${money(x.total)}</td></tr>`).join('')}
      <tr class="total"><td>${esc(t('totals'))}</td>${['current', 'd30', 'd60', 'd90', 'd90p', 'total'].map(k => `<td class="money">${money(a.totals[k])}</td>`).join('')}</tr></tbody></table></div>`;
    A.bindFilter(main, P, () => R.aged(main));
    $('[data-csv]', main).onclick = () => U.download(`aged-payables-${asOf}.csv`, U.csv([[t('supplier'), t('current_b'), t('d30'), t('d60'), t('d90'), t('d90p'), t('total')], ...a.rows.map(x => [A.supName(x.supplierId), x.current, x.d30, x.d60, x.d90, x.d90p, x.total])]));
  };
})();
