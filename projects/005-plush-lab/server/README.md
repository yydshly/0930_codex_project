# 毛绒工作室 · 本地 AI 接口契约

这次扩展提供本地接口和数据校验，外部 AI 提供方尚未启用。接口不会读取 API 密钥，也不会把对话或笔记发送到外部服务；`/api/status` 始终返回 `ready: false`，有效对话请求返回明确的 `503 ai_not_enabled`。本地笔记、页面内提醒、互动和成长记录可独立使用。

## 本地运行

需要 Node.js 22 或以上，无需安装第三方依赖。在项目仓库根目录启动：

```powershell
node projects/005-plush-lab/server/companion-server.mjs
```

接口监听 `http://127.0.0.1:8876`。原先 `8875` 的静态网页服务保持独立。可以用 `PLUSH_AI_PORT` 调整本地接口端口，但网页连接地址也需要对应修改。

默认仅允许 `http://127.0.0.1:8875`、`http://localhost:8875` 和本地接口自身来源。若本地网页使用其他端口，可显式配置 `PLUSH_APP_ORIGIN`，值只能是准确的协议、主机和端口，不能用 `*`。浏览器的 `localhost` 和 `127.0.0.1` 使用不同的本地存储，建议固定使用已有创作所在的来源。

## 接口

- `GET /api/status`：返回 `{ready, model, message}`，不返回密钥或用户数据。
- `POST /api/chat`：必须来自允许的网页来源，使用 `Content-Type: application/json` 和 `X-Plush-Client: companion-studio`。本版本仅校验请求，然后返回未启用状态。

对话请求字段：

```json
{
  "messages": [{"role": "user", "text": "帮我记下今天完成了画稿。"}],
  "companion": {"name": "秋日小梨", "personality": "playful"},
  "memories": [],
  "now": "2026-10-02T16:00:00+08:00",
  "timezone": "Asia/Shanghai"
}
```

请求最多 32 KiB；最多 20 条对话，每条 2,000 字，总计 16,000 字；最多 12 条主动分享的记忆，每条标题 120 字、正文 1,000 字，总计 8,000 字。伙伴性格与小世界保持一致：`calm`、`curious`、`playful`。

未来 AI 返回的契约为 `{reply, action, suggestion}`。动作限定 `none/greet/jump/fetch`；建议仅为可编辑的 `note` 或 `reminder` 草稿，确认保存仍由用户操作。提醒时间需要完整日期、时间和时区；不明确的时间保持 `dueAt: null`，日期必须有效且在未来。普通笔记没有到期时间。

## 后续真实 AI 接入

需要先选定提供方并明确授权传输范围，再实现提供方适配器。未来界面应在首次使用时说明发送到哪家服务、发送最近哪些对话、哪些笔记由用户主动选择共享；不应把全量笔记或旧创作默默作为上下文。

若选择 OpenAI，可沿用官方 [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses) 和 [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) 契约。服务端才能持有密钥，禁止把密钥写入网页、链接、浏览器本地存储或聊天记录。`store: false` 用于关闭 Response 对象的保存，并不等同于所有服务端数据保留规则。

提供方适配器仍需补齐超时、请求节流、并发上限、上游错误脱敏、拒绝回答与不完整输出的处理。本版本没有实现外部请求，也没有验证任何真实模型的连通性。

## 验证

```powershell
node --test projects/005-plush-lab/tests/companion-ai.test.mjs
```

测试覆盖请求与草稿契约、真实日期与时区、未来时间校验、正文上限、本机 Host、来源许可、预检、必需客户端标头、JSON 和 32 KiB 上限。所有 HTTP 测试只请求测试进程中的本地服务。
