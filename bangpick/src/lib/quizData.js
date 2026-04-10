// Quiz questions, options, scoring rules, and personality definitions

// ── Decision Personality Quiz ──────────────────────────────────────────

const DECISION_DIMENSIONS = ['speed', 'basis', 'risk', 'social']

const DECISION_QUESTIONS = [
  {
    q: '朋友突然问你"今晚吃啥"，你的第一反应是？',
    options: [
      { text: '脱口而出一个地方', scores: { speed: 2, basis: 0 } },
      { text: '打开点评看看评分', scores: { speed: 0, basis: 2 } },
      { text: '随便，你定', scores: { speed: 1, social: 2 } },
      { text: '先想想最近没吃过什么', scores: { speed: 0, basis: 1 } },
    ],
  },
  {
    q: '面前有两家餐厅，一家排队很长，一家没人，你会？',
    options: [
      { text: '排队的肯定好吃，等！', scores: { speed: 0, risk: 0 } },
      { text: '没人的说不定是宝藏店', scores: { speed: 2, risk: 2 } },
      { text: '看看两家菜单再决定', scores: { speed: 0, basis: 2 } },
      { text: '发群里问朋友们的意见', scores: { speed: 0, social: 2 } },
    ],
  },
  {
    q: '网购时看到一个从没听过的品牌，但评价不错，你会？',
    options: [
      { text: '直接下单，试试又不会怎样', scores: { risk: 2, speed: 2 } },
      { text: '先搜一下这个品牌靠不靠谱', scores: { risk: 0, basis: 2 } },
      { text: '问问买过的朋友怎么样', scores: { risk: 0, social: 2 } },
      { text: '算了，还是买我知道的牌子', scores: { risk: 0, speed: 1 } },
    ],
  },
  {
    q: '旅行时到了一个完全陌生的城市，你怎么安排行程？',
    options: [
      { text: '随心走，看到什么玩什么', scores: { speed: 2, risk: 2 } },
      { text: '提前做好攻略，按计划走', scores: { speed: 0, basis: 2 } },
      { text: '问当地人推荐', scores: { social: 2, speed: 1 } },
      { text: '跟着小红书/抖音热门走', scores: { social: 1, basis: 1 } },
    ],
  },
  {
    q: '有两个offer，一个稳定但普通，一个有风险但很有潜力，你选？',
    options: [
      { text: '搏一搏，单车变摩托', scores: { risk: 2, speed: 2 } },
      { text: '稳定压倒一切', scores: { risk: 0, speed: 0 } },
      { text: '列个pros/cons表格分析一下', scores: { basis: 2, speed: 0 } },
      { text: '问问家人朋友的看法', scores: { social: 2, speed: 0 } },
    ],
  },
  {
    q: '和朋友意见不一致时，你通常会？',
    options: [
      { text: '坚持自己的想法', scores: { social: 0, speed: 1 } },
      { text: '听听对方的理由再说', scores: { social: 1, basis: 1 } },
      { text: '少数服从多数吧', scores: { social: 2, speed: 1 } },
      { text: '无所谓，都行', scores: { social: 2, speed: 2 } },
    ],
  },
  {
    q: '买东西时发现两个选择差不多好，你会？',
    options: [
      { text: '随便拿一个走人', scores: { speed: 2, risk: 1 } },
      { text: '对比参数、看测评', scores: { speed: 0, basis: 2 } },
      { text: '选更便宜的那个', scores: { speed: 1, basis: 1 } },
      { text: '问客服或者朋友推荐哪个', scores: { social: 2, speed: 0 } },
    ],
  },
  {
    q: '你做了一个决定后，事后会？',
    options: [
      { text: '做了就做了，不回头想', scores: { speed: 2, risk: 1 } },
      { text: '偶尔会想"当时选另一个会怎样"', scores: { speed: 0, basis: 1 } },
      { text: '经常复盘，下次做得更好', scores: { basis: 2, speed: 0 } },
      { text: '发个朋友圈问大家觉得怎么样', scores: { social: 2, speed: 1 } },
    ],
  },
]

