# AI 模型网关 v0.1 · 配置和验收

当前只把 DeepSeek 作为默认且已配置的生产模型；千问（Qwen）适配器已编写，但如果未设置独立的 `DASHSCOPE_API_KEY` 则不可使用。**不会自动切换模型，也不会偷偷调用第二个收费服务。**

## 服务端模型映射

| provider | 密钥 | 默认模型 | API 地址 |
| --- | --- | --- | --- |
| `deepseek` | `DEEPSEEK_API_KEY` | `deepseek-flash` | `https://api.deepseek.com/chat/completions` |
| `qwen` | `DASHSCOPE_API_KEY` | `qwen-plus` | 新加坡旧兼容地址，或显式指定经校验的官方区域／Workspace 地址 |

`POST /api/interpret` 中 `provider` 是可选字段，省略时始终使用 `deepseek`。只接受 `deepseek` 或 `qwen`。密钥只能放在服务端环境变量中。

启用 Qwen 前需：
1. 在阿里云 Model Studio 创建对应区域的 Workspace、开通模型并获取 API Key；
2. Vercel Production 设置 `DASHSCOPE_API_KEY`；若使用新的 Workspace 专属域名，设置 `QWEN_CHAT_COMPLETIONS_URL` 为完整 `https://<workspace>.<region>.maas.aliyuncs.com/compatible-mode/v1/chat/completions`；
3. 再部署，并以真实请求验证输出、费用、失败行为和模型权限。不能仅凭构建 `READY` 宣称已接通。

不启用 Qwen 时，无需配置上述变量。默认的 DeepSeek 请求保持原模型、采样温度 `0.3`、额度约束与命盘事实核验。第二个模型没有独立密钥时请求返回 `503`，不会回退到其他模型产生意外费用。仍需开发面向普通用户的模型选择界面及跨模型自动比较，目前仅实现后端基础适配层。

## Redis / 全站预算

决定先暂缓 Redis：不安装任何 Vercel Marketplace 数据库、不设置 `AI_BUDGET_MODE=enforce`。代码保留，但当前不能保证按天／按月全站费用硬封顶。Vercel WAF 的单 IP 限流仍然有效；它不同于全站计数。

## 评测建议

在模型同时可用后，再对同样的输入、提示词、温度和描述明确度重复生成，记录每次具体模型标识、Token、AI 原文、事实核验及用户盲评。不同供应商的 Token 计费和参数解释并不完全一致，不能直接拿不同厂商的 raw token 数量比较成本。
