import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border-light dark:border-border-dark bg-white/95 dark:bg-background-dark/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white">
              <span className="material-icons-outlined">public</span>
            </div>
            <span className="font-bold text-2xl tracking-tight">Talyn</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8 items-center">
            <Link to="/home" className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary font-medium transition">
              Home
            </Link>
            <Link to="/about-us" className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary font-medium transition">
              About Us
            </Link>
            <a href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary font-medium transition">
              Pricing
            </a>
            <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary font-medium transition">
              Resources
            </a>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Link
              to="/login/employer"
              className="text-gray-700 dark:text-white font-medium hover:text-primary transition px-3 py-2"
            >
              Log In
            </Link>
            <button
              className="bg-blue-50 dark:bg-slate-800 text-primary border border-primary/20 hover:bg-primary hover:text-white px-4 py-2.5 rounded-lg font-medium transition flex items-center gap-1"
            >
              Request Demo
              <span className="material-icons-outlined text-sm">calendar_today</span>
            </button>
            <Link
              to="/signup/employer"
              className="bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-sm shadow-blue-500/30"
            >
              Sign Up
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 dark:text-gray-300 hover:text-primary focus:outline-none"
            >
              <span className="material-icons-outlined text-3xl">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border-light dark:border-border-dark bg-white dark:bg-background-dark">
          <div className="px-4 py-4 space-y-3">
            <Link
              to="/home"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-600 dark:text-gray-300 hover:text-primary font-medium py-2 transition"
            >
              Home
            </Link>
            <Link
              to="/about-us"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-600 dark:text-gray-300 hover:text-primary font-medium py-2 transition"
            >
              About Us
            </Link>
            <a href="#pricing" className="block text-gray-600 dark:text-gray-300 hover:text-primary font-medium py-2 transition">
              Pricing
            </a>
            <a href="#" className="block text-gray-600 dark:text-gray-300 hover:text-primary font-medium py-2 transition">
              Resources
            </a>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
              <Link
                to="/login/employer"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center text-gray-700 dark:text-white font-medium hover:text-primary transition py-2"
              >
                Log In
              </Link>
              <Link
                to="/signup/employer"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
