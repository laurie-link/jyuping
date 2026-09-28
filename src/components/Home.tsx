import { useState } from "react"
import { lessons } from "../data/lessons"
import { buildSteps } from "../lib/steps"
import {
  dueCards,
  formatDue,
  loadStore,
  nextDue,
  saveStore,
  setDifficulty,
} from "../lib/storage"
import type { Difficulty, Store } from "../lib/types"

const DIFFICULTIES: Array<{ id: Difficulty; label: string; hint: string }> = [
  { id: "beginner", label: "初级", hint: "新词单独打，再拼回整句" },
  { id: "intermediate", label: "中级", hint: "从词组开始，不再拆单字" },
  { id: "advanced", label: "高级", hint: "只打整句" },
]

const TONES = [
  ["1", "诗", "si1", "阴平"],
  ["2", "史", "si2", "阴上"],
  ["3", "试", "si3", "阴去"],
  ["4", "时", "si4", "阳平"],
  ["5", "市", "si5", "阳上"],
  ["6", "是", "si6", "阳去"],
]

type Props = {
  onStartLesson: (lessonId: string) => void
  onStartReview: () => void
}

export function Home({ onStartLesson, onStartReview }: Props) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const due = dueCards(store)
  const upcoming = nextDue(store)
  const difficulty = store.settings.difficulty

  function commit(next: Store) {
    saveStore(next)
    setStore(next)
  }

  return (
    <div className="home">
      <header className="top">
        <div className="brand">
          <span className="seal">拼</span>
          <div>
            <strong>粤拼记</strong>
            <span>看见粤语，打出粤拼</span>
          </div>
        </div>
        <button className="pill" type="button" onClick={onStartReview}>
          今日复习
          <b>{due.length}</b>
        </button>
      </header>

      <section className="hero">
        <p className="eyebrow">
          {store.streak.count > 0 ? `连续 ${store.streak.count} 天` : "今天就可以开始"}
          {upcoming && due.length === 0 ? ` · 下一轮 ${formatDue(upcoming.due)}` : ""}
        </p>
        <h1>一句一句长出来。</h1>
        <p className="lede">
          看着字，把粤拼打出来。声调写在末尾，1 到 6。答对会连击，快忘的时候再拿出来练。
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>这一轮怎么练</h2>
          <p>{DIFFICULTIES.find((item) => item.id === difficulty)?.hint}</p>
        </div>
        <div className="segment" role="radiogroup" aria-label="难度">
          {DIFFICULTIES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={difficulty === item.id}
              className={difficulty === item.id ? "on" : ""}
              onClick={() => commit(setDifficulty(store, item.id))}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="toggles">
          <label>
            <input
              type="checkbox"
              checked={store.settings.sound}
              onChange={(event) =>
                commit({
                  ...store,
                  settings: { ...store.settings, sound: event.target.checked },
                })
              }
            />
            音效
          </label>
          <label>
            <input
              type="checkbox"
              checked={store.settings.speakOnAnswer}
              onChange={(event) =>
                commit({
                  ...store,
                  settings: { ...store.settings, speakOnAnswer: event.target.checked },
                })
              }
            />
            显示答案时朗读
          </label>
          <label>
            <input
              type="checkbox"
              checked={store.settings.autoPlay}
              onChange={(event) =>
                commit({
                  ...store,
                  settings: { ...store.settings, autoPlay: event.target.checked },
                })
              }
            />
            出题时朗读
          </label>
        </div>
      </section>

      <section className="lessons">
        <div className="panel-head">
          <h2>课程</h2>
          <p>{Object.keys(store.cards).length} 张卡片在复习本里</p>
        </div>
        <ol>
          {lessons.map((lesson, index) => {
            const record = store.lessons[lesson.id]
            const steps = buildSteps(lesson, difficulty).length
            return (
              <li key={lesson.id}>
                <button type="button" onClick={() => onStartLesson(lesson.id)}>
                  <span className="num">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <strong>{lesson.title}</strong>
                    <em>{lesson.blurb}</em>
                  </span>
                  <span className="meta">
                    <b>{record?.best ?? "未练"}</b>
                    <small>{steps} 题</small>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="tones">
        <div className="panel-head">
          <h2>六个声调</h2>
          <p>诗史试时市是，只差最后一个数字。</p>
        </div>
        <ol>
          {TONES.map(([num, char, py, name]) => (
            <li key={num} data-tone={num}>
              <b>{num}</b>
              <span className="hz">{char}</span>
              <code>{py}</code>
              <small>{name}</small>
            </li>
          ))}
        </ol>
      </section>

      <footer className="foot">
        <button
          type="button"
          className="texty"
          onClick={() => {
            if (!window.confirm("清空这台电脑上的练习记录？")) return
            localStorage.removeItem("jyutping-memo:v1")
            setStore(loadStore())
          }}
        >
          清空练习记录
        </button>
      </footer>

      {!store.seenIntro && (
        <div className="modal-back" role="presentation">
          <div className="modal" role="dialog" aria-labelledby="intro-title">
            <p className="eyebrow">怎么用</p>
            <h2 id="intro-title">先打字，再记住。</h2>
            <ol>
              <li>看繁体字，把整题粤拼打完。按 Enter 才判断对错，打到一半不会提前说你对了。</li>
              <li>初级会把句子拆开，同一个词会反复出现，直到整句能一次打完。</li>
              <li>练完会按你答得稳不稳，安排下一次复习。不用自己记日子。</li>
            </ol>
            <button
              type="button"
              className="solid"
              onClick={() => commit({ ...store, seenIntro: true })}
            >
              开始练
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
