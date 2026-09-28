import { useState } from "react"
import { commonThemes } from "../data/common-themes"
import { sections } from "../data/lessons"
import { Lookup } from "./Lookup"
import { ListeningReading } from "./ListeningReading"
import { buildSteps } from "../lib/steps"
import {
  dueCards,
  formatDue,
  loadStore,
  nextDue,
  saveStore,
  setDifficulty,
} from "../lib/storage"
import type { Difficulty, Lesson, Store } from "../lib/types"

function rangeTitle(lessons: Lesson[]) {
  const from = lessons[0]?.title.split("–")[0] ?? ""
  const to = lessons.at(-1)?.title.split("–")[1] ?? ""
  return `${from}–${to}`
}

function lessonWord(lesson: Lesson | undefined, end = false) {
  const sentence = end ? lesson?.sentences.at(-1) : lesson?.sentences[0]
  return sentence?.tokens.map((token) => token.parts.map((part) => part.char).join("")).join("") ?? ""
}

const DIFFICULTIES: Array<{ id: Difficulty; label: string; hint: string }> = [
  { id: "beginner", label: "初级", hint: "新词单独打，再拼回整句" },
  { id: "intermediate", label: "中级", hint: "从词组开始，不再拆单字" },
  { id: "advanced", label: "高级", hint: "只打整句" },
]

type Props = {
  onStartLesson: (lessonId: string) => void
  onStartReview: () => void
}

