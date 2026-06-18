# 武汉高校家教平台

面向武汉市区家庭与高校大学生的家教信息交互平台。项目使用真实数据库保存用户、需求、家教资料、订单、支付、退款、反馈、评价和通知数据，前台面向家长与大学生家教使用，后台面向平台管理员运营管理。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- SQLite
- bcryptjs
- jose
- zod
- lucide-react

## 本地启动

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

启动后访问：

```text
http://localhost:3000
```

开发检查：

```bash
npm run lint
npm run build
```

如果 Windows 下构建时遇到 Prisma engine 文件被占用，通常是本地 dev server 正在运行。先停止占用 3000 端口的 Node 进程，再重新执行构建。

## 环境变量

本地配置参考：

```text
.env.example
```

本地 `.env` 不要提交到仓库。真实支付接入前，不要在本地开发阶段填写生产环境商户密钥。

## 支付说明

- 当前默认支付方式为 `MOCK` 模拟支付。
- 支付宝和微信支付 Provider 已预留，但不会发起真实扣款。
- 环境变量请参考 `.env.example`。
- 真实接入支付宝或微信支付前，需要完成商户资质、密钥、证书和公网回调地址准备。
- 支付成功状态应以后端异步通知验签结果为准，不应直接信任同步返回页面。

更完整的接入说明见：

```text
docs/payment-integration.md
```

## 规则页面

平台已补充公开规则页面：

- `/about` 关于平台
- `/terms` 用户协议
- `/privacy` 隐私政策
- `/service-rules` 服务规则
- `/refund-rules` 退款规则
- `/safety` 安全提示

注册时需要勾选同意用户协议和隐私政策，系统会记录同意时间。真实上线前，应结合具体运营主体、支付资质和当地要求完善正式协议文本。

## 体验账号

管理员：

```text
admin@example.com / admin123456
```

家长：

```text
parent1@example.com / 123456
```

大学生家教：

```text
tutor1@example.com / 123456
```

## 已实现模块

- 注册、登录、HTTP-only Cookie 会话
- 用户协议和隐私政策同意记录
- 家长资料、需求发布、智能推荐
- 大学生家教资料完善、管理员认证审核
- 预约订单、老师确认或拒绝
- 模拟担保支付与支付记录
- 老师课后反馈、家长确认完成和评价
- 退款申请、管理员审核和模拟退款
- 站内通知中心
- 管理员用户管理、运营看板、订单、支付、退款、评价和反馈查看

## 演示文档

完整演示路径见：

```text
docs/demo-flow.md
```
