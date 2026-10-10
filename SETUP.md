# NOVA SELECT 后台接入步骤

管理员登录邮箱已经设置为：

```text
1957771122@qq.com
```

整个流程不包含支付。客户提交订单后，订单状态为“待确认”，你可以在管理后台查看客户联系方式并继续线下沟通。

## 1. 创建 Supabase 项目

在 Supabase 创建一个新项目，并保存好项目密码。

项目创建完成后，在：

```text
Project Settings → API
```

打开项目顶部的 **Connect**，或进入 **Settings → API Keys**，找到：

- Project URL
- Publishable key（通常以 `sb_publishable_` 开头）

Publishable key 可以用于浏览器；不要把 Secret key 或旧版 `service_role` key 写入网页或提交到 Git。

## 2. 初始化数据库

打开：

```text
Supabase Dashboard → SQL Editor
```

复制并执行：

```text
supabase/schema.sql
```

该脚本会创建：

- 商品表
- 订单表
- 订单商品表
- 管理员权限表
- 商品图片 Storage bucket
- Row Level Security 权限
- 初始演示商品

## 3. 创建管理员账号与密码

进入：

```text
Authentication → Users → Add user
```

选择 **Create new user**，填写：

```text
Email: 1957771122@qq.com
Password: 你自己设置的强密码
```

开启 **Auto Confirm User**，然后创建账号。这样后台可以直接使用邮箱和密码登录，不需要发送邮件。

如果先创建了用户、后执行数据库脚本，也会自动完成登记。

如果之前已经通过邀请创建了同名账号，但没有设置密码，最简单的处理方式是：

1. 在 Authentication → Users 中删除旧账号
2. 点击 Add user → Create new user
3. 使用同一邮箱重新创建
4. 设置强密码并开启 Auto Confirm User

数据库触发器会把重新创建的新账号自动登记为管理员。

## 4. 配置前端

编辑根目录下的 `config.js`：

```js
window.NOVA_CONFIG = {
  supabaseUrl: "https://你的项目编号.supabase.co",
  supabaseAnonKey: "你的 publishable key",
  orderFunctionName: "create-order",
  currency: "USD",
};
```

不要在此文件中填写 Secret key 或 `service_role` key。

## 5. 部署无支付订单接口

安装并登录 Supabase CLI 后，在项目根目录运行：

```bash
supabase login
supabase link --project-ref 你的项目编号
supabase functions deploy create-order --project-ref gyecomvpbwyuszmaglaf --no-verify-jwt
```

函数代码位于：

```text
supabase/functions/create-order/index.ts
```

订单接口会重新读取数据库价格，不接受浏览器传入的价格，因此客户不能通过修改网页伪造订单金额。

`--no-verify-jwt` 是因为客户无需登录即可提交选品订单；函数内部仍会校验商品、数量、联系方式和数据库中的真实价格。

如果电脑没有 `supabase` 命令，可以使用项目依赖安装方式：

```bash
npm install supabase --save-dev
npx supabase login
npx supabase link --project-ref gyecomvpbwyuszmaglaf
npx supabase functions deploy create-order --project-ref gyecomvpbwyuszmaglaf --no-verify-jwt
```

## 6. 配置登录回跳地址

在：

```text
Authentication → URL Configuration
```

把正式网站地址设置为 Site URL，并将以下地址加入 Redirect URLs：

```text
https://你的域名/admin.html
http://127.0.0.1:4173/admin.html
```

## 7. 使用方式

客户商城：

```text
https://你的域名/
```

管理员后台：

```text
https://你的域名/admin.html
```

管理员后台使用 `1957771122@qq.com` 和你设置的密码登录。只有数据库中登记的管理员账号可以编辑商品或查看订单。

## 8. 上线前检查

- 使用客户窗口查看已上架商品
- 添加购物车并提交一次测试订单
- 在管理后台确认能看到订单
- 修改订单状态
- 上传一张商品图片
- 下架商品并确认客户页面不再显示
- 确认网页源码中没有 Secret key 或 `service_role` key
