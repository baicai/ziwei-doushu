import Link from 'next/link';

export const metadata = {
  title: '隐私政策 · 紫微研究',
  description: '了解紫微研究 Demo 如何保存出生资料、处理 AI 解读以及使用网站统计。',
};

const sections = [
  { title: '1. 你提供的信息', paragraphs: [
    '排盘时可填写称呼、出生日期、出生时间、性别和出生地点。称呼为选填，不参与命盘计算。',
    '当前 Demo 不提供账号注册、会员、支付或订单服务。',
  ] },
  { title: '2. 本地保存', paragraphs: [
    '为方便下次使用，浏览器会在当前网站的本地存储中保存上一次提交的出生资料。数据未加密，请勿在共用设备上保留敏感资料。',
    '可在排盘页面点击「清除保存资料」删除出生资料，或通过浏览器设置清理全部网站数据。更换设备或浏览器不会自动同步。',
    '你可以自愿对每段解读选择「比较符合／部分符合／不符合」。反馈按命盘输入的摘要标识与当时解读文本关联，仅保存在本机浏览器，不自动上传到服务器，也不自动发给 AI。每张命盘的反馈可在报告中单独清除；浏览器清除站点数据会同时删除反馈。',
  ] },
  { title: '3. AI 解读', paragraphs: [
    '只有在你主动点击「AI 深度解读」时，网站才会将当前命盘所需的出生资料、结构化宫位星曜信息及你输入的问题发送到服务端，再提交给第三方 AI 模型提供商 DeepSeek。',
    '第三方对请求数据的处理遵循其自身的服务条款及隐私政策。请避免在提问中填写身份证号、联系方式等不必要的个人信息。',
    '不点击 AI 解读时，页面内的基础排盘和规则解读不需要向 AI 模型发送资料。',
  ] },
  { title: '4. 网站运行与统计', paragraphs: [
    '网站部署在 Vercel，并使用 Vercel Analytics 与 Speed Insights 了解网站访问和运行表现。相关服务可能处理访问时间、设备、浏览器及性能信息。',
    '网站还使用本地存储保存主题偏好。网络请求可能产生服务端日志，用于运行维护、安全检查和故障排查。',
  ] },
  { title: '5. 你的选择', paragraphs: [
    '你可以不填写称呼、不使用 AI 解读、不评价报告，也可以随时删除本地保存的出生资料与解读反馈。',
    '如果需要了解第三方模型的数据处理政策，可查阅相应模型服务商的公开隐私说明。',
  ] },
  { title: '6. 政策更新', paragraphs: [
    '本说明反映 Demo 现阶段的实际功能。后续若增加账号、同步、模型切换等能力，将同步更新本说明。',
  ] },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12" style={{ color: 'var(--t-text)' }}>
      <Link href="/" className="text-sm" style={{ color: 'var(--t-gold)' }}>← 返回首页</Link>
      <h1 className="mt-6 mb-2 text-2xl font-semibold">隐私政策</h1>
      <p className="mb-8 text-xs" style={{ color: 'var(--t-faint)' }}>更新日期：2026 年 10 月 24 日</p>
      {sections.map(section => (
        <section key={section.title} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">{section.title}</h2>
          {section.paragraphs.map(p => <p key={p} className="mb-3 text-sm leading-7" style={{ color: 'var(--t-text2)' }}>{p}</p>)}
        </section>
      ))}
      <Link href="/terms" className="text-sm" style={{ color: 'var(--t-gold)' }}>服务条款</Link>
    </main>
  );
}
