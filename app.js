
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const CONFIG = {
  whatsapp: '5581982206003',
  businessName: 'Pizzaria Três Corações',
  waHeader: 'Olá! Quero fazer um pedido:',
  hours: {0:{open:'15:00',close:'22:00'},1:{open:'15:00',close:'22:00'},2:{open:'15:00',close:'22:00'},3:{open:'15:00',close:'22:00'},4:{open:'15:00',close:'22:00'},5:{open:'15:00',close:'22:00'},6:{open:'15:00',close:'22:00'}}
};
const CATS = [{id:'tradicionais',name:'Pizzas tradicionais'},{id:'bebidas',name:'Bebidas'}];
let MENU = [];
const LS = { favs: 'trescoracoes_favs_v1', cart: 'trescoracoes_cart_v1', notes: 'trescoracoes_notes_v1' };
const els = {
  chips: document.getElementById('chips'), grid: document.getElementById('menuGrid'), empty: document.getElementById('emptyState'),
  searchTrigger: document.getElementById('toggleSearchBtn'), searchBar: document.getElementById('searchBar'), searchInput: document.getElementById('searchInput'), searchClose: document.getElementById('closeSearchBtn'),
  favTrigger: document.getElementById('toggleFavsBtn'), openCart: document.getElementById('openCartBtn'), closeCart: document.getElementById('closeCartBtn'), overlay: document.getElementById('overlay'), drawer: document.getElementById('drawer'),
  cartCount: document.getElementById('cartCount'), drawerSub: document.getElementById('drawerSub'), cartList: document.getElementById('cartList'), subtotal: document.getElementById('subtotal'), total: document.getElementById('total'),
  checkout: document.getElementById('checkoutBtn'), clearCart: document.getElementById('clearCartBtn'), obs: document.getElementById('obsInput'), openStatus: document.getElementById('openStatus'), year: document.getElementById('year')
};
const state = { cat: 'all', query: '', favs: new Set(JSON.parse(localStorage.getItem(LS.favs) || '[]')), cart: JSON.parse(localStorage.getItem(LS.cart) || '{}'), notes: JSON.parse(localStorage.getItem(LS.notes) || '{}') };

