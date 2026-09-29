import { useEffect } from "react"
import { AuthScreen } from "./components/Auth"
import { Home } from "./components/Home"
import { Practice } from "./components/Practice"
import { Summary } from "./components/Summary"
import { useSession } from "./lib/auth"
import { clearSummary, isEscape, loadSummary, replaceRoute, saveSummary, useRoute } from "./lib/route"
import { beginLesson, loadStore, saveStore } from "./lib/storage"
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

  if (route.name === "practice" || route.name === "review") {
    return (
      <Practice
        key={route.name === "review" ? "review" : route.lessonId}
        mode={route.name === "review" ? "review" : "lesson"}
        lessonId={route.name === "practice" ? route.lessonId : undefined}
        onExit={() => replaceRoute({ name: "home" })}
        onDone={finishLesson}
      />
    )
  }

  if (route.name === "summary") return <SummaryRoute />

  return <Home route={route} />
}

export default function App() {
  const session = useSession()
  if (!session) return <AuthScreen />
  return <SignedInApp key={session.id} />
}
