# Prompt-Playground开发文档

## 安装

### PNPM 版本要求

本项目使用 pnpm v10.14.0。请按照以下步骤确保使用正确的 pnpm 版本：

```bash
# 启用 Corepack（如果尚未启用）
corepack enable

# 安装指定版本的 pnpm
corepack prepare pnpm@10.14.0 --activate

# 验证 pnpm 版本
pnpm --version
```

### 安装依赖

确保安装依赖：

```bash
pnpm install
```


## 开发服务器

在 `http://localhost:3000` 上启动开发服务器：

```bash
pnpm dev
```

## 环境变量配置

项目使用加密的环境变量来增强安全性。请按照以下步骤设置环境变量：

### 解密环境变量

如果您已经获得了加密的 `.env.vault` 文件和 `.env.keys` 文件，可以使用以下命令解密环境变量：

```bash
pnpm env:decrypt
```

这将使用 `.env.keys` 中的私钥解密 `.env.vault` 文件，并生成 `.env` 文件。




### 创建新的环境变量

如果您需要创建新的环境变量文件，可以使用 `.env.example` 作为模板：

1. 根据您的环境设置适当的值
2. 使用以下命令加密环境变量：

```bash
pnpm env:encrypt
```

这将生成一个加密的 `.env.vault` 文件，可以安全地提交到代码仓库。


## 📋 开发规范

### Git 分支管理规范

#### 分支类型与命名规范

```bash
# 主要分支
prod          # 生产环境分支，只接受 release 分支的合并
dev           # 开发环境分支，所有 feature 分支的基础分支

# 功能开发分支格式：开发者/月日/类型/描述
daixon/2507/feat/user-authentication       # 新功能开发
daixon/2507/fix/login-bug                  # Bug 修复
daixon/2507/docs/update-readme             # 文档更新
daixon/2507/style/component-styling        # 样式调整
daixon/2507/refactor/api-optimization      # 代码重构
daixon/2507/test/unit-test-coverage        # 测试相关
daixon/2507/chore/dependency-update        # 其他维护性工作 (清理代码, 重构文件结构, 配置调整)
```

#### 分支类型说明

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能开发 | `daixon/2507/feat/user-dashboard` |
| `fix` | Bug 修复 | `daixon/2507/fix/memory-leak` |
| `docs` | 文档相关 | `daixon/2507/docs/api-documentation` |
| `style` | 样式修改（不影响功能） | `daixon/2507/style/button-themes` |
| `refactor` | 代码重构 | `daixon/2507/refactor/auth-module` |
| `test` | 测试相关 | `daixon/2507/test/component-testing` |
| `chore` | 其他维护性工作 (清理代码, 重构文件结构, 配置调整) | `daixon/2507/chore/webpack-config` |

#### 分支工作流程

```bash
# 1. 从 dev 分支创建功能分支
git checkout dev
git pull origin dev
git checkout -b daixon/2507/feat/new-feature

# 2. 开发完成后推送分支
git add .
git commit -m "feat(auth): add user login functionality"
git push origin daixon/2507/feat/new-feature

# 3. 创建 Pull Request 到 dev 分支
# 4. 代码审查通过后合并到 dev
# 5. 删除功能分支
git branch -d daixon/2507/feat/new-feature
```

### Commit 提交规范

#### Angular Commit Message 格式

采用 Angular 团队的 commit message 规范：

```
<type>: <subject>

<body>

<footer>
```

#### 提交类型 (type)

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: add user login functionality` |
| `fix` | Bug 修复 | `fix: resolve chart rendering issue` |
| `docs` | 文档更新 | `docs: update installation guide` |
| `style` | 格式修改（不影响代码逻辑） | `style(button): adjust padding and margins` |
| `refactor` | 代码重构 | `refactor: optimize user data fetching` |
| `test` | 测试相关 | `test: add unit tests for login component` |
| `chore` | 其他维护性工作 (清理代码, 重构文件结构, 配置调整) | `chore: update react to version 19` |
| `perf` | 性能优化 | `perf: optimize chart rendering performance` |
| `ci` | CI/CD 相关 | `ci: add automated testing workflow` |
| `build` | 构建系统修改 | `build: update build configuration` |


## 安全守则

- 不要将 `.env` 和 `.env.keys` 文件提交到代码仓库
- 只有 `.env.vault` 和 `.env.example` 文件可以安全地提交
- 团队成员之间应通过安全渠道共享 `.env.keys` 文件

其他内容待补充......
