import { sharedAudio } from "./sfx"

let playback: AudioBufferSourceNode | null = null
let requestId = 0

function browserVoice(): SpeechSynthesisVoice | undefined {
  return speechSynthesis.getVoices().find((item) => {
    const lang = item.lang.toLowerCase().replaceAll("_", "-")
    return lang.startsWith("zh-hk") || /cantonese|粤语|粵語/i.test(item.name)
  })
}

function speakWithBrowser(text: string) {
  if (!("speechSynthesis" in window)) return
  const speak = () => {
    const voice = browserVoice()
    if (!voice) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "zh-HK"
    utterance.voice = voice
    utterance.rate = 0.86
    speechSynthesis.cancel()
    speechSynthesis.speak(utterance)
  }
  if (speechSynthesis.getVoices().length === 0) {
    speechSynthesis.addEventListener("voiceschanged", speak, { once: true })
    return
  }
  speak()
}

/** Microsoft Edge 晓佳，zh-HK-HiuGaaiNeural. Falls back to the browser voice. */
export async function speakCantonese(text: string) {
  const line = text.trim()
  if (!line) return
  const id = ++requestId
  if ("speechSynthesis" in window) speechSynthesis.cancel()
  if (playback) {
    try {
      playback.stop()
    } catch {
      // already finished
    }
    playback = null
  }

  try {
    const response = await fetch(`/api/tts?text=${encodeURIComponent(line)}`)
    if (!response.ok) throw new Error(String(response.status))
    if (id !== requestId) return
    const bytes = await response.arrayBuffer()
    if (id !== requestId) return
    const ctx = sharedAudio()
    if (ctx.state === "suspended") await ctx.resume()
    if (id !== requestId) return
    const buffer = await ctx.decodeAudioData(bytes.slice(0))
    if (id !== requestId) return
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    playback = source
    source.onended = () => {
      if (playback === source) playback = null
    }
    source.start()
  } catch {
    if (id === requestId) speakWithBrowser(line)
  }
}
