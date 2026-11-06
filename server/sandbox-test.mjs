// End-to-end test against ZATCA's Fatoora developer-portal sandbox.
// Issues the six compliance documents with Daftar's own engine, signs them, and runs ZATCA's checks.
//   node server/sandbox-test.mjs            (OTP for the developer portal is the fixed test value 123345)
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as F from './lib/fatoora.mjs';

const require = createRequire(import.meta.url);
require('../js/store.js'); require('../js/einvoice.js');
const S = globalThis.Store;
const ENV = process.env.ZATCA_ENV || 'sandbox';
const OTP = process.env.ZATCA_OTP || '123345';
const out = { env: ENV, startedAt: new Date().toISOString(), steps: [] };
const log = (step, data) => { out.steps.push({ step, ...data }); console.log(`\n== ${step}\n`, JSON.stringify(data, null, 1)); };

// 1) a tenant set up the way a real client would be (sandbox VAT number from ZATCA's samples)
const db = S.seedBlank({ name: 'مؤسسة اختبار دفتر', nameEn: 'Daftar Test Est.', vat: '399999999900003', cr: '1010010000', city: 'جدة' });
S.einvEnsure(db);
Object.assign(db.company, { legalName: 'مؤسسة اختبار دفتر التجارية', idType: 'CRN', idNo: '1010010000', addr: { street: 'شارع الأمير سلطان', building: '2322', district: 'حي المروج', city: 'جدة', postal: '23333', additional: '1234', country: 'SA' } });
const cust = S.saveCustomer(db, { name: 'شركة العميل للتجارة', vat: '300000000000003', idType: 'CRN', idNo: '1010101010', addr: { street: 'طريق الملك فهد', building: '1111', district: 'حي العليا', city: 'الرياض', postal: '12241', additional: '2222' } });
const dev = db.devices[0];
const lines = [{ name: 'شوكولاتة بلجيكية', qty: 2, price: 65, cat: 'S' }, { name: 'علبة هدايا', qty: 1, price: 120, discPct: 10, cat: 'S' }];
const d = S.todayISO();
const sInv = S.issueDoc(db, { kind: 'invoice', profile: 'standard', customerId: cust.id, payMethod: 'credit', date: d, lines });
const sCrn = S.issueDoc(db, { kind: 'credit', origId: sInv.id, reasonCode: 'return', payMethod: 'credit', date: d, lines: [lines[0]] });
const sDbn = S.issueDoc(db, { kind: 'debit', origId: sInv.id, reasonCode: 'extra', payMethod: 'credit', date: d, lines: [{ name: 'رسوم توصيل', qty: 1, price: 25, cat: 'S' }] });
const pInv = S.issueDoc(db, { kind: 'invoice', profile: 'simplified', payMethod: 'cash', date: d, lines: [...lines, { name: 'تصدير عينة', qty: 1, price: 50, cat: 'Z', vatex: 'VATEX-SA-32' }] });
const pCrn = S.issueDoc(db, { kind: 'credit', origId: pInv.id, reasonCode: 'return', payMethod: 'cash', date: d, lines: [lines[0]] });
const pDbn = S.issueDoc(db, { kind: 'debit', origId: pInv.id, reasonCode: 'price', payMethod: 'cash', date: d, lines: [{ name: 'فرق سعر', qty: 1, price: 10, cat: 'S' }] });
const docs = [sInv, sCrn, sDbn, pInv, pCrn, pDbn];
log('issued in Daftar', { docs: docs.map(x => ({ no: x.no, kind: x.kind, profile: x.profile, icv: x.icv, total: x.totals.payable })), chain: S.verifyChains(db)[0] });

// 2) onboarding: key + CSR → compliance CSID
const keys = F.generateKeyAndCsr({ env: ENV, serial: dev.serial, vat: db.company.vat, commonName: 'Daftar-EGS-' + dev.branch, orgName: db.company.legalNameEn || 'Daftar Test Est.', orgUnit: 'Jeddah Branch', location: 'Jeddah', industry: 'Retail' });
const cc = await F.complianceCsid(ENV, keys.csrPem, OTP);
log('compliance CSID', { http: cc.status, requestID: cc.json && cc.json.requestID, disposition: cc.json && cc.json.dispositionMessage, errors: cc.json && cc.json.errors, raw: cc.json ? undefined : cc.text.slice(0, 300) });
if (!cc.ok) { fs.writeFileSync(new URL('./sandbox-result.json', import.meta.url), JSON.stringify(out, null, 1)); process.exit(1); }
const auth = { token: cc.json.binarySecurityToken, secret: cc.json.secret };
const certB64 = F.tokenToCertB64(cc.json.binarySecurityToken);
const ci = F.certInfo(certB64); log('certificate', { subject: ci.x509.subject, issuer: ci.issuer, validTo: ci.x509.validTo });

// 3) compliance checks for all six document types
const signedAll = [];
for (const x of docs) {
  const signed = F.signDoc(x, { certificateB64: certB64, privateKeyPem: keys.privateKeyPem });
  if (signed.invoiceHash !== x.hash) throw new Error('hash mismatch between browser engine and signer for ' + x.no);
  signedAll.push({ x, signed });
  const r = await F.complianceCheck(ENV, auth, signed, x.uuid);
  log(`compliance check ${x.profile} ${x.kind} ${x.no}`, F.summarize(r));
}
fs.mkdirSync(new URL('./samples/', import.meta.url), { recursive: true });
for (const { x, signed } of signedAll) fs.writeFileSync(new URL(`./samples/${x.no}.xml`, import.meta.url), signed.xml);

// 4) production CSID, then real reporting / clearance calls
const pc = await F.productionCsid(ENV, auth, cc.json.requestID);
log('production CSID', { http: pc.status, disposition: pc.json && pc.json.dispositionMessage, errors: pc.json && pc.json.errors, raw: pc.json ? undefined : pc.text.slice(0, 300) });
if (pc.ok) {
  const pAuth = { token: pc.json.binarySecurityToken, secret: pc.json.secret }; const pCert = F.tokenToCertB64(pc.json.binarySecurityToken);
  const simp = F.signDoc(pInv, { certificateB64: pCert, privateKeyPem: keys.privateKeyPem });
  log('reporting (simplified)', F.summarize(await F.report(ENV, pAuth, simp, pInv.uuid)));
  const std = F.signDoc(sInv, { certificateB64: pCert, privateKeyPem: keys.privateKeyPem });
  const cr = await F.clear(ENV, pAuth, std, sInv.uuid);
  log('clearance (standard)', { ...F.summarize(cr), clearedInvoiceReturned: !!(cr.json && cr.json.clearedInvoice) });
}
out.finishedAt = new Date().toISOString();
fs.writeFileSync(new URL('./sandbox-result.json', import.meta.url), JSON.stringify(out, null, 1));
