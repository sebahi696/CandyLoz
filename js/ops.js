/* Daftar — operational screens: sales import, end of day, customers, suppliers, purchases (OCR), expenses */
(() => {
  const { t, money, fmtDate, fmtDateShort, weekday } = I18N;
  const S = Store, U = UI, A = App; const { $, $$, esc, L, icon } = U;
  const db = () => A.db;
  const today = () => S.todayISO();

  // ================================================================ SALES
  let salesMode = 'import';
  Screens.sales = (main) => {
    const d = db(); const imports = [...d.imports].reverse().slice(0, 14);
    const modes = [A.can('import_sales') && { v: 'import', l: t('import_from_pos') }, A.can('manual_sales') && { v: 'manual', l: t('manual_sales') }].filter(Boolean);
    if (!modes.find(m => m.v === salesMode)) salesMode = modes[0].v;
    const impDates = (im) => im.dates.length === 1 ? fmtDate(im.dates[0]) : fmtDateShort(im.dates[0]) + ' → ' + fmtDateShort(im.dates[im.dates.length - 1]);
    main.innerHTML = `<div class="cols"><div>${modes.length > 1 ? U.seg('mode', modes, salesMode) : ''}<div id="salesbody" class="mt"></div></div>
      <div><div class="section"><h2>${esc(t('recent_imports'))}</h2>${imports.length ? `<div class="tablewrap d-only"><table class="tbl compact">${U.th([{ l: t('file') }, { l: t('date') }, { l: t('invoices'), r: 1 }, { l: t('total'), r: 1 }, { l: t('user') }])}<tbody>${imports.map(im => `<tr><td>${esc(im.file || t('source_manual'))}</td><td>${esc(impDates(im))}</td><td class="money">${im.count}</td><td class="money">${money(im.total)}</td><td>${esc(A.userName(d.users.find(u => u.id === im.user)))}</td></tr>`).join('')}</tbody></table></div>
        <div class="list m-only">${imports.map(im => `<div class="row"><span class="avatar">${icon('file')}</span><span class="main"><span class="t">${esc(im.file || t('source_manual'))}</span><span class="m">${esc(impDates(im))} · ${esc(t('invoices_n', { n: im.count }))}</span></span><span class="end"><span class="money">${money(im.total)}</span></span></div>`).join('')}</div>` : U.empty(t('no_imports'))}</div></div></div>`;
    U.bindSeg(main, 'mode', (v) => { salesMode = v; Screens.sales(main); });
    const body = $('#salesbody', main);
    if (salesMode === 'import') {
      body.innerHTML = `<div class="card"><p class="muted mt0">${esc(t('import_hint'))}</p>
        <label class="dropzone" for="posfile">${icon('upload')}<p>${esc(t('choose_file'))}</p><small>CSV · XLSX</small></label><input id="posfile" type="file" accept=".csv,.xlsx,.xls,text/csv" class="sr">
        <div class="btnrow"><button class="btn secondary sm" data-sample>${icon('download')}${esc(t('download_sample'))}</button></div></div>`;
      $('#posfile', body).addEventListener('change', async (e) => { const f = e.target.files[0]; if (f) await importFlow(f); e.target.value = ''; });
      $('[data-sample]', body).addEventListener('click', () => { const b = d.branches[2] || d.branches[0]; U.download(`skysystem_sales_${b.code}_${today()}.csv`, PosImport.sampleCSV(b.code, today())); });
    } else {
      const methods = d.paymentMethods.filter(p => p.active);
      body.innerHTML = `<form class="card" id="manualform"><p class="muted mt0">${esc(t('manual_sales_hint'))}</p>
        <div class="grid2">${U.field(t('date'), U.dateInput('date', today()))}${A.branchField('branch')}</div>
        <div class="grid2">${methods.map(m => U.field(L(m), U.moneyInput('m_' + m.key))).join('')}</div>
        <div class="kv total"><span class="k">${esc(t('total'))} (${esc(t('incl_vat'))})</span><span class="v money" id="mtotal">0.00</span></div>
        <button class="btn primary" type="submit">${esc(t('post_sales'))}</button></form>`;
      const f = $('#manualform', body);
      f.addEventListener('input', () => { const x = U.formData(f); $('#mtotal', f).textContent = money(methods.reduce((a, m) => a + (parseFloat(x['m_' + m.key]) || 0), 0)); });
      f.addEventListener('submit', (e) => {
        e.preventDefault(); const x = U.formData(f); const br = d.branches.find(b => b.id === x.branch); const invs = [];
        for (const m of methods) { const v = parseFloat(x['m_' + m.key]) || 0; if (v > 0) { const sub = S.r2(v / 1.15); invs.push({ no: `MAN-${x.date}-${br.code}-${m.key}`, date: x.date, branch: x.branch, method: m.key, total: v, subtotal: sub, vat: S.r2(v - sub) }); } }
        if (!invs.length) return U.toast(t('nothing_to_post'));
        try { const r = S.postSalesBatch(d, invs, { source: 'manual', user: A.user().id }); A.commit(r.posted ? t('posted_sales', { n: r.posted }) : t('nothing_to_post')); } catch (er) { U.fail(er); }
      });
    }
  };
  async function importFlow(file) {
    const d = db(); let rows;
    try { rows = await PosImport.parseFile(file); } catch (e) { return U.toast(t('read_failed'), 'bad'); }
    if (!rows || rows.length < 2) return U.toast(t('nothing_to_post'));
    const headers = rows[0].map(h => String(h ?? '')); const map = PosImport.autoMap(headers);
    const fields = ['date', 'branch', 'invoice', 'subtotal', 'vat', 'total', 'method'];
    const hopts = [{ v: '', l: t('ignore') }, ...headers.map((h, i) => ({ v: i, l: h || `#${i + 1}` }))];
    U.openSheet({ title: t('import_from_pos'), wide: true, body: `<form id="mapform"><div class="notice info">${icon('file')}<span><b>${esc(file.name)}</b> · ${rows.length - 1} ${esc(t('rows'))}</span></div>
      <h3 class="h3">${esc(t('map_columns'))}</h3><div class="grid2">${fields.map(f => U.field(t('col_' + f), U.sel('m_' + f, hopts, map[f] ?? ''))).join('')}${U.field(t('default_branch'), U.sel('defbranch', A.branchOptions(), A.defaultBranch()))}</div>
      <div id="preview"></div><button class="btn primary" type="submit" id="postbtn">${esc(t('post_sales'))}</button></form>`, onMount: (s) => {
      const f = $('#mapform', s);
      const build = () => { const x = U.formData(f); const m = {}; for (const k of fields) m[k] = x['m_' + k] === '' ? undefined : +x['m_' + k]; return PosImport.buildInvoices(rows, m, { branches: d.branches, defaultBranch: x.defbranch }); };
      const preview = () => {
        const { invoices, errors } = build(); const ex = new Set(d.salesInvoices.map(i => i.no)); const fresh = invoices.filter(i => !ex.has(i.no)); const dup = invoices.length - fresh.length;
        const byB = {}; for (const i of fresh) byB[i.branch] = (byB[i.branch] || 0) + i.total;
        $('#preview', f).innerHTML = `<div class="card mt"><div class="kv"><span class="k">${esc(t('preview'))}</span><span class="v">${fresh.length} ${esc(t('rows'))}${dup ? ` · ${dup} ${esc(t('duplicates_skipped'))}` : ''}${errors.length ? ` · <span class="bad-t">${errors.length} ✕</span>` : ''}</span></div>
          ${Object.entries(byB).map(([b, v]) => `<div class="kv"><span class="k">${esc(A.branchName(b))}</span><span class="v money">${money(v)}</span></div>`).join('')}
          <div class="kv total"><span class="k">${esc(t('total'))}</span><span class="v money">${money(fresh.reduce((a, i) => a + i.total, 0))}</span></div>
          <div class="tablewrap mt"><table class="tbl compact">${U.th([{ l: t('col_invoice') }, { l: t('col_date') }, { l: t('col_branch') }, { l: t('col_method') }, { l: t('col_total'), r: 1 }])}<tbody>${fresh.slice(0, 5).map(i => `<tr><td class="code">${esc(i.no)}</td><td class="num">${i.date}</td><td>${esc(A.branchName(i.branch))}</td><td>${esc(t('m_' + i.method))}</td><td class="money">${money(i.total)}</td></tr>`).join('')}</tbody></table></div></div>`;
        $('#postbtn', f).disabled = !fresh.length;
      };
      f.addEventListener('change', preview); preview();
      f.addEventListener('submit', (e) => { e.preventDefault(); try { const r = S.postSalesBatch(d, build().invoices, { source: 'skysystem_export', file: file.name, user: A.user().id }); U.closeSheet(); A.commit(r.posted ? t('posted_sales', { n: r.posted }) : t('nothing_to_post')); } catch (er) { U.fail(er); } });
    } });
  }

  // ================================================================ END OF DAY
  let eodBranch = null, eodDate = null;
  Screens.eod = (main) => {
    const d = db(); eodBranch = eodBranch || A.defaultBranch(); eodDate = eodDate || today();
    const ds = S.daySales(d, eodDate, eodBranch); const expected = S.expectedCash(d, eodDate, eodBranch);
    const closed = d.eod.find(e => e.date === eodDate && e.branch === eodBranch && !e.reopened);
    const open = A.openDays(); const recent = d.eod.filter(e => !e.reopened).sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at)).slice(0, 10);
    const diffPill = (x) => Math.abs(x) < 0.005 ? U.pill(t('exact'), 'good') : `<span class="pill ${x > 0 ? 'warn' : 'bad'}"><span class="money">${x > 0 ? '+' : '−'}${money(Math.abs(x))}</span> ${esc(t(x > 0 ? 'over' : 'short'))}</span>`;
    main.innerHTML = `<div class="cols"><div>
      ${A.feat('multi_branch') ? `<div class="chips">${d.branches.map(b => `<button class="chip ${eodBranch === b.id ? 'active' : ''}" data-b="${b.id}">${esc(L(b))}</button>`).join('')}</div>` : ''}
      <div class="card"><div class="grid2">${U.field(t('date'), U.dateInput('date', eodDate))}<div class="field"><label>${esc(t('invoices'))}</label><div class="input readout"><span class="num">${ds.n}</span><span class="money strong">${money(ds.total)}</span></div></div></div>
        ${Object.entries(ds.byMethod).map(([m, v]) => `<div class="kv"><span class="k">${esc(t('m_' + m))}</span><span class="v money">${money(v)}</span></div>`).join('')}</div>
      ${closed ? `<div class="card mt"><div class="notice good">${icon('check')}<span>${esc(t('already_closed'))} · ${esc(t('closed_by'))} ${esc(A.userName(d.users.find(u => u.id === closed.user)))}</span></div>
          <div class="kv"><span class="k">${esc(t('expected_cash'))}</span><span class="v money">${money(closed.expected)}</span></div><div class="kv"><span class="k">${esc(t('counted_cash'))}</span><span class="v money">${money(closed.counted)}</span></div>
          <div class="kv total"><span class="k">${esc(t('difference'))}</span><span class="v">${diffPill(closed.diff)}</span></div>${closed.notes ? `<p class="small muted">${esc(closed.notes)}</p>` : ''}
          ${A.can('eod_reopen') ? `<button class="btn secondary mt" data-reopen>${esc(t('reopen'))}</button>` : ''}</div>`
        : ds.n === 0 ? `<div class="empty mt">${esc(t('no_sales_for_day'))}</div>`
          : `<form class="card mt" id="eodform"><div class="kv total"><span class="k">${esc(t('expected_cash'))}</span><span class="v money">${money(expected)}</span></div>
          ${U.field(t('counted_cash'), U.moneyInput('counted', '', 'required style="font-size:24px;height:56px"'))}
          <div class="kv total"><span class="k">${esc(t('difference'))}</span><span class="v" id="diff">${diffPill(0)}</span></div>
          ${U.field(t('notes'), '<textarea class="input" name="notes" rows="2"></textarea>')}
          <button class="btn primary" type="submit">${esc(t('close_day'))} · ${esc(A.branchName(eodBranch))} · ${esc(fmtDateShort(eodDate))}</button></form>`}
      </div><div>
      ${open.length ? `<div class="section"><h2>${esc(t('open_days'))} ${U.pill(open.length, 'warn')}</h2><div class="list">${open.map(o => `<button class="row" data-open="${o.date}|${o.branch}"><span class="avatar ${o.branch}">${esc((d.branches.find(b => b.id === o.branch) || {}).code || '')}</span><span class="main"><span class="t">${esc(weekday(o.date))} ${esc(fmtDateShort(o.date))}</span><span class="m">${esc(A.branchName(o.branch))}</span></span><span class="end"><span class="money">${money(S.daySales(d, o.date, o.branch).total)}</span>${U.pill(t('status_open'), 'warn')}</span></button>`).join('')}</div></div>` : ''}
      <div class="section"><h2>${esc(t('recent_closings'))}</h2>${recent.length ? `<div class="tablewrap"><table class="tbl compact">${U.th([{ l: t('date') }, { l: t('branch') }, { l: t('expected_cash'), r: 1 }, { l: t('counted_cash'), r: 1 }, { l: t('difference') }])}<tbody>${recent.map(e => `<tr><td class="num">${e.date}</td><td>${esc(A.branchName(e.branch))}</td><td class="money">${money(e.expected)}</td><td class="money">${money(e.counted)}</td><td>${diffPill(e.diff)}</td></tr>`).join('')}</tbody></table></div>` : U.empty('—')}</div>
      </div></div>`;
    $$('[data-b]', main).forEach(b => b.addEventListener('click', () => { eodBranch = b.dataset.b; Screens.eod(main); }));
    $('[name=date]', main).addEventListener('change', (e) => { eodDate = e.target.value; Screens.eod(main); });
    $$('[data-open]', main).forEach(b => b.addEventListener('click', () => { const [x, y] = b.dataset.open.split('|'); eodDate = x; eodBranch = y; Screens.eod(main); window.scrollTo(0, 0); }));
    const f = $('#eodform', main);
    if (f) { $('[name=counted]', f).addEventListener('input', (e) => { $('#diff', f).innerHTML = diffPill(S.r2((parseFloat(e.target.value) || 0) - expected)); }); f.addEventListener('submit', (e) => { e.preventDefault(); const x = U.formData(f); try { S.closeDay(d, { date: eodDate, branch: eodBranch, counted: parseFloat(x.counted) || 0, notes: x.notes, user: A.user().id }); A.commit(t('day_closed')); } catch (er) { U.fail(er); } }); }
    const ro = $('[data-reopen]', main); if (ro) ro.addEventListener('click', () => { try { S.reopenDay(d, closed.id, A.user().id); A.commit(t('day_reopened')); } catch (er) { U.fail(er); } });
  };

  // ================================================================ PARTIES (suppliers / customers)
  const partyQ = { supplier: '', customer: '' };
  function partyScreen(kind, main) {
    const d = db(); const list0 = kind === 'supplier' ? d.suppliers : d.customers;
    const q = partyQ[kind].trim().toLowerCase();
    const bal = (p) => kind === 'supplier' ? S.supplierBalance(d, p.id) : S.customerBalance(d, p.id);
    const list = list0.filter(p => !q || p.name.toLowerCase().includes(q) || (p.nameEn || '').toLowerCase().includes(q) || (p.vat || '').includes(q)).map(p => ({ p, b: bal(p) })).sort((a, b) => b.b - a.b);
    const docs = (p) => kind === 'supplier' ? d.supplierInvoices.filter(i => i.supplierId === p.id).length : d.customerInvoices.filter(i => i.customerId === p.id).length;
    main.innerHTML = `<div class="toolbar"><div class="search grow">${icon('search')}<input class="input" id="pq" placeholder="${esc(t('search_parties'))}" value="${esc(partyQ[kind])}"></div>
      <button class="btn primary sm d-only-inline" data-add>${icon('plus')}${esc(t(kind === 'supplier' ? 'add_supplier' : 'add_customer'))}</button></div>
      ${list.length ? `<div class="tablewrap d-only"><table class="tbl">${U.th([{ l: t('party_name') }, { l: t('vat_number') }, { l: t('phone') }, { l: t('city') }, { l: t('ledger_account') }, { l: t('payment_terms'), r: 1 }, { l: t('invoices'), r: 1 }, { l: t('balance'), r: 1 }])}<tbody>${list.map(({ p, b }) => `<tr class="click" data-p="${p.id}"><td class="strong">${esc(L({ ar: p.name, en: p.nameEn }))}</td><td class="num">${esc(p.vat || '')}</td><td class="num">${esc(p.phone || '')}</td><td>${esc(p.addr?.city || '')}</td><td class="code">${esc(p.account)}</td><td class="money">${p.terms || 0}</td><td class="money">${docs(p)}</td><td class="money strong">${money(b)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      <div class="list m-only">${list.length ? list.map(({ p, b }) => `<button class="row" data-p="${p.id}"><span class="avatar">${esc(U.initials(L({ ar: p.name, en: p.nameEn })))}</span><span class="main"><span class="t">${esc(L({ ar: p.name, en: p.nameEn }))}</span><span class="m num">${esc(t('vat_number'))}: ${esc(p.vat || '—')}</span></span><span class="end"><span class="money">${money(b)}</span><span class="small muted">${b > 0 ? esc(t(kind === 'supplier' ? 'we_owe' : 'owes_us')) : '—'}</span></span></button>`).join('') : U.empty(t('no_results'))}</div>
      <button class="fab m-only" data-add aria-label="${esc(t('add'))}">${icon('plus')}</button>`;
    $('#pq', main).addEventListener('input', (e) => { partyQ[kind] = e.target.value; partyScreen(kind, main); const i = $('#pq', main); i.focus(); i.setSelectionRange(i.value.length, i.value.length); });
    $$('[data-add]', main).forEach(b => b.addEventListener('click', () => partyForm(kind, {})));
    $$('[data-p]', main).forEach(b => b.addEventListener('click', () => partySheet(kind, b.dataset.p)));
  }
  Screens.suppliers = (main) => partyScreen('supplier', main);
  Screens.customers = (main) => partyScreen('customer', main);
  const addrText = (a) => !a ? '' : [a.building, a.street, a.district, a.city, a.postal, a.additional].filter(Boolean).join(I18N.getLang() === 'ar' ? '، ' : ', ');
  function partySheet(kind, id) {
    const d = db(); const p = (kind === 'supplier' ? d.suppliers : d.customers).find(x => x.id === id);
    const bal = kind === 'supplier' ? S.supplierBalance(d, id) : S.customerBalance(d, id);
    const docs = kind === 'supplier' ? d.supplierInvoices.filter(i => i.supplierId === id) : d.customerInvoices.filter(i => i.customerId === id);
    U.openSheet({ title: L({ ar: p.name, en: p.nameEn }), wide: true, body: `
      <div class="kv total"><span class="k">${esc(t('balance'))} · ${esc(t(kind === 'supplier' ? 'we_owe' : 'owes_us'))}</span><span class="v money">${money(bal)} <span class="small muted">${esc(t('sar'))}</span></span></div>
      <div class="kv"><span class="k">${esc(t('vat_number'))}</span><span class="v num">${esc(p.vat || '—')}</span></div>
      ${p.cr ? `<div class="kv"><span class="k">${esc(t('cr_number'))}</span><span class="v num">${esc(p.cr)}</span></div>` : ''}
      ${p.phone ? `<div class="kv"><span class="k">${esc(t('phone'))}</span><span class="v num"><a href="tel:${esc(p.phone)}">${esc(p.phone)}</a></span></div>` : ''}
      <div class="kv"><span class="k">${esc(t('national_address'))}</span><span class="v wrap">${esc(addrText(p.addr)) || '—'}${p.addr?.short ? `<br><span class="num muted small">${esc(p.addr.short)}</span>` : ''}</span></div>
      <div class="kv"><span class="k">${esc(t('ledger_account'))}</span><span class="v code">${esc(A.accName(p.account))}</span></div>
      <div class="kv"><span class="k">${esc(t('payment_terms'))}</span><span class="v num">${p.terms || 0}</span></div>
      <div class="btnrow wrap">
        ${kind === 'supplier' && A.can('purchases') ? `<button class="btn primary" data-newinv>${icon('plus')}${esc(t('new_invoice'))}</button>` : ''}
        ${kind === 'customer' ? `<button class="btn primary" data-newci>${icon('plus')}${esc(t('new_credit_invoice'))}</button>${A.can('vouchers') && A.feat('receipts') ? `<button class="btn secondary" data-collect>${esc(t('collect'))}</button>` : ''}` : ''}
        ${A.can('reports') && A.feat('rep_statement') ? `<button class="btn secondary" data-stmt>${esc(t('statement_of_account'))}</button>` : ''}
        <button class="btn secondary sq" data-edit aria-label="${esc(t('edit'))}">${icon('pen')}</button></div>
      <div class="section"><h2>${esc(t(kind === 'supplier' ? 'invoices' : 'credit_invoices'))}</h2><div class="list">${docs.length ? docs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(i => `<button class="row" data-inv="${i.id}"><span class="main"><span class="t num">${esc(i.no)}</span><span class="m">${esc(fmtDate(i.date))}</span></span><span class="end"><span class="money">${money(i.total)}</span>${kind === 'supplier' ? statusPill(S.invoiceStatus(i)) : U.pill(money(i.total - i.paid), i.total - i.paid > 0.005 ? 'warn' : 'good')}</span></button>`).join('') : U.empty('—')}</div></div>`, onMount: (sh) => {
      const ni = $('[data-newinv]', sh); if (ni) ni.onclick = () => Screens.invoiceForm({ supplierId: id });
      const nc = $('[data-newci]', sh); if (nc) nc.onclick = () => creditInvoiceForm(id);
      const co = $('[data-collect]', sh); if (co) co.onclick = () => { U.closeSheet(true); Screens.voucherForm('receipt', { from: p.account, party: p.name, amount: bal > 0 ? bal : '' }); };
      const st = $('[data-stmt]', sh); if (st) st.onclick = () => { U.closeSheet(true); A.go('reports/statement/' + p.account); };
      $('[data-edit]', sh).onclick = () => partyForm(kind, p);
      if (kind === 'supplier') $$('[data-inv]', sh).forEach(b => b.onclick = () => Screens.invoiceSheet(b.dataset.inv));
    } });
  }
  function partyForm(kind, p, onSaved) {
    const a = p.addr || {};
    U.openSheet({ title: p.id ? t('edit_party') : t(kind === 'supplier' ? 'add_supplier' : 'add_customer'), wide: true, body: `<form id="pf">
      <div class="grid2">${U.field(t('name_ar'), U.inp('name', p.name || '', 'required'))}${U.field(t('name_en'), U.inp('nameEn', p.nameEn || '', 'dir="ltr"'))}</div>
      <div class="grid2">${U.field(t('vat_number'), U.inp('vat', p.vat || '', 'inputmode="numeric" dir="ltr" maxlength="15"' + (kind === 'supplier' ? ' required' : '')), t('vat_hint'))}${U.field(t('cr_number'), U.inp('cr', p.cr || '', 'inputmode="numeric" dir="ltr"'))}</div><div class="err hidden" id="vaterr">${esc(t('invalid_vat'))}</div>
      <div class="grid3">${U.field(t('phone'), U.inp('phone', p.phone || '', 'type="tel" dir="ltr"'))}${U.field(t('email'), U.inp('email', p.email || '', 'type="email" dir="ltr"'))}${U.field(t('payment_terms'), U.inp('terms', p.terms ?? 30, 'type="number" inputmode="numeric" dir="ltr"'))}</div>
      <h3 class="h3">${esc(t('national_address'))}</h3>
      <div class="grid3">${U.field(t('building_no'), U.inp('building', a.building || '', 'inputmode="numeric" dir="ltr"'))}${U.field(t('street'), U.inp('street', a.street || ''))}${U.field(t('district'), U.inp('district', a.district || ''))}</div>
      <div class="grid3">${U.field(t('city'), U.inp('city', a.city || ''))}${U.field(t('postal_code'), U.inp('postal', a.postal || '', 'inputmode="numeric" dir="ltr"'))}${U.field(t('additional_no'), U.inp('additional', a.additional || '', 'inputmode="numeric" dir="ltr"'))}</div>
      ${U.field(t('short_address'), U.inp('short', a.short || '', 'dir="ltr" style="text-transform:uppercase" maxlength="8"'))}
      <button class="btn primary" type="submit">${esc(t('save'))}</button></form>`, onMount: (sh) => {
      $('#pf', sh).addEventListener('submit', (e) => {
        e.preventDefault(); const x = U.formData(e.target);
        if ((kind === 'supplier' || x.vat) && !S.validVAT(x.vat)) { $('#vaterr', sh).classList.remove('hidden'); return; }
        const rec = { id: p.id, name: x.name.trim(), nameEn: x.nameEn.trim() || x.name.trim(), vat: x.vat.replace(/\D/g, ''), cr: x.cr, phone: x.phone, email: x.email, terms: +x.terms || 0, addr: { building: x.building, street: x.street, district: x.district, city: x.city, postal: x.postal, additional: x.additional, short: (x.short || '').toUpperCase() } };
        try { const saved = kind === 'supplier' ? S.saveSupplier(db(), rec) : S.saveCustomer(db(), rec); A.save(); U.closeSheet(); U.toast(t('saved')); if (onSaved) onSaved(saved); else A.render(); } catch (er) { U.fail(er); }
      });
    } });
  }
  function creditInvoiceForm(customerId) {
    const d = db(); const c = d.customers.find(x => x.id === customerId);
    U.openSheet({ title: t('new_credit_invoice') + ' — ' + L({ ar: c.name, en: c.nameEn }), body: `<form id="ci"><div class="grid2">${U.field(t('date'), U.dateInput('date', today()))}${A.branchField('branch')}</div>
      ${U.field(t('total') + ' (' + t('incl_vat') + ')', U.moneyInput('total', '', 'required'))}${U.field(t('account'), U.accSelect(d, 'account', d.sys.salesCorporate, { types: ['revenue'] }))}${U.field(t('notes'), U.inp('notes'))}
      <button class="btn primary" type="submit">${esc(t('save'))}</button></form>`, onMount: (sh) => {
      $('#ci', sh).addEventListener('submit', (e) => { e.preventDefault(); const x = U.formData(e.target); try { S.createCustomerInvoice(d, { customerId, date: x.date, branch: x.branch, total: parseFloat(x.total) || 0, account: x.account, notes: x.notes, user: A.user().id }); U.closeSheet(); A.commit(t('saved')); } catch (er) { U.fail(er); } });
    } });
  }

  // ================================================================ PURCHASES
  const statusPill = (st) => U.pill(t('st_' + st), { draft: 'neutral', paid: 'good', partial: 'warn', overdue: 'bad', due: 'info' }[st]);
  let invFilter = 'all';
  Screens.purchases = (main, args) => {
    const d = db(); if (args[0] === 'new') { setTimeout(() => Screens.invoiceForm({ scan: A.feat('ocr') }), 50); history.replaceState(null, '', '#/purchases'); }
    const all = d.supplierInvoices.map(i => ({ i, st: S.invoiceStatus(i) })).sort((a, b) => b.i.date.localeCompare(a.i.date));
    const counts = {}; for (const x of all) counts[x.st] = (counts[x.st] || 0) + 1;
    const list = all.filter(x => invFilter === 'all' || x.st === invFilter);
    main.innerHTML = `<div class="toolbar"><div class="chips">${['all', 'draft', 'due', 'overdue', 'partial', 'paid'].map(f => `<button class="chip ${invFilter === f ? 'active' : ''}" data-f="${f}">${esc(f === 'all' ? t('all') : t('st_' + f))}${f !== 'all' && counts[f] ? ` <b>${counts[f]}</b>` : ''}</button>`).join('')}</div>
      <span class="grow"></span>${A.feat('ocr') ? `<button class="btn secondary sm d-only-inline" data-scan>${icon('camera')}${esc(t('scan_invoice'))}</button>` : ''}<button class="btn primary sm d-only-inline" data-add>${icon('plus')}${esc(t('new_invoice'))}</button></div>
      ${list.length ? `<div class="tablewrap d-only"><table class="tbl">${U.th([{ l: t('supplier') }, { l: t('invoice_no') }, { l: t('invoice_date') }, { l: t('due_date') }, { l: t('branch') }, { l: t('subtotal'), r: 1 }, { l: t('vat_15'), r: 1 }, { l: t('total'), r: 1 }, { l: t('remaining'), r: 1 }, { l: t('status') }])}<tbody>${list.map(({ i, st }) => `<tr class="click" data-inv="${i.id}"><td class="strong">${esc(A.supName(i.supplierId))}</td><td class="code">${esc(i.no)}</td><td class="num">${i.date}</td><td class="num">${i.due || ''}</td><td>${esc(A.branchName(i.branch))}</td><td class="money">${money(i.subtotal)}</td><td class="money">${money(i.vat)}</td><td class="money strong">${money(i.total)}</td><td class="money">${i.status === 'draft' ? '' : money(i.total - i.paid)}</td><td>${statusPill(st)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="d-only">${U.empty('—')}</div>`}
      <div class="list m-only">${list.length ? list.map(({ i, st }) => `<button class="row" data-inv="${i.id}"><span class="avatar">${esc(U.initials(A.supName(i.supplierId)))}</span><span class="main"><span class="t">${esc(A.supName(i.supplierId))}</span><span class="m"><span class="num">${esc(i.no)}</span> · ${esc(fmtDateShort(i.date))}</span></span><span class="end"><span class="money">${money(i.total)}</span>${statusPill(st)}</span></button>`).join('') : U.empty('—')}</div>
      <button class="fab m-only" data-add aria-label="${esc(t('add'))}">${icon('plus')}</button>`;
    $$('[data-f]', main).forEach(b => b.addEventListener('click', () => { invFilter = b.dataset.f; Screens.purchases(main, []); }));
    $$('[data-add]', main).forEach(b => b.addEventListener('click', () => Screens.invoiceForm({ scan: false })));
    $$('[data-scan]', main).forEach(b => b.addEventListener('click', () => Screens.invoiceForm({ scan: true })));
    $$('[data-inv]', main).forEach(b => b.addEventListener('click', () => Screens.invoiceSheet(b.dataset.inv)));
  };
  Screens.invoiceForm = (opts = {}) => {
    const d = db(); const t0 = today(); const defSup = opts.supplierId ? d.suppliers.find(s => s.id === opts.supplierId) : null;
    const supOpts = [{ v: '', l: '— ' + t('supplier') + ' —' }, ...d.suppliers.map(s => ({ v: s.id, l: L({ ar: s.name, en: s.nameEn }) })), { v: '__new__', l: t('add_new_supplier') }];
    const ocr = A.feat('ocr');
    U.openSheet({ title: t('new_invoice'), wide: true, body: `<form id="invform">
      ${ocr ? `${U.seg('im', [{ v: 'scan', l: t('scan_invoice') }, { v: 'manual', l: t('manual_entry') }], opts.scan ? 'scan' : 'manual')}
      <div id="scanbox" class="${opts.scan ? '' : 'hidden'} mt"><label class="dropzone" for="invphoto">${icon('camera')}<p>${esc(t('take_photo'))}</p><small>JPG · PNG</small></label><input id="invphoto" class="sr" type="file" accept="image/*" capture="environment"><div id="scanstate" class="mt"></div></div>` : ''}
      <input type="hidden" name="attachment" value="">
      <div class="mt">${U.field(t('supplier'), U.sel('supplierId', supOpts, defSup?.id || ''))}</div>
      <div id="newsup" class="hidden"><div class="grid2">${U.field(t('party_name'), U.inp('ns_name', ''))}${U.field(t('vat_number'), U.inp('ns_vat', '', 'inputmode="numeric" dir="ltr" maxlength="15"'))}</div></div><div id="supnote"></div>
      <div class="grid2">${U.field(t('invoice_no'), U.inp('no', '', 'dir="ltr" required'))}${U.field(t('invoice_date'), U.dateInput('date', t0))}</div>
      <div class="grid2">${U.field(t('due_date'), U.dateInput('due', S.addDays(t0, defSup?.terms || 30)))}${A.branchField('branch')}</div>
      <div class="grid3">${U.field(t('subtotal'), U.moneyInput('subtotal'))}${U.field(t('vat_15'), U.moneyInput('vat'))}${U.field(t('total'), U.moneyInput('total', '', 'required'))}</div>
      ${U.field(t('debit_account'), U.accSelect(d, 'account', d.sys.purchases, { types: ['cogs', 'expense', 'asset'], exclude: [] }))}
      ${U.field(t('notes'), '<textarea class="input" name="notes" rows="2"></textarea>')}
      <div class="btnrow">${A.can('purchases_post') ? `<button class="btn primary" type="submit">${esc(t('post_invoice'))}</button>` : ''}<button class="btn secondary" type="button" data-draft>${esc(t('save_draft'))}</button></div></form>`,
      onMount: (sh) => {
        const f = $('#invform', sh);
        U.bindSeg(f, 'im', (v) => $('#scanbox', f).classList.toggle('hidden', v !== 'scan'));
        const supSel = $('[name=supplierId]', f);
        supSel.addEventListener('change', () => { $('#newsup', f).classList.toggle('hidden', supSel.value !== '__new__'); const s = d.suppliers.find(x => x.id === supSel.value); if (s) $('[name=due]', f).value = S.addDays($('[name=date]', f).value, s.terms || 30); });
        for (const k of ['subtotal', 'vat', 'total']) $(`[name=${k}]`, f).addEventListener('input', (e) => { const v = parseFloat(e.target.value) || 0; if (k === 'total') { const sb = S.r2(v / 1.15); $('[name=subtotal]', f).value = sb; $('[name=vat]', f).value = S.r2(v - sb); } else if (k === 'subtotal') { const vt = S.r2(v * 0.15); $('[name=vat]', f).value = vt; $('[name=total]', f).value = S.r2(v + vt); } else { $('[name=total]', f).value = S.r2((parseFloat($('[name=subtotal]', f).value) || 0) + v); } });
        const ph = $('#invphoto', f); if (ph) ph.addEventListener('change', async (e) => { const file = e.target.files[0]; if (file) await scanInto(f, file); });
        const collect = () => {
          const x = U.formData(f); let supplierId = x.supplierId;
          if (supplierId === '__new__') { if (!x.ns_name.trim() || !S.validVAT(x.ns_vat)) { U.toast(t('invalid_vat'), 'bad'); return null; } supplierId = S.saveSupplier(d, { name: x.ns_name.trim(), vat: x.ns_vat.replace(/\D/g, ''), terms: 30, addr: {} }).id; }
          if (!supplierId) { U.toast(t('e_no_supplier'), 'bad'); return null; }
          const total = parseFloat(x.total) || 0; if (!total) { U.toast(t('e_amount'), 'bad'); return null; }
          return { supplierId, no: x.no.trim() || 'INV-' + Date.now().toString(36).toUpperCase(), date: x.date, due: x.due, subtotal: parseFloat(x.subtotal) || S.r2(total / 1.15), vat: parseFloat(x.vat) || 0, total, account: x.account, branch: x.branch, notes: x.notes, attachment: x.attachment || null, user: A.user().id };
        };
        f.addEventListener('submit', (e) => { e.preventDefault(); const x = collect(); if (!x) return; try { const inv = S.createSupplierInvoice(d, x); S.postSupplierInvoice(d, inv.id, A.user().id); U.closeSheet(); A.commit(t('invoice_posted')); } catch (er) { U.fail(er); } });
        $('[data-draft]', f).addEventListener('click', () => { const x = collect(); if (!x) return; S.createSupplierInvoice(d, x); U.closeSheet(); A.commit(t('draft_saved')); });
      } });
  };
  async function scanInto(f, file) {
    const d = db(); const st = $('#scanstate', f);
    const setp = (label, p) => { st.innerHTML = `<div class="notice info">${icon('info')}<span>${esc(label)}</span></div><div class="progress"><i style="width:${Math.round(p * 100)}%"></i></div>`; };
    setp(t('reading_invoice'), 0.02); let previewUrl = null;
    try {
      const res = await InvoiceReader.recognize(file, (m) => { if (m.status === 'recognizing text') setp(t('ocr_recognizing', { p: Math.round(m.progress * 100) }), 0.5 + m.progress / 2); else if (m.progress != null) setp(t('ocr_loading', { p: Math.round(m.progress * 100) }), m.progress / 2); });
      previewUrl = res.previewUrl; const found = InvoiceReader.parse(res.text, { companyVat: d.company.vat });
      try { const th = await InvoiceReader.prepareImage(file, 600); $('[name=attachment]', f).value = th.dataUrl; } catch (e) { /* ignore */ }
      const matched = found.vat ? d.suppliers.find(s => s.vat === found.vat) : null;
      const set = (n, v) => { if (v !== undefined && v !== null && v !== '') { const el = $(`[name=${n}]`, f); if (el) { el.value = v; el.classList.add('found'); } } };
      const supSel = $('[name=supplierId]', f);
      if (matched) { set('supplierId', matched.id); supSel.dispatchEvent(new Event('change')); $('#supnote', f).innerHTML = `<div class="notice good">${icon('check')}<span>${esc(t('matched_supplier'))}: <b>${esc(L({ ar: matched.name, en: matched.nameEn }))}</b></span></div>`; }
      else if (found.vat) { set('supplierId', '__new__'); supSel.dispatchEvent(new Event('change')); set('ns_vat', found.vat); if (found.name) set('ns_name', found.name); $('#supnote', f).innerHTML = `<div class="notice warn">${icon('alert')}<span>${esc(t('unknown_supplier'))}</span></div>`; }
      set('no', found.no); set('date', found.date);
      if (found.total != null) { set('total', found.total); set('subtotal', found.subtotal); set('vat', found.vatAmount); }
      if (found.date) { const s = d.suppliers.find(x => x.id === supSel.value); set('due', S.addDays(found.date, s?.terms || 30)); }
      const ok = found.score >= 0.75;
      st.innerHTML = `<div class="scanprev"><img src="${previewUrl}" alt=""></div><div class="notice ${ok ? 'good' : 'warn'} mt">${icon(ok ? 'check' : 'alert')}<span>${esc(t(ok ? 'read_done' : 'read_partial'))}</span></div><details class="mt"><summary class="small muted">OCR</summary><div class="ocrtext">${esc(res.text.trim().slice(0, 1500))}</div></details>`;
    } catch (err) { console.error(err); st.innerHTML = `${previewUrl ? `<div class="scanprev"><img src="${previewUrl}" alt=""></div>` : ''}<div class="notice bad mt">${icon('alert')}<span>${esc(t('read_failed_img'))}</span></div>`; }
  }
  Screens.invoiceSheet = (id) => {
    const d = db(); const inv = d.supplierInvoices.find(x => x.id === id); const st = S.invoiceStatus(inv); const open = S.r2(inv.total - inv.paid);
    const pays = d.vouchers.filter(v => v.invoiceId === id);
    U.openSheet({ title: inv.no, body: `<div class="spread"><span class="strong">${esc(A.supName(inv.supplierId))}</span>${statusPill(st)}</div>
      ${inv.attachment ? `<div class="scanprev mt">${`<img src="${inv.attachment}" alt="">`}</div>` : ''}
      <div class="kv"><span class="k">${esc(t('number'))}</span><span class="v code">${esc(inv.docNo || '')}</span></div>
      <div class="kv"><span class="k">${esc(t('invoice_date'))}</span><span class="v">${esc(fmtDate(inv.date))}</span></div><div class="kv"><span class="k">${esc(t('due_date'))}</span><span class="v">${esc(fmtDate(inv.due))}</span></div>
      <div class="kv"><span class="k">${esc(t('branch'))}</span><span class="v">${esc(A.branchName(inv.branch))}</span></div><div class="kv"><span class="k">${esc(t('debit_account'))}</span><span class="v">${esc(A.accName(inv.account))}</span></div>
      <div class="kv"><span class="k">${esc(t('subtotal'))}</span><span class="v money">${money(inv.subtotal)}</span></div><div class="kv"><span class="k">${esc(t('vat_15'))}</span><span class="v money">${money(inv.vat)}</span></div>
      <div class="kv total"><span class="k">${esc(t('total'))}</span><span class="v money">${money(inv.total)}</span></div>
      ${inv.status !== 'draft' ? `<div class="kv"><span class="k">${esc(t('remaining'))}</span><span class="v money">${money(open)}</span></div>` : ''}
      ${pays.length ? `<div class="section"><h2>${esc(t('nav_payments'))}</h2>${pays.map(p => `<div class="kv"><span class="k"><span class="code">${esc(p.no)}</span> · ${esc(fmtDate(p.date))} · ${esc(A.accShort(p.from))}</span><span class="v money">${money(p.amount)}</span></div>`).join('')}</div>` : ''}
      <div id="payform"></div>
      <div class="btnrow">${inv.status === 'draft' && A.can('purchases_post') ? `<button class="btn primary" data-post>${esc(t('post_invoice'))}</button>` : ''}${inv.status !== 'draft' && open > 0 && A.can('vouchers') && A.feat('payments') ? `<button class="btn primary" data-pay>${esc(t('record_payment'))}</button>` : ''}${inv.status === 'draft' ? `<button class="btn danger sq" data-del aria-label="${esc(t('delete'))}">${icon('trash')}</button>` : ''}</div><div id="confirm"></div>`,
      onMount: (sh) => {
        const p = $('[data-post]', sh); if (p) p.onclick = () => { try { S.postSupplierInvoice(d, id, A.user().id); U.closeSheet(); A.commit(t('invoice_posted')); } catch (er) { U.fail(er); } };
        const dl = $('[data-del]', sh); if (dl) dl.onclick = () => U.confirmInline($('#confirm', sh), t('are_you_sure'), () => { d.supplierInvoices = d.supplierInvoices.filter(x => x.id !== id); U.closeSheet(); A.commit(t('deleted')); });
        const pay = $('[data-pay]', sh); if (pay) pay.onclick = () => {
          pay.classList.add('hidden');
          $('#payform', sh).innerHTML = `<form id="pf" class="card mt"><div class="grid2">${U.field(t('amount'), U.moneyInput('amount', open))}${U.field(t('date'), U.dateInput('date', today()))}</div>${U.field(t('paid_from'), U.accSelect(d, 'from', d.sys.bank, { under: '1101' }))}<button class="btn primary" type="submit">${esc(t('record_payment'))}</button></form>`;
          $('#pf', sh).addEventListener('submit', (e) => { e.preventDefault(); const x = U.formData(e.target); try { S.paySupplierInvoice(d, { invoiceId: id, amount: parseFloat(x.amount) || 0, date: x.date, from: x.from, user: A.user().id }); U.closeSheet(); A.commit(t('payment_recorded')); } catch (er) { U.fail(er); } });
        };
      } });
  };

  // ================================================================ EXPENSES
  const expP = { preset: 'this_month', branch: '' };
  Screens.expenses = (main, args) => {
    const d = db(); if (args[0] === 'new') { setTimeout(() => expenseForm(), 50); history.replaceState(null, '', '#/expenses'); }
    const [from, to] = A.periodRange(expP);
    const list = d.expenses.filter(x => x.date >= from && x.date <= to && (!expP.branch || x.branch === expP.branch)).sort((a, b) => b.date.localeCompare(a.date) || b.no.localeCompare(a.no));
    const tot = list.reduce((s, x) => ({ sub: s.sub + x.subtotal, vat: s.vat + x.vat, total: s.total + x.total }), { sub: 0, vat: 0, total: 0 });
    main.innerHTML = A.filterBar(expP, { extra: `<button class="btn primary sm" data-add>${icon('plus')}${esc(t('new_expense'))}</button>` }) + `
      <div class="tiles three"><div class="tile"><span class="k">${esc(t('count'))}</span><span class="v num">${list.length}</span></div><div class="tile"><span class="k">${esc(t('vat'))}</span><span class="v money">${money(tot.vat)}</span></div><div class="tile"><span class="k">${esc(t('total'))}</span><span class="v money">${money(tot.total)}</span></div></div>
      ${list.length ? `<div class="tablewrap mt"><table class="tbl">${U.th([{ l: t('number') }, { l: t('date') }, { l: t('description') }, { l: t('account') }, { l: t('pay_account') }, { l: t('vat'), r: 1 }, { l: t('total'), r: 1 }])}<tbody>${list.map(x => `<tr class="click" data-x="${x.id}"><td class="code">${esc(x.no)}</td><td class="num">${x.date}</td><td class="memo">${esc(x.desc)}${x.supplierId ? `<div class="small muted">${esc(A.supName(x.supplierId))}</div>` : ''}</td><td>${esc(A.accShort(x.lines[0].account))}${x.lines.length > 1 ? ` <span class="muted">+${x.lines.length - 1}</span>` : ''}</td><td>${esc(x.payMethod === 'credit' ? t('m_credit') : A.accShort(x.payAccount))}<div class="small muted">${esc(A.branchName(x.branch))}</div></td><td class="money">${money(x.vat)}</td><td class="money strong">${money(x.total)}</td></tr>`).join('')}</tbody></table></div>` : U.empty('—')}`;
    A.bindFilter(main, expP, () => Screens.expenses(main, []));
    $('[data-add]', main).onclick = () => expenseForm();
    $('[data-csv]', main).onclick = () => U.download(`expenses-${from}-${to}.csv`, U.csv([[t('number'), t('date'), t('description'), t('account'), t('subtotal'), t('vat'), t('total')], ...list.map(x => [x.no, x.date, x.desc, A.accName(x.lines[0].account), x.subtotal, x.vat, x.total])]));
    $$('[data-x]', main).forEach(r => r.onclick = () => expenseSheet(r.dataset.x));
  };
  function expenseSheet(id) {
    const d = db(); const x = d.expenses.find(e => e.id === id); const je = d.journal.find(j => j.id === x.journalId);
    U.openSheet({ title: x.no + ' — ' + x.desc, wide: true, body: `<div class="kv"><span class="k">${esc(t('date'))}</span><span class="v">${esc(fmtDate(x.date))}</span></div><div class="kv"><span class="k">${esc(t('branch'))}</span><span class="v">${esc(A.branchName(x.branch))}</span></div>
      <div class="kv"><span class="k">${esc(t('pay_account'))}</span><span class="v">${esc(A.accName(x.payAccount))}</span></div>${x.supplierId ? `<div class="kv"><span class="k">${esc(t('supplier'))}</span><span class="v">${esc(A.supName(x.supplierId))}</span></div>` : ''}
      <div class="tablewrap mt"><table class="tbl compact">${U.th([{ l: t('account') }, { l: t('line_desc') }, { l: t('price'), r: 1 }, { l: t('qty'), r: 1 }, { l: t('discount'), r: 1 }, { l: t('net'), r: 1 }, { l: t('vat'), r: 1 }])}<tbody>${x.lines.map(l => `<tr><td>${esc(A.accName(l.account))}</td><td>${esc(l.desc)}</td><td class="money">${money(l.price)}</td><td class="money">${l.qty}</td><td class="money">${money(l.discount)}</td><td class="money">${money(l.net)}</td><td class="money">${money(l.vat)}</td></tr>`).join('')}</tbody></table></div>
      <div class="kv total"><span class="k">${esc(t('total_with_vat'))}</span><span class="v money">${money(x.total)}</span></div>${je ? `<button class="btn secondary sm mt" data-je>${icon('journal')}${esc(t('entry_no'))} ${esc(je.no)}</button>` : ''}`, onMount: (sh) => { const b = $('[data-je]', sh); if (b) b.onclick = () => Screens.entrySheet(je.id); } });
  }
  function expenseForm() {
    const d = db(); const lineRow = (i) => `<div class="eline" data-i="${i}"><div class="g-acc">${U.accSelect(d, 'acc_' + i, '', { types: ['expense', 'cogs', 'asset'], blank: '— ' + t('pick_account') + ' —' })}</div>
      <input class="input" name="desc_${i}" placeholder="${esc(t('line_desc'))}"><input class="input money" type="number" step="0.01" min="0" name="price_${i}" placeholder="${esc(t('price'))}" dir="ltr"><input class="input money" type="number" step="1" min="1" name="qty_${i}" value="1" dir="ltr" aria-label="${esc(t('qty'))}"><input class="input money" type="number" step="0.01" min="0" name="disc_${i}" placeholder="${esc(t('discount'))}" dir="ltr">
      <label class="check sm"><input type="checkbox" name="tax_${i}" checked><span>${esc(t('taxable'))}</span></label><button type="button" class="iconbtn sm" data-rm="${i}" aria-label="${esc(t('delete'))}">${icon('trash')}</button></div>`;
    let n = 1;
    U.openSheet({ title: t('new_expense'), xwide: true, body: `<form id="xf">
      <div class="grid3">${U.field(t('date'), U.dateInput('date', today()))}${A.branchField('branch')}${U.field(t('supplier') + ' (' + t('optional') + ')', U.sel('supplierId', [{ v: '', l: '—' }, ...d.suppliers.map(s => ({ v: s.id, l: L({ ar: s.name, en: s.nameEn }) }))], ''))}</div>
      <div class="grid2">${U.field(t('pay_method'), U.sel('payMethod', [{ v: 'cash', l: t('m_cash') }, { v: 'bank', l: t('m_bank') }, { v: 'card', l: t('pmt_card') }, { v: 'credit', l: t('m_credit') }], 'cash'))}<div id="payacc">${U.field(t('pay_account'), U.accSelect(d, 'payAccount', S.branchCash(d, A.defaultBranch()), { under: '1101' }))}</div></div>
      ${U.field(t('description'), U.inp('desc', '', 'required'))}
      <h3 class="h3">${esc(t('expense_lines'))}</h3><div id="lines">${lineRow(0)}</div><button type="button" class="btn ghost sm" data-addline>${icon('plus')}${esc(t('add_line'))}</button>
      <div class="totals"><div class="kv"><span class="k">${esc(t('subtotal'))}</span><span class="v money" id="xs">0.00</span></div><div class="kv"><span class="k">${esc(t('vat_15'))}</span><span class="v money" id="xv">0.00</span></div><div class="kv total"><span class="k">${esc(t('total_with_vat'))}</span><span class="v money" id="xt">0.00</span></div></div>
      <button class="btn primary" type="submit">${esc(t('save'))}</button></form>`, onMount: (sh) => {
      const f = $('#xf', sh);
      const lines = () => $$('.eline', f).map(r => { const i = r.dataset.i; const x = U.formData(f); return { account: x['acc_' + i], desc: x['desc_' + i], price: parseFloat(x['price_' + i]) || 0, qty: parseFloat(x['qty_' + i]) || 1, discount: parseFloat(x['disc_' + i]) || 0, taxable: !!x['tax_' + i] }; });
      const recalc = () => { let s = 0, v = 0; for (const l of lines()) { const net = l.price * l.qty - l.discount; s += net; if (l.taxable) v += net * 0.15; } $('#xs', f).textContent = money(s); $('#xv', f).textContent = money(v); $('#xt', f).textContent = money(s + v); };
      f.addEventListener('input', recalc); f.addEventListener('change', recalc);
      $('[data-addline]', f).onclick = () => { $('#lines', f).insertAdjacentHTML('beforeend', lineRow(n++)); };
      f.addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b && $$('.eline', f).length > 1) { b.closest('.eline').remove(); recalc(); } });
      $('[name=payMethod]', f).addEventListener('change', (e) => { const v = e.target.value; $('#payacc', f).classList.toggle('hidden', v === 'credit'); const sel = $('[name=payAccount]', f); if (v === 'cash') sel.value = S.branchCash(d, $('[name=branch]', f).value); else if (v === 'bank' || v === 'card') sel.value = d.sys.bank; });
      f.addEventListener('submit', (e) => {
        e.preventDefault(); const x = U.formData(f); const ls = lines().filter(l => l.account && l.price > 0);
        if (!ls.length) return U.toast(t('e_amount'), 'bad');
        if (x.payMethod === 'credit' && !x.supplierId) return U.toast(t('e_no_supplier'), 'bad');
        try { S.createExpense(d, { date: x.date, branch: x.branch, supplierId: x.supplierId || null, payMethod: x.payMethod, payAccount: x.payMethod === 'credit' ? null : x.payAccount, desc: x.desc, lines: ls, user: A.user().id }); U.closeSheet(); A.commit(t('expense_saved')); } catch (er) { U.fail(er); }
      });
    } });
  }
  Screens.statusPill = statusPill;
})();
