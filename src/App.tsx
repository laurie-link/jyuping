import { useState } from "react"
import { Home } from "./components/Home"
import { Practice } from "./components/Practice"
import { Summary } from "./components/Summary"
import type { SummaryData } from "./lib/types"

type View =
  | { name: "home" }
  | { name: "practice"; mode: "lesson" | "review"; lessonId?: string }
  | { name: "summary"; data: SummaryData }

export default function App() {
  const [view, setView] = useState<View>({ name: "home" })

  return (
    <>
      {view.name === "home" && (
        <Home
          onStartLesson={(lessonId) => setView({ name: "practice", mode: "lesson", lessonId })}
          onStartReview={() => setView({ name: "practice", mode: "review" })}
        />
      )}
      {view.name === "practice" && (
        <Practice
          key={`${view.mode}:${view.lessonId ?? "review"}`}
          mode={view.mode}
          lessonId={view.lessonId}
          onExit={() => setView({ name: "home" })}
          onDone={(data) => setView({ name: "summary", data })}
        />
      )}
      {view.name === "summary" && (
        <Summary
          data={view.data}
          onHome={() => setView({ name: "home" })}
          onAgain={() =>
            setView({
              name: "practice",
              mode: view.data.mode,
              lessonId: view.data.lessonId,
            })
          }
          onNext={
            view.data.nextLessonId
              ? () =>
                  setView({
                    name: "practice",
                    mode: "lesson",
                    lessonId: view.data.nextLessonId,
                  })
              : undefined
          }
          onReview={() => setView({ name: "practice", mode: "review" })}
        />
      )}
    </>
  )
}
