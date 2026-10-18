# 紫微斗数 Demo v0.2 — 完整排盘、综合解读、AI 网关与商业化 PRD

状态：需求设计 / 待开发验收。基于 2026-10-18 核查 baicai/ziwei-doushu 的 README、lib/ziwei/types.ts、components/BirthForm.tsx、components/TimeNav.tsx、components/InsightPanel.tsx、app/chart/page.tsx。本文本身不代表功能已上线。

## 1. 产品目标
免费：完整排盘、十二宫、本命/大限/流年查看、基础六专题离线解释、依据展开、出生信息本地保存。
付费（可选）：通过可替换的 AI 服务对结构化规则结果做交叉综合，支持追问和报告缓存。AI 不重新排盘、不预测可证实的医疗或金融结果。

## 2. 当前发现与优先修复
- ZiweiChart 已有 palaces、daXians、yinYangGender、mingGongBranch、shenGongBranch、currentDaXianIndex；DaXian 已有 palaceBranch、stemIndex、siHua；Palace 已有 stars、oppositeBranch、borrowedStars、selfSihua。
- TimeNav 已有 mingpan/daxian/liunian 切换和流年四化叠加，但解读没有完整地将“哪个阶段、四化落在哪个宫、三方四正哪些星”提交给规则层。
- BirthForm 的 unknownTime 路径以时辰索引 0 占位并能继续起盘；必须修复：未知时辰不能伪装为已确认子时。建议标记 precision=unknown 并限制精确解读，或展示十二时辰候选盘，不自动挑选一盘。
- 出生地现有中国省市字段/经度，需支持海外出生地及出生时区。不得将所有输入都默认为北京时间。
- InsightPanel 请求 /api/interpret，但默认仓库缺少路由；自动请求应改为默认离线，只有明确选 AI 并有有效配额才调用。
- 现有 AI prompts 含要求判断疾病部位、关键健康风险、未来事业走向等表达，需修改为审慎的传统象征解释，不得出现确定性事件推断。

## 3. 数据采集表单
必填：公历/农历日期（默认公历）、出生年月日、时辰/准确时间/不详、传统排盘所需的性别参数（说明仅用于算法顺逆口径）。
高级选填：出生国家、城市、IANA 时区、经纬度、真太阳时校正开关、夏令时确认、闰月口径、晚子时换日口径、亮度流派/规则版本。
若用户时间不详：不给确定性大限/性格推断；候选时辰对照，展示不确定性与必要的限制。
如果用户只提供排盘截图/文本：允许手动导入十二宫星曜/宫干、大限列表、四化信息，标记为 unverified_import，并提示缺失项；不能自动当作已核验引擎输出。
本地草稿默认保存，支持一键清空；敏感出生信息仅在用户主动发起 AI 请求时发送服务端；提示第三方处理。

## 4. 计算上下文模型
ChartContext:
{engineVersion, rulesetVersion, inputPrecision, timeZone, calendarPolicy, yinYangGender, daXianDirection, ageConvention, currentAge, palaces[12], daXians[], liuNian:{year, stem, siHua, overlays}, selectedDaXian, evidence[] }。
每宫数据包含宫名、天干地支、主星/辅星/煞星/杂曜、亮度、生年四化、自化、对宫借星，并区分 original 与 borrowed。
大限方向采用既定算法并显示其规则依据；当前大限及前后大限全部列出；大限四化显示星曜+所在宫；大限三方四正从大限命宫起点计算；流年宫位/四化与本命、大限层明确标色区分。
所有计算字段都只允许规则引擎填充，AI 仅接收只读快照。

## 5. 分层规则解读
A. 单星事实：星曜、亮度、四化、宫位。
B. 同宫组合：主星+辅星+煞星+格局条件。
C. 跨宫关系：本宫、对宫、三合、专题宫位，注明直接/关联/借星。
D. 时间叠加：本命-大限-流年三层，明确虚岁/周岁及年份口径；不用“大限结束=没前途”的说法。
E. 自然语言：一句话主题、关键依据、可能解释、反向/限制条件、现实反思。
每条结论输出 evidenceIds、scope、interpretationLevel、limitations、missingData，缺数据不凑结论。
主题：命格、性格、事业、财运、感情、健康；健康不根据星曜推断疾病、寿命、治疗建议；财运不预测投资收益或要求高风险下注；婚恋不做离婚/出轨的确定断言。
各专题使用独立证据模板，禁止六专题复用“保持平衡、注意风险”之类无增量套话。

