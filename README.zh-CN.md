# Seedream 5.0 Pro 图像生成技能

把 Seedream 5.0 Pro 图像生成接入你的 AI Agent。

**Seedream 5.0 Pro • 安装 • API Key • [HiAPI](https://www.hiapi.ai/zh)**

[免费获取 API Key](https://www.hiapi.ai/zh/register) · [查看价格](https://www.hiapi.ai/zh/pricing) · [HiAPI 文档](https://docs.hiapi.ai) · [Prompt Gallery](https://github.com/HiAPIAI/hiapi-skills) · [全部 HiAPI Skills](https://github.com/HiAPIAI/hiapi-skills)

Languages: [English](README.md) | [简体中文](README.zh-CN.md)

> **HiAPI Matrix:** 🎨 [Image Prompts](https://github.com/HiAPIAI/hiapi-skills) · 🎬 [Video Prompts](https://github.com/HiAPIAI/awesome-seedance-2-0-prompts) · 🛠️ **Agent Skills (you are here)** · 🤖 [Remote MCP](https://docs.hiapi.ai/for-ai/) · 📖 [API Docs](https://docs.hiapi.ai)

---

> AI Agent? 跳过 README，直接看 [llms-install.md](llms-install.md)，里面有专为 Agent 准备的安装步骤和错误处理规则。

---

## 这是什么？

一个适用于 OpenClaw / Claude Code / OpenCode / Codex 类 Agent 的 AI 技能插件。安装后，你的 AI Agent 可以通过 HiAPI 使用 Seedream 5.0 Pro 进行图像生成。

HiAPI 是为开发者打造的 AI API 平台：一个 API，所有 AI 模型。图像、视频、音乐和文本，一个密钥全搞定。

| 技能 | 描述 | 模型 |
| --- | --- | --- |
| HiAPI Seedream 5.0 Pro | 文生图、图生图 | Seedream 5.0 Pro 系列 |

---

## 生成前先找参考

如果你需要一个已经验证过的起点，先看 [HiAPI Skills directory](https://github.com/HiAPIAI/hiapi-skills)。它包含真实效果图、完整提示词、画面比例、HiAPI Draw 链接和来源署名。选中一个配方后，把人物、产品、城市、品牌或文案换成自己的内容，再用这个 skill 生成改写后的结果。

`0.2.0` 已切换到当前接口契约：使用 `quality` 代替 `resolution`，文生图和图生图统一使用 8 种比例，并支持生产回调。旧版客户端会生成不兼容请求，需要升级。

如果生成的图是要作为视频的起始帧，接下来用 [hiapi-video-prompt-generator-skill](https://github.com/HiAPIAI/hiapi-video-prompt-generator-skill) 规划镜头，再交给 [hiapi-seedance-2-0-video-skill](https://github.com/HiAPIAI/hiapi-seedance-2-0-video-skill)（图生视频）出片。

如果要给 Agent 选择更多 HiAPI 工作流，查看 [hiapi-skills](https://github.com/HiAPIAI/hiapi-skills)；如果客户端支持远程 MCP，可以连接 `https://mcp.hiapi.ai/mcp`。

---

## 安装

### 一行命令（推荐）

```bash
npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill -y
```

安装脚本会自动检测 Codex（`~/.codex/skills`）和 Claude Code（`~/.claude/skills`）。如果两个都存在，`-y` 会同时装到两个目录。指定 Agent 或自定义目录：

```bash
npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill --codex          # 只装到 ~/.codex/skills
npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill --claude         # 只装到 ~/.claude/skills
npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill --target=/path   # 自定义目录
AGENT_SKILLS_DIR=/path npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill -y
```

脚本会先把现有正式目录或旧目录备份到 `~/.cache/hiapi-skill-backup/`，再安装当前版本；已有 `.env` 会保留，同时会检查 `HIAPI_API_KEY` 是否已设置。

### OpenClaw

```bash
openclaw skills add https://github.com/HiAPIAI/hiapi-seedream-5-0-pro-skill
```

### 手动安装（任意 Agent）

```bash
git clone https://github.com/HiAPIAI/hiapi-seedream-5-0-pro-skill.git
export AGENT_SKILLS_DIR="/path/to/your/agent/skills"
mkdir -p "$AGENT_SKILLS_DIR"
cp -R hiapi-seedream-5-0-pro-skill "$AGENT_SKILLS_DIR/hiapi-seedream-5-0-pro"
```

将 `AGENT_SKILLS_DIR` 替换为你的 Agent 技能目录。
如果从早期版本手动升级，请先把旧的 `hiapi-seedream-5-pro` 目录移出 skills 目录，避免 Agent 同时加载两份技能。推荐安装器会自动完成迁移和备份。

### Agent 自动安装（复制给你的 Agent）

```text
安装 HiAPI Seedream 5.0 Pro 图像生成技能：

1. 运行：npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill -y
   （会自动检测 Codex / Claude Code 的 skills 目录）
2. 从 https://www.hiapi.ai/zh/dashboard/api-keys 获取并设置环境变量 HIAPI_API_KEY
3. 读取 SKILL.md 了解使用方法
```

---

## 获取 API Key

1. 打开 [免费获取 API Key](https://www.hiapi.ai/zh/register)
2. 登录或注册 HiAPI 账号
3. 创建新的 API Key
4. 在运行 Agent 的终端设置环境变量：

```bash
export HIAPI_API_KEY="your_hiapi_api_key_here"
export HIAPI_BASE_URL="https://api.hiapi.ai"
```

检查配置：

```bash
node scripts/check-config.mjs
```

联网检查：

```bash
node scripts/check-config.mjs --live
```

---

## Seedream 5.0 Pro 图像生成

通过自然语言让你的 AI Agent 生成图片，也可以给图生图模型传参考图 URL。

### 功能

- 文生图：描述你想要的画面，生成图片
- 图生图:用 `seedream-5.0-pro/image-to-image`(别名 `i2i`),`--input-url` 传 1-10 张参考图
- 模型变体：`seedream-5.0-pro/text-to-image`(别名 `t2i`,默认)、`seedream-5.0-pro/image-to-image`(别名 `i2i`)
- 画面比例：两种模型都支持 `1:1`（默认）、`4:3`、`3:4`、`16:9`、`9:16`、`2:3`、`3:2`、`21:9`
- 质量档位：`basic`（默认，1K，$0.05/张）或 `high`（2K，$0.10/张）
- 参考图：图生图支持 1-10 个 HTTP(S) JPG/PNG/WebP URL，每张最大 10 MB，不支持 SVG
- 提示词：4-5000 字符，建议尽量控制在约 600 个英文词以内
- 生产回调：顶层传 HTTPS `callback.url`，`callback.when` 固定为 `final`
- 本地输出：图片会保存到 `outputs/`
- URL 输出：如果 HiAPI 返回图片 URL，Agent 会直接返回 URL
- 错误提示：未配置 Key、Key 无效、余额不足、限流、内容安全拦截都有明确下一步

### 使用示例

直接和你的 AI Agent 对话：

> 使用 `$hiapi-seedream-5-0-pro` 生成一张海面日落的 16:9 图片。

> 用 HiAPI Seedream 5.0 Pro 创建一个极简 Logo，比例 1:1。

> 生成一张 9:16 社交媒体海报，标题文字是「Build Faster」。

### 命令行脚本

```bash
node scripts/hiapi-seedream-5-pro.mjs \
  --prompt "Create a cinematic mountain lake photo at sunset" \
  --aspect-ratio 16:9 \
  --quality basic
```

图生图：

```bash
node scripts/hiapi-seedream-5-pro.mjs \
  --model seedream-5.0-pro/image-to-image \
  --prompt "把这张产品图改成干净高级的棚拍广告图" \
  --input-url "https://example.com/product.jpg" \
  --aspect-ratio 16:9 \
  --quality high
```

自定义输出目录：

```bash
node scripts/hiapi-seedream-5-pro.mjs \
  --prompt "Minimal poster for an AI image API, premium tech brand style" \
  --aspect-ratio 1:1 \
  --output-dir ./outputs
```

生产回调：

```bash
node scripts/hiapi-seedream-5-pro.mjs \
  --prompt "高级产品发布海报" \
  --callback-url "https://your-domain.com/hiapi/callback" \
  --callback-when final \
  --no-wait
```

`success` 和 `fail` 都可能触发终态回调。服务端需要按 `taskId` 幂等处理，并使用配置的回调密钥对原始请求体校验 `X-HiAPI-Timestamp` 与 `X-HiAPI-Signature`，采用常量时间比较并拒绝过期时间戳。本地调试或回调失败补偿再使用 `GET /v1/tasks/:id`。

---

## 文件结构

```text
.
├── README.md
├── README.zh-CN.md
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── api.md
│   └── output.md
├── scripts/
│   ├── check-config.mjs
│   ├── hiapi-seedream-5-pro.mjs
│   └── lib/
│       └── seedream-5-pro.mjs
├── tests/
│   └── seedream-5-pro.test.mjs
└── llms-install.md
```

---

## 常见问题

| 问题 | 解决方案 |
| --- | --- |
| `HIAPI_API_KEY is required` | 去 [免费获取 API Key](https://www.hiapi.ai/zh/register) 创建 Key，然后设置 `HIAPI_API_KEY`。 |
| `401 Unauthorized` | 检查 API Key 是否正确，或重新生成 Key。 |
| `402 Payment Required` / 余额不足 | 进入 [HiAPI Dashboard](https://www.hiapi.ai/zh/dashboard) 检查账号状态。 |
| `429 Too Many Requests` | 稍后重试，或减少并发生成请求。 |
| 内容被拦截 | 提示词触发了内容安全策略，请修改描述。 |
| 没有图片输出 | 检查任务返回内容；该 skill 期望任务成功后在 `data.output[]` 中返回图片 URL 或 data URI。 |
| `--resolution` 已不可用 | 1K 使用 `--quality basic`，2K 使用 `--quality high`。 |
| 有可选更新 | CLI 启动时会检查 HiAPI skills 索引。如果只是建议升级，会打印升级命令并继续执行。 |
| 必须更新 | CLI 会停止并打印必须执行的升级命令。运行 `npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill -y` 后重启 Agent。 |

只有在离线或内网环境无法访问 skills 索引时，才建议设置 `HIAPI_SKIP_UPDATE_CHECK=1` 跳过检查。

---

## 兼容性

| Agent | 安装方式 |
| --- | --- |
| Codex | `npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill --codex` |
| Claude Code | `npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill --claude` |
| OpenClaw | `openclaw skills add https://github.com/HiAPIAI/hiapi-seedream-5-0-pro-skill` |
| OpenCode | `AGENT_SKILLS_DIR=~/.opencode/skills npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill -y` |
| Cursor / 其他 Agent | `npx -y github:HiAPIAI/hiapi-seedream-5-0-pro-skill --target=/your/skills/dir` |

---

## 许可证

MIT

---

[HiAPI](https://www.hiapi.ai/zh) — 一个 API，所有 AI 模型
