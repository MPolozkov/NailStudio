import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { avatarSrc } from '../components/Header'

export default function Home() {
  const [masters, setMasters] = useState([])
  const [loading, setLoading] = useState(true)
  const [openService, setOpenService] = useState(null)

  useEffect(() => {
    api.listMasters()
      .then(setMasters)
      .catch(() => setMasters([]))
      .finally(() => setLoading(false))
  }, [])

  const allPrices = masters.flatMap((m) => m.services.map((s) => s.price))
  const avg = allPrices.length ? (allPrices.reduce((a, b) => a + b, 0) / allPrices.length).toFixed(0) : 0

  return (
    <div>
      <section className="app-hero" style={styles.hero}>
        <h1 style={styles.h1}>Наши мастера</h1>
        <p style={styles.sub}>Онлайн-запись на маникюр. Выберите мастера и запишитесь на удобное время.</p>
        {allPrices.length > 0 && <p style={styles.avg}>Средняя цена услуг: <b>{avg} ₽</b></p>}
      </section>

      <section style={styles.grid}>
        {loading && <p>Загрузка...</p>}
        {!loading && masters.length === 0 && <p>Мастера пока не зарегистрированы.</p>}
        {masters.map((m) => {
          const mAvg = m.services.length ? (m.services.reduce((a, s) => a + s.price, 0) / m.services.length).toFixed(0) : 0
          return (
            <div key={m.id} style={styles.card}>
              <img src={avatarSrc(m.image)} alt={m.name} style={styles.avatar} />
              <h3 style={styles.name}>{m.name}</h3>
              <p style={styles.specialty}>{m.specialty}</p>
              <p style={styles.exp}>Стаж: {m.experience}</p>
              {m.services.length > 0 && <p style={styles.mAvg}>Средняя цена: <b>{mAvg} ₽</b></p>}
              <div style={styles.services}>
                {m.services.map((s) => (
                  <div key={s.id} style={styles.service}>
                    <div style={styles.serviceRow}>
                      <span style={styles.serviceTitle}>{s.title}</span>
                      <span style={styles.servicePrice}>{s.price} ₽</span>
                    </div>
                    {s.description && (
                      <>
                        <button onClick={() => setOpenService(openService === s.id ? null : s.id)} style={styles.moreBtn}>
                          {openService === s.id ? 'Скрыть' : 'Подробнее'}
                        </button>
                        {openService === s.id && <p style={styles.desc}>{s.description}</p>}
                      </>
                    )}
                  </div>
                ))}
              </div>
              <Link to={`/master/${m.id}`} style={styles.bookBtn}>Записаться к мастеру</Link>
            </div>
          )
        })}
      </section>
    </div>
  )
}

const styles = {
  hero: { textAlign: 'center', padding: '48px 20px', background: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', borderBottom: '1px solid #fbcfe8' },
  h1: { fontSize: 34, color: '#be185d', margin: '0 0 10px' },
  sub: { fontSize: 16, color: '#475569', margin: '0 0 8px' },
  avg: { fontSize: 15, color: '#334155', margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20, padding: 30, maxWidth: 1100, margin: '0 auto' },
  card: { background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' },
  avatar: { width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', alignSelf: 'center', marginBottom: 12, border: '2px solid #fbcfe8' },
  name: { textAlign: 'center', margin: '0 0 4px', fontSize: 19 },
  specialty: { textAlign: 'center', color: '#be185d', fontWeight: 600, margin: '0 0 4px' },
  exp: { textAlign: 'center', color: '#64748b', fontSize: 13, margin: '0 0 10px' },
  mAvg: { textAlign: 'center', fontSize: 14, margin: '0 0 12px' },
  services: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 },
  service: { border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 },
  serviceRow: { display: 'flex', justifyContent: 'space-between', gap: 8 },
  serviceTitle: { fontWeight: 500, fontSize: 14 },
  servicePrice: { color: '#be185d', fontWeight: 700 },
  moreBtn: { background: 'none', border: 'none', color: '#be185d', cursor: 'pointer', fontSize: 13, padding: 0, marginTop: 6 },
  desc: { fontSize: 13, color: '#475569', margin: '6px 0 0' },
  bookBtn: { marginTop: 'auto', textAlign: 'center', padding: '10px 0', borderRadius: 8, background: '#be185d', color: '#fff', fontWeight: 700 },
}