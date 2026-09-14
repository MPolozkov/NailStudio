import { useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import AuthModal from './AuthModal'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

// Полноценный флоу записи, как в веб-версии:
// 1) выбор услуги → 2) календарь + время → 3) подтверждение → Готово.
// Гость может выбрать услугу/дату/время без входа, вход нужен только на шаге подтверждения.
export default function BookingModal({ master, initialService, onClose, onSuccess }) {
  const { user } = useAuth()
  const [step, setStep] = useState(initialService ? 2 : 1)
  const [service, setService] = useState(initialService || null)
  const [date, setDate] = useState(null)
  const [time, setTime] = useState(null)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState('')
  const [bookLoading, setBookLoading] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [monthOffset, setMonthOffset] = useState(0)
  const [done, setDone] = useState(null)

  const today = new Date()
  const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const year = base.getFullYear()
  const month = base.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7

  const isPastMonth = monthOffset < 0
  const isCurrentMonth = monthOffset === 0

  const services = Array.isArray(master.services) ? master.services : []

  function dayEnabled(d) {
    if (isPastMonth) return false
    if (isCurrentMonth) {
      const day = new Date(year, month, d)
      return day >= new Date(today.getFullYear(), today.getMonth(), today.getDate())
    }
    return true
  }

  function pickService(s) {
    setService(s)
    setDate(null)
    setTime(null)
    setSlots([])
    setStep(2)
  }

  async function pickDay(d) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    setDate(ds)
    setTime(null)
    setSlotsLoading(true)
    setSlotsError('')
    try {
      const res = await api.getSlots(master.id, service.id, ds)
      setSlots(Array.isArray(res.slots) ? res.slots : [])
    } catch (e) {
      setSlots([])
      setSlotsError('Не удалось загрузить свободное время. Проверьте, что бэкенд запущен (порт 8000).')
    } finally {
      setSlotsLoading(false)
    }
  }

  async function confirmBooking() {
    setBookLoading(true)
    try {
      await api.createAppointment({ master_id: master.id, service_id: service.id, date, time })
      setDone({ master: master.name, service: service.title, price: service.price, date, time })
    } catch (err) {
      setBookLoading(false)
      alert(err.message || 'Не удалось создать запись')
    }
  }

  function handleConfirmClick() {
    if (!user) {
      setAuthOpen(true)
      return
    }
    confirmBooking()
  }

  function back() {
    if (step === 2) { setStep(1); setService(null); setDate(null); setTime(null); setSlots([]) }
    else if (step === 3) { setStep(2); setTime(null) }
  }

  function formatDate(d) {
    if (!d) return ''
    const [y, m, day] = d.split('-')
    return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  // Экран успеха
  if (done) {
    return (
      <div style={overlay} onClick={onClose}>
        <div style={modal} onClick={(e) => e.stopPropagation()}>
          <div style={doneWrap}>
            <div style={doneIcon}>✓</div>
            <h3 style={doneTitle}>Вы записаны!</h3>
            <p style={doneText}>
              {done.master} · {done.service}<br />
              {formatDate(done.date)} в {done.time}
            </p>
            <p style={donePrice}>{done.price} ₽</p>
            <button onClick={onClose} style={nextBtn}>Готово</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalHead}>
          <div>
            <h3 style={modalTitle}>Запись к мастеру</h3>
            <p style={modalSub}>{master.name} · {master.specialty}</p>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {step === 1 && (
          <div>
            <h4 style={subTitle}>1. Выберите услугу</h4>
            {services.length === 0 && <p style={hint}>У мастера пока нет услуг.</p>}
            {services.map((s) => (
              <div key={s.id} style={serviceRow}>
                <div>
                  <div style={serviceTitle}>{s.title}</div>
                  <div style={serviceMeta}>{s.duration_minutes} мин</div>
                  {s.description && <div style={serviceDesc}>{s.description}</div>}
                </div>
                <div style={serviceRight}>
                  <div style={price}>{s.price} ₽</div>
                  <button onClick={() => pickService(s)} style={chooseBtn}>Выбрать</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && service && (
          <div>
            <h4 style={subTitle}>2. Выберите дату и время — {service.title}</h4>
            <div style={calNav}>
              <button onClick={() => setMonthOffset((o) => o - 1)} disabled={isPastMonth} style={navBtn}>←</button>
              <span style={calTitle}>{MONTHS[month]} {year}</span>
              <button onClick={() => setMonthOffset((o) => o + 1)} style={navBtn}>→</button>
            </div>
            <div className="app-cal-grid" style={calGrid}>
              {DAYS.map((d) => <div key={d} style={calDayHead}>{d}</div>)}
              {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1
                const enabled = dayEnabled(d)
                const selected = date === `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                return (
                  <button
                    key={d}
                    className="app-cal-day"
                    disabled={!enabled}
                    onClick={() => pickDay(d)}
                    style={{ ...day, ...(selected ? daySelected : {}), ...(!enabled ? dayDisabled : {}) }}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
            {date && (
              <div style={slotsBlock}>
                <h4 style={subTitle}>Доступное время на {formatDate(date)}</h4>
                {slotsLoading ? <p style={hint}>Загрузка...</p> : slotsError ? (
                  <p style={hintError}>{slotsError}</p>
                ) : (
                  <div style={slotsWrap}>
                    {slots.length === 0 && <p style={hint}>Свободных слотов нет.</p>}
                    {slots.filter((s) => typeof s === 'string').map((s) => (
                      <button key={s} onClick={() => setTime(s)} style={{ ...slot, ...(time === s ? slotActive : {}) }}>{s}</button>
                    ))}
                  </div>
                )}
                {time && (
                  <button onClick={() => setStep(3)} style={nextBtn}>Далее</button>
                )}
              </div>
            )}
            <button onClick={back} style={backBtn}>← Назад</button>
          </div>
        )}

        {step === 3 && service && date && time && (
          <div>
            <h4 style={subTitle}>3. Подтвердите запись</h4>
            <div style={confirmBox}>
              <div style={confirmLine}><span style={confirmLabel}>Мастер</span><b>{master.name}</b></div>
              <div style={confirmLine}><span style={confirmLabel}>Услуга</span><b>{service.title}</b></div>
              <div style={confirmLine}><span style={confirmLabel}>Цена</span><b style={price}>{service.price} ₽</b></div>
              <div style={confirmLine}><span style={confirmLabel}>Дата</span><b>{formatDate(date)}</b></div>
              <div style={confirmLine}><span style={confirmLabel}>Время</span><b>{time}</b></div>
            </div>
            {!user && <p style={loginHint}>Для подтверждения записи нужно войти или зарегистрироваться. После входа вы вернётесь к этой записи.</p>}
            <div className="app-btn-row" style={btnRow}>
              <button onClick={back} style={backBtn}>Назад</button>
              <button onClick={handleConfirmClick} disabled={bookLoading} style={nextBtn}>
                {bookLoading ? 'Запись...' : user ? 'Подтвердить запись' : 'Войти и записаться'}
              </button>
            </div>
          </div>
        )}

        {authOpen && (
          <AuthModal
            onClose={() => setAuthOpen(false)}
            onSuccess={() => { setAuthOpen(false); confirmBooking() }}
          />
        )}
      </div>
    </div>
  )
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
const modal = { background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }
const modalHead = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }
const modalTitle = { margin: 0, fontSize: 20, color: '#be185d' }
const modalSub = { margin: '2px 0 0', fontSize: 13, color: '#64748b' }
const closeBtn = { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b', lineHeight: 1 }
const subTitle = { margin: '12px 0 10px', fontSize: 16 }
const hint = { color: '#64748b', fontSize: 14 }
const hintError = { color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 10, fontSize: 13 }
const serviceRow = { border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }
const serviceTitle = { fontWeight: 600, fontSize: 15 }
const serviceMeta = { color: '#64748b', fontSize: 13, marginTop: 2 }
const serviceDesc = { color: '#475569', fontSize: 13, marginTop: 4 }
const serviceRight = { textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }
const price = { color: '#be185d', fontWeight: 700, fontSize: 16 }
const chooseBtn = { padding: '8px 16px', borderRadius: 8, background: '#be185d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }
const calNav = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }
const calTitle = { fontWeight: 700, fontSize: 16 }
const navBtn = { padding: '6px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 700 }
const calGrid = { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }
const calDayHead = { textAlign: 'center', fontWeight: 600, fontSize: 12, color: '#64748b', padding: '6px 0' }
const day = { height: 44, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600 }
const daySelected = { borderColor: '#be185d', boxShadow: '0 0 0 2px #fbcfe8' }
const dayDisabled = { color: '#cbd5e1', background: '#f1f5f9', cursor: 'not-allowed' }
const slotsBlock = { marginTop: 18 }
const slotsWrap = { display: 'flex', flexWrap: 'wrap', gap: 8 }
const slot = { padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600 }
const slotActive = { background: '#be185d', color: '#fff', borderColor: '#be185d' }
const nextBtn = { marginTop: 16, padding: '11px 28px', borderRadius: 8, background: '#be185d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15 }
const backBtn = { marginTop: 16, padding: '10px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 600, fontSize: 14 }
const btnRow = { display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }
const confirmBox = { border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, margin: '4px 0 12px' }
const confirmLine = { display: 'flex', justifyContent: 'space-between', margin: '6px 0', fontSize: 15 }
const confirmLabel = { color: '#64748b' }
const loginHint = { color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 10, fontSize: 13, margin: '10px 0' }
const doneWrap = { textAlign: 'center', padding: '20px 10px' }
const doneIcon = { width: 64, height: 64, borderRadius: '50%', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800, margin: '0 auto 16px' }
const doneTitle = { margin: 0, fontSize: 22, color: '#111827' }
const doneText = { margin: '10px 0 4px', color: '#6b7280', fontSize: 15, lineHeight: 1.5 }
const donePrice = { color: '#be185d', fontWeight: 800, fontSize: 17, margin: '4px 0 8px' }