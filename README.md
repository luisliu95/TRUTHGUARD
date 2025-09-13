# TruthGuard · 事实与观点核查（前端原型）

本仓库是一个纯前端演示应用，包含三个页面：档案馆、真相追踪、我的真话单。支持调用火山方舟 Ark Chat Completions（可直连或通过本地 Node 代理转发）。

## 目录结构
- `index.html`：页面结构与样式（Tailwind CDN、Font Awesome）以及设置/详情对话框
- `app.js`：前端逻辑（渲染/筛选/订阅/提交核查/API 调用/结果展示/本地存储/系统指令/JSON 解析）
- `mock-data.js`：本地示例数据与 `localStorage` 读写
- `server.js`：可选的本地 Node 代理，将前端请求转发至 Ark，规避 CORS/网络限制

## 快速启动
1) 本地静态服务打开页面（避免直接双击文件导致资源权限问题）
- Python: `python -m http.server 5500`
- 或 Node: `npx http-server -p 5500 --yes`
- 访问 `http://localhost:5500/index.html`

2) 可选：启动本地代理（推荐）
- 需要 Node 18+：`node server.js`
- 看到日志 `[proxy] listening on http://localhost:3000` 即成功

## 使用说明
1) 打开页面右上角“设置”，填入：
- API Key：你的 ARK_API_KEY
- Model ID：推荐填写端点 ID（以 `ep-` 开头），或确保模型对你的账号已开通
- 使用本地代理：勾选后前端调用 `http://localhost:3000/api/chat`，由 `server.js` 转发至 Ark
- System Prompt（可选）：为模型设置系统角色/输出格式约束（会作为 `system` 消息插入到请求首位）

2) 在“真相追踪”输入文本（或图片 URL）并提交
- 纯文本：请求体 `messages: [{role:'user', content:'...'}]`
- 图片 URL：自动发送多模态 `content: [{type:'image_url', image_url:{url}}, {type:'text', text:'...'}]`

3) 结果展示
- 如果模型返回结构化 JSON（支持 ```json fenced 或裸 JSON），前端会解析字段并结构化展示：
  - `verdict: true|partial|false|unknown`
  - `confidence: 0-100`
  - `evidence: [{source,url,excerpt}]`
  - `reasoning`
- 非 JSON 返回则显示原文说明；所有结果还会写入“我的真话单（历史）”。

## 关键点与默认行为
- CDN 依赖：`cdn.tailwindcss.com` 与 `cdnjs.cloudflare.com` 若被网络屏蔽，页面会“无样式”。可临时切外网，或改为本地构建 Tailwind 与图标（未在本仓库内启用）。
- API 直连端点：`https://ark.cn-beijing.volces.com/api/v3/chat/completions`
- 超时：前端与代理均设置 30s 超时，失败时前端会本地回退并在“模型说明”里显示错误原因。
- 本地存储键：`ark_api_key`、`ark_model_id`、`ark_system_prompt`、`use_local_proxy`、`subs`、`history`。

## 常见问题（排查指引）
- 404 / ModelNotOpen：账号未开通该模型，或使用了模型名而非可用端点；改填 `ep-...` 或在控制台开通模型/分配配额。
- 超时（AbortError）：
  - 直连失败：多为网络策略/CORS 导致，建议勾选“使用本地代理”并运行 `node server.js`。
  - 仍失败：用同一 Key/端点执行 curl 最小请求验证；若 curl 也慢/失败，检查端点区域、状态（Running）、是否公网可访问、账号权限。
- 多模态：若端点不支持图像，使用图片 URL 可能失败；可改用纯文本测试。

## 示例 System Prompt
使模型输出固定 JSON（便于前端解析）：
```
你是事实核查助手。只输出 JSON 且仅包含以下字段：
{"verdict":"true|partial|false|unknown","confidence":0-100,"evidence":[{"source":"string","url":"string","excerpt":"string"}],"reasoning":"string"}
不得输出多余文本或代码块围栏。无证据则 evidence 为空数组。
```

## 代理端点说明（server.js）
- 路由：`POST /api/chat`
- 入参（JSON）：`{ model: string, messages: array }`
- 身份：从请求头 `X-ARK-API-Key`、body `apiKey`、或环境 `ARK_API_KEY` 中取
- 上游：转发到 `https://ark.cn-beijing.volces.com/api/v3/chat/completions`
- CORS：已开放 `Access-Control-Allow-Origin: *`

## 许可
仅用于演示与教学用途，请勿在前端明文分发生产密钥。建议生产环境改为后端调用并添加鉴权与配额控制。

