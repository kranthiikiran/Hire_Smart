import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

function Auth() {
  const location = useLocation()
  const navigate = useNavigate()
  const { login, register } = useAuth()
  
  // Determine initial view based on URL
  const isRegisterMode = location.pathname === '/register'
  const [showRegister, setShowRegister] = useState(isRegisterMode)
  const [selectedRole, setSelectedRole] = useState(null) // null, 'candidate', or 'employer'
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  })
  
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'candidate'
  })
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleRegisterChange = (e) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleRoleSelect = (role) => {
    setSelectedRole(role)
    setError('')
    setLoginData({ email: '', password: '' })
  }

  const handleBackToRoles = () => {
    setSelectedRole(null)
    setError('')
    setLoginData({ email: '', password: '' })
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const normalizedEmail = String(loginData.email || '').trim().toLowerCase()
    const normalizedPassword = String(loginData.password || '')

    if (!normalizedEmail || !normalizedPassword) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      await login({ email: normalizedEmail, password: normalizedPassword, role: selectedRole })
      navigate('/dashboard')
    } catch (err) {
      const status = err?.response?.status
      const apiData = err?.response?.data
      const apiMessage =
        (typeof apiData === 'string' ? apiData : null) ||
        apiData?.message ||
        apiData?.error

      if (status === 429) {
        setError('Too many login attempts. Please wait a few minutes and try again.')
      } else if (status === 401) {
        setError(apiMessage || 'Invalid email or password. Please try again.')
      } else if (status === 403) {
        setError(apiMessage || 'Your account is not allowed to login right now. Please contact support.')
      } else if (status === 404 || status === 405) {
        setError('Login service is not reachable on this endpoint. Please restart backend and try again.')
      } else if (!err?.response) {
        setError('Unable to reach server. Please check backend is running and try again.')
      } else {
        setError(apiMessage || 'Login failed due to server response. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!registerData.name.trim()) {
      setError('Please enter your full name')
      return
    }

    if (!registerData.email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    try {
      setLoading(true)
      await register(registerData)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const switchToRegister = () => {
    setShowRegister(true)
    setSelectedRole(null)
    setError('')
    navigate('/register', { replace: true })
  }

  const switchToLogin = () => {
    setShowRegister(false)
    setSelectedRole(null)
    setError('')
    navigate('/login', { replace: true })
  }

  return (
    <div className="auth-page">
      {/* Animated Background Elements */}
      <div className="animated-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
      
      {/* Floating Particles */}
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 10}s`
          }}></div>
        ))}
      </div>

      <div className={`auth-wrapper ${showRegister ? 'panel-active' : ''} ${selectedRole ? 'role-selected' : ''}`}>
        
        {!showRegister && (
          <>
            {/* Role Selection (Initial View) */}
            <div className="auth-form-box role-selection-box">
              <div className="role-selection-content">
                <h1 className="gradient-text">Welcome to HireSmart</h1>
                <p className="subtitle-glow">Select your account type to continue</p>
                
                <div className="role-buttons">
                  <button 
                    type="button"
                    className="role-button candidate-button"
                    onClick={() => handleRoleSelect('candidate')}
                  >
                    <div className="card-glow"></div>
                    <div className="card-shine"></div>
                    <div className="role-icon">
                      <i className="fas fa-user"></i>
                      <div className="icon-pulse"></div>
                    </div>
                    <h3>Candidate</h3>
                    <span>Find your dream job</span>
                    <div className="hover-arrow">
                      <i className="fas fa-arrow-right"></i>
                    </div>
                  </button>

                  <button 
                    type="button"
                    className="role-button recruiter-button"
                    onClick={() => handleRoleSelect('employer')}
                  >
                    <div className="card-glow"></div>
                    <div className="card-shine"></div>
                    <div className="role-icon">
                      <i className="fas fa-briefcase"></i>
                      <div className="icon-pulse"></div>
                    </div>
                    <h3>Recruiter</h3>
                    <span>Discover top talent</span>
                    <div className="hover-arrow">
                      <i className="fas fa-arrow-right"></i>
                    </div>
                  </button>
                </div>

                <div className="mobile-switch">
                  <p>Don&apos;t have an account?</p>
                  <button type="button" onClick={switchToRegister}>Sign Up</button>
                </div>
              </div>
            </div>

            {/* Login Form (Slides in after role selection) */}
            <div className={`auth-form-box login-form-box ${selectedRole ? 'active' : ''}`}>
              <form onSubmit={handleLoginSubmit}>
                <div className="form-glow"></div>
                <button type="button" className="back-button" onClick={handleBackToRoles}>
                  <i className="fas fa-arrow-left"></i> Back
                </button>
                
                <h1 className="gradient-text">
                  {selectedRole === 'candidate' ? 'Candidate Login' : 'Recruiter Login'}
                </h1>
                
                <div className={`role-badge ${selectedRole === 'candidate' ? 'candidate-badge' : 'recruiter-badge'}`}>
                  <i className={`fas fa-${selectedRole === 'candidate' ? 'user' : 'briefcase'}`}></i>
                  <span>{selectedRole === 'candidate' ? 'Job Seeker' : 'Employer'}</span>
                  <div className="badge-shine"></div>
                </div>

                <span>Enter your credentials to continue</span>
                
                {error && (
                  <div className="error-message">
                    <i className="fas fa-exclamation-triangle"></i>
                    {error}
                  </div>
                )}
                
                <div className="input-group">
                  <i className="fas fa-envelope input-icon"></i>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={loginData.email}
                    onChange={handleLoginChange}
                    required
                    disabled={loading}
                  />
                  <div className="input-border"></div>
                </div>

                <div className="input-group">
                  <i className="fas fa-lock input-icon"></i>
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    required
                    disabled={loading}
                  />
                  <div className="input-border"></div>
                </div>
                
                <button type="submit" className="submit-button" disabled={loading}>
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Signing In...
                    </>
                  ) : (
                    <>
                      Sign In <i className="fas fa-sign-in-alt"></i>
                    </>
                  )}
                  <div className="button-shine"></div>
                </button>
                
                <div className="mobile-switch">
                  <p>Don&apos;t have an account?</p>
                  <button type="button" onClick={switchToRegister}>Sign Up</button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* Register Form */}
        {showRegister && (
          <div className="auth-form-box register-form-box">
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-glow"></div>
              <h1 className="gradient-text">Create Account</h1>
              <div className="social-links">
                <a href="#" aria-label="Facebook">
                  <i className="fab fa-facebook-f"></i>
                  <div className="social-ripple"></div>
                </a>
                <a href="#" aria-label="Google">
                  <i className="fab fa-google"></i>
                  <div className="social-ripple"></div>
                </a>
                <a href="#" aria-label="LinkedIn">
                  <i className="fab fa-linkedin-in"></i>
                  <div className="social-ripple"></div>
                </a>
              </div>
              <span>or use your email for registration</span>
              
              {error && (
                <div className="error-message">
                  <i className="fas fa-exclamation-triangle"></i>
                  {error}
                </div>
              )}
              
              {/* Role Selector */}
              <div className="role-selector-inline">
                <label>I am a:</label>
                <div className="role-toggle">
                  <button
                    type="button"
                    className={registerData.role === 'candidate' ? 'active' : ''}
                    onClick={() => setRegisterData({ ...registerData, role: 'candidate' })}
                  >
                    <i className="fas fa-user"></i> Candidate
                    <div className="toggle-shine"></div>
                  </button>
                  <button
                    type="button"
                    className={registerData.role === 'employer' ? 'active' : ''}
                    onClick={() => setRegisterData({ ...registerData, role: 'employer' })}
                  >
                    <i className="fas fa-briefcase"></i> Recruiter
                    <div className="toggle-shine"></div>
                  </button>
                </div>
              </div>
              
              <div className="input-group">
                <i className="fas fa-user input-icon"></i>
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={registerData.name}
                  onChange={handleRegisterChange}
                  required
                  disabled={loading}
                />
                <div className="input-border"></div>
              </div>

              <div className="input-group">
                <i className="fas fa-envelope input-icon"></i>
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  required
                  disabled={loading}
                />
                <div className="input-border"></div>
              </div>

              <div className="input-group">
                <i className="fas fa-lock input-icon"></i>
                <input
                  type="password"
                  name="password"
                  placeholder="Password (min. 6 characters)"
                  value={registerData.password}
                  onChange={handleRegisterChange}
                  required
                  minLength={6}
                  disabled={loading}
                />
                <div className="input-border"></div>
              </div>
              
              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Creating Account...
                  </>
                ) : (
                  <>
                    Sign Up <i className="fas fa-user-plus"></i>
                  </>
                )}
                <div className="button-shine"></div>
              </button>
              
              <div className="mobile-switch">
                <p>Already have an account?</p>
                <button type="button" onClick={switchToLogin}>Sign In</button>
              </div>
            </form>
          </div>
        )}

        {/* Sliding Panel */}
        <div className="slide-panel-wrapper">
          <div className="slide-panel">
            <div className="panel-content panel-content-left">
              <h1>Welcome Back!</h1>
              <p>Stay connected by logging in with your credentials and continue your experience</p>
              <button className="transparent-btn" type="button" onClick={switchToLogin}>
                Sign In
              </button>
            </div>
            <div className="panel-content panel-content-right">
              <h1>Hey There!</h1>
              <p>Begin your amazing journey by creating an account with us today</p>
              <button className="transparent-btn" type="button" onClick={switchToRegister}>
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Auth
