import { useState, type FormEvent } from "react"
import { login, register } from "../lib/auth"

type Mode = "login" | "register"

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [oldPassword, setOldPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError("")
    setConfirm("")
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    if (mode === "register" && password !== confirm) {
      setError("两次密码不一样")
      return
    }
    setPending(true)
    setError("")
    const result = mode === "register" ? await register(username, password, oldPassword) : await login(username, password, oldPassword)
    if (!result.ok) setError(result.error)
    setPending(false)
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
      </header>
      <form className="auth-card" onSubmit={(event) => void submit(event)}>
        <div className="segment" role="tablist" aria-label="登录或注册">
          <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "on" : ""} onClick={() => switchMode("login")}>
            登录
          </button>
          <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "on" : ""} onClick={() => switchMode("register")}>
            注册
          </button>
        </div>
        <h2>{mode === "login" ? "进入你的练习" : "建一个账号"}</h2>
        <p className="lede">
          {mode === "login"
            ? "进度记在服务器账号上。旧版本机账号请先点“注册”，用相同账号建立服务器账号。"
            : "新密码至少 8 个字。旧版本机账号可用相同账号注册，进度会导入。"}
        </p>
        <div className="auth-fields">
          <label>
            账号
            <input
              name="username"
              autoComplete="username"
              value={username}
              maxLength={32}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            密码
            <input
              name="password"
              type="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={password}
              maxLength={64}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {mode === "register" && (
            <label>
              再写一次密码
              <input
                name="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                maxLength={64}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </label>
          )}
        </div>
        <details className="legacy-import">
          <summary>旧版密码和现在不同？导入这台浏览器的进度</summary>
          <label>
            旧版密码
            <input
              name="oldPassword"
              type="password"
              autoComplete="off"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
            />
          </label>
        </details>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="solid" disabled={pending}>
          {pending ? "请稍等" : mode === "login" ? "登录" : "注册"}
        </button>
        <p className="lookup-note">账号和练习进度保存在本站服务器。旧版在这台浏览器里的记录，使用相同账号并输入旧版密码后会导入到空的服务器账号。</p>
      </form>
    </div>
  )
}
