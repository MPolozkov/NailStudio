import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthModal({ onClose, onSuccess, message }) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '', password2: '' })

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (mode === 'register') {
      if (!form.first_name || !form.last_name || !form.email || !form.phone || !form.password || !form.password2) {
        setError('Все поля обязательны')
        return
      }
      if (form.password !== form.password2) {
        setError('Пароли не совпадают')
        return
      }
    } else {
      if (!form.email || !form.password) {
        setError('Заполните email и пароль')
        return
      }
    }
    setLoading(true)
    try {
      if (mode === 'register') {
        await register({ first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone, password: form.password })
      } else {
        await login(form.email, form.password)
      }
      onSuccess && onSuccess()
      onClose && onClose()
    } catch (err) {
      setError(err.message || 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {message && (
          <div style={styles.message}>
            <span style={styles.messageIcon}>🔒</span> {message}
          </div>
        )}
        <div style={styles.tabs}>
          <button onClick={() => { setMode('login'); setError('') }} style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}>Вход</button>
          <button onClick={() => { setMode('register'); setError('') }} style={{ ...styles.tab, ...(mode === 'register' ? styles.tabActive : {}) }}>Регистрация</button>
        </div>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <>
              <Input label="Имя" value={form.first_name} onChange={set('first_name')} required />
              <Input label="Фамилия" value={form.last_name} onChange={set('last_name')} required />
              <Input label="Номер телефона" value={form.phone} onChange={set('phone')} required />
              <Input label="Электронная почта" type="email" value={form.email} onChange={set('email')} required />
            </>
          )}
          {mode === 'login' && <Input label="Электронная почта" type="email" value={form.email} onChange={set('email')} required />}
          <PasswordInput label="Пароль" value={form.password} onChange={set('password')} required />
          {mode === 'register' && <PasswordInput label="Повторите пароль" value={form.password2} onChange={set('password2')} required />}
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" disabled={loading} style={styles.submit}>
            {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Input({ label, ...props }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input {...props} style={styles.input} />
    </label>
  )
}

function PasswordInput({ label, ...props }) {
  const [show, setShow] = useState(false)
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <div style={styles.passWrap}>
        <input {...props} type={show ? 'text' : 'password'} style={styles.input} />
        <button type="button" onClick={() => setShow(!show)} style={styles.eye} title={show ? 'Скрыть пароль' : 'Показать пароль'}>
          {show ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          )}
        </button>
      </div>
    </label>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: 20 },
  card: { background: '#fff', borderRadius: 14, padding: 24, width: 400, maxWidth: '92%', boxShadow: '0 15px 40px rgba(0,0,0,0.25)', maxHeight: '92vh', overflowY: 'auto' },
  message: { display: 'flex', alignItems: 'center', gap: 8, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontWeight: 600, marginBottom: 14 },
  messageIcon: { fontSize: 16 },
  tabs: { display: 'flex', gap: 8, marginBottom: 18 },
  tab: { flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 600, color: '#64748b' },
  tabActive: { background: '#be185d', color: '#fff', borderColor: '#be185d' },
  field: { display: 'block', marginBottom: 12 },
  label: { display: 'block', fontSize: 13, color: '#475569', marginBottom: 4 },
  input: { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 },
  passWrap: { position: 'relative' },
  eye: { position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center' },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 10 },
  submit: { width: '100%', padding: '11px 0', borderRadius: 8, background: '#be185d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15 },
}