import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, User as UserIcon, Briefcase, AlertCircle, CheckCircle, Lightbulb, Eye, EyeOff } from 'lucide-react'

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'candidate'
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const containerRef = useRef(null)

  const { register } = useAuth()
  const navigate = useNavigate()

  // Track mouse position for spotlight effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        setMousePosition({ x, y })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
    setSuccess('')
  }

  const handleRoleChange = (role) => {
    setError('')
    setSuccess('')
    setFormData({ ...formData, role })
  }

  const handleSubmit = async (e) => {
    setSuccess('')
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.firstName.trim()) {
      setError('Please enter your first name')
      return
    }

    if (!formData.lastName.trim()) {
      setError('Please enter your last name')
      return
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      console.log('Submitting registration with data:', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role
      })
      
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role
      })
      console.log('Registration successful!')
      setFormData({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', role: 'candidate' })
      setSuccess('Account created successfully! Redirecting to login...')
      setLoading(false)
      // Redirect to login page - user must sign in manually
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      console.error('Registration error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      })
      
      // Provide specific error messages
      if (err.response?.status === 409) {
        setError('This email is already registered. Please login or use a different email.')
      } else if (err.response?.status === 400) {
        // Show the actual backend error message
        const backendError = err.response?.data?.message || err.response?.data?.error
        setError(backendError || 'Please check your information and try again.')
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.')
      } else {
        const backendError = err.response?.data?.message || err.response?.data?.error
        setError(backendError || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lamp-auth-container" ref={containerRef}>
      {/* Spotlight Effect */}
      <div 
        className="spotlight-effect"
        style={{
          background: `radial-gradient(circle 600px at ${mousePosition.x}% ${mousePosition.y}%, rgba(255, 220, 150, 0.15), rgba(255, 200, 100, 0.08) 50%, transparent 75%)`
        }}
      />

      {/* Ambient Lighting */}
      <div className="ambient-light ambient-light-1" />
      <div className="ambient-light ambient-light-2" />
      <div className="ambient-light ambient-light-3" />

      {/* Light Rays */}
      <div className="light-rays-container">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="light-ray" style={{ 
            '--ray-delay': `${i * 0.5}s`,
            '--ray-angle': `${i * 45}deg`
          }} />
        ))}
      </div>

      {/* Main Lamp */}
      <div className="hanging-lamp lamp-on">
        <div className="lamp-wire" />
        <div className="lamp-shade">
          <div className="lamp-inner" />
          <Lightbulb className="bulb-icon" size={32} />
        </div>
        <div className="lamp-glow" />
      </div>

      {/* Register Card */}
      <div className="lamp-auth-card">
        <div className="card-illumination" />
      
        <div className="lamp-auth-header">
          <h1 className="illuminate-text">Create Account</h1>
          <p className="auth-subtitle">Join HireSmart and get started</p>
        </div>

        {error && (
          <div className="error-alert illuminate-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="success-alert illuminate-success">
            <CheckCircle size={20} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="lamp-auth-form">
          {/* Role Selector */}
          <div className="role-selector-lamp">
            <div 
              className={`role-card-lamp ${formData.role === 'candidate' ? 'active' : ''}`}
              onClick={() => handleRoleChange('candidate')}
            >
              <div className="role-light" />
              <UserIcon size={28} />
              <span className="role-label">Candidate</span>
            </div>
            <div 
              className={`role-card-lamp ${formData.role === 'employer' ? 'active' : ''}`}
              onClick={() => handleRoleChange('employer')}
            >
              <div className="role-light" />
              <Briefcase size={28} />
              <span className="role-label">Employer</span>
            </div>
          </div>

          {/* First Name Input */}
          <div className="form-group-lamp">
            <label htmlFor="firstName">
              <UserIcon size={18} />
              First Name
            </label>
            <div className="input-lamp-wrapper">
              <input
                type="text"
                id="firstName"
                name="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <div className="input-glow" />
            </div>
          </div>

          {/* Last Name Input */}
          <div className="form-group-lamp">
            <label htmlFor="lastName">
              <UserIcon size={18} />
              Last Name
            </label>
            <div className="input-lamp-wrapper">
              <input
                type="text"
                id="lastName"
                name="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <div className="input-glow" />
            </div>
          </div>

          {/* Email Input */}
          <div className="form-group-lamp">
            <label htmlFor="email">
              <Mail size={18} />
              Email Address
            </label>
            <div className="input-lamp-wrapper">
              <input
                type="email"
                id="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <div className="input-glow" />
            </div>
          </div>

          {/* Password Input */}
          <div className="form-group-lamp">
            <label htmlFor="password">
              <Lock size={18} />
              Password
            </label>
            <div className="input-lamp-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                disabled={loading}
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#b9c0cf',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 3
                }}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <div className="input-glow" />
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="form-group-lamp">
            <label htmlFor="confirmPassword">
              <CheckCircle size={18} />
              Confirm Password
            </label>
            <div className="input-lamp-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(prev => !prev)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#b9c0cf',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 3
                }}
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <div className="input-glow" />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn-lamp-submit"
            disabled={loading}
          >
            <span className="btn-lamp-glow" />
            <span className="btn-lamp-text">
              {loading ? 'Creating Account...' : 'Create Account'}
            </span>
            {loading && <div className="btn-lamp-loader" />}
          </button>
        </form>

        <div className="lamp-auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="lamp-link">Sign In</Link>
          </p>
        </div>
      </div>

      <style>{`
        /* === CONTAINER & BACKGROUND === */
        .lamp-auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, #050508 0%, #0d0d18 50%, #0a0f1e 100%);
        }

        /* Spotlight Effect */
        .spotlight-effect {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          transition: background 0.3s ease;
        }

        /* Ambient Lighting */
        .ambient-light {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0;
          animation: ambientPulse 8s ease-in-out infinite;
        }

        .ambient-light-1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(255, 200, 100, 0.4), rgba(255, 180, 80, 0.2) 50%, transparent 75%);
          top: -200px;
          right: -200px;
          animation-delay: 0s;
        }

        .ambient-light-2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(100, 150, 255, 0.35), rgba(80, 130, 235, 0.18) 50%, transparent 75%);
          bottom: -150px;
          left: -150px;
          animation-delay: 3s;
        }

        .ambient-light-3 {
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(255, 150, 200, 0.3), rgba(235, 130, 180, 0.15) 50%, transparent 75%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: 6s;
        }

        @keyframes ambientPulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.15);
          }
        }

        /* Light Rays */
        .light-rays-container {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 2;
        }

        .light-ray {
          position: absolute;
          top: 100px;
          left: 50%;
          width: 2px;
          height: 0;
          background: linear-gradient(to bottom, rgba(255, 220, 150, 0.6), rgba(255, 200, 120, 0.3) 50%, transparent);
          transform-origin: top center;
          transform: rotate(var(--ray-angle)) translateX(-50%);
          animation: rayExpand 3s ease-out infinite;
          animation-delay: var(--ray-delay);
          opacity: 0;
          box-shadow: 0 0 10px rgba(255, 220, 150, 0.3);
        }

        @keyframes rayExpand {
          0% {
            height: 0;
            opacity: 0;
          }
          30% {
            opacity: 0.6;
          }
          100% {
            height: 800px;
            opacity: 0;
          }
        }

        /* === HANGING LAMP === */
        .hanging-lamp {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          z-index: 5;
          animation: lampSwing 6s ease-in-out infinite;
        }

        @keyframes lampSwing {
          0%, 100% {
            transform: translateX(-50%) rotate(-2deg);
          }
          50% {
            transform: translateX(-50%) rotate(2deg);
          }
        }

        .lamp-wire {
          width: 2px;
          height: 180px;
          background: linear-gradient(to bottom, rgba(100, 100, 100, 0.8), rgba(80, 80, 80, 0.6));
          margin: 0 auto;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        }

        .lamp-shade {
          width: 140px;
          height: 100px;
          background: linear-gradient(to bottom, #2a2a2a 0%, #1a1a1a 60%, #0a0a0a 100%);
          border-radius: 0 0 60px 60px;
          position: relative;
          box-shadow: 
            0 10px 40px rgba(0, 0, 0, 0.8),
            inset 0 -2px 30px rgba(255, 200, 100, 0.6);
          transform-origin: top center;
        }

        .lamp-inner {
          position: absolute;
          bottom: 5px;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          height: 20px;
          background: radial-gradient(ellipse at center, rgba(255, 220, 150, 0.8), transparent);
          border-radius: 50%;
        }

        .bulb-icon {
          position: absolute;
          bottom: 15px;
          left: 50%;
          transform: translateX(-50%);
          color: #fff9e6;
          opacity: 0;
          transition: all 0.8s ease;
          filter: drop-shadow(0 0 20px rgba(255, 220, 150, 0.8)) drop-shadow(0 0 40px rgba(255, 200, 100, 0.6));
        }

        .hanging-lamp.lamp-on .bulb-icon {
          opacity: 1;
          animation: bulbFlicker 4s ease-in-out infinite;
        }

        @keyframes bulbFlicker {
          0%, 100% {
            opacity: 1;
            filter: drop-shadow(0 0 25px rgba(255, 220, 150, 0.8)) drop-shadow(0 0 50px rgba(255, 200, 100, 0.6)) drop-shadow(0 0 75px rgba(255, 180, 50, 0.4));
          }
          50% {
            opacity: 0.95;
            filter: drop-shadow(0 0 30px rgba(255, 220, 150, 0.85)) drop-shadow(0 0 60px rgba(255, 200, 100, 0.65)) drop-shadow(0 0 90px rgba(255, 180, 50, 0.45));
          }
        }

        .lamp-glow {
          position: absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          width: 500px;
          height: 500px;
          background: radial-gradient(ellipse at center, rgba(255, 220, 150, 0.6), rgba(255, 200, 100, 0.4) 35%, rgba(255, 180, 80, 0.2) 55%, transparent 75%);
          border-radius: 50%;
          opacity: 0;
          transition: opacity 1s ease;
          pointer-events: none;
        }

        .hanging-lamp.lamp-on .lamp-glow {
          opacity: 0.85;
          animation: glowPulse 3s ease-in-out infinite alternate;
        }

        @keyframes glowPulse {
          0% {
            opacity: 0.8;
            transform: translateX(-50%) scale(1);
          }
          100% {
            opacity: 0.9;
            transform: translateX(-50%) scale(1.1);
          }
        }

        /* === REGISTER CARD === */
        .lamp-auth-card {
          background: linear-gradient(135deg, rgba(20, 25, 45, 0.95) 0%, rgba(15, 20, 40, 0.98) 100%);
          backdrop-filter: blur(30px) saturate(200%);
          border-radius: 2rem;
          padding: 3rem 2.5rem;
          max-width: 480px;
          width: 100%;
          position: relative;
          z-index: 10;
          border: 2px solid rgba(255, 200, 100, 0.3);
          box-shadow: 
            0 30px 90px rgba(0, 0, 0, 0.8),
            0 0 60px rgba(255, 200, 100, 0.2),
            inset 0 1px 0 rgba(255, 220, 150, 0.1),
            inset 0 0 100px rgba(255, 200, 100, 0.05);
          animation: cardFadeIn 0.8s ease-out forwards;
        }

        @keyframes cardFadeIn {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .card-illumination {
          position: absolute;
          top: -100px;
          left: 50%;
          transform: translateX(-50%);
          width: 250%;
          height: 450px;
          background: radial-gradient(ellipse at center, rgba(255, 220, 150, 0.5), rgba(255, 200, 120, 0.3) 40%, rgba(255, 180, 100, 0.15) 60%, transparent 75%);
          pointer-events: none;
          opacity: 0;
          animation: illuminationFade 1.2s ease-out forwards;
        }

        @keyframes illuminationFade {
          0% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.5;
          }
        }

        /* === HEADER === */
        .lamp-auth-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .illuminate-text {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #ffb347 0%, #ffd700 50%, #ffb347 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
          letter-spacing: -0.03em;
          animation: textIlluminate 3s ease-in-out infinite;
          filter: drop-shadow(0 2px 10px rgba(255, 200, 100, 0.5));
        }

        @keyframes textIlluminate {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .auth-subtitle {
          color: rgba(255, 255, 255, 0.7);
          font-size: 1rem;
        }

        /* === ERROR ALERT === */
        .illuminate-error {
          padding: 1rem 1.25rem;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.25));
          border: 1px solid rgba(239, 68, 68, 0.5);
          border-radius: 0.875rem;
          color: #ff6b6b;
          font-size: 0.9375rem;
          margin-bottom: 1.5rem;
          animation: errorGlow 2s ease-in-out infinite;
        }

        @keyframes errorGlow {
          0%, 100% {
            box-shadow: 0 0 0 rgba(239, 68, 68, 0);
          }
          50% {
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
          }
        }

        /* === ROLE SELECTOR === */
        .role-selector-lamp {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .role-card-lamp {
          position: relative;
          padding: 1.5rem 1rem;
          background: rgba(30, 35, 55, 0.6);
          border: 2px solid rgba(255, 200, 100, 0.2);
          border-radius: 1rem;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }

        .role-light {
          position: absolute;
          top: -100%;
          left: 50%;
          transform: translateX(-50%);
          width: 150%;
          height: 200%;
          background: radial-gradient(ellipse at center, rgba(255, 220, 150, 0.4), transparent 60%);
          opacity: 0;
          transition: all 0.5s ease;
          pointer-events: none;
        }

        .role-card-lamp:hover .role-light {
          top: -50%;
          opacity: 0.6;
        }

        .role-card-lamp.active .role-light {
          top: -30%;
          opacity: 1;
          animation: roleLightPulse 2s ease-in-out infinite;
        }

        @keyframes roleLightPulse {
          0%, 100% {
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
        }

        .role-card-lamp:hover {
          border-color: rgba(255, 200, 100, 0.5);
          transform: translateY(-4px);
          box-shadow: 0 15px 40px rgba(255, 179, 71, 0.25);
          background: rgba(35, 40, 60, 0.8);
        }

        .role-card-lamp.active {
          border-color: #ffb347;
          background: linear-gradient(135deg, rgba(255, 220, 150, 0.25), rgba(255, 179, 71, 0.2));
          box-shadow: 
            0 20px 50px rgba(255, 179, 71, 0.4),
            0 0 0 3px rgba(255, 179, 71, 0.2),
            inset 0 1px 0 rgba(255, 220, 150, 0.2);
        }

        .role-card-lamp svg {
          color: rgba(255, 255, 255, 0.6);
          transition: all 0.4s ease;
          z-index: 1;
        }

        .role-card-lamp.active svg {
          color: #ffb347;
          filter: drop-shadow(0 4px 12px rgba(255, 179, 71, 0.6));
          animation: iconShine 2s ease-in-out infinite;
        }

        @keyframes iconShine {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .role-label {
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          font-size: 1rem;
          z-index: 1;
        }

        .role-card-lamp.active .role-label {
          color: #ffb347;
        }

        /* === FORM INPUTS === */
        .lamp-auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group-lamp {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .form-group-lamp label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.9375rem;
        }

        .form-group-lamp label svg {
          color: #ffb347;
        }

        .input-lamp-wrapper {
          position: relative;
        }

        .input-lamp-wrapper input {
          width: 100%;
          padding: 0.875rem 1.125rem;
          border: 2px solid rgba(255, 200, 100, 0.3);
          border-radius: 0.75rem;
          font-size: 1rem;
          background: rgba(30, 35, 55, 0.6);
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          color: rgba(255, 255, 255, 0.95);
        }

        .input-lamp-wrapper input:focus {
          outline: none;
          border-color: #ffb347;
          background: rgba(40, 45, 65, 0.8);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(255, 179, 71, 0.3);
        }

        .input-glow {
          position: absolute;
          inset: -4px;
          background: linear-gradient(135deg, rgba(255, 220, 150, 0.4), rgba(255, 179, 71, 0.3));
          border-radius: 0.875rem;
          opacity: 0;
          filter: blur(12px);
          transition: opacity 0.4s ease;
          pointer-events: none;
          z-index: -1;
        }

        .input-lamp-wrapper input:focus ~ .input-glow {
          opacity: 1;
        }

        .input-lamp-wrapper input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .input-lamp-wrapper input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* === SUBMIT BUTTON === */
        .btn-lamp-submit {
          position: relative;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #ff8c00 0%, #ffb347 100%);
          border: none;
          border-radius: 0.875rem;
          color: white;
          font-size: 1.0625rem;
          font-weight: 700;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 
            0 10px 30px rgba(255, 140, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
          margin-top: 0.5rem;
        }

        .btn-lamp-submit:hover:not(:disabled) {
          transform: translateY(-4px);
          box-shadow: 
            0 20px 50px rgba(255, 140, 0, 0.5),
            0 0 60px rgba(255, 179, 71, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }

        .btn-lamp-submit:active:not(:disabled) {
          transform: translateY(-1px);
        }

        .btn-lamp-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-lamp-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(255, 255, 255, 0.3), transparent 70%);
          opacity: 0;
          transition: opacity 0.4s ease;
        }

        .btn-lamp-submit:hover:not(:disabled) .btn-lamp-glow {
          opacity: 1;
          animation: buttonGlowPulse 1.5s ease-in-out infinite;
        }

        @keyframes buttonGlowPulse {
          0%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        .btn-lamp-text {
          position: relative;
          z-index: 1;
        }

        .btn-lamp-loader {
          position: absolute;
          right: 1.5rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1.25rem;
          height: 1.25rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: translateY(-50%) rotate(360deg);
          }
        }

        /* === FOOTER === */
        .lamp-auth-footer {
          margin-top: 2rem;
          text-align: center;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 200, 100, 0.2);
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9375rem;
        }

        .lamp-link {
          color: #ffb347;
          text-decoration: none;
          font-weight: 700;
          position: relative;
          transition: color 0.3s ease;
        }

        .lamp-link::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, #ffb347, #ffd700);
          transition: width 0.3s ease;
        }

        .lamp-link:hover {
          color: #ffd700;
        }

        .lamp-link:hover::after {
          width: 100%;
        }

        /* === ALERTS === */
        .error-alert {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 0.75rem;
          padding: 1rem 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #fca5a5;
          font-size: 0.95rem;
          animation: slideDown 0.3s ease;
        }

        .success-alert {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 0.75rem;
          padding: 1rem 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #6ee7b7;
          font-size: 0.95rem;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* === RESPONSIVE === */
        @media (max-width: 640px) {
          .lamp-auth-card {
            padding: 2.5rem 1.75rem;
          }

          .illuminate-text {
            font-size: 2rem;
          }

          .role-selector-lamp {
            grid-template-columns: 1fr;
          }

          .hanging-lamp {
            transform: translateX(-50%) scale(0.8);
          }

          .light-ray {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}

export default Register
