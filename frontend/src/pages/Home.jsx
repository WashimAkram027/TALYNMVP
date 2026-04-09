import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { FadeIn, staggerContainer, staggerItem } from '../components/motion/AnimationKit'
import talynLogo from '../assets/talyn-logo.png'

const features = [
  {
    icon: 'desktop_mac',
    title: 'Talent Hire',
    description: 'Hire talent in Nepal without establishing a local entity. We handle all the legal complexities specific to Nepal.',
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    icon: 'payments',
    title: 'Payroll Management',
    description: 'Pay your Nepal team in NPR or other currencies with competitive exchange rates and transparent fees.',
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    icon: 'verified_user',
    title: 'Compliance',
    description: "Stay compliant with Nepal's labor laws, tax regulations, and benefits requirements including the Labor Act 2017.",
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
]

const steps = [
  { icon: 'search', title: 'Find Talent', description: 'Browse our Nepal talent pool or bring your own candidates. We help you find the perfect match.', accent: 'bg-primary' },
  { icon: 'description', title: 'Create Contract', description: "Generate compliant contracts tailored to Nepal's labor laws. Our templates are legally vetted.", accent: 'bg-secondary' },
  { icon: 'shield', title: 'Compliance Review', description: "Our experts review all contracts and processes to ensure full compliance with Nepal's employment laws.", accent: 'bg-amber-500' },
  { icon: 'school', title: 'On-boarding', description: 'Comprehensive onboarding and training programs to get your Nepal team up to speed quickly.', accent: 'bg-emerald-500' },
]

const plans = [
  {
    name: 'Starter',
    price: '$199',
    period: '/ month/contractor',
    description: 'Perfect for small teams just getting started with global hiring.',
    features: ['Independent Contractor Model', 'Basic compliance support', 'Standard contract templates'],
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$429',
    period: '/ month/employee',
    description: 'Ideal for growing businesses with expanding global teams.',
    features: ['Employer of Record (EOR) Model', 'Advanced compliance support', 'Contract Generation', 'Talent Hire & Onboarding'],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'Pricing',
    description: 'Tailored solutions for large organizations with complex workforce needs.',
    features: ['Unlimited contractors or EOR', 'Dedicated SMEs for training', 'Professional Plan Features', 'Dedicated account manager'],
    highlighted: false,
  },
]

export default function Home() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroImageY = useTransform(scrollYProgress, [0, 1], [0, 80])
  const heroOverlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0, 0.3])

  return (
    <>
      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 overflow-hidden">
        {/* Background geometric shapes - subtle floating */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ rotate: [12, 15, 12], y: [0, -8, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-400/5 rounded-3xl"
          />
          <motion.div
            animate={{ rotate: [12, 9, 12], y: [0, 6, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-12 -right-12 w-72 h-72 bg-primary/5 rounded-3xl"
          />
          <motion.div
            animate={{ rotate: [-6, -9, -6], y: [0, -6, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/5 rounded-3xl"
          />
          <motion.div
            style={{ opacity: heroOverlayOpacity }}
            className="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-background-dark"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-full px-4 py-1.5 mb-8"
              >
                <span className="material-icons-outlined text-emerald-600 dark:text-emerald-400 text-sm">verified</span>
                <span className="text-emerald-700 dark:text-emerald-300 font-medium text-sm">Trusted by companies in the USA</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="font-display text-4xl lg:text-[3.5rem] xl:text-6xl tracking-tight text-gray-900 dark:text-white mb-6 leading-[1.1]"
              >
                Hire Talent, Pay & Manage Remote Teams in{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 text-primary">Nepal</span>
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, delay: 0.7, ease: 'easeOut' }}
                    className="absolute bottom-1 left-0 right-0 h-3 bg-cyan-300/30 dark:bg-cyan-400/20 -z-0 origin-left rounded-sm"
                  />
                  {/* Pulsing glow beneath underline */}
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.4, 0.2] }}
                    transition={{ duration: 2, delay: 1.2, repeat: Infinity, repeatType: 'reverse' }}
                    className="absolute bottom-0 left-0 right-0 h-4 bg-cyan-400/20 blur-sm -z-10 rounded"
                  />
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-lg leading-relaxed"
              >
                Simplify hiring with our all-in-one platform for compliance, payroll, human resources, training, onboarding and team management in Nepal.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/signup/employer"
                    className="group bg-primary hover:bg-primary-hover text-white px-7 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 text-center flex items-center justify-center gap-2"
                  >
                    Hire in Nepal
                    <span className="material-icons-outlined text-lg transition-transform group-hover:translate-x-0.5">arrow_forward</span>
                  </Link>
                </motion.div>
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/signup/employee"
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750 px-7 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 text-center block"
                  >
                    Work in Nepal
                  </Link>
                </motion.div>
              </motion.div>
            </div>

            {/* Hero Image */}
            <div className="order-1 lg:order-2 relative mx-auto w-full max-w-lg lg:max-w-full">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ y: heroImageY }}
                className="relative"
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-gray-900/10 dark:shadow-black/30">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBL7DXl3_4jBYUkLfnKG_fBrwF7Wq0Z4RLk1UWIbzXJNsvEOGUjyIq9ZMXt-giEkILmTffzG70X2uzT5VOVGpJIHQ6al32MKDxwDDeJMLgWTvBz_DwopCruJyEiy6eyL7cbyilruASaVeMt0ll7Nr242FasvPLyL8U7bT3hZdM95cqYOTU3LoS5IxhAXJaphNQLWzORY8N_g9SJSyUdGdriUTEDeZVNtKew23Bojg4tRe246f2NUDoQB90Cqp4QSfoMFOMhGZSx-CQ"
                    alt="Colleagues high-fiving in office"
                    className="w-full h-auto object-cover aspect-[4/3]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                </div>

                {/* Floating badge - Compliance (with continuous bob) */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0, y: [0, -4, 0] }}
                  transition={{
                    opacity: { duration: 0.5, delay: 0.8 },
                    x: { duration: 0.5, delay: 0.8 },
                    y: { duration: 3, delay: 1.3, repeat: Infinity, ease: 'easeInOut' },
                  }}
                  className="absolute top-5 right-5 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-sm p-3 rounded-xl shadow-lg flex items-center gap-3 border border-gray-100/50 dark:border-gray-700/50 max-w-[260px]"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                    <span className="material-icons-outlined text-emerald-600 dark:text-emerald-400 text-lg">check_circle</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-tight">Compliant with Nepal's Labor Act 2017</p>
                </motion.div>

                {/* Floating badge - Payments (with continuous bob, offset timing) */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0, y: [0, 4, 0] }}
                  transition={{
                    opacity: { duration: 0.5, delay: 0.95 },
                    x: { duration: 0.5, delay: 0.95 },
                    y: { duration: 3.5, delay: 1.5, repeat: Infinity, ease: 'easeInOut' },
                  }}
                  className="absolute bottom-5 left-5 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-sm p-3 rounded-xl shadow-lg flex items-center gap-3 border border-gray-100/50 dark:border-gray-700/50"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <span className="material-icons-outlined text-primary text-lg">credit_card</span>
                  </div>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Fast payments</p>
                </motion.div>
              </motion.div>

              {/* Background glow */}
              <div className="absolute -z-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-cyan-200/20 dark:bg-cyan-900/10 blur-3xl rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By / Social Proof Strip */}
      <section className="py-10 border-y border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <p className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-6">Serving industries across the board</p>
          </FadeIn>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="flex flex-wrap justify-center gap-x-10 gap-y-4"
          >
            {['MEP Engineering', 'Energy Consulting', 'BIM Services', 'Architecture', 'IT Consulting', 'Accounting'].map((industry) => (
              <motion.span
                key={industry}
                variants={staggerItem}
                className="text-sm font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-default"
              >
                {industry}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-background-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-16">
            <span className="text-primary font-semibold tracking-wider uppercase text-xs">Powerful Features</span>
            <h2 className="mt-3 font-display text-3xl md:text-4xl lg:text-5xl text-gray-900 dark:text-white">
              Everything You Need to Manage<br className="hidden md:block" /> Teams in Nepal
            </h2>
            <p className="mt-5 text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-base leading-relaxed">
              Our comprehensive platform simplifies the complexities of hiring, payroll management, compliance, and team coordination.
            </p>
          </FadeIn>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={staggerItem}>
                <motion.div
                  whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                  className="relative bg-white dark:bg-surface-dark p-8 rounded-2xl border border-gray-100 dark:border-gray-800 group cursor-default overflow-hidden h-full"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />
                  <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-5`}>
                    <span className={`material-icons-outlined text-2xl bg-gradient-to-br ${feature.color} bg-clip-text text-transparent`}>
                      {feature.icon}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gray-50 dark:bg-surface-dark relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/5 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn className="text-center mb-16">
            <span className="text-primary font-semibold tracking-wider uppercase text-xs">Simple Process</span>
            <h2 className="mt-3 font-display text-3xl md:text-4xl lg:text-5xl text-gray-900 dark:text-white">How Talyn Works</h2>
            <p className="mt-5 text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-base leading-relaxed">
              Get started with hiring in Nepal in just four simple steps.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Animated connecting line (desktop) */}
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block absolute top-14 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 origin-left"
            />

            {steps.map((step, i) => (
              <FadeIn key={step.title} delay={i * 0.12}>
                <div className="flex flex-col items-center text-center relative z-10">
                  <div className={`w-10 h-10 rounded-full ${step.accent} text-white font-bold flex items-center justify-center mb-5 text-sm shadow-lg`}>
                    {i + 1}
                  </div>
                  <div className="w-16 h-16 bg-white dark:bg-background-dark rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-gray-100 dark:border-gray-700">
                    <span className="material-icons-outlined text-gray-700 dark:text-gray-300 text-3xl">{step.icon}</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.3} className="flex justify-center gap-3 mt-16">
            <motion.div whileTap={{ scale: 0.97 }}>
              <Link
                to="/signup/employer"
                className="group bg-primary hover:bg-primary-hover text-white px-7 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                Get Started
                <span className="material-icons-outlined text-sm transition-transform group-hover:translate-x-0.5">arrow_forward</span>
              </Link>
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white hover:border-primary/30 px-7 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm"
            >
              Request Demo
              <span className="material-icons-outlined text-sm">calendar_today</span>
            </motion.button>
          </FadeIn>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white dark:bg-background-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-16">
            <span className="text-primary font-semibold tracking-wider uppercase text-xs">Pricing Plans</span>
            <h2 className="mt-3 font-display text-3xl md:text-4xl lg:text-5xl text-gray-900 dark:text-white">Simple, Transparent Pricing</h2>
            <p className="mt-5 text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-base leading-relaxed">
              Choose the plan that fits your business needs. All plans include our core features.
            </p>
          </FadeIn>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start max-w-5xl mx-auto"
          >
            {plans.map((plan) => (
              <motion.div key={plan.name} variants={staggerItem}>
                <motion.div
                  whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                  className={`relative p-8 rounded-2xl transition-shadow duration-300 ${
                    plan.highlighted
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-2xl shadow-gray-900/20 dark:shadow-white/10 md:-translate-y-3'
                      : 'bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-full shadow-md">
                      Recommended
                    </div>
                  )}

                  <h3 className={`text-lg font-bold ${plan.highlighted ? '' : 'text-gray-900 dark:text-white'}`}>{plan.name}</h3>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className={`font-display text-4xl ${plan.highlighted ? '' : 'text-gray-900 dark:text-white'}`}>{plan.price}</span>
                    {plan.price !== 'Custom' && (
                      <span className={`text-sm ${plan.highlighted ? 'text-gray-400 dark:text-gray-500' : 'text-gray-400'}`}>{plan.period}</span>
                    )}
                  </div>
                  {plan.price === 'Custom' && (
                    <span className={`text-sm ${plan.highlighted ? 'text-gray-400 dark:text-gray-500' : 'text-gray-400'}`}>{plan.period}</span>
                  )}

                  <p className={`mt-4 text-sm leading-relaxed ${plan.highlighted ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {plan.description}
                  </p>

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <span className={`material-icons-outlined text-sm mt-0.5 ${plan.highlighted ? 'text-emerald-400' : 'text-emerald-500'}`}>check</span>
                        <span className={`text-sm ${plan.highlighted ? 'text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-gray-300'}`}>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className={`mt-8 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      plan.highlighted
                        ? 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/25'
                        : 'border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-white hover:border-primary hover:text-primary dark:hover:text-primary'
                    }`}
                  >
                    {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                  </motion.button>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-primary/80" />
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ rotate: [12, 16, 12], y: [0, -10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-20 -right-20 w-80 h-80 bg-cyan-400/10 rounded-3xl"
          />
          <motion.div
            animate={{ rotate: [-12, -8, -12], y: [0, 8, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/15 rounded-3xl"
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-5xl text-white mb-6">
              Ready to build your team in Nepal?
            </h2>
            <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
              Join companies who trust Talyn to hire, pay, and manage their remote teams with confidence.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.div whileTap={{ scale: 0.97 }}>
                <Link
                  to="/signup/employer"
                  className="group bg-white text-gray-900 hover:bg-gray-100 px-8 py-3.5 rounded-xl font-semibold transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
                >
                  Get Started Free
                  <span className="material-icons-outlined text-sm transition-transform group-hover:translate-x-0.5">arrow_forward</span>
                </Link>
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="border border-white/25 text-white hover:bg-white/10 px-8 py-3.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              >
                Schedule a Demo
                <span className="material-icons-outlined text-sm">calendar_today</span>
              </motion.button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Mini Footer Bar */}
      <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-background-dark py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img src={talynLogo} alt="Talyn" className="h-9 w-auto" />
            <nav className="hidden md:flex ml-8 gap-6">
              <Link to="/home" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">Home</Link>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">Resources</a>
              <a href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">Pricing</a>
              <Link to="/about-us" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white font-medium transition-colors">About Us</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login/employer"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 transition-colors"
            >
              Log In
            </Link>
            <Link
              to="/signup/employer"
              className="text-sm font-medium text-white bg-primary hover:bg-primary-hover px-4 py-2 rounded-lg transition-all shadow-sm"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
