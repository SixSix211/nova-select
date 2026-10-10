import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type IncomingItem = {
  product_id?: unknown;
  quantity?: unknown;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function text(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function orderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const suffix = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `NV-${date}-${suffix}`;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 30_000) return json({ error: "请求内容过大" }, 413);

    const body = await request.json();
    const customerName = text(body.customer_name, 80);
    const contact = text(body.contact, 120);
    const email = text(body.email, 160);
    const shippingAddress = text(body.shipping_address, 500);
    const note = text(body.note, 500);
    const incomingItems = Array.isArray(body.items) ? body.items as IncomingItem[] : [];

    if (!customerName || !contact) {
      return json({ error: "请填写姓名和联系方式" }, 400);
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "邮箱格式不正确" }, 400);
    }
    if (!incomingItems.length || incomingItems.length > 50) {
      return json({ error: "订单商品数量不正确" }, 400);
    }

    const quantities = new Map<string, number>();
    for (const item of incomingItems) {
      const productId = text(item.product_id, 80);
      const quantity = Number(item.quantity);
      if (!/^[0-9a-f-]{36}$/i.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return json({ error: "订单中包含无效商品" }, 400);
      }
      quantities.set(productId, Math.min(99, (quantities.get(productId) || 0) + quantity));
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serverSecretKey =
      Deno.env.get("SUPABASE_SECRET_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serverSecretKey) {
      console.error("Missing Supabase environment variables");
      return json({ error: "订单服务尚未配置" }, 500);
    }

    const supabase = createClient(supabaseUrl, serverSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const productIds = [...quantities.keys()];
    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id,name,price,is_active")
      .in("id", productIds)
      .eq("is_active", true);

    if (productError) throw productError;
    if (!products || products.length !== productIds.length) {
      return json({ error: "部分商品已下架，请刷新购物车" }, 409);
    }

    const referenceTotal = products.reduce(
      (total, product) => total + Number(product.price) * (quantities.get(product.id) || 0),
      0,
    );
    const newOrderNumber = orderNumber();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: newOrderNumber,
        customer_name: customerName,
        contact,
        email,
        shipping_address: shippingAddress,
        note,
        status: "待确认",
        reference_total: referenceTotal,
      })
      .select("id,order_number,reference_total")
      .single();

    if (orderError) throw orderError;

    const orderItems = products.map((product) => ({
      order_id: order.id,
      product_id: product.id,
      product_name_snapshot: product.name,
      price_snapshot: Number(product.price),
      quantity: quantities.get(product.id) || 1,
    }));
    const { error: itemError } = await supabase.from("order_items").insert(orderItems);
    if (itemError) {
      await supabase.from("orders").delete().eq("id", order.id);
      throw itemError;
    }

    return json({
      order_number: order.order_number,
      reference_total: order.reference_total,
      status: "待确认",
    });
  } catch (error) {
    console.error(error);
    return json({ error: "订单提交失败，请稍后再试" }, 500);
  }
});
