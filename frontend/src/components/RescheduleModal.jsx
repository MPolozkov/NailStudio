import { useState } from 'react'
import { api } from '../api/client'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

export default function RescheduleModal({ appointment, onClose, onSaved }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const [date, setDate] = useState(null)
  const [time, setTime] = useState(null)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const today = new Date()
  const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const year = base.getFullYear()
  const month = base.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const isPastMonth = monthOffset < 0
  const isCurrentMonth = monthOffset === 0

  function dayEnabled(d) {
    if (isPastMonth) return false
    if (isCurrentMonth) {
      return new Date(year, month, d) >= new Date(today.getFullYear(), today.getMonth(), today.getDate())
    }
    return true
  }

  async function pickDay(d) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    setDate(ds)
    setTime(null)
    setSlotsLoading(true)
    setSlotsError('')
    setError('')
    try {
      const res = await api.getSlots(appointment.master_id, appointment.service_id, ds)
      setSlots(Array.isArray(res.slots) ? res.slots : [])
    } catch (e) {
      setSlots([])
      setSlotsError('Не удалось загрузить свободное время. Проверьте, что бэкенд запущен (порт 8000).')
    } finally {
      setSlotsLoading(false)
    }
  }

  async function save() {
    if (!date || !time) {
      setError('Выберите новую дату и время')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.updateAppointment(appointment.id, { date, time })
      onSaved && onSaved(date, time)
    } catch (err) {
      setError(err.message || 'Не удалось перенести запись')
      setSaving(false)
    }
  }

  function formatDate(d) {
    if (!d) return ''
    const [y, m, day] = d.split('-')
    return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalHead}>
          <div>
            <h3 style={modalTitle}>Перенос записи</h3>
            <p style={modalSub}>{appointment.service_title} · {appointment.master?.name}</p>
            <p style={modalSub}>Текущее время: {formatDate(appointment.date)} в {appointment.time}</p>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

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
          </div>
        )}

        {error && <p style={errorText}>{error}</p>}

        <div className="app-btn-row" style={btnRow}>
          <button onClick={onClose} style={backBtn}>Отмена</button>
          <button onClick={save} disabled={saving} style={nextBtn}>
            {saving ? 'Сохранение...' : 'Сохранить новое время'}
          </button>
        </div>
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
const errorText = { color: '#dc2626', fontSize: 14, marginTop: 12 }
const calNav = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 12 }
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
const nextBtn = { flex: 1, padding: '11px 0', borderRadius: 8, background: '#be185d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15 }
const backBtn = { padding: '11px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 600, fontSize: 14 }
const btnRow = { display: 'flex', gap: 10, alignItems: 'center', marginTop: 16 }