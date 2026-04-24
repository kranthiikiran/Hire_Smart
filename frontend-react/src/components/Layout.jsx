import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  LayoutDashboard, 
  Upload, 
  History, 
  LogOut, 
  User,
  Briefcase 
} from 'lucide-react'

const Layout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isEmployerView = user?.role === 'employer' || user?.role === 'recruiter' || user?.role === 'admin'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => {
    return location.pathname === path ? 'active' : ''
  }

  return (
    <div className="layout">
      {/* Animated Background Lines */}
      <div className="background-lines">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="line" style={{ animationDelay: `${i * 0.4}s` }} />
        ))}
      </div>
      
      <nav className="navbar">
        <div className="container">
          <div className="nav-content">
            <Link to="/" className="nav-brand">
              <span className="brand-icon">⚡</span>
              <span className="brand-text">HireSmart</span>
            </Link>
            
            <div className="nav-links">
              <Link to="/" className={`nav-link ${isActive('/')}`}>
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </Link>
              <Link to="/upload" className={`nav-link ${isActive('/upload')}`}>
                <Upload size={20} />
                <span>Upload</span>
              </Link>
              <Link to="/history" className={`nav-link ${isActive('/history')}`}>
                <History size={20} />
                <span>History</span>
              </Link>
            </div>

            <div className="nav-user">
              <div className="user-info">
                {isEmployerView ? (
                  <Briefcase size={20} className="user-icon" />
                ) : (
                  <User size={20} className="user-icon" />
                )}
                <div className="user-details">
                  <span className="user-email">{user?.email}</span>
                  <span className="user-role">
                    {isEmployerView ? 'Recruiter' : 'Job Seeker'}
                  </span>
                </div>
              </div>
              <button onClick={handleLogout} className="btn-logout">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <style>{`
        .layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 50%, #141414 100%);
          position: relative;
          overflow: hidden;
        }

        /* Animated Background Lines */
        .background-lines {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
          opacity: 0.12;
        }

        .line {
          position: absolute;
          width: 1px;
          height: 0;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(255, 215, 100, 0.3) 50%,
            transparent 100%
          );
          animation: expandLine 4s infinite ease-in-out;
          box-shadow: 
            0 0 6px rgba(255, 215, 100, 0.2),
            0 0 12px rgba(255, 215, 100, 0.15),
            0 0 20px rgba(255, 215, 100, 0.1);
        }

        .line:nth-child(1) { left: 8%; }
        .line:nth-child(2) { left: 15%; }
        .line:nth-child(3) { left: 23%; animation-duration: 3.5s; }
        .line:nth-child(4) { left: 31%; }
        .line:nth-child(5) { left: 38%; animation-duration: 4.2s; }
        .line:nth-child(6) { left: 46%; }
        .line:nth-child(7) { left: 54%; animation-duration: 3.8s; }
        .line:nth-child(8) { left: 62%; }
        .line:nth-child(9) { left: 69%; animation-duration: 4.5s; }
        .line:nth-child(10) { left: 77%; }
        .line:nth-child(11) { left: 85%; animation-duration: 3.3s; }
        .line:nth-child(12) { left: 92%; }
        .line:nth-child(13) { left: 5%; animation-duration: 4.8s; }
        .line:nth-child(14) { left: 95%; animation-duration: 3.6s; }
        .line:nth-child(15) { left: 50%; animation-duration: 4.1s; }

        @keyframes expandLine {
          0% {
            height: 0;
            top: 20%;
            opacity: 0;
          }
          15% {
            opacity: 0.25;
          }
          50% {
            opacity: 0.25;
          }
          100% {
            height: 70vh;
            top: 10%;
            opacity: 0;
          }
        }

        .navbar {
          background: rgba(25, 25, 30, 0.95);
          border-bottom: 1px solid rgba(255, 215, 100, 0.2);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
          position: sticky;
          top: 0;
          z-index: 1000;
          backdrop-filter: blur(16px);
        }

        .nav-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 0;
          gap: 2rem;
          position: relative;
          z-index: 1;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          text-decoration: none;
          color: #ffd764;
          font-weight: 800;
          font-size: 1.625rem;
          transition: all var(--transition);
          position: relative;
          filter: drop-shadow(0 0 8px rgba(255, 215, 100, 0.4));
        }

        .nav-brand:hover {
          transform: scale(1.05);
          filter: drop-shadow(0 0 15px rgba(255, 215, 100, 0.6));
        }

        .brand-icon {
          font-size: 2.25rem;
          animation: pulse 2s infinite;
        }

        .brand-text {
          background: linear-gradient(135deg, #ffd764 0%, #ffeb99 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.025em;
        }

        .nav-links {
          display: flex;
          gap: 0.625rem;
          flex: 1;
          justify-content: center;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius);
          text-decoration: none;
          color: rgba(255, 255, 255, 0.75);
          font-weight: 600;
          font-size: 0.9375rem;
          transition: all var(--transition);
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .nav-link::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #ffd764, #ffeb99);
          transform: scaleX(0);
          transition: transform var(--transition);
        }

        .nav-link:hover {
          background: rgba(255, 215, 100, 0.15);
          color: #ffd764;
          transform: translateY(-2px);
          border-color: rgba(255, 215, 100, 0.3);
          box-shadow: 0 4px 12px rgba(255, 215, 100, 0.2);
        }

        .nav-link:hover::before {
          transform: scaleX(1);
        }

        .nav-link.active {
          background: rgba(255, 215, 100, 0.2);
          color: #ffd764;
          border-color: rgba(255, 215, 100, 0.4);
          box-shadow: 0 0 20px rgba(255, 215, 100, 0.3);
        }

        .nav-link.active::before {
          transform: scaleX(1);
        }

        .nav-link svg {
          transition: all var(--transition-fast);
        }

        .nav-link:hover svg {
          transform: scale(1.1);
        }

        .nav-user {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.625rem 1.25rem;
          background: rgba(35, 35, 40, 0.9);
          border-radius: var(--radius-lg);
          border: 1px solid rgba(255, 215, 100, 0.25);
          transition: all var(--transition);
          backdrop-filter: blur(8px);
        }

        .user-info:hover {
          border-color: rgba(255, 215, 100, 0.4);
          box-shadow: 0 4px 12px rgba(255, 215, 100, 0.2);
          background: rgba(30, 30, 30, 0.95);
        }

        .user-icon {
          color: #ffd764;
          padding: 0.5rem;
          background: rgba(255, 215, 100, 0.15);
          border-radius: var(--radius);
        }

        .user-details {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .user-email {
          font-size: 0.9375rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
        }

        .user-role {
          font-size: 0.8125rem;
          color: rgba(255, 215, 100, 0.7);
          text-transform: capitalize;
          font-weight: 500;
        }

        .btn-logout {
          padding: 0.75rem;
          background: rgba(30, 30, 30, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: var(--radius);
          cursor: pointer;
          color: rgba(255, 255, 255, 0.7);
          transition: all var(--transition);
          display: flex;
          align-items: center;
          backdrop-filter: blur(8px);
        }

        .btn-logout:hover {
          background: rgba(220, 38, 38, 0.9);
          border-color: rgba(220, 38, 38, 0.5);
          color: white;
          transform: rotate(90deg) scale(1.1);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
        }

        .main-content {
          flex: 1;
          padding: 2.5rem 0;
          min-height: calc(100vh - 90px);
          position: relative;
          z-index: 1;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @media (max-width: 1024px) {
          .nav-links {
            gap: 0.375rem;
          }

          .nav-link {
            padding: 0.625rem 1rem;
          }

          .user-email {
            font-size: 0.875rem;
          }
        }

        @media (max-width: 768px) {
          .nav-content {
            flex-wrap: wrap;
            gap: 1rem;
          }

          .nav-brand {
            font-size: 1.375rem;
          }

          .brand-icon {
            font-size: 2rem;
          }

          .nav-links {
            order: 3;
            width: 100%;
            justify-content: space-around;
            gap: 0.25rem;
          }

          .nav-link {
            flex: 1;
            justify-content: center;
            padding: 0.75rem 0.5rem;
            font-size: 0.875rem;
          }

          .nav-link span {
            display: none;
          }

          .nav-link svg {
            margin: 0;
          }

          .nav-user {
            margin-left: auto;
          }

          .user-info {
            padding: 0.5rem 0.875rem;
          }

          .user-details {
            display: none;
          }

          .user-icon {
            padding: 0.375rem;
          }

          .main-content {
            padding: 1.5rem 0;
          }
        }
      `}</style>
    </div>
  )
}

export default Layout
