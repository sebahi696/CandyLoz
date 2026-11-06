/* Daftar — ZATCA e-invoicing core (Fatoora). Pure JS, runs in the browser and in Node.
   - SHA-256, Base64, TLV QR (Phase 1 tags 1–5; Phase 2 tags 6–9 added by the signer)
   - UBL 2.1 XML in ZATCA's KSA profile, written minified and already in C14N form, so the
     hash computed here equals the hash ZATCA computes after its XPath transforms + C14N 1.1.
   - Validation rules (subset of BR-KSA / BR-CO) run before an invoice is issued. */
(function (root) {
  // ---------------------------------------------------------------- bytes
  const utf8 = (s) => (typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s) : Uint8Array.from(Buffer.from(s, 'utf8')));
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function b64(bytes) {
    let out = '', i = 0;
    for (; i + 2 < bytes.length; i += 3) { const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]; out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + B64[n >> 6 & 63] + B64[n & 63]; }
    if (i < bytes.length) { const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8); out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + (i + 1 < bytes.length ? B64[n >> 6 & 63] : '=') + '='; }
    return out;
  }
  function unb64(s) { s = s.replace(/[^A-Za-z0-9+/]/g, ''); const out = []; let buf = 0, bits = 0; for (const c of s) { buf = (buf << 6) | B64.indexOf(c); bits += 6; if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); } } return Uint8Array.from(out); }
  const hex = (bytes) => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');

  // ---------------------------------------------------------------- SHA-256 (sync)
  const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  function sha256(input) {
    const msg = typeof input === 'string' ? utf8(input) : input;
    const len = msg.length, total = ((len + 9 + 63) >> 6) << 6; const m = new Uint8Array(total); m.set(msg); m[len] = 0x80;
    const bitLen = len * 8; const dv = new DataView(m.buffer); dv.setUint32(total - 4, bitLen >>> 0); dv.setUint32(total - 8, Math.floor(bitLen / 0x100000000));
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]); const W = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < total; o += 64) {
      for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) { const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3), s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10); W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0; }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) { const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[i] + W[i]) >>> 0, S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) >>> 0; h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0; }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    const out = new Uint8Array(32); const ov = new DataView(out.buffer); for (let i = 0; i < 8; i++) ov.setUint32(i * 4, H[i]); return out;
  }
  const sha256b64 = (s) => b64(sha256(s));
  // ZATCA seed for the first invoice of every EGS unit: base64( hex( sha256("0") ) )
  const FIRST_PIH = 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==';

  function uuid4() {
    const r = new Uint8Array(16);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(r); else for (let i = 0; i < 16; i++) r[i] = Math.floor(Math.random() * 256);
    r[6] = (r[6] & 0x0f) | 0x40; r[8] = (r[8] & 0x3f) | 0x80; const h = hex(r);
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  // ---------------------------------------------------------------- QR (TLV → Base64)
  function tlv(tags) {
    const parts = [];
    for (const [tag, val] of tags) {
      const v = val instanceof Uint8Array ? val : utf8(String(val));
      if (v.length > 255) { parts.push(Uint8Array.from([tag, 0x81, v.length]), v); } else parts.push(Uint8Array.from([tag, v.length]), v);
    }
    const n = parts.reduce((s, p) => s + p.length, 0); const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
  }
  function decodeTlv(base64) {
    const b = unb64(base64); const out = {}; let i = 0;
    while (i < b.length) { const tag = b[i++]; let len = b[i++]; if (len === 0x81) len = b[i++]; const v = b.slice(i, i + len); i += len; out[tag] = (tag <= 6 ? (typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(v) : Buffer.from(v).toString('utf8')) : b64(v)); }
    return out;
  }
  const money2 = (n) => { const v = Number(n) || 0; return (Math.sign(v) * Math.round(Number((Math.abs(v) * 100).toFixed(6))) / 100).toFixed(2); };
  // Phase 1 (generation) QR: seller name, VAT number, timestamp, total incl. VAT, VAT total
  const qrPhase1 = ({ sellerName, vat, timestamp, total, vatTotal }) => b64(tlv([[1, sellerName], [2, vat], [3, timestamp], [4, money2(total)], [5, money2(vatTotal)]]));

  // ---------------------------------------------------------------- reference data
  const TYPE = { invoice: '388', credit: '381', debit: '383' };
  const SUBTYPE = { standard: '0100000', simplified: '0200000' };
  const VAT_CATS = { S: 15, Z: 0, E: 0, O: 0 };
  // VATEX-SA exemption / zero-rating reasons (ZATCA code list)
  const VATEX = [
    { code: 'VATEX-SA-29', cat: 'E', ar: 'الخدمات المالية', en: 'Financial services mentioned in Article 29 of the VAT Regulations' },
    { code: 'VATEX-SA-29-7', cat: 'E', ar: 'عقد تأمين على الحياة', en: 'Life insurance services mentioned in Article 29 of the VAT Regulations' },
    { code: 'VATEX-SA-30', cat: 'E', ar: 'التوريدات العقارية المعفاة', en: 'Real estate transactions mentioned in Article 30 of the VAT Regulations' },
    { code: 'VATEX-SA-32', cat: 'Z', ar: 'صادرات السلع', en: 'Export of goods' },
    { code: 'VATEX-SA-33', cat: 'Z', ar: 'صادرات الخدمات', en: 'Export of services' },
    { code: 'VATEX-SA-34-1', cat: 'Z', ar: 'النقل الدولي للسلع', en: 'The international transport of Goods' },
    { code: 'VATEX-SA-34-2', cat: 'Z', ar: 'النقل الدولي للركاب', en: 'International transport of passengers' },
    { code: 'VATEX-SA-34-3', cat: 'Z', ar: 'الخدمات المرتبطة بالنقل الدولي', en: 'Services directly connected and incidental to a Supply of international passenger transport' },
    { code: 'VATEX-SA-34-4', cat: 'Z', ar: 'توريد وسائل النقل المؤهلة', en: 'Supply of a qualifying means of transport' },
    { code: 'VATEX-SA-34-5', cat: 'Z', ar: 'الخدمات المرتبطة بنقل السلع أو الركاب', en: 'Any services relating to Goods or passenger transportation, as defined in article twenty five of these Regulations' },
    { code: 'VATEX-SA-35', cat: 'Z', ar: 'الأدوية والمعدات الطبية', en: 'Medicines and medical equipment' },
    { code: 'VATEX-SA-36', cat: 'Z', ar: 'المعادن المؤهلة', en: 'Qualifying metals' },
    { code: 'VATEX-SA-EDU', cat: 'Z', ar: 'الخدمات التعليمية الخاصة للمواطن', en: 'Private education to citizen' },
    { code: 'VATEX-SA-HEA', cat: 'Z', ar: 'الخدمات الصحية الخاصة للمواطن', en: 'Private healthcare to citizen' },
    { code: 'VATEX-SA-MLTRY', cat: 'Z', ar: 'توريد السلع العسكرية المؤهلة', en: 'Supply of qualified military goods' },
    { code: 'VATEX-SA-OOS', cat: 'O', ar: 'خارج نطاق الضريبة', en: 'Not subject to VAT' },
  ];
  const BUYER_ID_TYPES = [
    { v: 'TIN', ar: 'الرقم المميز (TIN)', en: 'Tax identification number' }, { v: 'CRN', ar: 'السجل التجاري', en: 'Commercial registration' },
    { v: 'MOM', ar: 'ترخيص وزارة الشؤون البلدية', en: 'MOMRAH license' }, { v: 'MLS', ar: 'ترخيص وزارة الموارد البشرية', en: 'MHRSD license' },
    { v: '700', ar: 'الرقم الموحد 700', en: '700 number' }, { v: 'SAG', ar: 'ترخيص وزارة الاستثمار', en: 'MISA license' },
    { v: 'NAT', ar: 'الهوية الوطنية', en: 'National ID' }, { v: 'GCC', ar: 'هوية خليجية', en: 'GCC ID' }, { v: 'IQA', ar: 'الإقامة', en: 'Iqama' },
    { v: 'PAS', ar: 'جواز السفر', en: 'Passport' }, { v: 'OTH', ar: 'أخرى', en: 'Other ID' },
  ];
  const SELLER_ID_TYPES = ['CRN', 'MOM', 'MLS', '700', 'SAG', 'OTH'];
  const PAY_MEANS = { cash: '10', card: '48', transfer: '42', credit: '30', other: '1' };
  const NOTE_REASONS = [
    { v: 'return', ar: 'إرجاع بضاعة', en: 'Goods returned' }, { v: 'price', ar: 'تعديل السعر', en: 'Price adjustment' },
    { v: 'discount', ar: 'خصم لاحق', en: 'Post-sale discount' }, { v: 'cancel', ar: 'إلغاء الفاتورة', en: 'Cancellation of the invoice' },
    { v: 'error', ar: 'تصحيح خطأ في الفاتورة', en: 'Correction of an invoice error' }, { v: 'extra', ar: 'قيمة إضافية', en: 'Additional amount charged' },
  ];

  // ---------------------------------------------------------------- validation
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const validVat = (v) => /^3\d{13}3$/.test(digits(v)) && digits(v).length === 15;
  function checkAddress(a, prefix, out) {
    a = a || {};
    if (!a.street) out.push(prefix + 'street');
    if (!/^\d{4}$/.test(String(a.building || ''))) out.push(prefix + 'building');
    if (!a.district) out.push(prefix + 'district');
    if (!a.city) out.push(prefix + 'city');
    if (!/^\d{5}$/.test(String(a.postal || ''))) out.push(prefix + 'postal');
  }
  function validateSeller(s) {
    const out = [];
    if (!s || !s.legalName) out.push('seller_name');
    if (!validVat(s && s.vat)) out.push('seller_vat');
    if (!s || !s.idType || !SELLER_ID_TYPES.includes(s.idType) || !String(s.idNo || '').trim()) out.push('seller_id');
    else if (s.idType === 'CRN' && !/^\d{10}$/.test(digits(s.idNo))) out.push('seller_crn');
    checkAddress(s && s.address, 'seller_', out);
    return out;
  }
  function validateBuyer(b, profile) {
    const out = [];
    if (profile !== 'standard') return out;
    if (!b || !b.name) out.push('buyer_name');
    const hasVat = b && b.vat && String(b.vat).trim();
    if (hasVat && !validVat(b.vat)) out.push('buyer_vat');
    if (!hasVat && !(b && b.idType && String(b.idNo || '').trim())) out.push('buyer_id');
    if (b && (b.address || {}).country && b.address.country !== 'SA') { if (!b.address.street || !b.address.city) out.push('buyer_address'); }
    else checkAddress(b && b.address, 'buyer_', out);
    return out;
  }
  function validateDoc(doc) {
    const out = [];
    if (!doc.lines || !doc.lines.length) out.push('no_lines');
    for (const l of doc.lines || []) {
      if (!l.name) out.push('line_name');
      if (!(l.qty > 0)) out.push('line_qty');
      if (!(l.price >= 0)) out.push('line_price');
      if (!VAT_CATS.hasOwnProperty(l.cat)) out.push('line_cat');
      if (l.cat !== 'S' && !l.vatex) out.push('line_vatex');
    }
    if ((doc.kind === 'credit' || doc.kind === 'debit') && (!doc.billingRef || !doc.reason)) out.push('note_ref');
    if (!(doc.totals && doc.totals.payable >= 0)) out.push('totals');
    return [...new Set(out)];
  }

  // ---------------------------------------------------------------- totals (line → category → document)
  const r2 = (n) => { const v = Number(n) || 0; return Math.sign(v) * Math.round(Number((Math.abs(v) * 100).toFixed(6))) / 100; };
  function computeLines(lines) {
    return lines.map((l, i) => {
      const qty = Number(l.qty) || 0, gross = r2(l.price), pct = Math.min(100, Math.max(0, Number(l.discPct) || 0));
      const net = r2(gross * (1 - pct / 100)); const ext = r2(qty * net); const rate = VAT_CATS[l.cat] ?? 15; const vat = r2(ext * rate / 100);
      const vx = l.cat === 'S' ? null : VATEX.find(v => v.code === l.vatex);
      return { ...l, id: i + 1, qty, price: gross, discPct: pct, netPrice: net, unitDisc: r2(gross - net), discount: r2(qty * (gross - net)), ext, rate, vat, total: r2(ext + vat), vatexText: vx ? vx.en : (l.vatexText || null) };
    });
  }
  function computeTotals(lines) {
    const cats = {};
    for (const l of lines) { const k = l.cat + '|' + (l.vatex || ''); const c = (cats[k] ||= { cat: l.cat, rate: l.rate, vatex: l.vatex || null, vatexText: l.vatexText || null, taxable: 0, vat: 0 }); c.taxable = r2(c.taxable + l.ext); }
    for (const c of Object.values(cats)) c.vat = r2(c.taxable * c.rate / 100);
    const lineExt = r2(lines.reduce((s, l) => s + l.ext, 0)); const vat = r2(Object.values(cats).reduce((s, c) => s + c.vat, 0));
    const discount = r2(lines.reduce((s, l) => s + l.discount, 0));
    return { lineExt, discount, taxExcl: lineExt, vat, taxIncl: r2(lineExt + vat), payable: r2(lineExt + vat), byCat: Object.values(cats) };
  }

  // ---------------------------------------------------------------- UBL 2.1 XML (minified, canonical form)
  const xt = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#xD;');
  const xa = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/\t/g, '&#x9;').replace(/\n/g, '&#xA;').replace(/\r/g, '&#xD;');
  const el = (name, val, attrs) => `<${name}${attrs ? Object.keys(attrs).sort().map(k => ` ${k}="${xa(attrs[k])}"`).join('') : ''}>${val}</${name}>`;
  const tx = (name, val, attrs) => el(name, xt(val), attrs);
  const amt = (name, v) => tx(name, money2(v), { currencyID: 'SAR' });
  const NS = { inv: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2', cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2', cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2', ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2' };

  function addressXml(a) {
    a = a || {};
    return el('cac:PostalAddress', [a.street && tx('cbc:StreetName', a.street), a.additional && tx('cbc:AdditionalStreetName', a.additional), a.building && tx('cbc:BuildingNumber', a.building), a.plot && tx('cbc:PlotIdentification', a.plot), a.district && tx('cbc:CitySubdivisionName', a.district), a.city && tx('cbc:CityName', a.city), a.postal && tx('cbc:PostalZone', a.postal), a.region && tx('cbc:CountrySubentity', a.region), el('cac:Country', tx('cbc:IdentificationCode', a.country || 'SA'))].filter(Boolean).join(''));
  }
  function partyXml(p, isSeller) {
    const id = p.idType && String(p.idNo || '').trim() ? el('cac:PartyIdentification', tx('cbc:ID', String(p.idNo).trim(), { schemeID: p.idType })) : '';
    const tax = p.vat ? el('cac:PartyTaxScheme', tx('cbc:CompanyID', digits(p.vat)) + el('cac:TaxScheme', tx('cbc:ID', 'VAT'))) : (isSeller ? '' : el('cac:PartyTaxScheme', el('cac:TaxScheme', tx('cbc:ID', 'VAT'))));
    return el('cac:Party', id + (p.address ? addressXml(p.address) : '') + tax + (p.legalName || p.name ? el('cac:PartyLegalEntity', tx('cbc:RegistrationName', p.legalName || p.name)) : ''));
  }
  function taxCategoryXml(tag, c) {
    return el(tag, tx('cbc:ID', c.cat) + tx('cbc:Percent', c.rate.toFixed(2)) + (c.cat !== 'S' && c.vatex ? tx('cbc:TaxExemptionReasonCode', c.vatex) + tx('cbc:TaxExemptionReason', c.vatexText || c.vatex) : '') + el('cac:TaxScheme', tx('cbc:ID', 'VAT')));
  }
  /* doc: { no, uuid, kind, profile, date, time, icv, pih, billingRef, reason, payMeans, deliveryDate, lines (computed), totals (computed), note }
     opts.signed: { ublExtensions, qr, signatureId } — inserted by the Phase-2 signer (server). */
  function buildXml(doc, seller, buyer, opts = {}) {
    const s = opts.signed || null;
    const head = [
      s ? `<ext:UBLExtensions>${s.ublExtensions}</ext:UBLExtensions>` : '',
      tx('cbc:ProfileID', 'reporting:1.0'), tx('cbc:ID', doc.no), tx('cbc:UUID', doc.uuid), tx('cbc:IssueDate', doc.date), tx('cbc:IssueTime', doc.time),
      tx('cbc:InvoiceTypeCode', TYPE[doc.kind], { name: SUBTYPE[doc.profile] }),
      doc.note ? tx('cbc:Note', doc.note, { languageID: 'ar' }) : '',
      tx('cbc:DocumentCurrencyCode', 'SAR'), tx('cbc:TaxCurrencyCode', 'SAR'),
      doc.billingRef ? el('cac:BillingReference', el('cac:InvoiceDocumentReference', tx('cbc:ID', doc.billingRef))) : '',
      el('cac:AdditionalDocumentReference', tx('cbc:ID', 'ICV') + tx('cbc:UUID', String(doc.icv))),
      el('cac:AdditionalDocumentReference', tx('cbc:ID', 'PIH') + el('cac:Attachment', tx('cbc:EmbeddedDocumentBinaryObject', doc.pih, { mimeCode: 'text/plain' }))),
      s ? el('cac:AdditionalDocumentReference', tx('cbc:ID', 'QR') + el('cac:Attachment', tx('cbc:EmbeddedDocumentBinaryObject', s.qr, { mimeCode: 'text/plain' }))) : '',
      s ? el('cac:Signature', tx('cbc:ID', 'urn:oasis:names:specification:ubl:signature:Invoice') + tx('cbc:SignatureMethod', 'urn:oasis:names:specification:ubl:dsig:enveloped:xades')) : '',
      el('cac:AccountingSupplierParty', partyXml(seller, true)),
      el('cac:AccountingCustomerParty', buyer && (buyer.name || buyer.legalName) ? partyXml(buyer, false) : ''),
      doc.profile === 'standard' || doc.deliveryDate ? el('cac:Delivery', tx('cbc:ActualDeliveryDate', doc.deliveryDate || doc.date)) : '',
      el('cac:PaymentMeans', tx('cbc:PaymentMeansCode', PAY_MEANS[doc.payMeans] || doc.payMeans || '10') + (doc.kind !== 'invoice' && doc.reason ? tx('cbc:InstructionNote', doc.reason) : '')),
    ];
    const T = doc.totals;
    const taxTotals = el('cac:TaxTotal', amt('cbc:TaxAmount', T.vat)) + el('cac:TaxTotal', amt('cbc:TaxAmount', T.vat) + T.byCat.map(c => el('cac:TaxSubtotal', amt('cbc:TaxableAmount', c.taxable) + amt('cbc:TaxAmount', c.vat) + taxCategoryXml('cac:TaxCategory', c))).join(''));
    const legal = el('cac:LegalMonetaryTotal', amt('cbc:LineExtensionAmount', T.lineExt) + amt('cbc:TaxExclusiveAmount', T.taxExcl) + amt('cbc:TaxInclusiveAmount', T.taxIncl) + amt('cbc:AllowanceTotalAmount', 0) + amt('cbc:PrepaidAmount', 0) + amt('cbc:PayableAmount', T.payable));
    const lines = doc.lines.map(l => el('cac:InvoiceLine', tx('cbc:ID', l.id) + tx('cbc:InvoicedQuantity', String(l.qty), { unitCode: l.unit || 'PCE' }) + amt('cbc:LineExtensionAmount', l.ext)
      + el('cac:TaxTotal', amt('cbc:TaxAmount', l.vat) + amt('cbc:RoundingAmount', l.total))
      + el('cac:Item', tx('cbc:Name', l.name) + taxCategoryXml('cac:ClassifiedTaxCategory', { cat: l.cat, rate: l.rate, vatex: null }))
      + el('cac:Price', amt('cbc:PriceAmount', l.netPrice) + (l.unitDisc > 0 ? el('cac:AllowanceCharge', tx('cbc:ChargeIndicator', 'false') + tx('cbc:AllowanceChargeReason', 'discount') + amt('cbc:Amount', l.unitDisc) + amt('cbc:BaseAmount', l.price)) : '')))).join('');
    const body = head.join('') + taxTotals + legal + lines;
    return `<Invoice xmlns="${NS.inv}" xmlns:cac="${NS.cac}" xmlns:cbc="${NS.cbc}" xmlns:ext="${NS.ext}">${body}</Invoice>`;
  }
  const xmlFile = (xml) => '<?xml version="1.0" encoding="UTF-8"?>\n' + xml;
  // invoice hash = base64(sha256(C14N of the invoice without UBLExtensions, cac:Signature and the QR reference))
  function invoiceHash(doc, seller, buyer) { return sha256b64(buildXml(doc, seller, buyer)); }

  root.Zatca = { utf8, b64, unb64, hex, sha256, sha256b64, FIRST_PIH, uuid4, tlv, decodeTlv, qrPhase1, money2, TYPE, SUBTYPE, VAT_CATS, VATEX, BUYER_ID_TYPES, SELLER_ID_TYPES, PAY_MEANS, NOTE_REASONS, validVat, validateSeller, validateBuyer, validateDoc, computeLines, computeTotals, buildXml, xmlFile, invoiceHash, NS, el, tx };
})(typeof window !== 'undefined' ? window : globalThis);
