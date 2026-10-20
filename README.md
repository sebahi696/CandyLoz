# دفتر — Daftar v0.2

**نظام محاسبي متكامل فوق نقاط البيع — مخصص لكاندي لوز، من شركة هنترز.**
**Full accounting system on top of the SkySystem POS — customised for Candy Loz, by Hunters.**

Live demo: https://sebahi696.github.io/CandyLoz/

## Demo logins (PIN)
| User | Role | PIN |
|---|---|---|
| فهد العمري | Admin (client) | 1234 |
| نورة السبيعي | Accountant | 1234 |
| سعيد / محمد / أحمد | Operator (one per branch) | 1234 |
| فريق هنترز | **Super admin (Hunters platform)** | 0000 |

Data lives in the browser (localStorage) — each device has its own demo copy. "Reset demo data" is under More.

## Modules
**Sales:** SkySystem export import (CSV/XLSX, auto column matching, dedupe) · manual daily entry · end-of-day cash close per branch · customers & credit invoices.
**Purchases & expenses:** suppliers (VAT no., national address, own ledger sub-account) · purchase invoices (manual or photo OCR) · multi-line expenses with VAT.
**Accounting:** 5-level chart of accounts tailored to a confectionery retailer (branch cash boxes, mada/Visa/Tabby/Tamara/Salla receivables, inventory by category, spoilage, gateway fees…) · journal entries with 14 operation types, manual & opening entries, reversal · receipt / payment / transfer vouchers (with fee & invoice allocation) · fixed assets register with monthly straight-line depreciation · payment methods mapped to GL accounts · accounting settings (fiscal year, period lock, zakat, inventory system, printing, system-account mapping) · year-end close.
**Reports:** trial balance (levels 1–5, tree/level/leaf) · income statement · balance sheet (balances, includes current-period profit) · cash flow (indirect, reconciled) · account statement (detail or monthly) · supplier / customer / cash balances · aged payables · VAT return · sales · expenses · general journal. CSV export + print.
**Admin:** users (with plan limits), branches (auto-creates cash box + sales account), roles & permissions matrix, company profile, backup/restore.
**Hunters platform (super admin):** list of client companies, add a new company, switch any of 33 features on/off per client, plan & user/branch limits, suspend, open any company as admin for support.

## Code
```
js/store.js    multi-tenant store + double-entry engine + reports (pure JS, Node-testable)
js/i18n.js     Arabic/English dictionary
js/ui.js       UI primitives (sheets, forms, account picker, tables)
js/app.js      shell, session, permissions, feature flags, navigation, dashboard, platform
js/ops.js      sales import, end of day, customers, suppliers, purchases (OCR), expenses
js/acct.js     chart of accounts, journal, vouchers, fixed assets, payment methods, settings, users, roles
js/reports.js  financial statements & reports
```

Hunters Company · 2026
