import { useEffect, useSyncExternalStore } from "react"
import { AuthScreen } from "./components/Auth"
import { Home } from "./components/Home"
import { Practice } from "./components/Practice"
import { Summary } from "./components/Summary"
import { useAuthState } from "./lib/auth"
import { clearSummary, isEscape, loadSummary, replaceRoute, saveSummary, useRoute } from "./lib/route"
import { beginLesson, getSyncStatus, loadStore, resolveConflict, retrySync, saveStore, subscribeSync } from "./lib/storage"
import type { SummaryData } from "./lib/types"

function finishLesson(data: SummaryData) {
  saveSummary(data)
  replaceRoute({ name: "summary" })
}

function SummaryRoute() {
  const data = loadSummary()
  useEffect(() => {
    if (!data) replaceRoute({ name: "home" })
  }, [data])
  useEffect(() => {
    if (!data) return
    function onKey(event: KeyboardEvent) {
      if (!isEscape(event)) return
      event.preventDefault()
      clearSummary()
      replaceRoute({ name: "home" })
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [data])
  if (!data) return null
  return (
    <Summary
      data={data}
      onHome={() => {
        clearSummary()
        replaceRoute({ name: "home" })
      }}
      onAgain={() => {
        clearSummary()
        if (data.mode === "review") replaceRoute({ name: "review" })
        else if (data.lessonId) {
          const store = loadStore()
          saveStore(beginLesson(store, data.lessonId, store.settings.difficulty, true))
          replaceRoute({ name: "practice", mode: "lesson", lessonId: data.lessonId })
        }
        else replaceRoute({ name: "home" })
      }}
      onNext={
        data.nextLessonId
          ? () => {
              clearSummary()
              const store = loadStore()
              saveStore(beginLesson(store, data.nextLessonId!, store.settings.difficulty, false))
              replaceRoute({ name: "practice", mode: "lesson", lessonId: data.nextLessonId! })
            }
          : undefined
      }
      onReview={() => {
        clearSummary()
        replaceRoute({ name: "review" })
      }}
    />
  )
}

function SignedInApp() {
  const route = useRoute()
  const syncStatus = useSyncExternalStore(subscribeSync, getSyncStatus, getSyncStatus)
  const syncNotice = syncStatus === "saved" || syncStatus === "saving" ? null : (
    <div className="sync-notice" role="status">
      <span>{syncStatus === "conflict" ? "发现另一份进度，请选择保留哪份" : "进度尚未保存到服务器，请检查网络"}</span>
      {syncStatus === "error" && <button type="button" onClick={retrySync}>重试</button>}
      {syncStatus === "conflict" && <>
        <button type="button" onClick={() => { void resolveConflict(false) }}>服务器进度</button>
        <button type="button" onClick={() => { void resolveConflict(true) }}>本机未同步进度</button>
      </>}
    </div>
  )

  if (route.name === "practice" || route.name === "review") {
    return (
      <>{syncNotice}<Practice
        key={route.name === "review" ? "review" : route.lessonId}
        mode={route.name === "review" ? "review" : "lesson"}
        lessonId={route.name === "practice" ? route.lessonId : undefined}
        onExit={() => replaceRoute({ name: "home" })}
        onDone={finishLesson}
      /></>
    )
  }

  if (route.name === "summary") return <>{syncNotice}<SummaryRoute /></>

  return <>{syncNotice}<Home route={route} /></>
}

export default function App() {
  const { ready, session } = useAuthState()
  if (!ready) return null
  if (!session) return <AuthScreen />
  return <SignedInApp key={session.id} />
}
