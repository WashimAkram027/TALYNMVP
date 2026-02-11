import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function AuthNavbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    navigate('/login-page')
  }

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <Link to="/dashboard" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
        Talyn
      </Link>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span>{user?.email || 'User'}</span>
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: '#ef4444',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: 'none'
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  )
}
