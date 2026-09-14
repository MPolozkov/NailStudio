import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { avatarSrc } from '../components/Header'
import BookingModal from '../components/BookingModal'
import AuthModal from '../components/AuthModal'
import Toast from '../components/Toast'

export default function MasterPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [master, setMaster] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingService, setBookingService] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [pendingBooking, setPendingBooking] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    api.getMaster(id).then(setMaster).catch(() => setMaster(null)).finally(() => setLoading(false))
  }, [id])

  // Кнопка «Выбрать время и дату» — открывает попап с полным списком услуг (шаг 1).
  function openBooking() {
    if (!user) {
      setPendingBooking(true)
      setAuthOpen(true)
      return
    }
    setBookingService(null)
    setBookingOpen(true)
  }

  function onAuthSuccess() {
    setAuthOpen(false)
    if (pendingBooking) {
      setPendingBooking(false)
      setBookingOpen(true)
    }
  }

  if (loading) return <p style={styles.center}>Загрузка...</p>
  if (!master) return <p style={styles.center}>Мастер не найден.</p>

  return (
    <div style={styles.wrap}>
      <div className="app-master-head" style={styles.head}>
        <img src={avatarSrc(master.image)} alt={master.name} style={styles.avatar} />
        <div>
          <h1 style={styles.name}>{master.name}</h1>
          <p style={styles.specialty}>{master.specialty} · Стаж: {master.experience}</p>
          <p style={styles.about}>{master.about}</p>
          <button onClick={openBooking} style={styles.ctaBtn}>Выбрать время и дату</button>
        </div>
      </div>
      {bookingOpen && (
        <BookingModal
          master={master}
          initialService={bookingService}
          onClose={() => setBookingOpen(false)}
          onSuccess={({ master: mName, service: sTitle, date, time }) => {
            setToast(`Новая запись создана\nМастер: ${mName}\nУслуга: ${sTitle}\nДата: ${date}\nВремя: ${time}`)
          }}
        />
      )}
      {authOpen && (
        <AuthModal
          message="Войдите, пожалуйста, в систему"
          onClose={() => setAuthOpen(false)}
          onSuccess={onAuthSuccess}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}

const styles = {
  wrap: { maxWidth: 820, margin: '0 auto', padding: 30 },
  center: { textAlign: 'center', padding: 40 },
  head: { display: 'flex', gap: 20, alignItems: 'center', background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 24 },
  avatar: { width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fbcfe8' },
  name: { margin: 0, fontSize: 24 },
  specialty: { color: '#be185d', fontWeight: 600, margin: '4px 0' },
  about: { color: '#475569', margin: 0 },
  ctaBtn: { marginTop: 12, padding: '10px 20px', borderRadius: 8, background: '#be185d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15 },
}