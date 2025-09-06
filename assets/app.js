
// ===== Shopify Storefront API
const API_URL = "https://mandymess.com/api/2024-07/graphql.json";
const API_TOKEN = "574d1f25f2c097049762872eeb8eebf0";

async function gql(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": API_TOKEN
    },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors) {
    console.error(json.errors);
    throw new Error("GraphQL error");
  }
  return json.data;
}

// ===== Cart (localStorage) =====
const CART_KEY = "mm_cart_v3";
const Cart = {
  items: [],
  load(){ try { this.items = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { this.items = []; } },
  save(){ localStorage.setItem(CART_KEY, JSON.stringify(this.items)); },
  count(){ return this.items.reduce((a,i)=>a+i.quantity,0); },
  add(line){
    const idx = this.items.findIndex(x=>x.variantId===line.variantId);
    if(idx>=0) this.items[idx].quantity += line.quantity || 1;
    else this.items.push({ ...line, quantity: line.quantity || 1 });
    this.save(); renderCart();
  },
  update(variantId, qty){
    const idx = this.items.findIndex(x=>x.variantId===variantId);
    if(idx<0) return;
    this.items[idx].quantity = qty;
    if(this.items[idx].quantity<=0) this.items.splice(idx,1);
    this.save(); renderCart();
  },
  clear(){ this.items = []; this.save(); renderCart(); }
};

// ===== UI: Cart Drawer =====
function openCart(){ document.documentElement.classList.add("cart-open"); document.querySelector(".cart-drawer")?.classList.add("is-open"); renderCart(); }
function closeCart(){ document.documentElement.classList.remove("cart-open"); document.querySelector(".cart-drawer")?.classList.remove("is-open"); }
function money(n){ return "R$ " + Number(n).toFixed(2).replace(".", ","); }

function renderCart(){
  const counter = document.querySelector("[data-cart-count]");
  if(counter) counter.textContent = Cart.count();

  const list = document.querySelector(".cart-drawer__items");
  const sub = document.querySelector("[data-subtotal]");
  if(!list) return;
  list.innerHTML = "";
  let subtotal = 0;

  Cart.items.forEach(item=>{
    const priceNum = parseFloat(item.price.amount);
    const lineTotal = priceNum * item.quantity;
    subtotal += lineTotal;
    const el = document.createElement("div");
    el.className = "cart-drawer__item";
    el.innerHTML = `
      <div class="cart-drawer__thumb">${ item.imageUrl ? `<img src="${item.imageUrl}" alt="">` : "" }</div>
      <div class="cart-drawer__meta">
        <div class="cart-drawer__title">${item.title}</div>
        <div class="cart-drawer__variant">${item.variantTitle || ""}</div>
        <div class="cart-drawer__price">${money(priceNum)}</div>
        <div class="cart-drawer__qty">
          <button class="button button--secondary" data-dec="${item.variantId}">−</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="button button--secondary" data-inc="${item.variantId}">+</button>
        </div>
      </div>
      <div class="cart-drawer__line">${money(lineTotal)}</div>
    `;
    list.appendChild(el);
  });
  if(sub) sub.textContent = money(subtotal);
}

// Checkout
async function goCheckout(){
  if(Cart.items.length===0) return;
  const lineItems = Cart.items.map(i => ({ variantId: i.variantId, quantity: i.quantity }));
  const MUT = `mutation checkoutCreate($input: CheckoutCreateInput!){
    checkoutCreate(input:$input){
      checkout{ webUrl }
      userErrors{ message }
    }
  }`;
  try{
    const data = await gql(MUT, { input: { lineItems } });
    const url = data.checkoutCreate?.checkout?.webUrl;
    if(url) window.location.href = url;
    else alert("Não foi possível criar o checkout agora.");
  }catch(e){
    alert("Erro ao criar checkout.");
  }
}

// ===== Catalog rendering =====
async function renderCatalog(sel, first=24){
  const root = document.querySelector(sel);
  if(!root) return;
  const Q = `query($n:Int!){
    products(first:$n){
      edges{ node{
        id title handle description
        featuredImage{ url }
        variants(first:10){ edges{ node{
          id title price{ amount currencyCode } image{ url }
        } } }
      } }
    }
  }`;
  const data = await gql(Q,{ n: first });
  const products = data.products.edges.map(e=>e.node);
  root.innerHTML = "";
  products.forEach(p=>{
    const v = p.variants.edges[0]?.node;
    const img = v?.image?.url || p.featuredImage?.url || "";
    const price = v?.price || { amount: "0.00", currencyCode: "BRL" };
    const li = document.createElement("li");
    li.className = "product-grid__item";
    li.innerHTML = `
      <div class="product-card">
        <a class="product-card__image-wrapper" href="produto.html?handle=${p.handle}">
          ${ img ? `<img class="product-card__image" src="${img}" alt="${p.title}">` : "" }
        </a>
        <div class="product-card__content">
          <h3 class="product-card__title"><a href="produto.html?handle=${p.handle}">${p.title}</a></h3>
          <div class="product-card__price">${money(parseFloat(price.amount))}</div>
          <div class="product-card__actions">
            ${ v?.id ? `<button class="button button--primary" data-buy='${JSON.stringify({ variantId:v.id, title:p.title, variantTitle:v.title, price, imageUrl:img })}'>Adicionar</button>` : "" }
            <a class="button" href="produto.html?handle=${p.handle}">Ver detalhes</a>
          </div>
        </div>
      </div>`;
    root.appendChild(li);
  });

  root.addEventListener("click",(e)=>{
    const btn = e.target.closest("[data-buy]");
    if(btn){
      const payload = JSON.parse(btn.getAttribute("data-buy"));
      Cart.add(payload);
      openCart();
    }
  });
}

// ===== Product page =====
async function renderProduct(sel){
  const root = document.querySelector(sel);
  if(!root) return;
  const handle = new URLSearchParams(location.search).get("handle");
  if(!handle){ root.innerHTML = "<p>Produto não informado.</p>"; return; }
  const Q = `query($handle:String!){
    product(handle:$handle){
      id title descriptionHtml
      featuredImage{ url }
      images(first:10){ edges{ node{ url } } }
      variants(first:20){ edges{ node{
        id title availableForSale price{ amount currencyCode } image{ url }
      } } }
    }
  }`;
  const data = await gql(Q, { handle });
  const p = data.product;
  if(!p){ root.innerHTML = "<p>Produto não encontrado.</p>"; return; }

  const imgs = p.images.edges.map(e=>e.node.url);
  const v0 = p.variants.edges[0]?.node;

  const media = root.querySelector(".product__media");
  const info = root.querySelector(".product__info");

  if(media){
    media.innerHTML = `
      <div class="product__main-media">
        ${ imgs[0] ? `<img id="mainImg" class="product__image" src="${imgs[0]}" alt="${p.title}">` : "" }
      </div>
      <div class="product__thumbnails">
        ${ imgs.slice(0,6).map(u=>`<button class="product__thumb" data-swap="${u}"><img src="${u}" alt=""></button>`).join("") }
      </div>
    `;
  }
  if(info){
    info.innerHTML = `
      <h1 class="product__title">${p.title}</h1>
      <div class="product__variants">
        ${ p.variants.edges.map(v=>`
          <button class="button variant" data-var='${JSON.stringify(v.node)}'>
            ${v.node.title} — ${money(parseFloat(v.node.price.amount))}
          </button>
        `).join("") }
      </div>
      <div class="product__actions">
        ${ v0 ? `<button class="button button--primary" id="buyNow">Adicionar ao carrinho</button>` : "" }
        <a class="button" href="catalogo.html">Voltar</a>
      </div>
      <div class="product__description rte">${p.descriptionHtml || ""}</div>
    `;
  }

  let currentVariant = v0;
  const mainImg = document.getElementById("mainImg");
  root.addEventListener("click",(e)=>{
    const t = e.target.closest("[data-swap],[data-var]");
    if(!t) return;
    if(t.hasAttribute("data-swap")){
      if(mainImg) mainImg.src = t.getAttribute("data-swap");
    } else if(t.hasAttribute("data-var")){
      currentVariant = JSON.parse(t.getAttribute("data-var"));
      root.querySelectorAll("[data-var]").forEach(b=>b.classList.remove("is-selected"));
      t.classList.add("is-selected");
    }
  });
  const buy = document.getElementById("buyNow");
  if(buy){
    buy.addEventListener("click", ()=>{
      if(!currentVariant) return;
      Cart.add({
        variantId: currentVariant.id,
        title: p.title,
        variantTitle: currentVariant.title,
        price: currentVariant.price,
        imageUrl: currentVariant.image?.url || imgs[0] || "",
        quantity: 1
      });
      openCart();
    });
  }
}

// ===== Boot & Events =====
function bootCartDOM(){
  document.querySelectorAll("[data-open-cart]")?.forEach(b=>b.addEventListener("click", openCart));
  document.querySelectorAll("[data-close-cart]")?.forEach(b=>b.addEventListener("click", closeCart));
  document.querySelector("[data-checkout]")?.addEventListener("click", goCheckout);
  document.querySelector("[data-clear]")?.addEventListener("click", ()=>Cart.clear());
  document.querySelector(".cart-drawer__items")?.addEventListener("click",(e)=>{
    const inc = e.target.getAttribute("data-inc");
    const dec = e.target.getAttribute("data-dec");
    if(inc) Cart.update(inc, (Cart.items.find(x=>x.variantId===inc)?.quantity||1)+1);
    if(dec) Cart.update(dec, (Cart.items.find(x=>x.variantId===dec)?.quantity||1)-1);
  });
}

window.addEventListener("DOMContentLoaded", async ()=>{
  Cart.load();
  renderCart();
  bootCartDOM();
  if(document.getElementById("home-grid")) await renderCatalog("#home-grid", 12);
  if(document.getElementById("catalog-grid")) await renderCatalog("#catalog-grid", 48);
  if(document.getElementById("product-root")) await renderProduct("#product-root");
});
