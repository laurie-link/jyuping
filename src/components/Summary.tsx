import { dueCards, loadStore } from "../lib/storage"
import type { SummaryData } from "../lib/types"

const BLURB: Record<string, string> = {
  SSS: "几乎每题都是一次打对。这课可以先放下。",
  SS: "很稳。再来一遍，可以冲 SSS。",
  S: "大部分已经能打出来了。",
  A: "手开始记住了。错的会在复习里再出现。",
  B: "再走一遍。重复本身就是在记。",
  C: "先把答案看熟，然后不看答案再打一次。",
}

type Props = {
  data: SummaryData
  onHome: () => void
  onAgain: () => void
  onNext?: () => void
  onReview: () => void
}

export function Summary({ data, onHome, onAgain, onNext, onReview }: Props) {
  const due = dueCards(loadStore()).length

  return (
    <div className="summary">
      <p className="eyebrow">{data.title}</p>
      <p className={`rating tone-${data.rating}`}>{data.rating}</p>
      <p className="lede">{BLURB[data.rating] ?? "这轮练完了。"}</p>
      <p className="note">新学的大约十分钟后再出现一次。答错的更早，已经记得住的会隔几天。</p>
      <dl>
        <div>
          <dt>得分</dt>
          <dd>{data.score}</dd>
        </div>
        <div>
          <dt>最高连击</dt>
          <dd>{data.bestCombo}</dd>
        </div>
        <div>
          <dt>一次打对</dt>
          <dd>
            {data.perfect}/{data.total}
          </dd>
        </div>
        <div>
          <dt>答错</dt>
          <dd>{data.miss}</dd>
        </div>
      </dl>
      <div className="actions">
        <button type="button" className="solid" onClick={onAgain}>
          再练一遍
        </button>
        {onNext && (
          <button type="button" className="ghost" onClick={onNext}>
            下一课
          </button>
        )}
        {due > 0 && (
          <button type="button" className="ghost" onClick={onReview}>
            复习 {due}
          </button>
        )}
        <button type="button" className="texty" onClick={onHome}>
          回首页
        </button>
      </div>
    </div>
  )
}
