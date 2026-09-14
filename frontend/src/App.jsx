import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import MasterPage from './pages/MasterPage'
import Profile from './pages/Profile'
import MasterCabinet from './pages/MasterCabinet'
import AdminCabinet from './pages/AdminCabinet'

export default function App() {
  return (
    <div>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/master/:id" element={<MasterPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/master" element={<MasterCabinet />} />
        <Route path="/admin" element={<AdminCabinet />} />
      </Routes>
    </div>
  )
}