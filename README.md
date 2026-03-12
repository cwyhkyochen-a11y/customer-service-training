# 容易学 - 话术辅助系统 v1.0 开发文档

## 项目概述
客服话术学习与辅助系统，包含运营后台（Admin）和客户端（Client）两个前端应用，共享数据库和后端API。

## 技术栈
- **框架**: Next.js 16 (React 19 + TypeScript)
- **样式**: Tailwind CSS v4 + shadcn/ui
- **数据库**: SQLite (better-sqlite3) + Drizzle ORM
- **认证**: JWT (jose库), Bearer Token, Cookie存储, 7天有效期
- **部署**: PM2 进程管理

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
│   │       │   ├── (dashboard)/
│   │       │   │   ├── layout.tsx        # 侧边栏布局
│   │       │   │   ├── page.tsx          # 首页(功能导航)
│   │       │   │   ├── accounts/         # 账号管理
│   │       │   │   ├── models/           # 模型管理
│   │       │   │   ├── prompts/          # 提示词管理
│   │       │   │   ├── documents/        # 文档管理 + 思维导图 + PPT
│   │       │   │   ├── customers/        # 虚拟顾客管理
│   │       │   │   ├── courses/          # AI教学课程
│   │       │   │   ├── records/          # 练习记录
│   │       │   │   ├── profiles/         # 客服档案
│   │       │   │   └── usage/            # 用量统计
│   │       │   └── api/
│   │       │       ├── auth/             # 管理端登录
│   │       │       ├── users/            # 用户CRUD
│   │       │       ├── models/           # 模型配置CRUD
│   │       │       ├── prompts/          # 提示词配置
│   │       │       ├── documents/        # 文档上传+思维导图+PPT
│   │       │       ├── customers/        # 虚拟顾客CRUD
│   │       │       ├── courses/          # 课程+知识点CRUD
│   │       │       ├── records/          # 练习记录查询
│   │       │       ├── profiles/         # 客服档案
│   │       │       ├── usage/            # 用量统计API
│   │       │       └── client/           # 客户端专用API
│   │       │           ├── auth/login/   # 客户端登录
│   │       │           ├── documents/    # 文档查看
│   │       │           ├── courses/      # 教学(start/chat/quit)
│   │       │           ├── customers/    # 对练(start/chat/quit)
│   │       │           ├── ai-assist/    # AI辅助对话
│   │       │           ├── records/      # 练习记录
│   │       │           └── profile/      # 个人档案
│   │       ├── lib/
│   │       │   ├── ai.ts               # LLM调用(callAI)+用量记录
│   │       │   ├── api-utils.ts        # 鉴权+响应工具
│   │       │   ├── api-client.ts       # 前端API客户端
│   │       │   └── file-parser.ts      # 文档解析(xlsx/docx)
│   │       └── components/
│   │           ├── sidebar.tsx          # 侧边栏导航
│   │           ├── mindmap-tree.tsx     # 思维导图树
│   │           └── node-selector.tsx    # 节点多选器
│   └── client/          # 客户端 
│       └── src/
│           ├── app/
│           │   ├── login/page.tsx
│           │   ├── (main)/
│           │   │   ├── layout.tsx        # 导航栏布局
│           │   │   ├── page.tsx          # 首页(功能导航)
│           │   │   ├── documents/        # 文档学习
│           │   │   ├── courses/          # AI教学
│           │   │   ├── customers/        # 虚拟顾客对练
│           │   │   ├── ai-assist/        # AI辅助对话
│           │   │   ├── records/          # 练习记录
│           │   │   └── profile/          # 我的档案
│           │   └── api/client/           # Route Handler代理(55s超时)
│           ├── lib/
│           │   └── api.ts               # 前端API客户端
│           └── components/
│               ├── nav-bar.tsx           # 侧边栏+底部Tab
│               ├── chat-interface.tsx    # 聊天界面
│               ├── mindmap-tree.tsx      # 思维导图
│               └── progress-bar.tsx      # 进度条
└── DESIGN_SYSTEM.md     # UI设计规范
```

## 数据库表 (13张)
| 表名 | 说明 |
|------|------|
| users | 用户(admin/client角色) |
| sessions | JWT会话 |
| model_configs | AI模型配置 |
| documents | 话术文档 |
| document_slides | PPT幻灯片(按页存储) |
| virtual_customers | 虚拟顾客角色 |
| courses | AI教学课程 |
| knowledge_points | 知识点 |
| practice_records | 练习记录 |
| user_knowledge_progress | 知识点掌握进度 |
| user_customer_results | 顾客对练结果 |
| llm_usage_logs | LLM调用用量日志 |
| prompt_configs | 提示词自定义配置 |

## AI场景 (10个)
| scene_id | 说明 |
|----------|------|
| mindmap | 文档→思维导图JSON |
| mindmap_structure | 长文档骨架提取 |
| mindmap_chunk | 长文档分块生成 |
| customer_generate | 生成虚拟顾客角色 |
| customer_chat | 虚拟顾客对话 |
| customer_feedback | 话术评价 |
| teaching_start | AI教学出题 |
| teaching_chat | AI教学评分 |
| slides | PPT生成 |
| knowledge_generate | 知识点提取 |
| ai_assist | AI辅助对话 |

## 核心流程
1. **文档处理**: 上传xlsx/docx → 解析内容 → LLM生成思维导图JSON → 存储
2. **PPT生成**: 思维导图节点 → LLM逐节点生成HTML幻灯片 → 按页存储
3. **虚拟顾客**: 选择思维导图节点 → LLM生成顾客角色 → 客服对练 → LLM评价
4. **AI教学**: 课程绑定知识点 → LLM出题 → 客服答题 → LLM评分(≥7分掌握)
5. **AI辅助对话**: 选文档(最多5个) → 输入用户消息+背景 → LLM拟回复

