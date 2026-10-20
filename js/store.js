/* Daftar — data store + double-entry ledger engine
   Pure JS, no DOM. Works in browser (localStorage) and Node (in-memory) for tests. */
(function (root) {
  const KEY = 'daftar.v1';
  const VAT_RATE = 0.15;

  // ---------- helpers ----------
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const pad2 = (n) => String(n).padStart(2, '0');
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
  const utc = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const addDays = (iso, n) => new Date(utc(iso) + n * 86400000).toISOString().slice(0, 10);
  const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);

  // ---------- chart of accounts (Saudi SME) ----------
  const ACCOUNTS = [
    // assets
    { code: '1010', ar: 'الصندوق — النقدية', en: 'Cash on hand', type: 'asset', group: 'cash' },
    { code: '1020', ar: 'البنك — الحساب الجاري', en: 'Bank — current account', type: 'asset', group: 'bank' },
    { code: '1030', ar: 'مستحقات شبكة مدى', en: 'mada receivable (settlement)', type: 'asset', group: 'card' },
    { code: '1031', ar: 'مستحقات فيزا/ماستر', en: 'Visa/Master receivable', type: 'asset', group: 'card' },
    { code: '1032', ar: 'مستحقات تابي/تمارا', en: 'Tabby/Tamara receivable', type: 'asset', group: 'card' },
    { code: '1040', ar: 'ضريبة القيمة المضافة — مدخلات', en: 'VAT input (receivable)', type: 'asset', group: 'vat' },
    { code: '1100', ar: 'المخزون', en: 'Inventory', type: 'asset' },
    { code: '1500', ar: 'الأثاث والتجهيزات', en: 'Furniture & fixtures', type: 'asset' },
    // liabilities
    { code: '2010', ar: 'الموردون — ذمم دائنة', en: 'Accounts payable — suppliers', type: 'liability', group: 'ap' },
    { code: '2040', ar: 'ضريبة القيمة المضافة — مخرجات', en: 'VAT output (payable)', type: 'liability', group: 'vat' },
    { code: '2100', ar: 'مصروفات مستحقة', en: 'Accrued expenses', type: 'liability' },
    // equity
    { code: '3010', ar: 'رأس المال', en: 'Capital', type: 'equity' },
    { code: '3020', ar: 'الأرباح المبقاة', en: 'Retained earnings', type: 'equity' },
    // revenue
    { code: '4010', ar: 'مبيعات الحلويات', en: 'Sales — sweets', type: 'revenue', group: 'sales' },
    { code: '4020', ar: 'مبيعات الشوكولاتة', en: 'Sales — chocolate', type: 'revenue', group: 'sales' },
    { code: '4030', ar: 'مبيعات المتجر الإلكتروني', en: 'Sales — online store', type: 'revenue', group: 'sales' },
    { code: '4900', ar: 'خصومات المبيعات', en: 'Sales discounts', type: 'revenue' },
    // cost of sales
    { code: '5010', ar: 'مشتريات بضاعة', en: 'Purchases — goods for resale', type: 'expense', group: 'cogs' },
    { code: '5020', ar: 'مصاريف شحن واستيراد', en: 'Freight & import costs', type: 'expense', group: 'cogs' },
    // expenses
    { code: '6010', ar: 'الرواتب والأجور', en: 'Salaries & wages', type: 'expense' },
    { code: '6020', ar: 'الإيجار', en: 'Rent', type: 'expense' },
    { code: '6030', ar: 'الكهرباء والمياه', en: 'Utilities', type: 'expense' },
    { code: '6040', ar: 'مواد تغليف', en: 'Packaging materials', type: 'expense' },
    { code: '6050', ar: 'تسويق وإعلان', en: 'Marketing & advertising', type: 'expense' },
    { code: '6060', ar: 'عمولات الدفع الإلكتروني', en: 'Payment processing fees', type: 'expense' },
    { code: '6070', ar: 'صيانة', en: 'Maintenance', type: 'expense' },
    { code: '6080', ar: 'مصروفات متنوعة', en: 'Miscellaneous expenses', type: 'expense' },
    { code: '6090', ar: 'عجز/زيادة الصندوق', en: 'Cash over/short', type: 'expense' },
  ];
  const METHOD_ACCOUNT = { cash: '1010', mada: '1030', visa: '1031', tabby: '1032', transfer: '1020', bank: '1020' };

  // ---------- seed data ----------
  function seed() {
    const t0 = todayISO();
    const branches = [
      { id: 'b1', ar: 'فرع البلد', en: 'Al-Balad', code: 'BLD', city: 'جدة' },
      { id: 'b2', ar: 'فرع الحمراء', en: 'Al-Hamra', code: 'HMR', city: 'جدة' },
      { id: 'b3', ar: 'فرع الروضة', en: 'Al-Rawdah', code: 'RWD', city: 'جدة' },
    ];
    const users = [
      { id: 'u1', name: 'فهد العمري', nameEn: 'Fahad Al-Amri', role: 'admin', pin: '1234', active: true },
      { id: 'u2', name: 'نورة السبيعي', nameEn: 'Noura Al-Subaie', role: 'accountant', pin: '1234', active: true },
      { id: 'u3', name: 'سعيد بخش', nameEn: 'Saeed Bakhsh', role: 'operator', pin: '1234', active: true, branch: 'b1' },
      { id: 'u4', name: 'محمد الزهراني', nameEn: 'Mohammed Al-Zahrani', role: 'operator', pin: '1234', active: true, branch: 'b2' },
      { id: 'u5', name: 'أحمد قاضي', nameEn: 'Ahmed Qadi', role: 'operator', pin: '1234', active: true, branch: 'b3' },
    ];
    const suppliers = [
      { id: 's1', name: 'شركة الخليج لاستيراد الحلويات', nameEn: 'Gulf Sweets Import Co.', vat: '300012345600003', cr: '4030123456', phone: '0126543210', terms: 30, addr: { building: '7845', street: 'شارع الأمير سلطان', district: 'حي الروضة', city: 'جدة', postal: '23432', additional: '6734', short: 'RAFA7845' } },
      { id: 's2', name: 'مؤسسة نكهات آسيا للتجارة', nameEn: 'Asia Flavors Trading Est.', vat: '300456789100003', cr: '4030234567', phone: '0555123456', terms: 15, addr: { building: '3201', street: 'طريق المدينة', district: 'حي الشرفية', city: 'جدة', postal: '22234', additional: '7612', short: 'RBHA3201' } },
      { id: 's3', name: 'شركة فيجو للشوكولاتة', nameEn: 'Figo Chocolate Co.', vat: '310234567800003', cr: '1010345678', phone: '0112233445', terms: 45, addr: { building: '5500', street: 'طريق العليا', district: 'حي العليا', city: 'الرياض', postal: '12211', additional: '8821', short: 'RGDA5500' } },
      { id: 's4', name: 'مصنع الجيلي الإسباني — دوليتش', name_hint: 'Dulce', nameEn: 'Dulce Spanish Jelly Factory', vat: '300998877600003', cr: '4030456789', phone: '0543210987', terms: 30, addr: { building: '1150', street: 'شارع فلسطين', district: 'حي الحمراء', city: 'جدة', postal: '23323', additional: '5566', short: 'RHMA1150' } },
      { id: 's5', name: 'مؤسسة قمر الدين الشامية', nameEn: 'Qamar Al-Din Al-Shamiya Est.', vat: '300112233400003', cr: '4030567890', phone: '0509876543', terms: 15, addr: { building: '2210', street: 'شارع الستين', district: 'حي البغدادية', city: 'جدة', postal: '22231', additional: '4432', short: 'RBAA2210' } },
      { id: 's6', name: 'شركة التغليف الحديثة', nameEn: 'Modern Packaging Co.', vat: '300778899000003', cr: '4030678901', phone: '0126789012', terms: 30, addr: { building: '9087', street: 'طريق الملك فهد', district: 'الصناعية', city: 'جدة', postal: '21442', additional: '2210', short: 'RSNA9087' } },
      { id: 's7', name: 'مؤسسة المكسرات الذهبية', nameEn: 'Golden Nuts Est.', vat: '300334455600003', cr: '4030789012', phone: '0567890123', terms: 7, addr: { building: '4412', street: 'شارع قابل', district: 'حي البلد', city: 'جدة', postal: '22233', additional: '3390', short: 'RBLD4412' } },
      { id: 's8', name: 'شركة ريد بول العربية', nameEn: 'Red Bull Arabia', vat: '300556677800003', cr: '1010890123', phone: '0112345678', terms: 30, addr: { building: '6600', street: 'طريق الملك عبدالله', district: 'حي الغدير', city: 'الرياض', postal: '13311', additional: '9901', short: 'RQAA6600' } },
      { id: 's9', name: 'شركة البرق للشحن', nameEn: 'Albarq Freight Co.', vat: '300665544300003', cr: '4030901234', phone: '0126001122', terms: 15, addr: { building: '2003', street: 'شارع المطار', district: 'حي المطار', city: 'جدة', postal: '23234', additional: '1123', short: 'RMTA2003' } },
      { id: 's10', name: 'مؤسسة سناك اليابان', nameEn: 'Japan Snack Est.', vat: '300887766500003', cr: '4030012345', phone: '0551122334', terms: 30, addr: { building: '812', street: 'شارع التحلية', district: 'حي الزهراء', city: 'جدة', postal: '23521', additional: '7788', short: 'RZHA0812' } },
    ];

    const db = { version: 1, company: { name: 'كاندي لوز', nameEn: 'Candy Loz', vat: '314944989200003', cr: '4030512345', city: 'جدة', fiscalStart: '01-01' }, branches, users, suppliers, accounts: ACCOUNTS.map(a => ({ ...a })), journal: [], salesInvoices: [], imports: [], supplierInvoices: [], payments: [], eod: [], seq: { je: 1000, inv: 1 } };

    // --- opening balances (capital, bank, inventory, furniture)
    postJournal(db, { date: addDays(t0, -50), memo: 'رصيد افتتاحي / Opening balances', source: { type: 'opening' }, lines: [
      { account: '1020', debit: 180000 }, { account: '1010', debit: 12000, branch: 'b1' }, { account: '1100', debit: 95000 }, { account: '1500', debit: 48000 },
      { account: '3010', credit: 335000 },
    ] });

    // --- 60 days of sales per branch (deterministic pseudo-random)
    let s = 7;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const methods = ['cash', 'mada', 'visa', 'tabby'];
    const weights = { cash: 0.32, mada: 0.44, visa: 0.16, tabby: 0.08 };
    const branchMult = { b1: 1.0, b2: 0.78, b3: 0.64 };
    for (let d = 48; d >= 0; d--) {
      const date = addDays(t0, -d);
      const dow = new Date(date + 'T00:00:00').getDay();
      const dayMult = (dow === 4 || dow === 5) ? 1.45 : (dow === 6 ? 1.15 : 1);
      for (const b of branches) {
        if (d === 0 && b.id === 'b3') continue; // today: one branch not imported yet
        const n = Math.round((26 + rnd() * 18) * branchMult[b.id] * dayMult);
        const invoices = [];
        for (let i = 0; i < n; i++) {
          const total = r2(8 + Math.pow(rnd(), 2.3) * 290);
          const sub = r2(total / (1 + VAT_RATE));
          const x = rnd(); let acc = 0, method = 'cash';
          for (const m of methods) { acc += weights[m]; if (x <= acc) { method = m; break; } }
          invoices.push({ date, branch: b.id, no: `${b.code}-${date.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`, subtotal: sub, vat: r2(total - sub), total, method });
        }
        postSalesBatch(db, invoices, { source: 'skysystem_export', file: `sales_${b.code}_${date}.csv`, user: 'u3', seeded: true });
      }
    }

    // --- supplier invoices over last 60 days
    const invSpecs = [
      ['s1', -47, 24500, '5010'], ['s3', -45, 18200, '5010'], ['s4', -43, 9800, '5010'], ['s7', -41, 3200, '5010'], ['s6', -39, 2150, '6040'],
      ['s2', -37, 14300, '5010'], ['s5', -35, 4100, '5010'], ['s9', -33, 2700, '5020'], ['s10', -31, 11600, '5010'], ['s8', -29, 6200, '5010'],
      ['s1', -26, 27900, '5010'], ['s7', -24, 2900, '5010'], ['s3', -22, 16400, '5010'], ['s6', -19, 1980, '6040'], ['s4', -17, 10500, '5010'],
      ['s2', -15, 13100, '5010'], ['s9', -13, 3100, '5020'], ['s5', -11, 3850, '5010'], ['s10', -9, 12900, '5010'], ['s1', -6, 23100, '5010'],
      ['s7', -4, 2650, '5010'], ['s8', -2, 5900, '5010'], ['s3', -1, 17800, '5010'],
    ];
    invSpecs.forEach(([sid, off, sub, acc], i) => {
      const sup = suppliers.find(x => x.id === sid);
      const date = addDays(t0, off);
      const inv = createSupplierInvoice(db, { supplierId: sid, no: `${sup.vat.slice(3, 7)}-${String(2041 + i)}`, date, due: addDays(date, sup.terms), subtotal: sub, vat: r2(sub * VAT_RATE), total: r2(sub * 1.15), account: acc, branch: 'b1', user: 'u3' });
      if (off <= -3) postSupplierInvoice(db, inv.id, 'u2');
    });
    // pay most invoices older than their terms, some partial
    for (const inv of db.supplierInvoices) {
      if (inv.status !== 'posted') continue;
      const age = daysBetween(inv.date, t0);
      const sup = suppliers.find(x => x.id === inv.supplierId);
      if (age > sup.terms + 2 && rnd() < 0.85) {
        const partial = rnd() < 0.2;
        recordPayment(db, { invoiceId: inv.id, amount: partial ? r2(inv.total * 0.5) : inv.total, date: addDays(inv.date, sup.terms - 1), from: rnd() < 0.8 ? '1020' : '1010', user: 'u2' });
      }
    }
    // a few operating expenses (rent, salaries, utilities) so P&L looks real
    for (let m = 2; m >= 0; m--) {
      const date = addDays(t0.slice(0, 8) + '01', -m * 30);
      postJournal(db, { date, memo: 'رواتب الشهر / Monthly salaries', source: { type: 'manual' }, lines: [{ account: '6010', debit: 38500 }, { account: '1020', credit: 38500 }] });
      postJournal(db, { date, memo: 'إيجار الفروع / Branch rent', source: { type: 'manual' }, lines: [{ account: '6020', debit: 21000 }, { account: '1040', debit: 3150 }, { account: '1020', credit: 24150 }] });
      postJournal(db, { date, memo: 'كهرباء ومياه / Utilities', source: { type: 'manual' }, lines: [{ account: '6030', debit: 4200 }, { account: '1040', debit: 630 }, { account: '1020', credit: 4830 }] });
    }
    // card settlements: bank receives mada/visa/tabby for all but last 2 days
    for (const code of ['1030', '1031', '1032']) {
      const bal = accountBalance(db, code, addDays(t0, -2));
      if (bal > 0) postJournal(db, { date: addDays(t0, -1), memo: 'تسوية شبكة / Card settlement', source: { type: 'settlement' }, lines: [{ account: '1020', debit: r2(bal * 0.985) }, { account: '6060', debit: r2(bal * 0.015) }, { account: code, credit: bal }] });
    }
    // EOD closings for all but the last 3 days
    for (let d = 48; d >= 3; d--) {
      const date = addDays(t0, -d);
      for (const b of branches) {
        const exp = expectedCash(db, date, b.id);
        if (exp <= 0) continue;
        const diff = rnd() < 0.15 ? r2((rnd() - 0.5) * 60) : 0;
        closeDay(db, { date, branch: b.id, counted: r2(exp + diff), user: users.find(u => u.branch === b.id).id });
      }
    }
    return db;
  }

  // ---------- journal ----------
  function postJournal(db, je) {
    const lines = je.lines.map(l => ({ account: l.account, debit: r2(l.debit), credit: r2(l.credit), branch: l.branch || null, supplier: l.supplier || null }));
    const dr = r2(lines.reduce((a, l) => a + l.debit, 0)), cr = r2(lines.reduce((a, l) => a + l.credit, 0));
    if (Math.abs(dr - cr) > 0.005) throw new Error(`Unbalanced entry: ${dr} vs ${cr} (${je.memo})`);
    const entry = { id: uid(), no: 'JE-' + (++db.seq.je), date: je.date, memo: je.memo, source: je.source || { type: 'manual' }, lines, createdAt: new Date().toISOString(), user: je.user || null };
    db.journal.push(entry);
    return entry;
  }

  // ---------- sales ----------
  function postSalesBatch(db, invoices, meta) {
    // dedupe by invoice no
    const existing = new Set(db.salesInvoices.map(i => i.no));
    const fresh = invoices.filter(i => !existing.has(i.no));
    if (!fresh.length) return { posted: 0, skipped: invoices.length };
    const imp = { id: uid(), at: new Date().toISOString(), file: meta.file || null, source: meta.source || 'manual', user: meta.user || null, count: fresh.length, total: r2(fresh.reduce((a, i) => a + i.total, 0)), dates: [...new Set(fresh.map(i => i.date))].sort() };
    db.imports.push(imp);
    for (const i of fresh) db.salesInvoices.push({ ...i, importId: imp.id });
    // group → one journal entry per date+branch+method
    const groups = {};
    for (const i of fresh) { const k = `${i.date}|${i.branch}|${i.method}`; (groups[k] ||= { date: i.date, branch: i.branch, method: i.method, subtotal: 0, vat: 0, total: 0, n: 0 }); const g = groups[k]; g.subtotal = r2(g.subtotal + i.subtotal); g.vat = r2(g.vat + i.vat); g.total = r2(g.total + i.total); g.n++; }
    const entries = [];
    for (const g of Object.values(groups)) {
      // revenue split: sweets 70% / chocolate 30% (POS categories not in export) — simple, transparent, overridable later
      const sw = r2(g.subtotal * 0.7), ch = r2(g.subtotal - sw);
      entries.push(postJournal(db, { date: g.date, memo: `__sales__|${g.branch}|${g.method}|${g.n}`, source: { type: 'sales_import', importId: imp.id }, user: meta.user, lines: [
        { account: METHOD_ACCOUNT[g.method] || '1010', debit: g.total, branch: g.branch },
        { account: '4010', credit: sw, branch: g.branch }, { account: '4020', credit: ch, branch: g.branch }, { account: '2040', credit: g.vat, branch: g.branch },
      ] }));
    }
    return { posted: fresh.length, skipped: invoices.length - fresh.length, importId: imp.id, entries };
  }

  // ---------- suppliers ----------
  function validVAT(v) { return /^3\d{13}3$/.test(String(v || '').replace(/\D/g, '')); }
  function saveSupplier(db, s) {
    if (s.id) { const i = db.suppliers.findIndex(x => x.id === s.id); db.suppliers[i] = { ...db.suppliers[i], ...s }; return db.suppliers[i]; }
    const n = { ...s, id: uid() }; db.suppliers.push(n); return n;
  }
  function supplierBalance(db, sid, asOf) {
    let bal = 0;
    for (const je of db.journal) { if (asOf && je.date > asOf) continue; for (const l of je.lines) if (l.supplier === sid && l.account === '2010') bal += l.credit - l.debit; }
    return r2(bal);
  }

  // ---------- supplier invoices ----------
  function createSupplierInvoice(db, inv) {
    const n = { id: uid(), status: 'draft', paid: 0, createdAt: new Date().toISOString(), ...inv, subtotal: r2(inv.subtotal), vat: r2(inv.vat), total: r2(inv.total) };
    db.supplierInvoices.push(n); return n;
  }
  function updateSupplierInvoice(db, id, patch) { const i = db.supplierInvoices.findIndex(x => x.id === id); if (i < 0) throw new Error('no invoice'); if (db.supplierInvoices[i].status !== 'draft') throw new Error('posted'); db.supplierInvoices[i] = { ...db.supplierInvoices[i], ...patch }; return db.supplierInvoices[i]; }
  function postSupplierInvoice(db, id, user) {
    const inv = db.supplierInvoices.find(x => x.id === id); if (!inv || inv.status !== 'draft') return inv;
    const lines = [{ account: inv.account || '5010', debit: inv.subtotal, branch: inv.branch }];
    if (inv.vat > 0) lines.push({ account: '1040', debit: inv.vat, branch: inv.branch });
    lines.push({ account: '2010', credit: inv.total, supplier: inv.supplierId, branch: inv.branch });
    const je = postJournal(db, { date: inv.date, memo: `__invoice__|${inv.no}|${inv.supplierId}`, source: { type: 'supplier_invoice', invoiceId: inv.id }, user, lines });
    inv.status = 'posted'; inv.journalId = je.id; inv.postedAt = new Date().toISOString(); inv.postedBy = user;
    return inv;
  }
  function recordPayment(db, p) {
    const inv = db.supplierInvoices.find(x => x.id === p.invoiceId); if (!inv || inv.status === 'draft') throw new Error('invoice not posted');
    const amount = r2(Math.min(p.amount, r2(inv.total - inv.paid)));
    const je = postJournal(db, { date: p.date, memo: `__payment__|${inv.no}|${inv.supplierId}`, source: { type: 'payment', invoiceId: inv.id }, user: p.user, lines: [
      { account: '2010', debit: amount, supplier: inv.supplierId, branch: inv.branch }, { account: p.from || '1020', credit: amount, branch: inv.branch },
    ] });
    const pay = { id: uid(), invoiceId: inv.id, supplierId: inv.supplierId, date: p.date, amount, from: p.from || '1020', journalId: je.id, user: p.user };
    db.payments.push(pay);
    inv.paid = r2(inv.paid + amount);
    return pay;
  }
  function invoiceStatus(inv, today) {
    today = today || todayISO();
    if (inv.status === 'draft') return 'draft';
    if (inv.paid >= inv.total - 0.005) return 'paid';
    if (inv.paid > 0) return inv.due && inv.due < today ? 'overdue' : 'partial';
    if (inv.due && inv.due < today) return 'overdue';
    return 'due';
  }

  // ---------- EOD ----------
  function expectedCash(db, date, branch) {
    let v = 0;
    for (const je of db.journal) { if (je.date !== date) continue; if (je.source.type !== 'sales_import' && je.source.type !== 'manual_sales') continue; for (const l of je.lines) if (l.account === '1010' && l.branch === branch) v += l.debit - l.credit; }
    return r2(v);
  }
  function daySales(db, date, branch) {
    const out = { total: 0, subtotal: 0, vat: 0, n: 0, byMethod: {} };
    for (const i of db.salesInvoices) { if (i.date !== date || (branch && i.branch !== branch)) continue; out.total = r2(out.total + i.total); out.subtotal = r2(out.subtotal + i.subtotal); out.vat = r2(out.vat + i.vat); out.n++; out.byMethod[i.method] = r2((out.byMethod[i.method] || 0) + i.total); }
    return out;
  }
  function closeDay(db, c) {
    if (db.eod.find(e => e.date === c.date && e.branch === c.branch && !e.reopened)) throw new Error('closed');
    const expected = expectedCash(db, c.date, c.branch);
    const diff = r2(c.counted - expected);
    let journalId = null;
    if (Math.abs(diff) >= 0.01) {
      const je = postJournal(db, { date: c.date, memo: `__eod__|${c.branch}|${diff > 0 ? 'over' : 'short'}`, source: { type: 'eod' }, user: c.user, lines: diff > 0
        ? [{ account: '1010', debit: diff, branch: c.branch }, { account: '6090', credit: diff, branch: c.branch }]
        : [{ account: '6090', debit: -diff, branch: c.branch }, { account: '1010', credit: -diff, branch: c.branch }] });
      journalId = je.id;
    }
    const rec = { id: uid(), date: c.date, branch: c.branch, expected, counted: r2(c.counted), diff, notes: c.notes || '', user: c.user, at: new Date().toISOString(), journalId, sales: daySales(db, c.date, c.branch) };
    db.eod.push(rec); return rec;
  }
  function reopenDay(db, id) { const e = db.eod.find(x => x.id === id); if (!e) return; e.reopened = true; if (e.journalId) db.journal = db.journal.filter(j => j.id !== e.journalId); }
  function isClosed(db, date, branch) { return !!db.eod.find(e => e.date === date && e.branch === branch && !e.reopened); }

  // ---------- reports ----------
  function accountBalance(db, code, asOf) { let v = 0; for (const je of db.journal) { if (asOf && je.date > asOf) continue; for (const l of je.lines) if (l.account === code) v += l.debit - l.credit; } return r2(v); }
  function trialBalance(db, from, to) {
    const rows = {};
    for (const a of db.accounts) rows[a.code] = { ...a, opening: 0, debit: 0, credit: 0 };
    for (const je of db.journal) for (const l of je.lines) {
      const r = rows[l.account]; if (!r) continue;
      if (je.date < from) r.opening += l.debit - l.credit;
      else if (je.date <= to) { r.debit += l.debit; r.credit += l.credit; }
    }
    const list = Object.values(rows).map(r => ({ ...r, opening: r2(r.opening), debit: r2(r.debit), credit: r2(r.credit), closing: r2(r.opening + r.debit - r.credit) })).filter(r => r.opening || r.debit || r.credit).sort((a, b) => a.code.localeCompare(b.code));
    const tot = list.reduce((t, r) => ({ openingDr: t.openingDr + (r.opening > 0 ? r.opening : 0), openingCr: t.openingCr + (r.opening < 0 ? -r.opening : 0), debit: t.debit + r.debit, credit: t.credit + r.credit, closingDr: t.closingDr + (r.closing > 0 ? r.closing : 0), closingCr: t.closingCr + (r.closing < 0 ? -r.closing : 0) }), { openingDr: 0, openingCr: 0, debit: 0, credit: 0, closingDr: 0, closingCr: 0 });
    for (const k in tot) tot[k] = r2(tot[k]);
    return { rows: list, totals: tot, balanced: Math.abs(tot.debit - tot.credit) < 0.01 && Math.abs(tot.closingDr - tot.closingCr) < 0.01 };
  }
  function statement(db, subject, from, to) {
    // subject: {type:'supplier', id} or {type:'account', code}
    const isSup = subject.type === 'supplier';
    const match = (l) => isSup ? (l.supplier === subject.id && l.account === '2010') : l.account === subject.code;
    const acct = isSup ? db.accounts.find(a => a.code === '2010') : db.accounts.find(a => a.code === subject.code);
    const creditNature = acct && (acct.type === 'liability' || acct.type === 'equity' || acct.type === 'revenue');
    const sign = creditNature ? -1 : 1; // running balance shown positive in the account's natural side
    let opening = 0; const lines = [];
    const sorted = [...db.journal].sort((a, b) => a.date.localeCompare(b.date) || a.no.localeCompare(b.no));
    for (const je of sorted) for (const l of je.lines) {
      if (!match(l)) continue;
      const delta = (l.debit - l.credit) * sign;
      if (je.date < from) opening += delta; else if (je.date <= to) lines.push({ date: je.date, no: je.no, memo: je.memo, source: je.source, debit: l.debit, credit: l.credit, delta });
    }
    let run = r2(opening);
    for (const l of lines) { run = r2(run + l.delta); l.balance = run; }
    return { opening: r2(opening), lines, closing: run, totalDebit: r2(lines.reduce((a, l) => a + l.debit, 0)), totalCredit: r2(lines.reduce((a, l) => a + l.credit, 0)), creditNature };
  }
  function pnl(db, from, to) {
    const rev = [], cogs = [], exp = [];
    for (const a of db.accounts) {
      if (a.type !== 'revenue' && a.type !== 'expense') continue;
      let v = 0; for (const je of db.journal) { if (je.date < from || je.date > to) continue; for (const l of je.lines) if (l.account === a.code) v += a.type === 'revenue' ? l.credit - l.debit : l.debit - l.credit; }
      v = r2(v); if (!v) continue;
      const row = { ...a, amount: v };
      if (a.type === 'revenue') rev.push(row); else if (a.group === 'cogs') cogs.push(row); else exp.push(row);
    }
    const sum = (x) => r2(x.reduce((a, r) => a + r.amount, 0));
    const R = sum(rev), C = sum(cogs), E = sum(exp);
    return { revenue: rev, cogs, expenses: exp, totalRevenue: R, totalCogs: C, grossProfit: r2(R - C), totalExpenses: E, net: r2(R - C - E) };
  }
  function vatReport(db, from, to) {
    let out = 0, inp = 0, taxableSales = 0, taxablePurch = 0;
    for (const je of db.journal) { if (je.date < from || je.date > to) continue; for (const l of je.lines) { if (l.account === '2040') out += l.credit - l.debit; if (l.account === '1040') inp += l.debit - l.credit; } }
    for (const i of db.salesInvoices) if (i.date >= from && i.date <= to) taxableSales += i.subtotal;
    for (const i of db.supplierInvoices) if (i.status === 'posted' && i.date >= from && i.date <= to) taxablePurch += i.subtotal;
    return { output: r2(out), input: r2(inp), net: r2(out - inp), taxableSales: r2(taxableSales), taxablePurchases: r2(taxablePurch) };
  }
  function salesReport(db, from, to) {
    const byBranch = {}, byMethod = {}, byDay = {};
    let total = 0, n = 0;
    for (const i of db.salesInvoices) { if (i.date < from || i.date > to) continue; total = r2(total + i.total); n++; byBranch[i.branch] = r2((byBranch[i.branch] || 0) + i.total); byMethod[i.method] = r2((byMethod[i.method] || 0) + i.total); byDay[i.date] = r2((byDay[i.date] || 0) + i.total); }
    return { total, n, avg: n ? r2(total / n) : 0, byBranch, byMethod, byDay };
  }
  function agedPayables(db, asOf) {
    asOf = asOf || todayISO();
    const bySup = {};
    for (const inv of db.supplierInvoices) {
      if (inv.status !== 'posted') continue; const open = r2(inv.total - inv.paid); if (open <= 0) continue;
      const age = daysBetween(inv.due || inv.date, asOf);
      const bucket = age <= 0 ? 'current' : age <= 30 ? 'd30' : age <= 60 ? 'd60' : age <= 90 ? 'd90' : 'd90p';
      const r = (bySup[inv.supplierId] ||= { supplierId: inv.supplierId, current: 0, d30: 0, d60: 0, d90: 0, d90p: 0, total: 0 });
      r[bucket] = r2(r[bucket] + open); r.total = r2(r.total + open);
    }
    const rows = Object.values(bySup).sort((a, b) => b.total - a.total);
    const totals = rows.reduce((t, r) => { for (const k of ['current', 'd30', 'd60', 'd90', 'd90p', 'total']) t[k] = r2(t[k] + r[k]); return t; }, { current: 0, d30: 0, d60: 0, d90: 0, d90p: 0, total: 0 });
    return { rows, totals };
  }

  // ---------- persistence ----------
  let db = null;
  const hasLS = typeof localStorage !== 'undefined';
  function load() {
    if (db) return db;
    if (hasLS) { try { const raw = localStorage.getItem(KEY); if (raw) { db = JSON.parse(raw); return db; } } catch (e) { /* fallthrough */ } }
    db = seed(); save(); return db;
  }
  function save() { if (hasLS && db) localStorage.setItem(KEY, JSON.stringify(db)); }
  function reset() { db = seed(); save(); return db; }
  function replace(obj) { db = obj; save(); return db; }

  root.Store = { VAT_RATE, ACCOUNTS, METHOD_ACCOUNT, uid, r2, todayISO, addDays, daysBetween, seed, load, save, reset, replace, get db() { return load(); },
    postJournal, postSalesBatch, validVAT, saveSupplier, supplierBalance, createSupplierInvoice, updateSupplierInvoice, postSupplierInvoice, recordPayment, invoiceStatus,
    expectedCash, daySales, closeDay, reopenDay, isClosed, accountBalance, trialBalance, statement, pnl, vatReport, salesReport, agedPayables };
})(typeof window !== 'undefined' ? window : globalThis);
