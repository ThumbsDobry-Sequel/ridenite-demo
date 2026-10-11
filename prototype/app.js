// RideNite prototype controller. Plain JS, no dependencies. All data is fictional.
(function(){
  const side=document.getElementById('sidebar').innerHTML, top=document.getElementById('topbar').innerHTML;
  document.querySelectorAll('[data-side]').forEach(n=>n.outerHTML=side);
  document.querySelectorAll('[data-top]').forEach(n=>n.outerHTML=top);
  const screens=[...document.querySelectorAll('.screen')];
  const pick=document.getElementById('pick');
  screens.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.dataset.title;pick.appendChild(o);});
  const params=new URLSearchParams(location.search);
  if(params.has('shot')) document.body.classList.add('shot');
  const subOf={B2:'B1',B3:'B1',B6:'B1',B9:'B1',B10:'B1'};
  function show(id){
    const s=document.getElementById(id)||screens[0];
    screens.forEach(x=>x.classList.toggle('active',x===s));
    pick.value=s.id;
    history.replaceState(null,'',location.pathname+location.search+'#'+s.id);
    s.querySelectorAll('[data-nav]').forEach(n=>n.classList.toggle('on',n.dataset.nav===(subOf[s.id]||s.id)));
    document.title=s.dataset.title+' | RideNite prototype';
    const live=document.getElementById('sr-live'); if(live) live.textContent=s.dataset.title;
    window.scrollTo(0,0);
  }
  document.addEventListener('click',e=>{const g=e.target.closest('[data-go]'); if(g){e.preventDefault(); show(g.dataset.go);}});
  pick.onchange=()=>show(pick.value);
  const idx=()=>screens.findIndex(s=>s.classList.contains('active'));
  document.getElementById('prev').onclick=()=>show(screens[(idx()-1+screens.length)%screens.length].id);
  document.getElementById('next').onclick=()=>show(screens[(idx()+1)%screens.length].id);
  window.addEventListener('hashchange',()=>show(location.hash.slice(1)));

  // Price display modes (bar setting). tab = fare at cost on guest tab (default);
  // comp = venue perk, first $10 on the venue; addon = fare + add-on (needs counsel OK); pass = Ride Home Pass on the check (pilot).
  const V='The Copper Lantern';
  const C={
    tab:{p1:`Ride goes on your tab at ${V}.`,p3:`Added to your tab at ${V}.`,p5:`On your tab at ${V}`,p7:`Your ride from ${V} is on your tab.`,amt:'$24.00',ride:24,adj:0},
    comp:{p1:`Venue perk: ${V} pays the first $10 of your ride. The rest goes on your tab.`,p3:`Venue perk: first $10 on ${V}. You pay $14.00 on your tab.`,p5:`$14.00 on your tab after house credit`,p7:`Your ride from ${V} is on your tab ($10.00 perk applied).`,amt:'$14.00',ride:24,adj:-10},
    pass:{p1:`Ride goes on your tab at ${V}.`,p3:`Ride Home Pass applies up to $25. Fare $24.00. You pay $0.00.`,p5:`Paid with your Ride Home Pass`,p7:`Your ride from ${V} was paid with your Ride Home Pass.`,amt:'$0.00',ride:24,adj:-24+13.07},
    addon:{p1:`Ride plus a $2.00 add-on goes on your tab at ${V}.`,p3:`$24.00 ride + $2.00 add-on, on your tab at ${V}.`,p5:`On your tab (incl. $2.00 add-on)`,p7:`Your ride from ${V} is on your tab.`,amt:'$26.00',ride:24,adj:2}
  };
  let mode=C[params.get('mode')]?params.get('mode'):'tab', tipPct=20;
  const money=n=>(n<0?'-$':'$')+Math.abs(n).toFixed(2);
  function recalc(){
    const c=C[mode], base=49, tax=4.35, tip=Math.round(base*tipPct)/100;
    const total=base+tax+c.ride+c.adj+tip;
    const t=document.getElementById('tipamt'); if(t) t.textContent=money(tip);
    document.querySelectorAll('[data-total]').forEach(n=>n.textContent=money(total));
  }
  function applyMode(){
    const c=C[mode];
    document.querySelectorAll('[data-price]').forEach(n=>{const k=n.dataset.price;
      if(k==='amt') n.textContent=c.amt;
      else if(k==='ridecell') n.textContent=money(c.ride);
      else if(k==='line') n.textContent= 'Courtesy car';
      else if(c[k]) n.textContent=c[k];});
    document.querySelectorAll('[data-row=addon]').forEach(r=>r.style.display=mode==='addon'?'':'none');
    document.querySelectorAll('[data-row=comp]').forEach(r=>r.style.display=mode==='comp'?'':'none');
    document.querySelectorAll('[data-row=pass],[data-row=passblock]').forEach(r=>r.style.display=mode==='pass'?'':'none');
    document.getElementById('mode').value=mode; recalc();
  }
  document.getElementById('mode').onchange=e=>{mode=e.target.value;applyMode();};
  document.querySelectorAll('[data-tip]').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('[data-tip]').forEach(x=>x.setAttribute('aria-pressed','false'));
    b.setAttribute('aria-pressed','true'); tipPct=+b.dataset.tip; recalc();});
  document.querySelectorAll('.rider').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('.rider').forEach(x=>{x.setAttribute('aria-pressed','false');x.classList.remove('selected');});
    b.setAttribute('aria-pressed','true');b.classList.add('selected');});

  // Voice: Web Speech API (feature-detected) with typed fallback.
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const mic=document.getElementById('micbtn');
  mic.addEventListener('click',e=>{
    e.stopPropagation();
    const st=document.getElementById('vstate'), tx=document.getElementById('vtext');
    if(!SR){ st.textContent='Voice isn\'t available on this phone. Tap "Type it instead."'; mic.classList.remove('listening'); return; }
    const r=new SR(); r.lang='en-US'; r.interimResults=true; r.maxAlternatives=3;
    mic.classList.add('listening'); st.textContent='Listening...';
    r.onresult=ev=>{tx.textContent='"'+[...ev.results].map(x=>x[0].transcript).join(' ')+'"';};
    r.onerror=()=>{st.textContent="Didn't catch that. Try again or type it.";};
    r.onend=()=>{mic.classList.remove('listening'); st.textContent='Is this right? Tap the address below.';};
    try{r.start();}catch(_){st.textContent='Voice isn\'t available. Type it instead.';}
  });
  const live=document.createElement('div'); live.id='sr-live'; live.setAttribute('aria-live','polite'); live.style.cssText='position:absolute;left:-9999px'; document.body.appendChild(live);
  applyMode();
  show((location.hash||'#P1').slice(1));
})();
