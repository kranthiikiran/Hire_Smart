import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, UserCircle2, Briefcase, Lightbulb, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '', role: 'candidate' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const cardRef = useRef(null)
  const pullStringRef = useRef(null)
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 })
  const [isLampOn, setIsLampOn] = useState(false)
  const [showInterface, setShowInterface] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [stringPullOffset, setStringPullOffset] = useState(0)
  const [isFlickering, setIsFlickering] = useState(false)
  const [pullIntensity, setPullIntensity] = useState(0)
  const [showPassword, setShowPassword] = useState(false)

  // Track mouse for spotlight
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

  // Handle pull string interaction
  const handlePullStart = (e) => {
    e.preventDefault()
    setIsPulling(true)
  }

  const handlePullEnd = () => {
    if (isPulling && pullIntensity > 0.4) {
      setIsPulling(false)
      
      // Start flickering effect
      setIsFlickering(true)
      
      // Multiple flickers before full light
      setTimeout(() => setIsLampOn(true), 100)
      setTimeout(() => setIsLampOn(false), 170)
      setTimeout(() => setIsLampOn(true), 240)
      setTimeout(() => setIsLampOn(false), 310)
      setTimeout(() => {
        setIsLampOn(true)
        setIsFlickering(false)
        // Delay before interface appears
        setTimeout(() => {
          setShowInterface(true)
        }, 200)
      }, 380)
      
      setStringPullOffset(0)
      setPullIntensity(0)
    } else if (isPulling) {
      // Reset if not pulled enough
      setIsPulling(false)
      setStringPullOffset(0)
      setPullIntensity(0)
    }
  }

  const handlePullMove = (e) => {
    if (isPulling) {
      const startY = containerRef.current ? containerRef.current.getBoundingClientRect().top : 0
      const currentY = e.clientY - startY
      const pullDistance = Math.min(Math.max(currentY - 180, 0), 80)
      setStringPullOffset(pullDistance)
      // Calculate pull intensity (0 to 1)
      const intensity = Math.min(pullDistance / 80, 1)
      setPullIntensity(intensity)
    }
  }

  useEffect(() => {
    if (isPulling) {
      const handleMove = (e) => handlePullMove(e)
      const handleEnd = () => handlePullEnd()
      
      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleEnd)
      window.addEventListener('touchmove', handleMove)
      window.addEventListener('touchend', handleEnd)
      
      return () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleEnd)
        window.removeEventListener('touchmove', handleMove)
        window.removeEventListener('touchend', handleEnd)
      }
    }
  }, [isPulling, pullIntensity])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleRoleChange = (role) => {
    setFormData({ ...formData, role })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const normalizedEmail = String(formData.email || '').trim().toLowerCase()
    const normalizedPassword = String(formData.password || '')

    if (!normalizedEmail || !normalizedPassword) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      await login({ email: normalizedEmail, password: normalizedPassword, role: formData.role })
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

  return (
    <div className="lamp-auth-container" ref={containerRef}>
      {/* Screen Flash Effect */}
      {isFlickering && <div className="screen-flash" />}
      
      {/* Pull Intensity Overlay */}
      {isPulling && pullIntensity > 0 && (
        <div 
          className="pull-intensity-overlay"
          style={{ opacity: pullIntensity * 0.35 }}
        />
      )}
      
      {/* Spotlight Effect */}
      <div 
        className="spotlight-effect"
        style={{
          background: `radial-gradient(circle 600px at ${mousePosition.x}% ${mousePosition.y}%, rgba(255, 220, 150, ${isLampOn || isFlickering ? 0.15 : isPulling ? 0.04 + pullIntensity * 0.14 : 0}), rgba(255, 200, 100, ${isLampOn || isFlickering ? 0.08 : isPulling ? 0.02 + pullIntensity * 0.1 : 0}) 50%, transparent 75%)`
        }}
      />

      {/* Ambient Lighting */}
      {(isLampOn || isFlickering || isPulling) && (
        <>
          <div className="ambient-light ambient-light-1" />
          <div className="ambient-light ambient-light-2" />
          <div className="ambient-light ambient-light-3" />
        </>
      )}

      {/* Light Rays */}
      <div className="light-rays-container">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="light-ray" style={{ 
            '--ray-delay': `${i * 0.5}s`,
            '--ray-angle': `${i * 45}deg`
          }} />
        ))}
      </div>

      <div className={`lamp-brand ${isLampOn || isFlickering || isPulling ? 'lit' : ''}`}>
        <span className="lamp-brand-word left" data-text="Hire">Hire</span>
        <span className="lamp-brand-gap" aria-hidden="true" />
        <span className="lamp-brand-word right" data-text="Smart">Smart</span>
      </div>

      {/* Main Lamp */}
      <div 
        className={`hanging-lamp ${isLampOn ? 'lamp-on' : ''} ${isPulling ? 'being-pulled' : ''} ${isFlickering ? 'flickering' : ''}`}
        style={{
          transform: isPulling 
            ? `translateX(-50%) rotate(${stringPullOffset * 0.225 - 9}deg) translateY(${stringPullOffset * 0.45}px)`
            : undefined
        }}
      >
        <div className="lamp-wire" />
        <div className="lamp-cap" />
        <div className="lamp-shade">
          <div className="bulb-socket" />
          <div className="lamp-inner" />
          <Lightbulb className="bulb-icon" size={44} />
        </div>
        <div className="lamp-glow" />
        
        {/* Pull String */}
        {!showInterface && (
          <div 
            className={`pull-string-container ${isPulling ? 'pulling' : ''}`}
            style={{ transform: `translateY(${stringPullOffset}px)` }}
          >
            <div className="pull-string-cord" />
            <div 
              ref={pullStringRef}
              className="pull-string-handle"
              onMouseDown={handlePullStart}
              style={{
                transform: isPulling 
                  ? `scale(${1 + pullIntensity * 0.2})` 
                  : undefined
              }}
            >
              <div 
                className="pull-ring"
                style={{
                  boxShadow: isPulling 
                    ? `0 4px 15px rgba(0, 0, 0, 0.3),
                       inset 0 2px 5px rgba(255, 255, 255, 0.2),
                       0 0 0 2px rgba(100, 90, 70, 0.5),
                       0 0 ${20 + pullIntensity * 40}px rgba(255, 220, 150, ${0.4 + pullIntensity * 0.5}),
                       0 0 ${40 + pullIntensity * 60}px rgba(255, 200, 100, ${0.2 + pullIntensity * 0.4})`
                    : undefined
                }}
              />
              <div className="pull-hint">
                {isPulling ? (pullIntensity > 0.5 ? 'Release now!' : 'Keep pulling...') : 'Pull to illuminate'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Login Card */}
      {showInterface && (
        <div className="lamp-auth-card" ref={cardRef}>
          <div className="card-illumination" />
        
        <div className="lamp-auth-header">
          <h1 className="illuminate-text">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to continue to HireSmart</p>
        </div>

        {error && (
          <div className="error-alert illuminate-error">
            <span>{error}</span>
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
              <UserCircle2 size={28} />
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

          {/* Email Input */}
          <div className="form-group-lamp">
            <label>
              <Mail size={18} />
              <span>Email Address</span>
            </label>
            <div className="input-lamp-wrapper">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                required
                disabled={loading}
              />
              <div className="input-glow" />
            </div>
          </div>

          {/* Password Input */}
          <div className="form-group-lamp">
            <label>
              <Lock size={18} />
              <span>Password</span>
            </label>
            <div className="input-lamp-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
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

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn-lamp-submit"
            disabled={loading}
          >
            <span className="btn-lamp-glow" />
            <span className="btn-lamp-text">
              {loading ? 'Signing in...' : 'Sign In'}
            </span>
            {loading && <div className="btn-lamp-loader" />}
          </button>
        </form>

        <div className="lamp-auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="lamp-link">Register here</Link>
          </p>
        </div>
      </div>
      )}

      <style>{`
        /* === DRAMATIC EFFECTS === */
        .screen-flash {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at center, rgba(255, 240, 200, 0.7), rgba(255, 220, 150, 0.5) 30%, rgba(255, 200, 120, 0.3) 50%, transparent 70%);
          z-index: 100;
          pointer-events: none;
          animation: screenFlash 0.15s ease-out;
        }

        @keyframes screenFlash {
          0% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        .pull-intensity-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 20%, rgba(255, 220, 150, 0.5), rgba(255, 200, 120, 0.25) 40%, transparent 65%);
          pointer-events: none;
          z-index: 3;
          transition: opacity 0.1s ease;
        }

        /* === CONTAINER & BACKGROUND === */
        .lamp-auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, #000000 0%, #0a0a0a 50%, #000000 100%);
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
          animation: none;
          transition: opacity 0.35s ease;
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
          width: 3px;
          height: 0;
          background: linear-gradient(to bottom, rgba(255, 220, 150, 0.5), rgba(255, 200, 120, 0.32) 50%, transparent);
          transform-origin: top center;
          transform: rotate(var(--ray-angle)) translateX(-50%);
          animation: rayExpand 3s ease-out infinite;
          animation-delay: var(--ray-delay);
          opacity: 0.3;
          box-shadow: 
            0 0 10px rgba(255, 220, 150, 0.3),
            0 0 20px rgba(255, 200, 100, 0.2),
            0 0 30px rgba(255, 180, 80, 0.12);
          filter: blur(1px);
        }

        @keyframes rayExpand {
          0% {
            height: 0;
            opacity: 0.12;
          }
          30% {
            opacity: 0.58;
          }
          100% {
            height: 800px;
            opacity: 0.12;
          }
        }

        .lamp-brand {
          position: absolute;
          top: 145px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 4;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          pointer-events: none;
          opacity: 0.88;
          transition: all 0.35s ease;
        }

        .lamp-brand.lit {
          opacity: 1;
        }

        .lamp-brand-word {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
          font-size: 3.35rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          line-height: 1;
          color: rgba(255, 255, 255, 0.25);
          position: relative;
          backdrop-filter: blur(12px) brightness(1.1);
          -webkit-backdrop-filter: blur(12px) brightness(1.1);
          text-shadow: 
            0 2px 4px rgba(0, 0, 0, 0.3),
            0 4px 8px rgba(0, 0, 0, 0.2),
            0 0 16px rgba(255, 215, 100, 0.12),
            inset 0 1px 0 rgba(255, 240, 180, 0.3);
          filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.25))
                  drop-shadow(0 0 12px rgba(255, 215, 100, 0.08));
          transform: scaleX(1.05);
          -webkit-text-stroke: 0.5px rgba(255, 220, 130, 0.25);
        }

        .lamp-brand-word::before {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.45) 0%,
            rgba(255, 255, 255, 0.28) 18%,
            rgba(248, 250, 252, 0.15) 42%,
            rgba(226, 232, 240, 0.06) 70%,
            transparent 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          pointer-events: none;
          font: inherit;
          letter-spacing: inherit;
          line-height: inherit;
          filter: blur(1px);
        }

        .lamp-brand-word::after {
          content: '';
          position: absolute;
          top: -8px;
          left: 10%;
          right: 10%;
          height: 45%;
          background: radial-gradient(
            ellipse at center top,
            rgba(255, 255, 255, 0.28) 0%,
            rgba(255, 255, 255, 0.12) 35%,
            transparent 70%
          );
          border-radius: 50%;
          pointer-events: none;
          filter: blur(6px);
          opacity: 0.85;
        }

        .lamp-brand-word.left,
        .lamp-brand-word.right {
          transform: translateZ(0);
        }

        .lamp-brand-word.left {
          animation: glowLeft 3s ease-in-out infinite;
        }

        .lamp-brand-word.right {
          animation: glowRight 3s ease-in-out infinite;
        }

        @keyframes glowLeft {
          0%, 100% {
            filter: drop-shadow(-4px 0 8px rgba(255, 215, 100, 0.18))
                    drop-shadow(-2px 0 4px rgba(255, 235, 150, 0.12));
          }
          50% {
            filter: drop-shadow(-6px 0 12px rgba(255, 215, 100, 0.32))
                    drop-shadow(-3px 0 6px rgba(255, 235, 150, 0.25));
          }
        }

        @keyframes glowRight {
          0%, 100% {
            filter: drop-shadow(4px 0 8px rgba(255, 215, 100, 0.18))
                    drop-shadow(2px 0 4px rgba(255, 235, 150, 0.12));
          }
          50% {
            filter: drop-shadow(6px 0 12px rgba(255, 215, 100, 0.32))
                    drop-shadow(3px 0 6px rgba(255, 235, 150, 0.25));
          }
        }

        .lamp-brand-gap {
          width: 130px;
          height: 1px;
        }

        /* === HANGING LAMP === */
        .hanging-lamp {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          z-index: 5;
          animation: lampSwing 6s ease-in-out infinite;
          transition: transform 0.1s ease-out;
        }

        .hanging-lamp.being-pulled {
          animation: none;
          transition: transform 0.05s ease-out;
        }

        .hanging-lamp.flickering {
          animation: lampFlickerShake 0.15s ease-in-out infinite;
        }

        @keyframes lampSwing {
          0%, 100% {
            transform: translateX(-50%) rotate(-2deg);
          }
          50% {
            transform: translateX(-50%) rotate(2deg);
          }
        }

        @keyframes lampFlickerShake {
          0%, 100% {
            transform: translateX(-50%) rotate(0deg);
          }
          25% {
            transform: translateX(-50%) rotate(-3deg) translateY(2px);
          }
          75% {
            transform: translateX(-50%) rotate(3deg) translateY(-2px);
          }
        }

        @keyframes lampPullSwing {
          0% {
            transform: translateX(-50%) rotate(0deg);
          }
          30% {
            transform: translateX(-50%) rotate(-8deg) translateY(5px);
          }
          60% {
            transform: translateX(-50%) rotate(6deg) translateY(3px);
          }
          100% {
            transform: translateX(-50%) rotate(0deg);
          }
        }

        .lamp-wire {
          width: 3px;
          height: 200px;
          background: linear-gradient(to bottom, 
            rgba(140, 140, 140, 0.9) 0%,
            rgba(110, 110, 110, 0.85) 20%,
            rgba(90, 90, 90, 0.8) 50%,
            rgba(70, 70, 70, 0.75) 80%,
            rgba(60, 60, 60, 0.7) 100%);
          margin: 0 auto;
          box-shadow: 
            inset 1px 0 0 rgba(180, 180, 180, 0.4),
            inset -1px 0 0 rgba(40, 40, 40, 0.6),
            0 0 5px rgba(0, 0, 0, 0.5),
            2px 2px 8px rgba(0, 0, 0, 0.4);
          border-radius: 2px;
        }

        .lamp-cap {
          width: 38px;
          height: 16px;
          margin: -2px auto 0;
          border-radius: 10px 10px 6px 6px;
          background: linear-gradient(to bottom,
            rgba(120, 120, 120, 0.95) 0%,
            rgba(90, 90, 90, 0.9) 45%,
            rgba(60, 60, 60, 0.9) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.22),
            inset 0 -1px 0 rgba(0, 0, 0, 0.45),
            0 2px 6px rgba(0, 0, 0, 0.5);
          position: relative;
          z-index: 2;
        }

        .lamp-shade {
          width: 200px;
          height: 145px;
          background: linear-gradient(to bottom, 
            rgba(100, 100, 100, 0.3) 0%, 
            rgba(70, 70, 70, 0.25) 18%,
            rgba(50, 50, 50, 0.2) 42%,
            rgba(30, 30, 30, 0.15) 70%,
            rgba(15, 15, 15, 0.1) 100%);
          backdrop-filter: blur(8px) brightness(0.95);
          border-radius: 12px 12px 70px 70px;
          clip-path: polygon(18% 0%, 82% 0%, 98% 100%, 2% 100%);
          position: relative;
          box-shadow: 
            0 18px 62px rgba(0, 0, 0, 0.6),
            0 8px 30px rgba(0, 0, 0, 0.35),
            inset 0 -8px 34px rgba(255, 200, 100, 0.32),
            inset 0 2px 10px rgba(180, 180, 180, 0.15),
            inset 3px 0 8px rgba(140, 140, 140, 0.12),
            inset -3px 0 8px rgba(140, 140, 140, 0.12),
            inset 0 0 20px rgba(255, 255, 255, 0.08);
          transform-origin: top center;
          border-top: 2px solid rgba(120, 120, 120, 0.4);
        }

        .lamp-shade::before {
          content: '';
          position: absolute;
          top: 7px;
          left: 24%;
          right: 24%;
          height: 28%;
          background: linear-gradient(to bottom, 
            rgba(255, 255, 255, 0.28) 0%,
            rgba(255, 255, 255, 0.12) 52%,
            transparent 100%);
          border-radius: 50% 50% 42% 42%;
          pointer-events: none;
          filter: blur(2px);
        }

        .lamp-shade::after {
          content: '';
          position: absolute;
          left: 8%;
          right: 8%;
          bottom: 3px;
          height: 9px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center,
            rgba(255, 232, 176, 0.55) 0%,
            rgba(255, 205, 130, 0.35) 42%,
            rgba(255, 170, 90, 0.12) 70%,
            transparent 100%);
          filter: blur(0.4px);
          pointer-events: none;
        }

        .bulb-socket {
          position: absolute;
          top: 22px;
          left: 50%;
          transform: translateX(-50%);
          width: 28px;
          height: 20px;
          border-radius: 4px 4px 7px 7px;
          background: linear-gradient(to bottom,
            rgba(150, 150, 150, 0.94) 0%,
            rgba(118, 118, 118, 0.9) 35%,
            rgba(92, 92, 92, 0.9) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            inset 0 -1px 0 rgba(0, 0, 0, 0.45),
            0 2px 7px rgba(0, 0, 0, 0.45);
          z-index: 2;
        }

        .lamp-inner {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: 82%;
          height: 24px;
          background: radial-gradient(ellipse at center, 
            rgba(255, 240, 180, 0.9) 0%,
            rgba(255, 220, 150, 0.8) 30%,
            rgba(255, 200, 120, 0.5) 60%,
            transparent 100%);
          border-radius: 50%;
          box-shadow: 
            0 0 20px rgba(255, 220, 150, 0.6),
            0 0 40px rgba(255, 200, 100, 0.4);
          opacity: 0;
          transition: opacity 0.5s ease;
        }

        .hanging-lamp.lamp-on .lamp-inner {
          opacity: 1;
        }

        .bulb-icon {
          position: absolute;
          bottom: 22px;
          left: 50%;
          transform: translateX(-50%);
          color: #fff9e6;
          opacity: 0;
          transition: all 0.8s ease;
          width: 44px;
          height: 44px;
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
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          width: 650px;
          height: 650px;
          background: radial-gradient(ellipse at center, 
            rgba(255, 240, 180, 0.7) 0%,
            rgba(255, 220, 150, 0.6) 20%,
            rgba(255, 200, 100, 0.45) 40%,
            rgba(255, 180, 80, 0.25) 60%,
            transparent 80%);
          border-radius: 50%;
          opacity: 0;
          transition: opacity 1s ease;
          pointer-events: none;
          filter: blur(2px);
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

        /* === PULL STRING === */
        .pull-string-container {
          position: absolute;
          bottom: -100px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 6;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .pull-string-container.pulling {
          transition: none;
        }

        .pull-string-cord {
          width: 2px;
          height: 60px;
          background: linear-gradient(to bottom, rgba(200, 200, 200, 0.8), rgba(150, 150, 150, 0.6));
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          animation: cordSway 3s ease-in-out infinite;
          transition: all 0.1s ease;
        }

        .pull-string-container.pulling .pull-string-cord {
          animation: none;
          background: linear-gradient(to bottom, rgba(255, 220, 150, 0.9), rgba(200, 180, 140, 0.8));
          box-shadow: 
            0 2px 4px rgba(0, 0, 0, 0.3),
            0 0 10px rgba(255, 220, 150, 0.5);
          transform: scaleY(1.1);
        }

        @keyframes cordSway {
          0%, 100% {
            transform: rotate(-2deg);
          }
          50% {
            transform: rotate(2deg);
          }
        }

        .pull-string-handle {
          position: relative;
          cursor: pointer;
          padding: 1rem;
          transition: all 0.3s ease;
          animation: pullHintBounce 2s ease-in-out infinite;
        }

        @keyframes pullHintBounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(10px);
          }
        }

        .pull-string-handle:hover {
          transform: scale(1.1) translateY(5px);
          animation: none;
        }

        .pull-string-handle:hover .pull-ring {
          box-shadow: 
            0 0 20px rgba(255, 220, 150, 0.6),
            0 0 40px rgba(255, 200, 100, 0.4),
            inset 0 0 10px rgba(255, 220, 150, 0.3);
          background: linear-gradient(135deg, rgba(255, 220, 150, 0.3), rgba(255, 200, 100, 0.2));
        }

        .pull-string-handle:hover .pull-hint {
          opacity: 1;
          transform: translateY(0);
        }

        .pull-ring {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(200, 180, 140, 0.9);
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, rgba(220, 200, 160, 0.2), transparent 70%);
          box-shadow: 
            0 4px 15px rgba(0, 0, 0, 0.3),
            inset 0 2px 5px rgba(255, 255, 255, 0.2),
            0 0 0 2px rgba(100, 90, 70, 0.5);
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          animation: ringGlow 2s ease-in-out infinite;
        }

        @keyframes ringGlow {
          0%, 100% {
            box-shadow: 
              0 4px 15px rgba(0, 0, 0, 0.3),
              inset 0 2px 5px rgba(255, 255, 255, 0.2),
              0 0 0 2px rgba(100, 90, 70, 0.5),
              0 0 15px rgba(255, 220, 150, 0.3);
          }
          50% {
            box-shadow: 
              0 4px 15px rgba(0, 0, 0, 0.3),
              inset 0 2px 5px rgba(255, 255, 255, 0.2),
              0 0 0 2px rgba(100, 90, 70, 0.5),
              0 0 30px rgba(255, 220, 150, 0.6),
              0 0 50px rgba(255, 200, 100, 0.3);
          }
        }

        .pull-ring::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3), transparent);
        }

        .pull-ring::after {
          content: '';
          position: absolute;
          top: 15%;
          left: 20%;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: radial-gradient(circle at center, rgba(255, 255, 255, 0.6), transparent);
          filter: blur(2px);
        }

        .pull-hint {
          position: absolute;
          bottom: -40px;
          left: 50%;
          transform: translateX(-50%) translateY(10px);
          white-space: nowrap;
          color: rgba(255, 220, 150, 0.9);
          font-size: 0.875rem;
          font-weight: 600;
          text-shadow: 
            0 2px 8px rgba(0, 0, 0, 0.5),
            0 0 20px rgba(255, 220, 150, 0.5);
          opacity: 0;
          transition: all 0.4s ease;
          pointer-events: none;
          letter-spacing: 0.5px;
          padding: 0.5rem 1rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 1rem;
          backdrop-filter: blur(5px);
        }

        .pull-string-handle:hover .pull-hint,
        .pull-string-container.pulling .pull-hint {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        .pull-string-container.pulling .pull-hint {
          animation: pulseHint 0.6s ease-in-out infinite;
        }

        @keyframes pulseHint {
          0%, 100% {
            transform: translateX(-50%) translateY(0) scale(1);
          }
          50% {
            transform: translateX(-50%) translateY(-5px) scale(1.05);
          }
        }

        /* === LOGIN CARD === */
        .lamp-auth-card {
          background: linear-gradient(135deg, rgba(25, 25, 25, 0.95) 0%, rgba(15, 15, 15, 0.98) 100%);
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
          animation: cardSlowPullUp 0.8s linear forwards;
        }

        @keyframes cardSlowPullUp {
          0% {
            opacity: 0;
            transform: translateY(100vh);
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

          .lamp-brand {
            top: 130px;
            gap: 0.9rem;
          }

          .lamp-brand-word {
            font-size: 2rem;
          }

          .lamp-brand-gap {
            width: 62px;
          }

          .light-ray {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}

export default Login
