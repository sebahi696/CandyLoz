// EGS onboarding: CSR → compliance CSID → the six compliance documents → production CSID.
import { createRequire } from 'node:module';
import * as F from './fatoora.mjs';

const require = createRequire(import.meta.url);
require('../../js/store.js'); require('../../js/einvoice.js');
const S = globalThis.Store;

// builds the six documents ZATCA asks for (standard + simplified × invoice, credit note, debit note)
// in a throw-away ledger that uses the real seller profile, so the compliance run exercises the real data.
export function complianceSamples(seller, serialHint) {
  const db = S.seedBlank({ name: seller.legalName, vat: seller.vat, cr: seller.idNo });
  S.einvEnsure(db);
  Object.assign(db.company, { legalName: seller.legalName, idType: seller.idType || 'CRN', idNo: seller.idNo, addr: { ...seller.address, country: 'SA' } });
  if (serialHint) db.devices[0].serial = serialHint;
  const cust = S.saveCustomer(db, { name: 'عميل اختبار الامتثال', vat: '300000000000003', idType: 'CRN', idNo: '1010101010', addr: { street: 'طريق الملك فهد', building: '1111', district: 'حي العليا', city: 'الرياض', postal: '12241' } });
  const d = S.todayISO(); const lines = [{ name: 'صنف اختبار', qty: 2, price: 50, cat: 'S' }];
  const a = S.issueDoc(db, { kind: 'invoice', profile: 'standard', customerId: cust.id, payMethod: 'credit', date: d, lines });
  const b = S.issueDoc(db, { kind: 'credit', origId: a.id, reasonCode: 'return', payMethod: 'credit', date: d, lines: [{ ...lines[0], qty: 1 }] });
  const c = S.issueDoc(db, { kind: 'debit', origId: a.id, reasonCode: 'extra', payMethod: 'credit', date: d, lines: [{ name: 'رسوم إضافية', qty: 1, price: 10, cat: 'S' }] });
  const e = S.issueDoc(db, { kind: 'invoice', profile: 'simplified', payMethod: 'cash', date: d, lines });
  const f = S.issueDoc(db, { kind: 'credit', origId: e.id, reasonCode: 'return', payMethod: 'cash', date: d, lines: [{ ...lines[0], qty: 1 }] });
  const g = S.issueDoc(db, { kind: 'debit', origId: e.id, reasonCode: 'price', payMethod: 'cash', date: d, lines: [{ name: 'فرق سعر', qty: 1, price: 5, cat: 'S' }] });
  return [a, b, c, e, f, g];
}

/* egs: { env, otp, serial, seller:{legalName, legalNameEn, vat, idType, idNo, address}, branchName, location, industry } */
export async function onboard(egs, onStep = () => {}) {
  const env = egs.env || 'sandbox'; const steps = [];
  const step = (name, data) => { const s = { name, at: new Date().toISOString(), ...data }; steps.push(s); onStep(s); return s; };
  const keys = F.generateKeyAndCsr({ env, serial: egs.serial, vat: egs.seller.vat, commonName: egs.commonName || ('Daftar-' + (egs.branchCode || 'EGS')), orgName: egs.seller.legalNameEn || egs.seller.legalName, orgUnit: egs.branchName || 'Main branch', location: egs.location || egs.seller.address.city, industry: egs.industry || 'Retail' });
  step('csr', { ok: true });
  const cc = await F.complianceCsid(env, keys.csrPem, egs.otp);
  step('compliance_csid', { ok: cc.ok, http: cc.status, detail: cc.json ? (cc.json.dispositionMessage || cc.json.errors) : cc.text.slice(0, 200) });
  if (!cc.ok) return { ok: false, steps };
  const auth = { token: cc.json.binarySecurityToken, secret: cc.json.secret }; const ccert = F.tokenToCertB64(cc.json.binarySecurityToken);
  let allOk = true;
  for (const x of complianceSamples(egs.seller, egs.serial)) {
    const r = F.summarize(await F.complianceCheck(env, auth, F.signDoc(x, { certificateB64: ccert, privateKeyPem: keys.privateKeyPem }), x.uuid));
    const ok = r.http === 200 && !r.errors.length; allOk = allOk && ok;
    step(`check_${x.profile}_${x.kind}`, { ok, status: r.status, errors: r.errors, warnings: r.warnings });
  }
  if (!allOk) return { ok: false, steps };
  const pc = await F.productionCsid(env, auth, cc.json.requestID);
  step('production_csid', { ok: pc.ok, http: pc.status, detail: pc.json ? (pc.json.dispositionMessage || pc.json.errors) : pc.text.slice(0, 200) });
  if (!pc.ok) return { ok: false, steps };
  const pcert = F.tokenToCertB64(pc.json.binarySecurityToken); const info = F.certInfo(pcert);
  return { ok: true, steps, credentials: { env, privateKeyPem: keys.privateKeyPem, certificateB64: pcert, secret: pc.json.secret, token: pc.json.binarySecurityToken, expires: info.x509.validTo, complianceRequestId: cc.json.requestID } };
}

// sign + report (simplified) or clear (standard) one Daftar document with the EGS production credentials
export async function submit(doc, cred) {
  const signed = F.signDoc(doc, { certificateB64: F.tokenToCertB64(cred.token), privateKeyPem: cred.privateKeyPem });
  const auth = { token: cred.token, secret: cred.secret };
  const r = doc.profile === 'standard' ? await F.clear(cred.env, auth, signed, doc.uuid) : await F.report(cred.env, auth, signed, doc.uuid);
  const sum = F.summarize(r);
  const okStatus = { REPORTED: 'reported', CLEARED: 'cleared' }[sum.status];
  return {
    status: okStatus || 'rejected',
    http: sum.http, messages: [...sum.errors.map(m => 'E ' + m), ...sum.warnings.map(m => 'W ' + m)], env: cred.env,
    qr: signed.qr, signedHash: signed.invoiceHash, clearedXml: r.json && r.json.clearedInvoice ? r.json.clearedInvoice : null,
  };
}
