for (const f of ['zatca','store','einvoice']) require(require('path').join(__dirname,'../js/'+f+'.js'));
const S=globalThis.Store, Z=globalThis.Zatca; const ok=(c,m)=>{ if(!c){console.log('FAIL',m); process.exitCode=1;} else console.log('ok ',m); };
const db=S.seedCandyLoz(); const t0=S.todayISO(), y0=t0.slice(0,4)+'-01-01';
ok(db.items.length===9,'items seeded'); ok(db.devices.length===3,'3 EGS devices'); ok(db.salesDocs.length===4,'4 demo docs');
console.log(db.salesDocs.map(d=>[d.no,d.kind,d.profile,d.icv,d.totals.payable,d.zatca.status].join(' ')).join('\n'));
ok(S.sellerIssues(db).length===0,'seller profile valid '+S.sellerIssues(db));
ok(S.verifyChains(db).every(c=>c.ok),'chains verify');
const tb=S.trialBalance(db,{from:'2000-01-01',to:t0}); ok(tb.balanced,'TB balanced');
ok(S.balanceSheet(db,{asOf:t0}).balanced,'BS balanced');
const inv=db.salesDocs[0]; const je=db.journal.find(j=>j.id===inv.journalId);
try{S.updateEntry(db,je.id,{memo:'x'});ok(false,'edit lock')}catch(e){ok(e.code==='einvoice_locked','edit locked')}
try{S.reverseEntry(db,je.id);ok(false,'rev lock')}catch(e){ok(e.code==='einvoice_locked','reverse locked')}
// credit exceed
try{S.issueDoc(db,{kind:'credit',origId:inv.id,reasonCode:'return',payMethod:'credit',lines:[{name:'x',qty:1,price:999999,cat:'S'}]});ok(false,'exceed')}catch(e){ok(e.issues&&e.issues.includes('credit_exceeds'),'credit cannot exceed invoice')}
// standard needs buyer
try{S.issueDoc(db,{kind:'invoice',profile:'standard',lines:[{name:'x',qty:1,price:10,cat:'S'}]});ok(false,'buyer')}catch(e){ok(e.issues.includes('buyer_name'),'standard requires buyer: '+e.issues)}
// zero-rated needs vatex
try{S.issueDoc(db,{kind:'invoice',profile:'simplified',lines:[{name:'x',qty:1,price:10,cat:'Z'}]});ok(false,'vatex')}catch(e){ok(e.issues.includes('line_vatex'),'vatex required')}
// simplified with export line + debit note
const s1=S.issueDoc(db,{kind:'invoice',profile:'simplified',branch:'b1',payMethod:'cash',lines:[{name:'شوكولاتة',qty:3,price:10.5,cat:'S'},{name:'تصدير',qty:1,price:100,cat:'Z',vatex:'VATEX-SA-32'}]});
ok(s1.icv===4 && s1.pih===db.salesDocs.filter(d=>d.branch==='b1')[2].hash,'icv/pih chained '+s1.icv);
const dn=S.issueDoc(db,{kind:'debit',origId:s1.id,reason:'Price correction',payMethod:'cash',lines:[{name:'فرق سعر',qty:1,price:5,cat:'S'}]});
ok(dn.billingRef===s1.no && dn.profile==='simplified','debit note refs invoice');
ok(S.verifyChains(db).every(c=>c.ok),'chains still verify');
// tamper detection
const keep=db.salesDocs[1].totals.payable; db.salesDocs[1].lines[0].qty=99; ok(!S.verifyChains(db).every(c=>c.ok),'tamper detected'); db.salesDocs[1].lines[0].qty=2;
ok(S.verifyChains(db).every(c=>c.ok),'restored');
const q=Z.decodeTlv(s1.qr); ok(q[1]==='مؤسسة كاندي لوز التجارية'&&q[2]==='314944989200003'&&q[4]===Z.money2(s1.totals.payable),'QR tags '+JSON.stringify(q));
const xml=S.docXml(db,inv); ok(xml.includes('<cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>'),'xml type code'); ok(Z.sha256b64(xml.split('\n')[1])===inv.hash,'hash = sha of xml');
const cn=db.salesDocs[2]; ok(S.docXml(db,cn).includes('<cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>'+inv.no),'credit note billing ref');
// VAT return vs ledger
const vr=S.vatReturn(db,{from:y0,to:t0}); console.log('boxes',JSON.stringify(vr.boxes[1]),JSON.stringify(vr.boxes[4]),JSON.stringify(vr.boxes[6]),JSON.stringify(vr.boxes[12]),'13',vr.b13,'16',vr.b16,'ledger',vr.ledger.output,vr.ledger.input,'diff',vr.diffOut,vr.diffIn,'due',vr.dueDate);
ok(Math.abs(vr.diffOut)<0.05 && Math.abs(vr.diffIn)<0.05,'VAT return reconciles to ledger');
const zk=S.zakatWorksheet(db,{year:t0.slice(0,4)}); console.log('zakat',zk.totalSources,zk.totalDed,zk.base,zk.due,zk.deadline);
ok(zk.base>0 && zk.due===S.r2(zk.base*0.025776),'zakat computed'); S.postZakat(db,{year:t0.slice(0,4),amount:zk.due}); ok(S.trialBalance(db,{from:'2000-01-01',to:t0+'x'}).balanced,'TB after zakat');
const cmp=S.compliance(db); console.log('compliance',cmp.score,cmp.items.map(i=>i.key+':'+i.ok).join(' '));
// migrate old db
const old=JSON.parse(JSON.stringify(db)); delete old.items; delete old.devices; delete old.salesDocs; delete old.company.addr; old.migrations={editPosted:true}; const m=S.einvEnsure(old); ok(m.devices.length===3 && m.company.einv,'ensure old db');
console.log('KB',Math.round(JSON.stringify(db).length/1024), 'xml bytes', xml.length);

