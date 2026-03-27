const ALL_SCENARIOS = [
  { emoji: '🍜', title: '今天吃什么', desc: '口味距离预算帮你选', fill: '火锅烤肉日料，今晚吃哪个？' },
  { emoji: '☕', title: '喝点什么', desc: '奶茶咖啡茶饮提神醒脑', fill: '下午犯困，喝奶茶还是咖啡？' },
  { emoji: '🍺', title: '夜宵吃啥', desc: '烧烤炸鸡小龙虾馋了', fill: '深夜想吃宵夜，选哪个？' },
  { emoji: '🎁', title: '送什么礼', desc: '生日节日纪念日不踩雷', fill: '女朋友生日预算500送啥？' },
  { emoji: '🛒', title: '买哪个好', desc: '参数价格口碑帮你比', fill: '耳机选 Sony 还是 AirPods？' },
  { emoji: '🎮', title: '玩什么', desc: '游戏综艺电影不无聊', fill: '周末在家一个人玩啥？' },
  { emoji: '🎬', title: '看什么剧', desc: '口碑热度评分来推荐', fill: '最近有什么好看的剧？' },
  { emoji: '👗', title: '穿什么', desc: '约会通勤聚会全搞定', fill: '周五下班直接约会穿啥？' },
  { emoji: '🧥', title: '买什么衣服', desc: '款式风格预算帮你挑', fill: '秋天想买件百搭外套' },
  { emoji: '🚗', title: '怎么出行', desc: '地铁打车自驾最优解', fill: '早高峰打车还是地铁？' },
  { emoji: '✈️', title: '去哪玩', desc: '小众网红周边任你挑', fill: '端午三天假去哪玩好？' },
  { emoji: '💼', title: '职场选择', desc: '跳槽加薪方向帮你理', fill: '要不要接这个996的offer？' },
  { emoji: '📚', title: '学什么', desc: '技能证书兴趣课推荐', fill: '想转行学 Python 还是数据分析？' },
  { emoji: '💪', title: '健身选择', desc: '减脂增肌塑形全指导', fill: '想练马甲线每天怎么练？' },
  { emoji: '🏠', title: '家居布置', desc: '收纳清洁装饰找灵感', fill: '小户型客厅怎么显大？' },
  { emoji: '👫', title: '社交纠结', desc: '聚会邀请人情来帮你', fill: '同事聚会不想去怎么拒绝？' },
  { emoji: '💰', title: '理财问题', desc: '攒钱投资保险来规划', fill: '年终奖5万怎么分配？' },
  { emoji: '🐱', title: '养啥宠物', desc: '猫狗仓鼠爬宠推荐', fill: '租房党适合养什么宠物？' },
  { emoji: '💇', title: '换不换发型', desc: '长短烫染风格帮你选', fill: '短发还是继续留长发？' },
  { emoji: '📱', title: '换不换手机', desc: '新款值不值得升级', fill: '等新款还是现在就买？' },
]

const ALL_EXAMPLES = [
  '火锅还是烤肉？纠结了一下午',
  '点外卖还是自己下厨？',
  '奶茶点全糖还是三分糖？',
  '周末约朋友吃川菜还是日料？',
  '买新出的游戏还是等打折？',
  '今晚刷剧还是早点睡？',
  '这衣服有点贵，要不要下手？',
  '换季了买新衣服还是翻出去年的？',
  '今天穿得正式点还是休闲点？',
  '出门踩运动鞋还是搭高跟鞋？',
  '早高峰打车还是挤地铁？',
  '小长假去热门景点还是周边小众游？',
  '工作不满意，裸辞还是先找好下家？',
  '今天加班还是准点下班回家躺平？',
  '周末要不要报个班学点新技能？',
  '想健身是办卡还是在家跟着视频练？',
  '晚上吃草减肥还是正常吃明天再减？',
  '朋友聚会去还是在家宅着恢复能量？',
  '旧枕头还行但确实该换了，买不买？',
  '追这部剧还是去看豆瓣评分更高的？',
]

export function getDateStr() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
}

export function seedFromDate() {
  const str = getDateStr()
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function seededShuffle(arr, seed) {
  const copy = [...arr]
  let s = seed
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function getRandomContent() {
  const seed = seedFromDate()
  return {
    scenarios: seededShuffle(ALL_SCENARIOS, seed).slice(0, 4),
    examples: seededShuffle(ALL_EXAMPLES, seed + 1).slice(0, 4),
  }
}