export function Home({ onStartLesson, onStartReview }: Props) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [sectionId, setSectionId] = useState<string | null>(null)
  const [band, setBand] = useState<number | null>(null)
  const [folder, setFolder] = useState<null | "themes">(null)
  const [themeId, setThemeId] = useState<string | null>(null)
  const [tool, setTool] = useState<null | "lookup" | "lyrics">(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const due = dueCards(store)
  const upcoming = nextDue(store)
  const difficulty = store.settings.difficulty
  const section = sections.find((item) => item.id === sectionId)
  const bandSize = 25
  const bands =
    section?.id === "common"
      ? Array.from({ length: Math.ceil(section.lessons.length / bandSize) }, (_, index) =>
          section.lessons.slice(index * bandSize, index * bandSize + bandSize),
        )
      : []
  const theme = commonThemes.find((item) => item.id === themeId)
  const bandLessons = section?.id === "common" && band !== null ? bands[band] : undefined
  const listed =
    theme?.lessons ??
    bandLessons ??
    (section && section.id !== "common" ? section.lessons : undefined)
  const heading = theme
    ? theme.title
    : folder === "themes"
      ? "分类词汇"
      : bandLessons
        ? rangeTitle(bandLessons)
        : section?.title
  const subheading = theme
    ? theme.blurb
    : folder === "themes"
      ? "从三千词里按题目再挑一遍。"
      : bandLessons
        ? "每课 20 个词。"
        : section?.blurb

  function openSection(id: string) {
    setTool(null)
    setSettingsOpen(false)
    setBand(null)
    setFolder(null)
    setThemeId(null)
    setSectionId(id)
  }

  function openLookup() {
    setSectionId(null)
    setSettingsOpen(false)
    setBand(null)
    setFolder(null)
    setThemeId(null)
    setTool("lookup")
  }

  function goBack() {
    if (themeId) {
      setThemeId(null)
      return
    }
    if (folder) {
      setFolder(null)
      return
    }
    if (band !== null) {
      setBand(null)
      return
    }
    setSectionId(null)
  }

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
        <div className="top-actions">
          <button
            className="pill"
            type="button"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((open) => !open)}
          >
            设置
          </button>
          <button className="pill" type="button" onClick={onStartReview}>
            今日复习
            <b>{due.length}</b>
          </button>
        </div>
      </header>

      {!section && tool === null && (
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">粤语学习 · 每天一点</p>
            <h1>一句一句<span>长出来。</span></h1>
            <p className="lede">
              看着粤语，把粤拼打出来。从一个字到一整句，把听过的声音慢慢记在手上。
            </p>
            <div className="hero-actions">
              <button type="button" className="solid" onClick={() => onStartLesson("hello")}>开始练习 <span aria-hidden="true">↗</span></button>
              <button type="button" className="ghost" onClick={() => setTool("lyrics")}>去听读 <span aria-hidden="true">→</span></button>
            </div>
            <p className="hero-progress">
              <span>{store.streak.count > 0 ? `连续 ${store.streak.count} 天` : "今天就可以开始"}</span>
              <span>{upcoming && due.length === 0 ? `下一轮 ${formatDue(upcoming.due)}` : `${due.length} 张待复习`}</span>
            </p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <span className="hero-art-ring" />
            <span className="hero-art-mark">粵</span>
            <div className="hero-art-word">
              <ruby>你<rt>nei5</rt></ruby><ruby>好<rt>hou2</rt></ruby>
            </div>
            <span className="hero-art-caption">从声音，走到文字。</span>
            <span className="hero-art-index">01 / 06</span>
          </div>
        </section>
      )}

      {settingsOpen && (
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
          <p className="lookup-note">清空练习记录会删掉这台电脑上的成绩、复习安排和连续天数。课文还在。</p>
          <button
            type="button"
            className="texty"
            onClick={() => {
              if (!window.confirm("清空这台电脑上的练习记录？成绩和复习安排都会删掉。")) return
              localStorage.removeItem("jyutping-memo:v1")
              setStore(loadStore())
              setSettingsOpen(true)
            }}
          >
            清空练习记录
          </button>
        </section>
      )}

      <section className="lessons">
        {tool === "lyrics" ? (
          <ListeningReading onBack={() => setTool(null)} onReview={onStartReview} />
        ) : tool === "lookup" ? (
          <Lookup onBack={() => setTool(null)} />
        ) : section ? (
          <>
            <button type="button" className="back" onClick={goBack}>
              返回
            </button>
            <div className="panel-head section-open">
              <h2>{heading}</h2>
              <p>{subheading}</p>
            </div>
            {listed ? (
            <ol>
              {listed.map((lesson, index) => {
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
            ) : (
              <div className="section-grid">
                {folder === "themes"
                  ? commonThemes.map((item) => {
                      const done = item.lessons.filter((lesson) => store.lessons[lesson.id]).length
                      const words = item.lessons.reduce((sum, lesson) => sum + lesson.sentences.length, 0)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className="section-card"
                          onClick={() => setThemeId(item.id)}
                        >
                          <strong>{item.title}</strong>
                          <em>{item.blurb}</em>
                          <small>
                            {words} 词{done > 0 ? ` · 已练 ${done}` : ""}
                          </small>
                        </button>
                      )
                    })
                  : (
                    <>
                      <button
                        type="button"
                        className="section-card"
                        onClick={() => setFolder("themes")}
                      >
                        <strong>分类词汇</strong>
                        <em>按饮食、身体、家人这些题目再看一遍。</em>
                        <small>{commonThemes.reduce((sum, item) => sum + item.lessons.length, 0)} 课</small>
                      </button>
                      {bands.map((lessons, index) => {
                  const done = lessons.filter((lesson) => store.lessons[lesson.id]).length
                  return (
                    <button
                      key={rangeTitle(lessons)}
                      type="button"
                      className="section-card"
                      onClick={() => setBand(index)}
                    >
                      <strong>{rangeTitle(lessons)}</strong>
                      <em>
                        {lessonWord(lessons[0])} 到 {lessonWord(lessons.at(-1), true)}
                      </em>
                      <small>
                        {lessons.length} 课{done > 0 ? ` · 已练 ${done}` : ""}
                      </small>
                    </button>
                  )
                      })}
                    </>
                  )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="panel-head">
              <h2>课程</h2>
              <p>{Object.keys(store.cards).length} 张卡片在复习本里</p>
            </div>
            <div className="section-grid">
              {sections.map((item, sectionIndex) => {
                const done = item.lessons.filter((lesson) => store.lessons[lesson.id]).length
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="section-card course-card"
                    onClick={() => openSection(item.id)}
                  >
                    <span className="section-card-index">{String(sectionIndex + 1).padStart(2, "0")}</span>
                    <strong>{item.title}</strong>
                    <em>{item.blurb}</em>
                    <small>
                      {item.lessons.length} 课{done > 0 ? ` · 已练 ${done}` : ""}
                    </small>
                    <span className="section-card-arrow" aria-hidden="true">↗</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>

      {!section && tool === null && (
        <section className="lessons">
          <div className="panel-head">
            <h2>听读</h2>
            <p>跟着文字和粤拼一起读</p>
          </div>
          <button type="button" className="lookup-plate listening-plate" onClick={() => {
            setSettingsOpen(false)
            setTool("lyrics")
          }}>
            <span>
              <span className="plate-label">LISTEN & READ / 01</span>
              <strong>粤语歌词</strong>
              <em>搜一首歌，可以抄写，也可以练习。</em>
            </span>
            <span className="plate-art" aria-hidden="true"><ruby>聽<rt>teng1</rt></ruby><ruby>歌<rt>go1</rt></ruby></span>
            <small>搜歌进入 <span aria-hidden="true">↗</span></small>
          </button>
        </section>
      )}

      {!section && tool === null && (
        <section className="lessons">
          <div className="panel-head">
            <h2>查字</h2>
            <p>不记入练习</p>
          </div>
          <button type="button" className="lookup-plate" onClick={openLookup}>
            <span>
              <span className="plate-label">DICTIONARY / 02</span>
              <strong>输入字或词</strong>
              <em>看粤拼，也可以听。</em>
            </span>
            <small>词典现查 <span aria-hidden="true">↗</span></small>
          </button>
        </section>
      )}

      {!store.seenIntro && (
        <div className="modal-back" role="presentation">
          <div className="modal" role="dialog" aria-labelledby="intro-title">
            <p className="eyebrow">怎么用</p>
            <h2 id="intro-title">先打字，再记住。</h2>
            <ol>
              <li>看繁体字，一个音节一条横线。按空格才到下一格，每一格都填了才判断对错。</li>
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
