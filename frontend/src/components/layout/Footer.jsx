import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { staggerContainer, staggerItem } from '../motion/AnimationKit'
import talynLogo from '../../assets/talyn-logo.png'

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-white pt-16 pb-8 relative overflow-hidden">
      {/* Animated background accent */}
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [0, 3, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-14"
        >
          {/* Brand */}
          <motion.div variants={staggerItem}>
            <div className="flex items-center mb-6">
              <img src={talynLogo} alt="Talyn" className="h-12 w-auto brightness-0 invert" />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Talyn simplifies hiring in Nepal with our all-in-one platform for compliance, payroll, and team management. Expand your team without the complexity.
            </p>
            <div className="flex gap-3">
              {[
                { icon: 'flutter_dash', label: 'Twitter' },
                { icon: 'work', label: 'LinkedIn' },
                { icon: 'facebook', label: 'Facebook' },
                { icon: 'camera_alt', label: 'Instagram' },
              ].map((social) => (
                <motion.a
                  key={social.label}
                  href="#"
                  aria-label={social.label}
                  whileHover={{ y: -3, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  className="w-9 h-9 rounded-lg bg-gray-800/80 flex items-center justify-center hover:bg-primary transition-colors duration-200 text-gray-400 hover:text-white"
                >
                  <span className="material-icons-outlined text-sm">{social.icon}</span>
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Product */}
          <motion.div variants={staggerItem}>
            <h4 className="font-bold text-sm mb-5 text-white">Product</h4>
            <ul className="space-y-3">
              {['Global Hiring', 'Payroll', 'Compliance', 'Project Management'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">{item}</a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Resources */}
          <motion.div variants={staggerItem}>
            <h4 className="font-bold text-sm mb-5 text-white">Resources</h4>
            <ul className="space-y-3">
              {['Blog', 'Help Center', 'Guides', 'Webinars'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">{item}</a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Newsletter */}
          <motion.div variants={staggerItem}>
            <h4 className="font-bold text-sm mb-5 text-white">Stay up to date</h4>
            <p className="text-sm text-gray-400 mb-4">Get the latest updates on hiring in Nepal.</p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 bg-gray-800/80 border border-gray-700/50 text-white text-sm rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none placeholder-gray-500 transition-all"
              />
              <motion.button
                type="submit"
                whileTap={{ scale: 0.95 }}
                className="bg-primary hover:bg-primary-hover text-white font-medium px-4 py-2.5 rounded-lg transition-colors duration-200 text-sm flex-shrink-0"
              >
                Join
              </motion.button>
            </form>
          </motion.div>
        </motion.div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800/80 pt-7 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Talyn. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors duration-200">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors duration-200">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors duration-200">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
