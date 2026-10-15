# Chaldea Field Guide

FGO 角色查询课堂项目。原生 HTML / CSS / JavaScript 前端 + Vercel Function 后端。

## 先记住这三个位置

| 位置 | 职责 | 执行位置 |
| --- | --- | --- |
| `public/` | 页面、样式、搜索、卡片和交互 | 浏览器 |
| `api/atlas.js` | 检查请求、取得并整理 Atlas 数据 | Vercel 服务端 |
| `vercel.json` | 公开目录与三个接口的转发配置 | Vercel 平台 |

数据路径：浏览器 → `/api/...` → Vercel Function → Atlas Academy → JSON → 页面。

Atlas 不需要 Key。我们实现前后端分离，没有虚构要隐藏的密钥。
用户能看到接口地址和返回的 JSON，但后端代码不会作为网页脚本下发。
公开 GitHub 仓库中的源码仍然可读。未来真实密钥只能保存在服务端环境变量里，不能进入源码、响应或 `public/`。

## 本地运行（不会上传或部署）

在 VS Code 打开整个 `fgo-guide`，在终端运行：

```sh
npm start
```

看到 `Ready! Available at http://localhost:3000` 后打开该地址。终端保持运行，Ctrl+C 停止。
也可以使用 Terminal → Run Task → **FGO Guide: Vercel local preview**。

- `npm start` 通过 npx 使用固定版本的 Vercel CLI，运行与线上同一个函数入口，不再启动自己写的 Express 服务器。
- 本地工具仍需要 Node.js 22 和 npm；项目没有 Express 或其他应用依赖。CLI 依赖在工具缓存中，不需要安装到项目内。
- 首次在新电脑运行，可能需要 `npx --yes vercel@64.0.2 login` 并关联已有 Vercel 项目。
- 3000 已被占用时，先停止旧预览，不要重复启动。
- 若报 `EMFILE: too many open files, watch`，macOS 可运行 `CHOKIDAR_USEPOLLING=1 npm start`。
- Go Live 不能独立运行后端。现有 Live Server 配置仍将 `/api` 转发到 3000，因此必须先启动上述预览；建议直接使用 3000。
- 修改页面后刷新。角色数据、日文名字和图片需要网络连接。

## 前端文件怎么找

| 文件（相对于 public/） | 职责 |
| --- | --- |
| `index.html` / `servant.html` | 首页 / 共用角色详情模板，通过 `?id=编号` 切换角色 |
| `style.css` / `home-editorial.css` | 基础样式与卡片、详情页 / 仅首页的杂志式视觉 |
| `js/api.js` | 请求、超时和页面内缓存 |
| `js/main.js` / `js/search.js` | 首页卡片与筛选 / 名称匹配及搜索推荐 |
| `js/servant.js` | 角色资料、技能和宝具 |
| `js/japanese.js` / `js/daily.js` | 日文名字 / 每日发现及按需加载 |
| `js/select.js` | 统一职阶、星级下拉框 |
| `js/onboarding.js` / `js/navigation.js` | 新手介绍 / 默认展开、可手动关闭的悬浮导航 |

此次先简化后端，前端保留按功能分文件，避免同时重写所有交互。

## 接口与验证

| GET 地址 | 内容 |
| --- | --- |
| `/api/servants` | NA 可用角色基础列表 |
| `/api/servant?id=1` | 角色详情，支持图鉴编号和内部 ID |
| `/api/japanese-names` | 仅包含 id/name 的日文名单 |

`vercel.json` 将三种地址转发给 `api/atlas.js`，通过 `resource` 参数区分功能；前端地址保持不变。
也可测试 `/api/atlas?resource=servant&id=1`。
后端只访问固定 Atlas 主机，不接受任意代理 URL；支持 GET/HEAD，检查正整数 ID 和重复参数。
成功结果有缓存头，错误不缓存；Atlas 请求等待上限为 15 秒。

```sh
npm test
```

测试使用 Node 内置测试工具，不安装第三方库、不请求真实 API、不部署。
`test/api.test.js` 覆盖路由配置、名单过滤、日文裁剪、ID、非法请求、错误处理和 HEAD。

本地预览还应检查：搜索 Artoria、职阶/星级筛选、每日三张卡片展开和收起、角色详情、新手引导、导航开关。
`/api/servant?id=abc` 应返回 400；`/package.json`、`/.env.local` 不应返回源码或环境配置。

## GitHub 和 Vercel

线上网站：https://fgo-guide.vercel.app/
源码仓库：https://github.com/Heath10086/fgo-guide

将整个项目根目录提交到 GitHub；现有 Vercel 项目连接该仓库的 main 分支后，推送将触发自动部署。
日常流程：本地修改 → 本地验证 → Git commit → Git push → 检查 Vercel 部署结果。
采用本仓库 `vercel.json`：Framework 为 Other（null），静态输出为 public，无构建步骤；不再使用 Express 预设。
不需要把前后端拆成两个仓库或两个域名。

`.gitignore` 排除 `.env*`、`.vercel/`、工具依赖和日志；`.vercelignore` 另外排除测试与编辑器配置。
`.vercel/` 是本地项目关联，`.env.local` 是历史本地配置，均不要分享。本次没有读取或展示秘密内容。

## 迁移记录 · 2026-10-15

- `server.js`、`dev.js`、`routes/servants.js` 合并替换为一个 Vercel Function，移除 Express。
- 移除旧锁文件、F5 启动配置、未使用的 `guide.json` / `getGuides()` 和空目录。
- 原 node_modules 移出项目，保存在备份目录，没有永久删除。
- 迁移前源码与旧依赖已另存本机备份，不纳入公开仓库。秘密配置未打包，仍保留在原项目的忽略文件里。
- 页面布局、配色、字体、卡片和详情页不变；前端只更新本地 API 连接失败的提示。

## 展示时注意

搜索先取得列表，再在浏览器中匹配，不是每个字母都请求 Atlas。日文数据只补充名字，不混用 JP 战斗数值。
每日角色是发现推荐，不是经过验证的配队；技能和宝具的多个版本不是同时装备的额外能力，本项目不是伤害模拟器。
Combat role / Team suggestions 已移除。数据来源和角色素材归属见页面底部。
AI 使用、个人修改和验证证据，仍需另外整理进课程过程文档。
