# CloudBase Run 首次部署与 P0 会话修复报告

## 环境与用途

- CloudBase 环境：`thub-test-d2gtl1mcfd13d8b31`
- 地域：`ap-shanghai`
- 服务：`thub-web`
- 公网测试域名：`https://thub-web-273292-8-1445308090.sh.run.tcloudbase.com`
- 当前稳定版本：`003`
- 用途：课程作业测试环境，默认域名不作为正式生产域名。首次访问可能出现腾讯云测试域名风险提醒，本阶段不绑定自定义域名。

## 容器方案

- Next.js 使用 `output: "standalone"`。
- 多阶段 `node:22-alpine` 镜像执行 `npm ci`、Prisma Client 生成和生产构建。
- 运行层仅包含 standalone、static 和 public 资源，使用非 root 用户，监听 `0.0.0.0:3000`。
- 容器启动不执行 migration、seed 或数据导入。

CloudBase Run 仅配置必要的运行环境变量名：`NODE_ENV`、`DATABASE_URL`、`AUTH_SECRET`、`STORAGE_PROVIDER`、`CLOUDBASE_ENV_ID`、`CLOUDBASE_REGION`、`PAYMENT_PROVIDER`、`SETTLEMENT_PROVIDER` 和 `PLATFORM_FEE_RATE_BPS`。本文档不记录任何实际值。

## 版本 001 失败

第一次构建在 `npm ci` 阶段失败，第一处真实错误是 `package.json` 与 `package-lock.json` 不同步，lock 缺少可选 WASM 依赖 `@emnapi/runtime@1.11.1` 和 `@emnapi/core@1.11.1`。原因是 Windows/npm 11 生成的 lock 未包含 npm 10/Linux 解析时需要的顶层可选依赖。

处理方式：

- 使用项目兼容的 npm 10 正常更新 `package-lock.json`，保留 Dockerfile 中的 `npm ci`。
- 未执行 `npm audit fix`、`--force` 或无关依赖升级。

001 的上传包还暴露出 CloudBase CLI 3.5.7 源码 ZIP 不完全遵循 `.dockerignore` 的问题，整个工作区上传会包含本地环境文件、构建产物、SQLite、备份、临时文件和证明材料。

安全修复为：

- `scripts/prepare-cloudbase-run-source.ts` 只复制显式白名单到被 Git 忽略的 `.tmp/cloudbase-run-source`。
- 部署始终以该最小目录作为 `--source`，不再上传项目根目录。
- 安全审计强制 `.env*`、`.data`、`.tmp`、`.next`、`node_modules`、SQLite、备份、日志、Git 元数据和证明材料的数量为 0。

## 版本 002 首次成功部署

002 从安全白名单目录构建并成功运行，基础验收结果：

- 流量 100%，实例数 1。
- `/`、`/login`、`/register` 和静态资源均返回 200。
- MySQL `thub_test` 的 12 张业务表可读，历史数据共 154 条。
- 未登录访问 parent、tutor 和 admin 入口正确跳转登录页。
- 无持续性 Prisma、数据库连接或未处理异常。
- 未执行 migration、seed 或材料 `storageKey` 切换。

## P0 生产会话问题

002 的登录后人工验收发现：工作台首页可进入，但点击任意功能页面后会话丢失，退出时还会出现客户端错误。

生产取证和代码回溯确认：

- Session Cookie 名称一致，创建属性本来就是 `HttpOnly`、生产 `Secure`、`SameSite=Lax`、`Path=/`、7 天 `Max-Age`，且没有 `Domain`。
- JWT 签发和验证共用同一 `AUTH_SECRET` 读取路径，没有随机 fallback 或变量名不一致。
- 真正根因是导航栏用 Next.js `Link` 指向有副作用的 `GET /logout`。Next.js 生产环境会预取进入视口的 Link，因此工作台刚渲染，预取请求就提前清除 Session Cookie。
- 之后二级页面的页面级 `requireUser()` 读不到 Cookie，执行 `redirect("/login")`。Proxy 没有执行该重定向。
- 旧版本的 `GET /logout` 生产证据为 307，同时返回清除 Cookie 的 `Set-Cookie`。未发现 `AUTH_SECRET` 签名失败、Cookie Path/Domain 错误或 middleware 循环。

修复方式：

- 导航栏退出改为显式 `POST /logout` 表单，不再可被 Link 预取。
- logout Route Handler 只导出 `POST`，以 303 跳转 `/login`。
- 清除 Cookie 继续复用同一名称和属性，`Path=/`、`Max-Age=0`、无 `Domain`。
- 没有关闭权限校验、改公开受保护页面或延长无限会话。

## 版本 003 验收

003 从 `.tmp/cloudbase-run-source` 提交到原 `thub-web` 服务，先作为灰度版本验证，通过后提升为稳定版本并切换 100% 流量。002 保留为可回退版本。

验收结果：

- `GET /logout` 返回 405 且没有 `Set-Cookie`，预取不再修改会话。
- 三种临时角色均通过正常注册/登录链路建立会话。
- 15 个工作台首页和二级页面保持登录；6 个跨角色访问正确返回各自工作台。
- 家长、家教和管理员的 `POST /logout` 均返回 303，清除 Cookie 并跳转 `/login`，无 500。
- 退出后再访问各自受保护入口均返回 `/login`重定向。
- 临时验收数据先 dry-run 后定向清理；MySQL 最终恢复 12 张表、154 条历史数据。
- 未运行 migration、seed、数据重导入或材料 `storageKey` 切换。

## 待验证项

- CloudBase Run 依旧使用平台环境变量，本文档未记录凭据。
- 两份历史证明材料的数据库 `storageKey` 仍未切换，须在 CloudBase Run 服务端私有存储身份最终确认后另行执行。
- 正式上线前仍应完成非临时演示账号的三角色人工视觉验收，但本次自动化生产链路验收已覆盖三角色登录、主要页面和退出。
