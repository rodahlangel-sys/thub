# Netlify 环境变量配置说明

> 本文档由 Netlify 环境变量审计生成，列出在 Netlify 后台必须配置的环境变量。
> 配置位置：Netlify 后台 → Site settings → Environment variables

## 一、必须配置（Required）

以下 7 个变量缺失会导致应用启动失败或核心功能不可用。

### 1. `DATABASE_URL`

| 属性 | 值 |
|---|---|
| 是否必需 | **必须** |
| 作用 | MySQL 数据库连接字符串，Prisma Client 和应用层均依赖此变量 |
| 代码引用 | [src/lib/env.ts:20](src/lib/env.ts#L20)、[prisma.config.ts:11](prisma.config.ts#L11) |
| 默认值 | 无（缺失抛错） |
| 是否敏感 | **是**（含数据库账号密码） |
| 配置示例 | `mysql://用户名:密码@主机:端口/thub_test` |

### 2. `AUTH_SECRET`

| 属性 | 值 |
|---|---|
| 是否必需 | **必须** |
| 作用 | JWT 签名密钥，用于用户登录会话签发与校验 |
| 代码引用 | [src/lib/env.ts:131](src/lib/env.ts#L131) |
| 默认值 | 无（缺失抛错） |
| 是否敏感 | **是** |
| 配置说明 | 生产环境必须重新生成一个高熵随机字符串，不能沿用本地开发值。建议至少 64 字符。可用 `openssl rand -base64 48` 生成 |

### 3. `CLOUDBASE_ENV_ID`

| 属性 | 值 |
|---|---|
| 是否必需 | **必须**（生产 `STORAGE_PROVIDER=CLOUDBASE` 时） |
| 作用 | 腾讯云 CloudBase 环境 ID，用于私有文件存储（家教证明材料、支付二维码） |
| 代码引用 | [src/lib/env.ts:122](src/lib/env.ts#L122) |
| 默认值 | 空字符串（生产会抛错） |
| 是否敏感 | 否 |
| 配置示例 | `thub-test-d2gtl1mcfd13d8b31` |

### 4. `CLOUDBASE_REGION`

| 属性 | 值 |
|---|---|
| 是否必需 | **必须**（生产 `STORAGE_PROVIDER=CLOUDBASE 时） |
| 作用 | CloudBase 地域 |
| 代码引用 | [src/lib/env.ts:123](src/lib/env.ts#L123) |
| 默认值 | 空字符串（生产会抛错） |
| 是否敏感 | 否 |
| 配置示例 | `ap-shanghai` |

### 5. `CLOUDBASE_APIKEY`

| 属性 | 值 |
|---|---|
| 是否必需 | **必须**（生产 `STORAGE_PROVIDER=CLOUDBASE` 时） |
| 作用 | CloudBase SDK 调用密钥，用于上传/下载/删除私有文件 |
| 代码引用 | [src/lib/env.ts:124](src/lib/env.ts#L124) |
| 默认值 | 空字符串（CloudBase 调用会失败） |
| 是否敏感 | **是** |
| 重要说明 | **变量名是 `CLOUDBASE_APIKEY`（无下划线），不是 `CLOUDBASE_API_KEY`**。项目代码统一使用此名称，Netlify 后台必须严格按此拼写配置 |

### 6. `PAYMENT_PROVIDER`

| 属性 | 值 |
|---|---|
| 是否必需 | **必须** |
| 作用 | 支付 Provider 类型，决定家长支付页走哪个流程 |
| 代码引用 | [src/lib/payments/config.ts:25](src/lib/payments/config.ts#L25) |
| 默认值 | `MOCK`（本地开发用） |
| 是否敏感 | 否 |
| 配置值 | **生产环境配置为 `QRCODE`**（扫码支付）。`MOCK` 仅用于开发，会显示模拟支付 UI |

### 7. `PAYMENT_NOTIFY_BASE_URL`

| 属性 | 值 |
|---|---|
| 是否必需 | **必须**（生产） |
| 作用 | 支付回调基础 URL，用于拼接支付通知 URL |
| 代码引用 | [src/lib/payments/config.ts:30](src/lib/payments/config.ts#L30) |
| 默认值 | `http://localhost:3000`（仅开发用） |
| 是否敏感 | 否 |
| 配置示例 | `https://你的站点名.netlify.app` |

---

## 二、可选配置（Optional，建议配置）

### 8. `STORAGE_PROVIDER`

| 属性 | 值 |
|---|---|
| 是否必需 | 可选 |
| 作用 | 文件存储 Provider |
| 代码引用 | [src/lib/env.ts:69-71](src/lib/env.ts#L69-L71) |
| 默认值 | 生产环境自动 `CLOUDBASE`，开发环境 `LOCAL` |
| 是否敏感 | 否 |
| 配置说明 | 生产环境如不配置会自动取 `CLOUDBASE`，建议显式配置为 `CLOUDBASE` 以避免歧义 |

### 9. `PLATFORM_FEE_RATE_BPS`

| 属性 | 值 |
|---|---|
| 是否必需 | 可选 |
| 作用 | 平台信息服务费率（基点，500 = 5%） |
| 代码引用 | [src/lib/settlements.ts:21](src/lib/settlements.ts#L21) |
| 默认值 | `500`（5%） |
| 是否敏感 | 否 |
| 配置说明 | **如配置，必须是 `500`**，否则会抛 `PLATFORM_FEE_RATE_INVALID` 错误 |

### 10. `SETTLEMENT_PROVIDER`

| 属性 | 值 |
|---|---|
| 是否必需 | 可选 |
| 作用 | 结算 Provider |
| 代码引用 | [src/lib/settlements.ts:37](src/lib/settlements.ts#L37) |
| 默认值 | `MOCK` |
| 是否敏感 | 否 |
| 配置说明 | **如配置，必须是 `MOCK`**，否则会抛 `SETTLEMENT_PROVIDER_INVALID` 错误 |

### 11. `PAYMENT_ENABLE_REAL_PROVIDER`

| 属性 | 值 |
|---|---|
| 是否必需 | 可选 |
| 作用 | 是否启用真实支付 Provider（支付宝/微信） |
| 代码引用 | [src/lib/payments/config.ts:29](src/lib/payments/config.ts#L29) |
| 默认值 | `false` |
| 是否敏感 | 否 |
| 配置说明 | 本项目使用 QRCODE 扫码支付，**保持 `false`**。设置为 `true` 会尝试调用真实 SDK 但因密钥未配置而失败 |

---

## 三、Netlify 自动注入（不要手动配置）

| 变量名 | 说明 |
|---|---|
| `NODE_ENV` | Netlify 构建时自动设置为 `production`，**不要在后台手动配置** |

---

## 四、不需要在 Netlify 配置的变量

### CloudBase Run 专用（Netlify 绕过相关脚本，不读取）

| 变量名 | 用途 |
|---|---|
| `CLOUDBASE_MYSQL_EXTERNAL_URL` | CloudBase Run 本地开发脚本读取的 MySQL URL |
| `CLOUDBASE_MYSQL_INTERNAL_URL` | CloudBase Run 容器内网 URL |
| `CLOUDBASE_MYSQL_DATABASE` | CloudBase MySQL 库名 |

### 本地开发/测试专用

| 变量名 | 用途 |
|---|---|
| `AUTH_SESSION_SMOKE_BASE_URL` | 认证冒烟测试脚本 |
| `THUB_SQLITE_ROLLBACK` | SQLite 回退开关，生产强制 MySQL |
| `SEED_ADMIN_PASSWORD` | 本地 seed 脚本 |
| `SEED_DEMO_PASSWORD` | 本地 seed 脚本 |
| `PRIVATE_FILE_STORAGE_ROOT` | 本地文件存储根目录（生产用 CLOUDBASE 时自动忽略） |
| `PRIVATE_FILE_STORAGE_DRIVER` | 本地文件驱动（生产用 CLOUDBASE 时自动忽略） |

### 未启用的支付 SDK（本项目用 QRCODE，留空即可）

| 变量名 | 用途 |
|---|---|
| `ALIPAY_APP_ID`、`ALIPAY_PRIVATE_KEY`、`ALIPAY_PUBLIC_KEY`、`ALIPAY_GATEWAY`、`ALIPAY_RETURN_URL`、`ALIPAY_NOTIFY_URL`、`ALIPAY_SIGN_TYPE` | 支付宝 SDK（未启用） |
| `WECHAT_PAY_APP_ID`、`WECHAT_PAY_MCH_ID`、`WECHAT_PAY_API_V3_KEY`、`WECHAT_PAY_PRIVATE_KEY`、`WECHAT_PAY_CERT_SERIAL_NO`、`WECHAT_PAY_NOTIFY_URL`、`WECHAT_PAY_GATEWAY` | 微信支付 SDK（未启用） |

---

## 五、变量名一致性说明

| 检查项 | 结论 |
|---|---|
| `CLOUDBASE_APIKEY` vs `CLOUDBASE_API_KEY` | ✅ 项目统一使用 **`CLOUDBASE_APIKEY`（无下划线）**，不存在混用。Netlify 后台必须严格按此拼写配置，否则 CloudBase 私有存储会因密钥为空而调用失败 |
| `NEXTAUTH_URL` | ✅ 本项目**不使用 NextAuth**，使用自实现 JWT（[src/lib/auth.ts](src/lib/auth.ts) + jose 库），**不需要配置 NEXTAUTH_URL** |
| `AUTH_SECRET` | ⚠️ **必须配置**，缺失会导致应用启动抛错。生产环境必须重新生成，不能沿用本地开发值 |
| `PAYMENT_NOTIFY_BASE_URL` | ⚠️ **生产必须配置**为 Netlify 站点域名，否则默认 `http://localhost:3000` 会导致支付回调失败 |

---

## 六、Netlify 后台配置清单（快速参考）

在 Netlify 后台 → Site settings → Environment variables 中配置以下 7 个变量：

```
DATABASE_URL            = mysql://thub_app:****@sh-cynosdbmysql-grp-0hbporo6.sql.tencentcdb.com:26388/thub_test
AUTH_SECRET             = <生产环境新生成的64位随机字符串>
CLOUDBASE_ENV_ID        = thub-test-d2gtl1mcfd13d8b31
CLOUDBASE_REGION        = ap-shanghai
CLOUDBASE_APIKEY        = <CloudBase API Key>
PAYMENT_PROVIDER        = QRCODE
PAYMENT_NOTIFY_BASE_URL = https://你的站点名.netlify.app
```

可选追加（保持默认行为，可不配）：

```
STORAGE_PROVIDER            = CLOUDBASE
PLATFORM_FEE_RATE_BPS       = 500
SETTLEMENT_PROVIDER         = MOCK
PAYMENT_ENABLE_REAL_PROVIDER = false
```

**注意**：
- 上述 `DATABASE_URL` 和 `CLOUDBASE_APIKEY` 的值仅为示例格式，实际值需从腾讯云控制台获取
- `AUTH_SECRET` 必须重新生成，不要使用本地 `.env` 中的开发值
- 不要配置 `NODE_ENV`，Netlify 会自动注入

---

## 七、安全注意事项

1. **敏感变量标记**：在 Netlify 后台配置 `DATABASE_URL`、`AUTH_SECRET`、`CLOUDBASE_APIKEY` 时，建议勾选 "Sensitive" 选项，避免在构建日志中泄露
2. **`.env` 文件不要提交到 Git**：项目 `.gitignore` 应包含 `.env` 和 `.env.cloudbase.local`（项目已配置）
3. **本地 `.env` 仅用于开发**：本地 `.env` 中的 `AUTH_SECRET` 是开发占位值，生产必须替换
4. **`PAYMENT_NOTIFY_BASE_URL` 必须是 HTTPS**：Netlify 默认提供 HTTPS，配置时使用 `https://` 前缀
