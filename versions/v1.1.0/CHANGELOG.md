# v1.1.0 CHANGELOG

**发布日期**: 2026-03-12
**类型**: 迭代版本
**描述**: 客户端首页优化 — 新增使用引导和学习进度概览

---

## 变更内容

### ✨ 新增功能
- **学习进度概览**: 首页顶部三张渐变卡片，分别显示"知识点掌握数"、"对练次数及胜率"、"今日练习次数"
- **学习路径引导**: 6 个功能入口改为 2x2 网格布局，按推荐学习顺序排列
- **Stats API**: 新增 `GET /api/client/stats` 接口，返回用户学习统计数据

### 🎨 样式优化
- 进度卡片采用渐变背景 + 模糊光晕装饰 + 底部微可视化（进度条/圆点/脉冲指示器）
- 学习路径卡片采用渐变底色 + Step 标签 + hover 上浮动效
- 所有图标使用 Lucide SVG 组件，完全移除 emoji

### 📁 新增文件
| 文件 | 说明 |
|------|------|
| `apps/admin/src/app/api/client/stats/route.ts` | 学习统计 API |

### 🔧 修改文件
| 文件 | 说明 |
|------|------|
| `apps/client/src/app/(main)/page.tsx` | 首页重构 |
| `apps/client/src/lib/api.ts` | 新增 getHomeStats / HomeStats |

---

## Git 提交记录
```
6a6138a style: revert to 2x2 grid without arrows
dae1103 style: switch learning path to horizontal flow with correct arrow order
91cd665 style: redesign learning path as 2x2 grid flow with SVG connectors
6068fd3 style: redesign learning path as connected flow nodes
db12527 style: redesign stat cards with gradient backgrounds and micro-visualizations
2c9c188 fix: replace all emoji icons with Lucide SVG icons in homepage
0a3995b feat(v1.1.0): 优化客户端首页 - 新增学习引导和进度概览
```

## 部署状态
- ✅ 已部署到线上 (14.103.210.113)
- ✅ 已推送 GitHub
- ✅ 已打标签 v1.1.0
