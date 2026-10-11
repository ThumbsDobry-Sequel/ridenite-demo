/* RideNite POS integration demo. Plain JS, no dependencies, no network calls.
   SIMULATED: every guest, driver, amount, plate and drop-off address is fictional sample data.
   Venue 1 is Maison Cheryl (real restaurant, 2900 Wilson Blvd, Arlington, VA) shown as an illustrative example, not a live RideNite partner.
   Screen IDs follow ui/ui-spec.md (B4, B6, B7, P5, P7, P9, P11, M1, M2, E2). New IDs added
   by this demo: T1 to T7 (POS mock), P0, P3c, P14, E7 (see build-spec.md section 2). */
(function(){
'use strict';
const V='Maison Cheryl', CAP_PCT=0.20, CAP_MAX=5.00, TAXR=0.11;
/* Fare policy of record: quote plus capped adjustment. Cap = lesser of 20% of the quote or $5.00 [A]
   (fare-adjustment-cap-analysis.md). Shown to the guest in dollars before booking. */
const capFor=q=>Math.round(Math.min(CAP_PCT*q,CAP_MAX)*100)/100;
/* Roaming night pass (optional, post-pilot gated; roaming-network-design.md). Second venue shown in a different POS skin. */
const V2='Bar Lumen', V2SKIN='square';
const PASS={first:'Maya',init:'R.',brand:'Visa',last4:'4242',expires:'6:00 AM',code:'K7Q2MX'};
const B2DRINKS=[['Mezcal Paloma',16],['Club Soda',3]]; // Bar 2 tab items (fictional sample partner bar)
const NEAR_MIN=2; /* car-close notice, venue setting 1 to 5 [A] */
const VN=()=>S.venue===2?V2:V, TBL=()=>S.venue===2?'Bar 4':S.discreet?'Table 4':'Table 7', CHK=()=>S.venue===2?'2210':S.discreet?'4473':'4468';
const FN=()=>S.discreet?'Rosa':'Maya', NAME=()=>S.discreet?'Rosa L.':'Maya R.', L4=()=>S.discreet?'1881':'4242';
const SKIN=()=>S.venue===2?V2SKIN:ctl.skin, ITEMS=()=>S.venue===2?B2DRINKS:DRINKS.concat(FOOD);
const OPENED=()=>S.venue===2?'10:20 PM':S.discreet?'8:35 PM':'7:42 PM', SERVER=()=>S.venue===2?'Theo':'Imani', POSTED=()=>S.venue===2?'11:51 PM':'11:11 PM';
const FIN={higher:24.60,lower:18.90,over:27.40};
const WHY={higher:'Trip ran longer than estimated',lower:'Shorter trip than estimated',over:'Guest added a stop at 11:28 PM'};
/* Item names from Maison Cheryl's published menus (maisoncheryl.com, Oct 2026); prices are sample. */
const DRINKS=[['The Pear Necessities',14],['Old Fashioned',15],['House Beer',8]], FOOD=[['Madeleines',12]];
const SKINS={toast:'Toast-style POS',square:'Square-style POS',clover:'Clover-style POS',lightspeed:'Lightspeed-style POS',touchbistro:'TouchBistro-style POS'};
const STATUS=['none','requested','en_route','arrived','picked_up','complete'];
const r2=n=>Math.round(n*100)/100;
const fmt=n=>Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const m=n=>(n<0?'-$':'$')+fmt(n);
const sm=n=>(n<0?'-$':'+$')+fmt(n);
const ic=(id,s)=>`<svg width="${s||22}" height="${s||22}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const A=t=>`<span class="aflag">[A${t?': '+t:''}]</span>`;

const BASE={tab:'none',cardModal:true,panel:0,entry:null,dropMode:'enter',addr:false,quote:21,changed:false,saw:false,sawBy:null,
  ride:'none',recon:false,close:'open',tip:20,overOk:null,paid:false,
  venue:1,pass:'none',match:null,linkMethod:null,confirmed:false,tab1:'open',
  discreet:false,quiet:false,near:false,receipt:null};
let ctl={skin:'toast',scen:'higher',roam:'one_strong',receipt:'neutral'};
let S=Object.assign({},BASE), cur='P0', mode='guided', step=0;
const params=new URLSearchParams(location.search);
if(params.get('shot')) document.body.classList.add('shot');

/* ---------- money ---------- */
function calc(){
  const scen=S.scen||ctl.scen, pol='adjust';
  const food=ITEMS().reduce((a,b)=>a+b[1],0);
  const tax=r2(food*TAXR);
  const booked=STATUS.indexOf(S.ride)>=1;
  const q=S.quote, fin=FIN[scen], diff=r2(fin-q);
  let adj=0,pend=0,declined=0;
  if(pol==='adjust'&&S.recon){
    if(diff>0){adj=Math.min(diff,capFor(q));pend=r2(diff-adj);
      if(pend>0&&S.overOk===true){adj=diff;pend=0;}
      if(pend>0&&S.overOk===false){declined=pend;pend=0;}}
    else adj=diff;
  }
  const ride=booked?q:0;
  const tip=S.close==='closed'?0:r2(food*S.tip/100);
  const pre=r2(food+tax+ride+adj);
  return {scen,pol,food,tax,q,fin,diff,cap:capFor(q),why:WHY[scen],adj:r2(adj),pend,declined,ride,tip,pre,total:r2(pre+tip),booked,rideTotal:r2(ride+adj)};
}
function disc(q){
  return `${m(q)} on your tab at ${VN()}. Final fare may differ by up to ${m(capFor(q))}. More than that and we'll ask you first. If it comes in lower, you get the difference back.`;
}
const quoteLine=()=>`${ic('clock',20)} Quote. Final fare settles when the ride ends.`;
const rideLabel=()=>'Courtesy car, quoted fare';
/* Founder wording: 'Ride fare adjustment (final fare $24.60, quoted $21.00) +$3.60' */
const adjName=c=>`${c.adj<0?'Ride fare credit':'Ride fare adjustment'} (final fare ${m(c.fin)}, quoted ${m(c.q)})`;
function adjNote(c){
  if(c.diff<0) return `${c.why}. Difference credited back.`;
  if(c.declined>0||S.overOk===true) return `${c.why}.`;
  if(c.pend>0) return `${c.why}. Up to ${m(c.cap)} added, as shown before booking; ${m(c.pend)} waits for your OK.`;
  return `${c.why}. Within the ${m(c.cap)} shown before booking.`;
}

/* ---------- shared chrome ---------- */
function posTop(time){return `<div class="ptop"><span class="mk">${SKINS[SKIN()]}</span><span>${S.venue===2?V2+' (sample partner bar)':VN()} · Bar terminal ${S.venue===2?2:1} · Server: ${SERVER()}</span><span class="sp"></span><span class="sim">SIMULATED POS</span><span class="tm">${time}</span></div>`;}
function posLines(c){
  let h='';
  ITEMS().forEach(([n,p])=>h+=`<div class="ln"><span class="nm">${n}</span><span>${m(p)}</span></div>`);
  if(c.booked){
    h+=`<div class="ln ride"><span class="nm">${rideLabel()}<small>RideNite · Northside Car Service · posted ${POSTED()}${S.pass==='linked'?' · night pass':''} · no sales tax ${A('counsel')}</small></span><span>${m(c.q)}</span></div>`;
    if(!S.recon) h+=`<div class="ln pend"><span class="nm">Final fare settles when the ride ends<small>Up to ${m(c.cap)} over the quote may post (20%, max $5.00); more needs the guest's OK</small></span><span>pending</span></div>`;
  }
  if(S.recon&&c.adj!==0) h+=`<div class="ln ${c.adj>0?'adj':'cr'}"><span class="nm">${adjName(c)}<small>${c.why} · posted 11:38 PM · no sales tax ${A()}</small></span><span>${sm(c.adj)}</span></div>`;
  if(S.recon&&c.pend>0) h+=`<div class="ln pend"><span class="nm">Over the ${m(c.cap)} cap: ${m(c.pend)}<small>Not on the tab. ${c.why}, so the guest is asked first (E7).</small></span><span>held</span></div>`;
  return h;
}
function posTotals(c,showTipNote){
  return `<div class="tot">
   <div class="r"><span>Drinks and food</span><span>${m(c.food)}</span></div>
   <div class="r"><span>Tax 11% (drinks and food only)</span><span>${m(c.tax)}</span></div>
   ${c.booked?`<div class="r"><span>Ride lines (no sales tax ${A('counsel')})</span><span>${m(c.rideTotal)}</span></div>`:''}
   <div class="r big"><span>${showTipNote?'Total before tip':'Balance'}</span><span>${m(c.pre)}</span></div>
   ${showTipNote?`<div class="r" style="font-size:13px"><span>Tip base ${m(c.food)}: drinks and food, not the ride</span><span></span></div>`:''}
  </div>`;
}
function rideWord(s){return {requested:'Requested',en_route:'Driver on the way',arrived:'Arrived',picked_up:'Picked up',complete:'Completed'}[s]||'';}
/* POS menu buttons. Venue 1: item names from Maison Cheryl's published menus, sample prices. Venue 2: fictional sample partner bar. */
const MENU1=[['The Pear Necessities',14],['Just Peachy',14],['Old Fashioned',15],['Gin Martini',15],['Manhattan',15],['House Red',12],['House White',12],['House Ros\u00e9',12]];
const MENU2=[['Spicy Margarita',15],['Negroni',15],['Mezcal Paloma',16],['Mezcal Mule',15],['Gin Fizz',14],['Seasonal Spritz',13],['Club Soda',3],['House Lager',8]];
const menuGrid=()=>(S.venue===2?MENU2:MENU1).map(([n,p])=>`<button class="item">${n}<small>${m(p)}</small></button>`).join('');
function posCheck(time,extraActs,panelHtml){
  const c=calc();
  return `<div class="pos sk-${SKIN()}">${posTop(time)}
  <div class="pbody">
   <div class="cats"><button class="cat on">Cocktails</button><button class="cat">Beer</button><button class="cat">Wine</button><button class="cat">Food</button><button class="cat">N/A drinks</button><div style="flex:1"></div><button class="cat rn" data-act="rnOpen">RideNite</button></div>
   <div class="menu">
${menuGrid()}
   </div>
   <div class="check">
    <div class="chd"><b>${TBL()} · ${NAME()}</b><div>Check #${CHK()} · opened ${OPENED()} · card on tab: Visa ending ${L4()}</div>
     ${c.booked?`<div style="margin-top:6px"><span class="pill info" style="color:#1D4ED8;border-color:#1D4ED8">${ic('car',16)} Ride: ${rideWord(S.ride)} · Northside Car Service</span></div>`:''}</div>
    <div class="lines">${posLines(c)}</div>
    ${posTotals(c,false)}
    <div class="acts">${extraActs||`<button class="pb">Send</button><button class="pb">Pay</button>${S.venue===1&&(S.pass!=='none'||mode==='free')?`<button class="pb" data-act="passOffer">Night pass</button>`:''}<button class="pb rn" data-act="rnOpen">${ic('car',18)} RideNite: Book a car</button>`}</div>
   </div>
  </div>${panelHtml||''}</div>`;
}
function side(on){
  const it=[['Tonight','grid','B1'],['Live rides','car','B4'],['Ride history','list','B5'],['Billing','receipt','B7'],['Settings','gear','B8']];
  return `<nav class="side" aria-label="RideNite"><div class="brand"><i></i>RideNite</div>${it.map(([t,i,id])=>`<button class="nav${id===on?' on':''}" ${['B4','B7'].includes(id)?`data-go="${id}"`:''}>${ic(i)}${t}</button>`).join('')}
   <div class="foot"><span class="sim">FICTIONAL SAMPLE DATA</span><br><br>Signed in: Imani (bar)</div></nav>`;
}
function top(time,rides){return `<div class="topbar"><h1>${VN()}</h1><span class="pill ok">Full Live</span><span class="muted">${time}</span><span class="muted">Rides tonight: ${rides}</span><span style="flex:1"></span><button class="btn btn-primary bigbook" style="min-height:56px;font-size:20px">${ic('car',24)} Book ride</button></div>`;}
function ctx(title,body){return `<aside class="ctx"><span class="tagp">SIMULATED</span><h4>${title}</h4>${body}</aside>`;}
function epPill(){return S.entry==='staff_offer'?'I offered':'Guest asked';}
function panel(inner){return `<div class="rnp-scrim"></div><section class="rnp" role="dialog" aria-label="RideNite inside the POS">
  <div class="hd"><div class="brand"><i></i>RideNite</div><span class="sim">SIMULATED</span><span class="sp"></span><button class="btn btn-secondary dbtn" style="width:auto;min-height:44px;padding:0 14px;font-size:16px" data-act="rnClose">Close</button></div>${inner}</section>`;}
const SCR={};

/* ---------- POS screens ---------- */
SCR.T1=()=>`<div class="pos sk-${ctl.skin}">${posTop('Fri 7:42 PM')}
  <div class="pbody" style="grid-template-columns:170px 1fr">
   <div class="cats"><button class="cat on">Open tabs</button><button class="cat">Tables</button><button class="cat">Closed</button></div>
   <div class="tabs">
    <button class="tabt"><b>Bar 3 · Dev K.</b><span>Check #4471 · $36.00</span></button>
    <button class="tabt"><b>Table 12 · Jordan T.</b><span>Check #4459 · $71.50</span></button>
    <button class="tabt"><b>Bar 5 · Ana G.</b><span>Check #4462 · $28.00</span></button>
    <button class="tabt"><b>Table 2 · Priya S. +2</b><span>Check #4465 · $112.00</span></button>
    <button class="tabt"><b>Bar 9 · Sam O.</b><span>Check #4466 · $22.00</span></button>
    <button class="tabt new" data-act="cardModal">+ New tab</button>
   </div>
  </div>
  ${S.cardModal?`<div class="modal"><div class="mbox" role="dialog" aria-label="Start a tab">
   <h3>Start a tab</h3>
   <div class="cardart"><span>VISA (sample)</span><span>•••• •••• •••• 4242</span><span>MAYA R.</span></div>
   <div>Card read. Name on tab: <b>Maya R.</b> · Table 7 · Check #4468</div>
   <div style="color:#4B5563;font-size:14px">Card stays on the tab, the standard bar tab practice. The pre-authorization amount follows the venue's processor settings ${A('processor')}. Nothing about RideNite happens here.</div>
   <div style="display:grid;grid-template-columns:1fr 2fr;gap:10px"><button class="pb">Cancel</button><button class="pb pri" id="startTab" data-act="startTab">Start tab for Maya R.</button></div>
  </div></div>`:''}
 </div>`;
SCR.T2=()=>posCheck('Fri 11:10 PM');
SCR.T3=()=>posCheck('Fri 11:10 PM','',panel(`
  <div class="step">Step 1 of 3 · Book a car</div><h2>Whose tab?</h2>
  <button class="opt sel">${ic('person',24)}<div><b>Table 7 · Maya R. ...0127</b><div class="muted" style="font-size:15px">Check #4468 · $49.00 · the check you're on</div></div></button>
  <button class="opt">${ic('person',24)}<div><b>Bar 3 · Dev K. ...0144</b><div class="muted" style="font-size:15px">Check #4471 · $36.00</div></div></button>
  <button class="opt">${ic('people',24)}<div><b>Table 2 · Priya S. +2</b><div class="muted" style="font-size:15px">Check #4465 · $112.00</div></div></button>
  <h2 style="font-size:22px;margin-top:6px">How did this start?</h2>
  <div class="two"><button class="btn btn-secondary ep" data-act="entry" data-v="guest_request">${ic('hand',26)} Guest asked</button><button class="btn btn-secondary ep" data-act="entry" data-v="staff_offer">${ic('person',26)} I offered</button></div>
  <p class="help">We record only which one. No reason, notes or drink counts.</p>
  <div class="q" style="font-size:16px"><b>Offer line:</b> "Can I get you a car home? It goes on your tab."<div class="muted" style="font-size:14px;margin-top:4px">A car never replaces stopping service.</div></div>`));
SCR.T4=()=>posCheck('Fri 11:10 PM','',panel(`
  <div class="step">Step 2 of 3 · Drop-off</div>
  <div><span class="pill warn">${epPill()}</span> <b style="font-size:18px;margin-left:6px">${TBL()} · check #${CHK()}</b></div>
  <div class="muted" style="font-size:15px">Maya R. ...0127 · pickup: ${S.venue===2?'Bar Lumen, front door':'front door, N Fillmore St.'}</div>
  <button class="opt ${S.dropMode==='link'?'sel':''}" data-act="dropMode" data-v="link">${ic('phone',24)}<div><b>Text Maya a link to enter drop-off</b><div class="muted" style="font-size:15px">She picks the address and sees the price on her phone</div></div></button>
  <button class="opt">${ic('grid',24)}<div><b>Or show a QR</b></div></button>
  <button class="opt ${S.dropMode==='enter'?'sel':''}" data-act="dropMode" data-v="enter">${ic('kbd',24)}<div><b>I'll enter the drop-off</b><div class="muted" style="font-size:15px">Then show the guest the price and fare note</div></div></button>
  ${S.dropMode==='enter'?`<label style="font-weight:700">Address or place</label><input class="inp" value="655 prk pl" aria-label="Drop-off address">
   <div class="muted" style="font-size:14px">Did you mean</div>
   <button class="opt" data-act="addr">${ic('pin',24)}<div><b>655 N Harrison St</b><div class="muted" style="font-size:15px">Westover, Arlington, VA 22205</div></div></button>
   <button class="opt">${ic('pin',24)}<div><b>655 S Harrison St</b><div class="muted" style="font-size:15px">Arlington, VA 22204</div></div></button>
   <button class="opt">${ic('pin',24)}<div><b>655 Harrison St NW</b><div class="muted" style="font-size:15px">Washington, DC</div></div></button>`
  :`<div class="strip warn">${ic('phone')} Link sent to ...0127 at 11:10 PM. Waiting for Maya.</div>
   <button class="btn btn-primary dbtn" data-go="P3c">See Maya's phone (demo)</button>`}`));
SCR.T5=()=>posCheck(S.venue===2?'Fri 11:51 PM':'Fri 11:11 PM','',panel(`
  <div class="step">Step 3 of 3 · Quote and book</div>
  <div><span class="pill warn">${epPill()}</span>${S.pass==='linked'?' <span class="pill ok">Night pass</span>':''} <b style="font-size:18px;margin-left:6px">${TBL()} · check #${CHK()}</b></div>
  <div class="muted" style="font-size:15px">Drop-off: 655 N Harrison St, Westover (${S.dropMode==='link'?FN()+' entered':'staff entered'}) · Partner order: Local partners first</div>
  ${S.changed?`<div class="banner info" style="font-size:16px">${ic('alert',24)}<div><b>The price changed before booking.</b> Was $21.00, now ${m(S.quote)}. ${S.saw?'Guest OK\'d the new price.':'Show the guest again (E2).'}</div></div>`:''}
  <table class="t"><thead><tr><th>Partner</th><th>Pickup</th><th class="r">Quote</th></tr></thead><tbody>
   <tr><td><b>Northside Car Service</b> <span class="pill ok" style="font-size:12px">Local partner · picked</span> <span class="muted" style="font-size:13px">local car service</span></td><td>6 min</td><td class="r"><b>${m(S.quote)}</b></td></tr>
   <tr><td>Langston Livery <span class="muted" style="font-size:13px">local partner, binding quote</span></td><td>9 min</td><td class="r">$22.40</td></tr>
   <tr><td>App ride (Lyft) <span class="muted" style="font-size:13px">venue account, fallback</span></td><td>5 min</td><td class="r">about $22.80</td></tr>
   <tr><td>App ride (Uber) <span class="muted" style="font-size:13px">venue account, called only if no one above confirms</span></td><td></td><td class="r muted" style="font-size:13px">price not shown here</td></tr>
  </tbody></table>
  <div class="q"><div class="row"><span class="price">${m(S.quote)}</span><span class="muted">car about 6 min away</span></div>
   <div class="lockline" style="color:var(--info)">${quoteLine()}</div>
   <div style="font-size:15px;margin-top:4px">Goes on check #${CHK()} as "${rideLabel()}".${S.venue===2?' Pickup: Bar Lumen (sample partner bar), front door.':''}</div></div>
  <div class="disc"><b>Show the guest:</b> ${disc(S.quote)} ${A('cap: lesser of 20% or $5.00')}</div>
  <div class="bookrow"><button class="chk ${S.saw?'on':''}" data-act="saw" aria-pressed="${S.saw}"><span class="box">${S.saw?ic('check',20):''}</span>${S.sawBy==='guest'&&S.saw?`Guest saw the price and the fare note (${FN()} tapped Yes on her phone, ${S.venue===2?'11:51 PM':'11:11 PM'})`:'Guest saw the price and the fare note'}</button>
  <button class="btn btn-primary dbtn" data-act="book" ${S.saw?'':'disabled'} style="min-height:64px;font-size:22px">${ic('car',26)} Book</button></div>
  <div style="display:flex;justify-content:space-between;gap:10px;font-size:14px"><button class="link" data-act="unsafeHelp">Guest says they feel unsafe?</button>${S.changed?'':`<button class="link" data-act="priceChange">Demo control: price changes before booking</button>`}</div>
  <p class="help">Quotes, partners and times are fictional sample data.</p>`));
SCR.T6=()=>posCheck(S.venue===2?'Fri 11:52 PM':'Fri 11:12 PM',`<button class="pb">Send</button><button class="pb">Pay</button><button class="pb rn" data-act="toDash">${ic('car',18)} Open RideNite dashboard</button>`,
  `<div style="position:absolute;left:190px;top:72px;background:#0B0F14;color:#F4F6FA;border:2px solid #FFC83D;border-radius:12px;padding:12px 16px;font-size:16px;max-width:620px">${ic('check',18)} RideNite posted <b>${rideLabel()} ${m(S.quote)}</b> to check #${CHK()} at ${POSTED()}. Car requested from Northside Car Service.${S.venue===2?' No card or charge moved between venues.':''}</div>`);
SCR.T7=()=>{const c=calc();return `<div class="pos sk-${SKIN()}">${posTop('Fri 11:45 PM')}
  <div class="pbody" style="grid-template-columns:1fr 560px">
   <div style="padding:22px;display:flex;flex-direction:column;gap:14px">
    <h2 style="margin:0;font-size:28px">Close check #${CHK()} · ${TBL()} · Maya R.</h2>
    <div style="color:#4B5563">Card on tab: Visa ending 4242 (sample). Ride completed at 11:37 PM; final fare reconciled at 11:38 PM.</div>
    <div style="background:#fff;border:1px solid #D6DBE3;border-radius:12px;padding:14px 16px;font-size:15px;line-height:1.5">
     <b>What the tab shows</b><br>Drinks and food are taxed at 11% (Virginia sales tax plus Arlington meals tax). Ride lines carry no sales tax in this demo ${A('flag for counsel and tax review')}.<br>
     Staff tip is on drinks and food only (${m(c.food)}), never on the ride.<br>
     Adjustment rule shown to the guest before booking: up to ${m(c.cap)} over the quote posts (20% of the quote, never more than $5.00); more needs the guest's OK; lower fares post a credit. ${A('cap')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
     <button class="pb pri" style="min-height:72px;font-size:18px" data-act="hold">Hold for morning checkout<br><span style="font-weight:600;font-size:14px">Guest reviews, tips and pays (Mode B)</span></button>
     <button class="pb" style="min-height:72px;font-size:18px" data-act="closeNow">Close tab now<br><span style="font-weight:600;font-size:14px">Charge card on tab (Mode A)</span></button>
    </div>
    <div style="color:#4B5563;font-size:13px">If a tab is closed before the final fare arrives, the adjustment posts as a separate add-on check on the same card ${A('processor rules on incremental auth')}.</div>
   </div>
   <div class="check" style="border-left:1px solid #D6DBE3">
    <div class="chd"><b>Check #${CHK()}</b><div>Opened ${OPENED()} · Server: ${SERVER()}</div></div>
    <div class="lines">${posLines(c)}</div>
    ${posTotals(c,true)}
   </div>
  </div></div>`;};

/* ---------- bar dashboard ---------- */
function reconSentence(c){
  if(c.diff>0&&c.pend>0) return `Final fare ${m(c.fin)}, ${m(c.diff)} over the quote (${c.why.toLowerCase()}). ${m(c.cap)} posted to the tab as "${adjName(c)}"; ${m(c.pend)} is held until the guest OKs it.`;
  if(c.diff>0) return `"${adjName(c)} ${sm(c.adj)}" posted to check #4468${c.diff<=c.cap?` (within the ${m(c.cap)} cap)`:''}.`;
  return `"${adjName(c)} ${sm(c.adj)}" posted to check #4468.`;
}
function mayaRow(c){
  const st={requested:['info','Requested'],en_route:['info','Driver on the way'],arrived:['ok','Arrived'],picked_up:['info','Picked up'],complete:['','Completed 11:37 PM']}[S.ride]||['','-'];
  const eta={requested:'finding',en_route:S.near?NEAR_MIN+' min':'6 min',arrived:'here',picked_up:'drop-off 11:37 PM',complete:'-'}[S.ride]||'-';
  return `<tr style="background:rgba(255,200,61,.06)"><td><button class="link" data-act="openB6">${TBL()} · #${CHK()}</button></td><td>${NAME()}${S.pass==='linked'?' <span class="pill ok" style="font-size:12px">Night pass</span>':''}</td><td><span class="pill ${st[0]}">${st[1]}</span>${S.near&&S.ride==='en_route'?` <span class="pill warn" style="font-size:12px">${NEAR_MIN} min away</span>`:''}</td><td>Gray Camry XLT-5012</td><td>Northside Car Service</td><td>${eta}</td><td>11:11 PM</td><td class="r">${m(c.q)}</td><td class="r">${S.recon?m(c.fin):'pending'}</td></tr>`;
}
SCR.B4=()=>{const c=calc();const done=S.ride==='complete';return `<div class="desk">${side('B4')}<div class="main">${top(done?'Fri 11:38 PM':S.near?'Fri 11:17 PM':'Fri 11:12 PM',7)}
  <div class="content">
   ${S.near&&S.ride==='en_route'?`<div class="strip warn nearchip" style="font-size:17px">${ic('car',22)} <b>Car ${NEAR_MIN} min away, ${TBL()}</b> <span class="muted" style="font-size:14px;margin-left:8px">No sound. Tell the guest quietly if you can; they also get a text.</span></div>`:''}
   ${done&&S.recon?`<div class="banner info" style="font-size:17px;align-items:center">${ic('receipt',26)}<div style="flex:1"><b>Table 7 · Maya R.: ride completed 11:37 PM.</b> ${reconSentence(c)}</div><button class="btn btn-secondary dbtn" style="width:auto;padding:0 18px" data-act="openB6">Open tab</button></div>`:''}
   <div class="kpis"><div class="kpi"><div class="v">${done?2:3}</div><div class="l">Active now</div></div><div class="kpi"><div class="v">5.8 min</div><div class="l">Avg pickup wait tonight</div></div><div class="kpi"><div class="v">${done?4:3}</div><div class="l">Completed tonight</div></div><div class="kpi"><div class="v">0</div><div class="l">Needs attention</div></div></div>
   <table class="t"><thead><tr><th>Tab (link)</th><th>Guest</th><th>Status</th><th>Car</th><th>Partner</th><th>ETA</th><th>Booked</th><th class="r">Quote</th><th class="r">Final fare</th></tr></thead><tbody>
    ${mayaRow(c)}
    <tr><td><button class="link">Table 12 · #4459</button></td><td>Jordan T.</td><td><span class="pill ok">Arrived</span></td><td>White Prius XLT-5031</td><td>Northside Car Service</td><td>here</td><td>11:03 PM</td><td class="r">$21.00</td><td class="r">pending</td></tr>
    <tr><td><button class="link">Bar 5 · #4462</button></td><td>Ana G.</td><td><span class="pill info">Driver on the way</span></td><td>Black Accord XLT-5077</td><td>Langston Livery</td><td>3 min</td><td>10:52 PM</td><td class="r">$16.50</td><td class="r">pending</td></tr>
    <tr><td><button class="link">Table 9 · #4457</button></td><td>Kai W.</td><td><span class="pill">Completed 11:00 PM</span></td><td>Gray Sienna XLT-5090</td><td>App ride (Lyft)</td><td>-</td><td>10:34 PM</td><td class="r">$26.80</td><td class="r">$26.80</td></tr>
   </tbody></table>
   ${mode==='free'&&!done?`<div><button class="btn btn-primary dbtn" style="width:auto;padding:0 20px" data-act="advance">Demo control: next ride status (${rideWord(STATUS[STATUS.indexOf(S.ride)+1])})</button></div>`:''}
   <p class="muted" style="margin:0;font-size:14px">Statuses: Requested, Driver on the way, Arrived, Completed, Driver declined, Cancelled. Tab links open the matching POS check. No tracking after drop-off; nothing here asks staff to confirm arrival.</p>
   <p class="fict" style="text-align:left">Northside Car Service and Langston Livery are fictional local car services. Sample data only.</p>
  </div></div></div>`;};
SCR.B6=()=>{const c=calc();return `<div class="desk">${side('B4')}<div class="main">${top('Fri 11:39 PM',7)}
  <div class="content"><div class="cols c2">
   <div class="panel"><h3>Table 7 · Maya R. · check #4468 <span class="muted" style="font-size:14px;font-weight:600">synced from POS</span></h3>
    <table class="t"><tbody>
     ${DRINKS.concat(FOOD).map(([n,p])=>`<tr><td>${n}</td><td class="r">${m(p)}</td></tr>`).join('')}
     <tr><td>Tax 11% (drinks and food)</td><td class="r">${m(c.tax)}</td></tr>
     <tr><td><b>${rideLabel()}</b><div class="muted" style="font-size:13px">Posted to POS 11:11 PM · no sales tax ${A()}</div></td><td class="r"><b>${m(c.q)}</b></td></tr>
     ${S.recon&&c.adj!==0?`<tr><td><b>${adjName(c)}</b><div class="muted" style="font-size:13px">${c.why} · posted to POS 11:38 PM</div></td><td class="r"><b>${sm(c.adj)}</b></td></tr>`:''}
     ${S.recon&&c.pend>0?`<tr><td class="muted">Held for guest OK (E7)</td><td class="r muted">${m(c.pend)}</td></tr>`:''}
     <tr><td><b>Total before tip</b></td><td class="r"><b>${m(c.pre)}</b></td></tr>
    </tbody></table>
    <p class="muted" style="font-size:14px;margin:8px 0 0">Tip prompt base: ${m(c.food)} (drinks and food). The ride lines are excluded.</p>
    <div class="cols c2" style="margin-top:12px"><button class="btn btn-secondary dbtn" data-act="toPOSClose">Close tab now</button><button class="btn btn-primary dbtn" data-act="toPOSClose">Hold for morning checkout</button></div>
   </div>
   <div style="display:flex;flex-direction:column;gap:16px">
    <div class="panel"><h3>Ride</h3>
     <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="pill">${rideWord(S.ride)}${S.ride==='complete'?' 11:37 PM':''}</span><span class="pill warn">${epPill()}</span><span class="muted">Northside Car Service · Luis M. · Gray Camry XLT-5012</span></div>
     <div class="muted" style="font-size:14px;margin-top:8px">Booked 11:11 PM · picked up 11:19 PM · drop-off near 655 N Harrison St</div></div>
    <div class="panel"><h3>Fare reconciliation</h3>
     <div class="reco"><div><b>${m(c.q)}</b><span>Quote (guest saw it)</span></div><div><b>${S.recon?m(c.fin):'pending'}</b><span>Final fare from partner</span></div><div><b>${S.recon?sm(c.diff):'-'}</b><span>Difference</span></div><div><b>${S.recon?sm(c.adj):'-'}</b><span>Posted to tab</span></div></div>
     <p style="font-size:15px;margin:10px 0 0">${S.recon?reconSentence(c):'Waiting for the final fare.'}</p>
     <p class="muted" style="font-size:13px;margin:6px 0 0">Rule (shown to the guest before booking): up to ${m(c.cap)} over posts automatically (20% of the quote, max $5.00); more is held for the guest's OK; lower posts a credit. Anything over the cap that is not approved is absorbed by RideNite, not the bar. ${A('cap')}</p></div>
    <div class="panel" style="font-size:15px"><b>Bar only:</b> RideNite fee for this ride $1.00, billed monthly on your one invoice. Ride fares are not RideNite fees.</div>
   </div>
  </div><p class="fict" style="text-align:left">Sample tab: item names from Maison Cheryl's menu, prices are sample.</p></div></div></div>`;};
SCR.B7=()=>{const c=calc();const tabs=r2(1342.50+c.rideTotal), north=r2(526.00+c.rideTotal);
  return `<div class="desk">${side('B7')}<div class="main">${top('Sat 9:30 AM',0)}
  <div class="content">
   <div class="kpis"><div class="kpi"><div class="v">62</div><div class="l">Rides Oct 1 to 10</div></div><div class="kpi"><div class="v">${m(tabs)}</div><div class="l">Fares on guest tabs</div></div><div class="kpi"><div class="v">$261.00</div><div class="l">RideNite fees so far</div></div><div class="kpi"><div class="v">60/62</div><div class="l">Rides matched to POS lines</div></div></div>
   <div class="cols c3">
    <div class="panel"><h3>One invoice: RideNite fees</h3><table class="t"><tbody>
     <tr><td>Subscription</td><td class="r">$199.00</td></tr><tr><td>Per ride: 62 x $1.00</td><td class="r">$62.00</td></tr><tr><td><b>Due Nov 1 by ACH</b></td><td class="r"><b>$261.00</b></td></tr></tbody></table>
     <p class="muted" style="font-size:13px;margin:8px 0 0">Draft pricing. No per-guest fee. Fares are collected on guest tabs and settled to partners; they are not RideNite fees.</p></div>
    <div class="panel"><h3>Fare reconciliation</h3><table class="t"><tbody>
     <tr><td>Tonight: Table 7 (demo ride)</td><td class="r">${m(c.q)} quote</td></tr>
     <tr><td>Final fare</td><td class="r">${m(c.fin)}</td></tr>
     <tr><td>Adjustment on tab</td><td class="r">${sm(c.adj)}</td></tr>
     <tr><td>Held for guest OK</td><td class="r">${m(c.pend)}</td></tr></tbody></table>
     <p class="muted" style="font-size:13px;margin:8px 0 0">Cap: 20% of the quote, max $5.00 (${m(c.cap)} on this ride) ${A()}. Credits post automatically. Unapproved over-cap amounts are RideNite's, not the bar's.</p></div>
    <div class="panel"><h3>POS sync</h3><table class="t"><tbody>
     <tr><td>Line item</td><td class="r">Courtesy car (open price)</td></tr><tr><td>Matched</td><td class="r">60</td></tr>
     <tr><td>Not on tab: Table 3, Oct 8</td><td class="r"><button class="link">Fix</button></td></tr><tr><td>Amount mismatch: Bar 4, Oct 7</td><td class="r"><button class="link">Fix</button></td></tr></tbody></table>
     <p class="muted" style="font-size:13px;margin:8px 0 0">${SKINS[ctl.skin]} (simulated connection).</p></div>
   </div>
   <div class="panel"><h3>By partner (on guest tabs)</h3><table class="t"><thead><tr><th>Partner</th><th class="r">Rides</th><th class="r">Fares</th></tr></thead><tbody>
    <tr><td>Northside Car Service (local)</td><td class="r">28</td><td class="r">${m(north)}</td></tr><tr><td>Langston Livery (local)</td><td class="r">11</td><td class="r">$214.50</td></tr>
    <tr><td>Uber for Business (venue account)</td><td class="r">14</td><td class="r">$352.40</td></tr><tr><td>Lyft Business (venue account)</td><td class="r">9</td><td class="r">$249.60</td></tr></tbody></table></div>
   <p class="fict" style="text-align:left">Sample figures extend the UI spec B7 sample (61 rides through Oct 9) with tonight's demo ride. All fictional.</p>
  </div></div></div>`;};

/* ---------- patron (phone) ---------- */
const phone=(inner,light)=>`<section class="phone${light?' light':''}"><div class="ph" style="gap:14px${light?';min-height:auto':''}">${inner}</div></section>`;
const qcol=()=>'var(--info)';
SCR.P0=()=>phone(`
  <div class="ph-top"><span class="venue-chip">${ic('bar')} ${V}</span><span>Fri 7:42 PM</span></div>
  <span class="status st-ok" style="align-self:flex-start">${ic('receipt')} Tab open</span>
  <h1 class="h1" style="font-size:36px">Your card is with the bar.</h1>
  <p class="body">Table 7 · tab opened 7:42 PM. That's a normal bar tab: the bar keeps your card and charges it when you settle up.</p>
  <div style="height:120px;border-radius:14px;background:linear-gradient(135deg,#334155,#0F172A);padding:16px;display:flex;flex-direction:column;justify-content:space-between;font-family:var(--mono);font-size:18px"><span>VISA (sample)</span><span>•••• 4242</span><span>MAYA R.</span></div>
  <div class="card" style="padding:14px"><div class="small muted">Bank app notice (example)</div><div class="body" style="font-size:19px">Pending authorization: MAISON CHERYL</div><div class="muted" style="font-size:15px">Whether and how this shows depends on your bank and the bar's processor. ${A()}</div></div>
  <p class="small muted" style="margin:0">Nothing from RideNite yet. You hear from RideNite only if you ask for a car, or staff offer one and you say yes. You see the price before anything is booked.</p>
  <div class="spacer"></div><p class="fict">Patron view, no app needed. Fictional sample data.</p>`);
SCR.P3c=()=>phone(`
  <div class="ph-top"><button class="lang" data-go="T4">Back</button><span>Maya R.</span></div>
  <p class="small muted" style="margin:0">Link from ${V} staff.</p>
  <h1 class="h2">Ride home</h1>
  <div class="card" style="display:flex;flex-direction:column;gap:8px">
   <div class="row"><span class="body">${ic('pin')} 655 N Harrison St</span><button class="lang">Change</button></div>
   <div class="row"><span class="price">${m(S.quote)}</span><span class="small muted">car about 6 min away</span></div>
   <div class="lockline" style="color:${qcol()}">${quoteLine()}</div>
   <div class="small" style="line-height:1.4">${disc(S.quote)}</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="choice rider selected" aria-pressed="true" style="min-height:72px"><b style="font-size:20px">Just me</b><span>on my own</span></button><button class="choice rider" aria-pressed="false" style="min-height:72px"><b style="font-size:20px">Me + 1 to 3</b><span>more seats</span></button></div>
  <div class="spacer"></div>
  <button class="btn btn-primary btn-xl" data-act="p3yes">${ic('check',44)} Yes, send my ride</button>
  <p class="fict">P3 with the fare note. Fictional sample data.</p>`);
SCR.E2=()=>phone(`
  <div class="ph-top"><span class="venue-chip">${V}</span><span>Maya R.</span></div>
  <div class="banner info">${ic('alert',28)}<div>The price changed before your car was booked.</div></div>
  <div class="card">
   <div class="row"><span class="body muted">Was</span><span class="body muted" style="text-decoration:line-through">$21.00</span></div>
   <div class="row"><span class="body">New quote</span><span class="price">$23.50</span></div>
   <div class="lockline" style="color:${qcol()}">${ic('clock',20)} Your new quote once you tap Yes</div>
  </div>
  <p class="small" style="margin:0;line-height:1.4">${disc(23.5)}</p>
  <p class="small muted" style="margin:0">Nothing is booked or added to your tab until you tap Yes.</p>
  <div class="spacer"></div>
  <button class="btn btn-primary btn-xl" data-act="e2yes">${ic('check',44)} Yes, $23.50 is OK</button>
  <button class="btn btn-secondary" data-act="e2no">No, look for another car</button>`);
SCR.P5=()=>{const c=calc();return phone(`
  <div class="ph-top"><span class="status st-info">${ic('car')} Driver on the way</span><span>${V}</span></div>
  <div class="row"><span class="eta">6 min</span><span class="body muted">pickup at front door</span></div>
  <p class="small" style="margin:0">Before you get in, check the plate. Your driver will say your first name.</p>
  <div class="plate" aria-label="Plate X L T 5 0 1 2">XLT-5012</div>
  <div class="driver card" style="padding:14px"><div class="avatar" aria-hidden="true">L</div><div><b style="font-size:24px">Luis M.</b><div class="body muted small">Gray Toyota Camry</div><div class="muted" style="font-size:16px">Northside Car Service (local partner)</div></div></div>
  <div class="card" style="padding:12px 16px"><div class="row"><span class="small">On your tab at ${V} (quote)</span><span class="body" style="font-weight:800">${m(c.q)}</span></div>
   <div class="muted" style="font-size:15px;margin-top:4px">Final fare may differ by up to ${m(c.cap)}; more and we ask you first.</div></div>
  <button class="btn btn-secondary" data-go="P14">${ic('receipt',28)} See my tab</button>
  <p class="fict">Driver, car and plate are fictional.</p>`);};
SCR.P14=()=>{const c=calc();return phone(`
  <div class="ph-top"><button class="lang" data-go="P5">Back</button><span>${S.recon?'11:38 PM':'11:14 PM'}</span></div>
  <h1 class="h2">Your tab at ${V}</h1>
  <p class="small muted" style="margin:0">Table 7 · card ending 4242 · opened 7:42 PM</p>
  <table class="inv" aria-label="Your tab so far">
   ${DRINKS.concat(FOOD).map(([n,p])=>`<tr><td>${n}</td><td>${m(p)}</td></tr>`).join('')}
   <tr><td>Sales tax (drinks and food)</td><td>${m(c.tax)}</td></tr>
   <tr><td><b>${rideLabel()}</b><span class="note">Northside Car Service, 11:11 PM</span></td><td><b>${m(c.q)}</b></td></tr>
   ${S.recon&&c.adj!==0?`<tr><td><b>${adjName(c)}</b><span class="note">${adjNote(c)}</span></td><td><b>${sm(c.adj)}</b></td></tr>`:''}
   <tr class="total"><td>So far</td><td>${m(c.pre)}</td></tr>
  </table>
  ${!S.recon?`<div class="card" style="padding:12px 16px"><div class="small" style="line-height:1.4">The final fare settles when your ride ends. It may differ by up to ${m(c.cap)}; more than that and we'll ask you first. Lower, and you get the difference back.</div></div>`:''}
  <p class="small muted" style="margin:0">Tip for bar staff is added when you settle up, on drinks and food only.</p>
  <div class="spacer"></div><p class="fict">Live tab view from the trip link. Showing drink lines here is a venue setting ${A()}. Fictional.</p>`);};
SCR.P7=()=>{const c=calc();let fare='';
  fare=`<div class="card"><div class="row"><span class="body">Final fare</span><span class="price" style="font-size:36px">${m(c.fin)}</span></div>
   <div class="row small"><span class="muted">Quote</span><span>${m(c.q)}</span></div>
   <div class="row small"><span class="muted">${c.diff<0?'Credit on your tab':'Added to your tab'}</span><span>${sm(c.adj)}</span></div>
   <p class="small" style="margin:8px 0 0;line-height:1.4">${c.diff<0?`It came in lower, so ${m(-c.diff)} goes back on your tab.`:c.pend>0?`${c.why}. ${m(c.cap)} is on your tab, as shown before booking. The other ${m(c.pend)} isn't charged unless you OK it. We'll ask in the morning.`:`Within the ${m(c.cap)} shown before booking, so it's on your tab at ${V}.`}</p></div>`;
  return phone(`
  <div class="ph-top"><span class="venue-chip">RideNite</span><span>11:37 PM</span></div>
  <span class="status st-ok" style="align-self:flex-start">${ic('check')} Ride complete</span>
  <h1 class="h1">You've arrived.</h1>${fare}
  <div class="spacer"></div>
  <button class="btn btn-success btn-xl" style="min-height:104px">${ic('check',44)} Text a friend I'm home</button>
  <p class="small muted" style="text-align:center;margin:0">Opens your own messages app. Optional.</p>`);};
function smsBody(c){
  const fn=`Quote ${m(c.q)} on your tab at ${V}. Final fare may differ by up to ${m(c.cap)}; more than that and we'll ask you first.`;
  const done=c.diff<0?`RideNite: You've arrived. Final fare ${m(c.fin)}, so ${m(-c.diff)} goes back on your tab at ${V}.`:
    c.diff>c.cap?`RideNite: You've arrived. Final fare ${m(c.fin)}. ${m(c.cap)} over the quote is on your tab, as shown before booking; we'll ask you about the other ${m(r2(c.diff-c.cap))} in the morning.`:
    `RideNite: You've arrived. Final fare ${m(c.fin)} (${m(c.diff)} over the quote), on your tab at ${V}.`;
  const rideTxt=c.adj===0?m(c.q):`${m(c.rideTotal)} (quoted ${m(c.q)}, final fare ${m(c.fin)}, ${c.adj>0?'adjustment':'credit'} ${sm(c.adj)})`;
  return {fn,done,morning:`RideNite: Your ride home from ${V}, 11:19 PM, ${rideTxt} on your tab. Tab total ${m(c.total)}.${c.pend>0?` One item needs your OK (${m(c.pend)}).`:''} Receipt and review: rdnt.example/m/abc123 Reply STOP to opt out, HELP for help.`};
}
SCR.M2=()=>{const c=calc(),t=smsBody(c);return `<section class="sms">
  <div style="text-align:center;color:#AEB9C7;font-size:14px">RideNite (555) 010-0100</div>
  <div style="text-align:center;color:#AEB9C7;font-size:13px;margin-top:10px">Fri 11:12 PM</div>
  <div class="bubble">RideNite: Your car is requested. Luis, gray Toyota Camry, plate XLT-5012, about 6 min. ${t.fn} Before you get in, check the plate. Trip and tab: <a>rdnt.example/t/k7Q2</a></div>
  <div style="text-align:center;color:#AEB9C7;font-size:13px">11:37 PM</div>
  <div class="bubble">${t.done}</div>
  <div style="text-align:center;color:#AEB9C7;font-size:13px">Sat 9:00 AM</div>
  <div class="bubble">${(S.receipt||ctl.receipt)==='neutral'?`RideNite: Your receipt from ${VN()} is ready: rdnt.example/m/abc123 Reply STOP to opt out, HELP for help.`:t.morning}</div>
  <p style="color:#AEB9C7;font-size:13px;text-align:center;margin-top:20px">Sample messages. Names, numbers and links are fictional. SAMPLE: no real charge.</p></section>`;};
function invRows(c,withTipButtons){
  let h=`<tr class="sec"><td>Drinks</td><td></td></tr>${(S.venue===2?B2DRINKS:DRINKS).map(([n,p])=>`<tr><td>${n}</td><td>${m(p)}</td></tr>`).join('')}
   ${S.venue===2?'':`<tr class="sec"><td>Food</td><td></td></tr>${FOOD.map(([n,p])=>`<tr><td>${n}</td><td>${m(p)}</td></tr>`).join('')}`}
   <tr><td>Tax 11%<span class="note">VA sales 6% + Arlington meals 5%, on drinks and food</span></td><td>${m(c.tax)}</td></tr>
   <tr class="sec"><td>Ride</td><td></td></tr>
   <tr><td>${rideLabel()}<span class="note">Northside Car Service, quote you OK'd at 11:11 PM</span></td><td>${m(c.q)}</td></tr>`;
  if(c.adj!==0) h+=`<tr><td>${adjName(c)}<span class="note">${adjNote(c)}</span></td><td>${sm(c.adj)}</td></tr>`;
  if(c.pend>0) h+=`<tr><td><b>Needs your OK</b><span class="note">${m(c.pend)} over the ${m(c.cap)} cap. ${c.why}. Not charged unless you OK it.</span></td><td><button class="lang" data-go="E7" style="min-height:44px">Review</button></td></tr>`;
  if(c.declined>0) h+=`<tr><td>Not charged<span class="note">You said no to the extra ${m(c.declined)}</span></td><td>$0.00</td></tr>`;
  if(S.close==='closed') h+=`<tr class="sec"><td>Tip</td><td></td></tr><tr><td>No tip entered at close</td><td>$0.00</td></tr>`;
  else h+=`<tr class="sec"><td>Tip for bar staff</td><td></td></tr>${withTipButtons?`<tr><td colspan="2"><div class="seg" role="group" aria-label="Staff tip on drinks and food">${[18,20,22,0].map(p=>`<button aria-pressed="${S.tip===p}" data-act="tip" data-v="${p}">${p?p+'%':'None'}</button>`).join('')}</div>
     <span class="note" style="display:block;margin-top:6px">Tip is on drinks and food (${m(c.food)}), not the ride.</span></td></tr>`:''}<tr><td>Staff tip (${S.tip}%)</td><td>${m(c.tip)}</td></tr>`;
  h+=`<tr class="total"><td>Total</td><td>${m(c.total)}</td></tr>`;
  return h;
}
SCR.M1=()=>{const c=calc();return `<section class="mail">
  <div class="hdr"><div><b>RideNite for ${VN()}</b> &lt;receipts@ridenite.example&gt;</div><div>To: maya.r@example.test</div><div>Subject: <b>${(S.receipt||ctl.receipt)==='neutral'?`Your receipt from ${VN()}`:`Your ${VN().replace('The ','')} tab and ride home receipt`}</b></div><div style="color:#4B5563">Sat, Oct 10, 9:00 AM</div></div>
  <div class="msg">
   <p style="margin-top:0">Good morning, Maya.</p>
   <p>Here's last night's tab from ${VN()}, including your ride home: 11:19 PM, ${m(c.rideTotal)}, on your tab.</p>
   <table class="inv" style="font-size:16px">${invRows(c,false)}</table>
   <a class="cta" data-go="P9" href="#">Review and pay</a>
   <p style="font-size:15px;color:#4B5563">${S.close==='closed'?'Paid with card ending 4242.':'Your card ending 4242 is on hold. If you do nothing, it\'s charged Sun, Oct 11 at 11:00 AM.'} Question about a charge? Open Review and tap "Something's wrong."</p>
   <p style="font-size:13px;color:#4B5563">${S.venue===2?'Only your Bar Lumen tab is shown here. Any other tab tonight is billed by that venue as usual. ':''}${S.venue===2?'Bar Lumen (sample partner bar, fictional), Clarendon, Arlington, VA.':'Maison Cheryl, 2900 Wilson Blvd, Suite 104, Arlington, VA 22201. Shown as an illustrative example; not a live RideNite partner.'} RideNite books cars from local car services and ride apps for this venue. SAMPLE: no real charge. Guest and driver names, amounts and the drop-off address are sample data.</p>
  </div></section>`;};
SCR.P9=()=>{const c=calc();return phone(`
  <div class="ph-top"><span class="venue-chip">${V}</span><span class="muted">Sat 9:04 AM</span></div>
  <h1 class="h1">Last night, Fri Oct 9</h1>
  <span class="status" style="align-self:flex-start;color:#8A5A00;background:#FFF4DB">${S.close==='closed'?'Paid last night':'Ready to review'}: ${m(c.total)}</span>
  <div class="card" style="background:#fff;border:1px solid #E5E7EB"><h3 style="margin:0 0 6px;font-size:20px">Your night</h3><ul class="tl">
   <li><b>7:42 PM</b><span>Tab opened at ${V}</span></li>
   <li><b>11:11 PM</b><span>Ride home booked (${S.sawBy==='guest'?'you tapped Yes':'you OK\'d the price with staff'})</span></li>
   <li><b>11:19 PM</b><span>Picked up. Luis M., gray Camry, XLT-5012</span></li>
   <li><b>11:37 PM</b><span>Ride complete near 655 N Harrison St. Final fare ${m(c.fin)}</span></li></ul></div>
  <table class="inv" aria-label="Itemized bill">${invRows(c,S.close!=='closed')}</table>
  ${S.venue===2?'<p class="small muted" style="margin:0">Only your Bar Lumen tab is shown here. Any other tab tonight is billed by that venue as usual.</p>':''}
  ${S.close==='closed'?'':`<button class="btn btn-primary" data-act="pay">Approve and pay ${m(c.total)}</button>`}
  <button class="btn btn-secondary">Something's wrong</button>
  <p class="small muted" style="margin:0">${S.close==='closed'?'Charged to card ending 4242 at close.':'Card ending 4242 is on hold. If you do nothing, it\'s charged Sun, Oct 11 at 11:00 AM.'}</p>
  <p class="fict" style="color:#4B5563">Fictional sample bill.</p>`,true);};
SCR.E7=()=>{const c=calc();const over=r2(c.diff-c.cap);return phone(`
  <div class="ph-top"><span class="venue-chip">${V}</span><span class="muted">Sat 9:04 AM</span></div>
  <h1 class="h1" style="font-size:30px">Your ride came to ${m(c.fin)}.</h1>
  <div class="card" style="background:#fff;border:1px solid #E5E7EB">
   <div class="row small"><span>Quote you OK'd</span><span>${m(c.q)}</span></div>
   <div class="row small"><span>Added, as shown before booking (up to ${m(c.cap)})</span><span>${sm(Math.min(c.diff,c.cap))}</span></div>
   <div class="row body" style="font-weight:800;margin-top:6px"><span>Needs your OK</span><span>${m(over)}</span></div>
  </div>
  <p class="body" style="font-size:20px">You added a stop at 11:28 PM, so the trip came in higher than quoted. The extra ${m(over)} is not charged unless you say yes.</p>
  <div class="spacer"></div>
  <button class="btn btn-primary" data-act="overOk" data-v="1">Yes, add ${m(over)}</button>
  <button class="btn btn-secondary" data-act="overOk" data-v="0">No, don't add it</button>
  <p class="small muted" style="margin:0">If you say no, it is not charged. RideNite settles the rest with the car service; ${V} pays nothing extra. ${A()}</p>
  <p class="fict" style="color:#4B5563">E7 (new in this demo). Fictional sample amounts.</p>`,true);};
SCR.P11=()=>{const c=calc();return phone(`
  <div class="ph-top"><span class="venue-chip">${V}</span><span class="muted">Sat 9:06 AM</span></div>
  <span class="status st-ok" style="align-self:flex-start;color:#0F7B4F;background:#E7F6EF">${ic('check')} Paid</span>
  <h1 class="h1">All set</h1>
  <p class="body">${m(c.total)} paid with card ending 4242.</p>
  <p class="body muted">Receipt sent to maya.r@example.test</p>
  <div class="spacer"></div>
  <button class="btn btn-secondary">Download receipt (PDF)</button>
  <button class="btn btn-secondary">Save my home address for next time</button>
  <p class="fict" style="color:#4B5563">SAMPLE: no real charge.</p>`,true);};

/* ---------- roaming night pass branch (optional, post-pilot gated) ---------- */
const capLine='The final fare may differ from the quote by up to 20% of the quote, never more than $5.00, on that venue\'s tab; more than that and we\'ll ask you first.';
function qr(seed){let h='',x=seed;for(let i=0;i<441;i++){x=(x*1103515245+12345)&0x7fffffff;const r=Math.floor(i/21),c=i%21;const f=(r<7&&c<7)||(r<7&&c>13)||(r>13&&c<7);const on=f?((r%6===0||c%6===0||r===20||c===20)||((r%7>1&&r%7<5)&&(c%7>1&&c%7<5))):(x>>16)&1;h+=`<i${on?' class="on"':''}></i>`;}return `<div class="qr" aria-label="Sample QR code">${h}</div>`;}
SCR.T8=()=>posCheck('Fri 9:28 PM','',panel(`
  <div class="step">Night pass · optional</div><h2>Turn on a RideNite night pass?</h2>
  <div class="q" style="font-size:16px;line-height:1.45"><b>Show the guest:</b> Tonight only, until 6 AM. If you open a tab with this card (Visa ending 4242) at another RideNite partner venue tonight, staff there can see that your night pass is on, so getting a car home is quicker. They won't see where you were before. A car is only booked if you ask or say yes, and you'll see the price first. ${capLine} If it comes in lower, you get the difference back. We keep the link between venues until 6 AM, then delete it. We don't use your location.</div>
  <div class="muted" style="font-size:15px">Notice and off switch go to Maya's mobile ...0127.</div>
  <div class="two"><button class="btn btn-primary dbtn" data-act="passOn">Turn on night pass</button><button class="btn btn-secondary dbtn" data-act="rnClose">No thanks</button></div>
  <p class="help">Staff only: offer it like any other amenity. Never alongside a drink order. ${A('pilot feature, post-pilot gate')}</p>`));
SCR.P15=()=>phone(`
  <div class="ph-top"><span class="venue-chip">RideNite</span><span>Fri 9:29 PM</span></div>
  ${S.pass==='off'?`<span class="status st-warn" style="align-self:flex-start">Night pass off</span><p class="body">Nothing is linked. You can still ask any partner venue for a car.</p>`:
  `<span class="status st-ok" style="align-self:flex-start">${ic('check')} Night pass on until 6 AM.</span>
  <h1 class="h2" style="margin:0">Visa ending 4242</h1>
  <div style="display:flex;gap:14px;align-items:center">${qr(7)}<p class="small" style="margin:0">Show this to staff at a partner venue. It refreshes every minute.</p></div>
  <div class="card" style="padding:12px 16px"><span class="small">Or tell staff this code: </span><b style="font-family:var(--mono);font-size:22px;letter-spacing:2px">${PASS.code}</b></div>
  <div class="card" style="padding:12px 16px"><div class="small muted">Venues linked tonight (only you see this)</div><div class="body">${V}</div></div>
  <button class="btn btn-secondary" data-act="passOff">Turn off night pass</button>`}
  ${mode==='free'&&S.pass!=='off'?`<button class="btn btn-primary" data-act="toBar2">Demo: later, Maya opens a tab at ${V2}</button>`:''}
  <div class="spacer"></div><p class="fict">Pass page from the text link, no app. Fictional sample data.</p>`);
SCR.T9=()=>posCheck('Fri 11:49 PM','',`<div style="position:absolute;left:190px;top:72px;background:#0B0F14;color:#F4F6FA;border:2px solid #FFC83D;border-radius:12px;padding:12px 16px;font-size:16px;max-width:620px">${V2}'s own POS and its own card authorization. RideNite is not told. Tab opened 10:20 PM with Visa ending 4242.</div>`);
function t10body(){
  const weak=S.match==='one_weak'||(mode==='guided'&&ctl.roam==='one_weak');
  return `<div class="step">Book a car</div>
  <div class="banner info" style="font-size:18px">${ic('check',26)}<div><b>RideNite night pass on. Fare rule accepted.</b><div style="font-size:15px">Matched on this check's card.</div></div></div>
  <button class="opt sel">${ic('person',24)}<div><b>Bar 4 · Maya R.</b><div class="muted" style="font-size:15px">Check #2210 · Visa ending 4242 · the check you're on</div></div></button>
  ${weak?`<div class="strip warn" style="font-size:15px">Card match is partial on this POS. Scan the guest's night pass or ask for the last 2 digits of their mobile.</div>
   <div class="two"><button class="btn btn-secondary dbtn" data-act="passScan">Scan night pass</button><button class="btn btn-secondary dbtn" data-act="passPhone">Enter phone digits</button></div>`:''}
  <button class="btn btn-primary dbtn" data-act="passConfirm" style="min-height:64px;font-size:22px">Maya R. is here</button>
  <button class="link" data-act="passNotThis" style="align-self:flex-start">Not this guest</button>
  <p class="help">Shown only because you opened RideNite on this check. The guest still sees the price before anything is booked.</p>`;}
SCR.T10=()=>posCheck('Fri 11:50 PM','',panel(t10body()));
SCR.T10m=()=>posCheck('Fri 11:50 PM','',panel(`<div class="step">Book a car</div>
  <div class="strip warn" style="font-size:17px">Possible RideNite night pass. Ask the guest to show it on their phone or tell you their mobile number.</div>
  <button class="btn btn-secondary dbtn" data-act="passScan">Scan night pass</button>
  <button class="btn btn-secondary dbtn" data-act="passPhone">Enter mobile number</button>
  <button class="btn btn-secondary dbtn" data-act="passNone">Book without it</button>
  <p class="help">No names are shown when two passes look alike. RideNite never guesses.</p>`));
SCR.T10n=()=>posCheck('Fri 11:50 PM','',panel(`
  <div class="step">Step 1 of 3 · Book a car</div><h2>Whose tab?</h2>
  <button class="opt sel">${ic('person',24)}<div><b>Bar 4 · Maya R.</b><div class="muted" style="font-size:15px">Check #2210 · ${m(calc().food)} · the check you're on</div></div></button>
  <h2 style="font-size:22px;margin-top:6px">How did this start?</h2>
  <div class="two"><button class="btn btn-secondary ep" data-act="entry" data-v="guest_request">${ic('hand',26)} Guest asked</button><button class="btn btn-secondary ep" data-act="entry" data-v="staff_offer">${ic('person',26)} I offered</button></div>
  <button class="link" data-act="passScan" style="align-self:flex-start">Guest has a night pass? Scan it</button>
  <p class="help">We record only which one. No reason, notes or drink counts.</p>`));
SCR.P16=()=>`<section class="sms">
  <div style="text-align:center;color:#AEB9C7;font-size:14px">RideNite (555) 010-0100</div>
  <div style="text-align:center;color:#AEB9C7;font-size:13px;margin-top:10px">Fri 11:50 PM</div>
  <div class="bubble">RideNite: your night pass is on at ${V2}. Reply OFF to turn it off. Ends 6 AM.</div>
  ${mode==='free'?`<div style="text-align:center;margin-top:16px"><button class="btn btn-primary" style="width:auto;padding:0 20px" data-act="toQuote2">Demo: back to ${V2}'s POS</button></div>`:''}
  <p style="color:#AEB9C7;font-size:13px;text-align:center;margin-top:20px">Sample message. Names, numbers and links are fictional.</p></section>`;
SCR.T5r=()=>SCR.T5();
/* ---------- discreet request ("the house car") branch ---------- */
SCR.K1=()=>`<section class="kit"><div class="kithd"><b>House car kit</b> · print preview <span class="sim">SAMPLE</span></div>
  <div class="kitgrid">
   <div class="kpc decal"><div class="kl">Window decal</div><div class="dbrand"><i></i>RideNite partner venue</div><div class="dbig">Ask for the house car.</div></div>
   <div class="kpc coaster"><div class="kl">Coaster, front</div><div class="cbig">Need to head out? Ask for the house car. It goes on your tab.</div><div class="csm">No app needed. You'll see the price first.</div></div>
   <div class="kpc coaster show"><div class="kl">Coaster, show-card back</div><div class="cbig">I'd like the house car.</div><div class="csm">Show this to any staff member. No app needed. You'll see the price first.</div>${qr(11)}</div>
   <div class="kpc tent"><div class="kl">Table tent</div><div class="cbig">Need to head out? Ask for the house car. It goes on your tab.</div>${qr(5)}<div class="csm">Scan to ask staff for a car. No app needed. You'll see the price first.</div></div>
   <div class="kpc rest"><div class="kl">Restroom card</div><div class="cbig" style="font-size:22px">Need to head out? Scan to quietly ask staff for a car, or just ask for the house car.</div>${qr(3)}</div>
  </div>
  <p class="kitft">SAMPLE artwork. No gesture codes or coded drink orders. Every way of asking is recorded as "Guest asked."</p></section>`;
SCR.T1q=()=>`<div class="pos sk-${ctl.skin}">${posTop('Fri 11:09 PM')}
  <div class="pbody" style="grid-template-columns:170px 1fr">
   <div class="cats"><button class="cat on">Open tabs</button><button class="cat">Tables</button><button class="cat">Closed</button></div>
   <div style="display:flex;flex-direction:column;gap:12px;padding:12px">
    <div class="strip info quietchip" style="font-size:18px;align-items:center">${ic('car',22)} <b style="flex:1">Quiet request: car for a guest at Table 4</b><button class="pb rn" data-act="openQuiet" style="min-height:48px;padding:0 22px">Open</button></div>
    <div class="tabs">
     <button class="tabt"><b>Table 4 · Rosa L.</b><span>Check #4473 · $52.00</span></button>
     <button class="tabt"><b>Table 7 · Maya R.</b><span>Check #4468 · $49.00</span></button>
     <button class="tabt"><b>Bar 3 · Dev K.</b><span>Check #4471 · $36.00</span></button>
     <button class="tabt"><b>Table 12 · Jordan T.</b><span>Check #4459 · $71.50</span></button>
     <button class="tabt"><b>Bar 5 · Ana G.</b><span>Check #4462 · $28.00</span></button>
    </div>
    <p class="muted" style="font-size:14px;margin:0">Silent. Shows only on this venue's RideNite screens. No name, no reason.</p>
   </div></div></div>`;
SCR.B10=()=>`<div class="desk">${side('B1')}<div class="main">${top('Fri 11:09 PM',7)}
  <div class="content"><div class="panel" style="max-width:900px">
   <span class="pill info">Quiet request · 11:09 PM</span>
   <h2 style="margin:10px 0 4px;font-size:30px">Car for a guest at Table 4</h2>
   <div class="banner warn" style="font-size:17px;align-items:flex-start">${ic('list',26)}<div><b>Your venue's procedure first</b><ol style="margin:6px 0 0 18px;padding:0;line-height:1.5"><li>Let the manager on duty know (Dana tonight).</li><li>Go over in person, low-key. Book the house car without asking why.</li><li>If the guest raises a concern, get the manager or security first and follow venue policy. The car is one option.</li></ol></div></div>
   <div class="cols c2" style="margin-top:14px"><button class="btn btn-primary dbtn" data-act="bookQuiet" style="min-height:64px;font-size:20px">${ic('car',24)} Book the house car (Guest asked)</button><button class="btn btn-secondary dbtn">Mark seen</button></div>
   <div style="display:flex;gap:18px;margin-top:12px;font-size:16px"><label><input type="checkbox" checked> Pickup at the Wilson Blvd corner</label><label><input type="checkbox" checked> Just one rider</label></div>
   <p class="muted" style="font-size:14px;margin:12px 0 0">Shown as 'Guest asked' in ride history. This alert is deleted after 30 days. No reason codes or notes. No sound.</p>
  </div></div></div></div>`;
SCR.T2h=()=>{const c=calc();return `<div class="pos sk-${ctl.skin}">${posTop('Fri 11:08 PM')}
  <div class="pbody">
   <div class="cats"><button class="cat">Cocktails</button><button class="cat">Beer</button><button class="cat">Wine</button><button class="cat">Food</button><button class="cat">N/A drinks</button><button class="cat on">Services</button></div>
   <div class="menu"><button class="item" data-act="houseItem" id="houseItem">Courtesy car (open price)<small>RideNite quote</small></button><button class="item">Coat check<small>$3.00</small></button></div>
   <div class="check"><div class="chd"><b>${TBL()} · ${NAME()}</b><div>Check #${CHK()} · opened ${OPENED()} · card on tab: Visa ending ${L4()}</div></div>
    <div class="lines">${posLines(c)}</div>${posTotals(c,false)}
    <div class="strip info" style="font-size:15px;margin:8px 0">Rung at close-out. The guest still sees the price before booking.</div>
    <div class="acts"><button class="pb">Send</button><button class="pb">Pay</button></div></div>
  </div></div>`;};
SCR.B4n=()=>SCR.B4();
SCR.P5w=()=>phone(`
  <div class="ph-top"><span class="status st-warn">${ic('car')} ${NEAR_MIN} min away</span><span>${V}</span></div>
  <h1 class="h2" style="margin:0">Your car is about ${NEAR_MIN} min away.</h1>
  <p class="body" style="margin:0">You can wait inside. We'll text you when it's at the door.</p>
  <div class="plate" aria-label="Plate X L T 5 0 1 2">XLT-5012</div>
  <div class="driver card" style="padding:14px"><div class="avatar" aria-hidden="true">L</div><div><b style="font-size:24px">Luis M.</b><div class="body muted small">Gray Toyota Camry</div></div></div>
  <div class="card" style="padding:12px 16px"><div class="small" style="line-height:1.4">${disc(S.quote)}</div></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn btn-secondary">Share my trip</button><button class="btn btn-secondary">Help</button></div>
  <p class="fict">Driver, car and plate are fictional.</p>`);
SCR.M2d=()=>{const c=calc(),t=smsBody(c),neutral=(S.receipt||ctl.receipt)==='neutral';return `<section class="sms">
  <div style="text-align:center;color:#AEB9C7;font-size:14px">RideNite (555) 010-0100</div>
  <div style="text-align:center;color:#AEB9C7;font-size:13px;margin-top:10px">Sat 9:00 AM · ${neutral?'Neutral (default)':'Detailed'} receipt setting</div>
  <div class="bubble">${neutral?`RideNite: Your receipt from ${V} is ready: rdnt.example/m/abc123 Reply STOP to opt out, HELP for help.`:t.morning}</div>
  <div style="text-align:center;color:#AEB9C7;font-size:13px;margin-top:14px">Email subject: <b style="color:#F4F6FA">${neutral?`Your receipt from ${V}`:`Your ${V.replace('The ','')} tab and ride home receipt`}</b></div>
  <p style="color:#AEB9C7;font-size:13px;text-align:center;margin-top:20px">Inside the receipt, the ride is a "${rideLabel()}" line like every other ride. Venue setting: Morning receipt, Neutral (recommended) or Detailed. Sample message; fictional.</p></section>`;};

/* ---------- context notes next to phone screens ---------- */
const CTX={
 P0:['Patron: card given to the bar (P0, new)','Standard bar tab practice. The card-on-tab pre-authorization is the processor\'s normal hold; RideNite is not involved yet.'],
 P3c:['Patron: link path (P3 with fare note)','If staff text a link instead of typing the drop-off, the guest sees the quote and the fare note on her own phone. Her tap ticks "Guest saw the price" on the POS panel.'],
 E2:['E2: price changed before booking','Nothing is booked or charged until the guest re-approves. Same screen as UI spec E2, with quote wording.'],
 P5:['Patron: driver on the way (P5)','The trip page shows the quote on her tab and the adjustment cap again.'],
 P14:['Patron: the ride on her tab (P14, new)','Opened from the trip link in the text. Shows the tab so far, including the ride line.'],
 P7:['Patron: trip complete (P7)','Final fare reconciled against the quote, with the adjustment or credit explained in one sentence.'],
 M2:['Patron: SMS thread (M2)','Transactional texts only. Every text that mentions the fare repeats the cap rule.'],
 M1:['Patron: morning-after email (M1)','Drinks, food, tax, the ride, the adjustment, tip and total.'],
 P9:['Patron: review and pay (P9)','Mode B: the tab was held on the card for morning checkout. Tip is on drinks and food only.'],
 E7:['E7: over the cap (new)','Only the amount above the cap ($4.20 on a $21.00 quote) waits for the guest, and only when she changed the trip. If she says no, it is not charged and RideNite absorbs it, not the bar. If the guest changed nothing, RideNite files a fare review with the provider instead of asking her.'],
 P11:['Patron: paid (P11)','Receipt by email. Optional opt-in to save home.'],
 P15:['Night pass on (P15, new)','Only the guest sees which venues were linked tonight. Deleted at 6 AM.'],
 P16:['Night pass notice (P16, new)','One text when a new venue links the pass, with an off switch.'],
 P5w:['Car 2 min away (P5w, new)','Sent once when the ETA reaches the venue\'s notice time (default 2 min) [A]. The guest can wait inside. Staff are never asked to walk anyone out or watch for the car.'],
 M2d:['Neutral morning receipt (M2d, new default)','Lock screens and shared inboxes are seen by other people, so the default text and email subject say only that the receipt is ready. Detailed is a venue setting.']
};
const renderScreen=id=>CTX[id]?SCR[id]()+ctx(CTX[id][0],CTX[id][1]):SCR[id]();

/* ---------- guided walkthrough ---------- */
const OPEN={tab:'open',cardModal:false};
const BOOKED=Object.assign({},OPEN,{entry:'staff_offer',addr:true,saw:true,sawBy:'staff'});
const DONE=Object.assign({},BOOKED,{ride:'complete',recon:true});
const HELD=Object.assign({},DONE,{close:'held'});
const STEPS=[
 {id:'P0',st:OPEN,t:'7:42 PM. Maya opens a tab the usual way',s:'"Maya hands her card to Imani, the bartender. A normal bar tab. RideNite isn\'t involved yet."',c:'Click Next.'},
 {id:'T1',st:{},t:'The bartender starts the tab in the POS',s:'"Imani swipes the card and starts a tab for Table 7. This is the bar\'s own POS. RideNite never touches the card."',c:'Click "Start tab for Maya R."',hot:'#startTab'},
 {id:'T2',st:OPEN,t:'11:10 PM. RideNite sits on the check, not the drink menu',s:'"Hours later, near closing. RideNite is a button on the check, separate from anything she ordered."',c:'Click "RideNite: Book a car" on the check.',hot:'.pb.rn'},
 {id:'T3',st:Object.assign({},OPEN,{panel:1}),t:'Pick the tab, then Guest asked or I offered',s:'"Imani asks: Can I get you a car home? It goes on your tab. Maya says yes. Imani taps I offered. No reason, no notes."',c:'Click "I offered".',hot:'[data-act=entry][data-v=staff_offer]'},
 {id:'T4',st:Object.assign({},OPEN,{panel:2,entry:'staff_offer'}),t:'Enter the drop-off',s:'"Maya\'s phone is almost dead, so Imani types the address. Typos are fine."',c:'Click "655 N Harrison St, Westover".',hot:'[data-act=addr]'},
 {id:'T5',st:Object.assign({},OPEN,{panel:3,entry:'staff_offer',addr:true}),t:'Quote, local partner first, and the fare note',s:'"Northside Car Service, a local base, comes first at $21.00. Imani turns the screen: the final fare may differ by up to $4.20, that is 20% of the quote, never more than $5; more than that and we ask first."',c:'Click "Guest saw the price and the fare note".',hot:'[data-act=saw]'},
 {id:'T5',st:Object.assign({},BOOKED,{panel:3}),t:'Book',s:'"Book stays off until the guest has seen the price. Now it\'s one tap."',c:'Click "Book".',hot:'[data-act=book]'},
 {id:'T6',st:Object.assign({},BOOKED,{ride:'requested'}),t:'The quoted fare posts to the check',s:'"Courtesy car, $21.00, lands on her check as its own line. No sales tax on the ride line, pending counsel."',c:'Click "Open RideNite dashboard".',hot:'[data-act=toDash]'},
 {id:'B4',st:Object.assign({},BOOKED,{ride:'en_route'}),t:'Live rides: status, partner, ETA, tab link',s:'"The dashboard shows driver on the way, the partner, a 6-minute ETA, and a link straight to her tab."',c:'Point at the Table 7 row, then click Next.'},
 {id:'P5',st:Object.assign({},BOOKED,{ride:'en_route'}),t:'Maya\'s phone: driver on the way',s:'"Maya gets a text with the plate, car, driver, and the $21.00 quote on her tab with the same $4.20 cap."',c:'Click "See my tab".',hot:'[data-go=P14]'},
 {id:'P14',st:Object.assign({},BOOKED,{ride:'en_route'}),t:'The ride on her tab',s:'"From the trip link she can see her tab: drinks, tax, and the ride line."',c:'Click Next.'},
 {id:'P7',st:DONE,t:'11:37 PM. Arrived; final fare reconciled',s:'"The fare came in at $24.60, $3.60 over the quote. That\'s inside the $4.20 she saw before booking, so it goes on the tab."',c:'Click Next.'},
 {id:'B4',st:DONE,t:'Dashboard: the adjustment posts as its own line',s:'"RideNite posts a separate line: Ride fare adjustment, final fare $24.60, quoted $21.00, plus $3.60. Nothing already on the check is edited."',c:'Click "Open tab".',hot:'.banner [data-act=openB6]'},
 {id:'B6',st:DONE,t:'Tab detail with reconciliation',s:'"Quote, final fare, difference, posted. The bar\'s RideNite fee for this ride is one dollar, on the monthly invoice."',c:'Click "Hold for morning checkout".',hot:'.btn-primary[data-act=toPOSClose]'},
 {id:'T7',st:DONE,t:'11:45 PM. Close: all items, tax on drinks only, total',s:'"$49 of drinks and food, $5.39 tax on those only, $24.60 in ride lines: $78.99 before tip. Imani holds it for morning checkout."',c:'Click "Hold for morning checkout".',hot:'[data-act=hold]'},
 {id:'M2',st:HELD,t:'9:00 AM. The morning text',s:'"Next morning Maya gets one short text: her receipt is ready. By default it doesn\'t mention the ride on the lock screen; the venue can switch to a detailed text."',c:'Click Next.'},
 {id:'M1',st:HELD,t:'The morning-after email',s:'"And an itemized email with a plain subject line. Inside: drinks, the ride, the adjustment, tip and total."',c:'Click "Review and pay".',hot:'.cta'},
 {id:'P9',st:HELD,t:'Review and pay',s:'"She tips on drinks and food only and approves: $88.79 total."',c:'Click "Approve and pay".',hot:'[data-act=pay]'},
 {id:'P11',st:Object.assign({},HELD,{paid:true}),t:'Paid',s:'"Done. One card, one tab, one receipt."',c:'Click Next.'},
 {id:'B7',st:Object.assign({},HELD,{paid:true}),t:'The bar gets one invoice',s:'"For the bar: $199 a month plus $1 a ride. Fares ride on guest tabs and settle to partners. That\'s the whole flow."',c:'End of the main walkthrough. Next shows optional branches.'},
 {id:'P3c',st:Object.assign({},OPEN,{panel:3,entry:'guest_request',addr:true,dropMode:'link'}),t:'Branch: link path, the fare note on her own phone',s:'"If staff text a link instead, Maya sees the same quote and fare note on her phone and taps Yes."',c:'Click Next.'},
 {id:'E2',st:Object.assign({},OPEN,{panel:3,entry:'guest_request',addr:true,dropMode:'link',changed:true,quote:23.5}),t:'Branch: E2, price changed before booking',s:'"If the price moves before booking, nothing is booked until she OKs the new quote."',c:'Click Next.'},
 {id:'T7',st:Object.assign({},DONE,{scen:'lower'}),t:'Branch: fare came in lower, a credit posts',s:'"If the fare comes in at $18.90, a credit line posts automatically: Ride fare credit, final fare $18.90, quoted $21.00, minus $2.10."',c:'Click Next.'},
 {id:'E7',st:Object.assign({},HELD,{scen:'over'}),t:'Branch: over the cap, we ask first',s:'"Maya added a stop, so the fare came to $27.40. The $4.20 cap posts as shown before booking and the extra $2.20 waits for her OK. If she says no, it isn\'t charged and RideNite absorbs it, not the bar."',c:'Click Next for the roaming branch.'}
];
const PASSON=Object.assign({},OPEN,{pass:'active'});
const AT2=Object.assign({},PASSON,{venue:2,tab1:'closed'});
const LINKED=Object.assign({},AT2,{tab:'open',pass:'linked',confirmed:true,linkMethod:'card_match_strong'});
STEPS.push(
 {id:'T8',st:Object.assign({},OPEN,{pass:'offered'}),t:'Branch: roaming (post-pilot option). Night pass at the first bar',s:'"Heading anywhere else tonight? Imani offers a night pass. Maya reads the fare rule and turns it on. Nothing is booked."',c:'Click "Turn on night pass".',hot:'[data-act=passOn]'},
 {id:'P15',st:PASSON,t:'Her night pass, on her phone',s:'"Until 6 AM. A QR that refreshes every minute, a backup code, and an off switch. Only Maya sees where it was used."',c:'Click Next.'},
 {id:'T9',st:Object.assign({},AT2,{tab:'open'}),t:'11:49 PM. A normal tab at Bar Lumen (opened 10:20 PM)',s:'"Maya closed her first tab and opened a new one at Bar Lumen with the same card. Bar Lumen\'s own POS. RideNite isn\'t told."',c:'Click "RideNite: Book a car" on the check.',hot:'.pb.rn'},
 {id:'T10',st:Object.assign({},AT2,{tab:'open',panel:1,match:'one_strong'}),t:'11:50 PM. Night pass found on this card',s:'"Theo opens RideNite because Maya asked for a car. Her card matches an active night pass. Bar Lumen sees only: night pass on, fare rule accepted. Theo confirms Maya is here."',c:'Click "Maya R. is here".',hot:'[data-act=passConfirm]'},
 {id:'P16',st:LINKED,t:'One notice text',s:'"Maya gets one text with an off switch."',c:'Click Next.'},
 {id:'T5r',st:Object.assign({},LINKED,{panel:3,entry:'guest_request',addr:true,dropMode:'link',saw:true,sawBy:'guest'}),t:'Quote from Bar Lumen, same fare rule',s:'"The quote is from Bar Lumen\'s door: $21.00, and the final fare may differ by up to $4.20. She still sees the price and taps yes. The pass only saves the explanation."',c:'Click "Book".',hot:'[data-act=book]'},
 {id:'T6',st:Object.assign({},LINKED,{entry:'guest_request',addr:true,saw:true,sawBy:'guest',ride:'requested'}),t:'The ride posts to Bar Lumen\'s tab',s:'"Courtesy car, $21.00, on Bar Lumen\'s check. Her first tab already closed normally at that venue. No card crossed between bars."',c:'Click Next.'},
 {id:'T10m',st:Object.assign({},AT2,{tab:'open',panel:1,match:'multi'}),t:'Branch: two possible passes',s:'"If the card data is too thin to tell two passes apart, RideNite never guesses. Theo asks Maya to show her pass."',c:'Click "Scan night pass".',hot:'[data-act=passScan]'},
 {id:'T10n',st:Object.assign({},AT2,{tab:'open',panel:1,match:'none'}),t:'Branch: paid with a phone, no match',s:'"A phone wallet uses a different card number, so there\'s no match. The normal booking still works, and the night pass QR links it in one scan."',c:'End of the roaming branch. Next: the house car.'},
 {id:'K1',st:Object.assign({},OPEN,{discreet:true}),t:'Branch: the house car kit',s:'"Every table has this coaster. One side says: need to head out? Ask for the house car. The other side just says: I\'d like the house car. No code, no app."',c:'Click Next.'},
 {id:'T1q',st:Object.assign({},OPEN,{discreet:true,quiet:true}),t:'Branch: a quiet request reaches the POS',s:'"Rosa scanned the coaster. Imani sees a silent chip: quiet request, Table 4. No sound, no name, no reason."',c:'Click "Open".',hot:'[data-act=openQuiet]'},
 {id:'B10',st:Object.assign({},OPEN,{discreet:true,quiet:true}),t:'Branch: venue procedure first, then the house car',s:'"The venue\'s own steps come first. Then one tap: Book the house car. It\'s recorded as Guest asked, like any other request."',c:'Click "Book the house car (Guest asked)".',hot:'[data-act=bookQuiet]'},
 {id:'T5',st:Object.assign({},OPEN,{panel:3,entry:'guest_request',addr:true,dropMode:'link',discreet:true}),t:'Branch: she still sees the price first',s:'"Rosa picks her drop-off on her own phone and sees $21.00 and the $4.20 cap before anything is booked."',c:'Click Next.'},
 {id:'B4n',st:Object.assign({},BOOKED,{entry:'guest_request',ride:'en_route',discreet:true,near:true}),t:'Branch: car 2 minutes away',s:'"No standing outside. When the car is two minutes out, Imani sees a quiet chip and can let Rosa know."',c:'Click Next.'},
 {id:'P5w',st:Object.assign({},BOOKED,{entry:'guest_request',ride:'en_route',discreet:true,near:true}),t:'Branch: you can wait inside',s:'"Rosa gets a text: about two minutes away, you can wait inside, we\'ll text you at the door."',c:'Click Next.'},
 {id:'M2d',st:Object.assign({},HELD,{entry:'guest_request',discreet:true,receipt:'neutral'}),t:'Branch: a receipt that says nothing extra',s:'"In the morning, the lock screen just says her receipt is ready. Inside, the ride is a Courtesy car line like every other ride."',c:'End of demo.'}
);
const MAIN_STEPS=20;
function applyStep(i){
  step=Math.max(0,Math.min(STEPS.length-1,i));
  S=Object.assign({},BASE,STEPS[step].st);
  cur=STEPS[step].id; render();
}

/* ---------- actions (free click) ---------- */
function act(a,v){
  switch(a){
   case 'cardModal': S.cardModal=true; return 'T1';
   case 'startTab': S.tab='open'; S.cardModal=false; return 'T2';
   case 'rnOpen': if(STATUS.indexOf(S.ride)>=1) return 'B4'; if(S.venue===2) return act('passLookup'); S.panel=1; return 'T3';
   case 'passOffer': S.pass='offered'; S.panel=1; return 'T8';
   case 'passOn': S.pass='active'; S.panel=0; return 'P15';
   case 'passOff': S.pass='off'; toast('Night pass turned off (simulated). Nothing is linked.'); return 'P15';
   case 'toBar2': S.venue=2; S.tab1='closed'; S.tab='open'; S.panel=0; return 'T9';
   case 'passLookup': S.match=(S.pass==='active'||S.pass==='linked')?ctl.roam:'none'; S.panel=1; return S.match==='multi'?'T10m':S.match==='none'?'T10n':'T10';
   case 'passConfirm': if(S.match==='one_weak'&&!S.linkMethod){toast('Partial card match: scan the night pass or check the phone digits first.');return 'T10';} S.confirmed=true; S.pass='linked'; S.linkMethod=S.linkMethod||'card_match_strong'; S.entry='guest_request'; return 'P16';
   case 'passScan': S.match='one_strong'; S.linkMethod='qr'; S.confirmed=true; S.pass='linked'; S.entry='guest_request'; toast('Night pass scanned (simulated). Code was current.'); return 'P16';
   case 'passPhone': S.linkMethod=S.match==='one_weak'?'card_match_weak_confirmed':'phone'; S.confirmed=true; S.pass='linked'; S.entry='guest_request'; return 'P16';
   case 'passNotThis': S.match='none'; S.confirmed=false; S.linkMethod=null; S.pass='active'; toast('Link removed. The other pass holder is not contacted.'); return 'T10n';
   case 'passNone': S.match='none'; return 'T10n';
   case 'toQuote2': S.panel=3; S.addr=true; S.dropMode='link'; S.entry=S.entry||'guest_request'; return 'T5r';
   case 'openQuiet': S.quiet=true; return 'B10';
   case 'bookQuiet': S.entry='guest_request'; S.panel=2; S.dropMode='link'; return 'T4';
   case 'houseItem': S.entry='guest_request'; S.panel=2; return 'T4';
   case 'rnClose': S.panel=0; return 'T2';
   case 'entry': S.entry=v; S.panel=2; return 'T4';
   case 'dropMode': S.dropMode=v; return 'T4';
   case 'addr': S.addr=true; S.panel=3; return S.venue===2?'T5r':'T5';
   case 'p3yes': S.addr=true; S.panel=3; S.saw=true; S.sawBy='guest'; return 'T5';
   case 'saw': {const t=S.venue===2?'T5r':'T5'; if(S.sawBy==='guest'&&S.saw) return t; S.saw=!S.saw; S.sawBy=S.saw?'staff':null; return t;}
   case 'priceChange': S.changed=true; S.quote=23.5; S.saw=false; S.sawBy=null; return S.dropMode==='link'?'E2':'T5';
   case 'e2yes': S.saw=true; S.sawBy=S.dropMode==='link'?'guest':'staff'; return 'T5';
   case 'e2no': S.changed=false; S.quote=21; S.saw=false; S.sawBy=null; toast('Looking for another car (simulated). Back to the $21.00 quote.'); return 'T5';
   case 'book': if(!S.saw) return S.venue===2?'T5r':'T5'; S.ride='requested'; S.panel=0; return 'T6';
   case 'toDash': if(S.ride==='requested') S.ride='en_route'; return 'B4';
   case 'advance': {const i=STATUS.indexOf(S.ride); S.ride=STATUS[Math.min(i+1,5)]; if(S.ride==='complete') S.recon=true; return 'B4';}
   case 'openB6': return 'B6';
   case 'toPOSClose': return 'T7';
   case 'hold': S.close='held'; return 'M2';
   case 'closeNow': S.close='closed'; return 'M2';
   case 'tip': S.tip=+v; return 'P9';
   case 'pay': S.paid=true; return 'P11';
   case 'overOk': S.overOk=v==='1'; return 'P9';
   case 'unsafeHelp': toast('Follow your venue\'s procedure first: manager, security, or 911 if needed. A car is one option. If the guest wants one, book it and keep pickup details on their phone only.'); return null;
  }
  return null;
}
let tt;function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.style.display='block';clearTimeout(tt);tt=setTimeout(()=>{t.style.display='none';},4200);}

/* ---------- render ---------- */
const ORDER=['P0','T1','T2','T3','T4','T5','P3c','E2','T6','B4','P5','P14','P7','B6','T7','M2','M1','P9','E7','P11','B7','T8','P15','T9','T10','T10m','T10n','P16','T5r','K1','T1q','B10','T2h','B4n','P5w','M2d'];
const TITLES={P0:'P0 Patron: card given to bar',T1:'T1 POS: start tab',T2:'T2 POS: check with RideNite button',T3:'T3 POS > RideNite: tab + Guest asked / I offered',T4:'T4 POS > RideNite: drop-off',T5:'T5 POS > RideNite: quote, fare note, Book',P3c:'P3c Patron: confirm with fare note (link path)',E2:'E2 Patron: price changed before booking',T6:'T6 POS: quoted fare posted to check',B4:'B4 Bar: live rides',P5:'P5 Patron: driver on the way',P14:'P14 Patron: ride on my tab',P7:'P7 Patron: arrived + final fare',B6:'B6 Bar: tab detail + reconciliation',T7:'T7 POS: close tab',M2:'M2 SMS thread',M1:'M1 Morning-after email',P9:'P9 Morning review and pay',E7:'E7 Over the cap: guest OK',P11:'P11 Paid',B7:'B7 Bar: billing, one invoice',
  T8:'T8 POS (Bar 1) > Night pass offer',P15:'P15 Patron: night pass on',T9:'T9 POS (Bar 2): new tab',T10:'T10 POS (Bar 2) > Night pass found',T10m:'T10m POS (Bar 2) > Two possible passes',T10n:'T10n POS (Bar 2) > No pass found',P16:'P16 Patron: night pass notice',T5r:'T5r POS (Bar 2) > Quote from Bar Lumen',
  K1:'K1 House car kit (print preview)',T1q:'T1q POS: quiet request chip',B10:'B10 Bar: quiet request, venue procedure first',T2h:'T2h POS: close-out with Courtesy car',B4n:'B4n Bar: car 2 min away',P5w:'P5w Patron: you can wait inside',M2d:'M2d Patron: neutral morning receipt'};
const $=id=>document.getElementById(id);
function render(){
  const stage=$('stage');
  stage.innerHTML=renderScreen(cur);
  $('jump').value=cur;
  $('scen').value=S.scen||ctl.scen; $('scen').disabled=!!S.scen;
  const g=mode==='guided', s=STEPS[step];
  $('cueN').textContent=g?`Step ${step+1} of ${STEPS.length}${step>=MAIN_STEPS?' (optional branch)':''}`:'Free click';
  $('cueT').textContent=g?s.t:TITLES[cur];
  $('cueS').textContent=g?'Say: '+s.s:'';
  $('cueC').textContent=g?'Click cue: '+s.c:'';
  $('back').disabled=g&&step===0; $('next').disabled=g&&step===STEPS.length-1;
  $('back').textContent=g?'Back':'Prev screen'; $('next').textContent=g?'Next':'Next screen';
  if(g&&s.hot){const h=stage.querySelector(s.hot); if(h) h.classList.add('hot');}
  document.title=`RideNite POS demo: ${TITLES[cur]} (SIMULATED)`;
}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act],[data-go]');
  if(!el||!$('stage').contains(el)) return;
  e.preventDefault();
  if(el.disabled) return;
  if(mode==='guided'){
    const s=STEPS[step];
    if(s.hot&&el.matches(s.hot)){applyStep(step+1);return;}
    if(el.dataset.act==='tip'){S.tip=+el.dataset.v;render();return;}
    toast('Guided mode: use Next, or the highlighted button. Switch to Free click to explore.');return;
  }
  const nx=el.dataset.go||act(el.dataset.act,el.dataset.v);
  if(nx){cur=nx;render();}
});
const jump=$('jump');
ORDER.forEach(id=>{const o=document.createElement('option');o.value=id;o.textContent=TITLES[id];jump.appendChild(o);});
function coherent(id){ // free-click jump: give the screen a sensible state
  const keep={entry:S.entry||'staff_offer',sawBy:S.sawBy||'staff',dropMode:S.dropMode,quote:S.quote,changed:S.changed,tip:S.tip,overOk:S.overOk,close:S.close,paid:S.paid,scen:S.scen};
  const pre={P0:OPEN,T1:{},T2:OPEN,T3:Object.assign({},OPEN,{panel:1}),T4:Object.assign({},OPEN,{panel:2}),T5:Object.assign({},OPEN,{panel:3,addr:true}),
    P3c:Object.assign({},OPEN,{panel:3,addr:true,dropMode:'link'}),E2:Object.assign({},OPEN,{panel:3,addr:true,dropMode:'link',changed:true,quote:23.5}),
    T6:Object.assign({},BOOKED,{ride:'requested'}),B4:Object.assign({},BOOKED,{ride:STATUS.indexOf(S.ride)>=2?S.ride:'en_route',recon:S.recon}),
    T8:Object.assign({},OPEN,{pass:'offered',panel:1}),P15:PASSON,T9:Object.assign({},AT2,{tab:'open'}),
    T10:Object.assign({},AT2,{tab:'open',panel:1,match:ctl.roam==='one_weak'?'one_weak':'one_strong'}),T10m:Object.assign({},AT2,{tab:'open',panel:1,match:'multi'}),T10n:Object.assign({},AT2,{tab:'open',panel:1,match:'none'}),
    P16:LINKED,T5r:Object.assign({},LINKED,{panel:3,entry:'guest_request',addr:true,dropMode:'link'}),
    K1:Object.assign({},OPEN,{discreet:true}),T1q:Object.assign({},OPEN,{discreet:true,quiet:true}),B10:Object.assign({},OPEN,{discreet:true,quiet:true}),T2h:Object.assign({},OPEN,{discreet:true}),
    B4n:Object.assign({},BOOKED,{entry:'guest_request',ride:'en_route',discreet:true,near:true}),P5w:Object.assign({},BOOKED,{entry:'guest_request',ride:'en_route',discreet:true,near:true}),
    P5:Object.assign({},BOOKED,{ride:'en_route'}),P14:Object.assign({},BOOKED,{ride:S.ride==='complete'?'complete':'en_route',recon:S.recon})}[id];
  if(pre){S=Object.assign({},BASE,keep,pre); if(['T1','T2','T3','T4','P0','T5r','T10','T10n','T10m','T9'].includes(id)){S.quote=21;S.changed=false;} return;}
  S=Object.assign({},BASE,keep,DONE);
  if(['M2','M1','P9','E7','P11','B7'].includes(id)&&S.close==='open') S.close='held';
  if(id==='E7'){S.scen='over';S.overOk=null;S.close='held';}
  if(id==='M2d'){S.discreet=true;S.close='held';}
}
jump.onchange=()=>{
  if(mode==='guided'){const i=STEPS.findIndex(s=>s.id===jump.value); if(i>=0) applyStep(i); return;}
  cur=jump.value; coherent(cur); render();
};
function setMode(mo){
  mode=mo; document.body.classList.toggle('free',mo==='free');
  ['mGuided','mFree'].forEach(b=>{const on=(b==='mGuided')===(mo==='guided');$(b).classList.toggle('on',on);$(b).setAttribute('aria-pressed',on);});
  if(mo==='guided') applyStep(step); else render();
}
$('mGuided').onclick=()=>setMode('guided');
$('mFree').onclick=()=>setMode('free');
function freeStep(d){const i=ORDER.indexOf(cur);jump.value=ORDER[Math.max(0,Math.min(ORDER.length-1,i+d))];jump.onchange();}
$('back').onclick=()=>{if(mode==='guided')applyStep(step-1);else freeStep(-1);};
$('next').onclick=()=>{if(mode==='guided')applyStep(step+1);else freeStep(1);};
$('reset').onclick=()=>{S=Object.assign({},BASE);step=0;if(mode==='guided')applyStep(0);else{cur='T1';render();}};
$('skin').onchange=e=>{ctl.skin=e.target.value;render();};
$('scen').onchange=e=>{ctl.scen=e.target.value;render();};
$('roam').onchange=e=>{ctl.roam=e.target.value;render();};
$('rcpt').onchange=e=>{ctl.receipt=e.target.value;S.receipt=null;render();};
document.addEventListener('keydown',e=>{if(['SELECT','INPUT'].includes(e.target.tagName))return;if(e.key==='ArrowRight')$('next').click();if(e.key==='ArrowLeft')$('back').click();});

// URL params: ?step=N (1-based), ?mode=free&screen=ID, ?skin=, ?scen=, ?roam=, ?receipt=, ?shot=1
if(SKINS[params.get('skin')]){ctl.skin=params.get('skin');$('skin').value=ctl.skin;}
if(FIN[params.get('scen')]) ctl.scen=params.get('scen');
if(['one_strong','one_weak','multi','none'].includes(params.get('roam'))){ctl.roam=params.get('roam');$('roam').value=ctl.roam;}
if(['neutral','detailed'].includes(params.get('receipt'))){ctl.receipt=params.get('receipt');$('rcpt').value=ctl.receipt;}
if(params.get('mode')==='free'){
  mode='free';document.body.classList.add('free');$('mFree').classList.add('on');$('mGuided').classList.remove('on');
  cur=SCR[params.get('screen')]?params.get('screen'):'T1'; coherent(cur); render();
} else applyStep((+params.get('step')||1)-1);
window.__demo={STEPS,applyStep,calc,get S(){return S;}};
})();
