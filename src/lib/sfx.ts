let audio: AudioContext | null = null

function context(): AudioContext {
  if (!audio) audio = new AudioContext()
  return audio
}

export function sharedAudio(): AudioContext {
  return context()
}

let keyBuffers: AudioBuffer[] | null = null
let keyLoading: Promise<AudioBuffer[]> | null = null

/** Single keystrokes from Unicae Games Keyboard Soundpack #1 (CC0). */

function loadKeySounds(): Promise<AudioBuffer[]> {
  if (keyBuffers) return Promise.resolve(keyBuffers)
  if (!keyLoading) {
    const ctx = context()
    keyLoading = Promise.all(
      [0, 1, 2, 3].map(async (index) => {
        const response = await fetch(`/sfx/key-${index}.wav`)
        if (!response.ok) throw new Error(String(response.status))
        return ctx.decodeAudioData(await response.arrayBuffer())
      }),
    )
      .then((buffers) => {
        keyBuffers = buffers
        return buffers
      })
      .catch((error: unknown) => {
        keyLoading = null
        throw error
      })
  }
  return keyLoading
}

export function primeAudio() {
  const ctx = context()
  if (ctx.state === "suspended") void ctx.resume()
  void loadKeySounds()
}

function playKey() {
  const ctx = context()
  void loadKeySounds().then((buffers) => {
    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    source.buffer = buffers[Math.floor(Math.random() * buffers.length)]
    source.playbackRate.value = 0.94 + Math.random() * 0.12
    gain.gain.value = 0.72
    source.connect(gain)
    gain.connect(ctx.destination)
    source.start()
  })
}

function bell(frequency: number, when: number, duration: number, volume: number) {
  const ctx = context()
  const fundamental = ctx.createOscillator()
  const overtone = ctx.createOscillator()
  const overtoneGain = ctx.createGain()
  const gain = ctx.createGain()
  fundamental.type = "sine"
  overtone.type = "triangle"
  fundamental.frequency.setValueAtTime(frequency, when)
  overtone.frequency.setValueAtTime(frequency * 2.01, when)
  overtoneGain.gain.setValueAtTime(0.18, when)
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(volume, when + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration)
  fundamental.connect(gain)
  overtone.connect(overtoneGain)
  overtoneGain.connect(gain)
  gain.connect(ctx.destination)
  fundamental.start(when)
  overtone.start(when)
  fundamental.stop(when + duration + 0.03)
  overtone.stop(when + duration + 0.03)
}

export type SfxName = "key" | "perfect" | "great" | "hard" | "wrong" | "combo"

export function playSfx(name: SfxName, combo = 1) {
  const ctx = context()
  const start = () => {
    const now = ctx.currentTime
    if (name === "key") {
      playKey()
      return
    }
    if (name === "wrong") {
      bell(392, now, 0.17, 0.36)
      bell(262, now + 0.09, 0.25, 0.32)
      return
    }
    if (name === "combo") {
      const root = 494 + Math.min(combo, 16) * 14
      bell(root, now, 0.16, 0.18)
      bell(root * 1.26, now + 0.07, 0.18, 0.19)
      bell(root * 1.5, now + 0.14, 0.26, 0.2)
      return
    }
    if (name === "perfect") {
      bell(659, now, 0.14, 0.2)
      bell(880, now + 0.07, 0.2, 0.22)
      return
    }
    if (name === "great") {
      bell(784, now, 0.16, 0.2)
      return
    }
    bell(659, now, 0.12, 0.17)
  }

  if (ctx.state === "suspended") {
    void ctx.resume().then(start)
    return
  }
  start()
}
