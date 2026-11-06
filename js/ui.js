/* Daftar — UI primitives shared by all screens */
window.UI = (() => {
  const { t } = I18N;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L = (o) => !o ? '' : (I18N.getLang() === 'ar' ? (o.ar ?? o.name) : (o.en ?? o.nameEn ?? o.ar ?? o.name));
  const money = I18N.money;

  const I = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    sales: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    eod: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/>',
    customers: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
    suppliers: '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    purchases: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6M9 18h3"/>',
    expenses: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h3"/>',
    coa: '<path d="M12 3v5"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M5 12h14M5 12v4M12 12v4M19 12v4"/><rect x="3" y="16" width="4" height="4" rx="1"/><rect x="10" y="16" width="4" height="4" rx="1"/><rect x="17" y="16" width="4" height="4" rx="1"/>',
    journal: '<path d="M5 4h14v16H5z"/><path d="M9 4v16"/><path d="M12 9h4M12 13h4"/>',
    receipts: '<path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/>',
    payments: '<path d="M12 20V8"/><path d="m7 13 5-5 5 5"/><path d="M4 4h16"/>',
    transfers: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
    assets: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>',
    paymethods: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
    reports: '<path d="M4 20h16"/><path d="M6 16V9M11 16V5M16 16v-6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    branches: '<path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><path d="M9 21v-5h6v5"/>',
    users: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    roles: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    company: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M10 21v-4h4v4"/>',
    platform: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><path d="m8 10 2 2 4-4"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    invoice: '<path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21z"/><path d="M9 8h6M9 11.5h6"/><rect x="9" y="14.5" width="3" height="3" rx=".5"/>',
    items: '<path d="M4 8 12 4l8 4-8 4z"/><path d="M4 8v8l8 4 8-4V8"/><path d="M12 12v8"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 20h16"/>', download: '<path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>', check: '<path d="m5 12 5 5L20 7"/>', alert: '<path d="M12 8v5M12 17h.01"/><path d="M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>', print: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>', chevron: '<path d="m9 6 6 6-6 6"/>', chevdown: '<path d="m6 9 6 6 6-6"/>', back: '<path d="m15 6-6 6 6 6"/>', pen: '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="m13 7 4 4"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>', file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>', logout: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>', minus: '<path d="M5 12h14"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  };
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ''}</svg>`;
  const logo = `<svg class="logo" viewBox="0 0 64 64" fill="none" aria-hidden="true"><rect x="6" y="10" width="52" height="44" rx="12" fill="var(--accent)"/><path d="M20 22h24M20 32h24M20 42h14" stroke="var(--accent-ink)" stroke-width="4.5" stroke-linecap="round"/><circle cx="46" cy="42" r="4" fill="var(--c2)"/></svg>`;

  let toastTimer;
  function toast(msg, kind) {
    let el = $('#toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.className = 'toast show' + (kind ? ' ' + kind : ''); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function errText(e) {
    if (e && e.code && I18N.has('e_' + e.code)) return t('e_' + e.code) + (e.code === 'period_locked' ? ' ' + e.detail : '') + (e.code === 'unbalanced' ? ' (' + e.detail + ')' : '');
    return (e && e.message) || String(e);
  }
  const fail = (e) => { (e && e.code ? console.warn : console.error)(e); toast(errText(e), 'bad'); };

  let sheetEl = null, backdropEl = null;
  function openSheet({ title, body, wide, xwide, onMount }) {
    closeSheet(true);
    backdropEl = document.createElement('div'); backdropEl.className = 'backdrop'; backdropEl.addEventListener('click', () => closeSheet());
    sheetEl = document.createElement('div'); sheetEl.className = 'sheet' + (wide ? ' wide' : '') + (xwide ? ' xwide' : ''); sheetEl.setAttribute('role', 'dialog'); sheetEl.setAttribute('aria-modal', 'true');
    sheetEl.innerHTML = `<div class="handle"></div><div class="sh"><h2>${esc(title)}</h2><button class="iconbtn" data-close aria-label="${esc(t('close'))}">${icon('close')}</button></div><div class="sb">${body}</div>`;
    document.body.append(backdropEl, sheetEl);
    sheetEl.querySelector('[data-close]').addEventListener('click', () => closeSheet());
    requestAnimationFrame(() => { backdropEl && backdropEl.classList.add('show'); sheetEl && sheetEl.classList.add('show'); });
    if (onMount) onMount(sheetEl);
    return sheetEl;
  }
  function closeSheet(immediate) {
    if (!sheetEl) return; const s = sheetEl, b = backdropEl; sheetEl = null; backdropEl = null;
    if (immediate) { s.remove(); b.remove(); return; }
    s.classList.remove('show'); b.classList.remove('show'); setTimeout(() => { s.remove(); b.remove(); }, 260);
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  function confirmInline(container, msg, onYes, yesLabel) {
    container.innerHTML = `<div class="notice warn confirm"><span>${esc(msg)}</span><span class="actions-inline"><button class="btn sm danger" data-yes>${esc(yesLabel || t('yes_delete'))}</button><button class="btn sm secondary" data-no>${esc(t('keep'))}</button></span></div>`;
    container.querySelector('[data-yes]').onclick = onYes; container.querySelector('[data-no]').onclick = () => { container.innerHTML = ''; };
  }

  // ---- form helpers
  const field = (label, inner, hint, cls = '') => `<div class="field ${cls}"><label>${esc(label)}</label>${inner}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`;
  const inp = (name, val = '', attrs = '') => `<input class="input" name="${name}" value="${esc(val)}" ${attrs}>`;
  const sel = (name, options, val, attrs = '') => `<select class="select" name="${name}" ${attrs}>${options.map(o => o.group ? `<optgroup label="${esc(o.group)}">${o.options.map(x => `<option value="${esc(x.v)}" ${String(x.v) === String(val) ? 'selected' : ''}>${esc(x.l)}</option>`).join('')}</optgroup>` : `<option value="${esc(o.v)}" ${String(o.v) === String(val) ? 'selected' : ''} ${o.disabled ? 'disabled' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
  const dateInput = (name, val, attrs = '') => `<input class="input" type="date" name="${name}" value="${val || ''}" dir="ltr" ${attrs}>`;
  const moneyInput = (name, val = '', attrs = '') => `<input class="input money" type="number" inputmode="decimal" step="0.01" min="0" name="${name}" value="${val === '' || val === null || val === undefined ? '' : val}" dir="ltr" ${attrs}>`;
  const check = (name, on, label) => `<label class="check"><input type="checkbox" name="${name}" ${on ? 'checked' : ''}><span>${esc(label)}</span></label>`;
  const toggle = (name, on, attrs = '') => `<label class="switch"><input type="checkbox" name="${name}" ${on ? 'checked' : ''} ${attrs}><span></span></label>`;
  const formData = (form) => { const o = Object.fromEntries(new FormData(form).entries()); $$('input[type=checkbox]', form).forEach(c => { o[c.name] = c.checked; }); return o; };
  const seg = (name, options, val) => `<div class="seg" data-seg="${name}">${options.map(o => `<button type="button" class="${String(o.v) === String(val) ? 'active' : ''}" data-v="${esc(o.v)}">${esc(o.l)}</button>`).join('')}</div>`;
  function bindSeg(root, name, cb) { $$(`[data-seg="${name}"] button`, root).forEach(b => b.addEventListener('click', () => { $$(`[data-seg="${name}"] button`, root).forEach(x => x.classList.toggle('active', x === b)); cb(b.dataset.v); })); }

  // account picker: leaf accounts, grouped by root
  function accountOptions(db, { under, types, exclude, includeGroups, blank } = {}) {
    const S = Store; const roots = db.accounts.filter(a => !a.parent);
    const out = blank ? [{ v: '', l: blank }] : [];
    for (const r of roots) {
      const list = db.accounts.filter(a => (includeGroups || !a.group) && a.active !== false && S.isUnder(db, a.code, r.code) && (!under || [].concat(under).some(u => S.isUnder(db, a.code, u))) && (!types || types.includes(a.type)) && !(exclude || []).includes(a.code));
      if (list.length) out.push({ group: `${r.code} · ${L(r)}`, options: list.map(a => ({ v: a.code, l: `${a.code} · ${L(a)}` })) });
    }
    return out;
  }
  const accSelect = (db, name, val, opts = {}) => sel(name, accountOptions(db, opts), val, 'data-combo ' + (opts.attrs || ''));

  // ---- searchable combobox: enhances any <select data-combo>; the native select stays in the form (value, change events)
  const AR_DIG = '٠١٢٣٤٥٦٧٨٩';
  const norm = (s) => String(s || '').toLowerCase().replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[٠-٩]/g, d => AR_DIG.indexOf(d)).replace(/\s+/g, ' ').trim();
  function enhanceSelect(sel) {
    if (sel.dataset.enhanced) return; sel.dataset.enhanced = '1';
    const wrap = document.createElement('div'); wrap.className = 'combo'; sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(sel);
    sel.classList.add('combo-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    const input = document.createElement('input'); input.type = 'text'; input.className = 'input combo-input'; input.autocomplete = 'off'; input.spellcheck = false;
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false'); input.placeholder = t('type_to_search');
    const lid = 'cl' + Math.random().toString(36).slice(2, 8); input.setAttribute('aria-controls', lid);
    const list = document.createElement('div'); list.className = 'combo-list'; list.id = lid; list.setAttribute('role', 'listbox'); list.hidden = true;
    const clear = document.createElement('span'); clear.className = 'combo-caret'; clear.innerHTML = icon('search');
    wrap.append(input, clear, list);
    const label = () => { const o = sel.options[sel.selectedIndex]; return o && o.value !== '' ? o.textContent : ''; };
    const sync = () => { input.value = label(); wrap.classList.toggle('has', !!sel.value); };
    let items = [], active = -1;
    const all = () => [...sel.options].filter(o => !o.disabled).map(o => ({ v: o.value, l: o.textContent, g: o.parentElement && o.parentElement.tagName === 'OPTGROUP' ? o.parentElement.label : '', n: norm(o.textContent) }));
    function render(q) {
      const words = norm(q).split(' ').filter(Boolean);
      items = all().filter(o => o.v !== '' && (!words.length || words.every(w => o.n.includes(w))));
      // exact code prefix first
      if (words.length === 1 && /^\d+$/.test(words[0])) items.sort((a, b) => (b.n.startsWith(words[0]) ? 1 : 0) - (a.n.startsWith(words[0]) ? 1 : 0));
      const shown = items.slice(0, 150); active = Math.max(0, shown.findIndex(o => o.v === sel.value));
      if (!shown.length) { list.innerHTML = `<div class="combo-empty">${esc(t('no_results'))}</div>`; }
      else { let g = null; list.innerHTML = shown.map((o, i) => { const head = o.g && o.g !== g && !words.length ? `<div class="combo-g">${esc(o.g)}</div>` : ''; g = o.g; return head + `<div class="combo-opt ${i === active ? 'on' : ''} ${o.v === sel.value ? 'sel' : ''}" role="option" data-i="${i}" aria-selected="${o.v === sel.value}">${esc(o.l)}</div>`; }).join('') + (items.length > shown.length ? `<div class="combo-empty">+${items.length - shown.length}</div>` : ''); }
      items = shown; list.hidden = false; input.setAttribute('aria-expanded', 'true'); scrollActive();
    }
    const scrollActive = () => { const el = list.querySelector('.combo-opt.on'); if (el) el.scrollIntoView({ block: 'nearest' }); };
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); };
    const pick = (i) => { const o = items[i]; if (!o) return; if (sel.value !== o.v) { sel.value = o.v; sel.dispatchEvent(new Event('change', { bubbles: true })); } sync(); close(); };
    input.addEventListener('focus', () => { input.select(); render(''); });
    input.addEventListener('click', () => { if (list.hidden) render(''); });
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (list.hidden) render(''); active = Math.max(0, Math.min(items.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1))); list.querySelectorAll('.combo-opt').forEach((x, i) => x.classList.toggle('on', i === active)); scrollActive(); }
      else if (e.key === 'Enter') { if (!list.hidden) { e.preventDefault(); pick(active); } }
      else if (e.key === 'Escape') { if (!list.hidden) { e.stopPropagation(); close(); sync(); } }
      else if (e.key === 'Tab' && !list.hidden && input.value !== label() && items.length) pick(active);
    });
    list.addEventListener('mousedown', (e) => { e.preventDefault(); const el = e.target.closest('.combo-opt'); if (el) pick(+el.dataset.i); });
    input.addEventListener('blur', () => setTimeout(() => { close(); sync(); }, 120));
    sel.addEventListener('change', sync);
    sel._sync = sync; sync();
  }
  const enhanceAll = (root) => { (root.querySelectorAll ? root.querySelectorAll('select[data-combo]') : []).forEach(enhanceSelect); };
  if (typeof MutationObserver !== 'undefined') new MutationObserver((muts) => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.matches && n.matches('select[data-combo]')) enhanceSelect(n); else enhanceAll(n); } }).observe(document.documentElement, { childList: true, subtree: true });
  const setSelect = (el, v) => { if (!el) return; el.value = v; if (el._sync) el._sync(); };

  // tables
  const th = (cols) => `<thead><tr>${cols.map(c => `<th class="${c.r ? 'money' : ''} ${c.cls || ''}">${esc(c.l)}</th>`).join('')}</tr></thead>`;
  function download(filename, content, type = 'text/csv;charset=utf-8') { const blob = new Blob(['﻿' + content], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  const csv = (rows) => rows.map(r => r.map(c => { const s = String(c ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n');
  const initials = (n) => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('');
  const pill = (txt, kind) => `<span class="pill ${kind || 'neutral'}">${esc(txt)}</span>`;
  const empty = (msg) => `<div class="empty">${esc(msg)}</div>`;

  return { $, $$, esc, L, money, I, icon, logo, toast, fail, errText, openSheet, closeSheet, confirmInline, field, inp, sel, setSelect, enhanceSelect, norm, dateInput, moneyInput, check, toggle, formData, seg, bindSeg, accountOptions, accSelect, th, download, csv, initials, pill, empty };
})();
