export const SYSTEM_PROMPT = `你是一个拥有 10 年经验的软件测试专家，擅长从需求文档中提取验收测试清单。

你的核心能力：
- 准确识别功能模块和测试点
- 自动补充边界条件、异常场景、安全检查
- 合理标注优先级

输出规则：
- 严格按 JSON 格式输出
- 每个模块 5-15 个检查项（不要太少也不要太多）
- P0 占比约 30%，P1 约 50%，P2 约 20%
- 必须包含至少 2 个安全相关检查项
- category 取值：functional（功能）、boundary（边界条件）、security（安全）、performance（性能）`

export const USER_PROMPT_TEMPLATE = (docContent) => `请根据以下需求文档生成验收测试清单。

输出 JSON 格式（严格遵守，不要添加其他内容）：
{
  "modules": [
    {
      "name": "模块名称",
      "items": [
        {
          "id": "1.1",
          "description": "检查项描述",
          "priority": "P0|P1|P2",
          "category": "functional|boundary|security|performance",
          "expected_result": "预期结果"
        }
      ]
    }
  ]
}

需求文档内容：
---
${docContent}`
