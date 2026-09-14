import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthModal from './AuthModal'

const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#e2e8f0"/><text x="60" y="66" font-size="12" text-anchor="middle" fill="#64748b" font-family="Arial">Фото будет<br/>добавлено позже</text></svg>`
)

export function avatarSrc(img) {
  return img && img.length > 0 ? img : PLACEHOLDER
}

export default function Header() {
  const { user, logout } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const nav = useNavigate()

  return (
    <header className="app-header" style={styles.header}>
      <Link to="/" style={styles.logo}>💅 NailStudio</Link>
      <nav className="app-nav" style={styles.nav}>
        {user && user.role === 'Admin' && (
          <Link to="/admin" style={styles.link}>Кабинет администратора</Link>
        )}
        {user ? (
          <div className="app-userbox" style={styles.userBox}>
            <Link to="/profile" style={styles.userLink}>
              <img src={avatarSrc(user.image)} alt="avatar" style={styles.avatar} />
              <span>{user.first_name} {user.last_name}</span>
            </Link>
            <button onClick={() => { logout(); nav('/') }} style={styles.logoutBtn}>Выйти</button>
          </div>
        ) : (
          <button onClick={() => setAuthOpen(true)} style={styles.loginBtn}>Вход</button>
        )}
      </nav>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </header>
  )
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 },
  logo: { fontWeight: 700, fontSize: 20, color: '#be185d', textDecoration: 'none' },
  nav: { display: 'flex', alignItems: 'center', gap: 16 },
  link: { color: '#334155', textDecoration: 'none', fontWeight: 500 },
  userBox: { display: 'flex', alignItems: 'center', gap: 12 },
  userLink: { display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', textDecoration: 'none', fontWeight: 500 },
  avatar: { width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' },
  loginBtn: { padding: '8px 18px', borderRadius: 8, background: '#be185d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 },
  logoutBtn: { padding: '6px 12px', borderRadius: 8, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', cursor: 'pointer' },
}