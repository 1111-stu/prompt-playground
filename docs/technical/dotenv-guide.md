## ENV 加解密与迁移实施手册

### 目的与范围
- 将现有项目的 `.env` 加/解密方案标准化并可复用，支持本地开发、多人协作与 CI/CD。
- 适用于 Nuxt 3/Vue/Node 任意项目；核心依赖 `@dotenvx/dotenvx` 与自研脚本 `dev-tools/env/encrypt-decrypt.js`。

### 技术栈与核心原理
- **工具**: `@dotenvx/dotenvx`（加密/解密 CLI）
- **密钥**: `DOTENV_PRIVATE_KEY`（从根目录 `.env.keys` 或系统环境变量读取）
- **默认文件流转**:
  - 加密: `.env` → `.env.dev.vault`
  - 解密: `.env.dev.vault` → `.env`
- **增强特性**:
  - 变更检测（新增/修改/删除）
  - 增量处理（仅处理勾选的差异项）
  - 自动备份、交互确认、静默/强制模式

### 目录与命名约定
- 脚本放置: `dev-tools/env/encrypt-decrypt.js`
- 密钥文件: `.env.keys`（不入库）
- Vault 命名:
  - 开发: `.env.dev.vault`
  - 生产: `.env.production.vault`（可按需扩展：`.env.staging.vault` 等）

### 安装与初始化
- 安装依赖
```bash
pnpm add @dotenvx/dotenvx
pnpm add -D chalk inquirer ora cli-table3 commander
```

- 添加脚本命令（`package.json`）
```json
{
  "scripts": {
    "env:encrypt": "node dev-tools/env/encrypt-decrypt.js encrypt",
    "env:decrypt": "node dev-tools/env/encrypt-decrypt.js decrypt"
  }
}
```

- 复制脚本
  - 将 `dev-tools/env/encrypt-decrypt.js` 拷贝到新项目同路径（或自定义路径并同步更新 `package.json` 命令）。

### 密钥管理
- 生成密钥（推荐 Base64 32 字节）
```bash
node -e "console.log('DOTENV_PRIVATE_KEY=' + require('crypto').randomBytes(32).toString('base64'))" > .env.keys
```

- 文件内容示例
```bash
DOTENV_PRIVATE_KEY=YOUR_BASE64_KEY
```

- CI 中不提交 `.env.keys`。在平台的 Secret/Env 中配置 `DOTENV_PRIVATE_KEY`。

### Git 策略（强烈建议）
```gitignore
.env
.env.*
!.env*.vault
.env.keys
```
- 只提交 `.env*.vault`，所有明文 `.env*` 与 `.env.keys` 一律忽略。

### 使用指南

- 快速开始（本地）
```bash
# 首次加密（将本地 .env 加密为 .env.dev.vault）
pnpm env:encrypt

# 本地调试前解密（将 .env.dev.vault 解密为 .env）
pnpm env:decrypt

# 指定文件（如生产）
pnpm env:encrypt -- .env.production
pnpm env:decrypt  -- .env.production
```

- 增量更新与交互
  - 脚本会对比“新明文”和“旧状态（或解密后的旧密文）”，列出差异并供你勾选；只处理勾选的项。
  - 选项：
    - `--force`: 跳过交互，应用所有变更
    - `--no-backup`: 不生成备份
    - `--quiet`: 减少输出（仍显示关键结果）

```bash
# 无交互自动化（CI 常用）
pnpm env:encrypt -- --force --no-backup --quiet
```

- 多环境文件
```bash
# 开发
pnpm env:encrypt -- .env
pnpm env:decrypt  -- .env

# 预发/生产
pnpm env:encrypt -- .env.staging
pnpm env:decrypt  -- .env.staging

pnpm env:encrypt -- .env.production
pnpm env:decrypt  -- .env.production
```

### CI/CD 集成

- GitHub Actions 示例
```yaml
name: build
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm i --frozen-lockfile

      - name: Decrypt env
        env:
          DOTENV_PRIVATE_KEY: ${{ secrets.DOTENV_PRIVATE_KEY }}
        run: |
          pnpm env:decrypt -- .env.production

      - run: pnpm build
```

- Docker 构建示例（多阶段）
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm i --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 解密（需在构建时提供 DOTENV_PRIVATE_KEY）
RUN DOTENV_PRIVATE_KEY=$DOTENV_PRIVATE_KEY pnpm env:decrypt -- .env.production
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.output ./.output
CMD ["node", ".output/server/index.mjs"]
```

- Vercel
  - 将 `DOTENV_PRIVATE_KEY` 配为项目 Environment Variable。
  - Build Command:
```bash
pnpm i --frozen-lockfile && pnpm env:decrypt -- .env.production && pnpm build
```

### Next 集成建议
- 本地开发
```bash
pnpm env:decrypt && pnpm dev
```
- 构建/启动前确保 `.env` 明文已解密在工作目录。
- 避免在日志打印敏感变量；使用 Nuxt 运行时配置加载。

### 安全与最佳实践
- 只提交 vault 文件，严禁提交明文。
- CI Secret 最小权限，禁止日志泄露。
- 机器权限隔离：构建机与运行机分离时，按需二次解密或以平台方式注入变量。
- 定期轮换密钥：
  1. 使用旧密钥解密得到明文
  2. 替换为新密钥（更新 `.env.keys` 或 CI Secret）
  3. 重新加密并提交新的 `.vault`

### 故障排查
- 提示缺少 `DOTENV_PRIVATE_KEY`：
  - 检查 `.env.keys` 是否存在且格式正确；或在终端/CI 注入环境变量。
- 解密失败：
  - 确认 vault 文件与密钥匹配；尝试 `--quiet` 关闭多余输出，关注错误栈。
- 变更没有生效：
  - 是否勾选了对应项；或使用 `--force` 全量应用。
- CI 无交互：
  - 使用 `--force --no-backup --quiet`。

### FAQ
- 可以不落盘 `.env` 吗？
  - 可以改为管道输出 `--stdout` 并 `export` 到 shell，但复杂且易泄漏，推荐落盘且限制访问。
- Vault 命名可以改吗？
  - 可以。若统一采用 `.env.vault`，调整脚本中目标命名逻辑及 CI 命令。

### 迁移步骤清单
- 复制 `dev-tools/env/encrypt-decrypt.js`
- 安装依赖并更新 `package.json` 脚本
- 生成 `.env.keys` 或在 CI 配置 `DOTENV_PRIVATE_KEY`
- 配置 `.gitignore` 仅提交 `*.vault`
- 执行 `pnpm env:encrypt` / `pnpm env:decrypt` 验证
- 将解密步骤接入 CI/CD 构建流程

### 附录：脚本行为摘要（`dev-tools/env/encrypt-decrypt.js`）
- 自动读取密钥（优先 `.env.keys`，回退 `process.env`）。
- 解析 env 文件为 key-value，比较差异（新增/修改/删除）。
- 交互勾选差异项（或 `--force` 全选）。
- 针对差异项生成临时 `.env`，调用 `@dotenvx/dotenvx` 执行 `encrypt|decrypt --stdout`，解析并合并到目标文件。
- 可自动备份目标文件（可用 `--no-backup` 关闭）。
- 支持 `--quiet` 压缩输出，保留关键结果提示。

如果你希望，我可以根据你的下一个项目路径与环境命名规范，出一份定制化的脚本和 CI 文件。

- 已将落地清单整理为结构化 md 文档，包含命令示例、Git 策略、CI 示例与排障指南，便于直接存档与迁移使用。