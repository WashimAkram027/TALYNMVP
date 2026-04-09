import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Link } from 'react-router-dom'
import { FadeIn, staggerContainer, staggerItem } from '../components/motion/AnimationKit'

const industries = [
  { id: 'mep', name: 'MEP Engineering', icon: 'settings' },
  { id: 'energy', name: 'Energy Consulting', icon: 'bolt' },
  { id: 'bim', name: 'Building Information Modeling', icon: 'layers' },
  { id: 'arch', name: 'Architectural Designs', icon: 'architecture' },
  { id: 'product', name: 'Product Design', icon: 'view_in_ar' },
  { id: 'analysis', name: 'Engineering Analysis', icon: 'straighten' },
  { id: 'accounting', name: 'Accounting', icon: 'calculate' },
  { id: 'construction', name: 'Construction Management', icon: 'construction' },
  { id: 'legal', name: 'Legal Services', icon: 'gavel' },
  { id: 'healthcare', name: 'Healthcare Services', icon: 'favorite' },
  { id: 'it', name: 'IT Consulting', icon: 'computer' },
]

const industryDescriptions = {
  mep: 'Mechanical, Electrical, and Plumbing engineering services for commercial and residential buildings.',
  energy: 'Energy efficiency consulting and sustainable solutions for modern businesses.',
  bim: 'Building Information Modeling services for construction and architectural projects.',
  arch: 'Creative architectural design solutions for residential and commercial spaces.',
  product: '3D product design and prototyping services for innovative products.',
  analysis: 'Structural and mechanical engineering analysis for complex projects.',
  accounting: 'Financial accounting and bookkeeping services for businesses of all sizes.',
  construction: 'Project management and oversight for construction projects.',
  legal: 'Legal documentation and compliance services.',
  healthcare: 'Healthcare administration and support services.',
  it: 'IT infrastructure consulting and software development services.',
}

