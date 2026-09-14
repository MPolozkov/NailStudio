import { useEffect, useState } from 'react'
import { api, setToken } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { avatarSrc } from '../components/Header'
import Toast from '../components/Toast'

export default function AdminCabinet() {
  const { user, setUser } = useAuth()
  const [adminExists, setAdminExists] = useState(null)
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', phone: '', password2: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [overview, setOverview] = useState([])
  const [toast, setToast] = useState(null)
  const [msgTo, setMsgTo] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.adminStatus().then((r) => setAdminExists(r.registered))
  }, [])

  const isAdmin = user && user.role === 'Admin'

  async function loadOverview() {
    try {
      const data = await api.adminOverview()
      setOverview(data)
    } catch (e) {
      setOverview([])
    }
  }

  useEffect(() => {
    if (isAdmin) loadOverview()
  }, [isAdmin])

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
      setLoading(true)
      try {
        const res = await api.adminRegister({ first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone, password: form.password })
        setToken(res.access_token)
        const me = await api.getMe()
        setUser(me)
        setToast('Администратор зарегистрирован')
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    } else {
      setLoading(true)
      try {
        const res = await api.login({ email: form.email, password: form.password })
        setToken(res.access_token)
        const me = await api.getMe()
        setUser(me)
        if (me.role !== 'Admin') {
          setError('У этого пользователя нет прав администратора')
          setToken(null)
          setUser(null)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
  }

  async function approve(masterId) {
    try {
      await api.adminApprove(masterId)
      setToast('Мастер одобрен')
      loadOverview()
    } catch (err) {
      setToast(err.message)
    }
  }

  async function removeMaster(masterId) {
    try {
      await api.adminDeleteMaster(masterId)
      setToast('Мастер удалён')
      loadOverview()
    } catch (err) {
      setToast(err.message)
    }
  }

  async function sendMessage(masterId) {
    try {
      await api.adminMessage({ master_id: masterId, subject: 'Сообщение от администратора', body: msg })
      setToast('Сообщение отправлено мастеру')
      setMsgTo(null)
      setMsg('')
    } catch (err) {
      setToast(err.message)
    }
  }

  if (!isAdmin) {
    return (
      <div style={styles.centerWrap}>
        <div style={styles.card}>
          <h2 style={styles.title}>Кабинет администратора</h2>
          <div style={styles.tabs}>
            <button onClick={() => { setMode('login'); setError('') }} style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}>Вход</button>
            <button onClick={() => { setMode('register'); setError('') }} style={{ ...styles.tab, ...(mode === 'register' ? styles.tabActive : {}) }}>Регистрация</button>
          </div>
          {mode === 'register' && adminExists === true && (
            <div style={styles.warn}>Администратор уже зарегистрирован. Регистрация доступна только один раз.</div>
          )}
          <form onSubmit={submit}>
            {mode === 'register' && (
              <>
                <Field label="Имя" value={form.first_name} onChange={set('first_name')} />
                <Field label="Фамилия" value={form.last_name} onChange={set('last_name')} />
                <Field label="Номер телефона" value={form.phone} onChange={set('phone')} />
              </>
            )}
            <Field label="Электронная почта" type="email" value={form.email} onChange={set('email')} />
            <PasswordField label="Пароль" value={form.password} onChange={set('password')} />
            {mode === 'register' && <PasswordField label="Повторите пароль" value={form.password2} onChange={set('password2')} />}
            {error && <div style={styles.error}>{error}</div>}
            <button type="submit" disabled={loading} style={styles.btn}>{loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрировать'}</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <h1>Кабинет администратора</h1>
      {overview.length === 0 && <p>Мастера не найдены.</p>}
      {overview.map(({ master, clients }) => (
        <div key={master.id} style={styles.masterCard}>
          <div className="app-admin-master-head" style={styles.masterHead}>
            <img src={avatarSrc(master.image)} alt={master.name} style={styles.avatar} />
            <div style={styles.masterInfo}>
              <b style={styles.masterName}>{master.name}</b>
              <div style={styles.meta}>{master.specialty} · Стаж: {master.experience}</div>
              {master.status === 'pending' && <span style={styles.badge}>Заявка на проверке</span>}
              {master.status === 'active' && <span style={styles.badgeActive}>Активен</span>}
            </div>
            <div className="app-admin-actions" style={styles.masterActions}>
              {master.status === 'pending' && <button onClick={() => approve(master.id)} style={styles.approveBtn}>Одобрить</button>}
              <button onClick={() => setMsgTo(master.id)} style={styles.msgBtn}>Написать</button>
              <button onClick={() => removeMaster(master.id)} style={styles.delBtn}>Удалить</button>
            </div>
          </div>

          <div style={styles.section}>
            <h3>Услуги</h3>
            {master.services.length === 0 && <p style={styles.meta}>Нет услуг.</p>}
            {master.services.map((s) => (
              <div key={s.id} style={styles.row}>{s.title} — {s.price} ₽ ({s.duration_minutes} мин)</div>
            ))}
          </div>

          <div style={styles.section}>
            <h3>Клиенты</h3>
            {clients.length === 0 && <p style={styles.meta}>Нет клиентов.</p>}
            {clients.map((c) => (
              <div key={c.id} style={styles.client}>
                <img src={avatarSrc(c.image)} alt="client" style={styles.miniAvatar} />
                <div>
                  <b>{c.first_name} {c.last_name}</b>
                  <div style={styles.meta}>
                    {c.appointments.map((a, i) => (
                      <div key={i}>{a.service} · {a.date} в {a.time} · {a.amount} ₽</div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {msgTo && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Сообщение мастеру</h3>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} style={styles.textarea} placeholder="Текст сообщения" />
            <div style={styles.modalBtns}>
              <button onClick={() => setMsgTo(null)} style={styles.cancelBtn}>Отмена</button>
              <button onClick={() => sendMessage(msgTo)} style={styles.btn}>Отправить</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}

function Field({ label, ...props }) {
  return (
    <div style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input {...props} style={styles.input} />
    </div>
  )
}

function PasswordField({ label, ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div style={styles.field}>
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
    </div>
  )
}

const styles = {
  centerWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: 20 },
  card: { background: '#fff', borderRadius: 14, padding: 24, width: 400, maxWidth: '92%', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
  title: { textAlign: 'center', margin: '0 0 16px' },
  tabs: { display: 'flex', gap: 8, marginBottom: 16 },
  tab: { flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 600, color: '#64748b' },
  tabActive: { background: '#be185d', color: '#fff', borderColor: '#be185d' },
  warn: { background: '#fef3c7', color: '#92400e', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 },
  field: { marginBottom: 12 },
  label: { display: 'block', fontSize: 13, color: '#475569', marginBottom: 4 },
  input: { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 },
  passWrap: { position: 'relative' },
  eye: { position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center' },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 10 },
  btn: { width: '100%', padding: '10px 0', borderRadius: 8, background: '#be185d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 },
  wrap: { maxWidth: 1000, margin: '0 auto', padding: 30 },
  masterCard: { background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 20 },
  masterHead: { display: 'flex', alignItems: 'center', gap: 16 },
  avatar: { width: 70, height: 70, borderRadius: '50%', objectFit: 'cover' },
  masterInfo: { flex: 1 },
  masterName: { fontSize: 18 },
  meta: { color: '#64748b', fontSize: 13 },
  badge: { display: 'inline-block', background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, marginTop: 4 },
  badgeActive: { display: 'inline-block', background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, marginTop: 4 },
  masterActions: { display: 'flex', flexDirection: 'column', gap: 6 },
  approveBtn: { padding: '7px 12px', borderRadius: 8, background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 },
  msgBtn: { padding: '7px 12px', borderRadius: 8, background: '#0ea5e9', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 },
  delBtn: { padding: '7px 12px', borderRadius: 8, background: '#fee2e2', color: '#b91c1c', border: 'none', cursor: 'pointer', fontWeight: 600 },
  section: { marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 12 },
  row: { padding: '6px 0', borderBottom: '1px solid #f8fafc', fontSize: 14 },
  client: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f8fafc' },
  miniAvatar: { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { background: '#fff', borderRadius: 14, padding: 24, width: 420, maxWidth: '92%' },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, minHeight: 80, marginBottom: 12 },
  modalBtns: { display: 'flex', gap: 10 },
  cancelBtn: { flex: 1, padding: '10px 0', borderRadius: 8, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 700 },
}