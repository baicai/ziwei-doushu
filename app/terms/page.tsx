import Link from 'next/link';

export const metadata = {
  title: '使用说明与服务条款 · 紫微研究',
  description: '紫微研究 Demo 的服务范围和使用注意事项。',
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12" style={{ color: 'var(--t-text)' }}>
      <Link href="/" className="text-sm" style={{ color: 'var(--t-gold)' }}>← 返回首页</Link>
      <h1 className="mt-6 mb-2 text-2xl font-semibold">使用说明与服务条款</h1>
      <p className="mb-8 text-xs" style={{ color: 'var(--t-faint)' }}>更新日期：2026 年 10 月 18 日</p>
      <section className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold">服务范围</h2>
        <p className="text-sm leading-7" style={{ color: 'var(--t-text2)' }}>
          紫微研究目前是传统文化研究 Demo，提供紫微斗数排盘、专题规则解读以及可选的 AI 辅助分析。
          部分实验性功能仍在完善，具体以网站当前可实际使用的功能为准。当前不提供会员、订阅或付费服务。
        </p>
      </section>
      <section className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold">使用边界</h2>
        <p className="text-sm leading-7" style={{ color: 'var(--t-text2)' }}>
          命盘、古籍内容和 AI 解读仅供传统文化学习与个人反思，并非对未来事件的确定性预测。
          不构成医疗诊断、投资建议、法律意见或其他专业决策依据。AI 内容可能不准确，请对照命盘事实自行核查。
        </p>
      </section>
      <section className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold">资料与使用</h2>
        <p className="text-sm leading-7" style={{ color: 'var(--t-text2)' }}>
          请仅提交你有权提供的出生资料，避免上传他人的敏感个人信息。
          不得利用服务实施违法行为、恶意干扰系统或大量自动请求消耗服务资源。
        </p>
        <p className="text-sm leading-7" style={{ color: 'var(--t-text2)' }}>
          本项目包含开源代码及第三方资料，各部分的许可和来源以对应的仓库许可证及资料说明为准。
          本站不主张对全部古籍、传统文化内容拥有独占权利。
        </p>
      </section>
      <section className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold">服务调整</h2>
        <p className="text-sm leading-7" style={{ color: 'var(--t-text2)' }}>
          Demo 可能因维护、模型调用额度或技术原因暂时不可用，功能及说明也可能调整。
          重大变化将更新网站相关说明。
        </p>
      </section>
      <Link href="/privacy" className="text-sm" style={{ color: 'var(--t-gold)' }}>查看隐私政策</Link>
    </main>
  );
}
