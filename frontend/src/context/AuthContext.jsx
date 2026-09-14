import { createContext, useContext, useState, useCallback } from 'react'
import { api, setToken, getToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      return null
    }
    try {
      const me = await api.getMe()
      setUser(me)
      return me
    } catch (e) {
      setToken(null)
      setUser(null)
      return null
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.login({ email, password })
    setToken(res.access_token)
    await loadMe()
    return res
  }, [loadMe])

  const register = useCallback(async (body) => {
    const res = await api.register(body)
    setToken(res.access_token)
    await loadMe()
    return res
  }, [loadMe])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, loading, setLoading, loadMe, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}