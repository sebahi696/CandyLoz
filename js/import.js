/* Daftar — POS export parser (CSV / XLSX) with automatic column matching */
window.PosImport = (() => {
  const SYN = {
    date: ['date', 'invoice date', 'datetime', 'date time', 'time', 'created', 'التاريخ', 'تاريخ', 'تاريخ الفاتورة', 'الوقت'],
    branch: ['branch', 'store', 'outlet', 'location', 'shop', 'الفرع', 'فرع', 'المتجر', 'الموقع'],
    invoice: ['invoice', 'invoice no', 'invoice number', 'inv no', 'receipt', 'receipt no', 'ref', 'reference', 'order', 'bill no', 'رقم الفاتورة', 'الفاتورة', 'رقم', 'المرجع', 'رقم الإيصال'],
    subtotal: ['subtotal', 'sub total', 'net', 'net amount', 'taxable', 'taxable amount', 'before vat', 'amount', 'قبل الضريبة', 'الصافي', 'المبلغ', 'الخاضع', 'المجموع الفرعي'],
    vat: ['vat', 'tax', 'vat amount', 'tax amount', 'ضريبة', 'الضريبة', 'ضريبة القيمة المضافة', 'قيمة الضريبة'],
    total: ['total', 'grand total', 'total amount', 'amount incl vat', 'net total', 'الإجمالي', 'الاجمالي', 'المجموع', 'الإجمالي شامل', 'شامل الضريبة'],
    method: ['payment', 'payment method', 'pay method', 'tender', 'method', 'paid by', 'payment type', 'طريقة الدفع', 'الدفع', 'وسيلة الدفع', 'نوع الدفع'],
  };
  const norm = (s) => String(s || '').toLowerCase().replace(/[_\-\.]/g, ' ').replace(/\s+/g, ' ').trim();

  function autoMap(headers) {
    const map = {};
    const used = new Set();
    for (const field of ['invoice', 'date', 'branch', 'method', 'total', 'vat', 'subtotal']) {
      let best = null, bestScore = 0;
      headers.forEach((h, i) => {
        if (used.has(i)) return;
        const n = norm(h);
        for (const s of SYN[field]) {
          let score = 0;
          if (n === s) score = 3; else if (n.includes(s) && s.length > 2) score = s.length >= 4 ? 2 : 1;
          if (score > bestScore) { bestScore = score; best = i; }
        }
      });
      if (best !== null && bestScore > 0) { map[field] = best; used.add(best); }
    }
    return map;
  }

  function parseCSV(text) {
    // RFC4180-ish, handles quotes, CRLF, BOM, ; or , separators
    text = text.replace(/^﻿/, '');
    const firstLine = text.split(/\r?\n/)[0] || '';
    const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : (firstLine.includes('\t') ? '\t' : ',');
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c === '\r') { /* skip */ }
      else cell += c;
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(c => String(c).trim() !== ''));
  }

  async function parseFile(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      if (!window.XLSX) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: false });
      return rows.filter(r => r && r.some(c => String(c ?? '').trim() !== ''));
    }
    const text = await file.text();
    return parseCSV(text);
  }
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }

  // Arabic-aware number: ١٢٣٫٤٥ / 1٬234٫5 / 1,234.50 / (12.5)
  function anum(v) {
    if (v === null || v === undefined || v === '') return NaN; if (typeof v === 'number') return v;
    let s = latinDigits(String(v)).trim().replace(/\u066B/g, '.').replace(/[\u066C\u060C,\s]/g, '').replace(/[^\d.\-()]/g, '');
    const neg = /^\(.*\)$/.test(s) || s.startsWith('-'); s = s.replace(/[()\-]/g, '');
    if (s === '' || s === '.') return NaN; const n = parseFloat(s); return neg ? -n : n;
  }
  const num = (v) => { if (v === null || v === undefined) return NaN; const s = String(v).replace(/[^\d.\-]/g, '').replace(/^(-?)(.*)-$/, '$1$2'); return s === '' ? NaN : parseFloat(s); };
  const ARABIC_DIGITS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
  const latinDigits = (s) => String(s).replace(/[٠-٩]/g, d => ARABIC_DIGITS[d]);

  const serialToISO = (n) => new Date(Math.round((n - 25569) * 86400000)).toISOString().slice(0, 10);
  function parseDate(v) {
    if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
    if (typeof v === 'number' && v > 20000 && v < 80000) return serialToISO(v);
    let s = latinDigits(String(v || '').trim());
    let m;
    if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/))) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; // dd/mm/yyyy (KSA)
    if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2})\b/))) return `20${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const d = new Date(s); if (!isNaN(d)) return d.toISOString().slice(0, 10);
    return null;
  }
  function normMethod(v) {
    const s = norm(latinDigits(v));
    if (!s) return 'cash';
    if (/mada|مدى|مدي/.test(s)) return 'mada';
    if (/tamara|تمارا/.test(s)) return 'tamara';
    if (/tabby|تابي|bnpl/.test(s)) return 'tabby';
    if (/visa|master|card|credit|debit|بطاقة|فيزا|ماستر|شبكة/.test(s)) return 'visa';
    if (/salla|سلة/.test(s)) return 'salla';
    if (/transfer|bank|تحويل|بنك|stc|apple|آبل/.test(s)) return 'transfer';
    return 'cash';
  }
  function matchBranch(v, branches, fallback) {
    const s = norm(v);
    if (!s) return fallback;
    for (const b of branches) { if (s === norm(b.code) || s === norm(b.ar) || s === norm(b.en) || s.includes(norm(b.code)) || norm(b.ar).includes(s) || norm(b.en).includes(s) || s.includes(norm(b.en)) || s.includes(norm(b.ar).replace('فرع ', ''))) return b.id; }
    return fallback;
  }

  function buildInvoices(rows, map, opts) {
    const { branches, defaultBranch } = opts;
    const headers = rows[0]; const out = []; const errors = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const g = (f) => map[f] === undefined || map[f] === null || map[f] === '' ? undefined : row[map[f]];
      const date = parseDate(g('date')); if (!date) { errors.push({ row: r + 1, reason: 'date' }); continue; }
      let total = anum(g('total')), sub = anum(g('subtotal')), vat = anum(g('vat'));
      if (isNaN(total) && !isNaN(sub)) total = +(sub * 1.15 + (isNaN(vat) ? 0 : vat - sub * 0.15)).toFixed(2);
      if (isNaN(total)) { errors.push({ row: r + 1, reason: 'total' }); continue; }
      if (isNaN(sub)) sub = +(total / 1.15).toFixed(2);
      if (isNaN(vat)) vat = +(total - sub).toFixed(2);
      const no = String(g('invoice') ?? '').trim() || `${date}-R${r}`;
      out.push({ no, date, branch: matchBranch(g('branch'), branches, defaultBranch), method: normMethod(g('method')), subtotal: +sub.toFixed(2), vat: +vat.toFixed(2), total: +total.toFixed(2) });
    }
    return { invoices: out, errors, headers };
  }

  // ---------------------------------------------------------------- SkySystem "تقرير فواتير المبيعات" (rptSalesVatTax.xlsx)
  const SKY = { invoice: ['رقم الفاتورة'], date: ['التاريخ'], time: ['الوقت'], amount: ['المبلغ'], discount: ['الخصم'], vat: ['مبلغ الضريبة', 'الضريبة'], total: ['الإجمالي', 'الاجمالي'] };
  const clean = (v) => String(v ?? '').replace(/[\s:]+/g, ' ').trim();
  function detectSky(rows) {
    for (let i = 0; i < Math.min(rows.length, 25); i++) {
      const r = rows[i] || []; const cols = {};
      r.forEach((c, j) => { const x = clean(c); for (const [k, labels] of Object.entries(SKY)) if (cols[k] === undefined && labels.includes(x)) cols[k] = j; });
      if (cols.invoice !== undefined && cols.date !== undefined && cols.total !== undefined && (cols.vat !== undefined || cols.amount !== undefined)) {
        const head = rows.slice(0, i).map(r2 => r2.filter(c => c !== null && c !== undefined).join(' ')).join(' ');
        const m = latinDigits(head).match(/من تاريخ\s*(\d{4}-\d{2}-\d{2}).*?الى تاريخ\s*(\d{4}-\d{2}-\d{2})/);
        return { headerRow: i, cols, title: /تقرير فواتير المبيعات/.test(head) ? 'تقرير فواتير المبيعات' : 'SkySystem', periodFrom: m ? m[1] : null, periodTo: m ? m[2] : null };
      }
    }
    return null;
  }
  function parseTime(v) {
    if (typeof v === 'number' && v < 1) { const m = Math.round(v * 1440); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
    const s = latinDigits(String(v || '')); const m = s.match(/(\d{1,2}):(\d{2})/); if (!m) return null;
    let h = +m[1]; if (/م|PM/i.test(s) && h < 12) h += 12; if (/ص|AM/i.test(s) && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m[2]}`;
  }
  function parseSky(rows, info, { branch, method }) {
    const c = info.cols; const invoices = [], errors = []; let fileTotals = null;
    for (let r = info.headerRow + 1; r < rows.length; r++) {
      const row = rows[r] || []; const no = String(row[c.invoice] ?? '').trim();
      const total = anum(row[c.total]);
      if (!no) { if (!fileTotals && !isNaN(total)) { const nums = row.map(anum).filter(x => !isNaN(x)); fileTotals = { total, vat: anum(row[c.vat]), amount: anum(row[c.amount]), raw: nums }; } continue; }
      const date = parseDate(row[c.date]); if (!date) { errors.push({ row: r + 1, reason: 'date' }); continue; }
      if (isNaN(total)) { errors.push({ row: r + 1, reason: 'total' }); continue; }
      let vat = anum(row[c.vat]); const amount = anum(row[c.amount]); const discount = c.discount !== undefined ? (anum(row[c.discount]) || 0) : 0;
      if (isNaN(vat)) vat = isNaN(amount) ? +(total - total / 1.15).toFixed(2) : +(total - amount + discount).toFixed(4);
      const subtotal = +(total - vat).toFixed(2);
      invoices.push({ no, date, time: c.time !== undefined ? parseTime(row[c.time]) : null, branch, method, subtotal, vat: +(+vat).toFixed(2), total: +(+total).toFixed(2), discount: +(+discount).toFixed(2) });
    }
    // the report's own totals row (values can sit in shifted columns) — compare by matching any number to our sums
    const sum = invoices.reduce((s, i) => ({ total: s.total + i.total, vat: s.vat + i.vat }), { total: 0, vat: 0 });
    let check = null;
    if (fileTotals) { const ft = fileTotals.raw.reduce((m, x) => Math.max(m, x), -Infinity); check = { fileTotal: ft, rowsTotal: +sum.total.toFixed(2), ok: Math.abs(ft - sum.total) < Math.max(0.05, ft * 0.0005) }; }
    return { invoices, errors, check };
  }
  async function sampleSkyXlsx(date, startNo) {
    if (!window.XLSX) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    let s = 4111; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const blank = () => new Array(15).fill(null); const aoa = [blank()];
    const r2 = blank(); r2[3] = 'تقرير فواتير المبيعات'; aoa.push(r2, blank());
    const r4 = blank(); r4[0] = `   من تاريخ   ${date}   الى تاريخ   ${date}`; r4[14] = ': نوع التقرير'; aoa.push(r4, blank());
    const h = blank(); h[0] = 'الإجمالي'; h[1] = 'مبلغ الضريبة'; h[6] = 'الخصم'; h[8] = 'المبلغ'; h[9] = 'الوقت'; h[11] = 'التاريخ'; h[13] = 'رقم الفاتورة'; aoa.push(h);
    const ar = (n, d) => n.toFixed(d).replace(/0+$/, '').replace(/\.$/, '').replace('.', '٫');
    const [y, m, dd] = date.split('-').map(Number); const serial = Date.UTC(y, m - 1, dd) / 86400000 + 25569;
    let T = 0, V = 0, A = 0; const n = 36;
    for (let i = 0; i < n; i++) { const total = +(8 + Math.pow(rnd(), 2.3) * 290).toFixed(2); const amt = total / 1.15, vat = total - amt; T += total; V += vat; A += amt;
      let hh = 10 + Math.floor(i / n * 13), mi = Math.floor(rnd() * 60), sc = Math.floor(rnd() * 60); const pm = hh >= 12; const h12 = hh > 12 ? hh - 12 : hh;
      const row = blank(); row[0] = ar(total, 2); row[1] = ar(vat, 4); row[6] = 0; row[8] = ar(amt, 4); row[9] = `${h12}:${String(mi).padStart(2, '0')}:${String(sc).padStart(2, '0')} ${pm ? 'م' : 'ص'}`; row[11] = serial; row[13] = 'S' + String(startNo + i).padStart(7, '0'); aoa.push(row); }
    aoa.push(blank()); const tr = blank(); tr[0] = ar(T, 2); tr[2] = ar(V, 4); tr[8] = ar(A, 4); aoa.push(tr); const z = blank(); z[5] = '0'; aoa.push(z);
    const ws = XLSX.utils.aoa_to_sheet(aoa); for (let r = 7; r < 7 + n; r++) { const ref = XLSX.utils.encode_cell({ r: r - 1, c: 11 }); if (ws[ref]) ws[ref].z = 'yyyy-mm-dd'; }
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'rptSalesVatTax');
    XLSX.writeFile(wb, `rptSalesVatTax_${date}.xlsx`);
  }

  function sampleCSV(branchCode, date) {
    const methods = ['Cash', 'Mada', 'Mada', 'Visa', 'Cash', 'Mada', 'Tabby', 'Mada', 'Cash', 'Mastercard'];
    let s = 7919; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const lines = ['Invoice No,Date,Branch,Payment Method,Net Amount,VAT,Total'];
    const n = 38;
    for (let i = 1; i <= n; i++) {
      const total = +(8 + Math.pow(rnd(), 2.3) * 290).toFixed(2); const net = +(total / 1.15).toFixed(2); const vat = +(total - net).toFixed(2);
      const hh = String(10 + Math.floor(rnd() * 13)).padStart(2, '0'), mm = String(Math.floor(rnd() * 60)).padStart(2, '0');
      const [y, mo, d] = date.split('-');
      lines.push(`${branchCode}-${date.replace(/-/g, '')}-${String(i).padStart(3, '0')},${d}/${mo}/${y} ${hh}:${mm},${branchCode},${methods[i % methods.length]},${net},${vat},${total}`);
    }
    return lines.join('\n');
  }

  return { autoMap, parseCSV, parseFile, buildInvoices, sampleCSV, detectSky, parseSky, parseTime, anum, sampleSkyXlsx, parseDate, normMethod, matchBranch, loadScript };
})();
