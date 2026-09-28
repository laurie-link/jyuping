let audio: AudioContext | null = null

export function playCue(kind: "ok" | "bad" | "combo") {
  const Ctx = window.AudioContext
  if (!Ctx) return
  if (!audio) audio = new Ctx()
  if (audio.state === "suspended") void audio.resume()

  const now = audio.currentTime
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = "sine"
  osc.frequency.value = kind === "bad" ? 180 : kind === "combo" ? 740 : 520
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.045, now + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "combo" ? 0.18 : 0.1))
  osc.connect(gain).connect(audio.destination)
  osc.start(now)
  osc.stop(now + 0.2)
}

function cantoneseVoice(): SpeechSynthesisVoice | undefined {
  return speechSynthesis.getVoices().find((item) => {
    const lang = item.lang.toLowerCase().replaceAll("_", "-")
    return lang.startsWith("zh-hk") || /cantonese|粤语|粵語/i.test(item.name)
  })
}

export function speakCantonese(text: string) {
  if (!("speechSynthesis" in window) || !text) return

  const speak = () => {
    const voice = cantoneseVoice()
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
