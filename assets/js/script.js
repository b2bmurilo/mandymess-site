
const App = (()=>{
  const $ = (s,c=document)=>c.querySelector(s);
  const $$ = (s,c=document)=>Array.from(c.querySelectorAll(s));
  const money = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);

  // CART (localStorage)
  const CART_KEY = 'mandymess.cart.v1';
  const getCart = ()=>JSON.parse(localStorage.getItem(CART_KEY)||'[]');
  const setCart = (items)=>localStorage.setItem(CART_KEY, JSON.stringify(items));
  const addToCart = (item)=>{
    const cart = getCart();
    const found = cart.find(i=>i.id===item.id && i.size===item.size);
    if(found){ found.qty += item.qty; } else { cart.push(item); }
    setCart(cart); updateCartCount();
  };
  const updateCartCount = ()=>{
    const cart = getCart();
    const count = cart.reduce((s,i)=>s+i.qty,0);
    $$('[data-cart-count]').forEach(e=>e.textContent = count);
  };

  // UI helpers
  const card = p => `<li class="card">
    <a class="card__media" href="produto.html?handle=${p.id}"><img src="${p.images[0]}" alt="${p.title}"></a>
    <div class="card__body">
      <h3 class="card__title">${p.title}</h3>
      <div class="price">${money(p.price)}</div>
      <a class="btn" href="produto.html?handle=${p.id}">Ver produto</a>
    </div>
  </li>`;

  // HOME
  function renderHome(sel){
    const el=$(sel); if(!el) return;
    el.innerHTML = PRODUCTS.slice(0,6).map(card).join('');
  }
  function renderCamisetasSlider(sel){
    const el=$(sel); if(!el) return;
    const cams = PRODUCTS.filter(p=>p.cat==='camiseta'); // 6 produtos
    el.innerHTML = cams.map(card).join('');
  }
  function renderSueters(sel){
    const el=$(sel); if(!el) return;
    const su = PRODUCTS.filter(p=>p.cat==='sueter'); // 2 produtos
    el.innerHTML = su.map(card).join('');
  }
  function initSlider(){
    const track = $('#camisetas-slider'); if(!track) return;
    $$('.slider__btn').forEach(btn=>btn.addEventListener('click',()=>{
      const delta = btn.dataset.slide==='left' ? -track.clientWidth*0.9 : track.clientWidth*0.9;
      track.scrollBy({left: delta, behavior: 'smooth'});
    }));
  }

  // CATALOGO
  function renderCamisetas(sel){
    const el=$(sel); if(!el) return;
    el.innerHTML = PRODUCTS.filter(p=>p.cat==='camiseta').map(card).join('');
  }
  function renderSuetersGrid(sel){
    const el=$(sel); if(!el) return;
    el.innerHTML = PRODUCTS.filter(p=>p.cat==='sueter').map(card).join('');
  }

  // PRODUCT PAGE
  function renderProductPage(){
    const params = new URLSearchParams(location.search);
    const handle = params.get('handle');
    const p = PRODUCTS.find(x=>x.id===handle) || PRODUCTS[0];
    if(!p) return;

    $('#product-title').textContent = p.title;
    $('#product-price').textContent = money(p.price);
    // gallery
    const mainImg = $('#product-image');
    mainImg.src = p.images[0];
    const thumbs = $('#thumbs');
    thumbs.innerHTML = p.images.map((src,i)=>`<img data-idx="${i}" class="${i===0?'active':''}" src="${src}" alt="thumb">`).join('');
    thumbs.addEventListener('click', (e)=>{
      const img = e.target.closest('img'); if(!img) return;
      const idx = +img.dataset.idx;
      mainImg.src = p.images[idx];
      $$('#thumbs img').forEach(t=>t.classList.remove('active'));
      img.classList.add('active');
    });
    $('.gallery__btn.prev').onclick = ()=>{
      const list = $$('#thumbs img');
      const active = list.findIndex(i=>i.classList.contains('active'));
      const next = (active-1+list.length)%list.length;
      list[next].click();
    };
    $('.gallery__btn.next').onclick = ()=>{
      const list = $$('#thumbs img');
      const active = list.findIndex(i=>i.classList.contains('active'));
      const next = (active+1)%list.length;
      list[next].click();
    };

    // sizes
    const sizes = ['P','M','G','GG','3G','4G'];
    const sizeList = $('#size-list');
    sizeList.innerHTML = sizes.map(s=>`<button class="size-btn" data-size="${s}">${s}</button>`).join('');
    let selectedSize = null;
    sizeList.addEventListener('click', (e)=>{
      const b = e.target.closest('.size-btn'); if(!b) return;
      selectedSize = b.dataset.size;
      $$('.size-btn', sizeList).forEach(x=>x.classList.toggle('active', x===b));
    });

    // desc
    $('#product-desc').innerHTML = `<p>${p.desc}</p>
      <ul>
        <li>Modelagem confortável</li>
        <li>Tecido premium</li>
        <li>Produção local</li>
      </ul>`;

    // add to cart
    $('#add-to-cart').onclick = ()=>{
      const qty = Math.max(1, +$('#qty').value||1);
      if(!selectedSize){ alert('Selecione um tamanho'); return; }
      addToCart({ id: p.id, title: p.title, price: p.price, image: p.images[0], size: selectedSize, qty });
      alert('Adicionado ao carrinho!');
    };

    // related
    const related = PRODUCTS.filter(x=>x.cat===p.cat && x.id!==p.id).slice(0,3);
    $('#related-grid').innerHTML = related.map(card).join('');
  }

  // CART PAGE
  function renderCartPage(){
    const box = $('#cart-items'); if(!box) return;
    const items = getCart();
    box.innerHTML = items.length ? items.map((i,idx)=>`
      <div class="cart-item">
        <img src="${i.image}" alt="${i.title}">
        <div class="title">
          <div><strong>${i.title}</strong></div>
          <div>Tamanho: ${i.size}</div>
          <div class="price">${money(i.price)}</div>
        </div>
        <input data-idx="${idx}" class="qty-input" type="number" min="1" value="${i.qty}">
        <button data-idx="${idx}" class="btn remove">Remover</button>
      </div>
    `).join('') : '<p>Seu carrinho está vazio.</p>';

    const update = ()=>{
      const items = getCart();
      $('#cart-subtotal').textContent = money(items.reduce((s,i)=>s+i.price*i.qty,0));
      updateCartCount();
    };
    update();

    box.addEventListener('change', (e)=>{
      const input = e.target.closest('.qty-input'); if(!input) return;
      const idx = +input.dataset.idx;
      const items = getCart();
      items[idx].qty = Math.max(1, +input.value||1);
      setCart(items); update();
    });
    box.addEventListener('click', (e)=>{
      const btn = e.target.closest('.remove'); if(!btn) return;
      const idx = +btn.dataset.idx;
      const items = getCart();
      items.splice(idx,1);
      setCart(items); renderCartPage();
    });

    $('#clear-cart').onclick = ()=>{ setCart([]); renderCartPage(); };
  }

  return {
    renderHome, renderCamisetasSlider, renderSueters,
    renderCamisetas, renderSueters: renderSuetersGrid,
    initSlider,
    renderProductPage,
    renderCartPage,
    updateCartCount
  };
})();
