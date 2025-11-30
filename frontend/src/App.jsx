import { useState, useRef, useEffect } from 'react'
import './App.css'

const API_BASE = 'http://localhost:8080'

function App() {
  // prompt + sessions сразу тащим из localStorage
  const [prompt, setPrompt] = useState(() => localStorage.getItem('prompt') || '')
  const [sessions, setSessions] = useState(() => {
    try {
      const raw = localStorage.getItem('sessions')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const wsRefs = useRef({})

  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [authMode, setAuthMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [history, setHistory] = useState([]) // [{id, prompt, pdf_path, created_at}]
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const runningCount = sessions.filter((s) => s.status === 'running').length
  const canStart = prompt.trim() && runningCount < 3

  // сохраняем сессии и prompt в localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sessions', JSON.stringify(sessions))
    } catch {
      // ignore
    }
  }, [sessions])

  useEffect(() => {
    localStorage.setItem('prompt', prompt)
  }, [prompt])

  const authHeaders = token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {}

  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      const url =
        authMode === 'login'
          ? `${API_BASE}/auth/login`
          : `${API_BASE}/auth/register`

      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', password)

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Request failed')
      }

      const data = await res.json()

      if (authMode === 'register') {
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        })
        if (!loginRes.ok) {
          throw new Error('Registration succeeded but login failed')
        }
        const loginData = await loginRes.json()
        localStorage.setItem('token', loginData.access_token)
        setToken(loginData.access_token)
      } else {
        localStorage.setItem('token', data.access_token)
        setToken(data.access_token)
      }

      setHistoryLoaded(false)
      setEmail('')
      setPassword('')
    } catch (err) {
      setAuthError(err.message || 'Authentication error')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken('')
    setHistory([])
    setHistoryLoaded(false)
  }

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history`, {
        headers: {
          ...authHeaders,
        },
      })
      if (!res.ok) {
        throw new Error('Failed to load history')
      }
      const data = await res.json()
      setHistory(data)
      setHistoryLoaded(true)
    } catch (err) {
      console.error(err)
    }
  }

  const startSession = () => {
    const text = prompt.trim()
    if (!text || !canStart) return

    const id = Date.now().toString()

    setSessions((prev) => [
      ...prev,
      {
        id,
        prompt: text,
        currentLog: null,
        history: [],
        status: 'running',
        pdfUrl: null,
        showHistory: false,
      },
    ])
    setPrompt('')

    const wsUrl = token
      ? `ws://localhost:8080/ws?token=${encodeURIComponent(token)}`
      : 'ws://localhost:8080/ws'

    const ws = new WebSocket(wsUrl)
    wsRefs.current[id] = ws

    ws.onopen = () => {
      ws.send(text)
    }

    ws.onmessage = (event) => {
      const msg = event.data

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s

          const updatedHistory = s.currentLog
            ? [...s.history, { id: s.currentLog.id, text: s.currentLog.text }]
            : [...s.history]

          return {
            ...s,
            currentLog: {
              id: Date.now().toString() + Math.random(),
              text: msg,
            },
            history: updatedHistory,
          }
        }),
      )

      if (msg.startsWith('done:')) {
        fetchPdfFor(id)
        if (token) {
          setHistoryLoaded(false)
        }
      }
    }

    ws.onclose = () => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id && s.status === 'running'
            ? { ...s, status: 'done' }
            : s,
        ),
      )
      delete wsRefs.current[id]
    }

    ws.onerror = () => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: 'error',
                currentLog: { id: 'err', text: 'error: connection failed' },
              }
            : s,
        ),
      )
    }
  }

  const fetchPdfFor = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/get_pdf`, {
        headers: {
          ...authHeaders,
        },
      })
      if (!res.ok) throw new Error('PDF not ready')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, pdfUrl: url, status: 'done' } : s,
        ),
      )
    } catch (e) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: 'error',
                currentLog: { id: 'err2', text: 'error: failed to fetch PDF' },
              }
            : s,
        ),
      )
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      startSession()
    }
  }

  const downloadPdf = (url) => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = 'report.pdf'
    a.click()
  }

  const toggleHistory = (id) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, showHistory: !s.showHistory } : s,
      ),
    )
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Autonomous AI Agent</h1>
        <p className="subtitle">
          Describe your task and the agent will plan, research and return a PDF report. Up to three
          requests can run in parallel.
        </p>

        <div className="auth-bar">
          {token ? (
            <>
              <span className="auth-status">Signed in</span>
              <button className="auth-btn secondary" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <div className="auth-toggle">
                <button
                  type="button"
                  className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                  onClick={() => setAuthMode('login')}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
                  onClick={() => setAuthMode('register')}
                >
                  Register
                </button>
              </div>
              <input
                type="email"
                className="auth-input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                className="auth-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button className="auth-btn" type="submit" disabled={authLoading}>
                {authLoading ? 'Please wait…' : authMode === 'login' ? 'Login' : 'Register'}
              </button>
              {authError && <div className="auth-error">{authError}</div>}
            </form>
          )}
        </div>
      </header>

      <section className="top-search">
        <div className="prompt-card wide">
          <textarea
            className="prompt-input"
            placeholder="Type your request here…"
            value={prompt}
            onChange={(e) =>
              setPrompt(e.target.value)
            }
            onKeyDown={handleKeyDown}
            rows={4}
            disabled={runningCount >= 3}
          />
          <button
            className="send-btn"
            onClick={startSession}
            disabled={!canStart}
          >
            {runningCount >= 3 ? 'Limit reached: 3 active requests' : 'Send'}
          </button>
          {sessions.length > 0 && (
            <div className="sessions-info">
              Active requests: {runningCount} / 3
            </div>
          )}
        </div>
      </section>

      {token && (
        <section className="history-section">
          <div className="history-card">
            <div className="history-header">
              <span className="history-title">Request history</span>
              <button className="history-reload" onClick={loadHistory}>
                Reload
              </button>
            </div>
            {history.length === 0 ? (
              <p className="history-empty">
                {historyLoaded
                  ? 'No saved requests yet.'
                  : 'History will appear here after your first request.'}
              </p>
            ) : (
              <ul className="history-list">
                {history.map((item) => (
                  <li key={item.id} className="history-item">
                    <div className="history-prompt">{item.prompt}</div>
                    <div className="history-meta">
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <main className="results-column">
        {sessions.length === 0 && (
          <div className="result-card">
            <p className="placeholder">
              Logs and reports for your requests will appear here.
            </p>
          </div>
        )}

        {sessions
          .slice()
          .reverse()
          .map((s) => (
            <div key={s.id} className="result-card">
              <div className="result-header">
                <div className="session-title">
                  Request: <span>{s.prompt}</span>
                </div>
                <span className={`status-pill status-${s.status}`}>
                  {s.status === 'running' && 'Running'}
                  {s.status === 'done' && 'Completed'}
                  {s.status === 'error' && 'Error'}
                </span>
              </div>

              <div className="logs-title-row">
                <span className="logs-title">Execution log</span>
                <button
                  className="toggle-history-btn"
                  onClick={() => toggleHistory(s.id)}
                >
                  {s.showHistory ? '▲' : '▼'}
                </button>
              </div>

              <div className="logs-body">
                {s.currentLog && (
                  <p
                    key={s.currentLog.id}
                    className="log-line log-line-current"
                  >
                    {s.currentLog.text}
                  </p>
                )}

                {s.showHistory && (
                  <div className="logs-history">
                    {s.history.map((item) => (
                      <p
                        key={item.id}
                        className="log-line log-line-old"
                      >
                        {item.text}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {s.pdfUrl ? (
                <div className="pdf-shell">
                  <div className="result-footer">
                    <button
                      className="download-btn"
                      onClick={() => downloadPdf(s.pdfUrl)}
                    >
                      Download PDF
                    </button>
                  </div>

                  <object
                    data={s.pdfUrl}
                    type="application/pdf"
                    className="pdf-viewer"
                  >
                    <p>
                      Your browser cannot display embedded PDF.{' '}
                      <a href={s.pdfUrl} target="_blank" rel="noreferrer">
                        Open in a new tab
                      </a>
                    </p>
                  </object>
                </div>
              ) : (
                <div className="result-footer">
                  <button className="download-btn" disabled>
                    PDF is being generated
                  </button>
                </div>
              )}
            </div>
          ))}
      </main>
    </div>
  )
}

export default App
