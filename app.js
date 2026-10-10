const defaultProducts = [
  { id: "demo-1", name: "Mori Air 轻盈便携风扇", category: "日常好物", label: "NEW", price: 29, sold: 18, colors: ["#d9f48a", "#6d9d82"], featured: true },
  { id: "demo-2", name: "Orbit Mini 桌面氛围灯", category: "家居灵感", label: "HOT", price: 49, sold: 26, colors: ["#ffd3b6", "#ef7957"], featured: true },
  { id: "demo-3", name: "Mellow 软壳收纳包", category: "出行装备", label: "PICK", price: 36, sold: 11, colors: ["#d7c9ff", "#826bc7"], featured: true },
  { id: "demo-4", name: "Daily Loop 随行水杯", category: "日常好物", label: "", price: 32, sold: 43, colors: ["#c5eaf0", "#508b9d"] },
  { id: "demo-5", name: "Nook 折叠阅读灯", category: "家居灵感", label: "", price: 46, sold: 8, colors: ["#ffc9dd", "#c25d87"] },
  { id: "demo-6", name: "Cloud Nine 午休眼罩", category: "日常好物", label: "", price: 22, sold: 31, colors: ["#c7baff", "#7861d4"] },
  { id: "demo-7", name: "Carryall 机能托特包", category: "出行装备", label: "LIMITED", price: 58, sold: 19, colors: ["#d4e9ad", "#69875d"] },
  { id: "demo-8", name: "Mori Click 机械钥匙扣", category: "小物收藏", label: "", price: 18, sold: 52, colors: ["#ffd47d", "#dc7b36"] },
  { id: "demo-9", name: "Sundaze 旅行香氛片", category: "家居灵感", label: "", price: 16, sold: 37, colors: ["#f9b7ac", "#bd5d79"] },
  { id: "demo-10", name: "Tide 轻量防水收纳袋", category: "出行装备", label: "", price: 25, sold: 12, colors: ["#bde7ff", "#4a88b5"] },
  { id: "demo-11", name: "NOVA Note 便携备忘本", category: "小物收藏", label: "NEW", price: 14, sold: 44, colors: ["#fff0aa", "#c89d38"] },
  { id: "demo-12", name: "Soft Form 冰箱磁贴套装", category: "小物收藏", label: "", price: 12, sold: 61, colors: ["#ffd1a8", "#c57548"] },
];

const categories = [
  { name: "日常好物", english: "EVERYDAY ESSENTIALS", short: "Everyday" },
  { name: "家居灵感", english: "HOME & MOOD", short: "Home" },
  { name: "出行装备", english: "MOVE LIGHT", short: "Travel" },
  { name: "小物收藏", english: "TINY TREASURES", short: "Collect" },
];

const colorSets = [
  ["#d9f48a", "#6d9d82"],
  ["#ffd3b6", "#ef7957"],
  ["#d7c9ff", "#826bc7"],
  ["#c5eaf0", "#508b9d"],
  ["#ffc9dd", "#c25d87"],
  ["#fff0aa", "#c89d38"],
];

const backend = window.NOVA_CONFIG || {};
const backendReady =
  /^https:\/\//.test(backend.supabaseUrl || "") &&
  backend.supabaseAnonKey &&
  !backend.supabaseAnonKey.startsWith("YOUR_");

let products = [...defaultProducts];

const state = {
  view: "home",
  activeCategory: "全部",
  search: "",
  cart: loadCart(),
};

const el = (selector) => document.querySelector(selector);
const els = (selector) => [...document.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeXml(value) {
  return escapeHtml(value).replaceAll("&#039;", "&apos;");
}

function safeImageUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url, window.location.href);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function normalizeProduct(row, index = 0) {
  return {
    id: String(row.id),
    name: row.name || "未命名商品",
    category: row.category || "日常好物",
    label: row.label || "",
    price: Number(row.price) || 0,
    sold: Number(row.sold_count ?? row.sold) || 0,
    colors: row.colors || colorSets[index % colorSets.length],
    featured: Boolean(row.is_featured ?? row.featured),
    imageUrl: safeImageUrl(row.image_url),
    description: row.description || "",
  };
}

