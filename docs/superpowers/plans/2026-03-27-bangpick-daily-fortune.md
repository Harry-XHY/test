# 每日一签 (Daily Fortune) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a daily fortune feature to bangpick's landing page — entry card, flip animation modal, pre-set fortune library with daily seed rotation.

**Architecture:** Pre-set fortune library using existing `seedFromDate()` / `seededShuffle()` for deterministic daily selection. FortuneCard entry on landing page opens a FortuneModal with CSS 3D flip animation. State tracked via localStorage with `safeGet`/`safeSet`.

**Tech Stack:** React 19, Tailwind CSS 4, CSS 3D Transforms, localStorage

**Spec:** `docs/superpowers/specs/2026-03-27-bangpick-daily-fortune-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/lib/scenarios.js` | Export `seedFromDate`, `seededShuffle`, and new `getDateStr()` utility |
| Modify | `src/lib/storage.js` | Export `safeGet` and `safeSet` |
| Create | `src/lib/fortunes.js` | Fortune data + `getTodayFortune()` + `isFortuneDraw()` / `markFortuneDrawn()` |
| Create | `src/components/FortuneCard.jsx` | Landing page entry card (drawn / undrawn states) |
| Create | `src/components/FortuneModal.jsx` | Full-screen modal with flip animation |
| Modify | `src/pages/ChatPage.jsx` | Import FortuneCard + FortuneModal, wire into LandingView |
| Modify | `src/index.css` | Fortune flip animation CSS + reduced-motion |

---

### Task 1: Export shared utilities from scenarios.js and storage.js

**Files:**
- Modify: `bangpick/src/lib/scenarios.js:47,57` — export `seedFromDate` and `seededShuffle`
- Modify: `bangpick/src/lib/storage.js:3,12` — export `safeGet` and `safeSet`

- [ ] **Step 1: Export seedFromDate and seededShuffle in scenarios.js**

Add a shared date string helper before `seedFromDate` (before line 47):

```js
export function getDateStr() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
}
```

Then refactor `seedFromDate` to use it, and export both functions:

```js
export function seedFromDate() {
  const str = getDateStr()
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function seededShuffle(arr, seed) {
```

- [ ] **Step 2: Export safeGet and safeSet in storage.js**

Change line 3 from:
```js
function safeGet(key, fallback) {
```
to:
```js
export function safeGet(key, fallback) {
```

Change line 12 from:
```js
function safeSet(key, value) {
```
to:
```js
export function safeSet(key, value) {
```

- [ ] **Step 3: Verify existing functionality still works**

Run: `cd bangpick && npx vite build 2>&1 | tail -5`
Expected: Build succeeds — existing imports of `getRandomContent`, `getHistory`, `saveDecision` unchanged.

- [ ] **Step 4: Commit**

```bash
git add bangpick/src/lib/scenarios.js bangpick/src/lib/storage.js
git commit -m "refactor(bangpick): export seedFromDate, seededShuffle, safeGet, safeSet for reuse"
```

---

### Task 2: Create fortune library (src/lib/fortunes.js)

**Files:**
- Create: `bangpick/src/lib/fortunes.js`

- [ ] **Step 1: Create fortunes.js with fortune data and helper functions**

```js
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

export function getTodayFortune() {
  const seed = seedFromDate()
  const shuffled = seededShuffle(FORTUNES, seed)
  return shuffled[0]
}

export function isFortuneDrawn() {
  return safeGet(FORTUNE_DATE_KEY, null) === getDateStr()
}

export function markFortuneDrawn() {
  safeSet(FORTUNE_DATE_KEY, getDateStr())
}
```

- [ ] **Step 2: Verify the module imports resolve**

Run: `cd bangpick && npx vite build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add bangpick/src/lib/fortunes.js
git commit -m "feat(bangpick): add fortune library with 40 pre-set fortunes and daily seed logic"
```

---

### Task 3: Create FortuneCard component (src/components/FortuneCard.jsx)

**Files:**
- Create: `bangpick/src/components/FortuneCard.jsx`

- [ ] **Step 1: Create FortuneCard.jsx**

