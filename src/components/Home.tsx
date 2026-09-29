import { useEffect, useState } from "react"
import { commonThemes } from "../data/common-themes"
import { sections } from "../data/lessons"
import { Lookup } from "./Lookup"
import { ListeningReading } from "./ListeningReading"
import { Translate } from "./Translate"
import { logout, useSession } from "../lib/auth"
import { back, COMMON_BAND_SIZE, go, isEscape, parentOf } from "../lib/route"
import type { Route } from "../lib/route"
import { buildSteps } from "../lib/steps"
import {
  beginLesson,
  clearCursors,
  dueCards,
  hasSavedCursor,
  lessonAttempts,
  lessonCursor,
  loadStore,
  resetCurrentStore,
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
  route: Extract<Route, { name: "home" | "section" | "lookup" | "lyrics" | "translate" }>
}

function tallyText(total: number, unit: string, done: number, active: number, attempts: number) {
  const parts = [`${total} ${unit}`]
  if (done > 0) parts.push(`已练 ${done}`)
  if (active > 0) parts.push(`进行中 ${active}`)
  if (attempts > 0) parts.push(`练过 ${attempts} 次`)
  return parts.join(" · ")
}

export function Home({ route }: Props) {
  const session = useSession()
  const [store, setStore] = useState<Store>(() => loadStore())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const sectionId = route.name === "section" ? route.sectionId : null
  const band = route.name === "section" ? route.band : null
  const folder = route.name === "section" ? route.folder : null
  const themeId = route.name === "section" ? route.themeId : null
  const tool = route.name === "lookup" ? "lookup" : route.name === "lyrics" ? "lyrics" : route.name === "translate" ? "translate" : null
  const due = dueCards(store)
  const difficulty = store.settings.difficulty
  const section = sections.find((item) => item.id === sectionId)
  const bandSize = COMMON_BAND_SIZE
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

  useEffect(() => {
    setSettingsOpen(false)
  }, [route])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!isEscape(event)) return
      if (!store.seenIntro) {
        event.preventDefault()
        event.stopImmediatePropagation()
        commit({ ...store, seenIntro: true })
        return
      }
      if (settingsOpen) {
        event.preventDefault()
        event.stopImmediatePropagation()
        setSettingsOpen(false)
        return
      }
      if (route.name === "home" || route.name === "lyrics") return
      event.preventDefault()
      event.stopImmediatePropagation()
      back(parentOf(route))
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [route, settingsOpen, store])

  function openSection(id: string) {
    setSettingsOpen(false)
    go({ name: "section", sectionId: id, band: null, folder: null, themeId: null })
  }

  function openLookup() {
    setSettingsOpen(false)
    go({ name: "lookup" })
  }

  function goBack() {
    back(parentOf(route))
  }

  function commit(next: Store) {
    saveStore(next)
    setStore(next)
  }

  function lessonStats(lessons: Lesson[]) {
    let done = 0
    let active = 0
    let attempts = 0
    for (const lesson of lessons) {
      if (store.lessons[lesson.id]) done += 1
      if (lessonCursor(store, lesson.id, difficulty) > 0) active += 1
      attempts += lessonAttempts(store, lesson.id)
    }
    return { done, active, attempts }
  }

  function sectionLessonIds() {
    if (!section) return []
    if (section.id !== "common") return section.lessons.map((lesson) => lesson.id)
    return [
      ...section.lessons.map((lesson) => lesson.id),
      ...commonThemes.flatMap((theme) => theme.lessons.map((lesson) => lesson.id)),
    ]
  }

  function openLesson(id: string, fresh = false) {
    const next = beginLesson(store, id, difficulty, fresh)
    if (next !== store) saveStore(next)
    go({ name: "practice", mode: "lesson", lessonId: id })
  }

  function clearProgress(ids: string[], message: string) {
    if (!window.confirm(message)) return
    commit(clearCursors(store, ids))
  }

  const clearIds = listed ? listed.map((lesson) => lesson.id) : section ? sectionLessonIds() : []
  const canClear = clearIds.some((id) => hasSavedCursor(store, id))

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
          {session && (
            <button className="pill user-pill" type="button" onClick={() => { void logout().then((result) => { if (!result.ok) window.alert(result.error) }) }}>
              <span>{session.username}</span>
              <b>退出</b>
            </button>
          )}
          <button
            className="pill"
            type="button"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((open) => !open)}
          >
            设置
          </button>
          <button className="pill" type="button" onClick={() => go({ name: "review" })}>
            今日复习
            <b>{due.length}</b>
          </button>
        </div>
      </header>

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
          <p className="lookup-note">
            当前账号 {session?.username ?? ""}。清空练习记录会删掉这个账号的成绩、复习安排、练习次数和连续天数。账号还在，课文也还在。
          </p>
          <button
            type="button"
            className="texty"
            onClick={() => {
              if (!window.confirm("清空这个账号的练习记录？成绩、进度和复习安排都会删掉。")) return
              setStore(resetCurrentStore())
              setSettingsOpen(true)
            }}
          >
            清空练习记录
          </button>
        </section>
      )}

      <section className="lessons">
        {route.name === "translate" ? (
          <Translate onBack={() => back({ name: "home" })} />
        ) : route.name === "lyrics" ? (
          <ListeningReading route={route} />
        ) : tool === "lookup" ? (
          <Lookup onBack={() => back({ name: "home" })} />
        ) : section ? (
          <>
            <button type="button" className="back" onClick={goBack}>
              返回
            </button>
            <div className="panel-head section-open">
              <h2>{heading}</h2>
              <p>{subheading}</p>
            </div>
            {canClear && (
              <button
                type="button"
                className="texty section-clear"
                onClick={() =>
                  clearProgress(
                    clearIds,
                    listed
                      ? "清空这里的进度？这些课会回到第一题，练过的次数还留着。"
                      : "清空这个板块的进度？每课都会回到第一题，练过的次数还留着。",
                  )
                }
              >
                清空进度
              </button>
            )}
            {listed ? (
            <ol>
              {listed.map((lesson, index) => {
                const record = store.lessons[lesson.id]
                const steps = buildSteps(lesson, difficulty).length
                const cursor = lessonCursor(store, lesson.id, difficulty)
                const attempts = lessonAttempts(store, lesson.id)
                return (
                  <li key={lesson.id} className="lesson-row">
                    <button type="button" className="lesson-open" onClick={() => openLesson(lesson.id)}>
                      <span className="num">{String(index + 1).padStart(2, "0")}</span>
                      <span>
                        <strong>{lesson.title}</strong>
                        <em>{lesson.blurb}</em>
                      </span>
                      <span className="meta">
                        <b>{record?.best ?? (cursor > 0 ? "进行中" : attempts > 0 ? "未打完" : "未练")}</b>
                        <small>
                          {cursor > 0 ? `续第 ${cursor + 1} / ${steps} 题` : `${steps} 题`}
                          {attempts > 0 ? ` · 练过 ${attempts} 次` : ""}
                        </small>
                      </span>
                    </button>
                    {cursor > 0 && (
                      <button type="button" className="lesson-restart" onClick={() => openLesson(lesson.id, true)}>
                        从头
                      </button>
                    )}
                  </li>
                )
              })}
            </ol>
            ) : (
              <div className="section-grid">
                {folder === "themes"
                  ? commonThemes.map((item) => {
                      const stats = lessonStats(item.lessons)
                      const words = item.lessons.reduce((sum, lesson) => sum + lesson.sentences.length, 0)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className="section-card"
                          onClick={() => go({ name: "section", sectionId: "common", band: null, folder: "themes", themeId: item.id })}
                        >
                          <strong>{item.title}</strong>
                          <em>{item.blurb}</em>
                          <small>{tallyText(words, "词", stats.done, stats.active, stats.attempts)}</small>
                        </button>
                      )
                    })
                  : (
                    <>
                      <button
                        type="button"
                        className="section-card"
                        onClick={() => go({ name: "section", sectionId: "common", band: null, folder: "themes", themeId: null })}
                      >
                        <strong>分类词汇</strong>
                        <em>按饮食、身体、家人这些题目再看一遍。</em>
                        <small>{commonThemes.reduce((sum, item) => sum + item.lessons.length, 0)} 课</small>
                      </button>
                      {bands.map((lessons, index) => {
                  const stats = lessonStats(lessons)
                  return (
                    <button
                      key={rangeTitle(lessons)}
                      type="button"
                      className="section-card"
                      onClick={() => go({ name: "section", sectionId: "common", band: index, folder: null, themeId: null })}
                    >
                      <strong>{rangeTitle(lessons)}</strong>
                      <em>
                        {lessonWord(lessons[0])} 到 {lessonWord(lessons.at(-1), true)}
                      </em>
                      <small>{tallyText(lessons.length, "课", stats.done, stats.active, stats.attempts)}</small>
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
                const stats = lessonStats(item.lessons)
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
                    <small>{tallyText(item.lessons.length, "课", stats.done, stats.active, stats.attempts)}</small>
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
            <h2>互译</h2>
            <p>普通话与粤语白话之间自由切换</p>
          </div>
          <button type="button" className="lookup-plate translate-plate" onClick={() => go({ name: "translate" })}>
            <span>
              <span className="plate-label">TRANSLATE / 03</span>
              <strong>普通话 ↔ 粤语</strong>
              <em>查短词，翻整句，标粤拼，听读音。</em>
            </span>
            <span className="translate-plate-art" aria-hidden="true">譯</span>
            <small>开始互译 <span aria-hidden="true">↗</span></small>
          </button>
        </section>
      )}

      {!section && tool === null && (
        <section className="lessons">
          <div className="panel-head">
            <h2>听读</h2>
            <p>跟着文字和粤拼一起读</p>
          </div>
          <button type="button" className="lookup-plate listening-plate" onClick={() => {
            setSettingsOpen(false)
            go({ name: "lyrics", query: "", songId: null, drill: null, done: false })
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
