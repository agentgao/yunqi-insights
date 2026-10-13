# 云栖洞察 · Yunqi Insights

阅读云栖大会的图文讲稿，用 AI 找到感兴趣的话题、理解技术方案、比较不同演讲的观点，或整理一份专题总结。

当前收录 **2026 云栖大会 87 场完整讲稿、752 个主题**，覆盖范围截至 **2026-10-13**。另有 32 场尚无完整文本，具体清单见[语料说明](skills/yunqi-insights/references/corpus-guide.md)。

所有内容均基于 [云栖大会官网 yunqi.aliyun.com](https://yunqi.aliyun.com/2026/live) 的公开视频识别、分析和整理生成，并使用大模型结合视频上下文尽力纠正识别错误。

## 阅读文稿

在[云栖洞察文稿网站](https://agentgao.github.io/yunqi-insights/)阅读 HTML 图文讲稿：一张 Slide 或现场截图配上对应讲稿，支持章节跳转、图片放大和幻灯片逐页阅读。每场会议及其中的每个主题都有独立页面。

可以从这些文稿开始：

- [技术主论坛·Agentic Cloud](https://agentgao.github.io/yunqi-insights/sessions/2026/230/index.html)
- [技术主论坛·MaaS & Agent](https://agentgao.github.io/yunqi-insights/sessions/2026/229/index.html)
- [从 Demo 到生产：Agent 的构建、评测与自主交付实战](https://agentgao.github.io/yunqi-insights/sessions/2026/163/index.html)

更多内容见[全部场次与主题](https://agentgao.github.io/yunqi-insights/)，可以按场次、主题、讲者或摘要检索。文稿标注原视频时间，并提供云栖官网回放链接，方便回到演讲中核对上下文。

`main` 分支提供 skill 和使用说明；HTML 文稿、图片及网站维护工具位于 [pages 分支](https://github.com/agentgao/yunqi-insights/tree/pages)。文稿只提供 HTML 版本。

## 使用 yunqi-insights skill

[yunqi-insights](skills/yunqi-insights/SKILL.md) 是一个内嵌完整讲稿的 agent skill，适合让 AI 帮你发现话题、回答内容问题、做跨场次比较，或提炼报告与分享材料。

### 安装提示词

将下面的提示词复制给支持安装 skill 的 AI 助手：

```text
请从 https://github.com/agentgao/yunqi-insights 安装 yunqi-insights skill，
skill 位于仓库的 skills/yunqi-insights 目录。
请使用当前助手支持的安装方式，完整保留该目录及其随附文件，包括全文、索引和检索工具。
只需安装这个 skill 目录，无需下载 pages 分支的网站图片或视频。
安装完成后，请确认能找到 yunqi-insights，并读取内嵌场次目录。
```

如果已经将仓库下载到本地，可以在仓库目录中使用：

```text
请将当前仓库的 skills/yunqi-insights 目录安装为当前 AI 助手可用的 skill。
请完整保留目录内容，并确认安装后可以读取内嵌讲稿。
```

安装时需保留完整的 [skills/yunqi-insights](skills/yunqi-insights) 目录，不能只复制 `SKILL.md`。具体安装位置由所用 AI 助手决定。

### 提问示例

安装完成后，在对话中使用 `$yunqi-insights` 提问。例如：

- “使用 $yunqi-insights，找出适合 Agent 从 Demo 走向生产的演讲，说明推荐理由，并按阅读顺序排列。”
- “使用 $yunqi-insights，总结技术主论坛·Agentic Cloud 的主要观点，附上场次、讲者和原视频时间。”
- “使用 $yunqi-insights，比较不同专场对推理成本、SLO 和 KV Cache 的讨论，说明共识、差异及适用条件。”
- “使用 $yunqi-insights，围绕 Agent 的评测与可靠交付整理一份专题报告，区分演讲中的观点和进一步的分析推断。”

Skill 自带完整文本与索引，可以直接分析内嵌语料，无需另外下载录像；Slide 图片可在图文文稿中查看。更具体的使用说明见 [SKILL.md](skills/yunqi-insights/SKILL.md)。

## 内容来源与准确性

讲稿由视频语音识别生成，Slide 和现场画面截取自视频。整理过程中，大模型结合演讲前后文、视频上下文和 Slide 内容，尽力修正专业术语、产品名称等识别错误，并组织主题、摘要与图文讲稿。

本项目为非官方整理。经过修订的文字、讲者归属、时间和摘要仍可能有误；需要精确引用时，请结合文稿标注的原视频时间核对 [云栖官网回放](https://yunqi.aliyun.com/2026/live)。章节摘要和要点属于整理结果，引用讲者原话时应核对对应正文与视频。

内容反映 2026 云栖大会当时的演讲与观点。未收录全文的场次只保留覆盖说明，不能据此判断大会没有讨论相关话题。