```jsx
import { useMemo } from 'react'
import { getTodayFortune, isFortuneDrawn } from '../lib/fortunes'

export default function FortuneCard({ onOpen }) {
  const drawn = isFortuneDrawn()
  const fortune = useMemo(() => drawn ? getTodayFortune() : null, [drawn])

  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 rounded-xl p-3 border cursor-pointer active:scale-[0.98] transition-transform"
      style={{
        background: 'linear-gradient(135deg, rgba(182,160,255,0.1), rgba(91,140,255,0.1))',
        borderColor: 'rgba(182,160,255,0.15)',
      }}
    >
      <span className="text-[22px]">🔮</span>
      <div className="flex-1 text-left">
        {drawn ? (
          <>
            <div className="text-sm font-semibold text-[var(--text)]">
              {fortune.level} · {fortune.message.length > 12 ? fortune.message.slice(0, 12) + '…' : fortune.message}
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">点击查看详情</div>
          </>
        ) : (
          <>
            <div className="text-sm font-semibold text-[var(--text)]">今日一签</div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">看看决策运势</div>
          </>
        )}
      </div>
      <span className="text-[var(--primary)] text-base">→</span>
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add bangpick/src/components/FortuneCard.jsx
git commit -m "feat(bangpick): add FortuneCard entry component with drawn/undrawn states"
```

---

### Task 4: Add flip animation CSS (src/index.css)

**Files:**
- Modify: `bangpick/src/index.css` — append fortune animation styles at end of file

- [ ] **Step 1: Add fortune CSS at the end of index.css**

Append the following after the last line of `src/index.css`:

```css
/* ===== Fortune Modal ===== */
.fortune-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fortune-fade-in 0.3s ease-out;
}

@keyframes fortune-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fortune-card {
  width: 180px;
  height: 260px;
  perspective: 1000px;
  cursor: pointer;
}

.fortune-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s ease-out;
  transform-style: preserve-3d;
}

.fortune-card-inner.flipped {
  transform: rotateY(180deg);
}

.fortune-front,
.fortune-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fortune-front {
  background: linear-gradient(135deg, #7e51ff, #5B8CFF);
  box-shadow: 0 8px 32px rgba(126, 81, 255, 0.3);
}

.fortune-back {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(182, 160, 255, 0.3);
  box-shadow: 0 8px 32px rgba(126, 81, 255, 0.15);
  transform: rotateY(180deg);
  padding: 24px 20px;
}

@media (prefers-reduced-motion: reduce) {
  .fortune-card-inner {
    transition: none;
    transform-style: flat;
  }
  .fortune-front,
  .fortune-back {
    backface-visibility: visible;
  }
  .fortune-front {
    opacity: 1;
  }
  .fortune-back {
    opacity: 0;
    transform: none;
  }
  .fortune-card-inner.flipped .fortune-front {
    opacity: 0;
  }
  .fortune-card-inner.flipped .fortune-back {
    opacity: 1;
  }
  .fortune-overlay {
    animation: none;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add bangpick/src/index.css
git commit -m "feat(bangpick): add fortune flip animation CSS with reduced-motion support"
```

---

### Task 5: Create FortuneModal component (src/components/FortuneModal.jsx)

**Files:**
- Create: `bangpick/src/components/FortuneModal.jsx`

- [ ] **Step 1: Create FortuneModal.jsx**

