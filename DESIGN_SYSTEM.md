# 容易学 - UI 设计规范 v1.0

## 品牌色
- Primary: indigo-600 (#4f46e5) — 主操作、导航高亮、链接
- Accent: purple-500 (#8b5cf6) — 渐变辅助色、装饰
- Success: emerald-500 (#10b981)
- Warning: amber-500 (#f59e0b)
- Danger: red-500 (#ef4444)
- Background: slate-50 (#f8fafc) — 页面底色
- Surface: white — 卡片/面板底色

## 间距规范
- 页面外边距: p-6 (desktop), p-4 (mobile)
- 页面最大宽度: max-w-5xl (列表页), max-w-3xl (表单/详情页)
- 页面标题与内容间距: mb-6
- 卡片内边距: p-5 (标准), p-4 (紧凑列表项)
- 卡片间距: gap-4 (网格), space-y-3 (列表)
- 表单字段间距: space-y-4
- 按钮组间距: gap-2
- 图标与文字间距: gap-2 (标准), gap-1.5 (紧凑)

## 卡片规范
- 圆角: rounded-xl
- 阴影: shadow-sm (默认), hover:shadow-md (可点击)
- 边框: border (默认), border-transparent + ring 效果 (选中态)
- 可点击卡片: cursor-pointer + hover:shadow-md + hover:border-primary/20 + transition-all duration-200

## 排版
- 页面标题: text-xl font-semibold (客户端), text-2xl font-semibold (管理端)
- 页面副标题: text-sm text-muted-foreground mt-1
- 卡片标题: text-sm font-medium
- 正文: text-sm
- 辅助文字: text-xs text-muted-foreground
- Badge: text-[11px] (标准), text-[10px] (紧凑)

## 图标容器
- 标准: h-10 w-10 rounded-xl flex items-center justify-center
- 紧凑: h-8 w-8 rounded-lg flex items-center justify-center
- 图标大小: h-5 w-5 (标准容器), h-4 w-4 (紧凑容器)
- 颜色方案:
  - 文档: bg-blue-50 text-blue-600
  - 课程/教学: bg-violet-50 text-violet-600
  - 顾客/对练: bg-rose-50 text-rose-600
  - AI辅助: bg-indigo-50 text-indigo-600
  - 记录: bg-slate-100 text-slate-600
  - 档案: bg-emerald-50 text-emerald-600

## 空状态
- 居中显示: flex flex-col items-center justify-center py-16
- 图标: h-12 w-12 text-muted-foreground/30
- 文字: text-sm text-muted-foreground mt-3

## 加载状态
- 全页: flex items-center justify-center h-64
- 区域: flex items-center justify-center h-40
- Spinner: Loader2 h-6 w-6 animate-spin text-muted-foreground

## 表格 (管理端)
- 卡片包裹: Card > CardContent p-0
- 表头: 不加粗，text-muted-foreground
- 行高: 适中，不要过于紧凑
- 操作列: w-12, 居右
- 分页: border-t px-4 py-3

## 表单弹窗 (管理端)
- DialogContent: sm:max-w-md
- 字段间距: space-y-4
- Label: text-sm font-medium
- 底部按钮: DialogFooter, 取消 + 确认

## 导航
- 客户端侧边栏宽度: w-56
- 管理端侧边栏宽度: w-60
- 导航项: px-3 py-2.5 rounded-lg text-sm
- 激活态: bg-primary/8 text-primary font-medium
- 移动端底部栏: h-14, 图标 h-5 w-5, 文字 text-[10px]

## 动效
- 卡片 hover: transition-all duration-200
- 按钮: transition-colors (默认)
- 展开/折叠: transition-all duration-200
