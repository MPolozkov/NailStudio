export default function Toast({ message, onClose }) {
  if (!message) return null
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.box} onClick={(e) => e.stopPropagation()}>
        <div style={styles.icon}>✅</div>
        <div style={styles.text}>{message}</div>
        <button onClick={onClose} style={styles.btn}>ОК</button>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  box: { background: '#fff', borderRadius: 12, padding: 24, maxWidth: 380, width: '90%', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' },
  icon: { fontSize: 40, marginBottom: 8 },
  text: { fontSize: 15, color: '#0f172a', marginBottom: 16, whiteSpace: 'pre-line' },
  btn: { padding: '8px 24px', borderRadius: 8, background: '#be185d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 },
}