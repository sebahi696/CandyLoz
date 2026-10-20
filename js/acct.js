/* Daftar — accounting module: chart of accounts, journal, vouchers, fixed assets, payment methods, settings, users & roles */
(() => {
  const { t, money, fmtDate, fmtMonth } = I18N;
  const S = Store, U = UI, A = App; const { $, $$, esc, L, icon } = U;
  const db = () => A.db; const today = () => S.todayISO();
  const natBal = (d, code, to) => { const a = S.acc(d, code); const v = S.accountBalance(d, code, { to }); return S.natureOf(a.type) === 'debit' ? v : -v; };

  // ================================================================ CHART OF ACCOUNTS
  const coaState = { tab: 'tree', open: new Set(['1', '11', '1101', '2', '21', '3', '4', '41', '5', '6']), q: '' };
  Screens.coa = (main) => {
    const d = db(); const all = S.rollup(d, S.movements(d, { to: today() }));
    const bal = (a) => { const v = all[a.code].close; return S.natureOf(a.type) === 'debit' ? v : -v; };
    const q = coaState.q.trim().toLowerCase();
    const match = (a) => !q || a.code.startsWith(q) || a.ar.toLowerCase().includes(q) || (a.en || '').toLowerCase().includes(q);
    const visible = new Set(); if (q) for (const a of d.accounts) if (match(a)) { let x = a; while (x) { visible.add(x.code); x = x.parent ? S.acc(d, x.parent) : null; } }
    const manage = A.can('coa_manage');
    const node = (a) => {
      if (q && !visible.has(a.code)) return '';
      const kids = S.childrenOf(d, a.code); const isOpen = q ? true : coaState.open.has(a.code); const lv = S.levelOf(d, a.code);
      const del = manage && !S.canDeleteAccount(d, a.code);
      return `<div class="tnode lv${lv} ${a.group ? 'grp' : 'leaf'} ${a.active === false ? 'off' : ''}">
        <div class="trow">${kids.length ? `<button class="tog" data-tog="${a.code}" aria-label="toggle">${icon(isOpen ? 'chevdown' : 'chevron')}</button>` : '<span class="tog"></span>'}
          <span class="tcode">${a.code}</span><span class="tname">${esc(L(a))}</span>
          ${a.contra ? U.pill(t('contra'), 'neutral') : ''}${a.party ? U.pill(t(a.party), 'info') : ''}${a.active === false ? U.pill(t('inactive'), 'bad') : ''}
          <span class="grow"></span><span class="tbal money ${bal(a) < 0 ? 'neg' : ''}">${money(bal(a), { blankZero: true, paren: true })}</span>
          <span class="tact">${manage && a.group ? `<button class="iconbtn sm" data-addc="${a.code}" title="${esc(t('add_child'))}" aria-label="${esc(t('add_child'))}">${icon('plus')}</button>` : ''}${manage && !a.group && !S.hasPostings(d, a.code) && !a.party ? `<button class="iconbtn sm" data-addc="${a.code}" title="${esc(t('add_child'))}" aria-label="${esc(t('add_child'))}">${icon('plus')}</button>` : ''}
            ${manage && a.parent ? `<button class="iconbtn sm" data-edit="${a.code}" title="${esc(t('edit_account'))}" aria-label="${esc(t('edit_account'))}">${icon('pen')}</button>` : ''}
            ${A.can('reports') && A.feat('rep_statement') ? `<button class="iconbtn sm" data-stmt="${a.code}" title="${esc(t('statement_of_account'))}" aria-label="${esc(t('statement_of_account'))}">${icon('eye')}</button>` : ''}
            ${del ? `<button class="iconbtn sm danger-ic" data-del="${a.code}" title="${esc(t('delete'))}" aria-label="${esc(t('delete'))}">${icon('trash')}</button>` : ''}</span></div>
        ${kids.length && isOpen ? `<div class="tkids">${kids.map(node).join('')}</div>` : ''}</div>`;
    };
    const roots = d.accounts.filter(a => !a.parent);
    main.innerHTML = `<div class="toolbar">${U.seg('ctab', [{ v: 'tree', l: t('coa_tree') }, { v: 'list', l: t('coa_list') }], coaState.tab)}<div class="search grow">${icon('search')}<input class="input" id="cq" placeholder="${esc(t('search'))} — ${esc(t('code'))} / ${esc(t('name'))}" value="${esc(coaState.q)}"></div>
      ${coaState.tab === 'tree' ? `<button class="btn ghost sm" data-exp>${esc(t('expand_all'))}</button><button class="btn ghost sm" data-col>${esc(t('collapse_all'))}</button>` : `<button class="btn secondary sm" data-csv>${icon('download')}${esc(t('export_csv'))}</button>`}</div>
      ${coaState.tab === 'tree' ? `<div class="tree card">${roots.map(node).join('')}</div>`
        : `<div class="tablewrap"><table class="tbl">${U.th([{ l: t('code') }, { l: t('name') }, { l: t('level'), r: 1 }, { l: t('type') }, { l: t('parent_account') }, { l: t('status') }, { l: t('balance'), r: 1 }])}<tbody>${d.accounts.filter(match).map(a => `<tr class="${a.group ? 'group' : ''}"><td class="code">${a.code}</td><td style="padding-inline-start:${8 + (S.levelOf(d, a.code) - 1) * 14}px">${esc(L(a))}</td><td class="money">${S.levelOf(d, a.code)}</td><td>${esc(t('t_' + a.type))}</td><td>${a.parent ? esc(A.accName(a.parent)) : '—'}</td><td>${a.group ? U.pill(t('group_acc'), 'neutral') : U.pill(t('leaf_acc'), 'info')}</td><td class="money">${money(bal(a), { blankZero: true, paren: true })}</td></tr>`).join('')}</tbody></table></div>`}`;
    U.bindSeg(main, 'ctab', (v) => { coaState.tab = v; Screens.coa(main); });
    $('#cq', main).addEventListener('input', (e) => { coaState.q = e.target.value; Screens.coa(main); const i = $('#cq', main); i.focus(); i.setSelectionRange(i.value.length, i.value.length); });
    const ex = $('[data-exp]', main); if (ex) ex.onclick = () => { d.accounts.forEach(a => coaState.open.add(a.code)); Screens.coa(main); };
    const co = $('[data-col]', main); if (co) co.onclick = () => { coaState.open = new Set(); Screens.coa(main); };
    const cv = $('[data-csv]', main); if (cv) cv.onclick = () => U.download('chart-of-accounts.csv', U.csv([[t('code'), t('name_ar'), t('name_en'), t('level'), t('type'), t('parent_account'), t('balance')], ...d.accounts.map(a => [a.code, a.ar, a.en, S.levelOf(d, a.code), a.type, a.parent || '', bal(a)])]));
    $$('[data-tog]', main).forEach(b => b.onclick = () => { const c = b.dataset.tog; coaState.open.has(c) ? coaState.open.delete(c) : coaState.open.add(c); Screens.coa(main); });
    $$('[data-addc]', main).forEach(b => b.onclick = () => accountForm({ parent: b.dataset.addc }));
    $$('[data-edit]', main).forEach(b => b.onclick = () => accountForm({ code: b.dataset.edit }));
    $$('[data-stmt]', main).forEach(b => b.onclick = () => A.go('reports/statement/' + b.dataset.stmt));
    $$('[data-del]', main).forEach(b => b.onclick = () => { const c = b.dataset.del; U.openSheet({ title: t('delete') + ' ' + A.accName(c), body: '<div id="cf"></div>', onMount: (sh) => U.confirmInline($('#cf', sh), t('are_you_sure'), () => { try { S.deleteAccount(d, c); U.closeSheet(); A.commit(t('deleted')); } catch (er) { U.fail(er); } }) }); });
  };
  function accountForm({ parent, code }) {
    const d = db(); const a = code ? S.acc(d, code) : null; const p = S.acc(d, parent || (a && a.parent));
    const preview = a ? a.code : (() => { try { return S.nextCode(d, p.code); } catch (e) { return '—'; } })();
    U.openSheet({ title: a ? t('edit_account') : t('new_account'), body: `<form id="af">
      <div class="kv"><span class="k">${esc(t('parent_account'))}</span><span class="v">${esc(A.accName(p.code))}</span></div>
      <div class="kv"><span class="k">${esc(t('type'))}</span><span class="v">${esc(t('t_' + p.type))}</span></div>
      <div class="kv"><span class="k">${esc(t('code'))}</span><span class="v code">${esc(preview)}</span></div>${a ? '' : `<p class="hint">${esc(t('code_auto'))}</p>`}
      ${U.field(t('name_ar'), U.inp('ar', a ? a.ar : '', 'required'))}${U.field(t('name_en'), U.inp('en', a ? a.en : '', 'dir="ltr"'))}
      ${a ? `<label class="featrow">${esc(t('active'))}${U.toggle('active', a.active !== false)}</label>` : ''}
      ${a && (a.system || a.party) ? `<p class="hint">${esc(t('system_acc'))}</p>` : ''}
      <button class="btn primary" type="submit">${esc(t('save'))}</button></form>`, onMount: (sh) => {
      $('#af', sh).addEventListener('submit', (e) => { e.preventDefault(); const x = U.formData(e.target); try { if (a) S.updateAccount(d, a.code, { ar: x.ar, en: x.en || x.ar, active: x.active }); else { const n = S.addAccount(d, { parent: p.code, ar: x.ar, en: x.en }); coaState.open.add(p.code); coaState.open.add(n.parent); } U.closeSheet(); A.commit(t('account_saved')); } catch (er) { U.fail(er); } });
    } });
  }

  // ================================================================ JOURNAL
  const jP = { preset: 'this_month', branch: '', type: '', q: '', no: '', limit: 60 };
  const JTYPES = ['sales', 'credit_sale', 'purchase', 'expense', 'receipt', 'payment', 'transfer', 'eod', 'depreciation', 'asset', 'opening', 'manual', 'reversal', 'closing'];
  Screens.journal = (main, args) => {
    const d = db(); if (args[0] === 'new' && A.can('journal')) { setTimeout(() => entryForm(), 50); history.replaceState(null, '', '#/journal'); }
    const [from, to] = A.periodRange(jP);
    const q = jP.q.trim().toLowerCase();
    const list = d.journal.filter(j => j.date >= from && j.date <= to && (!jP.type || j.type === jP.type) && (!jP.branch || j.branch === jP.branch || j.lines.some(l => l.branch === jP.branch)) && (!jP.no || j.no.includes(jP.no)) && (!q || A.memoText(j.memo).toLowerCase().includes(q) || (j.ref || '').toLowerCase().includes(q))).sort((a, b) => b.date.localeCompare(a.date) || b.no.localeCompare(a.no));
    const totDr = S.r2(list.reduce((s, j) => s + j.total, 0));
    const extra = `<select class="select fb" data-type aria-label="${esc(t('entry_type'))}"><option value="">${esc(t('entry_type'))}: ${esc(t('all'))}</option>${JTYPES.map(x => `<option value="${x}" ${jP.type === x ? 'selected' : ''}>${esc(t('jt_' + x))}</option>`).join('')}</select>
      <input class="input fb" data-no placeholder="${esc(t('entry_no'))}" value="${esc(jP.no)}" dir="ltr"><input class="input fb" data-q placeholder="${esc(t('notes'))}" value="${esc(jP.q)}">
      ${A.can('journal') ? `<button class="btn primary sm" data-add>${icon('plus')}${esc(t('new_entry'))}</button>` : ''}`;
    main.innerHTML = A.filterBar(jP, { extra }) + `
      <div class="tiles three"><div class="tile"><span class="k">${esc(t('count'))}</span><span class="v num">${list.length}</span></div><div class="tile"><span class="k">${esc(t('total_debit'))}</span><span class="v money">${money(totDr)}</span></div><div class="tile"><span class="k">${esc(t('total_credit'))}</span><span class="v money">${money(totDr)}</span></div></div>
      ${list.length ? `<div class="tablewrap mt"><table class="tbl jtable">${U.th([{ l: t('entry_no') }, { l: t('date') }, { l: t('branch') }, { l: t('entry_type') }, { l: t('accounts') }, { l: t('debit'), r: 1 }, { l: t('credit'), r: 1 }, { l: t('description') }, { l: '' }])}<tbody>${list.slice(0, jP.limit).map(j => `<tr class="click ${j.reversedBy ? 'struck' : ''}" data-j="${j.id}"><td class="code">${j.no}</td><td class="num">${j.date}</td><td>${esc(j.branch ? A.branchName(j.branch) : '—')}</td><td>${U.pill(t('jt_' + j.type), j.type === 'manual' || j.type === 'opening' ? 'info' : j.type === 'reversal' ? 'warn' : 'neutral')}</td>
        <td class="stack-cell">${j.lines.map(l => `<div class="${l.credit ? 'cr-ind' : ''}">${esc(A.accShort(l.account))}</div>`).join('')}</td><td class="money stack-cell">${j.lines.map(l => `<div>${l.debit ? money(l.debit) : '&nbsp;'}</div>`).join('')}</td><td class="money stack-cell">${j.lines.map(l => `<div>${l.credit ? money(l.credit) : '&nbsp;'}</div>`).join('')}</td>
        <td class="memo">${esc(A.memoText(j.memo))}${j.reversedBy ? ' ' + U.pill(t('is_reversed'), 'warn') : ''}</td><td>${icon('eye')}</td></tr>`).join('')}</tbody></table></div>${list.length > jP.limit ? `<button class="btn ghost mt" data-more>+ ${list.length - jP.limit}</button>` : ''}` : U.empty('—')}`;
    A.bindFilter(main, jP, () => Screens.journal(main, []));
    $('[data-type]', main).onchange = (e) => { jP.type = e.target.value; Screens.journal(main, []); };
    $('[data-no]', main).onchange = (e) => { jP.no = e.target.value.trim(); Screens.journal(main, []); };
    $('[data-q]', main).onchange = (e) => { jP.q = e.target.value; Screens.journal(main, []); };
    const ad = $('[data-add]', main); if (ad) ad.onclick = () => entryForm();
    const mo = $('[data-more]', main); if (mo) mo.onclick = () => { jP.limit += 100; Screens.journal(main, []); };
    $('[data-csv]', main).onclick = () => U.download(`journal-${from}-${to}.csv`, U.csv([[t('entry_no'), t('date'), t('entry_type'), t('description'), t('account'), t('debit'), t('credit'), t('branch')], ...list.flatMap(j => j.lines.map(l => [j.no, j.date, t('jt_' + j.type), A.memoText(j.memo), A.accName(l.account), l.debit, l.credit, l.branch ? A.branchName(l.branch) : '']))]));
    $$('[data-j]', main).forEach(r => r.onclick = () => Screens.entrySheet(r.dataset.j));
  };
  Screens.entrySheet = (id) => {
    const d = db(); const j = d.journal.find(x => x.id === id); if (!j) return;
    const canRev = A.can('journal_reverse') && !j.reversedBy && !['closing', 'reversal'].includes(j.type);
    U.openSheet({ title: t('entry_details') + ' ' + j.no, xwide: true, body: `<div class="printable">
      <div class="grid3"><div class="kv"><span class="k">${esc(t('date'))}</span><span class="v">${esc(fmtDate(j.date))}</span></div><div class="kv"><span class="k">${esc(t('entry_type'))}</span><span class="v">${esc(t('jt_' + j.type))}</span></div><div class="kv"><span class="k">${esc(t('reference'))}</span><span class="v code">${esc(j.ref || '—')}</span></div></div>
      <p class="strong">${esc(A.memoText(j.memo))}</p>
      <div class="tablewrap"><table class="tbl compact">${U.th([{ l: t('account') }, { l: t('line_note') }, { l: t('branch') }, { l: t('debit'), r: 1 }, { l: t('credit'), r: 1 }])}<tbody>${j.lines.map(l => `<tr><td>${esc(A.accName(l.account))}</td><td>${esc(l.note || '')}</td><td>${esc(l.branch ? A.branchName(l.branch) : '—')}</td><td class="money">${money(l.debit, { blankZero: true })}</td><td class="money">${money(l.credit, { blankZero: true })}</td></tr>`).join('')}
      <tr class="total"><td colspan="3">${esc(t('totals'))}</td><td class="money">${money(j.total)}</td><td class="money">${money(j.total)}</td></tr></tbody></table></div>
      <p class="small muted">${esc(t('user'))}: ${esc(A.userName(d.users.find(u => u.id === j.user)) || '—')} · ${esc(j.createdAt.slice(0, 16).replace('T', ' '))}${j.reversedBy ? ' · ' + esc(t('is_reversed')) : ''}</p></div>
      <div class="btnrow"><button class="btn secondary" data-print>${icon('print')}${esc(t('print'))}</button>${canRev ? `<button class="btn danger" data-rev>${icon('undo')}${esc(t('reverse'))}</button>` : ''}</div><div id="confirm"></div>`, onMount: (sh) => {
      $('[data-print]', sh).onclick = () => { document.body.classList.add('print-sheet'); window.print(); setTimeout(() => document.body.classList.remove('print-sheet'), 500); };
      const r = $('[data-rev]', sh); if (r) r.onclick = () => U.confirmInline($('#confirm', sh), t('are_you_sure'), () => { try { S.reverseEntry(d, id, { user: A.user().id, date: j.date < (d.settings.lockDate || '') ? today() : undefined }); U.closeSheet(); A.commit(t('reversed')); } catch (er) { U.fail(er); } }, t('reverse'));
    } });
  };
  function entryForm() {
    const d = db(); let n = 0;
    const row = (i) => `<div class="jline" data-i="${i}"><div class="g-acc">${U.accSelect(d, 'a_' + i, '', { blank: '— ' + t('pick_account') + ' —' })}</div><input class="input money" type="number" step="0.01" min="0" name="d_${i}" placeholder="${esc(t('debit'))}" dir="ltr"><input class="input money" type="number" step="0.01" min="0" name="c_${i}" placeholder="${esc(t('credit'))}" dir="ltr"><input class="input" name="n_${i}" placeholder="${esc(t('line_note'))}"><button type="button" class="iconbtn sm" data-rm aria-label="${esc(t('delete'))}">${icon('trash')}</button></div>`;
    U.openSheet({ title: t('new_entry'), xwide: true, body: `<form id="jf">
      <div class="grid3">${U.field(t('date'), U.dateInput('date', today()))}${A.branchField('branch')}${U.field(t('entry_type'), U.sel('type', [{ v: 'manual', l: t('jt_manual') }, { v: 'opening', l: t('jt_opening') }], 'manual'))}</div>
      <div class="grid2">${U.field(t('description'), U.inp('memo', '', 'required'))}${U.field(t('reference'), U.inp('ref', '', 'dir="ltr"'))}</div>
      <h3 class="h3">${esc(t('entry_lines'))}</h3><div class="jhead"><span>${esc(t('account'))}</span><span>${esc(t('debit'))}</span><span>${esc(t('credit'))}</span><span>${esc(t('line_note'))}</span><span></span></div>
      <div id="jl">${row(n++)}${row(n++)}</div><button type="button" class="btn ghost sm" data-addrow>${icon('plus')}${esc(t('add_row'))}</button>
      <div class="totals"><div class="kv"><span class="k">${esc(t('total_debit'))}</span><span class="v money" id="td">0.00</span></div><div class="kv"><span class="k">${esc(t('total_credit'))}</span><span class="v money" id="tc">0.00</span></div><div id="bal"></div></div>
      <button class="btn primary" type="submit">${esc(t('save'))}</button></form>`, onMount: (sh) => {
      const f = $('#jf', sh);
      const lines = () => { const x = U.formData(f); return $$('.jline', f).map(r => { const i = r.dataset.i; return { account: x['a_' + i], debit: parseFloat(x['d_' + i]) || 0, credit: parseFloat(x['c_' + i]) || 0, note: x['n_' + i] }; }); };
      const recalc = () => { const ls = lines(); const dr = ls.reduce((s, l) => s + l.debit, 0), cr = ls.reduce((s, l) => s + l.credit, 0); $('#td', f).textContent = money(dr); $('#tc', f).textContent = money(cr); const diff = S.r2(dr - cr); $('#bal', f).innerHTML = Math.abs(diff) < 0.005 && dr > 0 ? `<div class="notice good">${icon('check')}<span>${esc(t('balanced_ok'))}</span></div>` : dr || cr ? `<div class="notice warn">${icon('alert')}<span>${esc(t('unbalanced_by'))} <b class="money">${money(Math.abs(diff))}</b></span></div>` : ''; };
      f.addEventListener('input', recalc);
      $('[data-addrow]', f).onclick = () => $('#jl', f).insertAdjacentHTML('beforeend', row(n++));
      f.addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b && $$('.jline', f).length > 2) { b.closest('.jline').remove(); recalc(); } });
      f.addEventListener('submit', (e) => { e.preventDefault(); const x = U.formData(f); const ls = lines().filter(l => l.account && (l.debit || l.credit)).map(l => ({ ...l, branch: x.branch }));
        try { S.postEntry(d, { date: x.date, branch: x.branch, type: x.type, memo: x.memo, ref: x.ref, lines: ls, user: A.user().id }); U.closeSheet(); A.commit(t('entry_saved')); } catch (er) { U.fail(er); } });
    } });
  }

  // ================================================================ VOUCHERS
  const vP = { receipt: { preset: 'this_month', branch: '' }, payment: { preset: 'this_month', branch: '' }, transfer: { preset: 'this_month', branch: '' } };
  function voucherScreen(kind, main, args) {
    const d = db(); const p = vP[kind]; if (args[0] === 'new') { setTimeout(() => Screens.voucherForm(kind), 50); history.replaceState(null, '', '#/' + kind + 's'); }
    const [from, to] = A.periodRange(p);
    const list = d.vouchers.filter(v => v.kind === kind && v.date >= from && v.date <= to && (!p.branch || v.branch === p.branch)).sort((a, b) => b.date.localeCompare(a.date) || b.no.localeCompare(a.no));
    const tot = S.r2(list.reduce((s, v) => s + v.amount, 0));
    const newLbl = { receipt: 'new_receipt', payment: 'new_payment', transfer: 'new_transfer' }[kind];
    const cols = kind === 'transfer' ? [t('number'), t('date'), t('transfer_from'), t('transfer_to'), t('amount'), t('fee'), t('branch'), t('notes')] : [t('number'), t('date'), kind === 'receipt' ? t('received_from') : t('paid_to'), kind === 'receipt' ? t('received_into') : t('paid_from_acc'), t('party_name_lbl'), t('amount'), t('approved_by'), t('branch'), t('notes')];
    main.innerHTML = A.filterBar(p, { extra: `<button class="btn primary sm" data-add>${icon('plus')}${esc(t(newLbl))}</button>` }) + `
      <div class="tiles three"><div class="tile"><span class="k">${esc(t('count'))}</span><span class="v num">${list.length}</span></div><div class="tile"><span class="k">${esc(t('total'))}</span><span class="v money">${money(tot)}</span></div></div>
      ${list.length ? `<div class="tablewrap mt"><table class="tbl">${U.th(cols.map(l => ({ l, r: l === t('amount') || l === t('fee') })))}<tbody>${list.map(v => kind === 'transfer'
        ? `<tr class="click" data-v="${v.id}"><td class="code">${v.no}</td><td class="num">${v.date}</td><td>${esc(A.accShort(v.from))}</td><td>${esc(A.accShort(v.to))}</td><td class="money strong">${money(v.amount)}</td><td class="money">${money(v.fee, { blankZero: true })}</td><td>${esc(v.branch ? A.branchName(v.branch) : '—')}</td><td class="memo">${esc(v.notes)}</td></tr>`
        : `<tr class="click" data-v="${v.id}"><td class="code">${v.no}</td><td class="num">${v.date}</td><td>${esc(A.accShort(kind === 'receipt' ? v.from : v.to))}</td><td>${esc(A.accShort(kind === 'receipt' ? v.to : v.from))}</td><td>${esc(v.party || '—')}</td><td class="money strong">${money(v.amount)}</td><td>${esc(v.approvedBy || '—')}</td><td>${esc(v.branch ? A.branchName(v.branch) : '—')}</td><td class="memo">${esc(v.notes)}</td></tr>`).join('')}</tbody></table></div>` : U.empty('—')}`;
    A.bindFilter(main, p, () => voucherScreen(kind, main, []));
    $('[data-add]', main).onclick = () => Screens.voucherForm(kind);
    $('[data-csv]', main).onclick = () => U.download(`${kind}-vouchers-${from}-${to}.csv`, U.csv([[t('number'), t('date'), 'from', 'to', t('amount'), t('fee'), t('notes')], ...list.map(v => [v.no, v.date, A.accName(v.from), A.accName(v.to), v.amount, v.fee, v.notes])]));
    $$('[data-v]', main).forEach(r => r.onclick = () => { const v = d.vouchers.find(x => x.id === r.dataset.v); Screens.entrySheet(v.journalId); });
  }
  Screens.receipts = (m, a) => voucherScreen('receipt', m, a);
  Screens.payments = (m, a) => voucherScreen('payment', m, a);
  Screens.transfers = (m, a) => voucherScreen('transfer', m, a);
  Screens.voucherForm = (kind, pre = {}) => {
    const d = db(); const cashOpts = { under: '1101' };
    const title = t({ receipt: 'new_receipt', payment: 'new_payment', transfer: 'new_transfer' }[kind]);
    const fromSel = kind === 'receipt' ? U.field(t('received_from'), U.accSelect(d, 'from', pre.from || '', { blank: '— ' + t('pick_account') + ' —', exclude: [] }))
      : kind === 'payment' ? U.field(t('paid_from_acc'), U.accSelect(d, 'from', pre.from || S.branchCash(d, A.defaultBranch()), cashOpts))
        : U.field(t('transfer_from'), U.accSelect(d, 'from', pre.from || S.branchCash(d, A.defaultBranch()), cashOpts));
    const toSel = kind === 'receipt' ? U.field(t('received_into'), U.accSelect(d, 'to', pre.to || d.sys.bank, cashOpts))
      : kind === 'payment' ? U.field(t('paid_to'), U.accSelect(d, 'to', pre.to || '', { blank: '— ' + t('pick_account') + ' —' }))
        : U.field(t('transfer_to'), U.accSelect(d, 'to', pre.to || d.sys.bank, cashOpts));
    U.openSheet({ title, wide: true, body: `<form id="vf">
      <div class="grid3">${U.field(t('date'), U.dateInput('date', today()))}${A.branchField('branch')}${U.field(t('amount'), U.moneyInput('amount', pre.amount ?? '', 'required'))}</div>
      <div class="grid2">${fromSel}${toSel}</div><div id="invpick"></div>
      ${kind === 'transfer' ? `<div class="grid2">${U.field(t('fee'), U.moneyInput('fee', ''))}${U.field(t('fee_account'), U.accSelect(d, 'feeAccount', d.sys.bankCharges, { types: ['expense'] }))}</div>`
        : `<div class="grid3">${U.field(t('party_name_lbl'), U.inp('party', pre.party || ''))}${U.field(t('pay_method'), U.sel('method', d.paymentMethods.filter(p => p.active).map(p => ({ v: p.key, l: L(p) })), kind === 'receipt' ? 'transfer' : 'cash'))}${U.field(t('approved_by'), U.inp('approvedBy', A.userName(A.user())))}</div>`}
      ${U.field(t('notes'), U.inp('notes', pre.notes || ''))}
      <button class="btn primary" type="submit">${esc(t('save'))}</button></form>`, onMount: (sh) => {
      const f = $('#vf', sh);
      const refreshInv = () => {
        const box = $('#invpick', f); if (kind !== 'payment' && kind !== 'receipt') return;
        const acct = $(`[name=${kind === 'payment' ? 'to' : 'from'}]`, f).value;
        const sup = kind === 'payment' && d.suppliers.find(s => s.account === acct); const cus = kind === 'receipt' && d.customers.find(c => c.account === acct);
        const invs = sup ? d.supplierInvoices.filter(i => i.supplierId === sup.id && i.status === 'posted' && i.total - i.paid > 0.005) : cus ? d.customerInvoices.filter(i => i.customerId === cus.id && i.total - i.paid > 0.005) : [];
        box.innerHTML = invs.length ? U.field(t('invoices'), U.sel('invoiceId', [{ v: '', l: '—' }, ...invs.map(i => ({ v: i.id, l: `${i.no} · ${i.date} · ${money(i.total - i.paid)}` }))], '')) : '';
        if (sup || cus) { const pn = $('[name=party]', f); if (pn && !pn.value) pn.value = (sup || cus).name; }
        const ip = $('[name=invoiceId]', f); if (ip) ip.onchange = () => { const i = invs.find(x => x.id === ip.value); if (i) $('[name=amount]', f).value = S.r2(i.total - i.paid); };
      };
      ['from', 'to'].forEach(n => $(`[name=${n}]`, f).addEventListener('change', refreshInv)); refreshInv();
      f.addEventListener('submit', (e) => { e.preventDefault(); const x = U.formData(f); if (!x.from || !x.to) return U.toast(t('pick_account'), 'bad');
        try { S.createVoucher(d, { kind, date: x.date, branch: x.branch, amount: parseFloat(x.amount) || 0, from: x.from, to: x.to, fee: parseFloat(x.fee) || 0, feeAccount: x.feeAccount, party: x.party, method: x.method, approvedBy: x.approvedBy, notes: x.notes, invoiceId: x.invoiceId || null, user: A.user().id }); U.closeSheet(); A.commit(t('voucher_saved')); } catch (er) { U.fail(er); } });
    } });
  };

  // ================================================================ FIXED ASSETS
  Screens.assets = (main) => {
    const d = db(); const lastYM = S.addMonths(today().slice(0, 7), -1);
    const rows = d.assets.map(a => { const acc = a.lastDep ? S.depreciationTo(a, a.lastDep) : 0; return { a, acc, book: S.r2(a.cost - acc) }; });
    const tot = rows.reduce((s, r) => ({ cost: s.cost + r.a.cost, acc: s.acc + r.acc, book: s.book + r.book }), { cost: 0, acc: 0, book: 0 });
    main.innerHTML = `<div class="toolbar"><span class="grow"></span><label class="inline-lbl">${esc(t('run_dep'))} <input class="input dt" type="month" data-ym value="${lastYM}" dir="ltr"></label><button class="btn secondary sm" data-run>${icon('check')}${esc(t('run_dep'))}</button><button class="btn primary sm" data-add>${icon('plus')}${esc(t('add_asset'))}</button></div>
      <div class="tiles three"><div class="tile"><span class="k">${esc(t('cost'))}</span><span class="v money">${money(tot.cost)}</span></div><div class="tile"><span class="k">${esc(t('acc_dep'))}</span><span class="v money">${money(tot.acc)}</span></div><div class="tile"><span class="k">${esc(t('book_value'))}</span><span class="v money">${money(tot.book)}</span></div></div>
      ${rows.length ? `<div class="tablewrap mt"><table class="tbl">${U.th([{ l: t('number') }, { l: t('asset') }, { l: t('purchase_date') }, { l: t('cost'), r: 1 }, { l: t('life_months'), r: 1 }, { l: t('monthly_dep'), r: 1 }, { l: t('acc_dep'), r: 1 }, { l: t('book_value'), r: 1 }, { l: t('last_dep') }])}<tbody>${rows.map(({ a, acc, book }) => `<tr><td class="code">${a.tag}</td><td class="strong">${esc(L({ ar: a.name, en: a.nameEn }))}<div class="small muted">${esc(A.accShort(a.account))}${a.branch ? ' · ' + esc(A.branchName(a.branch)) : ''}</div></td><td class="num">${a.start}</td><td class="money">${money(a.cost)}</td><td class="money">${a.life}</td><td class="money">${money(S.monthlyDep(a))}</td><td class="money">${money(acc)}</td><td class="money strong">${money(book)}</td><td>${a.lastDep ? esc(fmtMonth(a.lastDep)) : '—'}</td></tr>`).join('')}</tbody></table></div>` : U.empty('—')}`;
    $('[data-run]', main).onclick = () => { try { const ym = $('[data-ym]', main).value; const r = S.runDepreciation(d, ym, A.user().id); A.commit(r.length ? t('dep_posted', { n: r.length }) : t('dep_none')); } catch (er) { U.fail(er); } };
    $('[data-add]', main).onclick = () => {
      U.openSheet({ title: t('add_asset'), wide: true, body: `<form id="asf"><div class="grid2">${U.field(t('name_ar'), U.inp('name', '', 'required'))}${U.field(t('name_en'), U.inp('nameEn', '', 'dir="ltr"'))}</div>
        <div class="grid3">${U.field(t('asset_class'), U.accSelect(d, 'account', '120101', { under: '1201' }))}${A.branchField('branch')}${U.field(t('purchase_date'), U.dateInput('start', today()))}</div>
        <div class="grid3">${U.field(t('cost') + ' (' + t('subtotal') + ')', U.moneyInput('cost', '', 'required'))}${U.field(t('vat_15'), U.moneyInput('vat', ''))}${U.field(t('salvage'), U.moneyInput('salvage', '0'))}</div>
        <div class="grid2">${U.field(t('life_months'), U.inp('life', '60', 'type="number" min="1" dir="ltr"'), t('straight_line'))}${U.field(t('paid_from'), U.accSelect(d, 'paidFrom', d.sys.bank, { under: ['1101', '2101'] }))}</div>
        <button class="btn primary" type="submit">${esc(t('save'))}</button></form>`, onMount: (sh) => {
        const f = $('#asf', sh); $('[name=cost]', f).addEventListener('input', (e) => { $('[name=vat]', f).value = S.r2((parseFloat(e.target.value) || 0) * 0.15); });
        f.addEventListener('submit', (e) => { e.preventDefault(); const x = U.formData(f); try { S.addAsset(d, { name: x.name, nameEn: x.nameEn || x.name, account: x.account, branch: x.branch, start: x.start, cost: parseFloat(x.cost) || 0, vat: parseFloat(x.vat) || 0, salvage: parseFloat(x.salvage) || 0, life: +x.life || 60 }, { post: true, paidFrom: x.paidFrom, user: A.user().id }); U.closeSheet(); A.commit(t('asset_saved')); } catch (er) { U.fail(er); } });
      } });
    };
  };

  // ================================================================ PAYMENT METHODS
  Screens.paymethods = (main) => {
    const d = db();
    main.innerHTML = `<div class="toolbar"><span class="grow"></span><button class="btn primary sm" data-add>${icon('plus')}${esc(t('add_method'))}</button></div>
      <div class="tablewrap"><table class="tbl">${U.th([{ l: t('method_key') }, { l: t('name') }, { l: t('type') }, { l: t('linked_account') }, { l: t('status') }])}<tbody>${d.paymentMethods.map(p => `<tr class="click" data-pm="${p.id}"><td class="code">${esc(p.key)}</td><td class="strong">${esc(L(p))}</td><td>${esc(t('pmt_' + p.type))}</td><td>${p.account === '@branch_cash' ? esc(t('branch_cash_box')) : esc(A.accName(p.account))}</td><td>${U.pill(t(p.active ? 'active' : 'inactive'), p.active ? 'good' : 'neutral')}</td></tr>`).join('')}</tbody></table></div>`;
    const form = (p) => U.openSheet({ title: p.id ? L(p) : t('add_method'), body: `<form id="pmf"><div class="grid2">${U.field(t('name_ar'), U.inp('ar', p.ar || '', 'required'))}${U.field(t('name_en'), U.inp('en', p.en || '', 'dir="ltr"'))}</div>
      <div class="grid2">${U.field(t('method_key'), U.inp('key', p.key || '', 'dir="ltr" required' + (p.id ? ' readonly' : '')))}${U.field(t('type'), U.sel('type', ['cash', 'card', 'bnpl', 'bank', 'online', 'cheque'].map(v => ({ v, l: t('pmt_' + v) })), p.type || 'card'))}</div>
      ${U.field(t('linked_account'), U.sel('account', [{ v: '@branch_cash', l: t('branch_cash_box') }, ...U.accountOptions(d, { under: '1101' })], p.account || d.sys.bank))}
      <label class="featrow">${esc(t('active'))}${U.toggle('active', p.active !== false)}</label><button class="btn primary" type="submit">${esc(t('save'))}</button></form>`, onMount: (sh) => {
      $('#pmf', sh).addEventListener('submit', (e) => { e.preventDefault(); const x = U.formData(e.target); const rec = { id: p.id || S.uid(), key: x.key.trim().toLowerCase(), ar: x.ar, en: x.en || x.ar, type: x.type, account: x.account, active: x.active }; const i = d.paymentMethods.findIndex(y => y.id === rec.id); if (i >= 0) d.paymentMethods[i] = rec; else d.paymentMethods.push(rec); U.closeSheet(); A.commit(t('saved')); });
    } });
    $('[data-add]', main).onclick = () => form({});
    $$('[data-pm]', main).forEach(r => r.onclick = () => form(d.paymentMethods.find(p => p.id === r.dataset.pm)));
  };

  // ================================================================ SETTINGS
  Screens.settings = (main) => {
    const d = db(); const s = d.settings;
    const sysKeys = ['bank', 'vatIn', 'vatOut', 'purchases', 'salesCorporate', 'cashOverShort', 'depExpense', 'gatewayFees', 'bankCharges', 'retained'];
    const years = [...new Set(d.journal.map(j => j.date.slice(0, 4)))].sort();
    main.innerHTML = `<form id="sf" class="cols eq"><div>
      <div class="card"><h3 class="h3 mt0">${esc(t('fiscal_year'))}</h3>${U.field(t('fiscal_start'), U.inp('fiscalStart', s.fiscalStart, 'dir="ltr" placeholder="01-01"'))}
        ${A.feat('period_lock') ? U.field(t('lock_date'), U.dateInput('lockDate', s.lockDate || ''), t('lock_hint')) : ''}
        ${A.feat('zakat') ? `<label class="featrow">${esc(t('zakat_on'))}${U.toggle('zakat', s.zakat)}</label>` : ''}
        ${U.field(t('inv_system'), U.sel('inventorySystem', [{ v: 'periodic', l: t('inv_periodic') }, { v: 'perpetual', l: t('inv_perpetual') }], s.inventorySystem))}</div>
      <div class="card mt"><h3 class="h3 mt0">${esc(t('voucher_print'))}</h3>${U.field(t('paper_size'), U.sel('voucherPaper', [{ v: 'A5', l: 'A5' }, { v: 'A4', l: 'A4' }, { v: '80mm', l: '80mm' }], s.voucherPaper))}
        <label class="featrow">${esc(t('print_on_save'))}${U.toggle('printOnSave', s.printOnSave)}</label><label class="featrow">${esc(t('numbering_branch'))}${U.toggle('numberingByBranch', s.numberingByBranch)}</label></div>
      ${A.feat('period_lock') ? `<div class="card mt"><h3 class="h3 mt0">${esc(t('year_close'))}</h3><p class="hint">${esc(t('year_close_hint'))}</p><div class="toolbar"><select class="select fb" data-year>${years.map(y => `<option ${y === String(+today().slice(0, 4) - 1) ? 'selected' : ''}>${y}</option>`).join('')}</select><button type="button" class="btn danger sm" data-close>${icon('lock')}${esc(t('close_year_btn'))}</button></div><div id="confirm"></div>
        ${(d.fiscalYears || []).map(y => `<div class="kv"><span class="k">${y.year}</span><span class="v">${U.pill(t('year_closed'), 'good')} <span class="money">${money(y.net)}</span></span></div>`).join('')}</div>` : ''}
      </div><div>
      <div class="card"><h3 class="h3 mt0">${esc(t('system_accounts'))}</h3><p class="hint">${esc(t('system_accounts_hint'))}</p>${sysKeys.map(k => U.field(t('sys_' + k), U.accSelect(d, 'sys_' + k, d.sys[k]))).join('')}
        ${d.branches.map(b => U.field(t('m_cash') + ' — ' + L(b), U.accSelect(d, 'cash_' + b.id, d.sys.cashByBranch[b.id], { under: '1101' })) + U.field(t('revenue') + ' — ' + L(b), U.accSelect(d, 'sales_' + b.id, d.sys.salesByBranch[b.id], { types: ['revenue'] }))).join('')}</div>
      </div><div class="sticky-save"><button class="btn primary" type="submit">${esc(t('save'))}</button></div></form>`;
    const f = $('#sf', main);
    f.addEventListener('submit', (e) => { e.preventDefault(); const x = U.formData(f);
      Object.assign(s, { fiscalStart: x.fiscalStart || '01-01', inventorySystem: x.inventorySystem, voucherPaper: x.voucherPaper, printOnSave: x.printOnSave, numberingByBranch: x.numberingByBranch });
      if ('lockDate' in x) s.lockDate = x.lockDate || null; if ('zakat' in x) s.zakat = x.zakat;
      for (const k of sysKeys) if (x['sys_' + k]) d.sys[k] = x['sys_' + k];
      for (const b of d.branches) { if (x['cash_' + b.id]) d.sys.cashByBranch[b.id] = x['cash_' + b.id]; if (x['sales_' + b.id]) d.sys.salesByBranch[b.id] = x['sales_' + b.id]; }
      A.commit(t('settings_saved')); });
    const cb = $('[data-close]', main); if (cb) cb.onclick = () => { const y = $('[data-year]', main).value; U.confirmInline($('#confirm', main), t('year_close') + ' ' + y + ' — ' + t('are_you_sure'), () => { try { S.closeYear(d, y, A.user().id); A.commit(t('year_closed')); } catch (er) { U.fail(er); } }, t('close_year_btn')); };
  };

  // ================================================================ BRANCHES
  Screens.branches = (main) => {
    const d = db(); const lim = A.tenant().limits.branches;
    main.innerHTML = `<div class="toolbar"><span class="muted">${esc(t('branches_n', { n: d.branches.length + ' / ' + lim }))}</span><span class="grow"></span><button class="btn primary sm" data-add ${d.branches.length >= lim ? 'disabled' : ''}>${icon('plus')}${esc(t('add_branch'))}</button></div>
      <div class="tablewrap"><table class="tbl">${U.th([{ l: t('code') }, { l: t('branch_name') }, { l: t('city') }, { l: t('m_cash') }, { l: t('revenue') }, { l: t('users') }])}<tbody>${d.branches.map(b => `<tr class="click" data-b="${b.id}"><td class="code">${esc(b.code)}</td><td class="strong">${esc(L(b))}</td><td>${esc(b.city || '')}</td><td>${esc(A.accName(d.sys.cashByBranch[b.id]))}</td><td>${esc(A.accName(d.sys.salesByBranch[b.id]))}</td><td class="money">${d.users.filter(u => u.branch === b.id).length}</td></tr>`).join('')}</tbody></table></div>`;
    const form = (b) => U.openSheet({ title: b.id ? L(b) : t('add_branch'), body: `<form id="bf"><div class="grid2">${U.field(t('branch_name') + ' (ع)', U.inp('ar', b.ar || '', 'required'))}${U.field(t('branch_name') + ' (EN)', U.inp('en', b.en || '', 'dir="ltr"'))}</div><div class="grid2">${U.field(t('code'), U.inp('code', b.code || '', 'dir="ltr" maxlength="4" required style="text-transform:uppercase"'))}${U.field(t('city'), U.inp('city', b.city || 'جدة'))}</div><button class="btn primary" type="submit">${esc(t('save'))}</button></form>`, onMount: (sh) => {
      $('#bf', sh).addEventListener('submit', (e) => { e.preventDefault(); const x = U.formData(e.target); try { if (b.id) { Object.assign(b, { ar: x.ar, en: x.en || x.ar, code: x.code.toUpperCase(), city: x.city }); U.closeSheet(); A.commit(t('saved')); } else { if (d.branches.length >= lim) return U.toast(t('limit_reached'), 'bad'); S.addBranch(d, { ar: x.ar, en: x.en || x.ar, code: x.code, city: x.city }); U.closeSheet(); A.commit(t('branch_saved')); } } catch (er) { U.fail(er); } });
    } });
    $('[data-add]', main).onclick = () => form({});
    $$('[data-b]', main).forEach(r => r.onclick = () => form(d.branches.find(b => b.id === r.dataset.b)));
  };

  // ================================================================ USERS
  Screens.users = (main) => {
    const d = db(); const lim = A.tenant().limits.users;
    main.innerHTML = `<div class="toolbar"><span class="muted">${esc(t('users_n', { n: d.users.length + ' / ' + lim }))}</span><span class="grow"></span><button class="btn primary sm" data-add ${d.users.length >= lim ? 'disabled' : ''}>${icon('plus')}${esc(t('add_user'))}</button></div>
      <div class="tablewrap"><table class="tbl">${U.th([{ l: t('name') }, { l: t('role') }, { l: t('branch') }, { l: t('status') }])}<tbody>${d.users.map(u => `<tr class="click" data-u="${u.id}"><td class="strong">${esc(A.userName(u))}</td><td>${U.pill(t('role_' + u.role), u.role === 'admin' ? 'info' : u.role === 'accountant' ? 'good' : 'neutral')}</td><td>${esc(u.branch ? A.branchName(u.branch) : t('all_branches'))}</td><td>${U.pill(t(u.active ? 'active' : 'inactive'), u.active ? 'good' : 'neutral')}</td></tr>`).join('')}</tbody></table></div>`;
    const form = (u) => U.openSheet({ title: u.id ? A.userName(u) : t('add_user'), body: `<form id="uf"><div class="grid2">${U.field(t('name_ar'), U.inp('name', u.name || '', 'required'))}${U.field(t('name_en'), U.inp('nameEn', u.nameEn || '', 'dir="ltr"'))}</div>
      <div class="grid3">${U.field(t('role'), U.sel('role', ['admin', 'accountant', 'operator'].map(r => ({ v: r, l: t('role_' + r) })), u.role || 'operator'))}${U.field(t('branch'), U.sel('branch', [{ v: '', l: t('all_branches') }, ...A.branchOptions()], u.branch || ''))}${U.field(t('pin'), U.inp('pin', u.pin || '1234', 'inputmode="numeric" dir="ltr" maxlength="6"'))}</div>
      <label class="featrow">${esc(t('active'))}${U.toggle('active', u.active !== false)}</label><button class="btn primary" type="submit">${esc(t('save'))}</button></form>`, onMount: (sh) => {
      $('#uf', sh).addEventListener('submit', (e) => { e.preventDefault(); const x = U.formData(e.target); if (!u.id && d.users.length >= lim) return U.toast(t('limit_reached'), 'bad'); const rec = { id: u.id || S.uid(), name: x.name, nameEn: x.nameEn || x.name, role: x.role, branch: x.branch || null, pin: x.pin, active: x.active }; const i = d.users.findIndex(y => y.id === rec.id); if (i >= 0) d.users[i] = rec; else d.users.push(rec); U.closeSheet(); A.commit(t('user_saved')); });
    } });
    $('[data-add]', main).onclick = () => form({});
    $$('[data-u]', main).forEach(r => r.onclick = () => form(d.users.find(u => u.id === r.dataset.u)));
  };

  // ================================================================ ROLES & PERMISSIONS
  Screens.roles = (main) => {
    const d = db(); const roles = ['accountant', 'operator'];
    main.innerHTML = `<p class="muted lead">${esc(t('roles_hint'))}</p><form id="rf"><div class="tablewrap"><table class="tbl">${U.th([{ l: t('perm') }, { l: t('role_admin') }, ...roles.map(r => ({ l: t('role_' + r) }))])}<tbody>
      ${S.PERMS.map(p => { const off = p.f && !A.feat(p.f); return `<tr class="${off ? 'off' : ''}"><td>${esc(L(p))}${off ? ' ' + U.pill(t('feature_off'), 'neutral') : ''}</td><td>${U.toggle('x', true, 'disabled')}</td>${roles.map(r => `<td>${U.toggle(r + '__' + p.key, (d.roles[r] || []).includes(p.key), off ? 'disabled' : '')}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div>
      <div class="sticky-save"><button class="btn primary" type="submit">${esc(t('save'))}</button></div></form>`;
    $('#rf', main).addEventListener('submit', (e) => { e.preventDefault(); const x = U.formData(e.target); for (const r of roles) d.roles[r] = S.PERMS.filter(p => x[r + '__' + p.key] || ((p.f && !A.feat(p.f)) && (d.roles[r] || []).includes(p.key))).map(p => p.key); A.commit(t('saved')); });
  };

  // ================================================================ COMPANY
  Screens.company = (main) => {
    const d = db(); const c = d.company;
    main.innerHTML = `<form id="cf" class="card narrow">${U.field(t('company_name') + ' (ع)', U.inp('name', c.name, 'required'))}${U.field(t('company_name') + ' (EN)', U.inp('nameEn', c.nameEn, 'dir="ltr"'))}
      <div class="grid2">${U.field(t('vat_number'), U.inp('vat', c.vat, 'dir="ltr" inputmode="numeric" maxlength="15"'))}${U.field(t('cr_number'), U.inp('cr', c.cr, 'dir="ltr" inputmode="numeric"'))}</div>
      <div class="grid2">${U.field(t('city'), U.inp('city', c.city))}${U.field(t('national_address'), U.inp('address', c.address || ''))}</div>
      <button class="btn primary" type="submit">${esc(t('save'))}</button></form>`;
    $('#cf', main).addEventListener('submit', (e) => { e.preventDefault(); Object.assign(c, U.formData(e.target)); A.commit(t('saved')); });
  };
})();
