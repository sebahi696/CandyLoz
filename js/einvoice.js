/* Daftar — e-invoicing engine (ZATCA / Fatoora). Extends Store; pure JS, testable in Node.
   Tax invoices, credit notes and debit notes are issued once and never edited or deleted.
   Each branch is an EGS unit (device) with its own invoice counter (ICV) and hash chain (PIH). */
(function (root) {
  const S = root.Store, Z = root.Zatca;
  const { r2, uid, bi, todayISO, addDays } = S;
  const zr = (n) => { const v = Number(n) || 0; return Math.sign(v) * Math.round(Number((Math.abs(v) * 100).toFixed(6))) / 100; };
  const err = (code, detail) => { const e = new Error(code + (detail ? ': ' + detail : '')); e.code = code; e.detail = detail; return e; };
  const LOCKED_TYPES = ['tax_invoice', 'tax_credit', 'tax_debit'];
  const ENTRY_TYPE = { invoice: 'tax_invoice', credit: 'tax_credit', debit: 'tax_debit' };
  const PREFIX = { invoice: 'INV', credit: 'CRN', debit: 'DBN' };
  const APP_VERSION = '2.3';

  const ITEMS_CANDY = [
    ['CH-500', 'شوكولاتة بلجيكية مشكلة 500 غ', 'Assorted Belgian chocolate 500 g', 65, '110301'],
    ['JL-1K', 'جيلي إسباني مشكل 1 كغ', 'Spanish jelly mix 1 kg', 45, '110303'],
    ['GB-LX', 'علبة هدايا فاخرة', 'Luxury gift box', 120, '110307'],
    ['JP-SN', 'سناك ياباني مشكل', 'Japanese snack assortment', 18, '110304'],
    ['NT-500', 'مكسرات محمصة 500 غ', 'Roasted nuts 500 g', 55, '110305'],
    ['FD-ST', 'فراولة مجففة بالتجميد', 'Freeze-dried strawberries', 35, '110305'],
    ['DR-KR', 'مشروب كوري', 'Korean drink', 9, '110306'],
    ['EV-CORP', 'توزيعات مناسبات للشركات (للصندوق)', 'Corporate event giveaways (per box)', 250, '110307'],
    ['SV-WRAP', 'خدمة تغليف الهدايا', 'Gift wrapping service', 15, null],
  ];

  // ---------------------------------------------------------------- setup / migration
  function newDevice(db, branch) {
    const b = db.branches.find(x => x.id === branch) || {};
    return { id: 'egs-' + branch, branch, name: 'EGS-' + (b.code || branch), serial: `1-Daftar|2-${APP_VERSION}|3-${Z.uuid4()}`, icv: 0, pih: Z.FIRST_PIH, status: 'not_onboarded', env: null, csidExpires: null, lastNo: null, createdAt: new Date().toISOString() };
  }
  function ensure(db) {
    const c = db.company;
    c.legalName ||= c.name; c.legalNameEn ||= c.nameEn || c.name;
    c.idType ||= 'CRN'; if (c.idNo == null) c.idNo = c.cr || '';
    c.addr ||= { street: '', building: '', district: '', city: c.city || '', postal: '', additional: '', region: '', country: 'SA' };
    c.einv ||= { enabled: true, phase: 1, wave: null, env: 'sandbox', server: '', b2b: true, b2c: true, invoiceNote: '' };
    db.items ||= []; db.salesDocs ||= []; db.audit ||= []; db.devices ||= [];
    for (const b of db.branches) if (!db.devices.find(d => d.branch === b.id)) db.devices.push(newDevice(db, b.id));
    db.seq.doc ||= {};
    db.sys.salesReturns ||= '4104'; db.sys.salesCorporate ||= '4103';
    return db;
  }
  function seedItems(db, rows = ITEMS_CANDY) { for (const [code, ar, en, price, inv] of rows) if (!db.items.find(i => i.code === code)) db.items.push({ id: uid(), code, ar, en, price, unit: 'PCE', cat: 'S', vatex: null, active: true, inventory: inv || null }); }
  function audit(db, action, ref, user, detail) { (db.audit ||= []).push({ id: uid(), at: new Date().toISOString(), action, ref: ref || null, user: user || null, detail: detail || null }); if (db.audit.length > 5000) db.audit.splice(0, db.audit.length - 5000); }

  // ---------------------------------------------------------------- items
  function saveItem(db, it) {
    ensure(db);
    if (!it.ar) throw err('item_name'); if (!(Number(it.price) >= 0)) throw err('amount');
    const cat = it.cat || 'S'; if (!Z.VAT_CATS.hasOwnProperty(cat)) throw err('line_cat'); if (cat !== 'S' && !it.vatex) throw err('line_vatex');
    const rec = { code: (it.code || '').trim(), ar: it.ar.trim(), en: (it.en || it.ar).trim(), price: zr(it.price), unit: it.unit || 'PCE', cat, vatex: cat === 'S' ? null : it.vatex, active: it.active !== false, inventory: it.inventory || null };
    if (rec.code && db.items.find(x => x.code === rec.code && x.id !== it.id)) throw err('item_code_exists', rec.code);
    if (it.id) { const cur = db.items.find(x => x.id === it.id); if (!cur) throw err('no_item'); Object.assign(cur, rec); return cur; }
    const n = { id: uid(), ...rec }; db.items.push(n); return n;
  }

  // ---------------------------------------------------------------- parties as ZATCA sees them
  function seller(db) {
    const c = db.company;
    return { legalName: c.legalName || c.name, vat: String(c.vat || '').replace(/\D/g, ''), idType: c.idType || 'CRN', idNo: String(c.idNo || c.cr || '').trim(), address: { ...(c.addr || {}), country: 'SA' } };
  }
  function buyerFromCustomer(c) {
    if (!c) return null; const a = c.addr || {};
    return { name: c.legalName || c.name, vat: String(c.vat || '').replace(/\D/g, ''), idType: c.idType || (c.cr ? 'CRN' : ''), idNo: c.idNo || c.cr || '', address: { street: a.street || '', building: a.building || '', district: a.district || '', city: a.city || '', postal: a.postal || '', additional: a.additional || '', country: a.country || 'SA' } };
  }
  function sellerIssues(db) { ensure(db); return Z.validateSeller(seller(db)); }

  // ---------------------------------------------------------------- numbers & balances
  function nextNo(db, kind, branch, date) {
    const b = db.branches.find(x => x.id === branch) || {}; const y = date.slice(0, 4); const k = `${kind}|${branch}|${y}`;
    db.seq.doc[k] = (db.seq.doc[k] || 0) + 1; return `${PREFIX[kind]}-${b.code || 'BR'}-${y}-${String(db.seq.doc[k]).padStart(5, '0')}`;
  }
  function noteBalance(db, origId) {
    const o = db.salesDocs.find(x => x.id === origId); if (!o) return 0;
    let v = o.totals.payable; for (const n of db.salesDocs) if (n.origId === origId) v += n.kind === 'credit' ? -n.totals.payable : n.totals.payable;
    return r2(v);
  }
  const nowTime = () => { const d = new Date(); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(x => String(x).padStart(2, '0')).join(':'); };

  // ---------------------------------------------------------------- issue (invoice / credit note / debit note)
  /* d: { kind: invoice|credit|debit, profile: standard|simplified, date, time?, branch, customerId?, buyer?, lines:[{itemId?,name,qty,price,discPct,cat,vatex}], payMethod, origId?, reasonCode?, reason?, note?, user } */
  function issueDoc(db, d) {
    ensure(db);
    const kind = d.kind || 'invoice'; if (!PREFIX[kind]) throw err('bad_kind');
    let profile = d.profile || 'simplified'; const date = d.date || todayISO(); const branch = d.branch || db.settings.defaultBranch || db.branches[0].id;
    const lock = db.settings.lockDate; if (lock && date <= lock) throw err('period_locked', lock);
    let orig = null;
    if (kind !== 'invoice') {
      orig = db.salesDocs.find(x => x.id === d.origId); if (!orig || orig.kind !== 'invoice') throw err('note_ref');
      profile = orig.profile; if (date < orig.date) throw err('note_before_invoice');
      if (!(d.reason || d.reasonCode)) throw err('note_reason');
    }
    const cust = d.customerId ? db.customers.find(c => c.id === d.customerId) : (orig && orig.customerId ? db.customers.find(c => c.id === orig.customerId) : null);
    const buyer = cust ? buyerFromCustomer(cust) : (orig ? orig.buyer : (d.buyer && d.buyer.name ? { name: d.buyer.name, vat: String(d.buyer.vat || '').replace(/\D/g, ''), idType: d.buyer.idType || '', idNo: d.buyer.idNo || '', address: d.buyer.address || null } : null));
    if (d.payMethod === 'credit' && !cust) throw err('credit_needs_customer');
    const sel = seller(db);
    const issues = [...Z.validateSeller(sel), ...Z.validateBuyer(buyer, profile)];
    const lines = Z.computeLines((d.lines || []).filter(l => l && (l.name || l.itemId)).map(l => { const it = l.itemId ? db.items.find(i => i.id === l.itemId) : null; return { itemId: l.itemId || null, name: (l.name || (it ? it.ar : '')).trim(), qty: Number(l.qty), price: Number(l.price ?? (it ? it.price : 0)), discPct: Number(l.discPct) || 0, cat: l.cat || (it ? it.cat : 'S'), vatex: l.vatex || (it ? it.vatex : null), unit: (it && it.unit) || 'PCE' }; }));
    const totals = Z.computeTotals(lines);
    const reasonObj = Z.NOTE_REASONS.find(r => r.v === d.reasonCode);
    const reason = kind === 'invoice' ? null : (d.reason || (reasonObj ? reasonObj.en : ''));
    const doc0 = { kind, profile, lines, totals, billingRef: orig ? orig.no : null, reason };
    issues.push(...Z.validateDoc(doc0));
    if (!(totals.payable > 0)) issues.push('zero_total');
    if (kind === 'credit' && totals.payable > noteBalance(db, orig.id) + 0.005) issues.push('credit_exceeds');
    if (issues.length) { const e = err('einv_invalid', [...new Set(issues)].join(',')); e.issues = [...new Set(issues)]; throw e; }

    const dev = db.devices.find(x => x.branch === branch) || (db.devices.push(newDevice(db, branch)), db.devices[db.devices.length - 1]);
    const no = nextNo(db, kind, branch, date);
    const doc = { id: uid(), no, uuid: Z.uuid4(), kind, profile, date, time: d.time || nowTime(), branch, deviceId: dev.id, icv: dev.icv + 1, pih: dev.pih || Z.FIRST_PIH,
      customerId: cust ? cust.id : null, buyer, seller: sel, lines, totals, payMethod: d.payMethod || 'cash', payMeans: d.payMethod === 'credit' ? 'credit' : d.payMethod === 'transfer' ? 'transfer' : (d.payMethod && d.payMethod !== 'cash' ? 'card' : 'cash'),
      origId: orig ? orig.id : null, billingRef: orig ? orig.no : null, reasonCode: d.reasonCode || null, reason, note: d.note || '', deliveryDate: d.deliveryDate || null,
      user: d.user || null, issuedAt: new Date().toISOString() };
    doc.hash = Z.invoiceHash(doc, sel, buyer);
    doc.qr = Z.qrPhase1({ sellerName: sel.legalName, vat: sel.vat, timestamp: `${doc.date}T${doc.time}`, total: totals.payable, vatTotal: totals.vat });
    const phase2 = (db.company.einv || {}).phase >= 2;
    doc.zatca = { status: phase2 ? (profile === 'standard' ? 'clearance_pending' : 'reporting_pending') : 'generated', deadline: phase2 && profile === 'simplified' ? new Date(Date.now() + 24 * 3600e3).toISOString() : null, attempts: 0, messages: [] };
    // journal
    const debitAcc = d.payMethod === 'credit' ? cust.account : S.methodAccount(db, d.payMethod || 'cash', branch);
    const revenue = d.revenueAccount || (profile === 'standard' ? db.sys.salesCorporate : S.branchSales(db, branch));
    const memo = { invoice: bi(`فاتورة ضريبية ${no}`, `Tax invoice ${no}`), credit: bi(`إشعار دائن ${no} على ${orig && orig.no}`, `Credit note ${no} for ${orig && orig.no}`), debit: bi(`إشعار مدين ${no} على ${orig && orig.no}`, `Debit note ${no} for ${orig && orig.no}`) }[kind];
    const who = buyer && buyer.name ? ' — ' + buyer.name : '';
    const jl = kind === 'credit'
      ? [{ account: db.sys.salesReturns || '4104', debit: totals.lineExt }, { account: db.sys.vatOut, debit: totals.vat }, { account: debitAcc, credit: totals.payable }]
      : [{ account: debitAcc, debit: totals.payable }, { account: revenue, credit: totals.lineExt }, { account: db.sys.vatOut, credit: totals.vat }];
    const je = S.postEntry(db, { date, branch, type: ENTRY_TYPE[kind], user: d.user, ref: no, memo: { ar: memo.ar + who, en: memo.en + who }, source: { docId: doc.id }, lines: jl });
    doc.journalId = je.id;
    dev.icv = doc.icv; dev.pih = doc.hash; dev.lastNo = no; dev.lastAt = doc.issuedAt;
    db.salesDocs.push(doc);
    audit(db, 'issue_' + kind, no, d.user, { total: totals.payable, icv: doc.icv });
    return doc;
  }
  const docXml = (db, doc, opts) => Z.xmlFile(Z.buildXml(doc, doc.seller, doc.buyer, opts));

  // integrity: recompute every hash and the chain of each device
  function verifyChains(db) {
    ensure(db); const out = [];
    for (const dev of db.devices) {
      const docs = db.salesDocs.filter(x => x.deviceId === dev.id).sort((a, b) => a.icv - b.icv); let prev = Z.FIRST_PIH, ok = true, problems = [];
      docs.forEach((x, i) => {
        if (x.icv !== i + 1) { ok = false; problems.push(`${x.no}: ICV ${x.icv} ≠ ${i + 1}`); }
        if (x.pih !== prev) { ok = false; problems.push(`${x.no}: PIH`); }
        const h = Z.invoiceHash(x, x.seller, x.buyer); if (h !== x.hash) { ok = false; problems.push(`${x.no}: hash`); }
        prev = x.signedHash || x.hash;
      });
      if (docs.length && dev.pih !== prev) { ok = false; problems.push('device PIH'); }
      out.push({ deviceId: dev.id, branch: dev.branch, count: docs.length, ok, problems });
    }
    return out;
  }
  // result from the Fatoora integration service (clearance / reporting)
  function applyZatcaResult(db, id, res, user) {
    const doc = db.salesDocs.find(x => x.id === id); if (!doc) throw err('no_doc');
    doc.zatca = { ...doc.zatca, status: res.status, at: new Date().toISOString(), attempts: (doc.zatca.attempts || 0) + 1, messages: res.messages || [], env: res.env || null };
    if (res.qr) doc.qrSigned = res.qr; if (res.signedHash) doc.signedHash = res.signedHash; if (res.clearedXml) doc.clearedXmlB64 = res.clearedXml;
    audit(db, 'zatca_' + res.status, doc.no, user, { env: res.env }); return doc;
  }
  function pendingQueue(db) { ensure(db); return db.salesDocs.filter(x => /_pending$|rejected/.test(x.zatca.status)); }

  // ---------------------------------------------------------------- VAT return (ZATCA form, boxes 1–16)
  function vatReturn(db, { from, to, corrections = 0, carried = 0 } = {}) {
    ensure(db);
    const B = {}; for (let i = 1; i <= 12; i++) B[i] = { amount: 0, adj: 0, vat: 0 };
    const inR = (d) => d >= from && d <= to; const add = (box, amount, vat, adj = 0) => { B[box].amount = r2(B[box].amount + amount); B[box].vat = r2(B[box].vat + vat); B[box].adj = r2(B[box].adj + adj); };
    // sales
    for (const i of db.salesInvoices) if (inR(i.date)) add(1, i.subtotal, i.vat);
    for (const i of db.customerInvoices) if (inR(i.date)) add(1, i.subtotal, i.vat);
    for (const x of db.salesDocs) {
      if (!inR(x.date)) continue; const sign = x.kind === 'credit' ? -1 : 1;
      for (const c of x.totals.byCat) {
        const box = c.cat === 'S' ? 1 : c.cat === 'Z' ? (/^VATEX-SA-3[234]/.test(c.vatex || '') ? 4 : (/EDU|HEA/.test(c.vatex || '') ? 2 : 3)) : c.cat === 'E' ? 5 : null;
        if (!box) continue; // out of scope (O)
        if (x.kind === 'credit') { B[box].adj = r2(B[box].adj - c.taxable); B[box].vat = r2(B[box].vat - c.vat); } else add(box, c.taxable * sign, c.vat * sign);
      }
    }
    // purchases
    for (const i of db.supplierInvoices) if (i.status === 'posted' && inR(i.date)) { if (i.vat > 0) add(7, i.subtotal, i.vat); else add(11, i.subtotal, 0); }
    for (const x of db.expenses) if (inR(x.date)) for (const l of x.lines) if (l.taxable) add(7, l.net, l.vat || r2(l.net * S.VAT_RATE));
    for (const box of [1, 2, 3, 4, 5]) { B[6].amount = r2(B[6].amount + B[box].amount); B[6].adj = r2(B[6].adj + B[box].adj); B[6].vat = r2(B[6].vat + B[box].vat); }
    for (const box of [7, 8, 9, 10, 11]) { B[12].amount = r2(B[12].amount + B[box].amount); B[12].adj = r2(B[12].adj + B[box].adj); B[12].vat = r2(B[12].vat + B[box].vat); }
    const b13 = r2(B[6].vat - B[12].vat), b14 = r2(corrections), b15 = r2(carried), b16 = r2(b13 + b14 - b15);
    const ledger = S.vatReport(db, { from, to });
    return { from, to, boxes: B, b13, b14, b15, b16, ledger, diffOut: r2(ledger.output - B[6].vat), diffIn: r2(ledger.input - B[12].vat), dueDate: vatDueDate(to) };
  }
  // the return and payment are due by the last day of the month after the period ends
  const vatDueDate = (to) => { const ym = S.addMonths(to.slice(0, 7), 1); return S.monthEnd(ym); };

  // ---------------------------------------------------------------- Zakat (estimate worksheet, net-assets method)
  function zakatWorksheet(db, { year, gregorian = true, addBack = 0, otherDeductions = 0 } = {}) {
    year = String(year || todayISO().slice(0, 4)); const end = `${year}-12-31`, start = `${year}-01-01`;
    const bal = (code) => { const a = S.acc(db, code); if (!a) return 0; const v = S.accountBalance(db, code, { to: end }); return S.natureOf(a.type) === 'credit' ? -v : v; };
    // accountBalance returns debit-positive; credit-nature accounts are flipped to positive above
    const is = S.incomeStatement(db, { from: start, to: end });
    const profit = r2(is.netIncome ?? is.net ?? 0);
    const sources = [
      { key: 'capital', code: db.sys.capital || '31', v: bal(db.sys.capital || '31') },
      { key: 'owner_current', code: '32', v: bal('32') },
      { key: 'retained', code: db.sys.retained || '33', v: bal(db.sys.retained || '33') },
      { key: 'reserve', code: '34', v: bal('34') },
      { key: 'provisions', code: '2201', v: bal('2201') },
      { key: 'lt_loans', code: '2202', v: bal('2202') },
      { key: 'net_profit', code: null, v: profit },
      { key: 'add_back', code: null, v: r2(addBack) },
    ].map(x => ({ ...x, v: r2(x.v) }));
    const fixedNet = r2(S.accountBalance(db, '12', { to: end }));
    const deductions = [{ key: 'fixed_assets_net', code: '12', v: fixedNet }, { key: 'other_deductions', code: null, v: r2(otherDeductions) }];
    const totalSources = r2(sources.reduce((s, x) => s + x.v, 0)), totalDed = r2(deductions.reduce((s, x) => s + x.v, 0));
    const adjustedProfit = r2(profit + addBack);
    const base = r2(Math.max(totalSources - totalDed, adjustedProfit, 0));
    const rate = gregorian ? 0.025776 : 0.025;
    const due = r2(base * rate);
    const posted = db.journal.filter(j => j.type === 'zakat' && j.date.startsWith(year) && !j.reversedBy).reduce((s, j) => s + j.total, 0);
    const deadline = S.addDays(end, 120);
    return { year, start, end, sources, deductions, totalSources, totalDed, adjustedProfit, base, rate, due, posted: r2(posted), deadline };
  }
  function postZakat(db, { year, amount, user }) {
    if (!(amount > 0)) throw err('amount');
    const date = `${year}-12-31`;
    return S.postEntry(db, { date, type: 'zakat', user, ref: 'ZAKAT-' + year, memo: bi(`مخصص الزكاة لعام ${year}`, `Zakat provision ${year}`), lines: [{ account: db.sys.zakatExpense || '6304', debit: r2(amount) }, { account: db.sys.zakatPayable || '2104', credit: r2(amount) }] });
  }

  // ---------------------------------------------------------------- compliance checklist
  function compliance(db, { platformTenant } = {}) {
    ensure(db); const sel = seller(db); const sIss = Z.validateSeller(sel);
    const chains = verifyChains(db); const queue = pendingQueue(db);
    const overdue = queue.filter(x => x.zatca.deadline && x.zatca.deadline < new Date().toISOString());
    const custMissing = db.customers.filter(c => Z.validateBuyer(buyerFromCustomer(c), 'standard').length).length;
    const ph = db.company.einv.phase;
    const items = [
      { key: 'seller_profile', ok: !sIss.length, detail: sIss },
      { key: 'vat_registered', ok: Z.validVat(sel.vat) },
      { key: 'arabic', ok: true },
      { key: 'qr_on_invoices', ok: true },
      { key: 'no_edit_delete', ok: true },
      { key: 'credit_debit_notes', ok: true },
      { key: 'hash_chain', ok: chains.every(c => c.ok), detail: chains.flatMap(c => c.problems) },
      { key: 'customers_b2b', ok: custMissing === 0, warn: true, detail: custMissing },
      { key: 'devices_onboarded', ok: ph < 2 || db.devices.every(d => d.status === 'production'), warn: ph < 2 },
      { key: 'reporting_24h', ok: !overdue.length, detail: overdue.length },
      { key: 'pos_skysystem', ok: null },
      { key: 'retention', ok: null },
      { key: 'hosting_ksa', ok: null },
    ];
    return { phase: ph, items, chains, queue, overdue, score: Math.round(items.filter(i => i.ok === true).length / items.filter(i => i.ok !== null).length * 100) };
  }

  Object.assign(S, { LOCKED_TYPES, ITEMS_CANDY, einvEnsure: ensure, seedItems, saveItem, seller, buyerFromCustomer, sellerIssues, issueDoc, docXml, noteBalance, verifyChains, applyZatcaResult, pendingQueue, vatReturn, vatDueDate, zakatWorksheet, postZakat, compliance, audit, newDevice });
})(typeof window !== 'undefined' ? window : globalThis);
