import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { staggerContainer, staggerItem } from '../motion/AnimationKit'
import talynLogo from '../../assets/talyn-logo.png'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { to: '/home', label: 'Home' },
    { to: '/about-us', label: 'About Us' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#', label: 'Resources' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 dark:bg-background-dark/90 backdrop-blur-md shadow-sm'
          : 'bg-white dark:bg-background-dark'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18">
          {/* Logo */}
          <Link to="/home" className="flex-shrink-0 flex items-center">
            <motion.img
              src={talynLogo}
              alt="Talyn"
              className="w-auto"
              animate={{ height: scrolled ? 40 : 48 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Component = link.to ? Link : 'a'
              const props = link.to ? { to: link.to } : { href: link.href }
              const active = link.to && isActive(link.to)
              return (
                <Component
                  key={link.label}
                  {...props}
                  className={`relative px-4 py-2 text-sm font-medium transition-colors duration-200 rounded-lg ${
                    active
                      ? 'text-primary'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  {link.label}
                  {active && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full"
                    />
                  )}
                </Component>
              )
            })}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login/employer"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium text-sm transition-colors px-3 py-2"
            >
              Log In
            </Link>
            <button className="text-primary border border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-1.5">
              Request Demo
              <span className="material-icons-outlined text-sm">arrow_forward</span>
            </button>
            <motion.div whileTap={{ scale: 0.96 }}>
              <Link
                to="/signup/employer"
                className="block bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
              >
                Sign Up
              </Link>
            </motion.div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 dark:text-gray-300 hover:text-primary focus:outline-none p-1"
            >
              <span className="material-icons-outlined text-2xl">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-background-dark"
          >
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="px-4 py-4 space-y-1"
            >
              {navLinks.map((link) => {
                const Component = link.to ? Link : 'a'
                const props = link.to
                  ? { to: link.to, onClick: () => setMobileMenuOpen(false) }
                  : { href: link.href }
                return (
                  <motion.div key={link.label} variants={staggerItem}>
                    <Component
                      {...props}
                      className="block text-gray-600 dark:text-gray-300 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800/50 font-medium py-2.5 px-3 rounded-lg transition"
                    >
                      {link.label}
                    </Component>
                  </motion.div>
                )
              })}

              <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
                <Link
                  to="/login/employer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center text-gray-700 dark:text-white font-medium hover:text-primary transition py-2.5 rounded-lg"
                >
                  Log In
                </Link>
                <Link
                  to="/signup/employer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-medium transition shadow-md shadow-primary/20"
                >
                  Sign Up
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
