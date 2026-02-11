import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="material-icons-outlined text-2xl">public</span>
              <span className="font-bold text-2xl">Talyn</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Talyn simplifies hiring in Nepal with our all-in-one platform for compliance, payroll, and team management. Expand your team in Nepal without the complexity.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition text-gray-400 hover:text-white"
              >
                <span className="material-icons-outlined text-sm">flutter_dash</span>
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition text-gray-400 hover:text-white"
              >
                <span className="material-icons-outlined text-sm">work</span>
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition text-gray-400 hover:text-white"
              >
                <span className="material-icons-outlined text-sm">facebook</span>
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition text-gray-400 hover:text-white"
              >
                <span className="material-icons-outlined text-sm">camera_alt</span>
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-bold mb-6">Product</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition">Global Hiring</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">Payroll</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">Compliance</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">Project Management</a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-bold mb-6">Resources</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition">Blog</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">Help Center</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">Guides</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">Webinars</a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-bold mb-6">Subscribe to our newsletter</h4>
            <form className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Your email address"
                className="bg-gray-800 border-none text-white text-sm rounded px-4 py-3 focus:ring-2 focus:ring-primary w-full"
              />
              <button
                type="submit"
                className="bg-primary hover:bg-blue-600 text-white font-medium py-2 rounded transition"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Talyn. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition">Privacy Policy</a>
            <a href="#" className="hover:text-white transition">Terms of Service</a>
            <a href="#" className="hover:text-white transition">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
