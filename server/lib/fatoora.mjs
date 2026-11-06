// Daftar ↔ ZATCA Fatoora: keys, CSR, CSIDs, XAdES signing, Phase 2 QR, and the Fatoora REST APIs.
// Node 18+, no npm dependencies (uses Node crypto + the openssl CLI for the CSR).
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('../../js/zatca.js'); // shared with the browser app → globalThis.Zatca
export const Z = globalThis.Zatca;

export const ENVS = {
  sandbox: { base: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal', template: 'TSTZATCA-Code-Signing' },
  simulation: { base: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation', template: 'PREZATCA-Code-Signing' },
  production: { base: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core', template: 'ZATCA-Code-Signing' },
};

// ---------------------------------------------------------------- keys & CSR
export function generateKeyAndCsr({ env = 'sandbox', serial, vat, commonName, orgName, orgUnit, location, industry, invoiceTypes = '1100' }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'daftar-csr-'));
  try {
    const keyPath = path.join(dir, 'key.pem'), cfgPath = path.join(dir, 'csr.cnf'), csrPath = path.join(dir, 'csr.pem');
    execFileSync('openssl', ['ecparam', '-name', 'secp256k1', '-genkey', '-noout', '-out', keyPath]);
    const clean = (s) => String(s).replace(/[\r\n=]/g, ' ').trim();
    // format accepted by Fatoora (template OID as UTF8String, SAN dirName with SN/UID/title/registeredAddress/businessCategory)
    fs.writeFileSync(cfgPath, `[ req ]
prompt = no
utf8 = yes
string_mask = utf8only
distinguished_name = dn
req_extensions = v3_req
[ dn ]
commonName = ${clean(commonName)}
organizationalUnitName = ${clean(orgUnit)}
organizationName = ${clean(orgName)}
countryName = SA
[ v3_req ]
1.3.6.1.4.1.311.20.2 = ASN1:UTF8String:${ENVS[env].template}
subjectAltName = dirName:dir_sect
[ dir_sect ]
SN = ${clean(serial)}
UID = ${clean(vat)}
title = ${invoiceTypes}
registeredAddress = ${clean(location)}
businessCategory = ${clean(industry)}
`);
    execFileSync('openssl', ['req', '-new', '-sha256', '-key', keyPath, '-config', cfgPath, '-out', csrPath]);
    return { privateKeyPem: fs.readFileSync(keyPath, 'utf8'), csrPem: fs.readFileSync(csrPath, 'utf8') };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// ---------------------------------------------------------------- certificate helpers
const certPem = (b64body) => `-----BEGIN CERTIFICATE-----\n${b64body.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----\n`;
function derChildren(buf, start, end) { // minimal DER walker
  const out = []; let i = start;
  while (i < end) { const tag = buf[i]; let len = buf[i + 1], hdr = 2; if (len & 0x80) { const n = len & 0x7f; len = 0; for (let k = 0; k < n; k++) len = len * 256 + buf[i + 2 + k]; hdr = 2 + n; } out.push({ tag, start: i, hdr, len, body: i + hdr, end: i + hdr + len }); i += hdr + len; }
  return out;
}
export function certInfo(b64body) {
  const der = Buffer.from(b64body, 'base64');
  const top = derChildren(der, 0, der.length)[0]; const [, , sigVal] = derChildren(der, top.body, top.end);
  const signature = der.subarray(sigVal.body + 1, sigVal.end); // BIT STRING: skip unused-bits byte
  const x = new crypto.X509Certificate(certPem(b64body));
  const publicKeyDer = x.publicKey.export({ type: 'spki', format: 'der' });
  return {
    pem: certPem(b64body), x509: x,
    hash: Buffer.from(crypto.createHash('sha256').update(b64body).digest('hex')).toString('base64'),
    issuer: x.issuer.split('\n').reverse().join(', '), // e.g. "CN=PRZEINVOICESCA4-CA, DC=extgazt, DC=gov, DC=local"
    serial: BigInt('0x' + x.serialNumber).toString(10),
    publicKeyDer, signature,
  };
}

// ---------------------------------------------------------------- signing (XAdES-BES enveloped, ZATCA profile)
const DS = 'http://www.w3.org/2000/09/xmldsig#', XADES = 'http://uri.etsi.org/01903/v1.3.2#';
// The SignedProperties digest is taken over the element as ZATCA's (Java) validator re-serialises it:
// xades namespace on the element, ds namespace repeated on each ds:* child, empty DigestMethod self-closed.
// Verified against the Fatoora reporting API (sandbox), which rejects every other form with "signed-properties-hashing".
function signedPropertiesXml({ signingTime, certHash, issuer, serial }, forDigest) {
  const ns = forDigest ? ` xmlns:ds="${DS}"` : '';
  const apex = forDigest ? ` xmlns:xades="${XADES}" Id="xadesSignedProperties"` : ' Id="xadesSignedProperties"';
  const dm = forDigest ? `<ds:DigestMethod${ns} Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>` : '<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod>';
  return `<xades:SignedProperties${apex}><xades:SignedSignatureProperties><xades:SigningTime>${signingTime}</xades:SigningTime><xades:SigningCertificate><xades:Cert><xades:CertDigest>${dm}<ds:DigestValue${ns}>${certHash}</ds:DigestValue></xades:CertDigest><xades:IssuerSerial><ds:X509IssuerName${ns}>${escText(issuer)}</ds:X509IssuerName><ds:X509SerialNumber${ns}>${serial}</ds:X509SerialNumber></xades:IssuerSerial></xades:Cert></xades:SigningCertificate></xades:SignedSignatureProperties></xades:SignedProperties>`;
}
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* doc = Daftar sales document (same shape the browser stores). Returns signed XML + hash + Phase 2 QR. */
export function signDoc(doc, { certificateB64, privateKeyPem, signingTime }) {
  const unsigned = Z.buildXml(doc, doc.seller, doc.buyer);
  const invoiceHash = Z.sha256b64(unsigned);
  const cert = certInfo(certificateB64);
  const signer = crypto.createSign('sha256'); signer.update(Buffer.from(invoiceHash, 'base64'));
  const signatureValue = signer.sign(privateKeyPem).toString('base64');
  const t = signingTime || new Date().toISOString().slice(0, 19);
  const props = { signingTime: t, certHash: cert.hash, issuer: cert.issuer, serial: cert.serial };
  const spDigest = Buffer.from(crypto.createHash('sha256').update(signedPropertiesXml(props, true)).digest('hex')).toString('base64');
  const ublExtensions = `<ext:UBLExtension><ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI><ext:ExtensionContent><sig:UBLDocumentSignatures xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2" xmlns:sbc="urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2" xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2"><sac:SignatureInformation><cbc:ID>urn:oasis:names:specification:ubl:signature:1</cbc:ID><sbc:ReferencedSignatureID>urn:oasis:names:specification:ubl:signature:Invoice</sbc:ReferencedSignatureID><ds:Signature xmlns:ds="${DS}" Id="signature"><ds:SignedInfo><ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"></ds:CanonicalizationMethod><ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"></ds:SignatureMethod><ds:Reference Id="invoiceSignedData" URI=""><ds:Transforms><ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116"><ds:XPath>not(//ancestor-or-self::ext:UBLExtensions)</ds:XPath></ds:Transform><ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116"><ds:XPath>not(//ancestor-or-self::cac:Signature)</ds:XPath></ds:Transform><ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116"><ds:XPath>not(//ancestor-or-self::cac:AdditionalDocumentReference[cbc:ID='QR'])</ds:XPath></ds:Transform><ds:Transform Algorithm="http://www.w3.org/2006/12/xml-c14n11"></ds:Transform></ds:Transforms><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod><ds:DigestValue>${invoiceHash}</ds:DigestValue></ds:Reference><ds:Reference Type="http://www.w3.org/2000/09/xmldsig#SignatureProperties" URI="#xadesSignedProperties"><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod><ds:DigestValue>${spDigest}</ds:DigestValue></ds:Reference></ds:SignedInfo><ds:SignatureValue>${signatureValue}</ds:SignatureValue><ds:KeyInfo><ds:X509Data><ds:X509Certificate>${certificateB64}</ds:X509Certificate></ds:X509Data></ds:KeyInfo><ds:Object><xades:QualifyingProperties xmlns:xades="${XADES}" Target="signature">${signedPropertiesXml(props, false)}</xades:QualifyingProperties></ds:Object></ds:Signature></sac:SignatureInformation></sig:UBLDocumentSignatures></ext:ExtensionContent></ext:UBLExtension>`;
  const tags = [[1, doc.seller.legalName], [2, doc.seller.vat], [3, `${doc.date}T${doc.time}`], [4, Z.money2(doc.totals.taxIncl)], [5, Z.money2(doc.totals.vat)], [6, invoiceHash], [7, signatureValue], [8, new Uint8Array(cert.publicKeyDer)]];
  if (doc.profile === 'simplified') tags.push([9, new Uint8Array(cert.signature)]);
  const qr = Z.b64(Z.tlv(tags));
  const xml = Z.xmlFile(Z.buildXml(doc, doc.seller, doc.buyer, { signed: { ublExtensions, qr } }));
  return { xml, invoiceHash, qr, signatureValue };
}

// ---------------------------------------------------------------- REST
async function call(env, pathname, { body, headers = {}, auth } = {}) {
  const h = { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Accept-Version': 'V2', 'Accept-Language': 'en', ...headers };
  if (auth) h.Authorization = 'Basic ' + Buffer.from(`${auth.token}:${auth.secret}`).toString('base64');
  const res = await fetch(ENVS[env].base + pathname, { method: 'POST', headers: h, body: JSON.stringify(body || {}) });
  const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch (e) { /* not json */ }
  return { status: res.status, ok: res.ok, json, text };
}
export const complianceCsid = (env, csrPem, otp) => call(env, '/compliance', { headers: { OTP: String(otp) }, body: { csr: Buffer.from(csrPem).toString('base64') } });
export const complianceCheck = (env, auth, signed, uuid) => call(env, '/compliance/invoices', { auth, body: { invoiceHash: signed.invoiceHash, uuid, invoice: Buffer.from(signed.xml).toString('base64') } });
export const productionCsid = (env, auth, requestId) => call(env, '/production/csids', { auth, body: { compliance_request_id: String(requestId) } });
export const report = (env, auth, signed, uuid) => call(env, '/invoices/reporting/single', { auth, headers: { 'Clearance-Status': '0' }, body: { invoiceHash: signed.invoiceHash, uuid, invoice: Buffer.from(signed.xml).toString('base64') } });
export const clear = (env, auth, signed, uuid) => call(env, '/invoices/clearance/single', { auth, headers: { 'Clearance-Status': '1' }, body: { invoiceHash: signed.invoiceHash, uuid, invoice: Buffer.from(signed.xml).toString('base64') } });

// binarySecurityToken is base64( base64-certificate-body )
export const tokenToCertB64 = (bst) => Buffer.from(bst, 'base64').toString('utf8');
export function summarize(r) {
  const v = (r.json && r.json.validationResults) || {};
  const msgs = (k) => (v[k] || []).map(m => `${m.code}: ${m.message}`);
  return { http: r.status, status: r.json && (r.json.reportingStatus || r.json.clearanceStatus || v.status), errors: msgs('errorMessages'), warnings: msgs('warningMessages'), raw: r.json ? undefined : r.text.slice(0, 400) };
}