const DECISION_PERSONALITIES = [
  {
    id: 'flash',
    name: '闪电侠',
    emoji: '⚡',
    color: '#FFD700',
    ideal: { speed: 2, basis: 0, risk: 2, social: 0 },
    desc: '决策速度堪比光速，直觉就是你最强的武器。',
    fallback: '你是天生的行动派，别人还在纠结你已经在享受了。虽然偶尔会踩坑，但你觉得人生就是要大胆试错。你的口头禅是"想那么多干嘛"。',
  },
  {
    id: 'strategist',
    name: '军师型',
    emoji: '🧠',
    color: '#7C98FF',
    ideal: { speed: 0, basis: 2, risk: 0, social: 0 },
    desc: '数据分析是你的本能，三思而后行是你的信条。',
    fallback: '你做决定前一定要看评分、查攻略、列清单。朋友觉得你太磨叽，但你知道这叫"减少不确定性"。你的收藏夹里全是测评视频。',
  },
  {
    id: 'gambler',
    name: '赌神型',
    emoji: '🎲',
    color: '#FF6B6B',
    ideal: { speed: 2, basis: 0, risk: 2, social: 0 },
    desc: '高风险高回报就是你的人生哲学。',
    fallback: '你享受不确定性带来的刺激感，越是大家不敢选的你越想试。朋友让你帮忙选餐厅，结果你带他们去了一家巷子里的苍蝇馆子——好吃得要命。',
  },
  {
    id: 'democrat',
    name: '民主型',
    emoji: '🗳️',
    color: '#22C55E',
    ideal: { speed: 0, basis: 0, risk: 0, social: 2 },
    desc: '集体智慧大于个人判断，你是天生的协调者。',
    fallback: '做决定前你一定要问一圈人的意见，群里发个投票是你的标准操作。你觉得好的决定应该让大家都满意，虽然有时候收集完意见反而更纠结了。',
  },
  {
    id: 'perfectionist',
    name: '完美主义者',
    emoji: '💎',
    color: '#B6A0FF',
    ideal: { speed: 0, basis: 2, risk: 0, social: 0 },
    desc: '不做到最优解不罢休，你的字典里没有"差不多"。',
    fallback: '你买个手机壳都要看三天测评，出门吃饭得提前两小时选餐厅。虽然效率不高，但你选的东西确实很少翻车。完美是需要代价的。',
  },
  {
    id: 'zen',
    name: '随缘大师',
    emoji: '☯️',
    color: '#57BCFF',
    ideal: { speed: 2, basis: 0, risk: 0, social: 1 },
    desc: '佛系做选择，结果好坏都能接受。',
    fallback: '你最常说的话是"都行"、"随便"、"你定"。不是你没主见，是你真的觉得大部分选择没那么重要。人生苦短，纠结是最大的浪费。',
  },
]

// ── Investor Style Quiz ────────────────────────────────────────────────

const INVESTOR_DIMENSIONS = ['horizon', 'analysis', 'mentality', 'frequency']

const INVESTOR_QUESTIONS = [
  {
    q: '买了一只股票涨了15%，你会？',
    options: [
      { text: '马上卖了落袋为安', scores: { horizon: 0, frequency: 2 } },
      { text: '设个止盈线继续持有', scores: { horizon: 1, mentality: 1 } },
      { text: '看看基本面还有没有空间', scores: { horizon: 2, analysis: 2 } },
      { text: '加仓！趋势在就继续', scores: { mentality: 2, horizon: 0 } },
    ],
  },
  {
    q: '你更关注股票的什么指标？',
    options: [
      { text: 'K线形态、MACD、均线', scores: { analysis: 0, frequency: 1 } },
      { text: '市盈率、营收、利润增长', scores: { analysis: 2, horizon: 2 } },
      { text: '主力资金流向、龙虎榜', scores: { analysis: 0, frequency: 2 } },
      { text: '行业趋势和政策方向', scores: { analysis: 2, horizon: 1 } },
    ],
  },
  {
    q: '大盘突然暴跌3%，你的第一反应是？',
    options: [
      { text: '赶紧清仓避险', scores: { mentality: 0, frequency: 2 } },
      { text: '别慌，看看是不是抄底机会', scores: { mentality: 2, horizon: 1 } },
      { text: '检查一下持仓个股的基本面', scores: { analysis: 2, mentality: 1 } },
      { text: '无所谓，我是长线，不看盘', scores: { horizon: 2, mentality: 1 } },
    ],
  },
  {
    q: '你一般多久看一次股票账户？',
    options: [
      { text: '一天看好几次', scores: { frequency: 2, horizon: 0 } },
      { text: '每天收盘看一次', scores: { frequency: 1, horizon: 0 } },
      { text: '每周看一两次', scores: { frequency: 0, horizon: 1 } },
      { text: '想起来才看', scores: { frequency: 0, horizon: 2 } },
    ],
  },
  {
    q: '朋友给你推荐了一只"内幕股"，你会？',
    options: [
      { text: '先买点试试水', scores: { mentality: 2, analysis: 0 } },
      { text: '自己研究一下再决定', scores: { analysis: 2, mentality: 0 } },
      { text: '不听消息，只看技术面', scores: { analysis: 0, frequency: 1 } },
      { text: '完全不信内幕消息', scores: { mentality: 0, analysis: 1 } },
    ],
  },
  {
    q: '你觉得投资最重要的是什么？',
    options: [
      { text: '抓住短线机会，快进快出', scores: { horizon: 0, frequency: 2 } },
      { text: '选好公司，长期持有', scores: { horizon: 2, frequency: 0 } },
      { text: '严格止损，控制风险', scores: { mentality: 0, frequency: 1 } },
      { text: '跟对趋势，顺势而为', scores: { mentality: 2, analysis: 0 } },
    ],
  },
  {
    q: '你的持仓一般有几只股票？',
    options: [
      { text: '1-2只，集中火力', scores: { mentality: 2, horizon: 0 } },
      { text: '3-5只，适度分散', scores: { mentality: 1, analysis: 1 } },
      { text: '5只以上，分散风险', scores: { mentality: 0, analysis: 1 } },
      { text: '主要买基金/ETF', scores: { horizon: 2, mentality: 0 } },
    ],
  },
  {
    q: '如果让你选一个投资偶像，你选？',
    options: [
      { text: '巴菲特 — 价值投资之神', scores: { horizon: 2, analysis: 2 } },
      { text: '徐翔 — 短线之王', scores: { horizon: 0, frequency: 2 } },
      { text: '索罗斯 — 宏观对冲大师', scores: { mentality: 2, analysis: 1 } },
      { text: '彼得·林奇 — 生活中选股', scores: { analysis: 2, horizon: 1 } },
    ],
  },
]

