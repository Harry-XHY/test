export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">隐私协议</h1>

      <div className="bg-slate-800 rounded-xl p-6 space-y-6 text-sm text-slate-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-2">数据收集</h2>
          <p>
            Harry的验收助手会收集以下信息以提供服务：
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>您上传的需求文档内容（用于生成验收清单）</li>
            <li>您的验收操作记录（通过/不通过/跳过及备注）</li>
            <li>您的账号信息（手机号或邮箱，用于登录认证）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-2">数据用途</h2>
          <p>您的数据仅用于：</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>通过 AI 服务（DeepSeek）生成验收清单</li>
            <li>保存您的验收记录，供您随时查看和导出</li>
            <li>改进产品体验</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-2">数据存储</h2>
          <p>
            当前版本的数据存储在您的浏览器本地（localStorage）。
            未来接入云端服务后，数据将存储在 Supabase 云服务中，并设置 30 天自动清理策略。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-2">第三方服务</h2>
          <p>
            Harry的验收助手使用 DeepSeek AI 服务来分析文档并生成验收清单。
            您的文档内容会被发送至 DeepSeek 进行处理。
            请勿上传包含敏感信息（密码、密钥、个人隐私数据）的文档。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-2">您的权利</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>您可以随时在设置中清除所有本地数据</li>
            <li>您可以随时停止使用本服务</li>
            <li>您可以联系我们要求删除任何已存储的数据</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-2">联系方式</h2>
          <p>如有任何隐私相关问题，请通过产品内的反馈功能联系我们。</p>
        </section>

        <p className="text-slate-500 text-xs pt-4 border-t border-slate-700">
          最后更新：2026 年 3 月
        </p>
      </div>
    </div>
  )
}
