
(function(){
  const $ = (sel,ctx=document)=>ctx.querySelector(sel);
  const $$ = (sel,ctx=document)=>Array.from(ctx.querySelectorAll(sel));
  const money = window.DB.money;
  const P = window.DB.products;

  // CART (LocalStorage)
  const KEY='mm_cart_static';
  const Cart = {
    items:[],
    load(){ try{ this.items=JSON.parse(localStorage.getItem(KEY))||[] }catch{ this.items=[] } },
    save(){ localStorage.setItem(KEY, JSON.stringify(this.items)) },
    count(){ return this.items.reduce((a,i)=>a+i.qty,0) },
    add(line){
      const i=this.items.findIndex(x=>x.id===line.id);
      if(i>=0){ this.items[i].qty += line.qty||1; }
      else { this.items.push({...line, qty: line.qty||1}); }
      this.save(); renderCart(); openCart();
    },
    update(id, qty){
      const i=this.items.findIndex(x=>x.id===id);
      if(i<0)return;
      this.items[i].qty=qty;
      if(qty<=0)this.items.splice(i,1);
      this.save(); renderCart();
    },
    clear(){ this.items=[]; this.save(); renderCart(); }
  };

  function openCart(){ document.body.classList.add('is-open'); }
  function closeCart(){ document.body.classList.remove('is-open'); }

  function bindCart(){
    $$('[data-cart-open]').forEach(b=>b.addEventListener('click', e=>{e.preventDefault();openCart()}));
    $$('[data-cart-close]').forEach(b=>b.addEventListener('click', e=>{e.preventDefault();closeCart()}));
    $('[data-cart-clear]')?.addEventListener('click', ()=>Cart.clear());
    $('.cart__items')?.addEventListener('click', (e)=>{
      const inc = e.target.closest('[data-inc]')?.getAttribute('data-inc');
      const dec = e.target.closest('[data-dec]')?.getAttribute('data-dec');
      if(inc){ const it=Cart.items.find(x=>String(x.id)===inc); Cart.update(it.id, (it?.qty||1)+1); }
      if(dec){ const it=Cart.items.find(x=>String(x.id)===dec); Cart.update(it.id, (it?.qty||1)-1); }
    });
  }

  function renderCart(){
    const count=$('[data-cart-count]'); if(count) count.textContent = Cart.count();
    const list=$('.cart__items'); const sub=$('[data-subtotal]');
    if(!list)return;
    list.innerHTML='';
    let total=0;
    Cart.items.forEach(it=>{
      const line = it.price * it.qty; total += line;
      const el=document.createElement('div');
      el.className='line';
      el.innerHTML=`
        <div class="thumb"><img src="${it.image}" alt=""></div>
        <div>
          <div class="line__title">${it.title}</div>
          <div class="qty">
            <button class="btn" data-dec="${it.id}">−</button>
            <span>${it.qty}</span>
            <button class="btn" data-inc="${it.id}">+</button>
          </div>
        </div>
        <div class="price">${money(line)}</div>
      `;
      list.appendChild(el);
    });
    if(sub) sub.textContent = money(total);
  }

  // RENDER HELPERS
  function cardHTML(p){
    return `<li class="card">
      <a class="card__media" href="produto.html?handle=${p.handle}">
        <img src="${p.images[0]}" alt="${p.title}">
      </a>
      <div class="card__body">
        <h3 class="card__title"><a href="produto.html?handle=${p.handle}">${p.title}</a></h3>
        <div class="price">${p.priceText}</div>
        <button class="btn btn--primary" data-buy='${JSON.stringify({id:p.id,title:p.title,price:p.price,image:p.images[0]})}'>Comprar</button>
      </div>
    </li>`;
  }

  function bindBuyButtons(ctx=document){
    ctx.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-buy]'); if(!btn) return;
      const data = JSON.parse(btn.getAttribute('data-buy'));
      Cart.add({...data, qty:1});
    });
  }

  // PAGES
  function renderHome(sel){
    const el=$(sel); if(!el) return;
    el.innerHTML = P.slice(0,12).map(cardHTML).join('');
  }

  function renderCatalog(sel, term=''){
    const el=$(sel); if(!el) return;
    const list = P.filter(p => p.title.toLowerCase().includes(term.toLowerCase()));
    el.innerHTML = list.map(cardHTML).join('');
  }

  function renderProduct(rootSel){
    const root=$(rootSel); if(!root) return;
    const handle = new URLSearchParams(location.search).get('handle') || 'produto-1';
    const p = P.find(x=>x.handle===handle) || P[0];
    const media = root.querySelector('.product__media');
    const info = root.querySelector('.product__info');
    media.innerHTML = `<div class="gallery">
      ${p.images.slice(0,4).map(u=>`<img src="${u}" alt="${p.title}">`).join('')}
    </div>`;
    info.innerHTML = `
      <h1 class="product__title">${p.title}</h1>
      <div class="product__price">${p.priceText}</div>
      <div style="margin:12px 0">
        <button class="btn btn--primary" id="buyNow">Adicionar ao carrinho</button>
      </div>
      <div class="rte"><p>Descrição genérica do produto para visualização.</p></div>
    `;
    $('#buyNow').addEventListener('click', ()=>{
      Cart.add({id:p.id,title:p.title,price:p.price,image:p.images[0],qty:1});
    });
  }

  // BOOT
  document.addEventListener('DOMContentLoaded', ()=>{
    Cart.load(); renderCart(); bindCart(); bindBuyButtons(document);
  });

  window.App = { renderHome, renderCatalog, renderProduct };
})();
