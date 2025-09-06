
// Minimal glue to use theme assets + Storefront API + cart drawer
const API_URL = "https://mandymess.com/api/2024-07/graphql.json";
const API_TOKEN = "574d1f25f2c097049762872eeb8eebf0";

async function gql(query, variables={}){
  const r = await fetch(API_URL, {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "X-Shopify-Storefront-Access-Token": API_TOKEN
    },
    body: JSON.stringify({query, variables})
  });
  const j = await r.json();
  if(j.errors){ console.error(j.errors); throw new Error("GraphQL error"); }
  return j.data;
}

const money = (n)=> new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(+n);

const CART_KEY="mm_cart_from_theme_v1";
const Cart = {
  items:[],
  load(){ try{ this.items = JSON.parse(localStorage.getItem(CART_KEY))||[] }catch{ this.items=[] } },
  save(){ localStorage.setItem(CART_KEY, JSON.stringify(this.items)) },
  count(){ return this.items.reduce((a,i)=>a+i.quantity,0) },
  add(line){
    const i = this.items.findIndex(x=>x.variantId===line.variantId);
    if(i>=0) this.items[i].quantity += line.quantity||1;
    else this.items.push({...line, quantity: line.quantity||1});
    this.save(); renderCart();
  },
  update(variantId, qty){
    const i = this.items.findIndex(x=>x.variantId===variantId);
    if(i<0) return;
    this.items[i].quantity = qty;
    if(qty<=0) this.items.splice(i,1);
    this.save(); renderCart();
  },
  clear(){ this.items=[]; this.save(); renderCart(); }
};

function openCart(){ document.documentElement.classList.add("cart-open"); }
function closeCart(){ document.documentElement.classList.remove("cart-open"); }
function bindDrawer(){
  document.querySelectorAll("[data-open-cart]").forEach(b=>b.addEventListener("click", e=>{e.preventDefault();openCart()}));
  document.querySelectorAll("[data-close-cart]").forEach(b=>b.addEventListener("click", e=>{e.preventDefault();closeCart()}));
}

function renderCart(){
  const count = document.querySelector("[data-cart-count]");
  if(count) count.textContent = Cart.count();
  const wrap = document.querySelector(".cart-drawer__items");
  const sub = document.querySelector("[data-subtotal]");
  if(!wrap) return;
  wrap.innerHTML = "";
  let subtotal = 0;
  Cart.items.forEach(i=>{
    const price = +i.price.amount;
    const total = price * i.quantity;
    subtotal += total;
    const el = document.createElement("div");
    el.className = "cart-drawer__item";
    el.innerHTML = `
      <div class="cart-drawer__thumb">${i.imageUrl?`<img src="${i.imageUrl}" alt="">`:``}</div>
      <div class="cart-drawer__meta">
        <div class="cart-drawer__title">${i.title}</div>
        <div class="cart-drawer__variant">${i.variantTitle||""}</div>
        <div class="cart-drawer__price">${money(price)}</div>
        <div class="cart-drawer__qty">
          <button class="button button--ghost" data-dec="${i.variantId}">−</button>
          <span class="qty-val">${i.quantity}</span>
          <button class="button button--ghost" data-inc="${i.variantId}">+</button>
        </div>
      </div>
      <div class="cart-drawer__line">${money(total)}</div>`;
    wrap.appendChild(el);
  });
  if(sub) sub.textContent = money(subtotal);
}

async function goCheckout(){
  if(Cart.items.length===0) return;
  const lineItems = Cart.items.map(i=>({variantId:i.variantId, quantity:i.quantity}));
  const MUT = `mutation checkoutCreate($input: CheckoutCreateInput!){
    checkoutCreate(input:$input){ checkout{ webUrl } userErrors{ message } }
  }`;
  const d = await gql(MUT, { input: { lineItems } });
  const url = d.checkoutCreate?.checkout?.webUrl;
  if(url) location.href = url;
}

function bindCartControls(){
  document.querySelector("[data-checkout]")?.addEventListener("click", goCheckout);
  document.querySelector("[data-clear]")?.addEventListener("click", ()=>Cart.clear());
  document.querySelector(".cart-drawer__items")?.addEventListener("click", (e)=>{
    const inc = e.target.getAttribute("data-inc");
    const dec = e.target.getAttribute("data-dec");
    if(inc){ const it = Cart.items.find(x=>x.variantId===inc); Cart.update(inc,(it?.quantity||1)+1); }
    if(dec){ const it = Cart.items.find(x=>x.variantId===dec); Cart.update(dec,(it?.quantity||1)-1); }
  });
}

// Catalog + home
async function renderCatalog(sel, first=24){
  const el = document.querySelector(sel); if(!el) return;
  const Q = `query($n:Int!){
    products(first:$n){
      edges{ node{
        id title handle featuredImage{ url }
        variants(first:10){ edges{ node{ id title price{ amount currencyCode } image{ url } } } }
      } }
    }
  }`;
  const d = await gql(Q,{n:first});
  el.innerHTML = "";
  d.products.edges.map(e=>e.node).forEach(p=>{
    const v = p.variants.edges[0]?.node;
    const img = v?.image?.url || p.featuredImage?.url || "";
    const li = document.createElement("li");
    li.className = "product-card";
    li.innerHTML = `
      <a class="product-card__image-wrap" href="produto.html?handle=${p.handle}">
        ${img?`<img class="product-card__image" src="${img}" alt="${p.title}">`:``}
      </a>
      <div class="product-card__body">
        <h3 class="product-card__title"><a href="produto.html?handle=${p.handle}">${p.title}</a></h3>
        <div class="product-card__price">${v?money(v.price.amount):""}</div>
        <div class="product-card__cta">
          ${v?`<button class="button button--primary" data-buy='${JSON.stringify({variantId:v.id,title:p.title,variantTitle:v.title,price:v.price,imageUrl:img})}'>Comprar</button>`:""}
        </div>
      </div>`;
    el.appendChild(li);
  });
  el.addEventListener("click",(e)=>{
    const btn = e.target.closest("[data-buy]"); if(!btn) return;
    const payload = JSON.parse(btn.getAttribute("data-buy"));
    Cart.add(payload);
    document.documentElement.classList.add("cart-open");
    renderCart();
  });
}

