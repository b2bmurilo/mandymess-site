const API_URL = "https://mandymess.myshopify.com/api/2024-07/graphql.json";
const API_TOKEN = "574d1f25f2c097049762872eeb8eebf0";

async function fetchProducts() {
  const query = `
  {
    products(first: 12) {
      edges {
        node {
          id
          title
          handle
          featuredImage { url }
          variants(first: 1) {
            edges { node { id title price { amount currencyCode } } }
          }
        }
      }
    }
  }`;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": API_TOKEN,
    },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  return json.data.products.edges.map(e => e.node);
}

function renderProducts(products) {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  grid.innerHTML = "";
  products.forEach(p => {
    const variant = p.variants.edges[0].node;
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${p.featuredImage?.url}" alt="${p.title}" class="product-card__image" />
      <h3>${p.title}</h3>
      <p>${variant.price.amount} ${variant.price.currencyCode}</p>
      <button data-id="${variant.id}" data-title="${p.title}" data-price="${variant.price.amount}" class="add-to-cart">Adicionar</button>
    `;
    grid.appendChild(card);
  });

  document.querySelectorAll(".add-to-cart").forEach(btn => {
    btn.addEventListener("click", () => addToCart(btn.dataset));
  });
}

let cart = JSON.parse(localStorage.getItem("cart") || "[]");

function addToCart(item) {
  cart.push(item);
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
}

function updateCartUI() {
  const cartItems = document.getElementById("cart-items");
  if (!cartItems) return;
  cartItems.innerHTML = "";
  cart.forEach((item, idx) => {
    const li = document.createElement("li");
    li.textContent = item.title + " - R$" + item.price;
    cartItems.appendChild(li);
  });
}

async function checkout() {
  const mutation = `
  mutation checkoutCreate($lineItems: [CheckoutLineItemInput!]!) {
    checkoutCreate(input: { lineItems: $lineItems }) {
      checkout { webUrl }
      checkoutUserErrors { message }
    }
  }`;

  const lineItems = cart.map(item => ({
    variantId: item.id,
    quantity: 1
  }));

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": API_TOKEN,
    },
    body: JSON.stringify({ query: mutation, variables: { lineItems } }),
  });
  const json = await res.json();
  const url = json.data.checkoutCreate.checkout.webUrl;
  window.location.href = url;
}

document.addEventListener("DOMContentLoaded", async () => {
  const products = await fetchProducts();
  renderProducts(products);
  updateCartUI();

  const cartToggle = document.getElementById("cart-toggle");
  const cartOverlay = document.getElementById("cart-overlay");
  if (cartToggle && cartOverlay) {
    cartToggle.addEventListener("click", () => {
      cartOverlay.classList.toggle("hidden");
    });
  }

  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", checkout);
  }
});
