/* Daftar — e-invoicing screens: tax invoices & notes, items, compliance center, company profile */
(() => {
  const { t, money, fmtDate } = I18N;
  const S = Store, U = UI, A = App, Z = Zatca; const { $, $$, esc, L, icon } = U;
  const db = () => A.db;
  const ar = (k) => (I18N.D[k] || [k])[0], en = (k) => (I18N.D[k] || [k, k])[1];
  const bl = (k) => `${esc(ar(k))} <span class="en">${esc(en(k))}</span>`;
  const ZS_KIND = { generated: 'neutral', reporting_pending: 'warn', clearance_pending: 'warn', reported: 'good', cleared: 'good', rejected: 'bad' };
  const zpill = (st) => U.pill(t('zs_' + st), ZS_KIND[st]);
  const kindPill = (x) => U.pill(t('k_' + x.kind) + ' · ' + t('p_' + x.profile), x.kind === 'invoice' ? 'info' : x.kind === 'credit' ? 'warn' : 'neutral');
  const issuesText = (e) => e && e.issues ? t('e_einv_invalid') + ' ' + e.issues.map(i => t('v_' + i)).join(I18N.getLang() === 'ar' ? '، ' : ', ') : U.errText(e);
  const failDoc = (e, box) => { if (box) { box.innerHTML = `<div class="notice bad">${icon('alert')}<span>${esc(issuesText(e))}</span></div>`; box.scrollIntoView({ block: 'nearest' }); } else U.toast(issuesText(e), 'bad'); };
  const qrSvg = (text) => { try { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 3, margin: 1, scalable: true, alt: 'ZATCA QR' }); } catch (e) { return ''; } };
  const buyerName = (x) => x.buyer && x.buyer.name ? x.buyer.name : t('walkin');
  const addrLine = (a) => !a ? '' : [a.building, a.street, a.district, a.city, a.postal, a.additional && ('+' + a.additional)].filter(Boolean).join('، ');
  const bridge = () => { const c = db().company.einv || {}; let key = ''; try { key = localStorage.getItem('daftar.bridgeKey.' + A.tenant().id) || ''; } catch (e) { /* ignore */ } return { url: (c.server || '').replace(/\/+$/, ''), key }; };
  async function bridgeCall(pathname, body) {
    const b = bridge(); if (!b.url) throw Object.assign(new Error('no bridge'), { code: 'bridge' });
    const r = await fetch(b.url + pathname, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'X-Daftar-Key': b.key }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({})); if (!r.ok && r.status !== 422) throw Object.assign(new Error(j.error || 'HTTP ' + r.status), { code: 'bridge' }); return j;
  }
  async function sendDoc(doc) {
    const res = await bridgeCall('/submit', { tenant: A.tenant().id, deviceId: doc.deviceId, doc });
    S.applyZatcaResult(db(), doc.id, res, A.user().id); A.save(); return res;
  }

  // ================================================================ invoices list
  const F = { f: 'all', q: '' };
  Screens.invoices = (main, args) => {
    const d = db(); S.einvEnsure(d);
    if (args[0] === 'new') { history.replaceState(null, '', '#/invoices'); setTimeout(() => docForm({ profile: args[1] || 'simplified' }), 0); }
    const sIss = S.sellerIssues(d); const nq = U.norm(F.q);
    const list = [...d.salesDocs].filter(x => F.f === 'all' || (F.f === 'notes' ? x.kind !== 'invoice' : F.f === 'pending' ? /_pending|rejected/.test(x.zatca.status) : x.profile === F.f && x.kind === 'invoice'))
      .filter(x => !nq || U.norm(x.no + ' ' + buyerName(x)).includes(nq)).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time) || b.icv - a.icv);
    const total = list.reduce((s, x) => s + (x.kind === 'credit' ? -1 : 1) * x.totals.payable, 0);
    main.innerHTML = `
      ${sIss.length ? `<div class="notice warn">${icon('alert')}<span>${esc(t('e_einv_invalid'))} ${esc(sIss.map(i => t('v_' + i)).join('، '))}</span>${A.can('settings') ? `<button class="btn sm secondary" data-go-co>${esc(t('fix'))}</button>` : ''}</div>` : ''}
      <div class="toolbar"><div class="chips">${['all', 'standard', 'simplified', 'notes', 'pending'].map(k => `<button class="chip ${F.f === k ? 'active' : ''}" data-f="${k}">${esc(t('f_' + k))}</button>`).join('')}</div>
        <input class="input search" data-q placeholder="${esc(t('search_docs'))}" value="${esc(F.q)}"><span class="grow"></span>
        <button class="btn secondary sm" data-new="standard">${icon('plus')}${esc(t('new_standard'))}</button><button class="btn primary sm" data-new="simplified">${icon('plus')}${esc(t('new_simplified'))}</button></div>
      ${list.length ? `<div class="tablewrap d-only mt"><table class="tbl">${U.th([{ l: t('invoice_no') }, { l: t('date') }, { l: t('buyer') }, { l: t('branch') }, { l: '' }, { l: t('total_vat'), r: 1 }, { l: t('total_incl'), r: 1 }, { l: t('zatca_status') }])}<tbody>
        ${list.map(x => `<tr class="click" data-doc="${x.id}"><td class="num strong">${esc(x.no)}</td><td class="num">${esc(x.date)} <span class="muted small">${esc(x.time.slice(0, 5))}</span></td><td>${esc(buyerName(x))}</td><td>${esc(A.branchName(x.branch))}</td><td>${kindPill(x)}</td><td class="money">${money(x.totals.vat)}</td><td class="money ${x.kind === 'credit' ? 'bad-t' : ''}">${x.kind === 'credit' ? '−' : ''}${money(x.totals.payable)}</td><td>${zpill(x.zatca.status)}</td></tr>`).join('')}
        <tr class="total"><td colspan="6">${esc(t('totals'))} (${list.length})</td><td class="money">${money(total)}</td><td></td></tr></tbody></table></div>
        <div class="list m-only mt">${list.map(x => `<button class="row" data-doc="${x.id}"><span class="avatar">${icon(x.kind === 'invoice' ? 'invoice' : 'undo')}</span><span class="main"><span class="t num">${esc(x.no)}</span><span class="m">${esc(buyerName(x))} · ${esc(x.date)}</span></span><span class="end"><span class="money ${x.kind === 'credit' ? 'bad-t' : ''}">${x.kind === 'credit' ? '−' : ''}${money(x.totals.payable)}</span>${zpill(x.zatca.status)}</span></button>`).join('')}</div>` : U.empty(t('no_results'))}
      <button class="fab m-only" data-new="simplified" aria-label="${esc(t('new_simplified'))}">${icon('plus')}</button>`;
    $$('[data-f]', main).forEach(b => b.onclick = () => { F.f = b.dataset.f; Screens.invoices(main, []); });
    $('[data-q]', main).oninput = (e) => { F.q = e.target.value; clearTimeout(F.tm); F.tm = setTimeout(() => { Screens.invoices(main, []); const q = $('[data-q]', main); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); };
    $$('[data-new]', main).forEach(b => b.onclick = () => docForm({ profile: b.dataset.new }));
    $$('[data-doc]', main).forEach(b => b.onclick = () => docSheet(b.dataset.doc));
    const gc = $('[data-go-co]', main); if (gc) gc.onclick = () => A.go('company');
  };

  // ================================================================ issue form (invoice / credit note / debit note)
  function docForm({ profile = 'simplified', customerId = null, kind = 'invoice', origId = null } = {}) {
    const d = db(); S.einvEnsure(d);
    const orig = origId ? d.salesDocs.find(x => x.id === origId) : null; if (orig) profile = orig.profile;
    const st = { profile, kind, lines: [] };
    if (orig && kind === 'credit') st.lines = orig.lines.map(l => ({ itemId: l.itemId, name: l.name, qty: l.qty, price: l.price, discPct: l.discPct, cat: l.cat, vatex: l.vatex }));
    else st.lines = [{ itemId: '', name: '', qty: 1, price: '', discPct: 0, cat: 'S', vatex: '' }];
    const items = d.items.filter(i => i.active !== false);
    const itemOpts = [{ v: '', l: '—' }, ...items.map(i => ({ v: i.id, l: `${i.code ? i.code + ' · ' : ''}${L(i)} — ${money(i.price)}` }))];
    const catOpts = ['S', 'Z', 'E', 'O'].map(c => ({ v: c, l: t('cat_' + c) }));
    const vatexOpts = (cat) => [{ v: '', l: '—' }, ...Z.VATEX.filter(v => v.cat === cat).map(v => ({ v: v.code, l: `${v.code} · ${L(v)}` }))];
    const pms = d.paymentMethods.filter(p => p.active);
    const payOpts = [...pms.map(p => ({ v: p.key, l: L(p) })), { v: 'credit', l: t('pay_credit') }];
    const custOpts = [{ v: '', l: '—' }, ...d.customers.map(c => ({ v: c.id, l: `${L({ ar: c.name, en: c.nameEn })}${c.vat ? ' · ' + c.vat : ''}` }))];
    const title = kind === 'invoice' ? t(profile === 'standard' ? 'new_standard' : 'new_simplified') : `${t('k_' + kind)} — ${orig.no}`;
    const reasonOpts = Z.NOTE_REASONS.map(r => ({ v: r.v, l: t('r_' + r.v) }));
    U.openSheet({ title, xwide: true, body: `<form id="df" novalidate>
      ${kind === 'invoice' ? U.seg('prof', [{ v: 'simplified', l: t('p_simplified') + ' (B2C)' }, { v: 'standard', l: t('p_standard') + ' (B2B)' }], profile) : `<div class="notice info">${icon('file')}<span>${esc(t('orig_invoice'))}: <b class="num">${esc(orig.no)}</b> · ${esc(orig.date)} · ${money(orig.totals.payable)} — ${esc(t('remaining_creditable'))}: <b class="money">${money(S.noteBalance(d, orig.id))}</b></span></div>`}
      <div class="grid3 mt">${U.field(t('date'), U.dateInput('date', S.todayISO()))}${A.branchField('branch', orig ? orig.branch : undefined)}${U.field(t('pay_method'), U.sel('payMethod', payOpts, orig ? orig.payMethod : (customerId ? 'credit' : 'cash')))}</div>
      <div id="buyerbox"></div>
      ${kind !== 'invoice' ? `<div class="grid2">${U.field(t('note_reason'), U.sel('reasonCode', reasonOpts, kind === 'credit' ? 'return' : 'extra'))}${U.field(t('reason_detail'), U.inp('reason', ''))}</div>` : ''}
      <h3 class="h3">${esc(t('item'))}</h3><div class="iline ihead"><span>${esc(t('item'))} / ${esc(t('description'))}</span><span>${esc(t('qty'))}</span><span>${esc(t('unit_price'))}</span><span>${esc(t('disc_pct'))}</span><span>${esc(t('vat_cat'))}</span><span class="money">${esc(t('line_total'))}</span><span></span></div>
      <div id="lines"></div><button type="button" class="btn secondary sm" data-add>${icon('plus')}${esc(t('add_line'))}</button>
      <div class="totals" id="tot"></div>
      ${U.field(t('notes'), U.inp('note', ''))}
      <div class="notice warn">${icon('lock')}<span>${esc(t('issue_confirm'))}</span></div><div id="ferr"></div>
      <div class="sticky-save"><button class="btn primary" type="submit">${icon('check')}${esc(t('issue_doc'))} · <span id="totbtn" class="money">0.00</span></button></div></form>`, onMount: (sh) => {
      const f = $('#df', sh);
      const renderBuyer = () => {
        const box = $('#buyerbox', sh);
        if (orig) { box.innerHTML = `<div class="kv"><span class="k">${esc(t('buyer'))}</span><span class="v">${esc(buyerName(orig))}</span></div>`; return; }
        if (st.profile === 'standard') {
          box.innerHTML = `<div class="grid2">${U.field(t('customer'), U.sel('customerId', custOpts, customerId || '', 'data-combo required'))}<div class="field"><label>&nbsp;</label><button type="button" class="btn secondary" data-newcust>${icon('plus')}${esc(t('add_customer'))}</button></div></div><div id="custchk"></div>`;
          const chk = () => { const c = d.customers.find(x => x.id === $('[name=customerId]', f).value); const iss = c ? Z.validateBuyer(S.buyerFromCustomer(c), 'standard') : []; $('#custchk', sh).innerHTML = c && iss.length ? `<div class="notice warn">${icon('alert')}<span>${esc(t('e_einv_invalid'))} ${esc(iss.map(i => t('v_' + i)).join('، '))}</span><button type="button" class="btn sm secondary" data-fixcust>${esc(t('fix'))}</button></div>` : ''; const fx = $('[data-fixcust]', sh); if (fx) fx.onclick = () => Screens.partyForm('customer', c, (saved) => { customerId = saved.id; reopen(); }); };
          $('[name=customerId]', f).addEventListener('change', chk); chk();
          $('[data-newcust]', sh).onclick = () => Screens.partyForm('customer', {}, (saved) => { customerId = saved.id; reopen(); });
        } else box.innerHTML = `<div class="grid2">${U.field(t('buyer_name_opt'), U.inp('buyerName', ''))}${U.field(t('buyer_vat_opt'), U.inp('buyerVat', '', 'dir="ltr" inputmode="numeric" maxlength="15"'))}</div>`;
      };
      const reopen = () => docForm({ profile: st.profile, customerId, kind, origId });
      const lineHtml = (l, i) => `<div class="iline" data-i="${i}">
        <div class="stack-cell">${U.sel('item_' + i, itemOpts, l.itemId || '', 'data-combo data-item')}<input class="input" data-k="name" value="${esc(l.name)}" placeholder="${esc(t('description'))}"></div>
        <input class="input num" data-k="qty" type="number" inputmode="decimal" step="any" min="0" value="${l.qty}" dir="ltr" aria-label="${esc(t('qty'))}">
        <input class="input money" data-k="price" type="number" inputmode="decimal" step="0.01" min="0" value="${l.price}" dir="ltr" aria-label="${esc(t('unit_price'))}">
        <input class="input num" data-k="discPct" type="number" inputmode="decimal" step="any" min="0" max="100" value="${l.discPct || ''}" dir="ltr" aria-label="${esc(t('disc_pct'))}" placeholder="0">
        <div class="stack-cell">${U.sel('cat_' + i, catOpts, l.cat, 'data-k="cat"')}${l.cat !== 'S' ? U.sel('vx_' + i, vatexOpts(l.cat), l.vatex || '', 'data-k="vatex"') : ''}</div>
        <span class="money strong" data-lt>0.00</span>
        <button type="button" class="iconbtn sm" data-rm aria-label="${esc(t('remove'))}">${icon('trash')}</button></div>`;
      const renderLines = () => { $('#lines', sh).innerHTML = st.lines.map(lineHtml).join(''); bindLines(); recalc(); };
      const recalc = () => {
        const comp = Z.computeLines(st.lines.map(l => ({ ...l, qty: +l.qty || 0, price: +l.price || 0, discPct: +l.discPct || 0 })));
        const T = Z.computeTotals(comp.filter(l => l.qty > 0));
        $$('[data-lt]', sh).forEach((el, i) => { el.textContent = money(comp[i] ? comp[i].total : 0); });
        $('#tot', sh).innerHTML = `<div class="kv"><span class="k">${esc(t('total_excl'))}</span><span class="v money">${money(T.lineExt)}</span></div>${T.discount ? `<div class="kv"><span class="k">${esc(t('total_disc'))}</span><span class="v money">${money(T.discount)}</span></div>` : ''}${T.byCat.map(c => `<div class="kv"><span class="k">${esc(t('total_vat'))} · ${esc(t('cat_' + c.cat))}</span><span class="v money">${money(c.vat)}</span></div>`).join('')}<div class="kv total"><span class="k">${esc(t('total_incl'))}</span><span class="v money">${money(T.payable)}</span></div>`;
        $('#totbtn', sh).textContent = money(T.payable);
      };
      function bindLines() {
        $$('.iline[data-i]', sh).forEach(row => {
          const i = +row.dataset.i; const l = st.lines[i];
          $$('[data-k]', row).forEach(inp => inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => { l[inp.dataset.k] = inp.value; if (inp.dataset.k === 'cat') { if (l.cat === 'S') l.vatex = ''; renderLines(); } else recalc(); }));
          const it = $('[data-item]', row); it.addEventListener('change', () => { const x = d.items.find(y => y.id === it.value); l.itemId = it.value; if (x) Object.assign(l, { name: x.ar, price: x.price, cat: x.cat, vatex: x.vatex || '' }); renderLines(); });
          $('[data-rm]', row).onclick = () => { st.lines.splice(i, 1); if (!st.lines.length) st.lines.push({ itemId: '', name: '', qty: 1, price: '', discPct: 0, cat: 'S', vatex: '' }); renderLines(); };
        });
      }
      if (kind === 'invoice') U.bindSeg(sh, 'prof', (v) => { st.profile = v; renderBuyer(); });
      $('[data-add]', sh).onclick = () => { st.lines.push({ itemId: '', name: '', qty: 1, price: '', discPct: 0, cat: 'S', vatex: '' }); renderLines(); const rows = $$('.iline[data-i]', sh); const last = rows[rows.length - 1]; if (last) $('.combo-input', last)?.focus(); };
      renderBuyer(); renderLines();
      f.addEventListener('submit', (e) => {
        e.preventDefault(); const x = U.formData(f);
        const input = { kind, profile: st.profile, date: x.date, branch: x.branch, payMethod: x.payMethod, note: x.note, user: A.user().id,
          lines: st.lines.filter(l => l.name || l.itemId).map(l => ({ itemId: l.itemId || null, name: l.name, qty: +l.qty, price: +l.price, discPct: +l.discPct || 0, cat: l.cat, vatex: l.vatex || null })) };
        if (kind === 'invoice') { if (st.profile === 'standard') input.customerId = x.customerId || null; else if (x.buyerName) input.buyer = { name: x.buyerName.trim(), vat: x.buyerVat }; }
        else { input.origId = orig.id; input.reasonCode = x.reasonCode; input.reason = x.reason ? x.reason.trim() : ''; }
        try {
          const doc = S.issueDoc(d, input); A.save(); U.closeSheet(true); A.render(); U.toast(t('issued_ok', { no: doc.no }));
          docSheet(doc.id); autoSend(doc);
        } catch (er) { failDoc(er, $('#ferr', sh)); }
      });
    } });
  }
  async function autoSend(doc) {
    const d = db(); if ((d.company.einv || {}).phase < 2 || !bridge().url) return;
    const dev = d.devices.find(x => x.id === doc.deviceId); if (!dev || dev.status !== 'production') return;
    try { const r = await sendDoc(doc); U.toast(t('zs_' + r.status), r.status === 'rejected' ? 'bad' : undefined); A.render(); } catch (e) { /* stays pending in the queue */ }
  }

  // ================================================================ invoice view / print
  function docHtml(x) {
    const s = x.seller, b = x.buyer; const T = x.totals; const tk = `doc_title_${x.kind}_${x.profile}`;
    const qr = x.qrSigned || x.qr;
    return `<div class="invdoc" dir="rtl">
      <div class="ih"><div class="ititle"><h2>${esc(ar(tk))}</h2><div class="en">${esc(en(tk))}</div><div class="iseller"><b>${esc(s.legalName)}</b><div>${esc(addrLine(s.address))}</div><div>${bl('vat_no_short')}: <span class="num">${esc(s.vat)}</span> · ${bl('cr_short')}: <span class="num">${esc(s.idNo)}</span></div></div></div><div class="iqr">${qrSvg(qr)}</div></div>
      <div class="imeta">
        <div><span class="k">${bl('invoice_no')}</span><span class="v num">${esc(x.no)}</span></div>
        <div><span class="k">${bl('issue_date')}</span><span class="v num">${esc(x.date)} ${esc(x.time)}</span></div>
        ${x.profile === 'standard' ? `<div><span class="k">${bl('supply_date')}</span><span class="v num">${esc(x.deliveryDate || x.date)}</span></div>` : ''}
        ${x.billingRef ? `<div><span class="k">${bl('orig_invoice')}</span><span class="v num">${esc(x.billingRef)}</span></div><div class="wide"><span class="k">${bl('note_reason')}</span><span class="v">${esc((Z.NOTE_REASONS.find(r => r.v === x.reasonCode) || {}).ar || '')} ${esc(x.reason || '')}</span></div>` : ''}
      </div>
      ${b && b.name ? `<div class="ibuyer"><h4>${bl('buyer')}</h4><b>${esc(b.name)}</b>${b.address && (b.address.street || b.address.city) ? `<div>${esc(addrLine(b.address))}</div>` : ''}<div>${b.vat ? `${bl('vat_no_short')}: <span class="num">${esc(b.vat)}</span>` : ''}${b.idType && b.idNo ? ` · ${esc(b.idType)}: <span class="num">${esc(b.idNo)}</span>` : ''}</div></div>` : ''}
      <table class="itbl"><thead><tr><th>#</th><th>${bl('description')}</th><th class="n">${bl('qty')}</th><th class="n">${bl('unit_price')}</th><th class="n c-x">${bl('disc_pct')}</th><th class="n c-x">${bl('taxable_amount')}</th><th class="n c-x">${bl('vat_rate')}</th><th class="n c-x">${bl('vat_amount')}</th><th class="n">${bl('line_total')}</th></tr></thead>
      <tbody>${x.lines.map(l => `<tr><td>${l.id}</td><td>${esc(l.name)}${l.cat !== 'S' ? `<div class="small">${esc(l.vatex || '')} — ${esc((Z.VATEX.find(v => v.code === l.vatex) || {}).ar || '')}</div>` : ''}</td><td class="n">${l.qty}</td><td class="n">${money(l.price)}</td><td class="n c-x">${l.discPct ? l.discPct + '%' : '—'}</td><td class="n c-x">${money(l.ext)}</td><td class="n c-x">${l.rate}%</td><td class="n c-x">${money(l.vat)}</td><td class="n">${money(l.total)}</td></tr>`).join('')}</tbody></table>
      <div class="itotals">
        <div><span>${bl('total_excl')}</span><span class="num">${money(T.lineExt)}</span></div>
        ${T.discount ? `<div><span>${bl('total_disc')}</span><span class="num">${money(T.discount)}</span></div>` : ''}
        ${T.byCat.map(c => `<div><span>${bl('total_vat')} ${c.rate}%${c.cat !== 'S' ? ' (' + esc(c.cat) + ')' : ''}</span><span class="num">${money(c.vat)}</span></div>`).join('')}
        <div class="grand"><span>${bl('total_incl')} (SAR)</span><span class="num">${money(T.payable)}</span></div></div>
      ${x.note || (db().company.einv || {}).invoiceNote ? `<p class="inote">${esc(x.note || db().company.einv.invoiceNote)}</p>` : ''}
      <p class="ifoot">${esc(x.uuid)} · ICV ${x.icv}</p></div>`;
  }
  function docSheet(id) {
    const d = db(); const x = d.salesDocs.find(y => y.id === id); if (!x) return;
    const notes = d.salesDocs.filter(n => n.origId === x.id);
    const canNotes = x.kind === 'invoice' && A.can('einv_notes') && A.feat('credit_notes');
    const ph2 = (d.company.einv || {}).phase >= 2 && bridge().url && /_pending|rejected/.test(x.zatca.status);
    U.openSheet({ title: `${t('k_' + x.kind)} ${x.no}`, xwide: true, body: `
      <div class="btnbar no-print"><button class="btn secondary" data-pa4>${icon('print')}${esc(t('print_a4'))}</button><button class="btn secondary" data-p80>${icon('print')}${esc(t('print_80'))}</button><button class="btn secondary" data-xml>${icon('download')}${esc(t('download_xml'))}</button>
        ${canNotes ? `<button class="btn secondary" data-cn>${icon('undo')}${esc(t('new_credit_note'))}</button><button class="btn secondary" data-dn>${icon('plus')}${esc(t('new_debit_note'))}</button>` : ''}
        ${ph2 && A.can('zatca') ? `<button class="btn primary" data-send>${icon('upload')}${esc(t('send_zatca'))}</button>` : ''}${x.journalId && A.can('journal_view') ? `<button class="btn secondary" data-je>${icon('journal')}${esc(t('view_entry'))}</button>` : ''}</div>
      <div class="notice info no-print">${icon('lock')}<span>${esc(t('locked_doc'))}</span></div>
      ${docHtml(x)}
      <div class="no-print">
        ${notes.length ? `<div class="section"><h2>${esc(t('notes_on_doc'))}</h2><div class="list">${notes.map(n => `<button class="row" data-note="${n.id}"><span class="main"><span class="t num">${esc(n.no)}</span><span class="m">${esc(t('k_' + n.kind))} · ${esc(n.date)}</span></span><span class="end"><span class="money">${money(n.totals.payable)}</span></span></button>`).join('')}</div></div>` : ''}
        <details class="history"><summary>${esc(t('zatca_status'))}: ${esc(t('zs_' + x.zatca.status))}</summary>
          <div class="kv"><span class="k">${esc(t('uuid'))}</span><span class="v code">${esc(x.uuid)}</span></div>
          <div class="kv"><span class="k">${esc(t('icv'))}</span><span class="v num">${x.icv}</span></div>
          <div class="kv"><span class="k">${esc(t('pih'))}</span><span class="v code wrap">${esc(x.pih)}</span></div>
          <div class="kv"><span class="k">${esc(t('inv_hash'))}</span><span class="v code wrap">${esc(x.hash)}</span></div>
          ${(x.zatca.messages || []).map(m => `<div class="small ${m[0] === 'E' ? 'bad-t' : 'muted'}">${esc(m)}</div>`).join('')}</details></div>`, onMount: (sh) => {
      const pr = (mode) => { document.body.classList.add('print-sheet', 'print-inv'); if (mode === '80') document.body.classList.add('print-80'); window.print(); setTimeout(() => document.body.classList.remove('print-sheet', 'print-inv', 'print-80'), 600); };
      $('[data-pa4]', sh).onclick = () => pr('a4'); $('[data-p80]', sh).onclick = () => pr('80');
      $('[data-xml]', sh).onclick = () => { const blob = new Blob([S.docXml(d, x)], { type: 'application/xml' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = x.no + '.xml'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
      const cn = $('[data-cn]', sh); if (cn) cn.onclick = () => docForm({ kind: 'credit', origId: x.id });
      const dn = $('[data-dn]', sh); if (dn) dn.onclick = () => docForm({ kind: 'debit', origId: x.id });
      const je = $('[data-je]', sh); if (je) je.onclick = () => Screens.entrySheet(x.journalId);
      $$('[data-note]', sh).forEach(b => b.onclick = () => docSheet(b.dataset.note));
      const sd = $('[data-send]', sh); if (sd) sd.onclick = async () => { sd.disabled = true; try { const r = await sendDoc(x); U.toast(t('zs_' + r.status)); docSheet(x.id); A.render(); } catch (e) { U.toast(t('bridge_fail'), 'bad'); sd.disabled = false; } };
    } });
  }
  Screens.docSheet = docSheet; Screens.docForm = docForm;

  // ================================================================ items
  let itemQ = '';
  Screens.items = (main) => {
    const d = db(); S.einvEnsure(d); const nq = U.norm(itemQ);
    const list = d.items.filter(i => !nq || U.norm(`${i.code} ${i.ar} ${i.en}`).includes(nq));
    main.innerHTML = `<div class="toolbar"><input class="input search" data-q placeholder="${esc(t('search'))}" value="${esc(itemQ)}"><span class="grow"></span><button class="btn primary sm" data-add>${icon('plus')}${esc(t('add_item'))}</button></div>
      ${list.length ? `<div class="tablewrap d-only mt"><table class="tbl">${U.th([{ l: t('item_code') }, { l: t('item') }, { l: t('vat_cat') }, { l: t('price_excl'), r: 1 }, { l: t('price_incl'), r: 1 }, { l: '' }])}<tbody>${list.map(i => `<tr class="click" data-it="${i.id}"><td class="code">${esc(i.code || '—')}</td><td class="strong">${esc(L(i))}</td><td>${esc(t('cat_' + i.cat))}${i.vatex ? ` <span class="small muted">${esc(i.vatex)}</span>` : ''}</td><td class="money">${money(i.price)}</td><td class="money">${money(i.price * (1 + Z.VAT_CATS[i.cat] / 100))}</td><td>${i.active === false ? U.pill(t('inactive')) : ''}</td></tr>`).join('')}</tbody></table></div>
      <div class="list m-only mt">${list.map(i => `<button class="row" data-it="${i.id}"><span class="avatar">${icon('items')}</span><span class="main"><span class="t">${esc(L(i))}</span><span class="m">${esc(i.code || '')} · ${esc(t('cat_' + i.cat))}</span></span><span class="end"><span class="money">${money(i.price)}</span></span></button>`).join('')}</div>` : U.empty(t('no_items'))}
      <button class="fab m-only" data-add aria-label="${esc(t('add_item'))}">${icon('plus')}</button>`;
    $('[data-q]', main).oninput = (e) => { itemQ = e.target.value; clearTimeout(Screens._itm); Screens._itm = setTimeout(() => { Screens.items(main); const q = $('[data-q]', main); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); };
    $$('[data-add]', main).forEach(b => b.onclick = () => itemForm({}));
    $$('[data-it]', main).forEach(b => b.onclick = () => itemForm(d.items.find(i => i.id === b.dataset.it)));
  };
  function itemForm(it) {
    const d = db();
    const vx = (cat, v) => cat === 'S' ? '' : U.field(t('vatex'), U.sel('vatex', [{ v: '', l: '—' }, ...Z.VATEX.filter(x => x.cat === cat).map(x => ({ v: x.code, l: `${x.code} · ${L(x)}` }))], v || ''));
    U.openSheet({ title: it.id ? t('edit_item') : t('add_item'), wide: true, body: `<form id="itf">
      <div class="grid2">${U.field(t('name_ar'), U.inp('ar', it.ar || '', 'required'))}${U.field(t('name_en'), U.inp('en', it.en || '', 'dir="ltr"'))}</div>
      <div class="grid3">${U.field(t('item_code'), U.inp('code', it.code || '', 'dir="ltr"'))}${U.field(t('price_excl'), U.moneyInput('price', it.price ?? '', 'required'))}${U.field(t('unit'), U.sel('unit', [{ v: 'PCE', l: 'PCE' }, { v: 'KGM', l: 'KG' }, { v: 'BX', l: 'BOX' }, { v: 'E48', l: 'SERVICE' }], it.unit || 'PCE'))}</div>
      <div class="grid2">${U.field(t('vat_cat'), U.sel('cat', ['S', 'Z', 'E', 'O'].map(c => ({ v: c, l: t('cat_' + c) })), it.cat || 'S'))}<div id="vxbox">${vx(it.cat || 'S', it.vatex)}</div></div>
      ${U.field(t('inventory_account'), U.accSelect(d, 'inventory', it.inventory || '', { under: '1103', blank: '—' }))}
      ${it.id ? U.check('active', it.active !== false, t('active') || 'Active') : ''}
      <div id="ierr"></div><button class="btn primary" type="submit">${esc(t('save'))}</button></form>`, onMount: (sh) => {
      const f = $('#itf', sh); $('[name=cat]', f).onchange = (e) => { $('#vxbox', sh).innerHTML = vx(e.target.value, ''); };
      f.addEventListener('submit', (e) => { e.preventDefault(); const x = U.formData(f); try { S.saveItem(d, { id: it.id, ar: x.ar, en: x.en, code: x.code, price: parseFloat(x.price), unit: x.unit, cat: x.cat, vatex: x.vatex || null, inventory: x.inventory || null, active: it.id ? x.active : true }); U.closeSheet(); A.commit(t('saved')); } catch (er) { $('#ierr', sh).innerHTML = `<div class="notice bad">${icon('alert')}<span>${esc(U.errText(er))}</span></div>`; } });
    } });
  }

  // ================================================================ compliance center
  Screens.zatca = (main) => {
    const d = db(); S.einvEnsure(d); const c = S.compliance(d); const ei = d.company.einv; const b = bridge(); const isAdmin = A.can('settings');
    const icn = (ok) => ok === true ? `<span class="ck good">${icon('check')}</span>` : ok === false ? `<span class="ck bad">${icon('alert')}</span>` : `<span class="ck info">${icon('info')}</span>`;
    const fixes = { seller_profile: 'company', vat_registered: 'company', customers_b2b: 'customers' };
    const detail = (it) => Array.isArray(it.detail) ? it.detail.map(i => I18N.has('v_' + i) ? t('v_' + i) : i).join('، ') : (it.detail ? String(it.detail) : '');
    const sel = S.seller(d);
    main.innerHTML = `<div class="cols"><div>
      <div class="card zhero"><div class="zscore" style="--p:${c.score}"><b>${c.score}%</b><span>${esc(t('zc_score'))}</span></div><div class="grow">
        <h3 class="mt0">${esc(t(c.phase >= 2 ? 'zc_phase2' : 'zc_phase1'))}</h3><p class="small muted">${esc(t('zc_phase_note'))}</p>
        ${isAdmin ? U.seg('phase', [{ v: '1', l: t('zc_phase1') }, { v: '2', l: t('zc_phase2') }], String(c.phase)) : ''}</div></div>
      <div class="section"><h2>${esc(t('zc_checklist'))}</h2><div class="list">${c.items.map(it => `<div class="row zrow">${icn(it.ok)}<span class="main"><span class="t">${esc(t('ck_' + it.key))}</span>${detail(it) ? `<span class="m ${it.ok === false ? 'bad-t' : ''}">${esc(detail(it))}</span>` : ''}</span>${it.ok === false && fixes[it.key] ? `<button class="btn sm secondary" data-fix="${fixes[it.key]}">${esc(t('fix'))}</button>` : ''}</div>`).join('')}</div></div>
    </div><div>
      <div class="section"><h2>${esc(t('zc_seller'))}</h2><div class="card"><b>${esc(sel.legalName)}</b><div class="small">${esc(addrLine(sel.address)) || '—'}</div><div class="small">${esc(t('vat_no_short'))}: <span class="num">${esc(sel.vat)}</span> · ${esc(sel.idType)}: <span class="num">${esc(sel.idNo || '—')}</span></div>${isAdmin ? `<div class="btnrow"><button class="btn sm secondary" data-fix="company">${icon('pen')}${esc(t('edit'))}</button></div>` : ''}</div></div>
      <div class="section"><h2>${esc(t('zc_queue'))}</h2>${c.queue.length ? `<div class="list">${c.queue.slice(0, 30).map(x => `<button class="row" data-doc="${x.id}"><span class="main"><span class="t num">${esc(x.no)}</span><span class="m">${esc(x.date)} · ${esc(t('p_' + x.profile))}</span></span><span class="end">${zpill(x.zatca.status)}</span></button>`).join('')}</div>${b.url ? `<div class="btnrow"><button class="btn primary sm" data-sendall>${icon('upload')}${esc(t('send_all'))} (${c.queue.length})</button></div>` : ''}` : `<div class="notice good">${icon('check')}<span>${esc(t(c.phase >= 2 ? 'nothing_pending' : 'zc_phase1'))}</span></div>`}</div>
      ${isAdmin ? `<div class="section"><h2>${esc(t('zc_bridge'))}</h2><form class="card" id="brf"><p class="small muted mt0">${esc(t('bridge_hint'))}</p>${U.field(t('bridge_url'), U.inp('server', ei.server || '', 'dir="ltr" placeholder="https://fatoora.example.sa"'))}${U.field(t('bridge_key'), `<input class="input" type="password" name="key" value="${esc(b.key)}" dir="ltr" autocomplete="off">`)}
        <div class="btnrow"><button class="btn primary sm" type="submit">${esc(t('save'))}</button><button class="btn secondary sm" type="button" data-test>${esc(t('bridge_test'))}</button></div></form></div>` : ''}
      <div class="section"><h2>${esc(t('zc_audit'))}</h2><div class="tablewrap"><table class="tbl compact"><tbody>${(d.audit || []).slice(-15).reverse().map(a => `<tr><td class="num small">${esc(a.at.slice(0, 16).replace('T', ' '))}</td><td>${esc(/^issue_/.test(a.action) ? t('k_' + a.action.slice(6)) : /^zatca_/.test(a.action) ? t('zs_' + a.action.slice(6)) : a.action)}</td><td class="num">${esc(a.ref || '')}</td><td class="small">${esc(A.userName(d.users.find(u => u.id === a.user)) || '')}</td></tr>`).join('') || `<tr><td>—</td></tr>`}</tbody></table></div></div>
    </div></div>
      <div class="section"><h2>${esc(t('zc_devices'))}</h2><div class="tablewrap"><table class="tbl compact">${U.th([{ l: t('dev_branch') }, { l: t('dev_icv'), r: 1 }, { l: t('dev_last') }, { l: t('dev_status') }, { l: '' }])}<tbody>${d.devices.map(v => `<tr><td><b>${esc(A.branchName(v.branch))}</b><div class="small muted code">${esc(v.serial)}</div></td><td class="money">${v.icv}</td><td class="num">${esc(v.lastNo || '—')}</td><td>${U.pill(t('ds_' + v.status), v.status === 'production' ? 'good' : 'neutral')}${v.env ? ` <span class="small muted">${esc(t('env_' + v.env))}</span>` : ''}</td><td>${isAdmin ? `<button class="btn sm secondary" data-onb="${v.id}">${esc(t('onboard'))}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
        <div class="btnrow"><button class="btn secondary sm" data-verify>${icon('shield')}${esc(t('zc_verify'))}</button></div></div>
`;
    $$('[data-fix]', main).forEach(x => x.onclick = () => A.go(x.dataset.fix));
    $$('[data-doc]', main).forEach(x => x.onclick = () => docSheet(x.dataset.doc));
    if (isAdmin) U.bindSeg(main, 'phase', (v) => { ei.phase = +v; for (const x of d.salesDocs) if (x.zatca.status === 'generated' && +v >= 2) { /* earlier phase-1 documents are not reported retroactively */ } A.commit(t('saved')); });
    $('[data-verify]', main).onclick = () => { const r = S.verifyChains(d); const bad = r.filter(x => !x.ok); U.toast(bad.length ? t('chain_bad') + ': ' + bad.flatMap(x => x.problems).slice(0, 3).join(' · ') : t('chain_ok', { n: r.reduce((s, x) => s + x.count, 0) }), bad.length ? 'bad' : undefined); };
    const brf = $('#brf', main); if (brf) {
      brf.addEventListener('submit', (e) => { e.preventDefault(); const x = U.formData(brf); ei.server = x.server.trim(); try { localStorage.setItem('daftar.bridgeKey.' + A.tenant().id, x.key); } catch (er) { /* ignore */ } A.commit(t('saved')); });
      $('[data-test]', brf).onclick = async () => { const x = U.formData(brf); try { const r = await fetch(x.server.replace(/\/+$/, '') + '/health'); U.toast(r.ok ? t('bridge_ok') : t('bridge_fail'), r.ok ? undefined : 'bad'); } catch (er) { U.toast(t('bridge_fail'), 'bad'); } };
    }
    const sa = $('[data-sendall]', main); if (sa) sa.onclick = async () => { sa.disabled = true; let n = 0; for (const x of S.pendingQueue(d)) { try { await sendDoc(x); n++; } catch (er) { U.toast(t('bridge_fail'), 'bad'); break; } } U.toast(t('sent_n', { n })); A.render(); };
    $$('[data-onb]', main).forEach(x => x.onclick = () => onboardSheet(d.devices.find(v => v.id === x.dataset.onb)));
  };
  function onboardSheet(dev) {
    const d = db();
    U.openSheet({ title: `${t('onboard')} — ${A.branchName(dev.branch)}`, body: `<form id="obf">
      ${bridge().url ? '' : `<div class="notice warn">${icon('alert')}<span>${esc(t('bridge_hint'))}</span></div>`}
      ${U.field(t('env'), U.sel('env', ['sandbox', 'simulation', 'production'].map(v => ({ v, l: t('env_' + v) })), dev.env || 'sandbox'))}
      ${U.field(t('otp'), U.inp('otp', '', 'inputmode="numeric" dir="ltr" maxlength="6" required'), t('otp_hint'))}
      <div id="obsteps"></div><button class="btn primary" type="submit" ${bridge().url ? '' : 'disabled'}>${esc(t('onboard'))}</button></form>`, onMount: (sh) => {
      const f = $('#obf', sh);
      f.addEventListener('submit', async (e) => {
        e.preventDefault(); const x = U.formData(f); const btn = $('button[type=submit]', f); btn.disabled = true; btn.textContent = t('onboarding');
        const br = d.branches.find(y => y.id === dev.branch) || {};
        try {
          const r = await bridgeCall('/onboard', { tenant: A.tenant().id, deviceId: dev.id, env: x.env, otp: x.otp.trim(), serial: dev.serial, seller: { ...S.seller(d), legalNameEn: d.company.legalNameEn }, branchName: br.en || br.ar, branchCode: br.code, location: br.city || d.company.addr.city, industry: 'Retail' });
          $('#obsteps', sh).innerHTML = `<div class="list">${(r.steps || []).map(s => `<div class="row">${s.ok ? `<span class="ck good">${icon('check')}</span>` : `<span class="ck bad">${icon('alert')}</span>`}<span class="main"><span class="t code">${esc(s.name)}</span>${s.errors && s.errors.length ? `<span class="m bad-t">${esc(s.errors.join(' · '))}</span>` : ''}</span></div>`).join('')}</div>`;
          if (r.ok) { Object.assign(dev, { status: 'production', env: x.env, csidExpires: r.expires || null, onboardedAt: new Date().toISOString() }); S.audit(d, 'onboard_' + x.env, dev.id, A.user().id); A.save(); U.toast(t('onboard_done')); A.render(); }
        } catch (er) { U.toast(t('bridge_fail'), 'bad'); }
        btn.disabled = false; btn.textContent = t('onboard');
      });
    } });
  }

  // ================================================================ company profile (seller data for invoices)
  Screens.company = (main) => {
    const d = db(); S.einvEnsure(d); const c = d.company; const a = c.addr || {};
    main.innerHTML = `<form id="cf" class="card narrow">
      <div class="grid2">${U.field(t('company_name') + ' (ع)', U.inp('name', c.name, 'required'))}${U.field(t('company_name') + ' (EN)', U.inp('nameEn', c.nameEn, 'dir="ltr"'))}</div>
      <div class="grid2">${U.field(t('legal_name') + ' (ع)', U.inp('legalName', c.legalName || ''))}${U.field(t('legal_name') + ' (EN)', U.inp('legalNameEn', c.legalNameEn || '', 'dir="ltr"'))}</div>
      <div class="grid3">${U.field(t('vat_number'), U.inp('vat', c.vat, 'dir="ltr" inputmode="numeric" maxlength="15"'))}${U.field(t('seller_id_type'), U.sel('idType', Z.SELLER_ID_TYPES.map(v => ({ v, l: L(Z.BUYER_ID_TYPES.find(x => x.v === v) || { ar: v, en: v }) })), c.idType || 'CRN'))}${U.field(t('id_no'), U.inp('idNo', c.idNo ?? c.cr ?? '', 'dir="ltr" inputmode="numeric"'))}</div>
      <h3 class="h3">${esc(t('national_address'))}</h3>
      <div class="grid3">${U.field(t('building_no'), U.inp('a_building', a.building || '', 'dir="ltr" inputmode="numeric" maxlength="4"'))}${U.field(t('street'), U.inp('a_street', a.street || ''))}${U.field(t('district'), U.inp('a_district', a.district || ''))}</div>
      <div class="grid3">${U.field(t('city'), U.inp('a_city', a.city || c.city || ''))}${U.field(t('postal_code'), U.inp('a_postal', a.postal || '', 'dir="ltr" inputmode="numeric" maxlength="5"'))}${U.field(t('additional_no'), U.inp('a_additional', a.additional || '', 'dir="ltr" inputmode="numeric"'))}</div>
      ${U.field(t('region'), U.inp('a_region', a.region || ''))}
      <h3 class="h3">${esc(t('einv_settings'))}</h3>${U.field(t('invoice_note'), U.inp('invoiceNote', (c.einv || {}).invoiceNote || ''))}
      <div id="cerr"></div><button class="btn primary" type="submit">${esc(t('save'))}</button></form>`;
    $('#cf', main).addEventListener('submit', (e) => {
      e.preventDefault(); const x = U.formData(e.target);
      if (x.vat && !Z.validVat(x.vat)) { $('#cerr', main).innerHTML = `<div class="notice bad">${icon('alert')}<span>${esc(t('invalid_vat'))}</span></div>`; return; }
      Object.assign(c, { name: x.name, nameEn: x.nameEn, legalName: x.legalName.trim() || x.name, legalNameEn: x.legalNameEn.trim() || x.nameEn, vat: x.vat.replace(/\D/g, ''), idType: x.idType, idNo: x.idNo.trim(), cr: x.idType === 'CRN' ? x.idNo.trim() : c.cr, city: x.a_city,
        addr: { building: x.a_building.trim(), street: x.a_street.trim(), district: x.a_district.trim(), city: x.a_city.trim(), postal: x.a_postal.trim(), additional: x.a_additional.trim(), region: x.a_region.trim(), country: 'SA' } });
      c.einv.invoiceNote = x.invoiceNote; A.commit(t('saved'));
    });
  };
})();