```jsx
import { useState, useEffect, useCallback } from 'react'
import { getTodayFortune, isFortuneDrawn, markFortuneDrawn } from '../lib/fortunes'

export default function FortuneModal({ onClose }) {
  const alreadyDrawn = isFortuneDrawn()
  const [flipped, setFlipped] = useState(alreadyDrawn)
  const fortune = getTodayFortune()

  const handleFlip = useCallback(() => {
    if (flipped) return
    setFlipped(true)
    markFortuneDrawn()
  }, [flipped])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
      if ((e.key === 'Enter' || e.key === ' ') && !flipped) {
        e.preventDefault()
        handleFlip()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [flipped, onClose, handleFlip])

  return (
    <div
      className="fortune-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="fortune-card" onClick={handleFlip}>
        <div className={`fortune-card-inner ${flipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div className="fortune-front">
            <div className="text-center text-white">
              <div className="text-5xl mb-2">🔮</div>
              <div className="text-base font-semibold tracking-[4px]">今日一签</div>
              {!alreadyDrawn && (
                <div className="text-[11px] mt-2 opacity-70">点击翻牌</div>
              )}
            </div>
          </div>

          {/* Back */}
          <div className="fortune-back">
            <div className="text-center text-[var(--text)] w-full">
              <div className="text-xs text-[var(--primary)] tracking-[2px] mb-1.5">
                — {fortune.level} —
              </div>
              <div className="text-[13px] leading-relaxed my-3 text-[#e8eaf0]">
                {fortune.message}
              </div>
              <div className="border-t border-white/[0.08] my-3" />
              <div className="flex justify-around text-xs">
                <div>
                  <div className="text-[#22c55e] mb-1">宜</div>
                  <div className="text-[var(--text-secondary)]">{fortune.yi}</div>
                </div>
                <div>
                  <div className="text-[#ef4444] mb-1">忌</div>
                  <div className="text-[var(--text-secondary)]">{fortune.ji}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Close button */}
      {flipped && (
        <button
          onClick={onClose}
          className="absolute top-12 right-6 w-8 h-8 rounded-full grid place-items-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add bangpick/src/components/FortuneModal.jsx
git commit -m "feat(bangpick): add FortuneModal with 3D flip animation and keyboard support"
```

---

### Task 6: Wire FortuneCard and FortuneModal into ChatPage

**Files:**
- Modify: `bangpick/src/pages/ChatPage.jsx:1-2,12,14,43,136-138,253-254`

- [ ] **Step 1: Add imports at top of ChatPage.jsx**

Add after line 4 (`import RandomPicker...`):

```jsx
import FortuneCard from '../components/FortuneCard'
import FortuneModal from '../components/FortuneModal'
```

- [ ] **Step 2: Add FortuneCard to LandingView**

Update the `LandingView` function signature (line 12) to accept `onOpenFortune`:

```jsx
function LandingView({ scenarios, examples, onFill, onOpenFortune }) {
```

Insert the FortuneCard between the Hero section (after line 23 `</section>`) and Quick Scenes section (before line 25 `{/* Quick Scenes */}`):

```jsx
      {/* Daily Fortune */}
      <FortuneCard onOpen={onOpenFortune} />
```

- [ ] **Step 3: Add fortune modal state to ChatPage**

In the `ChatPage` component, after line 141 (`const [appHeight, setAppHeight] = useState('100%')`), add:

```jsx
  const [showFortune, setShowFortune] = useState(false)
```

- [ ] **Step 4: Pass onOpenFortune to LandingView and render FortuneModal**

Update the LandingView usage (around line 254) to pass the new prop:

From:
```jsx
          <LandingView scenarios={scenarios} examples={examples} onFill={handleFill} />
```
To:
```jsx
          <LandingView scenarios={scenarios} examples={examples} onFill={handleFill} onOpenFortune={() => setShowFortune(true)} />
```

Add the FortuneModal render before the closing `</div>` of the return (before line 263):

```jsx
      {showFortune && <FortuneModal onClose={() => setShowFortune(false)} />}
```

- [ ] **Step 5: Verify build succeeds**

Run: `cd bangpick && npx vite build 2>&1 | tail -5`
Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add bangpick/src/pages/ChatPage.jsx
git commit -m "feat(bangpick): wire FortuneCard and FortuneModal into landing page"
```

---

### Task 7: Manual smoke test

- [ ] **Step 1: Start dev server**

Run: `cd bangpick && npx vite --host`

- [ ] **Step 2: Verify in browser**

Open `http://localhost:5173` (or whichever port) and verify:

1. Fortune entry card visible between hero and quick scenes
2. Click entry → modal opens with card front (紫蓝渐变 + 🔮)
3. Click card → flip animation → fortune content appears (签等 + 箴言 + 宜忌)
4. Click overlay or X button → modal closes
5. Entry card now shows drawn state (签等 + 箴言摘要)
6. Refresh page → entry card still shows drawn state
7. Keyboard: Escape closes modal, Enter/Space flips card

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(bangpick): polish daily fortune feature after smoke test"
```
