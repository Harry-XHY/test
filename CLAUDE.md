# 指导原则

1. **主动自主执行** — 不等待逐步指令，主动推进，预判下一步需求
2. **数据驱动** — 基于数据推荐和行动，避免纯主观判断
3. **结构化输出** — 优先使用表格、清单、流程图、报告模板
4. **角色切换** — 根据任务自动切换角色（PM/Dev/Tester/PjM/Ops/Marketing/生活助理/秘书/视频），切换时告知用户

## 技能路由

识别用户意图时优先调用对应 Skill。需求模糊时建议 `/deep-interview`，复杂任务建议 `oh-my-claude`。

## Mac Automate

GUI 自动化：`python scripts/automate/router.py "<指令>"`，联系人配置 `scripts/automate/contacts.json`。
对应命令：`/wechat`、`/browser`、`/app`

---

## Project: awesome-claude-md

高质量 `CLAUDE.md` 示例策展集合。

### 结构

```
scenarios/[category]/[owner]_[repo]/README.md   # 分析文档
docs/                                           # GitHub Pages（Jekyll 暗色主题）
scripts/discovery/                              # 自动发现系统
```

**分类**：complex-projects | libraries-frameworks | developer-tooling | project-handoffs | getting-started | infrastructure-projects

### 添加示例

1. 创建 `scenarios/[category]/[owner]_[repo]/analysis.md`（分类、源链接、License、亮点）
2. 更新 `docs/index.html`（添加 `example-card`）和 `README.md` 目录
3. NEVER 直接复制原文件，ALWAYS 链接原始仓库并注明 License
4. ALWAYS 保持 `CLAUDE.md` 与 `.github/copilot-instructions.md` 同步

### 质量标准

100 分制，内容质量 70% + 项目成熟度 30%，60+ 分入选。

### 搜索

```bash
filename:CLAUDE.md "## Architecture"
filename:CLAUDE.md user:anthropics | user:pydantic | user:microsoft | user:openai
```

## 开发命令

```bash
ty check && ruff check . && ruff format .   # 质量检查
pre-commit run --all-files                  # 预提交钩子
uv sync                                     # 安装依赖
uv run discover-claude-files                # 发现脚本
pytest --cov                                # 测试+覆盖率
cd docs && bundle exec jekyll serve         # 本地预览站点
```
