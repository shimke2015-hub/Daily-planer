// Daily Cost Planner — AL v2.0
let priceList = {
  oats: 0.25, banana: 0.35, milk: 0.30, plant_milk: 0.45, yogurt: 0.45, egg: 0.30, bread: 0.20, peanut_butter: 0.30,
  rice: 0.40, pasta: 0.45, tomato_sauce: 0.50, lentils: 0.50, beans: 0.55, chickpeas: 0.55,
  chicken: 1.80, tuna: 1.20, cheese: 0.70, tofu: 0.90, veg_mix: 0.80, salad: 0.60, olive_oil: 0.15,
  apple: 0.50, orange: 0.55, carrot: 0.25, potato: 0.35, onion: 0.10, garlic: 0.05,
  coffee: 0.30, tea: 0.20, water: 0.05,
  transport_ticket: 2.00, hygiene: 0.80, phone_data: 1.00, electricity: 1.50
};

const mealBank = {
  omnivore: [
    { name: "Zobena kaša + banana + mlijeko", items: {oats:1, banana:1, milk:1} },
    { name: "Jaja i kruh", items: {egg:2, bread:2} },
    { name: "Piletina s rižom i povrćem", items: {chicken:1, rice:1, veg_mix:1, olive_oil:1} },
    { name: "Tjestenina s umakom od rajčice + salata", items: {pasta:1, tomato_sauce:1, salad:1} },
    { name: "Tuna sendvič", items: {tuna:1, bread:2, salad:1} },
    { name: "Jogurt + voće", items: {yogurt:1, apple:1} }
  ],
  vegetarian: [
    { name: "Zobena kaša + banana + biljno mlijeko", items: {oats:1, banana:1, plant_milk:1} },
    { name: "Tjestenina + umak od rajčice + salata", items: {pasta:1, tomato_sauce:1, salad:1} },
    { name: "Riža + leća + povrće", items: {rice:1, lentils:1, veg_mix:1, olive_oil:1} },
    { name: "Tofu + povrće + riža", items: {tofu:1, veg_mix:1, rice:1, olive_oil:1} },
    { name: "Jogurt + voće", items: {yogurt:1, apple:1} },
    { name: "Sendvič sir + salata", items: {bread:2, cheese:1, salad:1} }
  ],
  vegan: [
    { name: "Zobena kaša + banana + biljno mlijeko", items: {oats:1, banana:1, plant_milk:1} },
    { name: "Riža + leća + povrće", items: {rice:1, lentils:1, veg_mix:1, olive_oil:1} },
    { name: "Tjestenina + umak od rajčice", items: {pasta:1, tomato_sauce:1} },
    { name: "Slanutak + riža + salata", items: {chickpeas:1, rice:1, salad:1, olive_oil:1} },
    { name: "Voće (jabuka + naranča) + kikiriki maslac + kruh", items: {apple:1, orange:1, peanut_butter:1, bread:2} },
    { name: "Tofu + povrće + krumpir", items: {tofu:1, veg_mix:1, potato:2, olive_oil:1} }
  ]
};

const essentialsBank = [
  { name: "Voda / čaj / kava", items: {water:1, tea:1, coffee:1} },
  { name: "Higijena (sapuni, pasta)", items: {hygiene:1} },
  { name: "Transport karta", items: {transport_ticket:1} },
  { name: "Telefon (mobilni podatci)", items: {phone_data:1} },
  { name: "Struja (udjel dnevno)", items: {electricity:1} }
];

// -------- utils
function parseList(str) { return (str || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean); }
function money(v){ return "€"+(Math.round(v*100)/100).toFixed(2); }
function priceOf(items) { let sum=0; for (const k in items) sum += (priceList[k] || 0) * items[k]; return sum; }
function clone(x){ return JSON.parse(JSON.stringify(x)); }

function filterByDiet(meals, avoid) {
  if (!avoid.length) return meals;
  return meals.filter(m => !Object.keys(m.items).some(i => avoid.some(a => i.includes(a))));
}
function applyPantry(meal, pantry) {
  const updated = clone(meal);
  for (const p of pantry) for (const key of Object.keys(updated.items)) if (key.includes(p)) updated.items[key] = 0;
  return updated;
}

