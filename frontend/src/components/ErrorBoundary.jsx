import { Component } from 'react'

// Защита от «пустой страницы»: если любой компонент упадёт во время рендера,
// вместо белого экрана показываем понятное сообщение об ошибке.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Ошибка рендера:', error, info)
  }

  render() {
    if (this.state.error) {
      const err = this.state.error
      return (
        <div style={{ maxWidth: 640, margin: '60px auto', padding: 30, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ color: '#be185d', marginBottom: 12 }}>Что-то пошло не так</h1>
          <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.5 }}>
            Произошла непредвиденная ошибка. Обновите страницу или попробуйте ещё раз.
          </p>
          {err && err.message && (
            <pre style={{ background: '#f1f5f9', color: '#b91c1c', padding: 14, borderRadius: 8, textAlign: 'left', fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '16px 0' }}>
              {err.message}
            </pre>
          )}
          {err && err.stack && (
            <pre style={{ background: '#f8fafc', color: '#475569', padding: 12, borderRadius: 8, textAlign: 'left', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '8px 0 16px' }}>
              {err.stack}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, background: '#be185d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}
          >
            Обновить страницу
          </button>
        </div>
      )
    }
    return this.props.children
  }
}