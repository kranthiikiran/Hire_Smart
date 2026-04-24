import { createContext, useContext, useState, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const normalizeRole = (role) => {
    if (!role) return ''
    const normalized = String(role).trim().toLowerCase()
    return normalized === 'employer' ? 'recruiter' : normalized
  }

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('accessToken') || localStorage.getItem('hiresmart_token')
    if (token) {
      try {
        const decoded = jwtDecode(token)
        if (decoded.exp * 1000 > Date.now()) {
          setUser(decoded)
        } else {
          localStorage.removeItem('hiresmart_token')
        }
      } catch (error) {
        localStorage.removeItem('hiresmart_token')
      }
    }
    setLoading(false)
  }, [])

  const login = async (emailOrData, password, role) => {
    // Support both object and individual parameters
    let email, pwd, selectedRole
    if (typeof emailOrData === 'object') {
      email = emailOrData.email
      pwd = emailOrData.password
      selectedRole = emailOrData.role
    } else {
      email = emailOrData
      pwd = password
      selectedRole = role
    }

    const normalizedEmail = String(email || '').trim().toLowerCase()
    const normalizedPassword = String(pwd || '')

    const response = await authAPI.login({ email: normalizedEmail, password: normalizedPassword })
    const { accessToken, refreshToken, user: userData } = response
    const normalizedUserData = {
      ...(userData || {}),
      role: normalizeRole(userData?.role)
    }
    
    localStorage.setItem('accessToken', accessToken)
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    }
    localStorage.setItem('user', JSON.stringify(normalizedUserData))
    // Backward compatibility with existing code paths
    localStorage.setItem('hiresmart_token', accessToken)
    const decoded = jwtDecode(accessToken)
    setUser(decoded)
    
    return normalizedUserData
  }

  const register = async (nameOrData, email, password, role) => {
    // Support both object and individual parameters
    let firstName, lastName, userEmail, pwd, userRole
    if (typeof nameOrData === 'object') {
      firstName = nameOrData.firstName
      lastName = nameOrData.lastName
      userEmail = nameOrData.email
      pwd = nameOrData.password
      userRole = nameOrData.role
    } else {
      // Legacy: split single name parameter
      firstName = nameOrData
      userEmail = email
      pwd = password
      userRole = role
      lastName = ''
    }

    try {
      const normalizedRole = normalizeRole(userRole || 'candidate')

      const response = await authAPI.register({
        email: userEmail,
        password: pwd,
        role: normalizedRole,
        firstName: firstName || '',
        lastName: lastName || ''
      })
      const { user: userData } = response
      
      // Do NOT auto-login after registration
      // User must manually sign in using the /login endpoint
      
      return userData
    } catch (error) {
      console.error('Registration API error:', error.response?.data)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    localStorage.removeItem('hiresmart_token')
    setUser(null)
  }

  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    loading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