async function loadMenu(){
  try {
    const res = await fetch('/.netlify/functions/get-menu');
    if (!res.ok) throw new Error();
    const data = await res.json();
    MENU = Array.isArray(data.items) ? data.items : data;
  } catch (e) {
    const res = await fetch('data/menu.json');
    MENU = await res.json();
  }
}
function save(){
  localStorage.setItem(LS.favs, JSON.stringify([...state.favs]));
  localStorage.setItem(LS.cart, JSON.stringify(state.cart));
  localStorage.setItem(LS.notes, JSON.stringify(state.notes));
}
function priceLabel(item){
  if (item.sizes) return `A partir de ${BRL.format(item.sizes.P || item.sizes.M || item.sizes.G || Object.values(item.sizes)[0])}`;
  return BRL.format(item.price || 0);
}
function getUnitPrice(item,size){
  return item.sizes ? Number(item.sizes[size] || item.sizes.P || item.sizes.M || item.sizes.G || 0) : Number(item.price || 0);
}
function cartKey(id,size='unit') { return `${id}@@${size}`; }
function parseCartKey(key){ const [id,size='unit'] = key.split('@@'); return {id,size}; }
function buildChips(){
  els.chips.innerHTML='';
  [{id:'all',name:'Todos'},...CATS].forEach(c=>{
    const b=document.createElement('button'); b.className='chip'; b.textContent=c.name; b.dataset.id=c.id; b.setAttribute('aria-pressed', String(c.id===state.cat)); b.onclick=()=>filterCat(c.id); els.chips.appendChild(b);
  });
}
function filterCat(id){ state.cat=id; [...els.chips.children].forEach(c=>c.setAttribute('aria-pressed', String(c.dataset.id===id))); if(id!=='favs') els.favTrigger.classList.remove('active'); render(); }
function toggleFav(id){ state.favs.has(id)?state.favs.delete(id):state.favs.add(id); save(); }
function toggleSearch(show){
  if(show){ els.searchTrigger.style.display='none'; els.chips.classList.add('hidden'); els.searchBar.classList.add('visible'); els.searchInput.focus(); }
  else { els.searchBar.classList.remove('visible'); els.chips.classList.remove('hidden'); els.searchTrigger.style.display='flex'; els.searchInput.value=''; state.query=''; render(); }
}
function toggleFavsMode(){ if(state.cat==='favs'){ filterCat('all'); } else { state.cat='favs'; [...els.chips.children].forEach(c=>c.setAttribute('aria-pressed','false')); els.favTrigger.classList.add('active'); render(); }}
function getFiltered(){
  const q=state.query.toLowerCase().trim();
  return MENU.filter(i=>{
    if(!i.active) return false;
    if(state.cat==='favs' && !state.favs.has(i.id)) return false;
    if(state.cat!=='all' && state.cat!=='favs' && i.cat!==state.cat) return false;
    if(q){ const hay=`${i.name} ${i.desc}`.toLowerCase(); if(!hay.includes(q)) return false; }
    return true;
  });
}
function render(){
  const items=getFiltered(); els.grid.innerHTML='';
  if(!items.length){ els.empty.hidden=false; return; } els.empty.hidden=true;
  const groups={}; items.forEach(i=>(groups[i.cat]??=[]).push(i));
  const order=(state.query||state.cat==='favs')?Object.keys(groups):CATS.map(c=>c.id);
  order.forEach(catId=>{ if(!groups[catId]) return; const title=document.createElement('h3'); title.className='sectionTitle'; title.textContent=CATS.find(c=>c.id===catId)?.name||'Itens'; els.grid.appendChild(title);
    groups[catId].forEach(item=>{
      const isFav=state.favs.has(item.id); const hasSizes=!!item.sizes; const defaultSize=hasSizes?'P':'unit';
      const SIZE_META = { P: '8 fatias', M: '12 fatias', G: '16 fatias' };
      const sizeOptions = hasSizes ? ['P','M','G'].map(s=>`<button class="size-option ${s==='P'?'is-selected':''}" data-size="${s}">${s} · ${SIZE_META[s]} <span>${BRL.format(item.sizes[s])}</span></button>`).join('') : `<div class="single-price-tag">${BRL.format(item.price)}</div>`;
      const el=document.createElement('article'); el.className='card';
      el.innerHTML=`<div class="card__media"><img class="card__img" src="${item.img}" alt="${item.name}" loading="lazy" onerror="this.src='assets/img/hero-ohana.png'"><button class="card__fav" aria-label="Favoritar">${isFav?'❤️':'♡'}</button></div><div class="card__body"><div class="card__title">${item.name}</div><div class="card__desc">${item.desc}</div><div class="price price--from">${priceLabel(item)}</div><div class="size-selector">${sizeOptions}</div><div class="card__footer"><button class="btn--add">Adicionar</button></div></div>`;
      el.querySelector('.card__fav').onclick=(e)=>{e.stopPropagation(); toggleFav(item.id); render();};
      el.querySelectorAll('.size-option').forEach(btn=>btn.onclick=()=>{ el.querySelectorAll('.size-option').forEach(x=>x.classList.remove('is-selected')); btn.classList.add('is-selected'); });
      el.querySelector('.btn--add').onclick=()=>{ const size=(el.querySelector('.size-option.is-selected')?.dataset.size)||defaultSize; addToCart(item.id,size); };
      els.grid.appendChild(el);
    });
  });
}
function addToCart(id,size='unit'){ const key=cartKey(id,size); state.cart[key]=(state.cart[key]||0)+1; save(); updateCartUI(); openDrawer(); }
function removeOne(key){ if(state.cart[key]>0) state.cart[key]--; if(state.cart[key]===0){ delete state.cart[key]; delete state.notes[key]; } save(); updateCartUI(); }
function removeAll(key){ delete state.cart[key]; delete state.notes[key]; save(); updateCartUI(); }
function updateCartUI(){
  const entries=Object.entries(state.cart).map(([key,qty])=>{ const {id,size}=parseCartKey(key); const item=MENU.find(x=>x.id===id); return item?{key,item,size,qty,unit:getUnitPrice(item,size)}:null; }).filter(Boolean);
  const totalQty=entries.reduce((a,b)=>a+b.qty,0), totalVal=entries.reduce((a,b)=>a+b.unit*b.qty,0);
  els.cartCount.textContent=totalQty; els.cartCount.style.display=totalQty>0?'flex':'none'; els.drawerSub.textContent=`${totalQty} item(ns)`; els.subtotal.textContent=BRL.format(totalVal); els.total.textContent=BRL.format(totalVal);
  els.cartList.innerHTML='';
  entries.forEach(({key,item,size,qty,unit})=>{
    const note=state.notes[key]||''; const slices=size==='P'?'8 fatias':size==='M'?'12 fatias':size==='G'?'16 fatias':''; const label=size==='unit'?'':` • ${size}${slices?` (${slices})`:''}`;
    const div=document.createElement('div'); div.className='cart-item';
    div.innerHTML=`<div class="cart-item__info"><div class="cart-item__name">${item.name}${label}</div><div class="cart-item__price">${BRL.format(unit)}</div><input type="text" class="cart-item__note" placeholder="Alguma observação neste item?" value="${note}"><div class="cart-controls"><button class="cart-btn minus">-</button><span class="cart-qty">${qty}</span><button class="cart-btn plus">+</button></div></div><button class="cart-remove">remover</button>`;
    div.querySelector('.minus').onclick=()=>removeOne(key); div.querySelector('.plus').onclick=()=>addToCart(item.id,size); div.querySelector('.cart-remove').onclick=()=>removeAll(key); div.querySelector('.cart-item__note').oninput=(e)=>{state.notes[key]=e.target.value; save();};
    els.cartList.appendChild(div);
  });
}
function getOpenState(){ const now=new Date(); const day=now.getDay(); const mins=now.getHours()*60+now.getMinutes(); const today=CONFIG.hours[day]; if(!today) return {open:false,text:'🔴 Pedidos somente no horário de funcionamento'}; const [oh,om]=today.open.split(':').map(Number); const [ch,cm]=today.close.split(':').map(Number); const start=oh*60+om,end=ch*60+cm; if(mins>=start&&mins<end) return {open:true,text:`🟢 Aberto agora • Fecha às ${today.close}`}; if(mins<start) return {open:false,text:`🔴 Pedidos somente no horário de funcionamento • Abre às ${today.open}`}; return {open:false,text:'🔴 Pedidos somente no horário de funcionamento'}; }
function checkOpenStatus(){ els.openStatus.textContent=getOpenState().text; }
function sendWA(){ const openState=getOpenState(); if(!openState.open) return alert('Pedidos só no horário de funcionamento: 15:00 às 22:00.'); const entries=Object.entries(state.cart).map(([key,q])=>{ const {id,size}=parseCartKey(key); const i=MENU.find(x=>x.id===id); return i?{key,i,q,size,unit:getUnitPrice(i,size)}:null; }).filter(Boolean); if(!entries.length) return alert('Sua sacola está vazia.'); let text=`*${CONFIG.businessName}*\n${CONFIG.waHeader}\n\n`; let total=0; entries.forEach(({key,i,q,size,unit})=>{ const sub=unit*q; total+=sub; const slices=size==='P'?'8 fatias':size==='M'?'12 fatias':size==='G'?'16 fatias':''; text+=`▪ ${q}x ${i.name}${size==='unit'?'':` (${size}${slices?` - ${slices}`:''})`}\n   ${BRL.format(sub)}`; if(state.notes[key]?.trim()) text+=`\n   _(Obs: ${state.notes[key]})_`; text+='\n'; }); if(els.obs.value.trim()) text+=`\n📝 *Obs Geral:* ${els.obs.value.trim()}\n`; text+=`\n*TOTAL: ${BRL.format(total)}*`; window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`,'_blank'); }
function openDrawer(){ els.drawer.classList.add('is-open'); els.overlay.hidden=false; }
function closeDrawer(){ els.drawer.classList.remove('is-open'); setTimeout(()=>els.overlay.hidden=true,300); }
async function init(){ if(els.year) els.year.textContent=new Date().getFullYear(); await loadMenu(); buildChips(); render(); updateCartUI(); checkOpenStatus(); setInterval(checkOpenStatus,60000); els.openCart.onclick=openDrawer; els.closeCart.onclick=closeDrawer; els.overlay.onclick=closeDrawer; els.checkout.onclick=sendWA; els.clearCart.onclick=()=>{ if(confirm('Esvaziar sacola?')){ state.cart={}; state.notes={}; save(); updateCartUI(); } }; els.searchTrigger.onclick=()=>toggleSearch(true); els.searchClose.onclick=()=>toggleSearch(false); els.favTrigger.onclick=toggleFavsMode; els.searchInput.oninput=(e)=>{ state.query=e.target.value; render();}; }
init();