const values = [
  { icon: 'visibility', title: 'Transparency', description: 'Clear communication and honest execution in everything we do. We believe trust is built through transparency.', color: 'bg-blue-50 dark:bg-blue-900/30', iconColor: 'text-primary' },
  { icon: 'shield', title: 'Connection', description: "Developing healthy professional relationships with talent teams & clients & fortify each other's growth.", color: 'bg-emerald-50 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  { icon: 'build', title: 'Craft', description: 'Building teams the right way, not the easy way. Quality and attention to detail define our approach.', color: 'bg-amber-50 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  { icon: 'track_changes', title: 'Impact', description: 'Focusing on meaningful, measurable results that create lasting value for our clients and their users.', color: 'bg-violet-50 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400' },
]

const howWeWork = [
  { title: 'Talyn Platform', description: 'You access one platform to hire, train, pay and manage.', icon: 'dashboard', color: 'bg-primary/10 dark:bg-primary/20', iconColor: 'text-primary' },
  { title: 'Sourcing Talent', description: 'We connect you to top candidates in engineering & IT.', icon: 'groups', color: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600 dark:text-amber-400' },
  { title: 'Compliant Hiring', description: 'We handle employment contracts and compliance.', icon: 'description', color: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  { title: 'Ongoing Dev', description: 'Role-specific PM tools to drive results.', icon: 'trending_up', color: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' },
]

export default function AboutUs() {
  const [selectedIndustry, setSelectedIndustry] = useState('mep')

  return (
    <div className="bg-background-light dark:bg-background-dark">
      {/* Hero Banner */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ rotate: [12, 15, 12], y: [0, -6, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-20 -left-20 w-80 h-80 bg-cyan-400/5 rounded-3xl"
          />
          <motion.div
            animate={{ rotate: [-6, -9, -6], y: [0, 5, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-0 right-0 w-64 h-64 bg-primary/5 rounded-3xl"
          />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="text-primary font-semibold tracking-wider uppercase text-xs">About Talyn</span>
            <h1 className="mt-3 font-display text-4xl md:text-5xl lg:text-6xl text-gray-900 dark:text-white leading-[1.1]">
              Building smarter teams for a{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-primary">connected world</span>
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
                  className="absolute bottom-1 left-0 right-0 h-3 bg-cyan-300/30 dark:bg-cyan-400/20 -z-0 origin-left rounded-sm"
                />
              </span>
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed"
            >
              We help U.S. businesses hire, train, pay, and manage skilled professionals in Nepal through one integrated platform.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Industries We Serve Section */}
      <section className="py-20 bg-white dark:bg-surface-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-12">
            <span className="text-primary font-semibold tracking-wider uppercase text-xs">Expertise</span>
            <h2 className="mt-3 font-display text-3xl md:text-4xl text-gray-900 dark:text-white">Industries We Serve</h2>
            <p className="mt-4 max-w-3xl mx-auto text-gray-500 dark:text-gray-400 text-base leading-relaxed">
              From engineering and architecture to healthcare and legal services, we deliver specialized solutions across diverse industries.
            </p>
          </FadeIn>

          {/* Industry Buttons with layoutId sliding pill */}
          <FadeIn delay={0.1}>
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {industries.map((industry) => (
                <motion.button
                  key={industry.id}
                  onClick={() => setSelectedIndustry(industry.id)}
                  whileTap={{ scale: 0.98 }}
                  className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                >
                  {/* Sliding background pill */}
                  {selectedIndustry === industry.id && (
                    <motion.div
                      layoutId="industry-indicator"
                      className="absolute inset-0 bg-primary rounded-xl shadow-md shadow-primary/20"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-2 transition-colors duration-200 ${
                    selectedIndustry === industry.id
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}>
                    <span className="material-icons-outlined text-lg">{industry.icon}</span>
                    <span className="hidden sm:inline">{industry.name}</span>
                  </span>
                </motion.button>
              ))}
            </div>
          </FadeIn>

          {/* Selected Industry Description */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedIndustry}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="bg-gray-50 dark:bg-background-dark rounded-2xl p-8 max-w-2xl mx-auto border border-gray-100 dark:border-gray-800"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {industries.find(i => i.id === selectedIndustry)?.name}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                {industryDescriptions[selectedIndustry]}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24 bg-background-light dark:bg-background-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <span className="text-primary font-semibold tracking-wider uppercase text-xs">Our Mission</span>
              <h2 className="mt-3 font-display text-3xl md:text-4xl lg:text-5xl text-gray-900 dark:text-white leading-tight">
                One platform to hire, manage, and grow your Nepal team
              </h2>
              <p className="mt-6 text-gray-500 dark:text-gray-400 leading-relaxed">
                We help teams and businesses operate more efficiently through technology, design, and intelligent workflows. We help U.S. businesses hire, train, pay, and manage skilled professionals in Nepal.
              </p>
              <p className="mt-4 text-gray-500 dark:text-gray-400 leading-relaxed">
                Talyn combines compliant hiring, payroll, project management, and role-specific training -- so your remote team delivers results from day one.
              </p>
              <motion.div whileTap={{ scale: 0.97 }} className="inline-block">
                <Link
                  to="/signup/employer"
                  className="group inline-flex items-center gap-2 mt-8 bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-7 rounded-xl shadow-lg shadow-primary/20 transition-all duration-200"
                >
                  Get Started
                  <span className="material-icons-outlined text-sm transition-transform group-hover:translate-x-0.5">arrow_forward</span>
                </Link>
              </motion.div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <motion.div
                whileHover={{ scale: 1.01, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                className="relative rounded-2xl overflow-hidden shadow-2xl shadow-gray-900/10 dark:shadow-black/20 h-[400px]"
              >
                <img
                  alt="Earth at night from space showing city lights"
                  className="absolute inset-0 w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqja18L7zjFA2QXcl51hE6WC55W0KvPdaUTSs1zykwDdfOd4WfpJK_gya7AJhZpCrFAGa0tPAu1BWVoxIXelYymtVdfL8ucBDpudjCG8H_Zvljeh5_cL6-BC2LMB5WSw1r8Bk6eP3EljpuET6gD8ljttYlr4rOOkvogJ_QoWzlQ9gCIVX3uZ2HeylQ22fjX2TMqlFwofRxGP6pUxA_xdNHYXE0YEeu8JF1BuPuWJwuVe9zuybJEg-NDLJKiU6HnQ6m9ucZWqEXwJI"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </motion.div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Who We Are Section */}
      <section className="py-24 bg-white dark:bg-surface-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn className="order-2 lg:order-1">
              <span className="text-primary font-semibold tracking-wider uppercase text-xs">Our Story</span>
              <h2 className="mt-3 font-display text-3xl md:text-4xl text-gray-900 dark:text-white">Who We Are</h2>
              <p className="mt-6 text-gray-500 dark:text-gray-400 leading-relaxed">
                We are a modern, distributed organization that values clarity, ownership, and long-term thinking. Our team spans the globe, bringing together diverse perspectives and expertise to solve complex challenges.
              </p>
              <p className="mt-4 text-gray-500 dark:text-gray-400 leading-relaxed">
                We believe in the power of collaboration and the importance of building teams & systems that last. Our practical approach to problem-solving means we focus on what works, not what's trendy.
              </p>
            </FadeIn>
            <FadeIn delay={0.15} className="order-1 lg:order-2">
              <motion.div
                whileHover={{ scale: 1.01, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                className="relative rounded-2xl overflow-hidden shadow-xl h-[350px]"
              >
                <img
                  alt="Team working together on laptops"
                  className="absolute inset-0 w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDShNy_CmwDixnbW-9Mm2mhPxPAgKjARyAhBjLhIHkTd_xQy2R3P15pRJY1ycCc0czepmAhgD7NiAFZ1IPj2-OQ36T4HvmO-125U3K_Z8Youkv4i9lfN5d2_YGzEnL3Zbp5WP1Agf5gkaz54vv_zfxYkeo6pO-CXflfGhF3wLEgdtZNckMjzo7-3ZKYxpCmOxMmRIkhW23RpntpvShPo-aDJA9-Rv5Wc8dZ58HLbiNbh8FVhsDx7OkPT8xZdvDG-3bQd8JgmN4AY_M"
                />
              </motion.div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section className="py-24 bg-gray-50 dark:bg-background-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-16">
            <span className="text-primary font-semibold tracking-wider uppercase text-xs">What Drives Us</span>
            <h2 className="mt-3 font-display text-3xl md:text-4xl text-gray-900 dark:text-white">Our Values</h2>
          </FadeIn>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {values.map((value) => (
              <motion.div key={value.title} variants={staggerItem}>
                <motion.div
                  whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                  className="bg-white dark:bg-surface-dark p-7 rounded-2xl border border-gray-100 dark:border-gray-800 text-center group cursor-default h-full"
                >
                  <div className={`w-12 h-12 mx-auto ${value.color} rounded-xl flex items-center justify-center mb-5`}>
                    <span className={`material-icons-outlined text-xl ${value.iconColor}`}>{value.icon}</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{value.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{value.description}</p>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How We Work Section */}
      <section className="py-24 bg-white dark:bg-surface-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* How We Work Cards - staggered grid */}
            <FadeIn>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                className="grid grid-cols-2 gap-4"
              >
                {howWeWork.map((item) => (
                  <motion.div
                    key={item.title}
                    variants={staggerItem}
                    whileHover={{ scale: 1.03, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                    className={`${item.color} p-5 rounded-2xl flex flex-col items-center text-center cursor-default`}
                  >
                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center mb-3 shadow-sm">
                      <span className={`material-icons-outlined text-lg ${item.iconColor}`}>{item.icon}</span>
                    </div>
                    <h5 className="font-bold text-sm text-gray-900 dark:text-white mb-1">{item.title}</h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.description}</p>
                  </motion.div>
                ))}
              </motion.div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <span className="text-primary font-semibold tracking-wider uppercase text-xs">Our Process</span>
              <h2 className="mt-3 font-display text-3xl md:text-4xl text-gray-900 dark:text-white">How We Work</h2>
              <p className="mt-6 text-gray-500 dark:text-gray-400 leading-relaxed">
                We are remote-first, process-driven, and outcome-oriented. Our distributed team operates with flexibility and accountability, supported by clear communication and continuous improvement.
              </p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Why It Matters Section */}
      <section className="py-24 bg-gray-50 dark:bg-background-dark relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.03] rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-400/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <FadeIn>
            <span className="text-primary font-semibold tracking-wider uppercase text-xs">The Big Picture</span>
            <h2 className="mt-3 font-display text-3xl md:text-4xl text-gray-900 dark:text-white">Why It Matters</h2>
            <p className="mt-6 text-lg text-gray-500 dark:text-gray-400 leading-relaxed max-w-3xl mx-auto">
              In a world of increasing complexity, the companies that thrive are those that can move faster, reduce friction, and make better decisions. Our work helps organizations unlock their potential by removing the barriers that slow them down and creating systems that accelerate growth.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-primary/80" />
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ rotate: [12, 16, 12], y: [0, -8, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-20 -right-20 w-80 h-80 bg-cyan-400/10 rounded-3xl"
          />
          <motion.div
            animate={{ rotate: [-12, -8, -12], y: [0, 6, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/15 rounded-3xl"
          />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-5xl text-white mb-6">Let's build something meaningful</h2>
            <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
              Ready to grow your team with confidence? Start your journey with Talyn today.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.div whileTap={{ scale: 0.97 }}>
                <Link
                  to="/signup/employer"
                  className="group bg-white text-gray-900 hover:bg-gray-100 px-8 py-3.5 rounded-xl font-semibold transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
                >
                  Get Started
                  <span className="material-icons-outlined text-sm transition-transform group-hover:translate-x-0.5">arrow_forward</span>
                </Link>
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="border border-white/25 text-white hover:bg-white/10 px-8 py-3.5 rounded-xl font-semibold transition-all duration-200"
              >
                Get in touch
              </motion.button>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  )
}
