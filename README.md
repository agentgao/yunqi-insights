# 云栖洞察 · Yunqi Insights

在[云栖洞察网站](https://agentgao.github.io/yunqi-insights/)阅读 **2026 云栖大会 87 场完整图文讲稿、752 个主题**。目录支持按场次、主题、讲者和摘要检索；讲稿保留 Slide、现场截图和原视频时间，支持章节跳转、图片放大和幻灯片逐页阅读。

可以从这些讲稿开始：

- [技术主论坛·Agentic Cloud](https://agentgao.github.io/yunqi-insights/sessions/2026/230/index.html)
- [技术主论坛·MaaS & Agent](https://agentgao.github.io/yunqi-insights/sessions/2026/229/index.html)
- [从 Demo 到生产：Agent 的构建、评测与自主交付实战](https://agentgao.github.io/yunqi-insights/sessions/2026/163/index.html)

网站仅提供 HTML 图文阅读。另有 32 场尚未收录完整讲稿，可从网站目录进入云栖官网查看。需要 AI 全文分析时，使用 `main` 分支上的 [yunqi-insights skill](https://github.com/agentgao/yunqi-insights/tree/main/skills/yunqi-insights)。

## 网站发布

`pages` 分支保存 HTML 成品、配图和静态部署工作流；`main` 保存自包含的 skill 及其使用说明。

GitHub 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。若 `github-pages` environment 限制部署分支，允许 `pages`。每次推送 `pages` 均自动部署，工作流仅上传 `site/`，其首页直接对应网站根地址，无需 `/site/`。

图片保存在 `pages` 分支的 `manuscript-assets/`，通过 `https://raw.githubusercontent.com/agentgao/yunqi-insights/pages/manuscript-assets/` 读取，未放入 Pages 部署产物。

## 来源与准确性

内容基于[云栖大会官网](https://yunqi.aliyun.com/2026/live)的公开视频识别、分析和整理生成，并使用大模型结合视频上下文和 Slide 尽力修正识别错误。覆盖范围截至 **2026-10-13**。

本项目为非官方整理。文字、讲者归属、时间和摘要仍可能有误；精确引用时请结合讲稿标注的原视频时间核对云栖官网回放。内容反映大会当时的演讲与观点。
