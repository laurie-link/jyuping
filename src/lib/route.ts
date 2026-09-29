import { useSyncExternalStore } from "react"
import { commonThemes } from "../data/common-themes"
import { getLesson, sections } from "../data/lessons"
import type { SummaryData } from "./types"

export const COMMON_BAND_SIZE = 25
const SUMMARY_KEY = "jyutping-memo:summary"

export type Route =
  | { name: "home" }
  | { name: "section"; sectionId: string; band: number | null; folder: null | "themes"; themeId: string | null }
  | { name: "lookup" }
  | { name: "translate" }
  | { name: "lyrics"; query: string; songId: number | null; drill: null | "copy" | "practice"; done: boolean }
  | { name: "practice"; mode: "lesson"; lessonId: string }
  | { name: "review" }
  | { name: "summary" }

const HOME: Route = { name: "home" }

function decodePart(part: string) {
  try {
    return decodeURIComponent(part)
  } catch {
    return part
  }
}

function partsOf(hash: string) {
  return hash.replace(/^#/, "").replace(/^\//, "").split("/").filter(Boolean).map(decodePart)
}

function sectionRoute(sectionId: string, band: number | null, folder: null | "themes", themeId: string | null): Route {
  return { name: "section", sectionId, band, folder, themeId }
}

export function parseRoute(hash: string): Route {
  const parts = partsOf(hash)
  if (parts.length === 0) return HOME
  if (parts[0] === "lookup" && parts.length === 1) return { name: "lookup" }
  if (parts[0] === "translate" && parts.length === 1) return { name: "translate" }
  if (parts[0] === "review" && parts.length === 1) return { name: "review" }
  if (parts[0] === "summary" && parts.length === 1) return { name: "summary" }
  if (parts[0] === "practice" && parts.length === 2 && getLesson(parts[1])) {
    return { name: "practice", mode: "lesson", lessonId: parts[1] }
  }
  if (parts[0] === "course" && parts.length === 2 && sections.some((section) => section.id === parts[1])) {
    return sectionRoute(parts[1], null, null, null)
  }
  if (parts[0] === "course" && parts[1] === "common" && parts[2] === "band" && parts.length === 4) {
    const band = Number(parts[3])
    const count = sections.find((section) => section.id === "common")?.lessons.length ?? 0
    const bands = Math.ceil(count / COMMON_BAND_SIZE)
    if (Number.isInteger(band) && band >= 0 && band < bands) return sectionRoute("common", band, null, null)
  }
  if (parts[0] === "course" && parts[1] === "common" && parts[2] === "themes" && parts.length === 3) {
    return sectionRoute("common", null, "themes", null)
  }
  if (parts[0] === "course" && parts[1] === "common" && parts[2] === "themes" && parts.length === 4) {
    if (commonThemes.some((theme) => theme.id === parts[3])) return sectionRoute("common", null, "themes", parts[3])
  }
  if (parts[0] === "lyrics" && parts.length === 1) {
    return { name: "lyrics", query: "", songId: null, drill: null, done: false }
  }
  if (parts[0] === "lyrics" && parts[1] === "q" && parts.length === 3 && parts[2].trim()) {
    return { name: "lyrics", query: parts[2], songId: null, drill: null, done: false }
  }
  if (parts[0] === "lyrics" && parts[1] === "song" && parts.length >= 3 && parts.length <= 5) {
    const songId = Number(parts[2])
    if (!Number.isInteger(songId) || songId <= 0) return HOME
    const drill = parts[3]
    if (parts.length === 3) return { name: "lyrics", query: "", songId, drill: null, done: false }
    if (drill !== "copy" && drill !== "practice") return HOME
    if (parts.length === 4) return { name: "lyrics", query: "", songId, drill, done: false }
    if (parts[4] === "done") return { name: "lyrics", query: "", songId, drill, done: true }
  }
  return HOME
}

export function toHash(route: Route): string {
  switch (route.name) {
    case "home":
      return "#/"
    case "lookup":
      return "#/lookup"
    case "translate":
      return "#/translate"
    case "review":
      return "#/review"
    case "summary":
      return "#/summary"
    case "practice":
      return `#/practice/${encodeURIComponent(route.lessonId)}`
    case "section":
      if (route.sectionId === "common" && route.themeId) return `#/course/common/themes/${encodeURIComponent(route.themeId)}`
      if (route.sectionId === "common" && route.folder === "themes") return "#/course/common/themes"
      if (route.sectionId === "common" && route.band !== null) return `#/course/common/band/${route.band}`
      return `#/course/${encodeURIComponent(route.sectionId)}`
    case "lyrics":
      if (route.songId !== null) {
        const drill = route.drill ? `/${route.drill}` : ""
        const done = route.done ? "/done" : ""
        return `#/lyrics/song/${route.songId}${drill}${done}`
      }
      if (route.query.trim()) return `#/lyrics/q/${encodeURIComponent(route.query.trim())}`
      return "#/lyrics"
  }
}

export function parentOf(route: Route): Route {
  if (route.name === "section") {
    if (route.themeId) return sectionRoute("common", null, "themes", null)
    if (route.folder === "themes" || route.band !== null) return sectionRoute("common", null, null, null)
    return HOME
  }
  if (route.name === "lyrics") {
    if (route.done && route.songId !== null && route.drill) {
      return { name: "lyrics", query: "", songId: route.songId, drill: route.drill, done: false }
    }
    if (route.drill && route.songId !== null) {
      return { name: "lyrics", query: "", songId: route.songId, drill: null, done: false }
    }
    if (route.songId !== null || route.query) return { name: "lyrics", query: "", songId: null, drill: null, done: false }
  }
  return HOME
}

function address(hash: string) {
  return `${location.pathname}${location.search}${hash}`
}

let current = parseRoute(location.hash)
const listeners = new Set<() => void>()

function hashesMatch(hash: string, route: Route) {
  const target = toHash(route)
  if (location.hash === target || hash === target) return true
  return target === "#/" && (hash === "" || hash === "#")
}

if (!hashesMatch(location.hash, current)) {
  history.replaceState(history.state, "", address(toHash(current)))
}

function emit(next: Route) {
  if (toHash(current) === toHash(next)) return
  current = next
  for (const listener of listeners) listener()
}

function read() {
  emit(parseRoute(location.hash))
}

window.addEventListener("popstate", read)

export function getRoute() {
  return current
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function go(next: Route) {
  const hash = toHash(next)
  if (hashesMatch(location.hash, next)) return
  history.pushState({ app: true }, "", address(hash))
  emit(parseRoute(hash))
}

export function replaceRoute(next: Route) {
  const hash = toHash(next)
  if (hashesMatch(location.hash, next) && toHash(current) === hash) return
  history.replaceState({ app: true }, "", address(hash))
  emit(parseRoute(hash))
}

export function isEscape(event: KeyboardEvent) {
  return (
    event.key === "Escape" &&
    !event.repeat &&
    !event.isComposing &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.shiftKey
  )
}

export function back(fallback: Route) {
  if (history.state && typeof history.state === "object" && "app" in history.state && history.state.app) {
    history.back()
    return
  }
  replaceRoute(fallback)
}

export function useRoute() {
  return useSyncExternalStore(subscribe, getRoute, getRoute)
}

export function loadSummary(): SummaryData | null {
  try {
    const raw = sessionStorage.getItem(SUMMARY_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<SummaryData>
    if (!data || typeof data.title !== "string" || typeof data.rating !== "string" || typeof data.mode !== "string") return null
    return data as SummaryData
  } catch {
    return null
  }
}

export function saveSummary(data: SummaryData) {
  sessionStorage.setItem(SUMMARY_KEY, JSON.stringify(data))
}

export function clearSummary() {
  sessionStorage.removeItem(SUMMARY_KEY)
}
