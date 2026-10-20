# دفتر — Daftar

**نظام محاسبة كامل فوق نقاط البيع (SkySystem) — نموذج أولي لكاندي لوز من شركة هنترز.**
**Full accounting on top of the SkySystem POS — prototype for Candy Loz by Hunters.**

> نسخة تجريبية: كل البيانات محفوظة على جهازك فقط (localStorage). الرمز السري لكل الحسابات التجريبية **1234**.
> Demo build: all data lives in your browser only. PIN for every demo account is **1234**.

## ما الذي يفعله النموذج / What the prototype does

| | العربية | English |
|---|---|---|
| اللغة | عربي افتراضياً مع خيار الإنجليزية (RTL/LTR كامل) | Arabic by default, English toggle |
| الأدوار | مدير (تحكم كامل + تقارير) · محاسب (قيود + تقارير) · مشغّل (استيراد مبيعات، فواتير موردين، إقفال اليوم — بدون تقارير) | Admin · Accountant · Operator (no reports) |
| المبيعات | استيراد تصدير SkySystem (CSV/XLSX) مع مطابقة أعمدة تلقائية، منع التكرار، ترحيل تلقائي للقيود | POS export import with auto column matching, dedupe, auto journal posting |
| الموردون | الاسم، الرقم الضريبي (تحقق 15 رقم)، العنوان الوطني، مدة السداد، الرصيد | Name, VAT no. (validated), national address, terms, balance |
| فواتير الموردين | يدوي أو **تصوير الفاتورة** → قراءة (OCR) → تعبئة الحقول → ترحيل. تسجيل السداد | Manual or **photo → OCR → prefilled form → post**. Record payments |
| إقفال اليوم | النقد المتوقع مقابل الفعلي لكل فرع، عجز/زيادة يُرحّل تلقائياً، أيام مفتوحة | Expected vs counted cash per branch, over/short auto-posted, open days |
| التقارير | ميزان المراجعة، كشف حساب (مورد/حساب)، قائمة الدخل، إقرار الضريبة، المبيعات، أعمار الذمم، دفتر اليومية — تصدير CSV وطباعة | Trial balance, statement of account, P&L, VAT return, sales, aged payables, journal — CSV + print |
| الجوال | PWA قابل للتثبيت، شاشات بإبهام واحد، وضع داكن | Installable PWA, one-thumb screens, dark mode |

## التشغيل / Run

ملفات ثابتة فقط — افتح `index.html` من أي خادم ثابت (GitHub Pages، Netlify، أو `python3 -m http.server`).
Static files only — serve the folder from any static host.

## الهيكل / Structure

```
index.html        shell + fonts + scripts
css/app.css       design tokens (light/dark), RTL-aware layout, components
js/i18n.js        AR/EN dictionary, number & date formatting
js/store.js       data model, seed data, double-entry ledger engine, reports math (pure JS, testable in Node)
js/import.js      POS export parser (CSV/XLSX), column auto-matching, sample generator
js/ocr.js         invoice photo → text (Tesseract.js, loaded on demand) → field extraction
js/app.js         routing, roles, screens (home, sales, suppliers, invoices, EOD, settings)
js/reports.js     report screens
samples/          sample SkySystem export
```

## الخطوة التالية (الإنتاج) / Production path

- قاعدة بيانات سحابية ومستخدمون حقيقيون (Supabase/Postgres + صلاحيات على مستوى الصف).
- قراءة الفواتير بنموذج رؤية (LLM) بدل OCR المحلي لدقة أعلى على الفواتير العربية.
- ربط مباشر مع SkySystem إن توفر API، وإلا جدولة استيراد تلقائي.
- فوترة إلكترونية (ZATCA المرحلة الثانية) عند الحاجة.

---
Hunters Company · 2026
