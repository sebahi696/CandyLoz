/* Daftar — invoice reader: photo → text (Tesseract.js, loaded on demand) → fields
   Production plan: swap recognize() for a vision-LLM extraction endpoint; parse() stays as the fallback. */
window.InvoiceReader = (() => {
  const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  let worker = null;

  async function ensureWorker(onProgress) {
    if (worker) return worker;
    if (!window.Tesseract) await window.PosImport.loadScript(TESS);
    worker = await Tesseract.createWorker(['ara', 'eng'], 1, {
      logger: (m) => { if (onProgress) onProgress(m); },
    });
    return worker;
  }

  // downscale big phone photos so recognition takes seconds, not minutes
  function prepareImage(file, maxSide = 1600) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        // light contrast boost + grayscale helps printed receipts
        const d = ctx.getImageData(0, 0, c.width, c.height); const p = d.data;
        for (let i = 0; i < p.length; i += 4) { const g = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; const v = Math.max(0, Math.min(255, (g - 128) * 1.25 + 128)); p[i] = p[i + 1] = p[i + 2] = v; }
        ctx.putImageData(d, 0, 0);
        URL.revokeObjectURL(url);
        resolve({ dataUrl: c.toDataURL('image/jpeg', 0.9), previewUrl: URL.createObjectURL(file) });
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function recognize(file, onProgress) {
    const { dataUrl, previewUrl } = await prepareImage(file);
    const w = await ensureWorker(onProgress);
    const { data } = await w.recognize(dataUrl);
    return { text: data.text || '', previewUrl, confidence: data.confidence };
  }

  const AR = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
  const latin = (s) => s.replace(/[٠-٩]/g, d => AR[d]);

  function parse(rawText, ctx) {
    const text = latin(rawText).replace(/[|]/g, ' ');
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
    const found = {};

    // VAT numbers: 15 digits, 3…3 — ignore our own company number
    const vats = [...text.replace(/[\s\-]/g, '').matchAll(/3\d{13}3/g)].map(m => m[0]).filter(v => v !== (ctx.companyVat || ''));
    if (vats.length) found.vat = vats[0];

    // dates
    const dm = text.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/) || text.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
    if (dm) found.date = dm[1].length === 4 ? `${dm[1]}-${dm[2].padStart(2, '0')}-${dm[3].padStart(2, '0')}` : `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;

    // invoice number: near keywords
    for (const l of lines) {
      const m = l.match(/(?:invoice|inv|فاتورة|رقم الفاتورة|no\.?|#)\s*[:#\-]?\s*([A-Z]{0,4}[-\/]?\d{3,}[-\/]?\d*)/i);
      if (m && !/3\d{13}3/.test(m[1])) { found.no = m[1]; break; }
    }

    // amounts: pick the line with keywords; fallback to the largest money-looking number
    const money = (l) => { const ms = [...l.matchAll(/(?<![\d])(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})|\d+\.\d{2})(?![\d])/g)].map(m => parseFloat(m[1].replace(/[,\s]/g, ''))); return ms.length ? ms[ms.length - 1] : null; };
    const pick = (re) => { for (const l of lines) if (re.test(l)) { const v = money(l); if (v !== null) return v; } return null; };
    found.total = pick(/(grand\s*total|total\s*(incl|with|amount)|الإجمالي\s*(شامل|مع|النهائي)|الاجمالي\s*(شامل|مع|النهائي)|المجموع\s*(شامل|النهائي)|إجمالي\s*الفاتورة|اجمالي\s*الفاتورة|amount\s*due|net\s*payable)/i)
      ?? pick(/(^|\s)(total|الإجمالي|الاجمالي|المجموع)(\s|$|:)/i);
    found.vatAmount = pick(/(vat\s*(amount|15)|tax\s*amount|ضريبة\s*القيمة|قيمة\s*الضريبة|الضريبة\s*15|ضريبة\s*15|vat(?!\s*(no|number|reg|#)))/i);
    found.subtotal = pick(/(sub\s*total|subtotal|net\s*amount|taxable|before\s*(vat|tax)|قبل\s*الضريبة|المجموع\s*الفرعي|الخاضع|الصافي)/i);

    if (found.total == null) { const all = lines.map(money).filter(v => v !== null && v < 10000000); if (all.length) found.total = Math.max(...all); }
    // reconcile with 15% VAT
    const r2 = (n) => Math.round(n * 100) / 100;
    if (found.total != null) {
      if (found.subtotal == null && found.vatAmount != null && found.vatAmount < found.total) found.subtotal = r2(found.total - found.vatAmount);
      if (found.subtotal == null) found.subtotal = r2(found.total / 1.15);
      if (found.vatAmount == null) found.vatAmount = r2(found.total - found.subtotal);
      // sanity: if sub+vat far from total, trust total
      if (Math.abs(found.subtotal + found.vatAmount - found.total) > 1) { found.subtotal = r2(found.total / 1.15); found.vatAmount = r2(found.total - found.subtotal); }
    } else if (found.subtotal != null) { found.vatAmount = found.vatAmount ?? r2(found.subtotal * 0.15); found.total = r2(found.subtotal + found.vatAmount); }

    // supplier name guess: first line with letters that is not a keyword line
    const nameLine = lines.find(l => /[؀-ۿA-Za-z]{3,}/.test(l) && !/(invoice|فاتورة|vat|ضريب|tax|date|تاريخ|total|الإجمالي|tel|هاتف|address|عنوان)/i.test(l) && !/3\d{13}3/.test(l));
    if (nameLine) found.name = nameLine.slice(0, 60);

    const fields = ['vat', 'date', 'no', 'total'];
    found.score = fields.filter(f => found[f] != null && found[f] !== '').length / fields.length;
    return found;
  }

  async function terminate() { if (worker) { await worker.terminate(); worker = null; } }

  return { recognize, parse, prepareImage, terminate };
})();
