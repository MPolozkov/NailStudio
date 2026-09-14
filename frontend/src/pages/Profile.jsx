import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { avatarSrc } from '../components/Header'
import { readImageAsWebP } from '../utils/image'
import AuthModal from '../components/AuthModal'
import RescheduleModal from '../components/RescheduleModal'
import Toast from '../components/Toast'

export default function Profile() {
  const { user, setUser, loadMe } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [form, setForm] = useState({})
  const [pass, setPass] = useState({ current: '', next: '', next2: '' })
  const [toast, setToast] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [passSaving, setPassSaving] = useState(false)
  const [reschedule, setReschedule] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    setForm({ first_name: user.first_name, last_name: user.last_name, email: user.email, phone: user.phone, city: user.city, bio: user.bio })
    api.myAppointments().then(setAppointments).catch(() => setAppointments([]))
  }, [user])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  function onImage(e) {
    const file = e.target.files[0]
    if (!file) return
    readImageAsWebP(file)
      .then((webp) => setForm({ ...form, image: webp }))
      .catch((err) => {
        setToast(err.message)
        e.target.value = ''
      })
  }

  function validateRequired() {
    if (!form.first_name || !form.last_name || !form.email || !form.phone) {
      setError('Имя, фамилия, номер телефона и электронная почта — обязательные поля')
      return false
    }
    setError('')
    return true
  }

  async function saveProfile() {
    if (!validateRequired()) return
    setSaving(true)
    try {
      const updated = await api.updateMe(form)
      setUser(updated)
      const img = updated.image ? 'фото' : 'пусто'
      setToast(`Профиль успешно изменён\nИмя: ${updated.first_name || 'пусто'}\nФамилия: ${updated.last_name || 'пусто'}\nФото: ${img}`)
    } catch (err) {
      setToast(`Не удалось изменить профиль: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function saveFIO() {
    if (!form.first_name || !form.last_name) {
      setError('Имя и фамилия — обязательные поля')
      return
    }
    setError('')
    setSaving(true)
    try {
      const updated = await api.updateMe({ first_name: form.first_name, last_name: form.last_name })
      setUser(updated)
      setToast(`ФИО изменено\nИмя: ${updated.first_name}\nФамилия: ${updated.last_name}`)
    } catch (err) {
      setToast(`Не удалось изменить ФИО: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function changePassword() {
    if (!pass.current || !pass.next || !pass.next2) {
      setToast('Заполните все поля пароля')
      return
    }
    if (pass.next !== pass.next2) {
      setToast('Пароли не совпадают')
      return
    }
    setPassSaving(true)
    try {
      await api.changePassword({ current_password: pass.current, new_password: pass.next })
      setToast('Пароль успешно изменён')
      setPass({ current: '', next: '', next2: '' })
    } catch (err) {
      setToast(err.message || 'Не удалось изменить пароль')
    } finally {
      setPassSaving(false)
    }
  }

  async function removeAppt(id) {
    try {
      await api.deleteAppointment(id)
      setAppointments((a) => a.filter((x) => x.id !== id))
      setToast('Запись удалена, время освобождено')
    } catch (err) {
      setToast(err.message)
    }
  }

  function onRescheduled(date, time) {
    setAppointments((list) => list.map((a) => (a.id === reschedule.id ? { ...a, date, time } : a)))
    setReschedule(null)
    setToast(`Запись перенесена\nНовая дата: ${date}\nНовое время: ${time}`)
  }

  function fmtDate(d) {
    if (!d) return ''
    const [y, m, day] = String(d).split('-')
    return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  function fmtTime(t) {
    return t ? String(t).slice(0, 5) : ''
  }

  if (!user) {
    return (
      <div style={{ position: 'relative', minHeight: '70vh' }}>
        <div style={styles.placeholder}>Для доступа к личному кабинету войдите или зарегистрируйтесь.</div>
        <AuthModal onClose={() => { setAuthOpen(false) }} />
      </div>
    )
  }

  const masters = []
  const seen = {}
  appointments.forEach((a) => {
    if (a.master && !seen[a.master.id]) {
      seen[a.master.id] = true
      masters.push(a.master)
    }
  })

  return (
    <div style={styles.wrap}>
      <h1 style={styles.pageTitle}>Личный кабинет</h1>
      <div className="app-two-col" style={styles.grid}>
        <div style={styles.card}>
          <h2>Личный кабинет</h2>
          <img src={avatarSrc(form.image || user.image)} alt="avatar" style={styles.avatar} />
          <div style={styles.field}>
            <span style={styles.label}>Фото</span>
            <input type="file" accept="image/*" onChange={onImage} />
          </div>
          <div style={styles.field}>
            <span style={styles.label}>Имя *</span>
            <input value={form.first_name || ''} onChange={set('first_name')} style={styles.input} />
          </div>
          <div style={styles.field}>
            <span style={styles.label}>Фамилия *</span>
            <input value={form.last_name || ''} onChange={set('last_name')} style={styles.input} />
          </div>
          <button onClick={saveFIO} disabled={saving} style={styles.btn}>{saving ? 'Сохранение...' : 'Сохранить ФИО'}</button>

          <div style={styles.field}>
            <span style={styles.label}>Электронная почта *</span>
            <input value={form.email || ''} onChange={set('email')} style={styles.input} />
          </div>
          <div style={styles.field}>
            <span style={styles.label}>Телефон *</span>
            <input value={form.phone || ''} onChange={set('phone')} style={styles.input} />
            {!user.phone_confirmed && <span style={styles.hint}>Телефон не подтверждён: {user.phone}</span>}
          </div>
          <div style={styles.field}>
            <span style={styles.label}>Город</span>
            <input value={form.city || ''} onChange={set('city')} style={styles.input} />
          </div>
          <div style={styles.field}>
            <span style={styles.label}>О себе</span>
            <textarea value={form.bio || ''} onChange={set('bio')} style={styles.textarea} />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button onClick={saveProfile} disabled={saving} style={styles.btn}>{saving ? 'Сохранение...' : 'Сохранить профиль'}</button>

          <h3 style={styles.h3}>Смена пароля</h3>
          <PasswordInput label="Текущий пароль" value={pass.current} onChange={(e) => setPass({ ...pass, current: e.target.value })} />
          <PasswordInput label="Новый пароль" value={pass.next} onChange={(e) => setPass({ ...pass, next: e.target.value })} />
          <PasswordInput label="Повторите пароль" value={pass.next2} onChange={(e) => setPass({ ...pass, next2: e.target.value })} />
          <button onClick={changePassword} disabled={passSaving} style={styles.btn}>{passSaving ? 'Сохранение...' : 'Изменить пароль'}</button>
        </div>

        <div style={styles.right}>
          <div style={styles.card}>
            <h2>Мои записи</h2>
            {appointments.length === 0 && <p>Записей пока нет.</p>}
            {appointments.map((a) => (
              <div key={a.id} className="app-appt" style={styles.appt} onClick={() => setReschedule(a)} title="Нажмите, чтобы изменить запись">
                <div style={styles.apptInfo}>
                  <div style={styles.apptMaster}>
                    {a.master && <img src={avatarSrc(a.master.image)} alt={a.master.name} style={styles.miniAvatar} />}
                    <b>{a.service_title}</b>
                  </div>
                  <div style={styles.meta}>
                    {a.master?.name} · {fmtDate(a.date)} в {fmtTime(a.time)} · {a.amount} ₽
                  </div>
                </div>
                <div className="app-appt-actions" style={styles.apptActions}>
                  <button onClick={(e) => { e.stopPropagation(); setReschedule(a) }} style={styles.editBtn}>Изменить</button>
                  <button onClick={(e) => { e.stopPropagation(); removeAppt(a.id) }} style={styles.delBtn}>Удалить</button>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.card}>
            <h2>Мои мастера</h2>
            {masters.length === 0 && <p>Вы ещё не записывались к мастерам.</p>}
            {masters.map((m) => (
              <Link key={m.id} to={`/master/${m.id}`} style={styles.masterRow}>
                <img src={avatarSrc(m.image)} alt={m.name} style={styles.miniAvatar} />
                <div>
                  <span style={styles.masterName}>{m.name}</span>
                  {m.specialty && <div style={styles.meta}>{m.specialty}</div>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {reschedule && (
        <RescheduleModal
          appointment={reschedule}
          onClose={() => setReschedule(null)}
          onSaved={onRescheduled}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}

function PasswordInput({ label, ...props }) {
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
  wrap: { maxWidth: 1000, margin: '0 auto', padding: 30 },
  pageTitle: { textAlign: 'center', color: '#be185d', marginBottom: 20 },
  placeholder: { textAlign: 'center', padding: 60, color: '#64748b' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  card: { background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' },
  right: { display: 'flex', flexDirection: 'column', gap: 20 },
  avatar: { width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', marginBottom: 12, border: '2px solid #fbcfe8' },
  field: { marginBottom: 12 },
  label: { display: 'block', fontSize: 13, color: '#475569', marginBottom: 4 },
  input: { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, minHeight: 60 },
  hint: { display: 'block', fontSize: 12, color: '#b45309', marginTop: 4 },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 10 },
  btn: { width: '100%', padding: '10px 0', borderRadius: 8, background: '#be185d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, marginBottom: 8 },
  h3: { marginTop: 20, marginBottom: 8 },
  passWrap: { position: 'relative' },
  eye: { position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center' },
  appt: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 10, gap: 10, cursor: 'pointer' },
  apptInfo: { flex: 1, minWidth: 0 },
  apptMaster: { display: 'flex', alignItems: 'center', gap: 8 },
  apptActions: { display: 'flex', flexDirection: 'column', gap: 6 },
  meta: { color: '#64748b', fontSize: 13, marginTop: 2 },
  editBtn: { padding: '6px 12px', borderRadius: 8, background: '#fce7f3', color: '#be185d', border: 'none', cursor: 'pointer', fontWeight: 600 },
  delBtn: { padding: '6px 12px', borderRadius: 8, background: '#fee2e2', color: '#b91c1c', border: 'none', cursor: 'pointer', fontWeight: 600 },
  masterRow: { display: 'flex', alignItems: 'center', gap: 10, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 8, color: '#0f172a', fontWeight: 500, textDecoration: 'none' },
  masterName: { fontWeight: 600 },
  miniAvatar: { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' },
}