## 6. 报告前端
顶部命盘摘要+输入精度状态；下方「本命」「大限」「流年」三级视图。
每个专题展示：综合摘要 → 3~5 条关键发现 → 展开“为什么这么说” → 不确定/争议 → 可自我验证的问题。
可比较离线与 AI 结果，提供“纠错/不认同”反馈，记录规则版本。
大限展示连续十年时间轴，显示上一/当前/下一阶段，不出现截止生命或事业的暗示。
PC 保留十二宫和右侧解读，移动端宫位与报告分标签页，加载不应阻塞排盘。

## 7. 多模型 AI 网关
服务端统一 POST /api/interpret，输入 {chartSnapshotId, topic, timeContext, messages?, requestId}。服务端按配置路由 provider；返回结构化 {sections, evidenceIds, warnings, providerMeta} 或 SSE 增量事件。
ProviderRegistry: {id, kind:openai-compatible|anthropic|gemini|custom, baseUrl, model, secretRef, timeoutMs, maxTokens, pricing, enabled, weight, fallbackOrder}。
按 provider adapter 转换 API 格式；允许自定义 baseUrl/model，不能假设所有厂商均符合 OpenAI 格式。
Key 仅保存在服务端密钥仓库，管理界面仅显示尾号；测试连接、超时、失败切换、熔断与审计日志；不得把 key 放 localStorage 或客户端 JS。
按 requestId 幂等、限流、token 预算、报告缓存、重试去重。切换 provider 不改变排盘快照与规则结果。
模型输出必须经证据 ID 校验、敏感领域措辞校验和无依据断语过滤。

## 8. 商业化实验方案
永久免费：排盘、基础离线六专题、大限/流年浏览、本地保存。
方案 A（建议测试）：¥1.9 首次单专题 AI 深度解读；¥6.9 全六专题组合报告；追问单独限额。
方案 B：每份完整报告 ¥9.9，包含若干轮追问。
方案 C：低频会员订阅，前提是真有持续复访需求；不建议在 MVP 强推。
以上是测试价格不是已验证市场价。按区域选择货币/税费，付款前透明展示权益、有效期、退款、隐私。
成本模型：grossMargin = price - paymentFee - modelCost - platformCost - tax/other variable cost；测算支付手续费对低客单价的影响，避免 1 元订单亏损。
权益 Ledger：orderId、paymentStatus、entitlementId、usageBalance、reportId，支付回调幂等；成功支付才放行 AI；失败不扣权益；失败可重试或退款。
不卖“改运、治病、保证发财”，避免制造焦虑和承诺确定结果。上线前按销售地核查付费占卜/数字服务、税务与支付渠道政策。

## 9. 验收清单
1. 相同输入、同一规则版本，排盘和离线分析完全稳定；多模型切换不得改变星曜位置。
2. 十二宫完整、对宫借星标注不与原宫混淆；大限顺逆、起限年龄、四化、三方四正有可展开证据。
3. 时辰不详不默认假装已知子时；海外时区和夏令时有覆盖测试。
4. 流年切换不会污染本命四化；大限区间虚岁/周岁口径有明确说明。
5. 每个专题的有效分析都能回溯宫位与星曜，没有依据的结论降级为无法判断。
6. 断网或未配 AI key，离线报告仍可用，不主动触发 404。
7. AI Key 不泄露到浏览器，provider 断路切换可测试，费用/配额/订单幂等正确。
8. 未付费可完整体验免费内容；支付失败、AI 超时和重复回调不误扣/重复扣。
9. 隐私数据支持清理；AI 调用前明确知情说明。
10. 安全扫描、typecheck、unit/e2e、桌面和 H5 验收均通过后方可发布。

## 10. 开发顺序
P0：修复 unknownTime 伪精确与离线降级；补齐 ChartContext 与证据模型。
P1：十二宫/大限/流年综合规则输出与前端报告。
P2：多 Provider AI adapter、管理配置、报告缓存与消费预算。
P3：付费权益、支付、退款、运营指标 A/B 测试。
