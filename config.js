/**
 * Supabase 公共配置。
 *
 * publishable key 是给浏览器使用的公开密钥，但 secret/service_role 密钥绝不能写在这里。
 * 创建 Supabase 项目后，把下面两个值替换为项目设置里的 URL 和 publishable key。
 */
window.NOVA_CONFIG = {
  supabaseUrl: "https://gyecomvpbwyuszmaglaf.supabase.co",
  supabaseAnonKey: "sb_publishable_29_vjmtutQUAgqchfMlUyw_7XWIzbe_",
  orderFunctionName: "create-order",
  currency: "USD",
};