// PDP
async function renderProduct(rootSel){
  const root = document.querySelector(rootSel); if(!root) return;
  const handle = new URLSearchParams(location.search).get("handle");
  if(!handle){ root.innerHTML="<p>Produto não informado.</p>"; return; }
  const Q = `query($h:String!){
    product(handle:$h){
      id title descriptionHtml
      images(first:10){ edges{ node{ url } } }
      variants(first:20){ edges{ node{ id title availableForSale price{ amount currencyCode } image{ url } } } }
    }
  }`;
  const d = await gql(Q,{h:handle});
  const p = d.product; if(!p){ root.innerHTML="<p>Produto não encontrado.</p>"; return; }

  const media = root.querySelector(".product__media");
  const info  = root.querySelector(".product__info");
  const imgs = p.images.edges.map(e=>e.node.url);

  if(media){
    media.innerHTML = `
      <div class="product__main-media">
        ${imgs[0]?`<img id="mainImg" class="product__image" src="${imgs[0]}" alt="${p.title}">`:""}
      </div>
      <div class="product__thumbnails">
        ${imgs.slice(0,6).map(u=>`<button class="product__thumb" data-swap="${u}"><img src="${u}" alt=""></button>`).join("")}
      </div>`;
  }

  if(info){
    info.innerHTML = `
      <h1 class="product__title">${p.title}</h1>
      <div class="product__variants">
        ${p.variants.edges.map(v=>`<button class="button variant" data-var='${JSON.stringify(v.node)}'>${v.node.title} — ${money(v.node.price.amount)}</button>`).join("")}
      </div>
      <div class="product__actions">
        <button class="button button--primary button--lg" id="buyNow">Adicionar ao carrinho</button>
      </div>
      <div class="product__description rte">${p.descriptionHtml||""}</div>`;
  }

  let currentVariant = p.variants.edges[0]?.node || null;
  root.addEventListener("click",(e)=>{
    const t = e.target.closest("[data-swap],[data-var]");
    if(!t) return;
    if(t.hasAttribute("data-swap")){
      document.getElementById("mainImg").src = t.getAttribute("data-swap");
    }else if(t.hasAttribute("data-var")){
      currentVariant = JSON.parse(t.getAttribute("data-var"));
      root.querySelectorAll("[data-var]").forEach(b=>b.classList.remove("is-selected"));
      t.classList.add("is-selected");
    }
  });

  document.getElementById("buyNow")?.addEventListener("click", ()=>{
    if(!currentVariant) return;
    Cart.add({
      variantId: currentVariant.id,
      title: p.title,
      variantTitle: currentVariant.title,
      price: currentVariant.price,
      imageUrl: currentVariant.image?.url || imgs[0] || "",
      quantity: 1
    });
    document.documentElement.classList.add("cart-open");
    renderCart();
  });
}

// Minimal styles needed for cart drawer if theme CSS doesn't have it
const inject = document.createElement("style");
inject.textContent = `
.cart-drawer{position:fixed;inset:0;pointer-events:none}
.cart-open .cart-drawer{pointer-events:auto}
.cart-drawer__overlay{position:absolute;inset:0;background:rgba(0,0,0,.55);opacity:0;transition:.2s}
.cart-open .cart-drawer__overlay{opacity:1}
.cart-drawer__panel{position:absolute;top:0;right:-420px;width:420px;max-width:100%;height:100%;background:#0b0b0d;border-left:1px solid #222;display:flex;flex-direction:column;transition:right .25s}
.cart-open .cart-drawer__panel{right:0}
.cart-drawer__header{display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid #222;color:#fff}
.cart-drawer__items{padding:16px;flex:1;overflow:auto;display:flex;flex-direction:column;gap:12px}
.cart-drawer__item{display:grid;grid-template-columns:80px 1fr auto;gap:12px;align-items:center;border-bottom:1px dashed #222;padding-bottom:12px;color:#eee}
.cart-drawer__thumb img{width:80px;height:80px;object-fit:cover;border-radius:10px;background:#0a0a0b;border:1px solid #222}
.cart-drawer__footer{padding:16px;border-top:1px solid #222}
.button{display:inline-flex;align-items:center;justify-content:center;padding:10px 16px;border-radius:10px;border:1px solid #222;background:#151515;color:#fff;cursor:pointer}
.button--primary{background:linear-gradient(180deg,#e50914,#ff3b3b);border-color:transparent}
`;
document.head.appendChild(inject);

// Boot
document.addEventListener("DOMContentLoaded", async ()=>{
  Cart.load(); renderCart(); bindDrawer(); bindCartControls();
  if(document.getElementById("home-grid")) await renderCatalog("#home-grid", 12);
  if(document.getElementById("catalog-grid")) await renderCatalog("#catalog-grid", 48);
  if(document.getElementById("product-root")) await renderProduct("#product-root");
});
