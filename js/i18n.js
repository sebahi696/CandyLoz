/* Daftar — i18n (Arabic default, English optional) */
window.I18N = (() => {
  const dict = {
    ar: {
      app: 'دفتر', byHunters: 'من هنترز', tagline: 'محاسبة كاملة فوق نقاط البيع',
      login_title: 'اختر حسابك', login_hint: 'نسخة تجريبية — الرمز لكل الحسابات 1234', pin: 'الرمز السري', signin: 'دخول', wrongPin: 'الرمز غير صحيح',
      role_admin: 'مدير', role_accountant: 'محاسب', role_operator: 'مشغّل',
      role_admin_desc: 'تحكم كامل وكل التقارير', role_accountant_desc: 'القيود والتقارير بدون إدارة المستخدمين', role_operator_desc: 'استيراد المبيعات وفواتير الموردين وإقفال اليوم',
      nav_home: 'اليوم', nav_sales: 'المبيعات', nav_suppliers: 'الموردين', nav_eod: 'الإقفال', nav_reports: 'التقارير', nav_more: 'المزيد',
      today: 'اليوم', sales_today: 'مبيعات اليوم', incl_vat: 'شامل الضريبة', vs_yesterday: 'مقارنة بالأمس', by_branch: 'حسب الفرع', by_payment: 'حسب طريقة الدفع',
      needs_attention: 'يحتاج انتباهك', all_clear: 'كل شيء مكتمل — لا يوجد ما يحتاج انتباهك',
      days_not_closed: 'أيام لم تُقفل', unposted_invoices: 'فواتير موردين غير مرحّلة', due_this_week: 'مستحق للموردين هذا الأسبوع', no_sales_today: 'لا توجد مبيعات اليوم بعد — استورد تصدير نقاط البيع',
      quick_import: 'استيراد مبيعات', quick_scan: 'تصوير فاتورة', quick_eod: 'إقفال اليوم', quick_invoice: 'فاتورة مورد',
      sales: 'المبيعات', import_sales: 'استيراد المبيعات', import_from_pos: 'استيراد من SkySystem', import_hint: 'ارفع ملف التصدير (CSV أو Excel) من نقاط البيع. سنتعرف على الأعمدة تلقائياً.', choose_file: 'اختر ملف التصدير', or_sample: 'أو جرّب ملفاً نموذجياً', download_sample: 'تحميل ملف نموذجي',
      map_columns: 'مطابقة الأعمدة', col_date: 'التاريخ', col_branch: 'الفرع', col_invoice: 'رقم الفاتورة', col_subtotal: 'المبلغ قبل الضريبة', col_vat: 'الضريبة', col_total: 'الإجمالي', col_method: 'طريقة الدفع', ignore: 'تجاهل',
      preview: 'معاينة', rows: 'صف', duplicates_skipped: 'مكررة (سيتم تجاهلها)', post_sales: 'ترحيل المبيعات', posted_sales: 'تم ترحيل مبيعات {n} فاتورة', nothing_to_post: 'لا يوجد ما يُرحّل', manual_sales: 'إدخال يومي يدوي', manual_sales_hint: 'لو لم يتوفر ملف التصدير، أدخل مجاميع اليوم لكل فرع.',
      recent_imports: 'آخر عمليات الاستيراد', no_imports: 'لا توجد عمليات استيراد بعد — ارفع تصدير المبيعات الأول', invoices_n: '{n} فاتورة', source_import: 'ملف', source_manual: 'يدوي',
      suppliers: 'الموردين', supplier: 'المورد', add_supplier: 'إضافة مورد', edit_supplier: 'تعديل المورد', supplier_name: 'اسم المورد', vat_number: 'الرقم الضريبي', vat_number_hint: '15 رقماً يبدأ وينتهي بـ 3', cr_number: 'السجل التجاري', phone: 'الجوال', email: 'البريد', national_address: 'العنوان الوطني', building_no: 'رقم المبنى', street: 'الشارع', district: 'الحي', city: 'المدينة', postal_code: 'الرمز البريدي', additional_no: 'الرقم الإضافي', short_address: 'العنوان المختصر', payment_terms: 'مدة السداد (يوم)', balance: 'الرصيد', we_owe: 'مستحق له', save_supplier: 'حفظ المورد', supplier_saved: 'تم حفظ المورد', search_suppliers: 'ابحث باسم المورد أو الرقم الضريبي', no_suppliers: 'لا يوجد موردون بعد — اضغط + لإضافة مورد', invalid_vat: 'الرقم الضريبي يجب أن يكون 15 رقماً يبدأ وينتهي بـ 3',
      invoices: 'الفواتير', supplier_invoices: 'فواتير الموردين', new_invoice: 'فاتورة مورد جديدة', scan_invoice: 'تصوير الفاتورة', manual_entry: 'إدخال يدوي', take_photo: 'التقط صورة أو اختر ملفاً', reading_invoice: 'جارٍ قراءة الفاتورة…', read_done: 'تمت القراءة — راجع الحقول ثم رحّل', read_partial: 'قرأنا جزءاً من الفاتورة — أكمل الحقول الناقصة', read_failed: 'تعذّرت قراءة الصورة — أدخل البيانات يدوياً', ocr_loading: 'تحميل محرك القراءة ({p}%)', ocr_recognizing: 'التعرف على النص ({p}%)',
      invoice_no: 'رقم الفاتورة', invoice_date: 'تاريخ الفاتورة', due_date: 'تاريخ الاستحقاق', subtotal: 'قبل الضريبة', vat_15: 'ضريبة 15%', total: 'الإجمالي', expense_account: 'حساب المصروف/المشتريات', branch: 'الفرع', notes: 'ملاحظات', attach: 'المرفق', matched_supplier: 'تم التعرف على المورد من الرقم الضريبي', unknown_supplier: 'الرقم الضريبي غير مسجل — اختر المورد أو أضفه', post_invoice: 'ترحيل الفاتورة', invoice_posted: 'تم ترحيل الفاتورة', save_draft: 'حفظ كمسودة', draft_saved: 'تم حفظ المسودة', status_draft: 'مسودة', status_posted: 'مرحّلة', status_paid: 'مسددة', status_partial: 'مسددة جزئياً', status_overdue: 'متأخرة', status_due: 'مستحقة', status_open: 'لم يُقفل',
      record_payment: 'تسجيل سداد', payment_amount: 'المبلغ المسدد', paid_from: 'السداد من', payment_recorded: 'تم تسجيل السداد', remaining: 'المتبقي', cash: 'نقد', bank: 'البنك', mada: 'مدى', card: 'بطاقة', visa: 'فيزا/ماستر', tabby: 'تابي/تمارا', transfer: 'تحويل بنكي',
      eod: 'إقفال اليوم', eod_for: 'إقفال يوم', select_branch: 'اختر الفرع', select_date: 'اختر التاريخ', expected_cash: 'النقد المتوقع', counted_cash: 'النقد الفعلي', difference: 'الفرق', card_settlements: 'تسويات البطاقات', purchases_from_till: 'مشتريات من الصندوق', invoices_today: 'فواتير اليوم', close_day: 'إقفال اليوم', day_closed: 'تم إقفال اليوم', already_closed: 'هذا اليوم مُقفل', reopen: 'إعادة فتح', day_reopened: 'أعيد فتح اليوم', over: 'زيادة', short: 'عجز', exact: 'مطابق', closed_by: 'أقفله', no_sales_for_day: 'لا توجد مبيعات مرحّلة لهذا اليوم والفرع', recent_closings: 'آخر الإقفالات', open_days: 'أيام مفتوحة',
      reports: 'التقارير', trial_balance: 'ميزان المراجعة', statement_of_account: 'كشف حساب', pnl: 'قائمة الدخل', vat_report: 'إقرار الضريبة', sales_report: 'تقرير المبيعات', aged_payables: 'أعمار الذمم الدائنة', general_journal: 'دفتر اليومية', ledger: 'دفتر الأستاذ',
      period: 'الفترة', from: 'من', to: 'إلى', this_month: 'هذا الشهر', last_month: 'الشهر الماضي', this_quarter: 'هذا الربع', ytd: 'من بداية السنة', custom: 'مخصص', apply: 'تطبيق',
      account: 'الحساب', code: 'الرمز', opening: 'افتتاحي', debit: 'مدين', credit: 'دائن', closing: 'ختامي', totals: 'الإجمالي', balanced: 'الميزان متوازن', not_balanced: 'الميزان غير متوازن', export_csv: 'تصدير CSV', print: 'طباعة', pdf: 'PDF',
      statement_for: 'كشف حساب لـ', pick_subject: 'اختر مورداً أو حساباً', date: 'التاريخ', reference: 'المرجع', description: 'البيان', running_balance: 'الرصيد', opening_balance: 'رصيد افتتاحي', closing_balance: 'رصيد ختامي',
      revenue: 'الإيرادات', cogs: 'تكلفة المبيعات', gross_profit: 'مجمل الربح', expenses: 'المصروفات', net_profit: 'صافي الربح', net_loss: 'صافي الخسارة',
      output_vat: 'ضريبة المخرجات', input_vat: 'ضريبة المدخلات', net_vat: 'صافي الضريبة المستحقة', vat_refundable: 'ضريبة قابلة للاسترداد', taxable_sales: 'مبيعات خاضعة', taxable_purchases: 'مشتريات خاضعة',
      current: 'جارية', days_1_30: '1–30 يوم', days_31_60: '31–60 يوم', days_61_90: '61–90 يوم', days_90p: 'أكثر من 90',
      more: 'المزيد', settings: 'الإعدادات', company: 'المنشأة', company_name: 'اسم المنشأة', branches: 'الفروع', users: 'المستخدمون', chart_of_accounts: 'دليل الحسابات', language: 'اللغة', theme: 'المظهر', theme_auto: 'تلقائي', theme_light: 'فاتح', theme_dark: 'داكن', backup: 'نسخة احتياطية', export_backup: 'تصدير البيانات', import_backup: 'استيراد البيانات', reset_demo: 'إعادة البيانات التجريبية', reset_confirm: 'سيتم حذف كل البيانات وإعادة النسخة التجريبية. متأكد؟', reset_done: 'تمت إعادة البيانات التجريبية', signout: 'تسجيل الخروج', signed_in_as: 'مسجل الدخول كـ',
      add_user: 'إضافة مستخدم', edit_user: 'تعديل المستخدم', user_name: 'الاسم', role: 'الدور', user_saved: 'تم حفظ المستخدم', active: 'نشط', inactive: 'موقوف', add_branch: 'إضافة فرع', branch_name: 'اسم الفرع', branch_saved: 'تم حفظ الفرع', add_account: 'إضافة حساب', account_saved: 'تم حفظ الحساب', account_type: 'النوع', type_asset: 'أصول', type_liability: 'التزامات', type_equity: 'حقوق ملكية', type_revenue: 'إيرادات', type_expense: 'مصروفات',
      save: 'حفظ', cancel: 'إلغاء', close: 'إغلاق', delete: 'حذف', edit: 'تعديل', confirm: 'تأكيد', are_you_sure: 'متأكد؟', yes_delete: 'نعم، احذف', keep: 'تراجع', back: 'رجوع', next: 'التالي', done: 'تم', search: 'بحث', all: 'الكل', filter: 'تصفية', view_all: 'عرض الكل', add: 'إضافة', required: 'هذا الحقل مطلوب', deleted: 'تم الحذف', copied: 'تم النسخ', no_access: 'ليس لديك صلاحية لهذه الصفحة',
      sar: 'ر.س', file: 'الملف', cards: 'بطاقات', upcoming_payments: 'مستحقات الموردين القادمة', items: 'عنصر', empty_list: 'القائمة فارغة', no_results: 'لا توجد نتائج', unposted: 'غير مرحّلة', entry: 'قيد', entries: 'قيود', memo_sales: 'مبيعات {branch} — {method}', memo_invoice: 'فاتورة مورد {no} — {supplier}', memo_payment: 'سداد للمورد {supplier}', memo_eod_short: 'عجز صندوق {branch}', memo_eod_over: 'زيادة صندوق {branch}',
      install_hint: 'أضف دفتر إلى الشاشة الرئيسية لتجربة أسرع', demo_banner: 'نسخة تجريبية — البيانات محفوظة على هذا الجهاز فقط',
      weekday: ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],
      months: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
    },
    en: {
      app: 'Daftar', byHunters: 'by Hunters', tagline: 'Full accounting on top of your POS',
      login_title: 'Choose your account', login_hint: 'Demo build — PIN for every account is 1234', pin: 'PIN', signin: 'Sign in', wrongPin: 'Wrong PIN',
      role_admin: 'Admin', role_accountant: 'Accountant', role_operator: 'Operator',
      role_admin_desc: 'Full control and all reports', role_accountant_desc: 'Entries and reports, no user management', role_operator_desc: 'Import sales, supplier invoices, end of day',
      nav_home: 'Today', nav_sales: 'Sales', nav_suppliers: 'Suppliers', nav_eod: 'Close', nav_reports: 'Reports', nav_more: 'More',
      today: 'Today', sales_today: "Today's sales", incl_vat: 'incl. VAT', vs_yesterday: 'vs yesterday', by_branch: 'By branch', by_payment: 'By payment method',
      needs_attention: 'Needs attention', all_clear: 'All clear — nothing needs your attention',
      days_not_closed: 'days not closed', unposted_invoices: 'supplier invoices not posted', due_this_week: 'due to suppliers this week', no_sales_today: 'No sales today yet — import the POS export',
      quick_import: 'Import sales', quick_scan: 'Scan invoice', quick_eod: 'Close the day', quick_invoice: 'Supplier invoice',
      sales: 'Sales', import_sales: 'Import sales', import_from_pos: 'Import from SkySystem', import_hint: 'Upload the POS export (CSV or Excel). Columns are detected automatically.', choose_file: 'Choose export file', or_sample: 'or try a sample file', download_sample: 'Download sample',
      map_columns: 'Match columns', col_date: 'Date', col_branch: 'Branch', col_invoice: 'Invoice no.', col_subtotal: 'Amount before VAT', col_vat: 'VAT', col_total: 'Total', col_method: 'Payment method', ignore: 'Ignore',
      preview: 'Preview', rows: 'rows', duplicates_skipped: 'duplicates (will be skipped)', post_sales: 'Post sales', posted_sales: 'Posted sales for {n} invoices', nothing_to_post: 'Nothing to post', manual_sales: 'Manual daily entry', manual_sales_hint: "No export file? Enter the day's totals per branch.",
      recent_imports: 'Recent imports', no_imports: 'No imports yet — upload the first sales export', invoices_n: '{n} invoices', source_import: 'File', source_manual: 'Manual',
      suppliers: 'Suppliers', supplier: 'Supplier', add_supplier: 'Add supplier', edit_supplier: 'Edit supplier', supplier_name: 'Supplier name', vat_number: 'VAT number', vat_number_hint: '15 digits, starts and ends with 3', cr_number: 'CR number', phone: 'Mobile', email: 'Email', national_address: 'National address', building_no: 'Building no.', street: 'Street', district: 'District', city: 'City', postal_code: 'Postal code', additional_no: 'Additional no.', short_address: 'Short address', payment_terms: 'Payment terms (days)', balance: 'Balance', we_owe: 'we owe', save_supplier: 'Save supplier', supplier_saved: 'Supplier saved', search_suppliers: 'Search by name or VAT number', no_suppliers: 'No suppliers yet — tap + to add one', invalid_vat: 'VAT number must be 15 digits starting and ending with 3',
      invoices: 'Invoices', supplier_invoices: 'Supplier invoices', new_invoice: 'New supplier invoice', scan_invoice: 'Scan invoice', manual_entry: 'Manual entry', take_photo: 'Take a photo or choose a file', reading_invoice: 'Reading the invoice…', read_done: 'Read — review the fields, then post', read_partial: 'Read part of the invoice — complete the missing fields', read_failed: "Couldn't read the image — enter the details manually", ocr_loading: 'Loading reader ({p}%)', ocr_recognizing: 'Recognizing text ({p}%)',
      invoice_no: 'Invoice no.', invoice_date: 'Invoice date', due_date: 'Due date', subtotal: 'Before VAT', vat_15: 'VAT 15%', total: 'Total', expense_account: 'Expense / purchases account', branch: 'Branch', notes: 'Notes', attach: 'Attachment', matched_supplier: 'Supplier matched by VAT number', unknown_supplier: 'VAT number not on file — pick the supplier or add it', post_invoice: 'Post invoice', invoice_posted: 'Invoice posted', save_draft: 'Save as draft', draft_saved: 'Draft saved', status_draft: 'Draft', status_posted: 'Posted', status_paid: 'Paid', status_partial: 'Partly paid', status_overdue: 'Overdue', status_due: 'Due', status_open: 'Not closed',
      record_payment: 'Record payment', payment_amount: 'Amount paid', paid_from: 'Paid from', payment_recorded: 'Payment recorded', remaining: 'Remaining', cash: 'Cash', bank: 'Bank', mada: 'mada', card: 'Card', visa: 'Visa/Master', tabby: 'Tabby/Tamara', transfer: 'Bank transfer',
      eod: 'End of day', eod_for: 'Close day', select_branch: 'Choose branch', select_date: 'Choose date', expected_cash: 'Expected cash', counted_cash: 'Counted cash', difference: 'Difference', card_settlements: 'Card settlements', purchases_from_till: 'Purchases from till', invoices_today: "Today's invoices", close_day: 'Close the day', day_closed: 'Day closed', already_closed: 'This day is closed', reopen: 'Reopen', day_reopened: 'Day reopened', over: 'over', short: 'short', exact: 'exact', closed_by: 'closed by', no_sales_for_day: 'No posted sales for this day and branch', recent_closings: 'Recent closings', open_days: 'Open days',
      reports: 'Reports', trial_balance: 'Trial balance', statement_of_account: 'Statement of account', pnl: 'Profit & loss', vat_report: 'VAT return', sales_report: 'Sales report', aged_payables: 'Aged payables', general_journal: 'General journal', ledger: 'General ledger',
      period: 'Period', from: 'From', to: 'To', this_month: 'This month', last_month: 'Last month', this_quarter: 'This quarter', ytd: 'Year to date', custom: 'Custom', apply: 'Apply',
      account: 'Account', code: 'Code', opening: 'Opening', debit: 'Debit', credit: 'Credit', closing: 'Closing', totals: 'Totals', balanced: 'In balance', not_balanced: 'Out of balance', export_csv: 'Export CSV', print: 'Print', pdf: 'PDF',
      statement_for: 'Statement for', pick_subject: 'Pick a supplier or account', date: 'Date', reference: 'Ref', description: 'Description', running_balance: 'Balance', opening_balance: 'Opening balance', closing_balance: 'Closing balance',
      revenue: 'Revenue', cogs: 'Cost of sales', gross_profit: 'Gross profit', expenses: 'Expenses', net_profit: 'Net profit', net_loss: 'Net loss',
      output_vat: 'Output VAT', input_vat: 'Input VAT', net_vat: 'Net VAT payable', vat_refundable: 'VAT refundable', taxable_sales: 'Taxable sales', taxable_purchases: 'Taxable purchases',
      current: 'Current', days_1_30: '1–30 days', days_31_60: '31–60 days', days_61_90: '61–90 days', days_90p: 'Over 90',
      more: 'More', settings: 'Settings', company: 'Company', company_name: 'Company name', branches: 'Branches', users: 'Users', chart_of_accounts: 'Chart of accounts', language: 'Language', theme: 'Appearance', theme_auto: 'Auto', theme_light: 'Light', theme_dark: 'Dark', backup: 'Backup', export_backup: 'Export data', import_backup: 'Import data', reset_demo: 'Reset demo data', reset_confirm: 'This deletes everything and restores the demo. Sure?', reset_done: 'Demo data restored', signout: 'Sign out', signed_in_as: 'Signed in as',
      add_user: 'Add user', edit_user: 'Edit user', user_name: 'Name', role: 'Role', user_saved: 'User saved', active: 'Active', inactive: 'Inactive', add_branch: 'Add branch', branch_name: 'Branch name', branch_saved: 'Branch saved', add_account: 'Add account', account_saved: 'Account saved', account_type: 'Type', type_asset: 'Assets', type_liability: 'Liabilities', type_equity: 'Equity', type_revenue: 'Revenue', type_expense: 'Expenses',
      save: 'Save', cancel: 'Cancel', close: 'Close', delete: 'Delete', edit: 'Edit', confirm: 'Confirm', are_you_sure: 'Are you sure?', yes_delete: 'Yes, delete', keep: 'Keep', back: 'Back', next: 'Next', done: 'Done', search: 'Search', all: 'All', filter: 'Filter', view_all: 'View all', add: 'Add', required: 'This field is required', deleted: 'Deleted', copied: 'Copied', no_access: "You don't have access to this page",
      sar: 'SAR', file: 'File', cards: 'Cards', upcoming_payments: 'Upcoming supplier payments', items: 'items', empty_list: 'Nothing here', no_results: 'No results', unposted: 'Not posted', entry: 'entry', entries: 'entries', memo_sales: 'Sales {branch} — {method}', memo_invoice: 'Supplier invoice {no} — {supplier}', memo_payment: 'Payment to {supplier}', memo_eod_short: 'Cash short {branch}', memo_eod_over: 'Cash over {branch}',
      install_hint: 'Add Daftar to your home screen for a faster experience', demo_banner: 'Demo build — data is saved on this device only',
      weekday: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
      months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    }
  };

  let lang = localStorage.getItem('daftar.lang') || 'ar';

  function t(key, vars) {
    let s = (dict[lang] && dict[lang][key]) ?? dict.en[key] ?? key;
    if (vars && typeof s === 'string') for (const k in vars) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
    return s;
  }
  function setLang(l) {
    lang = l; localStorage.setItem('daftar.lang', l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  }
  function getLang() { return lang; }
  function isRTL() { return lang === 'ar'; }

  // Numbers: Saudi finance uses Western digits; always 2 decimals for money.
  const nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  function money(n, opts = {}) {
    const v = Number(n) || 0;
    const s = opts.whole ? nf0.format(Math.round(v)) : nf.format(v);
    return s;
  }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = typeof iso === 'string' ? new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')) : iso;
    const m = dict[lang].months[d.getMonth()];
    return `${d.getDate()} ${m} ${d.getFullYear()}`;
  }
  function fmtDateShort(iso) {
    if (!iso) return '';
    const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
    return `${d.getDate()} ${dict[lang].months[d.getMonth()]}`;
  }
  function weekday(iso) {
    const d = new Date(iso + 'T00:00:00');
    return dict[lang].weekday[d.getDay()];
  }
  setLang(lang);
  return { t, setLang, getLang, isRTL, money, fmtDate, fmtDateShort, weekday, dict };
})();