// -------- planner (day)
function greedyPlan({diet, budget, people, avoid, pantry, activity}) {
  const meals = filterByDiet(mealBank[diet], avoid);
  const prefer = activity === 'high' ? ['rice','pasta','potato'] : ['oats','yogurt','salad','veg_mix'];
  const scored = meals.map(m=>{
    const base = priceOf(m.items);
    const prefScore = Object.keys(m.items).some(k => prefer.includes(k)) ? -0.2 : 0;
    return {meal:m, price:base, score: base + prefScore};
  }).sort((a,b)=>a.score-b.score);

  const picks = (scored.slice(0,6).map(x=>x.meal));
  let selected = [picks[0], picks[1], picks[2]];
  const snack = { name: "Snack (voće / jogurt / PB+kruh)", items: {apple:1} };
  selected.push(snack);

  const adjusted = selected.map(m=>{
    const withPantry = applyPantry(m, pantry);
    const multiplied = { name: m.name, items: {} };
    for (const k in withPantry.items) multiplied.items[k] = withPantry.items[k] * people;
    return multiplied;
  });

  const essentials = [essentialsBank[0], essentialsBank[1]];
  const baseMealsCost = adjusted.reduce((s,m)=>s+priceOf(m.items),0);
  let remaining = budget - baseMealsCost;
  for (let i=2;i<essentialsBank.length;i++){
    const e = essentialsBank[i]; const c = priceOf(e.items);
    if (remaining - c >= -0.50) { essentials.push(e); remaining -= c; }
  }

  const totalMeals = adjusted.reduce((s,m)=>s+priceOf(m.items),0);
  const totalEss = essentials.reduce((s,e)=>s+priceOf(e.items),0);
  const total = totalMeals + totalEss;

  const tips = [];
  if (total > budget) tips.push({text:`Plan je ${money(total-budget)} iznad budžeta. Zamjene: piletina ➜ leća/tofu; tuna ➜ grah.`});
  if (!pantry.length) tips.push({text:"Dodaj što imaš kod kuće (riža, tjestenina, jaja…) kako bi AL snizio cijenu."});
  tips.push({text:"Kupi veća pakiranja i koristi ostatke za sutra."});
  tips.push({text:"Snack zamijeni mrkvom ili bananom za dodatnu uštedu."});

  return {meals: adjusted, essentials, totals:{meals:totalMeals, essentials:totalEss, total}, tips};
}

// shopping list from plan
function planToShopping(plan){
  const need = {};
  function add(items){ for (const k in items){ need[k] = (need[k]||0) + items[k]; } }
  plan.meals.forEach(m=>add(m.items)); plan.essentials.forEach(e=>add(e.items));
  // remove zero-amount
  for (const k of Object.keys(need)) if (need[k]<=0) delete need[k];
  const list = Object.keys(need).map(k=>({item:k, qty:need[k], cost:(priceList[k]||0)*need[k]})).sort((a,b)=>a.cost-b.cost);
  const total = list.reduce((s,x)=>s+x.cost,0);
  return {list,total};
}

// -------- weekly planner
function planWeek(cfg){
  // rotate meal bank to create variety
  const original = clone(mealBank[cfg.diet]);
  const days = [];
  let totals = {meals:0, essentials:0, total:0};
  const weekNeed = {};
  for (let d=0; d<7; d++){
    mealBank[cfg.diet].push(mealBank[cfg.diet].shift());
    const dayPlan = greedyPlan(cfg);
    days.push(dayPlan);
    totals.meals += dayPlan.totals.meals;
    totals.essentials += dayPlan.totals.essentials;
    totals.total += dayPlan.totals.total;
    const dailyNeed = planToShopping(dayPlan).list;
    dailyNeed.forEach(x=> weekNeed[x.item] = (weekNeed[x.item]||0) + x.qty);
  }
  mealBank[cfg.diet] = original;
  const weekList = Object.keys(weekNeed).map(k=>({item:k, qty:weekNeed[k], cost:(priceList[k]||0)*weekNeed[k]})).sort((a,b)=>a.cost-b.cost);
  const weekTotal = weekList.reduce((s,x)=>s+x.cost,0);
  return {days, totals, shopping:{list:weekList, total:weekTotal}};
}

// -------- UI
function el(id){ return document.getElementById(id); }
function showNotice(msg, timeout){ const n=el('notice'); n.textContent=msg; n.style.display='block'; if (timeout) setTimeout(()=>n.style.display='none', timeout); }
function hideNotice(){ el('notice').style.display='none'; }

