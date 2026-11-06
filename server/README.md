# Daftar ↔ Fatoora (ZATCA Phase 2) link service

The browser app issues e-invoices itself. It handles UUIDs, the invoice counter (ICV), the hash chain (PIH), UBL 2.1 XML and the Phase 1 QR code.

Phase 2 also needs a private key, a ZATCA certificate (CSID) and calls to ZATCA's APIs. Browsers can't safely hold the key or call ZATCA directly (CORS). This small Node service does those parts.

## What it does
- **Onboard a branch (EGS unit).** Generates a secp256k1 key and CSR, then gets a compliance CSID using the OTP from the Fatoora portal. It runs the six compliance checks (standard and simplified × invoice, credit note, debit note) and then gets the production CSID.
- **Submit a document.** Signs the XML (XAdES-BES enveloped) and builds the Phase 2 QR code with tags 1–9. It then reports a simplified invoice (`/invoices/reporting/single`) or clears a standard invoice (`/invoices/clearance/single`).

It has no npm dependencies. It needs Node 18+ and the `openssl` CLI.

## Run
```bash
DAFTAR_KEY=<long-random-secret> PORT=8787 \
DAFTAR_ORIGINS=https://sebahi696.github.io \
node server/bridge.mjs
```
Then open Daftar → **Compliance center → Fatoora link service**. Enter the URL and key, then press **Onboard** on each branch.

Private keys and CSIDs are saved in `server/data/` with file mode 600. In production:
- Put that folder on encrypted storage.
- Run the service on a server inside Saudi Arabia.
- Serve it behind HTTPS.

## Environments
| env | base | OTP |
|---|---|---|
| `sandbox` | `gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal` | fixed `123345`. Only ZATCA's test VAT number `399999999900003` works for reporting/clearance |
| `simulation` | `…/e-invoicing/simulation` | from the **simulation** Fatoora portal (taxpayer logs in with Nafath) |
| `production` | `…/e-invoicing/core` | from the Fatoora portal, per branch |

## Test results (developer sandbox)
`node server/sandbox-test.mjs` runs the whole flow and writes `server/sandbox-result.json`.

| Step | Result |
|---|---|
| Compliance CSID | ISSUED |
| Standard invoice / credit note / debit note | CLEARED · 0 errors · 0 warnings |
| Simplified invoice / credit note / debit note | REPORTED · 0 errors · 0 warnings |
| Production CSID | ISSUED |
| Reporting API (simplified invoice) | REPORTED · 0 errors · 0 warnings |
| Clearance API (standard invoice) | CLEARED · cleared XML returned |

The hash computed by the browser engine is checked against the signer's hash on every document. They are identical, so the browser's PIH chain stays valid after signing.
