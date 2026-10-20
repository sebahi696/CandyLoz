/* Daftar v2 — multi-tenant store + double-entry ledger engine (pure JS, testable in Node) */
(function (root) {
  const VAT_RATE = 0.15;
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const pad2 = (n) => String(n).padStart(2, '0');
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
  const utc = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const addDays = (iso, n) => new Date(utc(iso) + n * 86400000).toISOString().slice(0, 10);
  const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);
  const monthEnd = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };
  const addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
  const monthsBetween = (a, b) => { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };
  const err = (code, detail) => { const e = new Error(code + (detail ? ': ' + detail : '')); e.code = code; e.detail = detail; return e; };
  const bi = (ar, en) => ({ ar, en });

  // ---------------------------------------------------------------- platform catalog
  const FEATURES = [
    { key: 'pos_import', group: 'sales', ar: 'استيراد مبيعات نقاط البيع', en: 'POS sales import' },
    { key: 'manual_sales', group: 'sales', ar: 'إدخال المبيعات اليدوي', en: 'Manual daily sales' },
    { key: 'eod', group: 'sales', ar: 'إقفال اليوم والصندوق', en: 'End-of-day cash close' },
    { key: 'customers', group: 'sales', ar: 'العملاء والمبيعات الآجلة', en: 'Customers & credit sales' },
    { key: 'suppliers', group: 'purchases', ar: 'الموردون', en: 'Suppliers' },
    { key: 'purchases', group: 'purchases', ar: 'فواتير المشتريات', en: 'Purchase invoices' },
    { key: 'ocr', group: 'purchases', ar: 'قراءة الفواتير بالكاميرا', en: 'Invoice photo reading' },
    { key: 'expenses', group: 'purchases', ar: 'المصروفات', en: 'Expenses' },
    { key: 'coa_edit', group: 'accounting', ar: 'تعديل شجرة الحسابات', en: 'Edit chart of accounts' },
    { key: 'journal', group: 'accounting', ar: 'القيود اليومية اليدوية', en: 'Manual journal entries' },
    { key: 'receipts', group: 'accounting', ar: 'سندات القبض', en: 'Receipt vouchers' },
    { key: 'payments', group: 'accounting', ar: 'سندات الصرف', en: 'Payment vouchers' },
    { key: 'transfers', group: 'accounting', ar: 'سندات التحويل والإيداع', en: 'Transfer & deposit vouchers' },
    { key: 'assets', group: 'accounting', ar: 'الأصول الثابتة والإهلاك', en: 'Fixed assets & depreciation' },
    { key: 'paymethods', group: 'accounting', ar: 'طرق الدفع', en: 'Payment methods' },
    { key: 'period_lock', group: 'accounting', ar: 'إقفال الفترات والسنة المالية', en: 'Period lock & year-end close' },
    { key: 'zakat', group: 'accounting', ar: 'الزكاة', en: 'Zakat' },
    { key: 'rep_tb', group: 'reports', ar: 'ميزان المراجعة', en: 'Trial balance' },
    { key: 'rep_statement', group: 'reports', ar: 'كشف الحساب', en: 'Account statement' },
    { key: 'rep_is', group: 'reports', ar: 'قائمة الدخل', en: 'Income statement' },
    { key: 'rep_bs', group: 'reports', ar: 'قائمة المركز المالي', en: 'Balance sheet' },
    { key: 'rep_cf', group: 'reports', ar: 'قائمة التدفقات النقدية', en: 'Cash flow statement' },
    { key: 'rep_vat', group: 'reports', ar: 'إقرار ضريبة القيمة المضافة', en: 'VAT return' },
    { key: 'rep_sales', group: 'reports', ar: 'تقرير المبيعات', en: 'Sales report' },
    { key: 'rep_supbal', group: 'reports', ar: 'أرصدة الموردين', en: 'Supplier balances' },
    { key: 'rep_custbal', group: 'reports', ar: 'أرصدة العملاء', en: 'Customer balances' },
    { key: 'rep_cash', group: 'reports', ar: 'أرصدة النقدية وشبه النقدية', en: 'Cash & equivalents balances' },
    { key: 'rep_exp', group: 'reports', ar: 'تقرير المصروفات', en: 'Expenses report' },
    { key: 'rep_aged', group: 'reports', ar: 'أعمار ذمم الموردين', en: 'Aged payables' },
    { key: 'rep_journal', group: 'reports', ar: 'دفتر اليومية', en: 'General journal' },
    { key: 'multi_branch', group: 'platform', ar: 'تعدد الفروع', en: 'Multiple branches' },
    { key: 'english', group: 'platform', ar: 'الواجهة الإنجليزية', en: 'English interface' },
    { key: 'backup', group: 'platform', ar: 'النسخ الاحتياطي والاستعادة', en: 'Backup & restore' },
  ];
  const allFeatures = () => Object.fromEntries(FEATURES.map(f => [f.key, true]));

  const PERMS = [
    { key: 'dashboard', ar: 'لوحة اليوم', en: 'Today dashboard' },
    { key: 'import_sales', f: 'pos_import', ar: 'استيراد المبيعات', en: 'Import sales' },
    { key: 'manual_sales', f: 'manual_sales', ar: 'إدخال المبيعات يدوياً', en: 'Enter sales manually' },
    { key: 'eod_close', f: 'eod', ar: 'إقفال اليوم', en: 'Close the day' },
    { key: 'eod_reopen', f: 'eod', ar: 'إعادة فتح يوم مقفل', en: 'Reopen a closed day' },
    { key: 'customers', f: 'customers', ar: 'إدارة العملاء والفواتير الآجلة', en: 'Manage customers & credit invoices' },
    { key: 'suppliers', f: 'suppliers', ar: 'إدارة الموردين', en: 'Manage suppliers' },
    { key: 'purchases', f: 'purchases', ar: 'إدخال فواتير الموردين', en: 'Enter supplier invoices' },
    { key: 'purchases_post', f: 'purchases', ar: 'ترحيل فواتير الموردين', en: 'Post supplier invoices' },
    { key: 'expenses', f: 'expenses', ar: 'تسجيل المصروفات', en: 'Record expenses' },
    { key: 'vouchers', ar: 'سندات القبض والصرف والتحويل', en: 'Receipt, payment & transfer vouchers' },
    { key: 'journal_view', ar: 'عرض القيود اليومية', en: 'View journal entries' },
    { key: 'journal', f: 'journal', ar: 'إنشاء قيود يدوية', en: 'Create manual entries' },
    { key: 'journal_reverse', ar: 'عكس القيود', en: 'Reverse entries' },
    { key: 'coa_view', ar: 'عرض شجرة الحسابات', en: 'View chart of accounts' },
    { key: 'coa_manage', f: 'coa_edit', ar: 'تعديل شجرة الحسابات', en: 'Edit chart of accounts' },
    { key: 'assets', f: 'assets', ar: 'الأصول الثابتة', en: 'Fixed assets' },
    { key: 'paymethods', f: 'paymethods', ar: 'طرق الدفع', en: 'Payment methods' },
    { key: 'reports', ar: 'التقارير والقوائم المالية', en: 'Reports & financial statements' },
    { key: 'settings', ar: 'الإعدادات المحاسبية والفروع', en: 'Accounting settings & branches' },
    { key: 'users', ar: 'المستخدمون والصلاحيات', en: 'Users & permissions' },
  ];
  const ROLE_DEFAULTS = {
    operator: ['dashboard', 'import_sales', 'manual_sales', 'eod_close', 'suppliers', 'purchases', 'expenses'],
    accountant: PERMS.map(p => p.key).filter(k => !['settings', 'users'].includes(k)),
    admin: PERMS.map(p => p.key),
  };

  // ---------------------------------------------------------------- chart of accounts (Candy Loz, confectionery retail)
  // flags: g=group (non-postable), c=contra, s=sub-ledger group (3-digit children)
  const COA_CANDY = [
    ['1', 'الأصول', 'Assets', { g: 1 }],
    ['11', 'الأصول المتداولة', 'Current assets', { g: 1 }],
    ['1101', 'النقدية وما في حكمها', 'Cash & cash equivalents', { g: 1 }],
    ['110101', 'صناديق الفروع', 'Branch cash boxes', { g: 1 }],
    ['110102', 'البنوك', 'Banks', { g: 1 }],
    ['11010201', 'البنك الأهلي السعودي — جاري', 'SNB — current account'],
    ['11010202', 'مصرف الراجحي — جاري', 'Al Rajhi — current account'],
    ['110103', 'بوابات الدفع ومستحقات الشبكات', 'Payment gateways & card receivables', { g: 1 }],
    ['11010301', 'مستحقات مدى', 'mada receivable'],
    ['11010302', 'مستحقات فيزا وماستركارد', 'Visa/Mastercard receivable'],
    ['11010303', 'مستحقات تابي', 'Tabby receivable'],
    ['11010304', 'مستحقات تمارا', 'Tamara receivable'],
    ['11010305', 'مستحقات مدفوعات سلة', 'Salla Payments receivable'],
    ['110104', 'العهد النقدية', 'Petty cash', { g: 1 }],
    ['11010401', 'عهدة المشتريات', 'Purchasing petty cash'],
    ['1102', 'الذمم المدينة', 'Receivables', { g: 1 }],
    ['110201', 'العملاء', 'Customers', { g: 1, s: 1 }],
    ['110202', 'سلف الموظفين', 'Employee advances'],
    ['1103', 'المخزون', 'Inventory', { g: 1 }],
    ['110301', 'مخزون الشوكولاتة', 'Inventory — chocolate'],
    ['110302', 'مخزون الحلويات والسكاكر', 'Inventory — sweets & candy'],
    ['110303', 'مخزون الجيلي الإسباني', 'Inventory — Spanish jelly'],
    ['110304', 'مخزون السناكات اليابانية والآسيوية', 'Inventory — Japanese & Asian snacks'],
    ['110305', 'مخزون المكسرات والمجففات', 'Inventory — nuts & freeze-dried'],
    ['110306', 'مخزون المشروبات', 'Inventory — drinks'],
    ['110307', 'مخزون مواد التغليف', 'Inventory — packaging'],
    ['1104', 'مصروفات مدفوعة مقدماً', 'Prepaid expenses', { g: 1 }],
    ['110401', 'إيجار مدفوع مقدماً', 'Prepaid rent'],
    ['110402', 'تأمين طبي مدفوع مقدماً', 'Prepaid medical insurance'],
    ['1105', 'أرصدة مدينة أخرى', 'Other debit balances', { g: 1 }],
    ['110501', 'ضريبة القيمة المضافة — مدخلات', 'VAT input'],
    ['110502', 'تأمينات مستردة', 'Refundable deposits'],
    ['12', 'الأصول غير المتداولة', 'Non-current assets', { g: 1 }],
    ['1201', 'الأصول الثابتة بالتكلفة', 'Fixed assets at cost', { g: 1 }],
    ['120101', 'الأثاث والديكورات', 'Furniture & shop fit-out'],
    ['120102', 'الثلاجات ومعدات العرض', 'Refrigeration & display units'],
    ['120103', 'أجهزة نقاط البيع والحاسب', 'POS & computer equipment'],
    ['120104', 'السيارات', 'Vehicles'],
    ['1202', 'مجمع الإهلاك', 'Accumulated depreciation', { g: 1, c: 1 }],
    ['120201', 'مجمع إهلاك الأثاث والديكورات', 'Acc. dep. — furniture & fit-out', { c: 1 }],
    ['120202', 'مجمع إهلاك الثلاجات ومعدات العرض', 'Acc. dep. — refrigeration & display', { c: 1 }],
    ['120203', 'مجمع إهلاك أجهزة الحاسب', 'Acc. dep. — POS & computers', { c: 1 }],
    ['120204', 'مجمع إهلاك السيارات', 'Acc. dep. — vehicles', { c: 1 }],
    ['2', 'الالتزامات', 'Liabilities', { g: 1 }],
    ['21', 'الالتزامات المتداولة', 'Current liabilities', { g: 1 }],
    ['2101', 'الموردون', 'Suppliers', { g: 1, s: 1 }],
    ['2102', 'مصروفات مستحقة', 'Accrued expenses', { g: 1 }],
    ['210201', 'رواتب مستحقة', 'Accrued salaries'],
    ['210202', 'إيجارات مستحقة', 'Accrued rent'],
    ['210203', 'مصروفات مستحقة أخرى', 'Other accrued expenses'],
    ['2103', 'ضريبة القيمة المضافة', 'VAT', { g: 1 }],
    ['210301', 'ضريبة القيمة المضافة — مخرجات', 'VAT output'],
    ['210302', 'ضريبة القيمة المضافة — مستحقة للهيئة', 'VAT payable to ZATCA'],
    ['2104', 'الزكاة المستحقة', 'Zakat payable'],
    ['2105', 'بطاقات الهدايا والعربون', 'Gift cards & customer deposits'],
    ['22', 'الالتزامات غير المتداولة', 'Non-current liabilities', { g: 1 }],
    ['2201', 'مخصص مكافأة نهاية الخدمة', 'End-of-service provision'],
    ['2202', 'قروض طويلة الأجل', 'Long-term loans'],
    ['3', 'حقوق الملكية', 'Equity', { g: 1 }],
    ['31', 'رأس المال', 'Capital'],
    ['32', 'جاري المالك', 'Owner current account'],
    ['33', 'الأرباح المبقاة', 'Retained earnings'],
    ['34', 'الاحتياطي النظامي', 'Statutory reserve'],
    ['4', 'الإيرادات', 'Revenue', { g: 1 }],
    ['41', 'إيرادات المبيعات', 'Sales revenue', { g: 1 }],
    ['4101', 'مبيعات الفروع', 'Branch sales', { g: 1 }],
    ['4102', 'مبيعات المتجر الإلكتروني (سلة)', 'Online store sales (Salla)'],
    ['4103', 'مبيعات الجملة والشركات', 'Wholesale & corporate sales'],
    ['4104', 'مردودات المبيعات', 'Sales returns', { c: 1 }],
    ['4105', 'خصومات مسموح بها', 'Sales discounts', { c: 1 }],
    ['42', 'إيرادات أخرى', 'Other income', { g: 1 }],
    ['4201', 'إيرادات رسوم الشحن', 'Shipping fee income'],
    ['4202', 'خصم مكتسب', 'Discounts received'],
    ['4203', 'أرباح وخسائر بيع أصول', 'Gain/loss on asset disposal'],
    ['5', 'تكلفة المبيعات', 'Cost of sales', { g: 1 }],
    ['51', 'تكلفة البضاعة المباعة', 'Cost of goods sold', { g: 1 }],
    ['5101', 'مشتريات البضاعة', 'Purchases — goods for resale'],
    ['5102', 'الشحن والجمارك على المشتريات', 'Freight & customs on purchases'],
    ['5103', 'مردودات ومسموحات المشتريات', 'Purchase returns & allowances', { c: 1 }],
    ['5104', 'تالف وبضاعة منتهية الصلاحية', 'Spoilage & expired goods'],
    ['5105', 'تكلفة المبيعات (جرد مستمر)', 'Cost of sales (perpetual)'],
    ['6', 'المصروفات', 'Expenses', { g: 1 }],
    ['61', 'مصروفات البيع والتسويق', 'Selling & marketing', { g: 1 }],
    ['6101', 'عمولات بوابات الدفع', 'Payment gateway fees'],
    ['6102', 'عمولات منصة سلة', 'Salla platform fees'],
    ['6103', 'التسويق والإعلان', 'Marketing & advertising'],
    ['6104', 'مواد التغليف وعلب الهدايا', 'Packaging & gift boxes'],
    ['6105', 'مصاريف التوصيل للعملاء', 'Customer delivery costs'],
    ['62', 'المصروفات العمومية والإدارية', 'General & administrative', { g: 1 }],
    ['6201', 'الرواتب والأجور', 'Salaries & wages'],
    ['6202', 'التأمينات الاجتماعية', 'GOSI'],
    ['6203', 'إيجار الفروع', 'Branch rent'],
    ['6204', 'الكهرباء والمياه', 'Electricity & water'],
    ['6205', 'الاتصالات والإنترنت', 'Telecom & internet'],
    ['6206', 'الرسوم الحكومية والإقامات', 'Government fees & iqamas'],
    ['6207', 'الصيانة', 'Maintenance'],
    ['6208', 'مصروف الإهلاك', 'Depreciation expense'],
    ['6209', 'التأمين الطبي', 'Medical insurance'],
    ['6210', 'الاشتراكات والبرامج', 'Subscriptions & software'],
    ['6211', 'مصروفات متنوعة', 'Miscellaneous'],
    ['63', 'مصروفات أخرى', 'Other expenses', { g: 1 }],
    ['6301', 'عجز وزيادة الصندوق', 'Cash over/short'],
    ['6302', 'العمولات البنكية', 'Bank charges'],
    ['6303', 'الديون المعدومة', 'Bad debts'],
    ['6304', 'الزكاة', 'Zakat expense'],
  ];
  const TYPE_BY_ROOT = { 1: 'asset', 2: 'liability', 3: 'equity', 4: 'revenue', 5: 'cogs', 6: 'expense' };
  const natureOf = (type) => (type === 'asset' || type === 'cogs' || type === 'expense') ? 'debit' : 'credit';
  const DEFAULT_SYS = {
    bank: '11010201', vatIn: '110501', vatOut: '210301', vatPayable: '210302', apGroup: '2101', arGroup: '110201',
    cashGroup: '110101', salesGroup: '4101', salesOnline: '4102', salesCorporate: '4103', salesReturns: '4104',
    purchases: '5101', freight: '5102', cashOverShort: '6301', depExpense: '6208', gatewayFees: '6101', bankCharges: '6302',
    retained: '33', capital: '31', zakatExpense: '6304', zakatPayable: '2104', cashByBranch: {}, salesByBranch: {},
  };
  const DEFAULT_PAYMETHODS = [
    { key: 'cash', ar: 'نقدي', en: 'Cash', type: 'cash', account: '@branch_cash', active: true },
    { key: 'mada', ar: 'مدى', en: 'mada', type: 'card', account: '11010301', active: true },
    { key: 'visa', ar: 'فيزا/ماستركارد', en: 'Visa/Mastercard', type: 'card', account: '11010302', active: true },
    { key: 'tabby', ar: 'تابي', en: 'Tabby', type: 'bnpl', account: '11010303', active: true },
    { key: 'tamara', ar: 'تمارا', en: 'Tamara', type: 'bnpl', account: '11010304', active: true },
    { key: 'transfer', ar: 'تحويل بنكي', en: 'Bank transfer', type: 'bank', account: '11010201', active: true },
    { key: 'salla', ar: 'مدفوعات سلة', en: 'Salla Payments', type: 'online', account: '11010305', active: true },
  ];

  function buildAccounts(template) {
    const codes = template.map(x => x[0]);
    return template.map(([code, ar, en, f = {}]) => {
      const parent = codes.filter(c => c !== code && code.startsWith(c)).sort((a, b) => b.length - a.length)[0] || null;
      return { code, parent, ar, en, type: TYPE_BY_ROOT[code[0]], group: !!f.g, contra: !!f.c, sub: !!f.s, active: true, system: true };
    });
  }

  // ---------------------------------------------------------------- account helpers
  const acc = (db, code) => db.accounts.find(a => a.code === code);
  const childrenOf = (db, code) => db.accounts.filter(a => a.parent === code);
  function levelOf(db, code) { let l = 1, a = acc(db, code); while (a && a.parent) { l++; a = acc(db, a.parent); } return l; }
  function descendantLeaves(db, code) {
    const out = []; const stack = [code];
    while (stack.length) { const c = stack.pop(); const a = acc(db, c); if (!a) continue; const kids = childrenOf(db, c); if (!a.group) out.push(c); for (const k of kids) stack.push(k.code); }
    return out;
  }
  function isUnder(db, code, ancestor) { let a = acc(db, code); while (a) { if (a.code === ancestor) return true; a = a.parent ? acc(db, a.parent) : null; } return false; }
  function nextCode(db, parentCode) {
    const p = acc(db, parentCode); if (!p) throw err('no_account', parentCode);
    const digits = p.code.length === 1 ? 1 : (p.sub ? 3 : 2);
    const kids = childrenOf(db, parentCode).map(k => k.code).filter(c => c.length === p.code.length + digits);
    const max = kids.reduce((m, c) => Math.max(m, parseInt(c.slice(p.code.length), 10) || 0), 0);
    const next = max + 1; if (String(next).length > digits) throw err('code_overflow', parentCode);
    return p.code + String(next).padStart(digits, '0');
  }
  const hasPostings = (db, code) => db.journal.some(j => j.lines.some(l => l.account === code));
  function addAccount(db, { parent, ar, en, code, party, branch }) {
    const p = acc(db, parent); if (!p) throw err('no_account', parent);
    if (!p.group) { if (hasPostings(db, p.code)) throw err('parent_has_postings', p.code); p.group = true; }
    const c = code || nextCode(db, parent); if (acc(db, c)) throw err('code_exists', c);
    const a = { code: c, parent, ar: ar.trim(), en: (en || ar).trim(), type: p.type, group: false, contra: p.contra, sub: false, active: true, system: false, party: party || null, branch: branch || null };
    db.accounts.push(a); db.accounts.sort((x, y) => x.code.localeCompare(y.code)); return a;
  }
  function updateAccount(db, code, patch) { const a = acc(db, code); if (!a) throw err('no_account', code); Object.assign(a, { ar: patch.ar ?? a.ar, en: patch.en ?? a.en, active: patch.active ?? a.active }); return a; }
  function sysCodes(db) { const s = db.sys; const out = new Set(); for (const [k, v] of Object.entries(s)) { if (typeof v === 'string') out.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(x => out.add(x)); } for (const pm of db.paymentMethods) if (pm.account && pm.account[0] !== '@') out.add(pm.account); return out; }
  function canDeleteAccount(db, code) { const a = acc(db, code); if (!a) return 'no_account'; if (childrenOf(db, code).length) return 'has_children'; if (hasPostings(db, code)) return 'has_postings'; if (sysCodes(db).has(code) || a.parent === null) return 'system_account'; if (a.party) return 'party_account'; return null; }
  function deleteAccount(db, code) { const why = canDeleteAccount(db, code); if (why) throw err(why, code); db.accounts = db.accounts.filter(a => a.code !== code); }

  // ---------------------------------------------------------------- branches
  function addBranch(db, b) {
    const id = b.id || 'b' + uid().slice(0, 5);
    const br = { id, ar: b.ar, en: b.en || b.ar, code: (b.code || '').toUpperCase(), city: b.city || '', active: true };
    db.branches.push(br);
    const cash = addAccount(db, { parent: db.sys.cashGroup, ar: 'صندوق ' + br.ar, en: br.en + ' cash box', branch: id });
    const sales = addAccount(db, { parent: db.sys.salesGroup, ar: 'مبيعات ' + br.ar, en: 'Sales — ' + br.en, branch: id });
    cash.system = sales.system = true;
    db.sys.cashByBranch[id] = cash.code; db.sys.salesByBranch[id] = sales.code;
    return br;
  }
  const branchCash = (db, b) => db.sys.cashByBranch[b] || db.sys.cashByBranch[Object.keys(db.sys.cashByBranch)[0]];
  const branchSales = (db, b) => db.sys.salesByBranch[b] || db.sys.salesByBranch[Object.keys(db.sys.salesByBranch)[0]];
  function methodAccount(db, key, branch) { const pm = db.paymentMethods.find(p => p.key === key) || db.paymentMethods[0]; return pm.account === '@branch_cash' ? branchCash(db, branch) : pm.account; }

  // ---------------------------------------------------------------- journal
  function postEntry(db, e) {
    const lines = e.lines.map(l => ({ account: l.account, debit: r2(l.debit), credit: r2(l.credit), branch: l.branch || e.branch || null, note: l.note || '' })).filter(l => l.debit || l.credit);
    if (lines.length < 2) throw err('min_lines');
    for (const l of lines) { const a = acc(db, l.account); if (!a) throw err('no_account', l.account); if (a.group) throw err('group_account', a.code); if (l.debit < 0 || l.credit < 0) throw err('negative'); }
    const dr = r2(lines.reduce((s, l) => s + l.debit, 0)), cr = r2(lines.reduce((s, l) => s + l.credit, 0));
    if (Math.abs(dr - cr) > 0.005) throw err('unbalanced', `${dr} ≠ ${cr}`);
    if (!e.force && db.settings.lockDate && e.date <= db.settings.lockDate) throw err('period_locked', db.settings.lockDate);
    const y = e.date.slice(0, 4); db.seq.je[y] = (db.seq.je[y] || 0) + 1;
    const entry = { id: uid(), no: y + String(db.seq.je[y]).padStart(6, '0'), date: e.date, branch: e.branch || null, type: e.type || 'manual', memo: e.memo || '', ref: e.ref || '', lines, source: e.source || null, user: e.user || null, createdAt: new Date().toISOString(), total: dr };
    db.journal.push(entry); return entry;
  }
  function reverseEntry(db, id, { date, user } = {}) {
    const j = db.journal.find(x => x.id === id); if (!j) throw err('no_entry'); if (j.reversedBy) throw err('already_reversed');
    const rev = postEntry(db, { date: date || j.date, branch: j.branch, type: 'reversal', memo: bi('عكس القيد ' + j.no, 'Reversal of ' + j.no), ref: j.no, user, source: { reversalOf: j.id }, lines: j.lines.map(l => ({ ...l, debit: l.credit, credit: l.debit })) });
    j.reversedBy = rev.id; return rev;
  }
  const nextVoucherNo = (db, kind, prefix) => { db.seq.v[kind] = (db.seq.v[kind] || 0) + 1; return prefix + '-' + String(db.seq.v[kind]).padStart(5, '0'); };

  // ---------------------------------------------------------------- sales
  function postSalesBatch(db, invoices, meta = {}) {
    const existing = new Set(db.salesInvoices.map(i => i.no));
    const fresh = invoices.filter(i => !existing.has(i.no));
    if (!fresh.length) return { posted: 0, skipped: invoices.length };
    const imp = { id: uid(), at: meta.at || new Date().toISOString(), file: meta.file || null, source: meta.source || 'manual', user: meta.user || null, count: fresh.length, total: r2(fresh.reduce((a, i) => a + i.total, 0)), dates: [...new Set(fresh.map(i => i.date))].sort() };
    db.imports.push(imp);
    for (const i of fresh) db.salesInvoices.push({ ...i, importId: imp.id });
    const groups = {};
    for (const i of fresh) { const k = `${i.date}|${i.branch}|${i.method}`; const g = (groups[k] ||= { date: i.date, branch: i.branch, method: i.method, subtotal: 0, vat: 0, total: 0, n: 0 }); g.subtotal += i.subtotal; g.vat += i.vat; g.total += i.total; g.n++; }
    const entries = [];
    for (const g of Object.values(groups)) {
      const br = db.branches.find(b => b.id === g.branch) || {}; const pm = db.paymentMethods.find(p => p.key === g.method) || {};
      entries.push(postEntry(db, { date: g.date, branch: g.branch, type: 'sales', user: meta.user, ref: imp.file || '', source: { importId: imp.id, method: g.method, n: g.n },
        memo: bi(`مبيعات ${br.ar || ''} — ${pm.ar || g.method} (${g.n} فاتورة)`, `Sales ${br.en || ''} — ${pm.en || g.method} (${g.n} invoices)`),
        lines: [{ account: methodAccount(db, g.method, g.branch), debit: r2(g.total) }, { account: branchSales(db, g.branch), credit: r2(g.subtotal) }, { account: db.sys.vatOut, credit: r2(g.total - r2(g.subtotal)) }] }));
    }
    return { posted: fresh.length, skipped: invoices.length - fresh.length, importId: imp.id, entries };
  }
  function daySales(db, date, branch) {
    const out = { total: 0, subtotal: 0, vat: 0, n: 0, byMethod: {} };
    for (const i of db.salesInvoices) { if (i.date !== date || (branch && i.branch !== branch)) continue; out.total += i.total; out.subtotal += i.subtotal; out.vat += i.vat; out.n++; out.byMethod[i.method] = r2((out.byMethod[i.method] || 0) + i.total); }
    out.total = r2(out.total); out.subtotal = r2(out.subtotal); out.vat = r2(out.vat); return out;
  }

  // ---------------------------------------------------------------- parties
  const validVAT = (v) => /^3\d{13}3$/.test(String(v || '').replace(/\D/g, ''));
  function saveParty(db, kind, p) {
    const list = kind === 'supplier' ? db.suppliers : db.customers;
    const group = kind === 'supplier' ? db.sys.apGroup : db.sys.arGroup;
    if (p.id) { const cur = list.find(x => x.id === p.id); Object.assign(cur, p); if (cur.account) updateAccount(db, cur.account, { ar: cur.name, en: cur.nameEn || cur.name }); return cur; }
    const a = addAccount(db, { parent: group, ar: p.name, en: p.nameEn || p.name, party: kind });
    const n = { ...p, id: uid(), account: a.code, createdAt: new Date().toISOString() }; list.push(n); return n;
  }
  const saveSupplier = (db, s) => saveParty(db, 'supplier', s);
  const saveCustomer = (db, c) => saveParty(db, 'customer', c);
  function accountBalance(db, code, { from, to, branch, excludeTypes } = {}) {
    const leaves = new Set(descendantLeaves(db, code)); let v = 0;
    for (const j of db.journal) { if ((from && j.date < from) || (to && j.date > to)) continue; if (excludeTypes && excludeTypes.includes(j.type)) continue; for (const l of j.lines) if (leaves.has(l.account) && (!branch || l.branch === branch)) v += l.debit - l.credit; }
    return r2(v);
  }
  const supplierBalance = (db, sid, asOf) => { const s = db.suppliers.find(x => x.id === sid); return s ? -accountBalance(db, s.account, { to: asOf }) : 0; };
  const customerBalance = (db, cid, asOf) => { const c = db.customers.find(x => x.id === cid); return c ? accountBalance(db, c.account, { to: asOf }) : 0; };

  // ---------------------------------------------------------------- purchase invoices
  function createSupplierInvoice(db, inv) {
    const n = { id: uid(), docNo: nextVoucherNo(db, 'pi', 'PI'), status: 'draft', paid: 0, createdAt: new Date().toISOString(), account: db.sys.purchases, ...inv, subtotal: r2(inv.subtotal), vat: r2(inv.vat), total: r2(inv.total) };
    db.supplierInvoices.push(n); return n;
  }
  function postSupplierInvoice(db, id, user) {
    const inv = db.supplierInvoices.find(x => x.id === id); if (!inv || inv.status !== 'draft') return inv;
    const sup = db.suppliers.find(s => s.id === inv.supplierId); if (!sup) throw err('no_supplier');
    const lines = [{ account: inv.account || db.sys.purchases, debit: inv.subtotal }];
    if (inv.vat > 0) lines.push({ account: db.sys.vatIn, debit: inv.vat });
    lines.push({ account: sup.account, credit: inv.total });
    const je = postEntry(db, { date: inv.date, branch: inv.branch, type: 'purchase', user, ref: inv.no, source: { invoiceId: inv.id }, memo: bi(`فاتورة مشتريات ${inv.no} — ${sup.name}`, `Purchase invoice ${inv.no} — ${sup.nameEn || sup.name}`), lines });
    inv.status = 'posted'; inv.journalId = je.id; inv.postedAt = new Date().toISOString(); inv.postedBy = user; return inv;
  }
  function invoiceStatus(inv, today) {
    today = today || todayISO();
    if (inv.status === 'draft') return 'draft';
    if (inv.paid >= inv.total - 0.005) return 'paid';
    if (inv.due && inv.due < today) return 'overdue';
    return inv.paid > 0 ? 'partial' : 'due';
  }

  // ---------------------------------------------------------------- vouchers (receipt / payment / transfer)
  // receipt:  Dr `to` (cash/bank)          Cr `from` (customer / any)
  // payment:  Dr `to` (supplier / expense)  Cr `from` (cash/bank)
  // transfer: Dr `to` (cash/bank)          Cr `from` (cash/bank/gateway), optional fee → Dr fee account
  function createVoucher(db, v) {
    const prefix = { receipt: 'RV', payment: 'PV', transfer: 'TV' }[v.kind]; if (!prefix) throw err('bad_kind');
    const amount = r2(v.amount); if (!(amount > 0)) throw err('amount');
    const fee = r2(v.fee || 0);
    const no = nextVoucherNo(db, v.kind, prefix);
    const nameOf = (c) => { const a = acc(db, c); return a ? a : { ar: c, en: c }; };
    const memo = v.memo || (v.kind === 'receipt' ? bi(`سند قبض ${no} من ${nameOf(v.from).ar}`, `Receipt ${no} from ${nameOf(v.from).en}`)
      : v.kind === 'payment' ? bi(`سند صرف ${no} إلى ${nameOf(v.to).ar}`, `Payment ${no} to ${nameOf(v.to).en}`)
        : bi(`سند تحويل ${no} من ${nameOf(v.from).ar} إلى ${nameOf(v.to).ar}`, `Transfer ${no}: ${nameOf(v.from).en} → ${nameOf(v.to).en}`));
    const lines = v.kind === 'transfer'
      ? [{ account: v.to, debit: r2(amount - fee) }, ...(fee ? [{ account: v.feeAccount || db.sys.bankCharges, debit: fee }] : []), { account: v.from, credit: amount }]
      : [{ account: v.to, debit: amount }, { account: v.from, credit: amount }];
    const je = postEntry(db, { date: v.date, branch: v.branch, type: v.kind, user: v.user, ref: no, memo, lines, source: { voucher: no, invoiceId: v.invoiceId || null } });
    const rec = { id: uid(), no, kind: v.kind, date: v.date, branch: v.branch || null, amount, fee, from: v.from, to: v.to, party: v.party || '', method: v.method || '', notes: v.notes || '', approvedBy: v.approvedBy || '', invoiceId: v.invoiceId || null, journalId: je.id, user: v.user || null, createdAt: new Date().toISOString() };
    db.vouchers.push(rec);
    if (v.invoiceId) { const inv = db.supplierInvoices.find(i => i.id === v.invoiceId) || db.customerInvoices.find(i => i.id === v.invoiceId); if (inv) inv.paid = r2((inv.paid || 0) + amount); }
    return rec;
  }
  function paySupplierInvoice(db, { invoiceId, amount, date, from, user, branch }) {
    const inv = db.supplierInvoices.find(x => x.id === invoiceId); if (!inv || inv.status === 'draft') throw err('not_posted');
    const sup = db.suppliers.find(s => s.id === inv.supplierId);
    const amt = r2(Math.min(amount, inv.total - inv.paid));
    return createVoucher(db, { kind: 'payment', date, branch: branch || inv.branch, amount: amt, from: from || db.sys.bank, to: sup.account, party: sup.name, invoiceId, user, notes: inv.no });
  }

  // ---------------------------------------------------------------- customer (credit) invoices
  function createCustomerInvoice(db, ci) {
    const cust = db.customers.find(c => c.id === ci.customerId); if (!cust) throw err('no_customer');
    const total = r2(ci.total), subtotal = r2(ci.subtotal ?? total / (1 + VAT_RATE)), vat = r2(total - subtotal);
    const no = ci.no || nextVoucherNo(db, 'si', 'SI');
    const je = postEntry(db, { date: ci.date, branch: ci.branch, type: 'credit_sale', user: ci.user, ref: no, memo: bi(`فاتورة بيع آجل ${no} — ${cust.name}`, `Credit invoice ${no} — ${cust.nameEn || cust.name}`),
      lines: [{ account: cust.account, debit: total }, { account: ci.account || db.sys.salesCorporate, credit: subtotal }, { account: db.sys.vatOut, credit: vat }] });
    const rec = { id: uid(), no, customerId: cust.id, date: ci.date, due: ci.due || addDays(ci.date, cust.terms || 30), branch: ci.branch, subtotal, vat, total, paid: 0, notes: ci.notes || '', journalId: je.id };
    db.customerInvoices.push(rec); return rec;
  }

  // ---------------------------------------------------------------- expenses
  function createExpense(db, x) {
    let subtotal = 0, vat = 0;
    const lines = x.lines.map(l => { const gross = r2((+l.price || 0) * (+l.qty || 1)); const net = r2(gross - (+l.discount || 0)); const lv = l.taxable ? r2(net * VAT_RATE) : 0; subtotal += net; vat += lv; return { account: l.account, desc: l.desc || '', price: +l.price || 0, qty: +l.qty || 1, discount: +l.discount || 0, taxable: !!l.taxable, net, vat: lv }; });
    subtotal = r2(subtotal); vat = r2(vat); const total = r2(subtotal + vat);
    if (!(total > 0)) throw err('amount');
    const sup = x.supplierId ? db.suppliers.find(s => s.id === x.supplierId) : null;
    const credit = x.payMethod === 'credit' ? (sup ? sup.account : null) : (x.payAccount || (x.payMethod === 'cash' ? branchCash(db, x.branch) : db.sys.bank));
    if (!credit) throw err('no_supplier');
    const no = nextVoucherNo(db, 'ex', 'EX');
    const jl = lines.map(l => ({ account: l.account, debit: l.net, note: l.desc }));
    if (vat) jl.push({ account: db.sys.vatIn, debit: vat });
    jl.push({ account: credit, credit: total });
    const first = acc(db, lines[0].account) || {};
    const je = postEntry(db, { date: x.date, branch: x.branch, type: 'expense', user: x.user, ref: x.ref || no, memo: x.memo || bi(`مصروف ${no} — ${x.desc || first.ar || ''}`, `Expense ${no} — ${x.descEn || x.desc || first.en || ''}`), lines: jl });
    const rec = { id: uid(), no, date: x.date, branch: x.branch, supplierId: x.supplierId || null, payMethod: x.payMethod, payAccount: credit, desc: x.desc || '', ref: x.ref || '', lines, subtotal, vat, total, attachment: x.attachment || null, journalId: je.id, user: x.user || null };
    db.expenses.push(rec); return rec;
  }

  // ---------------------------------------------------------------- fixed assets
  const ASSET_CLASSES = [
    { cost: '120101', accDep: '120201' }, { cost: '120102', accDep: '120202' }, { cost: '120103', accDep: '120203' }, { cost: '120104', accDep: '120204' },
  ];
  function accDepFor(db, costCode) { const m = (db.assetClasses || ASSET_CLASSES).find(c => c.cost === costCode); return m ? m.accDep : null; }
  function monthlyDep(a) { return r2((a.cost - (a.salvage || 0)) / a.life); }
  function depreciationTo(a, ym) { const start = a.start.slice(0, 7); const n = Math.max(0, Math.min(a.life, monthsBetween(start, ym) + 1)); return r2(Math.min(a.cost - (a.salvage || 0), monthlyDep(a) * n)); }
  function addAsset(db, a, { post = true, paidFrom, user } = {}) {
    const rec = { id: uid(), tag: nextVoucherNo(db, 'fa', 'FA'), name: a.name, nameEn: a.nameEn || a.name, account: a.account, accDep: a.accDep || accDepFor(db, a.account), branch: a.branch || null, start: a.start, cost: r2(a.cost), salvage: r2(a.salvage || 0), life: +a.life, method: 'sl', lastDep: a.lastDep || null, disposed: false };
    if (post) { const vat = r2(a.vat || 0); postEntry(db, { date: a.start, branch: rec.branch, type: 'asset', user, ref: rec.tag, memo: bi(`شراء أصل ${rec.name}`, `Asset purchase ${rec.nameEn}`), lines: [{ account: rec.account, debit: rec.cost }, ...(vat ? [{ account: db.sys.vatIn, debit: vat }] : []), { account: paidFrom || db.sys.bank, credit: r2(rec.cost + vat) }] }); }
    db.assets.push(rec); return rec;
  }
  function runDepreciation(db, ym, user) {
    // posts one entry per month from each asset's next month up to ym (inclusive)
    const posted = [];
    const months = new Set();
    for (const a of db.assets) { if (a.disposed) continue; let m = a.lastDep ? addMonths(a.lastDep, 1) : a.start.slice(0, 7); while (m <= ym) { months.add(m); m = addMonths(m, 1); } }
    for (const m of [...months].sort()) {
      const lines = []; let total = 0; const touched = [];
      for (const a of db.assets) {
        if (a.disposed) continue; const next = a.lastDep ? addMonths(a.lastDep, 1) : a.start.slice(0, 7); if (next !== m) continue;
        const amt = r2(depreciationTo(a, m) - (a.lastDep ? depreciationTo(a, a.lastDep) : 0)); touched.push(a);
        if (amt <= 0) continue; lines.push({ account: a.accDep, credit: amt, branch: a.branch, note: a.name }); total += amt;
      }
      if (total > 0) { lines.unshift({ account: db.sys.depExpense, debit: r2(total) }); posted.push(postEntry(db, { date: monthEnd(m), type: 'depreciation', user, memo: bi(`إهلاك شهر ${m}`, `Depreciation ${m}`), ref: m, lines })); }
      for (const a of touched) a.lastDep = m;
    }
    return posted;
  }

  // ---------------------------------------------------------------- end of day
  function expectedCash(db, date, branch) {
    const cash = branchCash(db, branch); let v = 0;
    for (const j of db.journal) { if (j.date !== date || j.type !== 'sales') continue; for (const l of j.lines) if (l.account === cash) v += l.debit - l.credit; }
    return r2(v);
  }
  function closeDay(db, c) {
    if (db.eod.find(e => e.date === c.date && e.branch === c.branch && !e.reopened)) throw err('closed');
    const expected = expectedCash(db, c.date, c.branch); const diff = r2(c.counted - expected); let journalId = null;
    if (Math.abs(diff) >= 0.01) {
      const cash = branchCash(db, c.branch); const br = db.branches.find(b => b.id === c.branch) || {};
      const je = postEntry(db, { date: c.date, branch: c.branch, type: 'eod', user: c.user, memo: diff > 0 ? bi(`زيادة صندوق ${br.ar}`, `Cash over ${br.en}`) : bi(`عجز صندوق ${br.ar}`, `Cash short ${br.en}`),
        lines: diff > 0 ? [{ account: cash, debit: diff }, { account: db.sys.cashOverShort, credit: diff }] : [{ account: db.sys.cashOverShort, debit: -diff }, { account: cash, credit: -diff }] });
      journalId = je.id;
    }
    const rec = { id: uid(), date: c.date, branch: c.branch, expected, counted: r2(c.counted), diff, notes: c.notes || '', user: c.user, at: new Date().toISOString(), journalId, sales: daySales(db, c.date, c.branch) };
    db.eod.push(rec); return rec;
  }
  function reopenDay(db, id, user) { const e = db.eod.find(x => x.id === id); if (!e) return; e.reopened = true; if (e.journalId) reverseEntry(db, e.journalId, { user }); }
  const isClosed = (db, date, branch) => !!db.eod.find(e => e.date === date && e.branch === branch && !e.reopened);

  // ---------------------------------------------------------------- year close
  function closeYear(db, year, user) {
    const from = `${year}-01-01`, to = `${year}-12-31`;
    if (db.journal.some(j => j.type === 'closing' && j.date === to && !j.reversedBy)) throw err('already_closed');
    const lines = []; let net = 0;
    for (const a of db.accounts) {
      if (a.group || !['revenue', 'cogs', 'expense'].includes(a.type)) continue;
      const bal = accountBalance(db, a.code, { from, to }); if (!bal) continue;
      lines.push(bal > 0 ? { account: a.code, credit: bal } : { account: a.code, debit: -bal }); net += -bal;
    }
    net = r2(net); if (!lines.length) throw err('nothing_to_close');
    lines.push(net >= 0 ? { account: db.sys.retained, credit: net } : { account: db.sys.retained, debit: -net });
    const je = postEntry(db, { date: to, type: 'closing', user, force: true, memo: bi(`إقفال السنة المالية ${year}`, `Year-end close ${year}`), ref: String(year), lines });
    db.settings.lockDate = to; db.fiscalYears = db.fiscalYears || []; db.fiscalYears.push({ year: +year, closedAt: new Date().toISOString(), journalId: je.id, net });
    return je;
  }

  // ---------------------------------------------------------------- reports core
  function movements(db, { from, to, branch, excludeTypes } = {}) {
    const m = {}; // leaf -> {open, dr, cr}
    for (const j of db.journal) {
      if (to && j.date > to) continue; if (excludeTypes && excludeTypes.includes(j.type)) continue;
      const before = from && j.date < from;
      for (const l of j.lines) { if (branch && l.branch !== branch) continue; const x = (m[l.account] ||= { open: 0, dr: 0, cr: 0 }); if (before) x.open += l.debit - l.credit; else { x.dr += l.debit; x.cr += l.credit; } }
    }
    return m;
  }
  function rollup(db, leafMap) {
    const out = {}; for (const a of db.accounts) out[a.code] = { open: 0, dr: 0, cr: 0 };
    for (const [code, v] of Object.entries(leafMap)) { let a = acc(db, code); while (a) { const o = out[a.code]; o.open += v.open; o.dr += v.dr; o.cr += v.cr; a = a.parent ? acc(db, a.parent) : null; } }
    for (const k in out) { out[k].open = r2(out[k].open); out[k].dr = r2(out[k].dr); out[k].cr = r2(out[k].cr); out[k].close = r2(out[k].open + out[k].dr - out[k].cr); }
    return out;
  }
  function trialBalance(db, { from, to, branch, level = 5, type, mode = 'tree', q, hideZero = true } = {}) {
    const all = rollup(db, movements(db, { from, to, branch }));
    const rows = [];
    for (const a of db.accounts) {
      const lv = levelOf(db, a.code); const v = all[a.code];
      if (type && a.type !== type) continue;
      if (q && !(a.code.startsWith(q) || a.ar.includes(q) || (a.en || '').toLowerCase().includes(q.toLowerCase()))) continue;
      const include = mode === 'tree' ? lv <= level : mode === 'leaf' ? !a.group : (lv === level || (!a.group && lv < level));
      if (!include) continue;
      if (hideZero && !v.open && !v.dr && !v.cr) continue;
      rows.push({ code: a.code, ar: a.ar, en: a.en, type: a.type, group: a.group, level: lv, ...v, countable: mode !== 'tree' || lv === level || !a.group && lv < level || (a.group && lv === level) });
    }
    // totals from roots — always consistent regardless of mode
    const tot = { openDr: 0, openCr: 0, dr: 0, cr: 0, closeDr: 0, closeCr: 0 };
    for (const a of db.accounts.filter(x => !x.parent)) { if (type && a.type !== type) continue; const v = all[a.code]; tot.dr += v.dr; tot.cr += v.cr; }
    for (const leaf of db.accounts.filter(x => !x.group)) { if (type && leaf.type !== type) continue; const v = all[leaf.code]; if (v.open > 0) tot.openDr += v.open; else tot.openCr -= v.open; if (v.close > 0) tot.closeDr += v.close; else tot.closeCr -= v.close; }
    for (const k in tot) tot[k] = r2(tot[k]);
    return { rows, totals: tot, balanced: Math.abs(tot.dr - tot.cr) < 0.01 && Math.abs(tot.closeDr - tot.closeCr) < 0.01 && Math.abs(tot.openDr - tot.openCr) < 0.01 };
  }
  function incomeStatement(db, { from, to, branch, level = 3 } = {}) {
    const all = rollup(db, movements(db, { from, to, branch, excludeTypes: ['closing'] }));
    const amt = (code) => { const a = acc(db, code), v = all[code]; const mv = v.dr - v.cr; return r2(natureOf(a.type) === 'debit' ? mv : -mv); };
    const section = (root) => db.accounts.filter(a => (a.code === root || isUnder(db, a.code, root)) && levelOf(db, a.code) <= level && a.code !== root).map(a => ({ code: a.code, ar: a.ar, en: a.en, group: a.group, level: levelOf(db, a.code), amount: amt(a.code) })).filter(r => r.amount);
    const R = amt('4'), C = acc(db, '5') ? amt('5') : 0, E = amt('6');
    const zakatOn = db.settings.zakat;
    return { revenue: section('4'), cogs: acc(db, '5') ? section('5') : [], expenses: section('6'), totalRevenue: R, totalCogs: C, gross: r2(R - C), totalExpenses: E, net: r2(R - C - E), zakatOn };
  }
  function balanceSheet(db, { asOf, branch, level = 3 } = {}) {
    const all = rollup(db, movements(db, { to: asOf, branch }));
    const nat = (code) => { const a = acc(db, code), v = all[code]; return r2(natureOf(a.type) === 'debit' ? v.close : -v.close); };
    const section = (root) => db.accounts.filter(a => isUnder(db, a.code, root) && a.code !== root && levelOf(db, a.code) <= level).map(a => ({ code: a.code, ar: a.ar, en: a.en, group: a.group, level: levelOf(db, a.code), amount: nat(a.code) })).filter(r => r.amount);
    const A = nat('1'), L = nat('2'), E = nat('3');
    const pl = r2(-(all['4'] ? -all['4'].close : 0) * -1); // revenue natural (credit) balance
    const rev = r2(-all['4'].close), cogs = all['5'] ? all['5'].close : 0, exp = all['6'].close;
    const profit = r2(rev - cogs - exp);
    return { assets: section('1'), liabilities: section('2'), equity: section('3'), totalAssets: A, totalLiabilities: L, totalEquity: E, currentProfit: profit, totalLE: r2(L + E + profit), balanced: Math.abs(A - (L + E + profit)) < 0.01, _pl: pl };
  }
  function cashFlow(db, { from, to, branch } = {}) {
    const mv = rollup(db, movements(db, { from, to, branch, excludeTypes: ['closing'] }));
    const ch = (code) => acc(db, code) ? r2(mv[code].dr - mv[code].cr) : 0; // Δ debit balance in period
    const is = incomeStatement(db, { from, to, branch, level: 1 });
    const op = [
      { k: 'net_income', v: is.net },
      { k: 'add_depreciation', v: -ch('1202') },
      { k: 'chg_receivables', v: -ch('1102') },
      { k: 'chg_inventory', v: -ch('1103') },
      { k: 'chg_prepaid', v: -ch('1104') - ch('1105') },
      { k: 'chg_current_liabilities', v: -ch('21') },
    ];
    const inv = [{ k: 'capex', v: -ch('1201') }];
    const fin = [{ k: 'chg_loans', v: -ch('22') }, { k: 'chg_equity', v: -ch('3') }];
    const sum = (x) => r2(x.reduce((s, r) => s + r.v, 0));
    const operating = sum(op), investing = sum(inv), financing = sum(fin);
    const cashChange = ch('1101');
    const openingCash = r2(accountBalance(db, '1101', { to: addDays(from, -1), branch }));
    return { op, inv, fin, operating, investing, financing, net: r2(operating + investing + financing), cashChange, openingCash, closingCash: r2(openingCash + cashChange), reconciles: Math.abs(operating + investing + financing - cashChange) < 0.05 };
  }
  function statement(db, { code, from, to, branch, type } = {}) {
    const a = acc(db, code); if (!a) throw err('no_account', code);
    const leaves = new Set(descendantLeaves(db, code)); const sign = natureOf(a.type) === 'debit' ? 1 : -1;
    let opening = 0; const lines = [];
    const sorted = [...db.journal].sort((x, y) => x.date.localeCompare(y.date) || x.no.localeCompare(y.no));
    for (const j of sorted) {
      if (to && j.date > to) continue; if (type && j.type !== type) continue;
      for (const l of j.lines) {
        if (!leaves.has(l.account) || (branch && l.branch !== branch)) continue;
        const d = (l.debit - l.credit) * sign;
        if (from && j.date < from) opening += d; else lines.push({ id: j.id, date: j.date, no: j.no, type: j.type, memo: j.memo, ref: j.ref, account: l.account, note: l.note, debit: l.debit, credit: l.credit, delta: d });
      }
    }
    let run = r2(opening); for (const l of lines) { run = r2(run + l.delta); l.balance = run; }
    const months = {}; for (const l of lines) { const m = l.date.slice(0, 7); const x = (months[m] ||= { month: m, debit: 0, credit: 0 }); x.debit = r2(x.debit + l.debit); x.credit = r2(x.credit + l.credit); }
    let mrun = r2(opening); const monthly = Object.values(months).sort((x, y) => x.month.localeCompare(y.month)).map(x => { const op = mrun; mrun = r2(mrun + (x.debit - x.credit) * sign); return { ...x, opening: op, closing: mrun }; });
    return { account: a, nature: natureOf(a.type), opening: r2(opening), lines, closing: run, totalDebit: r2(lines.reduce((s, l) => s + l.debit, 0)), totalCredit: r2(lines.reduce((s, l) => s + l.credit, 0)), monthly };
  }
  function partyBalances(db, kind, { from, to, branch } = {}) {
    const list = kind === 'supplier' ? db.suppliers : db.customers; const all = rollup(db, movements(db, { from, to, branch }));
    const sign = kind === 'supplier' ? -1 : 1;
    const rows = list.map(p => { const v = all[p.account] || { open: 0, dr: 0, cr: 0, close: 0 }; return { id: p.id, name: p.name, nameEn: p.nameEn, vat: p.vat, account: p.account, open: r2(v.open * sign), dr: v.dr, cr: v.cr, close: r2(v.close * sign) }; });
    const t = rows.reduce((s, r) => ({ open: s.open + r.open, dr: s.dr + r.dr, cr: s.cr + r.cr, close: s.close + r.close }), { open: 0, dr: 0, cr: 0, close: 0 });
    for (const k in t) t[k] = r2(t[k]); return { rows, totals: t };
  }
  function cashBalances(db, { from, to, branch } = {}) {
    const all = rollup(db, movements(db, { from, to, branch }));
    const rows = descendantLeaves(db, '1101').map(c => ({ code: c, ...acc(db, c), ...all[c] })).sort((a, b) => a.code.localeCompare(b.code));
    const t = rows.reduce((s, r) => ({ open: s.open + r.open, dr: s.dr + r.dr, cr: s.cr + r.cr, close: s.close + r.close }), { open: 0, dr: 0, cr: 0, close: 0 });
    for (const k in t) t[k] = r2(t[k]); return { rows, totals: t };
  }
  function expensesReport(db, { from, to, branch } = {}) {
    const docs = db.expenses.filter(x => (!from || x.date >= from) && (!to || x.date <= to) && (!branch || x.branch === branch));
    const byAcc = {}; for (const d of docs) for (const l of d.lines) byAcc[l.account] = r2((byAcc[l.account] || 0) + l.net);
    // all expense-type movements (incl. salaries, depreciation, fees not entered as expense documents)
    const all = rollup(db, movements(db, { from, to, branch, excludeTypes: ['closing'] }));
    const ledger = db.accounts.filter(a => a.type === 'expense' && !a.group).map(a => ({ code: a.code, ar: a.ar, en: a.en, amount: r2(all[a.code].dr - all[a.code].cr) })).filter(r => r.amount);
    return { docs, byAccount: byAcc, total: r2(docs.reduce((s, d) => s + d.total, 0)), vat: r2(docs.reduce((s, d) => s + d.vat, 0)), ledger, ledgerTotal: r2(ledger.reduce((s, r) => s + r.amount, 0)) };
  }
  function vatReport(db, { from, to, branch } = {}) {
    let out = 0, inp = 0, salesBase = 0, purchBase = 0;
    for (const j of db.journal) { if (j.date < from || j.date > to) continue; for (const l of j.lines) { if (branch && l.branch !== branch) continue; if (l.account === db.sys.vatOut) out += l.credit - l.debit; if (l.account === db.sys.vatIn) inp += l.debit - l.credit; } }
    for (const i of db.salesInvoices) if (i.date >= from && i.date <= to && (!branch || i.branch === branch)) salesBase += i.subtotal;
    for (const i of db.customerInvoices) if (i.date >= from && i.date <= to && (!branch || i.branch === branch)) salesBase += i.subtotal;
    for (const i of db.supplierInvoices) if (i.status === 'posted' && i.date >= from && i.date <= to && (!branch || i.branch === branch)) purchBase += i.subtotal;
    for (const x of db.expenses) if (x.date >= from && x.date <= to && (!branch || x.branch === branch)) purchBase += x.lines.filter(l => l.taxable).reduce((s, l) => s + l.net, 0);
    return { output: r2(out), input: r2(inp), net: r2(out - inp), salesBase: r2(salesBase), purchBase: r2(purchBase) };
  }
  function salesReport(db, { from, to, branch } = {}) {
    const byBranch = {}, byMethod = {}, byDay = {}; let total = 0, n = 0;
    for (const i of db.salesInvoices) { if (i.date < from || i.date > to || (branch && i.branch !== branch)) continue; total += i.total; n++; byBranch[i.branch] = r2((byBranch[i.branch] || 0) + i.total); byMethod[i.method] = r2((byMethod[i.method] || 0) + i.total); byDay[i.date] = r2((byDay[i.date] || 0) + i.total); }
    const credit = db.customerInvoices.filter(i => i.date >= from && i.date <= to && (!branch || i.branch === branch)).reduce((s, i) => s + i.total, 0);
    return { total: r2(total), n, avg: n ? r2(total / n) : 0, byBranch, byMethod, byDay, credit: r2(credit) };
  }
  function agedPayables(db, asOf) {
    asOf = asOf || todayISO(); const by = {};
    for (const inv of db.supplierInvoices) {
      if (inv.status !== 'posted') continue; const open = r2(inv.total - inv.paid); if (open <= 0) continue;
      const age = daysBetween(inv.due || inv.date, asOf); const b = age <= 0 ? 'current' : age <= 30 ? 'd30' : age <= 60 ? 'd60' : age <= 90 ? 'd90' : 'd90p';
      const r = (by[inv.supplierId] ||= { supplierId: inv.supplierId, current: 0, d30: 0, d60: 0, d90: 0, d90p: 0, total: 0 }); r[b] = r2(r[b] + open); r.total = r2(r.total + open);
    }
    const rows = Object.values(by).sort((a, b) => b.total - a.total);
    const totals = rows.reduce((t, r) => { for (const k of ['current', 'd30', 'd60', 'd90', 'd90p', 'total']) t[k] = r2(t[k] + r[k]); return t; }, { current: 0, d30: 0, d60: 0, d90: 0, d90p: 0, total: 0 });
    return { rows, totals };
  }

  // ---------------------------------------------------------------- tenant creation & seed
  function emptyDb(company) {
    const db = { version: 2, company, branches: [], users: [], roles: JSON.parse(JSON.stringify(ROLE_DEFAULTS)), suppliers: [], customers: [], accounts: buildAccounts(COA_CANDY), sys: JSON.parse(JSON.stringify(DEFAULT_SYS)), paymentMethods: DEFAULT_PAYMETHODS.map(p => ({ id: uid(), ...p })), assetClasses: ASSET_CLASSES.map(x => ({ ...x })),
      journal: [], salesInvoices: [], imports: [], supplierInvoices: [], customerInvoices: [], vouchers: [], expenses: [], assets: [], eod: [], fiscalYears: [],
      settings: { fiscalStart: '01-01', lockDate: null, zakat: true, inventorySystem: 'periodic', numberingByBranch: false, voucherPaper: 'A5', printOnSave: false, showLogo: true, defaultBranch: null }, seq: { je: {}, v: {} } };
    return db;
  }
  function seedCandyLoz() {
    const t0 = todayISO();
    const db = emptyDb({ name: 'كاندي لوز', nameEn: 'Candy Loz', vat: '314944989200003', cr: '4030512345', city: 'جدة', address: 'جدة — حي البلد' });
    addBranch(db, { id: 'b1', ar: 'فرع البلد', en: 'Al-Balad', code: 'BLD', city: 'جدة' });
    addBranch(db, { id: 'b2', ar: 'فرع الحمراء', en: 'Al-Hamra', code: 'HMR', city: 'جدة' });
    addBranch(db, { id: 'b3', ar: 'فرع الروضة', en: 'Al-Rawdah', code: 'RWD', city: 'جدة' });
    db.users = [
      { id: 'u1', name: 'فهد العمري', nameEn: 'Fahad Al-Amri', role: 'admin', pin: '1234', active: true },
      { id: 'u2', name: 'نورة السبيعي', nameEn: 'Noura Al-Subaie', role: 'accountant', pin: '1234', active: true },
      { id: 'u3', name: 'سعيد بخش', nameEn: 'Saeed Bakhsh', role: 'operator', pin: '1234', active: true, branch: 'b1' },
      { id: 'u4', name: 'محمد الزهراني', nameEn: 'Mohammed Al-Zahrani', role: 'operator', pin: '1234', active: true, branch: 'b2' },
      { id: 'u5', name: 'أحمد قاضي', nameEn: 'Ahmed Qadi', role: 'operator', pin: '1234', active: true, branch: 'b3' },
    ];
    db.settings.defaultBranch = 'b1';
    const S = [
      ['شركة الخليج لاستيراد الحلويات', 'Gulf Sweets Import Co.', '300012345600003', 30, ['7845', 'شارع الأمير سلطان', 'حي الروضة', 'جدة', '23432', '6734', 'RAFA7845'], '0126543210'],
      ['مؤسسة نكهات آسيا للتجارة', 'Asia Flavors Trading Est.', '300456789100003', 15, ['3201', 'طريق المدينة', 'حي الشرفية', 'جدة', '22234', '7612', 'RBHA3201'], '0555123456'],
      ['شركة فيجو للشوكولاتة', 'Figo Chocolate Co.', '310234567800003', 45, ['5500', 'طريق العليا', 'حي العليا', 'الرياض', '12211', '8821', 'RGDA5500'], '0112233445'],
      ['مصنع الجيلي الإسباني — دولثي', 'Dulce Spanish Jelly Factory', '300998877600003', 30, ['1150', 'شارع فلسطين', 'حي الحمراء', 'جدة', '23323', '5566', 'RHMA1150'], '0543210987'],
      ['مؤسسة قمر الدين الشامية', 'Qamar Al-Din Al-Shamiya Est.', '300112233400003', 15, ['2210', 'شارع الستين', 'حي البغدادية', 'جدة', '22231', '4432', 'RBAA2210'], '0509876543'],
      ['شركة التغليف الحديثة', 'Modern Packaging Co.', '300778899000003', 30, ['9087', 'طريق الملك فهد', 'الصناعية', 'جدة', '21442', '2210', 'RSNA9087'], '0126789012'],
      ['مؤسسة المكسرات الذهبية', 'Golden Nuts Est.', '300334455600003', 7, ['4412', 'شارع قابل', 'حي البلد', 'جدة', '22233', '3390', 'RBLD4412'], '0567890123'],
      ['شركة المشروبات العربية', 'Arabian Beverages Co.', '300556677800003', 30, ['6600', 'طريق الملك عبدالله', 'حي الغدير', 'الرياض', '13311', '9901', 'RQAA6600'], '0112345678'],
      ['شركة البرق للشحن والتخليص', 'Albarq Freight & Clearance', '300665544300003', 15, ['2003', 'شارع المطار', 'حي المطار', 'جدة', '23234', '1123', 'RMTA2003'], '0126001122'],
      ['مؤسسة سناك اليابان', 'Japan Snack Est.', '300887766500003', 30, ['812', 'شارع التحلية', 'حي الزهراء', 'جدة', '23521', '7788', 'RZHA0812'], '0551122334'],
    ];
    const sups = S.map(([name, nameEn, vat, terms, a, phone]) => saveSupplier(db, { name, nameEn, vat, terms, phone, cr: '4030' + vat.slice(4, 10), addr: { building: a[0], street: a[1], district: a[2], city: a[3], postal: a[4], additional: a[5], short: a[6] } }));
    const C = [['شركة ليالي جدة لتنظيم الحفلات', 'Jeddah Nights Events Co.', '310998877100003', 30], ['مؤسسة الضيافة الراقية', 'Fine Hospitality Est.', '300445566700003', 15], ['شركة نسمة للفعاليات والمؤتمرات', 'Nesma Events & Conferences', '311223344500003', 30]];
    const custs = C.map(([name, nameEn, vat, terms]) => saveCustomer(db, { name, nameEn, vat, terms, phone: '05' + vat.slice(5, 13), addr: { city: 'جدة' } }));

    // ---- fixed assets register (bought before the books started) → opening accumulated depreciation
    const openDate = addDays(t0, -50); const openYM = addMonths(openDate.slice(0, 7), -1);
    const assetDefs = [
      ['ديكورات وأرفف فرع البلد', 'Al-Balad fit-out & shelving', '120101', 'b1', '2024-02-01', 62000, 2000, 60],
      ['ديكورات فرع الحمراء', 'Al-Hamra fit-out', '120101', 'b2', '2024-09-01', 48000, 0, 60],
      ['ديكورات فرع الروضة', 'Al-Rawdah fit-out', '120101', 'b3', '2025-05-01', 41000, 0, 60],
      ['ثلاجات عرض الشوكولاتة (6 وحدات)', 'Chocolate display fridges (6 units)', '120102', null, '2024-03-01', 54000, 4000, 48],
      ['أجهزة نقاط البيع والطابعات', 'POS terminals & printers', '120103', null, '2024-02-01', 16500, 0, 36],
      ['سيارة توصيل — فان مبرد', 'Refrigerated delivery van', '120104', null, '2025-01-01', 98000, 18000, 60],
    ];
    const assets = assetDefs.map(([name, nameEn, account, branch, start, cost, salvage, life]) => addAsset(db, { name, nameEn, account, branch, start, cost, salvage, life, lastDep: openYM }, { post: false }));
    const accDepOpen = {}; for (const a of assets) accDepOpen[a.accDep] = r2((accDepOpen[a.accDep] || 0) + depreciationTo(a, openYM));
    const costOpen = {}; for (const a of assets) costOpen[a.account] = r2((costOpen[a.account] || 0) + a.cost);
    const openLines = [
      { account: '11010201', debit: 185000 }, { account: '11010202', debit: 64000 },
      { account: db.sys.cashByBranch.b1, debit: 3000, branch: 'b1' }, { account: db.sys.cashByBranch.b2, debit: 2500, branch: 'b2' }, { account: db.sys.cashByBranch.b3, debit: 2000, branch: 'b3' },
      { account: '11010401', debit: 1500 },
      { account: '110301', debit: 41000 }, { account: '110302', debit: 23500 }, { account: '110303', debit: 16800 }, { account: '110304', debit: 13200 }, { account: '110305', debit: 9400 }, { account: '110306', debit: 3600 }, { account: '110307', debit: 5200 },
      { account: '110502', debit: 15000 },
      ...Object.entries(costOpen).map(([account, debit]) => ({ account, debit })),
      ...Object.entries(accDepOpen).map(([account, credit]) => ({ account, credit })),
      { account: '2201', credit: 28000 },
    ];
    const dr = openLines.reduce((s, l) => s + (l.debit || 0), 0), cr = openLines.reduce((s, l) => s + (l.credit || 0), 0);
    openLines.push({ account: '31', credit: 300000 }, { account: '33', credit: r2(dr - cr - 300000) });
    postEntry(db, { date: openDate, type: 'opening', memo: bi('القيد الافتتاحي', 'Opening balances'), lines: openLines });

    // ---- deterministic randomness
    let s = 7; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    // ---- 48 days of POS sales
    const methods = [['cash', 0.33], ['mada', 0.42], ['visa', 0.14], ['tabby', 0.07], ['tamara', 0.04]];
    const branchMult = { b1: 1.0, b2: 0.78, b3: 0.64 };
    for (let d = 48; d >= 0; d--) {
      const date = addDays(t0, -d); const dow = new Date(date + 'T00:00:00').getDay();
      const dayMult = (dow === 4 || dow === 5) ? 1.45 : (dow === 6 ? 1.15 : 1);
      for (const b of db.branches) {
        if (d === 0 && b.id === 'b3') continue;
        const n = Math.round((26 + rnd() * 18) * branchMult[b.id] * dayMult); const invoices = [];
        for (let i = 0; i < n; i++) { const total = r2(8 + Math.pow(rnd(), 2.3) * 290); const sub = r2(total / 1.15); const x = rnd(); let a = 0, method = 'cash'; for (const [m, w] of methods) { a += w; if (x <= a) { method = m; break; } } invoices.push({ date, branch: b.id, no: `${b.code}-${date.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`, subtotal: sub, vat: r2(total - sub), total, method }); }
        postSalesBatch(db, invoices, { source: 'skysystem_export', file: `sales_${b.code}_${date}.csv`, user: db.users.find(u => u.branch === b.id).id, at: date + 'T23:10:00.000Z' });
      }
      // every 3 days: deposit branch cash to bank and settle gateways
      if (d % 3 === 0 && d > 0) {
        for (const b of db.branches) { const box = branchCash(db, b.id); const bal = accountBalance(db, box, { to: date }); const dep = r2(Math.floor((bal - 1000) / 100) * 100); if (dep > 0) createVoucher(db, { kind: 'transfer', date, branch: b.id, amount: dep, from: box, to: '11010201', notes: 'إيداع نقدية الصندوق', user: 'u2' }); }
        for (const [code, rate] of [['11010301', 0.008], ['11010302', 0.022]]) { const bal = accountBalance(db, code, { to: addDays(date, -1) }); if (bal > 0) createVoucher(db, { kind: 'transfer', date, amount: bal, fee: r2(bal * rate), feeAccount: '6101', from: code, to: '11010201', notes: 'تسوية الشبكة', user: 'u2' }); }
      }
      if (d % 7 === 0 && d > 0) for (const code of ['11010303', '11010304']) { const bal = accountBalance(db, code, { to: addDays(date, -1) }); if (bal > 0) createVoucher(db, { kind: 'transfer', date, amount: bal, fee: r2(bal * 0.065), feeAccount: '6101', from: code, to: '11010202', notes: 'تسوية تابي/تمارا', user: 'u2' }); }
    }
    // ---- purchase invoices + payments
    const inv = [[0, -47, 24500, '5101'], [2, -45, 18200, '5101'], [3, -43, 9800, '5101'], [6, -41, 3200, '5101'], [1, -37, 14300, '5101'], [4, -35, 4100, '5101'], [8, -33, 2700, '5102'], [9, -31, 11600, '5101'], [7, -29, 6200, '5101'],
      [0, -26, 27900, '5101'], [6, -24, 2900, '5101'], [2, -22, 16400, '5101'], [3, -17, 10500, '5101'], [1, -15, 13100, '5101'], [8, -13, 3100, '5102'], [4, -11, 3850, '5101'], [9, -9, 12900, '5101'], [0, -6, 23100, '5101'], [6, -4, 2650, '5101'], [7, -2, 5900, '5101'], [2, -1, 17800, '5101']];
    inv.forEach(([si, off, sub, account], i) => {
      const sp = sups[si]; const date = addDays(t0, off);
      const x = createSupplierInvoice(db, { supplierId: sp.id, no: `${sp.vat.slice(3, 7)}-${2041 + i}`, date, due: addDays(date, sp.terms), subtotal: sub, vat: r2(sub * VAT_RATE), total: r2(sub * 1.15), account, branch: 'b1', user: 'u3' });
      if (off <= -3) postSupplierInvoice(db, x.id, 'u2');
    });
    for (const x of db.supplierInvoices) { if (x.status !== 'posted') continue; const sp = db.suppliers.find(y => y.id === x.supplierId); const age = daysBetween(x.date, t0); if (age > sp.terms + 2 && rnd() < 0.85) paySupplierInvoice(db, { invoiceId: x.id, amount: rnd() < 0.2 ? r2(x.total * 0.5) : x.total, date: addDays(x.date, sp.terms - 1), from: rnd() < 0.85 ? '11010201' : '11010202', user: 'u2' }); }
    // ---- monthly expenses
    const firstMonth = openDate.slice(0, 7);
    for (let m = addMonths(firstMonth, 1); m <= t0.slice(0, 7); m = addMonths(m, 1)) {
      const d1 = m + '-01'; if (d1 > t0) break;
      createExpense(db, { date: d1, branch: 'b1', payMethod: 'bank', payAccount: '11010201', desc: 'رواتب الشهر', descEn: 'Monthly payroll', lines: [{ account: '6201', price: 38500, qty: 1 }], user: 'u2' });
      createExpense(db, { date: d1, branch: 'b1', payMethod: 'bank', payAccount: '11010201', desc: 'التأمينات الاجتماعية', descEn: 'GOSI', lines: [{ account: '6202', price: 4150, qty: 1 }], user: 'u2' });
      createExpense(db, { date: d1, branch: 'b1', payMethod: 'bank', payAccount: '11010201', desc: 'إيجار الفروع الثلاثة', descEn: 'Rent — 3 branches', lines: [{ account: '6203', desc: 'فرع البلد', price: 9000, qty: 1, taxable: true }, { account: '6203', desc: 'فرع الحمراء', price: 7000, qty: 1, taxable: true }, { account: '6203', desc: 'فرع الروضة', price: 5000, qty: 1, taxable: true }], user: 'u2' });
      createExpense(db, { date: addDays(d1, 9) <= t0 ? addDays(d1, 9) : t0, branch: 'b1', payMethod: 'bank', payAccount: '11010201', desc: 'فواتير الكهرباء والمياه', descEn: 'Electricity & water bills', lines: [{ account: '6204', price: 3650, qty: 1, taxable: true }], user: 'u2' });
      createExpense(db, { date: addDays(d1, 4) <= t0 ? addDays(d1, 4) : t0, branch: 'b1', payMethod: 'bank', payAccount: '11010202', desc: 'إعلانات سناب شات وإنستغرام', descEn: 'Snapchat & Instagram ads', lines: [{ account: '6103', price: 6000, qty: 1, taxable: true }], user: 'u2' });
      createExpense(db, { date: addDays(d1, 6) <= t0 ? addDays(d1, 6) : t0, branch: 'b1', supplierId: sups[5].id, payMethod: 'credit', desc: 'علب هدايا وأكياس', descEn: 'Gift boxes & bags', lines: [{ account: '6104', price: 4.5, qty: 420, taxable: true }], user: 'u3' });
      createExpense(db, { date: addDays(d1, 2) <= t0 ? addDays(d1, 2) : t0, branch: 'b1', payMethod: 'bank', payAccount: '11010201', desc: 'اشتراك سلة ونقاط البيع والإنترنت', descEn: 'Salla, POS & internet subscriptions', lines: [{ account: '6210', price: 1150, qty: 1, taxable: true }, { account: '6205', price: 900, qty: 1, taxable: true }], user: 'u2' });
    }
    createExpense(db, { date: addDays(t0, -8), branch: 'b2', payMethod: 'cash', payAccount: db.sys.cashByBranch.b2, desc: 'صيانة ثلاجة العرض', descEn: 'Display fridge repair', lines: [{ account: '6207', price: 650, qty: 1, taxable: true }], user: 'u4' });
    createExpense(db, { date: addDays(t0, -5), branch: 'b1', payMethod: 'cash', payAccount: '11010401', desc: 'إتلاف بضاعة منتهية', descEn: 'Expired stock write-off', lines: [{ account: '5104', price: 780, qty: 1 }], user: 'u2' });
    // ---- corporate credit sales + receipts
    [[0, -40, 8625], [1, -28, 4370], [2, -18, 12650], [0, -7, 6900]].forEach(([ci, off, total]) => createCustomerInvoice(db, { customerId: custs[ci].id, date: addDays(t0, off), branch: 'b1', total, user: 'u2' }));
    for (const ci of db.customerInvoices.slice(0, 2)) createVoucher(db, { kind: 'receipt', date: addDays(ci.date, 20), branch: 'b1', amount: ci.total, from: db.customers.find(c => c.id === ci.customerId).account, to: '11010201', party: db.customers.find(c => c.id === ci.customerId).name, invoiceId: ci.id, method: 'transfer', user: 'u2' });
    // ---- depreciation up to last completed month
    runDepreciation(db, addMonths(t0.slice(0, 7), -1), 'u2');
    // ---- EOD closings (all but last 3 days)
    for (let d = 48; d >= 3; d--) { const date = addDays(t0, -d); for (const b of db.branches) { const exp = expectedCash(db, date, b.id); if (exp <= 0) continue; const diff = rnd() < 0.15 ? r2((rnd() - 0.5) * 60) : 0; closeDay(db, { date, branch: b.id, counted: r2(exp + diff), user: db.users.find(u => u.branch === b.id).id }); } }
    db.journal.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    // renumber chronologically for a clean demo
    const seq = {}; for (const j of db.journal) { const y = j.date.slice(0, 4); seq[y] = (seq[y] || 0) + 1; j.no = y + String(seq[y]).padStart(6, '0'); } db.seq.je = seq;
    return db;
  }
  function seedBlank({ name, nameEn, vat, cr, city, adminName, adminNameEn, adminPin, branchName }) {
    const db = emptyDb({ name, nameEn: nameEn || name, vat: vat || '', cr: cr || '', city: city || '' });
    addBranch(db, { id: 'b1', ar: branchName || 'الفرع الرئيسي', en: 'Main branch', code: 'MAIN', city: city || '' });
    db.users = [{ id: 'u1', name: adminName || 'مدير النظام', nameEn: adminNameEn || adminName || 'Admin', role: 'admin', pin: adminPin || '1234', active: true }];
    db.settings.defaultBranch = 'b1'; return db;
  }

  // ---------------------------------------------------------------- persistence (platform + tenants)
  const PKEY = 'daftar.v2.platform', TKEY = (id) => 'daftar.v2.t.' + id;
  const hasLS = typeof localStorage !== 'undefined';
  let platform = null; const cache = {}; let current = null;
  function defaultPlatform() {
    return { version: 2, superadmins: [{ id: 'sa1', name: 'فريق هنترز', nameEn: 'Hunters team', pin: '0000' }],
      tenants: [{ id: 'candyloz', name: 'كاندي لوز', nameEn: 'Candy Loz', vat: '314944989200003', plan: 'pro', active: true, features: allFeatures(), limits: { users: 8, branches: 5 }, createdAt: new Date().toISOString(), contact: 'المالية — جدة' }] };
  }
  function getPlatform() {
    if (platform) return platform;
    if (hasLS) { try { const raw = localStorage.getItem(PKEY); if (raw) { platform = JSON.parse(raw); return platform; } } catch (e) { /* ignore */ } }
    platform = defaultPlatform(); savePlatform(); return platform;
  }
  function savePlatform() { if (hasLS && platform) localStorage.setItem(PKEY, JSON.stringify(platform)); }
  function load(tenantId) {
    tenantId = tenantId || 'candyloz'; current = tenantId;
    if (cache[tenantId]) return cache[tenantId];
    if (hasLS) { try { const raw = localStorage.getItem(TKEY(tenantId)); if (raw) { cache[tenantId] = JSON.parse(raw); return cache[tenantId]; } } catch (e) { /* ignore */ } }
    const t = getPlatform().tenants.find(x => x.id === tenantId);
    cache[tenantId] = tenantId === 'candyloz' ? seedCandyLoz() : seedBlank(t || { name: tenantId });
    save(tenantId); return cache[tenantId];
  }
  function save(tenantId) { tenantId = tenantId || current; if (hasLS && cache[tenantId]) { try { localStorage.setItem(TKEY(tenantId), JSON.stringify(cache[tenantId])); } catch (e) { console.error('save failed', e); } } }
  function createTenant(t) {
    const p = getPlatform(); const id = (t.id || t.nameEn || t.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 't' + uid().slice(0, 5);
    if (p.tenants.find(x => x.id === id)) throw err('tenant_exists', id);
    const rec = { id, name: t.name, nameEn: t.nameEn || t.name, vat: t.vat || '', plan: t.plan || 'starter', active: true, features: t.features || allFeatures(), limits: t.limits || { users: 5, branches: 2 }, createdAt: new Date().toISOString(), contact: t.contact || '' };
    p.tenants.push(rec); savePlatform();
    cache[id] = seedBlank({ ...t, branchName: t.branchName }); save(id); return rec;
  }
  function resetTenant(id) { delete cache[id]; if (hasLS) localStorage.removeItem(TKEY(id)); return load(id); }
  function resetAll() { if (hasLS) Object.keys(localStorage).filter(k => k.startsWith('daftar.v2.')).forEach(k => localStorage.removeItem(k)); platform = null; for (const k in cache) delete cache[k]; return getPlatform(); }
  function replace(tenantId, obj) { cache[tenantId] = obj; save(tenantId); return obj; }

  root.Store = {
    VAT_RATE, FEATURES, PERMS, ROLE_DEFAULTS, COA_CANDY, uid, r2, todayISO, addDays, addMonths, monthEnd, daysBetween, bi,
    getPlatform, savePlatform, load, save, createTenant, resetTenant, resetAll, replace, seedCandyLoz, seedBlank, emptyDb, get current() { return current; },
    acc, childrenOf, levelOf, descendantLeaves, isUnder, nextCode, addAccount, updateAccount, deleteAccount, canDeleteAccount, hasPostings, natureOf,
    addBranch, branchCash, branchSales, methodAccount, postEntry, reverseEntry, postSalesBatch, daySales, validVAT, saveSupplier, saveCustomer, accountBalance, supplierBalance, customerBalance,
    createSupplierInvoice, postSupplierInvoice, invoiceStatus, createVoucher, paySupplierInvoice, createCustomerInvoice, createExpense, addAsset, runDepreciation, depreciationTo, monthlyDep, accDepFor,
    expectedCash, closeDay, reopenDay, isClosed, closeYear, movements, rollup, trialBalance, incomeStatement, balanceSheet, cashFlow, statement, partyBalances, cashBalances, expensesReport, vatReport, salesReport, agedPayables,
  };
})(typeof window !== 'undefined' ? window : globalThis);
