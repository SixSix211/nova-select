const config = window.NOVA_CONFIG || {};
const configured =
  /^https:\/\//.test(config.supabaseUrl || "") &&
  config.supabaseAnonKey &&
  !config.supabaseAnonKey.startsWith("YOUR_");

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const orderStatuses = ["待确认", "已联系", "已确认", "配货中", "已完成", "已取消"];
let client = null;
let currentProducts = [];
let currentOrders = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeImageUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url, location.href);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function formatPrice(value) {
  return `$${Number(value || 0).toFixed(Number(value || 0) % 1 === 0 ? 0 : 2)}`;
}

function showToast(message) {
  const toast = $("#admin-toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function showOnly(panelSelector) {
  ["#setup-panel", "#login-panel", "#unauthorized-panel", "#dashboard"].forEach((selector) => {
    $(selector).hidden = selector !== panelSelector;
  });
}

function productPlaceholder(name) {
  const initials = escapeHtml((name || "N").slice(0, 2).toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="20" fill="#d7f36a"/><circle cx="96" cy="20" r="38" fill="#fff" opacity=".3"/><text x="60" y="68" text-anchor="middle" fill="#20201e" font-family="monospace" font-size="22" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

async function verifyAdmin(user) {
  if (!user) return false;
  const { data, error } = await client
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error(error);
    return false;
  }
  return Boolean(data);
}

async function handleSession(session) {
  const signOutButton = $("#sign-out-button");
  if (!session?.user) {
    $("#admin-identity").textContent = "";
    signOutButton.hidden = true;
    showOnly("#login-panel");
    return;
  }

  $("#admin-identity").textContent = session.user.email || "管理员";
  signOutButton.hidden = false;
  const allowed = await verifyAdmin(session.user);
  if (!allowed) {
    showOnly("#unauthorized-panel");
    return;
  }
  showOnly("#dashboard");
  await Promise.all([loadProducts(), loadOrders()]);
}

async function loadProducts() {
  const list = $("#admin-products-list");
  list.innerHTML = '<div class="empty-list">正在加载商品…</div>';
  const { data, error } = await client
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    list.innerHTML = `<div class="empty-list">${escapeHtml(error.message)}</div>`;
    return;
  }
  currentProducts = data || [];
  renderProducts();
  updateStats();
}

function renderProducts() {
  const list = $("#admin-products-list");
  if (!currentProducts.length) {
    list.innerHTML = '<div class="empty-list">还没有商品，请先添加第一件商品。</div>';
    return;
  }
  list.innerHTML = currentProducts.map((product) => {
    const image = safeImageUrl(product.image_url) || productPlaceholder(product.name);
    return `
      <article class="admin-product">
        <img src="${escapeHtml(image)}" alt="" />
        <div>
          <strong>${escapeHtml(product.name)}</strong>
          <span>${escapeHtml(product.category)} · ${formatPrice(product.price)}</span>
          <span><i class="status-dot${product.is_active ? " active" : ""}"></i>${product.is_active ? "已上架" : "已下架"}${product.is_featured ? " · 本周精选" : ""}</span>
        </div>
        <div class="row-actions">
          <button type="button" data-edit-product="${product.id}">编辑</button>
          <button class="danger" type="button" data-delete-product="${product.id}">删除</button>
        </div>
      </article>
    `;
  }).join("");
}

async function loadOrders() {
  const list = $("#admin-orders-list");
  list.innerHTML = '<div class="empty-list">正在加载订单…</div>';
  const { data, error } = await client
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });
  if (error) {
    list.innerHTML = `<div class="empty-list">${escapeHtml(error.message)}</div>`;
    return;
  }
  currentOrders = data || [];
  renderOrders();
  updateStats();
}

function renderOrders() {
  const list = $("#admin-orders-list");
  if (!currentOrders.length) {
    list.innerHTML = '<div class="empty-list">暂时还没有客户订单。</div>';
    return;
  }
  list.innerHTML = currentOrders.map((order) => `
    <article class="admin-order">
      <div class="order-head">
        <div>
          <strong>${escapeHtml(order.order_number)}</strong>
          <div class="order-date">${new Date(order.created_at).toLocaleString("zh-CN")}</div>
        </div>
        <select class="order-status" data-order-status="${order.id}" aria-label="订单状态">
          ${orderStatuses.map((status) => `<option${order.status === status ? " selected" : ""}>${status}</option>`).join("")}
        </select>
      </div>
      <div class="order-contact">
        <div><span>客户</span><strong>${escapeHtml(order.customer_name)}</strong></div>
        <div><span>联系方式</span><strong>${escapeHtml(order.contact)}</strong></div>
        <div><span>邮箱</span><strong>${escapeHtml(order.email || "—")}</strong></div>
        <div><span>地址</span><strong>${escapeHtml(order.shipping_address || "待确认")}</strong></div>
        ${order.note ? `<div><span>备注</span><strong>${escapeHtml(order.note)}</strong></div>` : ""}
      </div>
      <ul class="order-items">
        ${(order.order_items || []).map((item) => `
          <li><span>${escapeHtml(item.product_name_snapshot)} × ${item.quantity}</span><strong>${formatPrice(Number(item.price_snapshot) * Number(item.quantity))}</strong></li>
        `).join("")}
      </ul>
      <div class="order-total"><span>参考合计</span><strong>${formatPrice(order.reference_total)}</strong></div>
    </article>
  `).join("");
}

function updateStats() {
  $("#stat-products").textContent = currentProducts.length;
  $("#stat-active").textContent = currentProducts.filter((item) => item.is_active).length;
  $("#stat-orders").textContent = currentOrders.length;
  $("#stat-pending").textContent = currentOrders.filter((item) => item.status === "待确认").length;
}

