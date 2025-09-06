
window.App = (function(){
  const $ = (s,c=document)=>c.querySelector(s);
  const $$ = (s,c=document)=>Array.from(c.querySelectorAll(s));
  const money = window.DB.money;

  // ---- CART (localStorage) ----
  const CART_KEY = "mandymess_cart";
  const getCart = ()=> JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  const setCart = (c)=> localStorage.setItem(CART_KEY, JSON.stringify(c));
  const addToCart = (item)=>{
    const cart = getCart();
    const idx = cart.findIndex(l => l.id===item.id && l.size===item.size);
    if(idx>=0){ cart[idx].qty += item.qty; } else { cart.push(item); }
    setCart(cart); renderCart(); syncCartBadge();
  };
  const clearCart = ()=>{ setCart([]); renderCart(); syncCartBadge(); };

  const cartDrawer = $(".cart");
  function openCart(){ cartDrawer.setAttribute("aria-hidden","false"); }
  function closeCart(){ cartDrawer.setAttribute("aria-hidden","true"); }
  function syncCartBadge(){
    const count = getCart().reduce((s,l)=>s+l.qty,0);
    $$("[data-cart-count]").forEach(e=> e.textContent = count);
  }

  function renderCart(){
    const wrap = $(".cart__items"); if(!wrap) return;
    const cart = getCart();
    wrap.innerHTML = cart.map(l=>`
      <div class="cart__line">
        <img src="${l.image}" alt="">
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;gap:12px">
            <strong>${l.title}</strong>
            <span>${money(l.price)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
            <span>Tam: ${l.size || '-'}</span>
            <div class="qty">
              <button data-line="-1" data-id="${l.id}" data-size="${l.size}">−</button>
              <input value="${l.qty}" readonly>
              <button data-line="+1" data-id="${l.id}" data-size="${l.size}">+</button>
            </div>
            <button class="btn" data-remove data-id="${l.id}" data-size="${l.size}">Remover</button>
          </div>
        </div>
      </div>
    `).join("") || "<p style='color:#9a9aa3'>Seu carrinho está vazio.</p>";

    const subtotal = cart.reduce((s,l)=> s + l.price*l.qty, 0);
    $$("[data-subtotal]").forEach(e=> e.textContent = money(subtotal));
  }

  document.addEventListener("click", (e)=>{
    const t = e.target;
    if(t.matches("[data-cart-open]")) openCart();
    if(t.matches("[data-cart-close]")) closeCart();
    if(t.matches("[data-cart-clear]")) clearCart();
    if(t.matches("[data-line]")){
      const id = t.getAttribute("data-id");
      const size = t.getAttribute("data-size");
      const delta = t.getAttribute("data-line")==="+1" ? 1 : -1;
      const cart = getCart();
      const i = cart.findIndex(l=> String(l.id)===String(id) && l.size===size);
      if(i>=0){
        cart[i].qty += delta;
        if(cart[i].qty<=0) cart.splice(i,1);
        setCart(cart); renderCart(); syncCartBadge();
      }
    }
    if(t.matches("[data-remove]")){
      const id = t.getAttribute("data-id");
      const size = t.getAttribute("data-size");
      const cart = getCart().filter(l=> !(String(l.id)===String(id) && l.size===size));
      setCart(cart); renderCart(); syncCartBadge();
    }
  });

  // ---- CARDS ----
  const card = p=>`
    <li class="card slider__item">
      <a class="card__media" href="produto.html?handle=${p.id}">
        <img src="${p.images[0]}" alt="${p.title}">
      </a>
      <div class="card__body">
        <h3 class="card__title">${p.title}</h3>
        <div class="price">${money(p.price)}</div>
        <button class="btn btn--primary" data-buy data-id="${p.id}">Comprar</button>
      </div>
    </li>
  `;

  const gridCard = p=>`
    <li class="card">
      <a class="card__media" href="produto.html?handle=${p.id}">
        <img src="${p.images[0]}" alt="${p.title}">
      </a>
      <div class="card__body">
        <h3 class="card__title">${p.title}</h3>
        <div class="price">${money(p.price)}</div>
        <button class="btn btn--primary" data-buy data-id="${p.id}">Comprar</button>
      </div>
    </li>
  `;

  document.addEventListener("click",(e)=>{
    const t=e.target.closest("[data-buy]");
    if(!t) return;
    const id = t.getAttribute("data-id");
    const p = DB.byId(id);
    addToCart({id:p.id,title:p.title,price:p.price,qty:1,image:p.images[0],size:null});
    openCart();
  });

  // ---- HOME / LISTAS ----
  function renderHome(sel){
    const el = document.querySelector(sel); if(!el) return;
    el.innerHTML = DB.products.slice(0,8).map(gridCard).join("");
  }
  function renderCamisetasSlider(sel){
    const el = document.querySelector(sel); if(!el) return;
    const camisetas = DB.filterByCategory("camisetas");
    el.innerHTML = camisetas.map(card).join("");
  }
  function renderCamisetas(sel){
    const el = document.querySelector(sel); if(!el) return;
    el.innerHTML = DB.filterByCategory("camisetas").map(gridCard).join("");
  }
  function renderSueters(sel){
    const el = document.querySelector(sel); if(!el) return;
    el.innerHTML = DB.filterByCategory("sueters").map(gridCard).join("");
  }

  // ---- SLIDER ----
  function initSlider(){
    const track = document.querySelector("#camisetas-slider");
    if(!track) return;
    document.querySelectorAll(".slider__btn").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const dx = btn.dataset.slide==="left" ? - (track.clientWidth * 0.9) : (track.clientWidth * 0.9);
        track.scrollBy({left: dx, behavior: "smooth"});
      });
    });
  }

  // ---- PDP ----
  function qsParam(name){
    const u = new URL(location.href);
    return u.searchParams.get(name);
  }
  function renderPDP(){
    const id = qsParam("handle");
    const p = DB.byId(id);
    if(!p){ document.querySelector("main").innerHTML = "<p style='padding:24px'>Produto não encontrado.</p>"; return; }

    const media = $("#pdp-media");
    let idx = 0;
    function show(i){
      idx = (i + p.images.length) % p.images.length;
      media.src = p.images[idx];
    }
    show(0);
    $("#pdp-prev").addEventListener("click", ()=> show(idx-1));
    $("#pdp-next").addEventListener("click", ()=> show(idx+1));

    $("#pdp-title").textContent = p.title;
    $("#pdp-price").textContent = money(p.price);
    $("#pdp-desc").textContent = p.description;

    const sizesWrap = $("#pdp-sizes");
    let selectedSize = null;
    p.sizes.forEach(s=>{
      const b = document.createElement("button");
      b.className = "size";
      b.setAttribute("role","radio");
      b.setAttribute("aria-checked","false");
      b.textContent = s;
      b.addEventListener("click",()=>{
        selectedSize = s;
        sizesWrap.querySelectorAll(".size").forEach(x=>x.setAttribute("aria-checked","false"));
        b.setAttribute("aria-checked","true");
      });
      sizesWrap.appendChild(b);
    });

    const qtyInput = $("#pdp-qty");
    document.querySelectorAll("[data-qty]").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const d = btn.getAttribute("data-qty")==="+1" ? 1 : -1;
        const v = Math.max(1, (parseInt(qtyInput.value||"1",10) + d));
        qtyInput.value = v;
      });
    });

    $("#pdp-add").addEventListener("click",()=>{
      if(!selectedSize){ alert("Selecione um tamanho."); return; }
      addToCart({id:p.id,title:p.title,price:p.price,qty:parseInt(qtyInput.value,10),image:p.images[0],size:selectedSize});
      openCart();
    });
    $("#pdp-buy").addEventListener("click",()=>{
      if(!selectedSize){ alert("Selecione um tamanho."); return; }
      addToCart({id:p.id,title:p.title,price:p.price,qty:parseInt(qtyInput.value,10),image:p.images[0],size:selectedSize});
      openCart();
    });

    // relacionados
    const related = DB.products.filter(x=> x.category===p.category && x.id!==p.id).slice(0,3);
    $("#related").innerHTML = related.map(gridCard).join("");
    renderCart();
  }

  // initial bindings for drawer
  document.addEventListener("DOMContentLoaded", ()=>{
    renderCart();
  });

  return {
    renderHome, renderCamisetasSlider, renderCamisetas, renderSueters,
    initSlider, renderPDP, syncCartBadge
  };
})();