const INVESTOR_PERSONALITIES = [
  {
    id: 'daytrader',
    name: '短线猎手',
    emoji: '🎯',
    color: '#FF6B6B',
    ideal: { horizon: 0, analysis: 0, mentality: 2, frequency: 2 },
    desc: '快准狠是你的风格，市场波动就是你的战场。',
    fallback: '你的交易软件通知从不关闭，盘中每一根K线都牵动你的心。别人觉得你在炒股，你觉得自己在打仗。账户翻红的那一刻比什么都爽。',
  },
  {
    id: 'buffett',
    name: '巴菲特门徒',
    emoji: '🏛️',
    color: '#22C55E',
    ideal: { horizon: 2, analysis: 2, mentality: 0, frequency: 0 },
    desc: '好公司、好价格、长期持有，价值投资的忠实信徒。',
    fallback: '你买股票前一定要看三年财报，最爱说的话是"别人恐惧我贪婪"。你的持仓周期以年为单位，朋友觉得你炒股像养老。但你的收益曲线确实很稳。',
  },
  {
    id: 'quant',
    name: '量化极客',
    emoji: '🤖',
    color: '#7C98FF',
    ideal: { horizon: 0, analysis: 0, mentality: 0, frequency: 1 },
    desc: '用数据说话，用纪律交易，感情是交易的大敌。',
    fallback: '你相信技术指标胜过一切小道消息，MACD金叉死叉是你的信仰。你有自己的交易系统，严格止损从不手软。你觉得炒股就是一道数学题。',
  },
  {
    id: 'zen_investor',
    name: '佛系定投',
    emoji: '🧘',
    color: '#B6A0FF',
    ideal: { horizon: 2, analysis: 1, mentality: 0, frequency: 0 },
    desc: '不看盘、不焦虑、每月定投、静待花开。',
    fallback: '你的投资策略简单到朋友觉得你不像在炒股：每月固定买入，从不择时。跌了你说"便宜了多买点"，涨了你说"还没到目标"。你是最淡定的投资者。',
  },
  {
    id: 'allrounder',
    name: '全能操盘手',
    emoji: '👑',
    color: '#FFD700',
    ideal: { horizon: 1, analysis: 1, mentality: 2, frequency: 1 },
    desc: '技术面基本面两手抓，灵活切换攻守。',
    fallback: '你既看K线也读财报，短线长线都能玩。朋友问你是什么风格，你说"看行情定"。你是股市里的六边形战士，但有时候什么都懂反而更难选。',
  },
  {
    id: 'news_trader',
    name: '消息面玩家',
    emoji: '📡',
    color: '#57BCFF',
    ideal: { horizon: 0, analysis: 2, mentality: 1, frequency: 2 },
    desc: '嗅觉灵敏，总能在第一时间捕捉市场风向。',
    fallback: '你的手机装了十个财经App，每天早上先看新闻再刷牙。政策一出你就知道利好哪个板块，朋友都叫你"人形Bloomberg终端"。信息就是你的弹药。',
  },
]

// ── Exports ────────────────────────────────────────────────────────────

export const QUIZZES = {
  decision: {
    title: '决策人格测试',
    subtitle: '测测你是什么决策风格',
    icon: '🔮',
    color: '#B6A0FF',
    dimensions: DECISION_DIMENSIONS,
    dimensionLabels: { speed: '速度', basis: '依据', risk: '风险', social: '社交' },
    questions: DECISION_QUESTIONS,
    personalities: DECISION_PERSONALITIES,
  },
  investor: {
    title: '投资风格测试',
    subtitle: '你是哪种投资者',
    icon: '📈',
    color: '#22C55E',
    dimensions: INVESTOR_DIMENSIONS,
    dimensionLabels: { horizon: '周期', analysis: '分析', mentality: '心态', frequency: '操作' },
    questions: INVESTOR_QUESTIONS,
    personalities: INVESTOR_PERSONALITIES,
  },
}
