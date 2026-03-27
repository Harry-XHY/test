import { seedFromDate, seededShuffle, getDateStr } from './scenarios.js'
import { safeGet, safeSet } from './storage.js'

const FORTUNE_DATE_KEY = 'bangpick_fortune_date'

const FORTUNES = [
  // 上上签 (~15%)
  { level: '上上签', message: '今天适合果断出手，别再纠结了', yi: '冲动消费', ji: '货比三家' },
  { level: '上上签', message: '直觉很准，跟着感觉走', yi: '相信第一反应', ji: '反复推翻决定' },
  { level: '上上签', message: '万事俱备，出手即中', yi: '大胆尝新', ji: '原地踏步' },
  { level: '上上签', message: '今天做的决定都是对的', yi: '果断拍板', ji: '犹豫不决' },
  { level: '上上签', message: '选贵的，因为你值得', yi: '投资自己', ji: '过度节省' },
  { level: '上上签', message: '机会转瞬即逝，马上行动', yi: '立刻下单', ji: '加入收藏吃灰' },

  // 上签 (~25%)
  { level: '上签', message: '稍微想想就够了，别想太多', yi: '快速决策', ji: '无限拖延' },
  { level: '上签', message: '选让自己开心的那个', yi: '取悦自己', ji: '委屈求全' },
  { level: '上签', message: '朋友的建议今天特别靠谱', yi: '听取意见', ji: '独断专行' },
  { level: '上签', message: '两个都不错，选便宜的', yi: '理性消费', ji: '盲目攀比' },
  { level: '上签', message: '跟着口碑走不会错', yi: '参考评价', ji: '只看广告' },
  { level: '上签', message: '今天适合尝试没试过的', yi: '探索新领域', ji: '待在舒适区' },
  { level: '上签', message: '选择困难时，选更健康的', yi: '均衡饮食', ji: '放纵暴食' },
  { level: '上签', message: '今天的决策力比平时强', yi: '多做决定', ji: '把选择推给别人' },
  { level: '上签', message: '选那个让未来的你感谢的', yi: '长远考虑', ji: '只图眼前' },
  { level: '上签', message: '直觉和理性今天同方向', yi: '果断选择', ji: '纠结内耗' },

  // 中签 (~35%)
  { level: '中签', message: '都行，选哪个都不亏', yi: '随缘就好', ji: '过度纠结' },
  { level: '中签', message: '今天不急，可以再看看', yi: '多方比较', ji: '冲动决定' },
  { level: '中签', message: '中规中矩的选择最稳妥', yi: '选经典款', ji: '追求猎奇' },
  { level: '中签', message: '吃饱了再做决定', yi: '先填饱肚子', ji: '饿着肚子逛街' },
  { level: '中签', message: '今天适合做小决定，大事缓一缓', yi: '日常选择', ji: '重大决策' },
  { level: '中签', message: '问问自己三天后还想不想要', yi: '冷静判断', ji: '情绪驱动' },
  { level: '中签', message: '选择之前先列个优缺点', yi: '理性分析', ji: '全凭感觉' },
  { level: '中签', message: '今天的运势平平，稳扎稳打', yi: '保守策略', ji: '激进冒险' },
  { level: '中签', message: '货比三家今天特别有用', yi: '多看几家', ji: '看到就买' },
  { level: '中签', message: '旧的不去新的不来，但也别乱扔', yi: '断舍离', ji: '冲动清理' },
  { level: '中签', message: '选能退的那个，给自己留后路', yi: '保留选项', ji: '一锤定音' },
  { level: '中签', message: '睡一觉再决定也不迟', yi: '延迟决策', ji: '深夜冲动' },
  { level: '中签', message: '听听过来人的经验', yi: '请教前辈', ji: '闭门造车' },
  { level: '中签', message: '预算内的最好选择就够了', yi: '量入为出', ji: '超预算消费' },

  // 下签 (~20%)
  { level: '下签', message: '今天做的决定可能会后悔，慎重', yi: '三思后行', ji: '冲动行事' },
  { level: '下签', message: '别被打折冲昏了头', yi: '理性克制', ji: '凑单消费' },
  { level: '下签', message: '先别买，回家想想', yi: '冷静期', ji: '当场付款' },
  { level: '下签', message: '今天不适合做重要决定', yi: '推迟决策', ji: '拍板签字' },
  { level: '下签', message: '选择恐惧症发作日，随便选吧', yi: '抛硬币', ji: '纠结到天黑' },
  { level: '下签', message: '直觉今天不太灵，多问问别人', yi: '征求意见', ji: '相信直觉' },
  { level: '下签', message: '便宜没好货，今天尤其准', yi: '选质量好的', ji: '贪小便宜' },
  { level: '下签', message: '选了就别回头看另一个', yi: '坚定选择', ji: '反复比较' },

  // 下下签 (~5%)
  { level: '下下签', message: '今天最好什么都别买', yi: '存钱', ji: '一切消费' },
  { level: '下下签', message: '做什么决定都会纠结，不如摆烂', yi: '躺平休息', ji: '强行决策' },
]

function getDeviceId() {
  const key = 'bangpick_device_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(key, id)
  }
  return id
}

function hashStr(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function getTodayFortune() {
  const seed = hashStr(getDateStr() + getDeviceId())
  const shuffled = seededShuffle(FORTUNES, seed)
  return shuffled[0]
}

export function isFortuneDrawn() {
  return safeGet(FORTUNE_DATE_KEY, null) === getDateStr()
}

export function markFortuneDrawn() {
  safeSet(FORTUNE_DATE_KEY, getDateStr())
}