function resetProductForm() {
  const form = $("#product-form");
  form.reset();
  form.elements.id.value = "";
  form.elements.sort_order.value = "100";
  form.elements.is_active.checked = true;
  $("#product-form-title").textContent = "添加商品";
  $("#cancel-edit-button").hidden = true;
  $("#product-message").textContent = "";
}

function editProduct(id) {
  const product = currentProducts.find((item) => item.id === id);
  if (!product) return;
  const form = $("#product-form");
  ["id", "name", "category", "price", "label", "sort_order", "description"].forEach((field) => {
    form.elements[field].value = product[field] ?? "";
  });
  form.elements.is_active.checked = Boolean(product.is_active);
  form.elements.is_featured.checked = Boolean(product.is_featured);
  $("#product-form-title").textContent = "编辑商品";
  $("#cancel-edit-button").hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function uploadProductImage(file) {
  if (!file?.size) return "";
  if (file.size > 5 * 1024 * 1024) throw new Error("图片不能超过 5MB");
  const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from("product-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = client.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

function setSaveBusy(busy) {
  const button = $("#product-form button[type=submit]");
  button.disabled = busy;
  button.querySelector(".save-label").hidden = busy;
  button.querySelector(".save-loading").hidden = !busy;
}

async function saveProduct(form) {
  const data = new FormData(form);
  const id = String(data.get("id") || "");
  const existing = currentProducts.find((item) => item.id === id);
  const uploadedImage = await uploadProductImage(data.get("image"));
  const payload = {
    name: String(data.get("name") || "").trim(),
    category: String(data.get("category") || ""),
    price: Number(data.get("price")),
    label: String(data.get("label") || "").trim(),
    sort_order: Number(data.get("sort_order")) || 100,
    description: String(data.get("description") || "").trim(),
    image_url: uploadedImage || existing?.image_url || null,
    is_active: data.get("is_active") === "on",
    is_featured: data.get("is_featured") === "on",
  };
  if (id) {
    const { error } = await client.from("products").update(payload).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await client.from("products").insert(payload);
    if (error) throw error;
  }
}

async function deleteProduct(id) {
  const product = currentProducts.find((item) => item.id === id);
  if (!product || !confirm(`确定删除「${product.name}」吗？历史订单不会被删除。`)) return;
  const { error } = await client.from("products").delete().eq("id", id);
  if (error) {
    showToast(error.message);
    return;
  }
  showToast("商品已删除");
  await loadProducts();
}

async function updateOrderStatus(id, status) {
  const { error } = await client.from("orders").update({ status }).eq("id", id);
  if (error) {
    showToast(error.message);
    return;
  }
  const order = currentOrders.find((item) => item.id === id);
  if (order) order.status = status;
  updateStats();
  showToast("订单状态已更新");
}

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = $("#login-message");
  const form = event.currentTarget;
  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const button = form.querySelector("button[type=submit]");
  message.className = "form-message";
  message.textContent = "";
  button.disabled = true;
  button.querySelector(".login-label").hidden = true;
  button.querySelector(".login-loading").hidden = false;
  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  button.disabled = false;
  button.querySelector(".login-label").hidden = false;
  button.querySelector(".login-loading").hidden = true;
  if (error) {
    message.classList.add("error");
    if (/invalid login credentials/i.test(error.message)) {
      message.textContent = "邮箱或密码不正确，请检查后重试。";
    } else if (/email not confirmed/i.test(error.message)) {
      message.textContent = "该邮箱尚未确认，请在 Supabase Users 页面将账号设为已确认。";
    } else {
      message.textContent = error.message;
    }
    return;
  }
  message.classList.add("success");
  message.textContent = "登录成功，正在打开管理后台…";
});

$("#product-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = $("#product-message");
  message.className = "form-message";
  setSaveBusy(true);
  try {
    await saveProduct(event.currentTarget);
    resetProductForm();
    message.className = "form-message success";
    message.textContent = "商品已保存";
    await loadProducts();
  } catch (error) {
    message.classList.add("error");
    message.textContent = error.message;
  } finally {
    setSaveBusy(false);
  }
});

document.addEventListener("click", async (event) => {
  const tab = event.target.closest("[data-admin-tab]");
  if (tab) {
    $$(".admin-tab").forEach((item) => item.classList.toggle("active", item === tab));
    $$("[data-admin-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.adminPanel !== tab.dataset.adminTab;
    });
    return;
  }
  const edit = event.target.closest("[data-edit-product]");
  if (edit) return editProduct(edit.dataset.editProduct);
  const remove = event.target.closest("[data-delete-product]");
  if (remove) return deleteProduct(remove.dataset.deleteProduct);
});

document.addEventListener("change", (event) => {
  const status = event.target.closest("[data-order-status]");
  if (status) updateOrderStatus(status.dataset.orderStatus, status.value);
});

$("#cancel-edit-button").addEventListener("click", resetProductForm);
$("#refresh-products").addEventListener("click", loadProducts);
$("#refresh-orders").addEventListener("click", loadOrders);
$("#sign-out-button").addEventListener("click", () => client.auth.signOut());
$("#unauthorized-sign-out").addEventListener("click", () => client.auth.signOut());

async function initializeAdmin() {
  if (!configured || !window.supabase?.createClient) {
    showOnly("#setup-panel");
    return;
  }
  client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  const { data } = await client.auth.getSession();
  await handleSession(data.session);
  client.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => handleSession(session), 0);
  });
}

initializeAdmin();
