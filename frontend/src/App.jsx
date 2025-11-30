import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [prompt, setPrompt] = useState('')
  const [logs, setLogs] = useState([])          // без типов
  const [loading, setLoading] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const logsEndRef = useRef(null)
  const wsRef = useRef(null)

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  const handleSend = () => {
    const text = prompt.trim()
    if (!text || loading) return

    setLoading(true)
    setLogs([])
    setPdfUrl(null)

    const ws = new WebSocket('ws://localhost:8080/ws')
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(text)
    }

    ws.onmessage = (event) => {
      const msg = event.data
      setLogs((prev) => [...prev, msg])

      if (msg.startsWith('done:')) {
        fetchPdf()
      }
    }

    ws.onclose = () => {
      setLoading(false)
      setPrompt('')
    }

    ws.onerror = () => {
      setLoading(false)
    }
  }

  const fetchPdf = async () => {
    try {
      const res = await fetch('/get_pdf')
      if (!res.ok) throw new Error('PDF not ready')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch (e) {
      console.error(e)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Autonomous AI Agent</h1>
        <p className="subtitle">
          Введи задачу — агент соберёт данные и вернёт PDF‑отчёт.
        </p>
      </header>

      <main className="main">
        <section className="prompt-card">
          <textarea
            className="prompt-input"
            placeholder="Опиши, что тебе нужно..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            disabled={loading}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={loading || !prompt.trim()}
          >
            {loading ? 'Обрабатываю...' : 'Отправить'}
          </button>
        </section>

        {logs.length > 0 && (
          <section className="logs-card">
            <div className="logs-title">Логи выполнения</div>
            <div className="logs-body">
              {logs.map((line, i) => (
                <p key={i} className="log-line">
                  {line}
                </p>
              ))}
              <div ref={logsEndRef} />
            </div>
          </section>
        )}

        {pdfUrl && (
          <section className="pdf-card">
            <div className="pdf-title">Готовый отчёт</div>
            <object
              data={pdfUrl}
              type="application/pdf"
              className="pdf-viewer"
            >
              <p>
                Браузер не умеет встраивать PDF. {' '}
                <a href={pdfUrl} target="_blank" rel="noreferrer">
                  Скачать файл
                </a>
              </p>
            </object>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