function renderDay(plan){
  const menu = el('menu'), ess = el('essentials'), sum = el('summary'), tips = el('tips'), shop = el('shopping');
  menu.innerHTML = ess.innerHTML = tips.innerHTML = shop.innerHTML = '';
  plan.meals.forEach((m,idx)=>{
    const cost = priceOf(m.items);
    const div = document.createElement('div'); div.className='item';
    div.innerHTML = `<div>${['Doručak','Ručak','Večera','Snack'][idx] || 'Obrok'} — ${m.name}</div><div>${money(cost)}</div>`;
    menu.appendChild(div);
  });
  plan.essentials.forEach(e=>{
    const cost = priceOf(e.items);
    const div = document.createElement('div'); div.className='item';
    div.innerHTML = `<div>${e.name}</div><div>${money(cost)}</div>`;
    ess.appendChild(div);
  });
  sum.innerHTML = `<div><strong>Ukupno obroci:</strong> ${money(plan.totals.meals)} · <strong>Osnovno:</strong> ${money(plan.totals.essentials)}</div>
                   <div class="total">Dnevno ukupno: ${money(plan.totals.total)}</div>`;
  tips.innerHTML = plan.tips.map(t=>`<div class="item"><div class="muted">${t.text}</div></div>`).join('');
  const s = planToShopping(plan);
  shop.innerHTML = s.list.map(x=>`<div class="item"><div>${x.item} × ${x.qty}</div><div>${money(x.cost)}</div></div>`).join('');
  shop.insertAdjacentHTML('beforeend', `<div class="item"><div><strong>UKUPNO (danas)</strong></div><div class="total">${money(s.total)}</div></div>`);
}

function renderWeek(week){
  const wc = el('weekContainer'); wc.innerHTML='';
  week.days.forEach((p, i)=>{
    const d = document.createElement('div'); d.className='card';
    const s = planToShopping(p);
    d.innerHTML = `<div style="font-weight:800;margin-bottom:6px;">Dan ${i+1}</div>
      ${p.meals.map((m,idx)=>`<div class="item"><div>${['Dor','Ru','Ve','Sn'][idx]||'Ob'} — ${m.name}</div><div>${money(priceOf(m.items))}</div></div>`).join('')}
      <div class="divider"></div>
      <div class="item"><div>Osnovno (dnevno)</div><div>${money(p.totals.essentials)}</div></div>
      <div class="divider"></div>
      <div class="item"><div><strong>Ukupno dan</strong></div><div class="total">${money(p.totals.total)}</div></div>
      <div class="muted" style="margin-top:6px;">Shopping (dan ${i+1}): ${money(s.total)}</div>`;
    wc.appendChild(d);
  });
  const wShop = el('weekShopping');
  wShop.innerHTML = week.shopping.list.map(x=>`<div class="item"><div>${x.item} × ${x.qty}</div><div>${money(x.cost)}</div></div>`).join('');
  wShop.insertAdjacentHTML('beforeend', `<div class="item"><div><strong>UKUPNO (tjedan)</strong></div><div class="total">${money(week.shopping.total)}</div></div>`);
  el('weekSummary').innerHTML = `<div><strong>Obroci:</strong> ${money(week.totals.meals)} · <strong>Osnovno:</strong> ${money(week.totals.essentials)}</div>
                                 <div class="total">Sveukupno tjedan: ${money(week.totals.total)}</div>`;
}

// tabs
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click', ()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active')); t.classList.add('active');
  ['daily','weekly','prices','chat'].forEach(id=> el(id).style.display = (t.dataset.tab===id?'block':'none'));
}));

// inputs
function getCfg(){
  return {
    budget: parseFloat(el('budget').value || '0'),
    people: parseInt(el('people').value || '1'),
    diet: el('diet').value,
    avoid: parseList(el('avoid').value),
    pantry: parseList(el('pantry').value),
    activity: el('activity').value
  };
}

function planDay(){
  const cfg = getCfg();
  if (!cfg.budget || cfg.budget<=0) { showNotice("Postavi dnevni budžet kako bi AL mogao planirati."); return; }
  hideNotice();
  const plan = greedyPlan(cfg);
  renderDay(plan);
  localStorage.setItem('dcp.v2.last', JSON.stringify({cfg, plan}));
}

function regenMenu(){
  const saved = localStorage.getItem('dcp.v2.last');
  if (!saved) return planDay();
  const data = JSON.parse(saved);
  mealBank[data.cfg.diet].push(mealBank[data.cfg.diet].shift());
  const plan = greedyPlan(data.cfg);
  renderDay(plan);
  localStorage.setItem('dcp.v2.last', JSON.stringify({cfg:data.cfg, plan}));
}

function saveDay(){
  const saved = JSON.parse(localStorage.getItem('dcp.v2.days')||'[]');
  const last = JSON.parse(localStorage.getItem('dcp.v2.last')||'null');
  if (!last) { showNotice("Napravi plan pa spremi dan."); return; }
  saved.unshift({ ts: Date.now(), ...last });
  localStorage.setItem('dcp.v2.days', JSON.stringify(saved));
  showNotice("Dan spremljen. Možeš regenerirati novi plan za sutra.", 2200);
}

function resetAll(){
  localStorage.removeItem('dcp.v2.last');
  localStorage.removeItem('dcp.v2.days');
  localStorage.removeItem('dcp.v2.prices');
  location.reload();
}

