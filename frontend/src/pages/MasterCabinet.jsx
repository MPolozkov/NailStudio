import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { avatarSrc } from '../components/Header'
import { readImageAsWebP } from '../utils/image'
import Toast from '../components/Toast'

const DURATIONS = [30, 45, 60, 75, 90, 120, 150, 180]

export default function MasterCabinet() {
  const { user } = useAuth()
  const [master, setMaster] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [appl, setAppl] = useState({ name: '', specialty: '', experience: '', about: '', phone: '', image: '' })
  const [applServices, setApplServices] = useState([])
  const [applSvc, setApplSvc] = useState({ title: '', price: '', duration_minutes: 60, customDuration: '' })
  const [servicesError, setServicesError] = useState(false)
  const [prof, setProf] = useState({ name: '', specialty: '', experience: '', about: '', phone: '', telegram_chat_id: '', image: '' })
  const [clients, setClients] = useState([])
  const [services, setServices] = useState([])
  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(false)
  const [applSaving, setApplSaving] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [svc, setSvc] = useState({ title: '', price: '', duration_minutes: 60, customDuration: '', description: '', image: '' })
  const [selectedClient, setSelectedClient] = useState(null)
  const [applError, setApplError] = useState('')
  const applServicesRef = useRef(null)

  useEffect(() => {
    if (!user) return
    api.getMyMaster()
      .then((m) => {
        setMaster(m)
        setProf({
          name: m.name, specialty: m.specialty, experience: m.experience,
          about: m.about, phone: m.phone, telegram_chat_id: m.telegram_chat_id || '',
          image: m.image,
        })
        setServices(m.services || [])
        api.masterClients(m.id).then(setClients).catch(() => setClients([]))
      })
      .catch(() => setMaster(null))
      .finally(() => setLoaded(true))
  }, [user])

  const setApplField = (k) => (e) => setAppl({ ...appl, [k]: e.target.value })
  const setProfField = (k) => (e) => setProf({ ...prof, [k]: e.target.value })

  function onApplImage(e) {
    const file = e.target.files[0]
    if (!file) return
    readImageAsWebP(file)
      .then((webp) => setAppl({ ...appl, image: webp }))
      .catch((err) => {
        setToast(err.message)
        e.target.value = ''
      })
  }

  function onProfImage(e) {
    const file = e.target.files[0]
    if (!file) return
    readImageAsWebP(file)
      .then((webp) => setProf({ ...prof, image: webp }))
      .catch((err) => {
        setToast(err.message)
        e.target.value = ''
      })
  }

  function addApplService() {
    if (!applSvc.title.trim()) {
      setToast('Введите название услуги')
      return
    }
    const duration = applSvc.duration_minutes === 'custom'
      ? Math.max(1, parseInt(applSvc.customDuration, 10) || 30)
      : applSvc.duration_minutes
    setApplServices((s) => [...s, {
      title: applSvc.title,
      price: parseFloat(applSvc.price) || 0,
      duration_minutes: Number(duration),
      description: '',
      image: '',
    }])
    setApplSvc({ title: '', price: '', duration_minutes: 60, customDuration: '' })
    setServicesError(false)
  }

  function removeApplService(i) {
    setApplServices((s) => s.filter((_, idx) => idx !== i))
  }

  async function submitApplication() {
    setApplError('')
    if (!appl.name.trim() || !appl.specialty.trim() || !appl.phone.trim()) {
      setApplError('Заполните имя, специализацию и телефон')
      return
    }
    if (applServices.length === 0) {
      setServicesError(true)
      setToast('Добавьте хотя бы одну услугу в блоке «Мои услуги» перед отправкой заявки')
      if (applServicesRef.current) applServicesRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setApplSaving(true)
    try {
      const m = await api.registerMaster({ ...appl, services: applServices })
      setMaster(m)
      setProf({
        name: m.name, specialty: m.specialty, experience: m.experience,
        about: m.about, phone: m.phone, telegram_chat_id: m.telegram_chat_id || '',
        image: m.image,
      })
      setServices(m.services || [])
      setToast('Заявка отправлена. Ожидайте одобрения администратора.')
    } catch (err) {
      setToast(err.message || 'Не удалось отправить заявку')
    } finally {
      setApplSaving(false)
    }
  }

  async function saveProfile() {
    if (!prof.name.trim() || !prof.phone.trim()) {
      setToast('Имя и телефон — обязательные поля')
      return
    }
    setSaving(true)
    try {
      const m = await api.updateMyMaster(prof)
      setMaster(m)
      setServices(m.services || [])
      const img = m.image ? 'фото' : 'пусто'
      setToast(`Профиль успешно изменён\nИмя: ${m.name || 'пусто'}\nТелефон: ${m.phone || 'пусто'}\nФото: ${img}`)
    } catch (err) {
      setToast(`Не удалось изменить профиль: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  function onSvcImage(e) {
    const file = e.target.files[0]
    if (!file) return
    readImageAsWebP(file)
      .then((webp) => setSvc({ ...svc, image: webp }))
      .catch((err) => {
        setToast(err.message)
        e.target.value = ''
      })
  }

  async function addService() {
    if (!svc.title.trim()) {
      setToast('Название услуги обязательно')
      return
    }
    setSaving(true)
    try {
      const duration = svc.duration_minutes === 'custom'
        ? Math.max(1, parseInt(svc.customDuration, 10) || 30)
        : svc.duration_minutes
      const created = await api.createService({
        title: svc.title,
        price: parseFloat(svc.price) || 0,
        duration_minutes: duration,
        description: svc.description,
        image: svc.image,
      })
      setServices((s) => [...s, created])
      setAddOpen(false)
      setSvc({ title: '', price: '', duration_minutes: 60, customDuration: '', description: '', image: '' })
      setToast(`Услуга добавлена\nНазвание: ${created.title}\nДлительность: ${created.duration_minutes} мин\nЦена: ${created.price} ₽`)
    } catch (err) {
      setToast(`Не удалось добавить услугу: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function removeService(id) {
    const target = services.find((s) => s.id === id)
    try {
      await api.deleteService(id)
      setServices((s) => s.filter((x) => x.id !== id))
      setToast(`Услуга удалена\n${target ? target.title : ''}`)
    } catch (err) {
      setToast(err.message || 'Не удалось удалить услугу')
    }
  }

  function fmtDate(d) {
    if (!d) return ''
    const [y, m, day] = String(d).split('-')
    return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  if (!user) {
    return <div style={styles.placeholder}>Войдите, чтобы открыть кабинет мастера.</div>
  }

  if (!loaded) {
    return <div style={styles.placeholder}>Загрузка...</div>
  }

  // Нет профиля мастера — показываем анкету (заявку) с обязательными услугами
  if (!master) {
    return (
      <div style={styles.wrap}>
        <h1 style={styles.pageTitle}>Кабинет мастера</h1>
        <div style={styles.card}>
          <h2>Регистрация мастера</h2>
          <img src={avatarSrc(appl.image)} alt="avatar" style={styles.avatar} />
          <div style={styles.field}>
            <span style={styles.label}>Фото</span>
            <input type="file" accept="image/*" onChange={onApplImage} />
          </div>
          <div style={styles.field}>
            <span style={styles.label}>Имя и фамилия *</span>
            <input value={appl.name} onChange={setApplField('name')} style={styles.input} />
          </div>
          <div style={styles.field}>
            <span style={styles.label}>Специализация *</span>
            <input value={appl.specialty} onChange={setApplField('specialty')} style={styles.input} />
          </div>
          <div style={styles.field}>
            <span style={styles.label}>Опыт</span>
            <input value={appl.experience} onChange={setApplField('experience')} style={styles.input} />
          </div>
          <div style={styles.field}>
            <span style={styles.label}>О себе</span>
            <textarea value={appl.about} onChange={setApplField('about')} style={styles.textarea} />
          </div>
          <div style={styles.field}>
            <span style={styles.label}>Телефон *</span>
            <input value={appl.phone} onChange={setApplField('phone')} style={styles.input} />
          </div>

          {/* Мои услуги — обязательный блок */}
          <div ref={applServicesRef} style={{ ...styles.servicesBlock, ...(servicesError ? styles.servicesError : {}) }}>
            <h3 style={styles.h3}>Мои услуги *</h3>
            <p style={styles.hint}>Добавьте хотя бы одну услугу, которую вы предоставляете. Без неё заявка не будет отправлена.</p>
            {applServices.length === 0 && <p style={styles.meta}>Услуг пока не добавлено.</p>}
            {applServices.map((s, i) => (
              <div key={i} style={styles.serviceRow}>
                <div style={styles.svcInfo}>
                  <b>{s.title}</b>
                  <div style={styles.meta}>{s.price} ₽ · {s.duration_minutes} мин</div>
                </div>
                <button onClick={() => removeApplService(i)} style={styles.delBtn}>Удалить</button>
              </div>
            ))}
            <div className="app-svc-add-row" style={styles.svcAddRow}>
              <input value={applSvc.title} onChange={(e) => setApplSvc({ ...applSvc, title: e.target.value })} placeholder="Название услуги" style={styles.input} />
              <input type="number" value={applSvc.price} onChange={(e) => setApplSvc({ ...applSvc, price: e.target.value })} placeholder="Цена (₽)" style={{ ...styles.input, width: 110 }} />
              <select value={applSvc.duration_minutes} onChange={(e) => setApplSvc({ ...applSvc, duration_minutes: e.target.value })} style={{ ...styles.input, width: 120 }}>
                {DURATIONS.map((d) => <option key={d} value={d}>{d} мин</option>)}
                <option value="custom">Своё</option>
              </select>
              <button onClick={addApplService} style={styles.addBtn}>Добавить</button>
            </div>
            {applSvc.duration_minutes === 'custom' && (
              <input type="number" value={applSvc.customDuration} onChange={(e) => setApplSvc({ ...applSvc, customDuration: e.target.value })} placeholder="Минуты" style={{ ...styles.input, marginTop: 6 }} />
            )}
          </div>

          {applError && <div style={styles.error}>{applError}</div>}
          <button onClick={submitApplication} disabled={applSaving} style={styles.btn}>
            {applSaving ? 'Отправка...' : 'Отправить заявку'}
          </button>
        </div>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <h1 style={styles.pageTitle}>Кабинет мастера</h1>
      <div className="app-two-col" style={styles.grid}>
        <div style={styles.card}>
          <h2>Профиль мастера</h2>
          {master.status === 'pending' && (
            <div style={styles.pending}>Заявка ожидает одобрения администратора</div>
          )}
          <img src={avatarSrc(prof.image)} alt="avatar" style={styles.avatar} />
          <div style={styles.field}>
            <span style={styles.label}>Фото</span>
            <input type="file" accept="image/*" onChange={onProfImage} />
          </div>
          <div style={styles.field}>
            <span style={styles.label}>Имя и фамилия *</span>
            <input value={prof.name} onChange={setProfField('name')} style={styles.input} />
          </div>
          <div style={styles.field}>
            <span style={styles.label}>Специализация</span>
            <input value={prof.specialty} onChange={setProfField('specialty')} style={styles.input} />
          </div>
          <div style={styles.field}>
            <span style={styles.label}>Опыт</span>
            <input value={prof.experience} onChange={setProfField('experience')} style={styles.input} />
          </div>
          <div style={styles.field}>
            <span style={styles.label}>О себе</span>
            <textarea value={prof.about} onChange={setProfField('about')} style={styles.textarea} />
          </div>
          <div style={styles.field}>
            <span style={styles.label}>Телефон *</span>
            <input value={prof.phone} onChange={setProfField('phone')} style={styles.input} />
          </div>
          <div style={styles.field}>
            <span style={styles.label}>Telegram chat_id (для уведомлений)</span>
            <input value={prof.telegram_chat_id} onChange={setProfField('telegram_chat_id')} placeholder="Например: 123456789" style={styles.input} />
            <span style={styles.hint}>Укажите ваш chat_id с ботом, чтобы получать уведомления о новых записях в Telegram.</span>
          </div>
          <button onClick={saveProfile} disabled={saving} style={styles.btn}>{saving ? 'Сохранение...' : 'Сохранить профиль'}</button>
        </div>

        <div style={styles.right}>
          <div style={styles.card}>
            <h2>Мои клиенты</h2>
            {clients.length === 0 && <p>Клиентов пока нет.</p>}
            {clients.map((c) => (
              <button key={c.id} onClick={() => setSelectedClient(c)} style={styles.clientRow}>
                <img src={avatarSrc(c.image)} alt="client" style={styles.miniAvatar} />
                <span>{c.first_name} {c.last_name}</span>
                <span style={styles.clientArrow}>›</span>
              </button>
            ))}
          </div>

          <div style={styles.card}>
            <div className="app-services-head" style={styles.servicesHead}>
              <h2>Мои услуги</h2>
              <button onClick={() => setAddOpen(true)} style={styles.addBtn}>Добавить услугу</button>
            </div>
            {services.length === 0 && <p>Услуг пока нет.</p>}
            {services.map((s) => (
              <div key={s.id} style={styles.serviceRow}>
                <img src={avatarSrc(s.image)} alt={s.title} style={styles.svcImg} />
                <div style={styles.svcInfo}>
                  <b>{s.title}</b>
                  <div style={styles.meta}>{s.price} ₽ · {s.duration_minutes} мин</div>
                  {s.description && <div style={styles.desc}>{s.description}</div>}
                </div>
                <button onClick={() => removeService(s.id)} style={styles.delBtn}>Удалить</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {addOpen && (
        <div style={styles.overlay} onClick={() => setAddOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Новая услуга</h2>
            <img src={avatarSrc(svc.image)} alt="service" style={styles.svcImg} />
            <div style={styles.field}>
              <span style={styles.label}>Изображение</span>
              <input type="file" accept="image/*" onChange={onSvcImage} />
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Название *</span>
              <input value={svc.title} onChange={(e) => setSvc({ ...svc, title: e.target.value })} style={styles.input} />
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Цена (₽)</span>
              <input type="number" value={svc.price} onChange={(e) => setSvc({ ...svc, price: e.target.value })} style={styles.input} />
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Длительность (мин)</span>
              <select value={svc.duration_minutes} onChange={(e) => setSvc({ ...svc, duration_minutes: e.target.value })} style={styles.input}>
                {DURATIONS.map((d) => <option key={d} value={d}>{d} мин</option>)}
                <option value="custom">Своё значение</option>
              </select>
              {svc.duration_minutes === 'custom' && (
                <input type="number" value={svc.customDuration} onChange={(e) => setSvc({ ...svc, customDuration: e.target.value })} placeholder="Минуты" style={{ ...styles.input, marginTop: 6 }} />
              )}
            </div>
            <div style={styles.field}>
              <span style={styles.label}>Описание</span>
              <textarea value={svc.description} onChange={(e) => setSvc({ ...svc, description: e.target.value })} style={styles.textarea} />
            </div>
            <button onClick={addService} disabled={saving} style={styles.btn}>{saving ? 'Сохранение...' : 'Добавить услугу'}</button>
          </div>
        </div>
      )}

      {selectedClient && (
        <div style={styles.overlay} onClick={() => setSelectedClient(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.clientModalHead}>
              <h2>Информация о клиенте</h2>
              <button onClick={() => setSelectedClient(null)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.clientInfo}>
              <img src={avatarSrc(selectedClient.image)} alt="client" style={styles.clientAvatar} />
              <div>
                <div style={styles.clientName}>{selectedClient.first_name} {selectedClient.last_name}</div>
                <div style={styles.meta}>Email: {selectedClient.email || '—'}</div>
                <div style={styles.meta}>Телефон: {selectedClient.phone || '—'}</div>
              </div>
            </div>
            <h3 style={styles.h3}>Записи клиента</h3>
            {selectedClient.appointments.length === 0 && <p style={styles.meta}>Записей нет.</p>}
            {selectedClient.appointments.map((a, i) => (
              <div key={i} style={styles.clientAppt}>
                <b>{a.service}</b>
                <div style={styles.meta}>{fmtDate(a.date)} в {String(a.time).slice(0, 5)} · {a.amount} ₽</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
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
  pending: { background: '#fef3c7', color: '#92400e', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13 },
  avatar: { width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', marginBottom: 12, border: '2px solid #fbcfe8' },
  field: { marginBottom: 12 },
  label: { display: 'block', fontSize: 13, color: '#475569', marginBottom: 4 },
  input: { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, minHeight: 60 },
  hint: { display: 'block', fontSize: 12, color: '#64748b', marginTop: 4 },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 10 },
  btn: { width: '100%', padding: '10px 0', borderRadius: 8, background: '#be185d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, marginBottom: 8 },
  h3: { marginTop: 16, marginBottom: 8 },
  servicesBlock: { border: '2px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 12 },
  servicesError: { borderColor: '#dc2626', background: '#fef2f2' },
  servicesHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addBtn: { padding: '8px 14px', borderRadius: 8, background: '#be185d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 },
  svcAddRow: { display: 'flex', gap: 8, marginTop: 8 },
  clientRow: { display: 'flex', alignItems: 'center', gap: 10, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 8, width: '100%', background: '#fff', cursor: 'pointer', color: '#0f172a', fontWeight: 500, textAlign: 'left' },
  clientArrow: { marginLeft: 'auto', color: '#be185d', fontSize: 20 },
  miniAvatar: { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' },
  serviceRow: { display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginBottom: 8 },
  svcImg: { width: 56, height: 56, borderRadius: 8, objectFit: 'cover' },
  svcInfo: { flex: 1 },
  meta: { color: '#64748b', fontSize: 13, marginTop: 2 },
  desc: { color: '#475569', fontSize: 13, marginTop: 4 },
  delBtn: { padding: '6px 12px', borderRadius: 8, background: '#fee2e2', color: '#b91c1c', border: 'none', cursor: 'pointer', fontWeight: 600 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: 14, padding: 24, maxWidth: 460, width: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' },
  closeBtn: { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b', lineHeight: 1 },
  clientModalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  clientInfo: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 },
  clientAvatar: { width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' },
  clientName: { fontSize: 18, fontWeight: 700 },
  clientAppt: { border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginBottom: 8 },
}