function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem("nova-cart") || "[]");
    return new Map(Array.isArray(raw) ? raw : []);
  } catch {
    return new Map();
  }
}

function saveCart() {
  localStorage.setItem("nova-cart", JSON.stringify([...state.cart.entries()]));
}

function formatPrice(value) {
  return `$${Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 2)}`;
}

function productArtwork(product, compact = false) {
  const [primary, secondary] = product.colors || colorSets[0];
  const scale = compact ? 0.72 : 1;
  const title = escapeXml(product.name.split(" ")[0].toUpperCase());
  const safeId = String(product.id).replace(/[^a-zA-Z0-9]/g, "");
  const svg = `
    <svg viewBox="0 0 360 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(product.name)}">
      <defs>
        <linearGradient id="bg${safeId}" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${primary}" />
          <stop offset="1" stop-color="${secondary}" />
        </linearGradient>
        <filter id="shadow${safeId}" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="18" stdDeviation="13" flood-color="#24211d" flood-opacity=".18"/>
        </filter>
      </defs>
      <rect width="360" height="300" fill="url(#bg${safeId})"/>
      <circle cx="55" cy="48" r="95" fill="#fff" opacity=".13"/>
      <circle cx="319" cy="266" r="122" fill="#fff" opacity=".09"/>
      <path d="M-10 237 C72 185 111 267 180 222 S295 180 370 225 L370 310 L-10 310Z" fill="#fff" opacity=".11"/>
      <g filter="url(#shadow${safeId})" transform="translate(${compact ? 118 : 100} ${compact ? 57 : 45}) scale(${scale})">
        <path d="M83 11 L180 28 L173 204 L72 188 Z" fill="#fff" opacity=".95"/>
        <path d="M83 11 L106 0 L202 18 L180 28 Z" fill="#fff" opacity=".66"/>
        <path d="M180 28 L202 18 L195 193 L173 204 Z" fill="#fff" opacity=".72"/>
        <rect x="91" y="56" width="73" height="73" rx="18" fill="${secondary}" opacity=".88"/>
        <circle cx="128" cy="92" r="20" fill="#fff" opacity=".7"/>
        <path d="M112 92 C118 80 138 80 145 92 C139 103 118 105 112 92Z" fill="${primary}"/>
        <text x="90" y="160" fill="#20201e" font-family="monospace" font-size="11" font-weight="700" letter-spacing="2">${title}</text>
        <text x="90" y="177" fill="#20201e" opacity=".45" font-family="monospace" font-size="7" letter-spacing="1">SELECTED / 2026</text>
      </g>
      <text x="20" y="278" fill="#fff" opacity=".7" font-family="monospace" font-size="9" letter-spacing="2">NOVA SELECT</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function productImage(product, compact = false) {
  return product.imageUrl || productArtwork(product, compact);
}

function productCard(product, rail = false) {
  const card = document.createElement("article");
  card.className = `product-card${rail ? " product-card-rail" : ""}`;
  card.innerHTML = `
    <div class="product-art">
      ${product.label ? `<span class="product-badge">${escapeHtml(product.label)}</span>` : ""}
      <img src="${escapeHtml(productImage(product, rail))}" alt="${escapeHtml(product.name)}" loading="lazy" />
    </div>
    <div class="product-info">
      <span class="product-category">${escapeHtml(product.category.toUpperCase())}</span>
      <h3 class="product-name">${escapeHtml(product.name)}</h3>
      <div class="product-bottom">
        <div>
          <span class="price">${formatPrice(product.price)}</span>
          <span class="sold">参考价 · 已售 ${product.sold}</span>
        </div>
        <button class="buy-button" type="button" data-add="${escapeHtml(product.id)}" aria-label="加入购物车">＋</button>
      </div>
    </div>
  `;
  return card;
}

async function loadRemoteProducts() {
  if (!backendReady) return;
  try {
    const query = new URL(`${backend.supabaseUrl}/rest/v1/products`);
    query.searchParams.set("select", "id,name,category,price,description,image_url,label,sold_count,is_featured");
    query.searchParams.set("is_active", "eq.true");
    query.searchParams.set("order", "sort_order.asc,created_at.desc");
    const response = await fetch(query, {
      headers: {
        apikey: backend.supabaseAnonKey,
      },
    });
    if (!response.ok) throw new Error(`Products request failed: ${response.status}`);
    const rows = await response.json();
    if (Array.isArray(rows)) {
      products = rows.map(normalizeProduct);
      removeMissingCartItems();
    }
  } catch (error) {
    console.error(error);
    showToast("暂时无法连接商品后台，正在显示演示商品");
  }
}

function removeMissingCartItems() {
  const ids = new Set(products.map((product) => product.id));
  [...state.cart.keys()].forEach((id) => {
    if (!ids.has(String(id))) state.cart.delete(id);
  });
  saveCart();
}

function renderCategoryRail() {
  const rail = el("#category-rail");
  rail.innerHTML = categories.slice(0, 3).map((category, index) => `
    <button class="category-chip${state.activeCategory === category.name ? " active" : ""}" type="button" data-category="${escapeHtml(category.name)}">
      <h3>${escapeHtml(category.name)}</h3>
      <p>${category.short.toUpperCase()} / 0${index + 1}</p>
      <span class="category-illustration"></span>
    </button>
  `).join("");
}

function filteredProducts() {
  return products.filter((product) => {
    const matchesCategory = state.activeCategory === "全部" || product.category === state.activeCategory;
    const haystack = `${product.name} ${product.category} ${product.description}`.toLowerCase();
    return matchesCategory && haystack.includes(state.search.trim().toLowerCase());
  });
}

function renderHomeProducts() {
  const featured = el("#featured-products");
  featured.innerHTML = "";
  const featuredProducts = products.filter((product) => product.featured);
  (featuredProducts.length ? featuredProducts : products.slice(0, 3)).forEach((product) => {
    featured.appendChild(productCard(product, true));
  });

  const filtered = filteredProducts();
  el("#product-grid").innerHTML = "";
  filtered.forEach((product) => el("#product-grid").appendChild(productCard(product)));
  el("#product-count").textContent = `${filtered.length} ITEMS`;
  el("#empty-state").hidden = filtered.length !== 0;
}

function renderCategoryPage() {
  const list = el("#category-list");
  list.innerHTML = `
    <button class="category-row${state.activeCategory === "全部" ? " active" : ""}" type="button" data-category="全部">
      <span class="category-row-art" style="background: linear-gradient(145deg, #20201e, #67615b)"></span>
      <span><h3>全部商品</h3><p>ALL ITEMS / ${products.length} PRODUCTS</p></span>
      <span class="category-row-arrow">↗</span>
    </button>
    ${categories.map((category) => `
      <button class="category-row${state.activeCategory === category.name ? " active" : ""}" type="button" data-category="${escapeHtml(category.name)}">
        <span class="category-row-art"></span>
        <span><h3>${escapeHtml(category.name)}</h3><p>${category.english} / ${products.filter((product) => product.category === category.name).length} ITEMS</p></span>
        <span class="category-row-arrow">↗</span>
      </button>
    `).join("")}
  `;

  const result = filteredProducts();
  el("#category-result-title").textContent = state.activeCategory === "全部" ? "热门推荐" : state.activeCategory;
  el("#category-result-count").textContent = `${result.length} ITEMS`;
  el("#category-product-grid").innerHTML = "";
  result.forEach((product) => el("#category-product-grid").appendChild(productCard(product)));
}

function cartEntries() {
  return [...state.cart.entries()]
    .map(([id, quantity]) => ({
      product: products.find((product) => product.id === String(id)),
      quantity: Number(quantity),
    }))
    .filter((entry) => entry.product && entry.quantity > 0);
}

function cartTotal() {
  return cartEntries().reduce((total, entry) => total + entry.product.price * entry.quantity, 0);
}

function cartQuantity() {
  return cartEntries().reduce((total, entry) => total + entry.quantity, 0);
}

function renderCart() {
  const entries = cartEntries();
  const container = el("#cart-content");
  el("#cart-count-heading").textContent = `${cartQuantity()} 件`;
  if (!entries.length) {
    container.innerHTML = `
      <div class="cart-empty">
        <div>
          <div class="cart-empty-icon">▱</div>
          <h2>购物车还是空的</h2>
          <p>去逛逛本周精选，给日常添一点新鲜感。</p>
          <button class="primary-button" type="button" data-nav="home">去逛逛</button>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="cart-list">
      ${entries.map(({ product, quantity }) => `
        <div class="cart-item">
          <div class="cart-item-art"><img src="${escapeHtml(productImage(product, true))}" alt="${escapeHtml(product.name)}" /></div>
          <div class="cart-item-main">
            <strong>${escapeHtml(product.name)}</strong>
            <div class="cart-item-meta">${escapeHtml(product.category)} · 参考价格</div>
            <div class="cart-item-price">
              <span class="price">${formatPrice(product.price * quantity)}</span>
              <span class="quantity-control">
                <button type="button" data-decrease="${escapeHtml(product.id)}" aria-label="减少数量">−</button>
                <span>${quantity}</span>
                <button type="button" data-increase="${escapeHtml(product.id)}" aria-label="增加数量">＋</button>
              </span>
              <button class="remove-item" type="button" data-remove="${escapeHtml(product.id)}" aria-label="移除商品">×</button>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
    <div class="cart-summary">
      <div class="summary-row"><span>商品参考价小计</span><strong>${formatPrice(cartTotal())}</strong></div>
      <div class="summary-row"><span>付款方式</span><strong>提交时无需付款</strong></div>
      <div class="summary-row total"><span>参考合计</span><strong>${formatPrice(cartTotal())}</strong></div>
      <button class="checkout-button" type="button" data-checkout>填写信息并提交 →</button>
    </div>
  `;
}

function updateCartBadge() {
  const badge = el("#cart-badge");
  const quantity = cartQuantity();
  badge.textContent = quantity > 9 ? "9+" : quantity;
  badge.hidden = quantity === 0;
}

function showToast(message) {
  const toast = el("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function setView(view) {
  state.view = view;
  els(".view").forEach((section) => {
    section.hidden = section.dataset.view !== view;
  });
  els(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.nav === view));
  if (view === "categories") renderCategoryPage();
  if (view === "cart") renderCart();
  if (view === "home") renderHomeProducts();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setCategory(category) {
  state.activeCategory = category;
  if (state.view === "categories") renderCategoryPage();
  renderCategoryRail();
  renderHomeProducts();
  if (category !== "全部") showToast(`已切换到「${category}」`);
}

function openCheckout() {
  const entries = cartEntries();
  if (!entries.length) return;
  el("#checkout-order-summary").innerHTML = `
    <div>
      <strong>${cartQuantity()} 件商品</strong>
      <span>${entries.map(({ product, quantity }) => `${escapeHtml(product.name)} × ${quantity}`).join("、")}</span>
    </div>
    <strong>${formatPrice(cartTotal())}</strong>
  `;
  el("#checkout-message").textContent = "";
  el("#checkout-modal").hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => el('#checkout-form input[name="customer_name"]')?.focus(), 20);
}

function closeCheckout() {
  el("#checkout-modal").hidden = true;
  document.body.classList.remove("modal-open");
}

function setCheckoutBusy(isBusy) {
  const button = el(".submit-order-button");
  button.disabled = isBusy;
  button.querySelector(".submit-label").hidden = isBusy;
  button.querySelector(".submit-loading").hidden = !isBusy;
}

async function submitOrder(form) {
  const formData = new FormData(form);
  if (formData.get("website")) throw new Error("订单提交失败");
  if (!backendReady) {
    throw new Error("后台尚未配置。请先完成 Supabase 配置后再提交真实订单。");
  }

  const payload = {
    customer_name: String(formData.get("customer_name") || "").trim(),
    contact: String(formData.get("contact") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    shipping_address: String(formData.get("shipping_address") || "").trim(),
    note: String(formData.get("note") || "").trim(),
    items: cartEntries().map(({ product, quantity }) => ({
      product_id: product.id,
      quantity,
    })),
  };

  const functionName = backend.orderFunctionName || "create-order";
  const response = await fetch(`${backend.supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: backend.supabaseAnonKey,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "订单提交失败，请稍后再试");
  return result;
}

document.addEventListener("click", (event) => {
  const navTarget = event.target.closest("[data-nav]");
  if (navTarget) {
    setView(navTarget.dataset.nav);
    return;
  }

  const categoryTarget = event.target.closest("[data-category]");
  if (categoryTarget) {
    setCategory(categoryTarget.dataset.category);
    setView("categories");
    return;
  }

  const filterTarget = event.target.closest("[data-filter]");
  if (filterTarget) {
    state.activeCategory = "全部";
    state.search = "";
    el("#search-input").value = "";
    const filtered = products.filter((product) => product.label === "NEW");
    el("#product-grid").innerHTML = "";
    filtered.forEach((product) => el("#product-grid").appendChild(productCard(product)));
    el("#product-count").textContent = `${filtered.length} ITEMS`;
    el("#empty-state").hidden = filtered.length !== 0;
    document.querySelector(".all-products-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const addTarget = event.target.closest("[data-add]");
  if (addTarget) {
    const id = String(addTarget.dataset.add);
    state.cart.set(id, (state.cart.get(id) || 0) + 1);
    saveCart();
    updateCartBadge();
    const product = products.find((item) => item.id === id);
    if (product) showToast(`${product.name} 已加入购物车`);
    return;
  }

  const increaseTarget = event.target.closest("[data-increase]");
  if (increaseTarget) {
    const id = String(increaseTarget.dataset.increase);
    state.cart.set(id, (state.cart.get(id) || 0) + 1);
    saveCart();
    renderCart();
    updateCartBadge();
    return;
  }

  const decreaseTarget = event.target.closest("[data-decrease]");
  if (decreaseTarget) {
    const id = String(decreaseTarget.dataset.decrease);
    const next = (state.cart.get(id) || 0) - 1;
    if (next > 0) state.cart.set(id, next);
    else state.cart.delete(id);
    saveCart();
    renderCart();
    updateCartBadge();
    return;
  }

  const removeTarget = event.target.closest("[data-remove]");
  if (removeTarget) {
    state.cart.delete(String(removeTarget.dataset.remove));
    saveCart();
    renderCart();
    updateCartBadge();
    showToast("商品已移出购物车");
    return;
  }

  if (event.target.closest("[data-checkout]")) {
    openCheckout();
    return;
  }

  if (event.target.closest("[data-close-checkout]") || event.target === el("#checkout-modal")) {
    closeCheckout();
    return;
  }

  if (event.target.closest(".notice-close")) {
    event.target.closest(".notice-card").remove();
  }
});

el("#checkout-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = el("#checkout-message");
  message.className = "form-message";
  setCheckoutBusy(true);
  try {
    const result = await submitOrder(event.currentTarget);
    message.classList.add("success");
    message.textContent = `订单已提交，编号：${result.order_number}`;
    state.cart.clear();
    saveCart();
    updateCartBadge();
    renderCart();
    event.currentTarget.reset();
    setTimeout(closeCheckout, 2200);
  } catch (error) {
    message.classList.add("error");
    message.textContent = error.message || "订单提交失败，请稍后再试";
  } finally {
    setCheckoutBusy(false);
  }
});

el("#search-input").addEventListener("input", (event) => {
  state.search = event.target.value;
  renderHomeProducts();
  if (state.view === "categories") renderCategoryPage();
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    el("#search-input").focus();
  }
  if (event.key === "Escape" && !el("#checkout-modal").hidden) closeCheckout();
});

async function initialize() {
  await loadRemoteProducts();
  removeMissingCartItems();
  renderCategoryRail();
  renderHomeProducts();
  renderCategoryPage();
  renderCart();
  updateCartBadge();
}

initialize();
