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
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
      return rows.filter(r => r && r.some(c => String(c ?? '').trim() !== ''));
    }
    const text = await file.text();
    return parseCSV(text);
  }
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }

  const num = (v) => { if (v === null || v === undefined) return NaN; const s = String(v).replace(/[^\d.\-]/g, '').replace(/^(-?)(.*)-$/, '$1$2'); return s === '' ? NaN : parseFloat(s); };
  const ARABIC_DIGITS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
  const latinDigits = (s) => String(s).replace(/[٠-٩]/g, d => ARABIC_DIGITS[d]);

  function parseDate(v) {
    if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
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
    if (/tabby|tamara|تابي|تمارا|bnpl/.test(s)) return 'tabby';
    if (/visa|master|card|credit|debit|بطاقة|فيزا|ماستر|شبكة/.test(s)) return 'visa';
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
      let total = num(g('total')), sub = num(g('subtotal')), vat = num(g('vat'));
      if (isNaN(total) && !isNaN(sub)) total = +(sub * 1.15 + (isNaN(vat) ? 0 : vat - sub * 0.15)).toFixed(2);
      if (isNaN(total)) { errors.push({ row: r + 1, reason: 'total' }); continue; }
      if (isNaN(sub)) sub = +(total / 1.15).toFixed(2);
      if (isNaN(vat)) vat = +(total - sub).toFixed(2);
      const no = String(g('invoice') ?? '').trim() || `${date}-R${r}`;
      out.push({ no, date, branch: matchBranch(g('branch'), branches, defaultBranch), method: normMethod(g('method')), subtotal: +sub.toFixed(2), vat: +vat.toFixed(2), total: +total.toFixed(2) });
    }
    return { invoices: out, errors, headers };
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

  return { autoMap, parseCSV, parseFile, buildInvoices, sampleCSV, parseDate, normMethod, matchBranch, loadScript };
})();
