import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-full px-4 py-1.5 mb-8">
                <span className="material-icons-outlined text-primary text-sm">verified</span>
                <span className="text-primary font-semibold text-sm">Trusted by companies in the USA</span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6 leading-[1.15]">
                Hire Talent, Pay & Manage Remote Teams in <span className="text-primary">Nepal</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-lg leading-relaxed">
                Simplify hiring with our all-in-one platform for compliance, payroll, human resources, training, onboarding and team management in Nepal.
                <br /><br />
                Expand your team in Nepal without the complexity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/signup/employer"
                  className="bg-primary hover:bg-blue-700 text-white px-8 py-3.5 rounded-lg font-semibold text-lg transition shadow-lg shadow-blue-500/20 text-center"
                >
                  Hire in Nepal
                </Link>
                <Link
                  to="/signup/employer"
                  className="bg-white dark:bg-transparent border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 px-8 py-3.5 rounded-lg font-semibold text-lg transition text-center"
                >
                  Work in Nepal
                </Link>
              </div>
            </div>
            <div className="order-1 lg:order-2 relative mx-auto w-full max-w-lg lg:max-w-full">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-gray-700">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBL7DXl3_4jBYUkLfnKG_fBrwF7Wq0Z4RLk1UWIbzXJNsvEOGUjyIq9ZMXt-giEkILmTffzG70X2uzT5VOVGpJIHQ6al32MKDxwDDeJMLgWTvBz_DwopCruJyEiy6eyL7cbyilruASaVeMt0ll7Nr242FasvPLyL8U7bT3hZdM95cqYOTU3LoS5IxhAXJaphNQLWzORY8N_g9SJSyUdGdriUTEDeZVNtKew23Bojg4tRe246f2NUDoQB90Cqp4QSfoMFOMhGZSx-CQ"
                  alt="Colleagues high-fiving in office"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
                <div className="absolute top-6 right-6 bg-white dark:bg-surface-dark p-3 rounded-lg shadow-xl flex items-center gap-3 border border-gray-100 dark:border-gray-700 max-w-[280px]">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                    <span className="material-icons-outlined text-green-600 dark:text-green-400 text-lg">check_circle</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Compliant with Nepal's Labor Act 2017 and Labor Rules 2018</p>
                </div>
                <div className="absolute bottom-6 left-6 bg-white dark:bg-surface-dark p-3 rounded-lg shadow-xl flex items-center gap-3 border border-gray-100 dark:border-gray-700">
                  <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <span className="material-icons-outlined text-primary text-lg">credit_card</span>
                  </div>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Fast payments</p>
                </div>
              </div>
              <div className="absolute -z-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-100/50 dark:bg-blue-900/20 blur-3xl rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-surface-light dark:bg-surface-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-primary font-bold tracking-wider uppercase text-sm">Powerful Features</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Everything You Need to Manage Teams in Nepal</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Our comprehensive platform simplifies the complexities of hiring in Nepal, payroll management, compliance, and team coordination all in one place.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-background-dark p-8 rounded-2xl shadow-sm hover:shadow-md transition duration-300 border border-gray-100 dark:border-gray-800 text-center group">
              <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition duration-300">
                <span className="material-icons-outlined text-orange-500 text-3xl">desktop_mac</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Talent Hire</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                Hire talent in Nepal without establishing a local entity. We handle all the legal complexities specific to Nepal.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="bg-white dark:bg-background-dark p-8 rounded-2xl shadow-sm hover:shadow-md transition duration-300 border border-gray-100 dark:border-gray-800 text-center group">
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition duration-300">
                <span className="material-icons-outlined text-indigo-500 text-3xl">payments</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Payroll Management</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                Pay your Nepal team in NPR or other currencies with competitive exchange rates and transparent fees.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="bg-white dark:bg-background-dark p-8 rounded-2xl shadow-sm hover:shadow-md transition duration-300 border border-gray-100 dark:border-gray-800 text-center group">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition duration-300">
                <span className="material-icons-outlined text-green-500 text-3xl">verified_user</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Compliance</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                Stay compliant with Nepal's labor laws, tax regulations, and benefits requirements including the Labor Act 2017.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white dark:bg-background-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-primary font-bold tracking-wider uppercase text-sm">Simple Process</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">How Talyn Nepal Works</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Get started with hiring in Nepal in just four simple steps. Our platform streamlines the entire process from finding talent to managing your Nepal team.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-primary text-white font-bold flex items-center justify-center mb-4">1</div>
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-icons-outlined text-primary text-4xl">search</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Find Talent</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Browse our Nepal talent pool or bring your own candidates. We'll help you find the perfect match.</p>
            </div>
            {/* Step 2 */}
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-primary text-white font-bold flex items-center justify-center mb-4">2</div>
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-icons-outlined text-primary text-4xl">description</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Create Contract</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Generate compliant contracts tailored to Nepal's labor laws. Our templates are legally vetted.</p>
            </div>
            {/* Step 3 */}
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-primary text-white font-bold flex items-center justify-center mb-4">3</div>
              <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-icons-outlined text-orange-500 text-4xl">shield</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Compliance Reviews</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Our experts review all contracts and processes to ensure full compliance with Nepal's employment laws.</p>
            </div>
            {/* Step 4 */}
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-primary text-white font-bold flex items-center justify-center mb-4">4</div>
              <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-icons-outlined text-green-500 text-4xl">school</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">On-boarding</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Comprehensive onboarding and training programs to get your Nepal team up to speed quickly.</p>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-16">
            <Link
              to="/signup/employer"
              className="bg-primary hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition shadow-md flex items-center gap-2"
            >
              Get Started <span className="material-icons-outlined text-sm">arrow_forward</span>
            </Link>
            <button className="bg-secondary hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold transition shadow-md flex items-center gap-2">
              Request Demo <span className="material-icons-outlined text-sm">calendar_today</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-surface-light dark:bg-surface-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-primary font-bold tracking-wider uppercase text-sm">Pricing Plans</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Choose the plan that fits your business needs. All plans include our core features with different levels of support and capabilities.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {/* Starter Plan */}
            <div className="bg-white dark:bg-background-dark p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Starter</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-5xl font-extrabold text-gray-900 dark:text-white">$199</span>
                <span className="ml-2 text-gray-500 dark:text-gray-400 text-sm">/ month/contractor</span>
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Perfect for small teams just getting started with global hiring.</p>
              <ul className="mt-6 space-y-4">
                <li className="flex items-start">
                  <span className="material-icons-outlined text-green-500 text-sm mt-1 mr-2">check</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Independent Contractor Model</span>
                </li>
                <li className="flex items-start">
                  <span className="material-icons-outlined text-green-500 text-sm mt-1 mr-2">check</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Basic compliance support</span>
                </li>
                <li className="flex items-start">
                  <span className="material-icons-outlined text-green-500 text-sm mt-1 mr-2">check</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Standard contract templates</span>
                </li>
              </ul>
              <button className="mt-8 w-full border border-primary text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold py-2.5 rounded-lg transition">
                Get Started
              </button>
            </div>

            {/* Professional Plan */}
            <div className="bg-white dark:bg-background-dark p-8 rounded-2xl shadow-xl border-2 border-primary relative transform md:-translate-y-2">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-bold uppercase tracking-wide py-1 px-3 rounded-full">
                Recommended
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Professional</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-5xl font-extrabold text-gray-900 dark:text-white">$429</span>
                <span className="ml-2 text-gray-500 dark:text-gray-400 text-sm">/ month/employee</span>
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Ideal for growing businesses with expanding global teams.</p>
              <ul className="mt-6 space-y-4">
                <li className="flex items-start">
                  <span className="material-icons-outlined text-green-500 text-sm mt-1 mr-2">check</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Employer of Record (EOR) Model</span>
                </li>
                <li className="flex items-start">
                  <span className="material-icons-outlined text-green-500 text-sm mt-1 mr-2">check</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Advanced compliance support</span>
                </li>
                <li className="flex items-start">
                  <span className="material-icons-outlined text-green-500 text-sm mt-1 mr-2">check</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Contract Generation</span>
                </li>
                <li className="flex items-start">
                  <span className="material-icons-outlined text-green-500 text-sm mt-1 mr-2">check</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Talent Hire & Onboarding</span>
                </li>
              </ul>
              <button className="mt-8 w-full bg-primary hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition shadow-md">
                Get Started
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white dark:bg-background-dark p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Enterprise</h3>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-white leading-tight">Custom<br />Pricing</span>
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Tailored solutions for large organizations with complex workforce needs.</p>
              <ul className="mt-6 space-y-4">
                <li className="flex items-start">
                  <span className="material-icons-outlined text-green-500 text-sm mt-1 mr-2">check</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Unlimited contractors or EOR</span>
                </li>
                <li className="flex items-start">
                  <span className="material-icons-outlined text-green-500 text-sm mt-1 mr-2">check</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Dedicated SMEs for training</span>
                </li>
                <li className="flex items-start">
                  <span className="material-icons-outlined text-green-500 text-sm mt-1 mr-2">check</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Professional Plan Features</span>
                </li>
                <li className="flex items-start">
                  <span className="material-icons-outlined text-green-500 text-sm mt-1 mr-2">check</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Dedicated account manager</span>
                </li>
              </ul>
              <button className="mt-8 w-full border border-primary text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold py-2.5 rounded-lg transition">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Bar */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-tight">Talyn</span>
            <nav className="hidden md:flex ml-8 space-x-6">
              <Link to="/home" className="text-sm text-primary font-medium">Home</Link>
              <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary">Resources</a>
              <a href="#pricing" className="text-sm text-primary hover:text-primary">Pricing</a>
              <Link to="/about-us" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary">About Us</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login/employer"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Log In
            </Link>
            <button className="text-sm font-medium text-white bg-primary px-4 py-2 rounded hover:bg-blue-700">
              Request Demo
            </button>
            <Link
              to="/signup/employer"
              className="text-sm font-medium text-white bg-primary px-4 py-2 rounded hover:bg-blue-700"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
