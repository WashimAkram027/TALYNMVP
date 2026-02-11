import { useState } from 'react'

// Industry data with Material Icons
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

export default function AboutUs() {
  const [selectedIndustry, setSelectedIndustry] = useState('mep')

  return (
    <div className="bg-background-light dark:bg-background-dark">
      {/* Industries We Serve Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Industries We Serve</h2>
          <p className="max-w-3xl mx-auto text-gray-600 dark:text-gray-400 mb-12">
            From engineering and architecture to healthcare and legal services, we deliver specialized solutions across diverse industries with deep expertise and innovative technology.
          </p>

          {/* Industry Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {industries.map((industry) => (
              <button
                key={industry.id}
                onClick={() => setSelectedIndustry(industry.id)}
                className={`flex flex-col items-center justify-center p-4 w-32 h-24 rounded-lg transition-all ${
                  selectedIndustry === industry.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-primary dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="material-icons-outlined text-xl mb-2">{industry.icon}</span>
                <span className={`text-xs leading-tight ${selectedIndustry === industry.id ? 'font-semibold' : 'font-medium'}`}>
                  {industry.name}
                </span>
              </button>
            ))}
          </div>

          {/* Selected Industry Description */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-8 max-w-2xl mx-auto shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {industries.find(i => i.id === selectedIndustry)?.name}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {industryDescriptions[selectedIndustry]}
            </p>
          </div>
        </div>
      </section>

      {/* Building Smarter Teams Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight mb-6">
                Building smarter teams for a <span className="text-primary">connected world</span>
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                We help teams and businesses operate more efficiently through technology, design, and intelligent workflows. We help U.S. businesses hire, train, pay, and manage skilled professionals in Nepal through one integrated platform.
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                Talyn combines compliant hiring, payroll, project management, and role-specific training—so your remote team delivers results from day one.
              </p>
              <a
                href="#"
                className="inline-block bg-primary hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-1"
              >
                Our Mission
              </a>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl h-[400px]">
              <img
                alt="Earth at night from space showing city lights"
                className="absolute inset-0 w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqja18L7zjFA2QXcl51hE6WC55W0KvPdaUTSs1zykwDdfOd4WfpJK_gya7AJhZpCrFAGa0tPAu1BWVoxIXelYymtVdfL8ucBDpudjCG8H_Zvljeh5_cL6-BC2LMB5WSw1r8Bk6eP3EljpuET6gD8ljttYlr4rOOkvogJ_QoWzlQ9gCIVX3uZ2HeylQ22fjX2TMqlFwofRxGP6pUxA_xdNHYXE0YEeu8JF1BuPuWJwuVe9zuybJEg-NDLJKiU6HnQ6m9ucZWqEXwJI"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Who We Are Section */}
      <section className="py-20 bg-surface-light dark:bg-surface-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6">Who We Are</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                We are a modern, distributed organization that values clarity, ownership, and long-term thinking. Our team spans the globe, bringing together diverse perspectives and expertise to solve complex challenges.
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                We believe in the power of collaboration and the importance of building teams & systems that last. Our practical approach to problem-solving means we focus on what works, not what's trendy. Every solution we create is designed with real-world impact in mind.
              </p>
            </div>
            <div className="order-1 lg:order-2 relative rounded-2xl overflow-hidden shadow-xl h-[350px]">
              <img
                alt="Team working together on laptops"
                className="absolute inset-0 w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDShNy_CmwDixnbW-9Mm2mhPxPAgKjARyAhBjLhIHkTd_xQy2R3P15pRJY1ycCc0czepmAhgD7NiAFZ1IPj2-OQ36T4HvmO-125U3K_Z8Youkv4i9lfN5d2_YGzEnL3Zbp5WP1Agf5gkaz54vv_zfxYkeo6pO-CXflfGhF3wLEgdtZNckMjzo7-3ZKYxpCmOxMmRIkhW23RpntpvShPo-aDJA9-Rv5Wc8dZ58HLbiNbh8FVhsDx7OkPT8xZdvDG-3bQd8JgmN4AY_M"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section className="py-20 bg-surface-light dark:bg-surface-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 dark:text-white mb-16">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Transparency */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
              <div className="w-12 h-12 mx-auto bg-blue-50 dark:bg-blue-900/50 text-primary rounded-full flex items-center justify-center mb-6">
                <span className="material-icons-outlined text-xl">visibility</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Transparency</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Clear communication and honest execution in everything we do. We believe trust is built through transparency.
              </p>
            </div>

            {/* Connection */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
              <div className="w-12 h-12 mx-auto bg-green-50 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6">
                <span className="material-icons-outlined text-xl">shield</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Connection</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Developing healthy professional relationships with talent teams & clients & fortify each other's growth.
              </p>
            </div>

            {/* Craft */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
              <div className="w-12 h-12 mx-auto bg-yellow-50 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400 rounded-full flex items-center justify-center mb-6">
                <span className="material-icons-outlined text-xl">build</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Craft</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Building teams the right way, not the easy way. Quality and attention to detail define our approach.
              </p>
            </div>

            {/* Impact */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
              <div className="w-12 h-12 mx-auto bg-purple-50 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mb-6">
                <span className="material-icons-outlined text-xl">track_changes</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Impact</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Focusing on meaningful, measurable results that create lasting value for our clients and their users.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How We Work Section */}
      <section className="py-20 bg-background-light dark:bg-background-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* How We Work Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
              <h4 className="text-center text-lg font-bold text-slate-800 dark:text-white mb-8">How We Work</h4>
              <div className="grid grid-cols-2 gap-4">
                {/* Talyn Platform */}
                <div className="bg-blue-50 dark:bg-gray-700/50 p-4 rounded-lg flex flex-col items-center text-center">
                  <div className="bg-white dark:bg-gray-600 w-12 h-8 rounded mb-2 flex items-center justify-center shadow-sm text-xs font-bold text-primary">Talyn</div>
                  <h5 className="font-semibold text-xs text-slate-800 dark:text-white mb-1">Talyn Platform</h5>
                  <div className="text-blue-500 text-sm mb-1">
                    <span className="material-icons text-sm">check_circle</span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">You access one platform to hire, train, pay and manage.</p>
                </div>

                {/* Sourcing Talent */}
                <div className="bg-orange-50 dark:bg-gray-700/50 p-4 rounded-lg flex flex-col items-center text-center">
                  <div className="bg-white dark:bg-gray-600 w-12 h-8 rounded mb-2 flex items-center justify-center shadow-sm text-orange-500">
                    <span className="material-icons-outlined text-xs">groups</span>
                  </div>
                  <h5 className="font-semibold text-xs text-slate-800 dark:text-white mb-1">Sourcing Talent</h5>
                  <div className="text-orange-400 text-sm mb-1">
                    <span className="material-icons text-sm">check_circle</span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">We connect you to top candidates in engineering & IT.</p>
                </div>

                {/* Compliant Hiring */}
                <div className="bg-green-50 dark:bg-gray-700/50 p-4 rounded-lg flex flex-col items-center text-center">
                  <div className="bg-white dark:bg-gray-600 w-12 h-8 rounded mb-2 flex items-center justify-center shadow-sm text-green-500">
                    <span className="material-icons-outlined text-xs">description</span>
                  </div>
                  <h5 className="font-semibold text-xs text-slate-800 dark:text-white mb-1">Compliant Hiring</h5>
                  <div className="text-green-500 text-sm mb-1">
                    <span className="material-icons text-sm">check_circle</span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">We handle employment contracts and compliance.</p>
                </div>

                {/* Ongoing Dev */}
                <div className="bg-blue-50 dark:bg-gray-700/50 p-4 rounded-lg flex flex-col items-center text-center">
                  <div className="bg-white dark:bg-gray-600 w-12 h-8 rounded mb-2 flex items-center justify-center shadow-sm text-blue-500">
                    <span className="material-icons-outlined text-xs">trending_up</span>
                  </div>
                  <h5 className="font-semibold text-xs text-slate-800 dark:text-white mb-1">Ongoing Dev</h5>
                  <div className="text-blue-500 text-sm mb-1">
                    <span className="material-icons text-sm">check_circle</span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">Role-specific PM tools to drive results.</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6">How We Work</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                We are remote-first, process-driven, and outcome-oriented. Our distributed team operates with flexibility and accountability, supported by clear communication and continuous improvement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why It Matters Section */}
      <section className="py-24 bg-surface-light dark:bg-surface-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6">Why It Matters</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            In a world of increasing complexity, the companies that thrive are those that can move faster, reduce friction, and make better decisions. Our work helps organizations unlock their potential by removing the barriers that slow them down and creating systems that accelerate growth.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">Let's build something meaningful</h2>
          <button className="bg-transparent border-2 border-white hover:bg-white hover:text-primary text-white font-semibold py-3 px-10 rounded-lg transition-all duration-300">
            Get in touch
          </button>
        </div>
      </section>
    </div>
  )
}