// weekly
function planWeekUI(){
  const cfg = getCfg();
  if (!cfg.budget || cfg.budget<=0) { showNotice("Postavi dnevni budžet (vrijedi za svaki dan u tjednu)."); return; }
  hideNotice();
  const week = planWeek(cfg);
  renderWeek(week);
  localStorage.setItem('dcp.v2.week', JSON.stringify({cfg, week}));
}

// print
el('printBtn').addEventListener('click', ()=>window.print());
el('printWeekBtn').addEventListener('click', ()=>window.print());

// prices editor
function renderPriceEditor(){
  const box = el('priceEditor'); box.innerHTML='';
  const keys = Object.keys(priceList).sort();
  keys.forEach(k=>{
    const row = document.createElement('div'); row.className='item';
    row.innerHTML = `<div style="text-transform:capitalize">${k.replace(/_/g,' ')}</div>
                     <div><input data-k="${k}" type="number" step="0.01" value="${priceList[k].toFixed(2)}" style="width:120px"></div>`;
    box.appendChild(row);
  });
}
el('savePrices').addEventListener('click', ()=>{
  document.querySelectorAll('#priceEditor input').forEach(i=>{
    const k = i.dataset.k; const v = parseFloat(i.value||'0');
    if (!isNaN(v)) priceList[k] = v;
  });
  localStorage.setItem('dcp.v2.prices', JSON.stringify(priceList));
  showNotice("Cijene spremljene. Planiranje će koristiti tvoje vrijednosti.", 2000);
});

// offline chat (rule-based)
function chatRespond(q){
  q = q.toLowerCase();
  const reply = [];
  if (q.includes('nema') || q.includes('nemam')){
    // find ingredient after 'nemam'
    const parts = q.split('nemam');
    if (parts[1]){
      const miss = parts[1].trim().split(/[ ,.!?]/)[0];
      if (miss){
        // simple substitutions
        const subs = {
          egg:'tofu', jaja:'tofu', tuna:'beans', piletina:'lentils', milk:'plant_milk', mlijeko:'plant_milk',
          yogurt:'plant_milk', sir:'tofu', chicken:'lentils'
        };
        if (subs[miss]) reply.push(`Zamjena za "${miss}": ${subs[miss]}.`);
      }
    }
  }
  if (q.includes('jeftin') || q.includes('uštedi') || q.includes('ustedi')) reply.push("Za uštedu: biraj rižu/leću/mahunarke, koristi ostatke, kupi veća pakiranja.");
  if (q.includes('prote')) reply.push("Proteinski budžet obrok: leća + riža + povrće (oko "+money(priceList.lentils+priceList.rice+priceList.veg_mix)+").");
  if (!reply.length) reply.push("Savjet: koristite 'Cijene' za vlastite cijene, a u jelovniku zamijenite skuplje proteine (piletina/tuna) jeftinijim (leća/tofu/grah).");
  return reply.join(' ');
}
function chatAdd(text, who){
  const box = el('chatBox'); const div = document.createElement('div'); div.className='bubble '+(who==='me'?'me':'ai');
  div.textContent = text; box.appendChild(div); box.scrollTop = box.scrollHeight;
}
el('chatSend').addEventListener('click', ()=>{
  const input = el('chatInput'); const t = input.value.trim(); if (!t) return;
  chatAdd(t,'me'); input.value='';
  const r = chatRespond(t); setTimeout(()=>chatAdd(r,'ai'), 200);
});

// load/save
function loadSaved(){
  const p = localStorage.getItem('dcp.v2.prices'); if (p) { try{ priceList = JSON.parse(p);}catch{} }
  renderPriceEditor();
  const last = JSON.parse(localStorage.getItem('dcp.v2.last')||'null');
  if (last?.cfg && last?.plan) {
    el('budget').value = last.cfg.budget||'';
    el('people').value = last.cfg.people||'1';
    el('diet').value = last.cfg.diet||'omnivore';
    el('avoid').value = (last.cfg.avoid||[]).join(', ');
    el('pantry').value = (last.cfg.pantry||[]).join(', ');
    el('activity').value = last.cfg.activity||'low';
    renderDay(last.plan);
  }
  const w = JSON.parse(localStorage.getItem('dcp.v2.week')||'null');
  if (w?.week) renderWeek(w.week);
}
window.addEventListener('load', loadSaved);

// buttons
el('planBtn').addEventListener('click', planDay);
el('regenBtn').addEventListener('click', regenMenu);
el('saveBtn').addEventListener('click', saveDay);
el('resetBtn').addEventListener('click', resetAll);
el('planWeekBtn').addEventListener('click', planWeekUI);

// PWA install + SW
let deferredPrompt; const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt = e; installBtn.hidden=false; });
installBtn.addEventListener('click', async ()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; installBtn.hidden=true; });
if ('serviceWorker' in navigator) { window.addEventListener('load', ()=> navigator.serviceWorker.register('sw.js').catch(console.error)); }
