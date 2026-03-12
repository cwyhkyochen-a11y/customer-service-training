# 容易学 - 客服话术辅助系统

一款面向客服团队的话术学习与对练平台。运营人员上传话术文档，系统自动提炼知识结构；客服通过 AI 模拟对话进行实战练习，逐步提升话术能力。

## 功能一览

### 运营后台 (Admin)
- **账号管理** — 新增/管理客服和管理员账号
- **模型配置** — 接入 Kimi / MiniMax 大模型
- **提示词管理** — 配置各 AI 场景的提示词（虚拟顾客、教学、评价等）
- **文档管理** — 上传话术文档（支持 xlsx / docx），自动生成思维导图、PPT
- **虚拟顾客** — 管理虚拟顾客角色，设定难度和特征
- **AI 教学课程** — 创建课程，关联知识点
- **练习记录** — 查看所有客服的对练和答题记录
- **客服档案** — 查看每位客服的能力成长数据
- **用量统计** — 监控各模型的调用次数和 token 消耗

### 客户端 (Client)
- **文档学习** — 浏览话术文档和思维导图
- **AI 教学** — AI 出题考试，自动评分，≥7 分标记为已掌握
- **虚拟顾客对练** — 与 AI 扮演的顾客对话，结束时获得话术评价
- **AI 辅助对话** — 选择多份文档作为参考，输入场景和客户消息，AI 给出建议回复
- **练习记录** — 回顾自己的答题和对练历史
- **个人档案** — 查看能力雷达图、对练分析、知识掌握度

## 技术栈

- **框架**: Next.js 16 (App Router) + React 19 + TypeScript
- **样式**: Tailwind CSS v4 + shadcn/ui
- **数据库**: SQLite (better-sqlite3) + Drizzle ORM
- **认证**: JWT (jose 库), Cookie 存储, 7 天有效期
- **进程管理**: PM2

## 快速开始

### 1. 环境要求

- Node.js >= 22
- pnpm >= 9

### 2. 安装依赖

```bash
git clone https://github.com/cwyhkyochen-a11y/customer-service-training.git
cd customer-service-training
pnpm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填写必要的配置：

| 变量 | 说明 | 必填 |
|------|------|------|
| `JWT_SECRET` | JWT 签名密钥，改为任意随机字符串 | ✅ |
| `KIMI_API_KEY` | 月之暗面（Kimi）API Key | 至少填一个 |
| `MINIMAX_API_KEY` | MiniMax API Key | 至少填一个 |
| `ADMIN_PORT` | 运营后台端口（默认 3002） | ❌ |
| `CLIENT_PORT` | 客户端端口（默认 3000） | ❌ |

### 4. 初始化数据库

```bash
pnpm db:migrate
```

这会创建数据库并插入默认管理员账号：
- **用户名**: admin
- **密码**: Admin@2024

### 5. 启动开发环境

```bash
# 同时启动运营后台和客户端
pnpm dev

# 或分别启动
pnpm dev:admin   # 运营后台 → http://localhost:3002
pnpm dev:client  # 客户端 → http://localhost:3000
```

打开浏览器访问：
- 运营后台: http://localhost:3002
- 客户端: http://localhost:3000

## 生产部署

### 构建

```bash
pnpm build
```

### PM2 部署

```bash
# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs cs-admin
pm2 logs cs-client

# 重启
pm2 restart cs-admin
pm2 restart cs-client
```

## 常用命令

```bash
pnpm dev:admin    # 开发模式 - 运营后台
pnpm dev:client   # 开发模式 - 客户端
pnpm build        # 构建所有应用
pnpm db:migrate   # 初始化/迁移数据库
```

## 项目结构

```
customer-service-training/
├── packages/
│   ├── shared/          # 共享类型定义
│   └── database/        # Drizzle ORM schema + 迁移脚本
├── apps/
│   ├── admin/           # 运营后台
│   │   └── src/
│   │       ├── app/
│   │       │   ├── login/page.tsx
│   │       │   └── (dashboard)/
│   │       │       ├── page.tsx          # 首页(功能导航)
│   │       │       ├── accounts/         # 账号管理
│   │       │       ├── models/           # 模型管理
│   │       │       ├── prompts/          # 提示词管理
│   │       │       ├── documents/        # 文档管理 + 思维导图 + PPT
│   │       │       ├── customers/        # 虚拟顾客管理
│   │       │       ├── courses/          # AI教学课程
│   │       │       ├── records/          # 练习记录
│   │       │       ├── profiles/         # 客服档案
│   │       │       └── usage/            # 用量统计
│   │       └── lib/
│   │           ├── ai.ts               # LLM调用 + 用量记录
│   │           ├── api-utils.ts        # 鉴权 + 响应工具
│   │           └── file-parser.ts      # 文档解析(xlsx/docx)
│   └── client/          # 客户端
│       └── src/
│           ├── app/
│           │   ├── login/page.tsx
│           │   └── (main)/
│           │       ├── documents/        # 文档学习
│           │       ├── courses/          # AI教学
│           │       ├── customers/        # 虚拟顾客对练
│           │       ├── ai-assist/        # AI辅助对话
│           │       ├── records/          # 练习记录
│           │       └── profile/          # 我的档案
│           └── lib/
│               └── api.ts               # 前端API客户端
├── ecosystem.config.js  # PM2 配置
└── DESIGN_SYSTEM.md     # UI 设计规范
```

## AI 场景

系统包含 10 个 AI 场景，对应不同的业务功能：

| scene_id | 用途 |
|----------|------|
| `mindmap` | 文档 → 思维导图 JSON |
| `mindmap_structure` | 长文档骨架提取 |
| `mindmap_chunk` | 长文档分块生成思维导图 |
| `customer_generate` | 生成虚拟顾客角色 |
| `customer_chat` | 虚拟顾客对练对话 |
| `customer_feedback` | 话术评价与建议 |
| `teaching_start` | AI 教学出题 |
| `teaching_chat` | AI 教学答题评分 |
| `slides` | PPT 幻灯片生成 |
| `knowledge_generate` | 知识点自动提取 |

## 许可证

私有项目，未经授权禁止分发。
