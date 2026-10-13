# 内嵌语料说明

## 覆盖

快照日期：**2026-10-13**。收录当时已完成修订的全部 87 场讲稿：

| 内容 | 数量 |
|---|---:|
| 完整 session | 87 |
| topic | 752 |
| 开闭场、转场等补充段 | 193 |
| 原画面对应的内容区间 | 20,237 |
| 完整正文段落 | 32,761 |
| 覆盖的修订字幕条目 | 181,731 |
| 只有缺失说明的场次 | 32 |

2026 年官网目录共 119 场，87 场可分析全文加 32 场缺失说明覆盖这份目录。缺失清单及核查时间位于 [coverage.json](../data/coverage.json)；缺失不代表相关主题没有在大会出现。该 skill 是固定快照，不会联网更新。

正文逐段保留已修订讲稿的全部文字、原视频起止时间和所属 cue ID，没有压缩成摘要。字幕中原本的相邻英文词空格、中文标点及口语表达按修订稿保留。段落 ID 为本快照内每场独立顺序编号，引用时必须同时给出 session ID。

不含视频、音频、Slide 图片、HTML 页面或源项目代码。画面标题、章节摘要和要点用于检索与上下文定位，不代表已经查看画面，也不能替代讲者正文。

## 文件结构

- [data/catalog.json](../data/catalog.json)：87 场的标题、简介、官网链接、内嵌全文位置，以及 752 个 topic 的索引。
- [data/coverage.json](../data/coverage.json)：计数、快照状态及 32 场缺失清单。
- [data/manifest.json](../data/manifest.json)：所有数据文件的相对路径、大小、SHA-256 和计数。
- `data/sessions/2026/<agendaId>.json`：一场完整内容，包含开闭场与全部 topic。

所有文件都是 skill 目录中的普通文件，不使用外部软链。每场中的 `source.manuscript_run / manuscript_sha256` 仅记录导入来源的版本标识和哈希；分析时不需要也不能据此寻找外部文件。讲稿中若出现代码路径或网址，那是被保留的演讲内容，不是 skill 的依赖或视频入口。

## 每场数据

`session` 包含 `id / year / title / official_url`；`summary` 是场次简介，`counts` 保存本场计数。`segments` 按原视频时间顺序排列：

- `kind=topic` 为独立议题；`opening / closing / break / transition` 等为补充内容。
- 每段保存标题、讲者、起止毫秒、摘要、要点及 `blocks`。
- 每个 block 保存画面类型、编辑标题、已识别的 Slide 标题、起止时间和 `paragraphs`。没有对应字幕的画面也保留空数组。
- 每个 paragraph 保存 `id / speaker / start_ms / end_ms / cue_ids / text`。`text` 是完整正文，`cue_ids` 保留其原字幕归属；此版本不单独复制每条 cue 的原始文本和毫秒边界。

段落跨越换页时仍完整保留，因此段落起止时间可能略跨 block 边界。`speaker` 为讲者或必要的角色说明，未知身份可能为空或标记待确认。回答时使用已有可靠姓名，不把正文中的昵称或声音转写当作确认身份的依据。原始转写与展示字段仍可能存在差异，精确引用时需核对官网回放。

## 工具

以下命令相对于 skill 目录，脚本只使用 Python 3.9 及以上版本的标准库。默认数据根由脚本自己的位置确定，整个 skill 目录复制后无需改路径。

```sh
# 覆盖与缺失清单
python3 scripts/corpus.py stats

# 默认每页 20 条元信息；list 不返回嵌套的全部 topic
python3 scripts/corpus.py list --query Agent --limit 10
python3 scripts/corpus.py topics --query 推理 --limit 20
python3 scripts/corpus.py topics --session 163

# 中文近义词、英文缩写请由分析者主动扩展；匹配为字面匹配
python3 scripts/corpus.py search Harness Guardrail --match any --limit 12
python3 scripts/corpus.py search KV Cache --match all --session 230
python3 scripts/corpus.py search 'Agent Harness' --match phrase

# 完整段落分页；继续读取返回的 next_offset
python3 scripts/corpus.py read --session 230 --topic topic-002 --offset 0 --limit 20
python3 scripts/corpus.py read --session 230 --paragraph p000001
python3 scripts/corpus.py read --session 163 --start-ms 600000 --end-ms 900000

# 数据大小、哈希、路径、计数、唯一 ID 和官网链接验证
python3 scripts/corpus.py verify
```

所有命令输出 UTF-8 JSON。检索和阅读返回 `results / total / offset / limit / has_more / next_offset`；默认 `limit=20`、最大 100。`search` 每个片段最多 400 字并标记 `snippet_truncated`；`read` 逐段完整输出，不按字数裁断段落。分页里的 `total` 是当前筛选条件下的段落或结果数，不是大会覆盖数。

搜索支持大小写及 Unicode NFKC 归一化；不会自动进行语义向量检索。`--match all` 要求各搜索词出现在同一段，`any` 任一词即可，`phrase` 匹配整段短语。词散落在不同段时，应分开检索或先定位整个 topic。读取 topic 可用精确 ID、精确标题或唯一的标题子串；有歧义时指定 ID。

只需复查某段时使用 `--paragraph`；多个段落可重复指定。时间筛选返回与所给原视频毫秒范围相交的完整段落。查询缺失场次会返回明确的无正文说明，不会从外部读取数据。
