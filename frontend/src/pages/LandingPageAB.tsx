import { Link } from 'react-router-dom'
import { Crown, Star, Zap, Check, ArrowRight, AlertTriangle, Users, Clock, Target } from 'lucide-react'

const membershipPlans = [
  {
    level: 2,
    name: 'Standard',
    price: 59,
    icon: <Star className="w-8 h-8" />,
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-blue-600',
    features: [
      'SkuVault Integration',
      'Low Stock Alerts',
      'Email Notifications',
      'Threshold Management',
      'Basic Reports',
      'Priority Support'
    ]
  },
  {
    level: 3,
    name: 'Premium',
    price: 99,
    icon: <Crown className="w-8 h-8" />,
    color: 'text-yellow-600',
    gradient: 'from-yellow-500 to-yellow-600',
    features: [
      'All Standard Features',
      'Aging Inventory Reports',
      'Financial Analysis',
      'Location Optimization',
      'Advanced Analytics',
      'Phone Support',
      'Custom Integrations'
    ]
  },
  {
    level: 4,
    name: 'Enterprise',
    price: 199,
    icon: <Zap className="w-8 h-8" />,
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-purple-600',
    features: [
      'All Premium Features',
      'Performance Analytics',
      'Velocity Tracking',
      'Turnover Analysis',
      'Growth Trends',
      'Top Performers',
      'Dedicated Account Manager',
    ],
    popular: true
  }
]

const painPoints = [
  {
    icon: <AlertTriangle className="w-8 h-8 text-blue-500" />,
    problem: "Need advanced reporting beyond SkuVault's standard features",
    solution: "Get powerful analytics and insights that complement your system"
  },
  {
    icon: <Users className="w-8 h-8 text-blue-500" />,
    problem: "Want picker performance visibility",
    solution: "Real-time picker dashboards and performance metrics"
  },
  {
    icon: <Clock className="w-8 h-8 text-blue-500" />,
    problem: "Looking for proactive inventory management",
    solution: "Automated alerts with customizable thresholds"
  },
  {
    icon: <Target className="w-8 h-8 text-blue-500" />,
    problem: "Need deeper sales performance insights",
    solution: "Comprehensive sales analytics and trend reporting"
  }
]

const testimonials = [
  {
    quote: "Finally, the reporting we've been asking SkuVault for! JUSTSKU gives us the picker dashboard and low stock insights we desperately needed.",
    author: "Sarah M.",
    title: "Warehouse Manager",
    company: "TechGear Distribution"
  },
  {
    quote: "We were spending hours manually tracking performance. JUSTSKU automated everything and our efficiency jumped 23% in the first month.",
    author: "Mike R.",
    title: "Operations Director", 
    company: "SportsPro Fulfillment"
  },
  {
    quote: "The sales performance reports alone paid for itself. We identified our top products and optimized our inventory mix.",
    author: "Jennifer L.",
    title: "Inventory Manager",
    company: "Fashion Forward LLC"
  }
]

export default function LandingPageAB() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <img src="/JUSTSKU LOGO.png" alt="JUSTSKU" className="h-20" />
            </div>
            <div className="flex space-x-4">
              <Link 
                to="/login" 
                className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-md transition-colors"
              >
                Sign In
              </Link>
              <Link 
                to="/signup" 
                className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-md transition-colors font-medium"
              >
                Get Started Risk-Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium inline-block mb-6">
              For SkuVault Users Only
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Need Better Visibility Into
              <span className="text-blue-600"> Your SkuVault Data?</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Enhance your SkuVault investment with advanced reporting, picker performance dashboards, 
              proactive low stock alerts, and deeper sales insights. 
              <strong> JUSTSKU complements SkuVault perfectly.</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/signup" 
                className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center justify-center"
              >
                Enhance My SkuVault
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <a 
                href="#proof" 
                className="border border-gray-300 text-gray-700 hover:border-gray-400 px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
              >
                See Customer Results
              </a>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              ✓ 5-minute setup ✓ Works with your existing SkuVault ✓ 30-day money back guarantee
            </p>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Enhance Your SkuVault Experience
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See how JUSTSKU adds powerful capabilities to your existing SkuVault system:
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {painPoints.map((point, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6 border-l-4 border-blue-400">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-4">
                    {point.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      "{point.problem}"
                    </h3>
                    <p className="text-green-700 font-medium">
                      ✓ {point.solution}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-3xl mx-auto">
              <h3 className="text-xl font-semibold text-blue-900 mb-3">
                Seamless Integration with SkuVault
              </h3>
              <p className="text-blue-800 mb-4">
                JUSTSKU connects to your existing SkuVault system and automatically generates 
                advanced reports and dashboards that complement SkuVault's core features.
              </p>
              <Link 
                to="/signup" 
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors inline-flex items-center"
              >
                Enhance My SkuVault
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section id="proof" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Real Results from Real SkuVault Users
            </h2>
            <div className="flex justify-center items-center space-x-8 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">847+</div>
                <div className="text-sm text-gray-600">SkuVault Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">23%</div>
                <div className="text-sm text-gray-600">Avg Efficiency Gain</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">5 min</div>
                <div className="text-sm text-gray-600">Setup Time</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>
                <blockquote className="text-gray-700 mb-4 italic">
                  "{testimonial.quote}"
                </blockquote>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.author}</div>
                  <div className="text-sm text-gray-600">{testimonial.title}</div>
                  <div className="text-sm text-gray-500">{testimonial.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before/After Comparison */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              SkuVault + JUSTSKU: Better Together
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See how JUSTSKU enhances your SkuVault experience
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Before */}
            <div className="bg-gray-50 rounded-lg p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                📊 SkuVault Alone
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-white text-xs">✗</span>
                  </div>
                  <span className="text-gray-700">Manually checking stock levels daily</span>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-white text-xs">✗</span>
                  </div>
                  <span className="text-gray-700">No visibility into picker performance</span>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-white text-xs">✗</span>
                  </div>
                  <span className="text-gray-700">Basic reports that don't help decision making</span>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-white text-xs">✗</span>
                  </div>
                  <span className="text-gray-700">Constant stockouts and overstock situations</span>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-white text-xs">✗</span>
                  </div>
                  <span className="text-gray-700">Hours spent on manual reporting</span>
                </li>
              </ul>
            </div>

            {/* After */}
            <div className="bg-blue-50 rounded-lg p-8 border-2 border-blue-200">
              <h3 className="text-2xl font-bold text-blue-800 mb-6 text-center">
                🚀 SkuVault + JUSTSKU
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700">Automated low stock alerts via email/SMS</span>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700">Real-time picker performance dashboard</span>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700">Advanced analytics and actionable insights</span>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700">Optimized inventory levels and turnover</span>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700">Automated reports delivered to your inbox</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link 
              to="/signup" 
              className="bg-green-600 text-white hover:bg-green-700 px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center"
            >
              Transform My SkuVault Experience
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Screenshots Section - Focused on Key Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Advanced Reports That Enhance SkuVault
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See exactly what you'll get when you enhance your SkuVault system with JUSTSKU
            </p>
          </div>

          {/* Picker Dashboard Screenshot */}
          <div className="mb-16">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              🎯 Enhanced Picker Performance Dashboard
            </h3>
            <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-blue-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold">JUSTSKU Picker Dashboard</h4>
                  <div className="text-sm">Live Data from Your SkuVault</div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-green-600 text-sm font-medium">Total Picks Today</div>
                    <div className="text-2xl font-bold text-green-900">1,247</div>
                    <div className="text-green-600 text-xs">↑ 12% vs yesterday</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-blue-600 text-sm font-medium">Active Pickers</div>
                    <div className="text-2xl font-bold text-blue-900">23</div>
                    <div className="text-blue-600 text-xs">8 above target</div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="text-yellow-600 text-sm font-medium">Avg Pick Rate</div>
                    <div className="text-2xl font-bold text-yellow-900">47/hr</div>
                    <div className="text-yellow-600 text-xs">↑ 8% this week</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="text-purple-600 text-sm font-medium">Efficiency</div>
                    <div className="text-2xl font-bold text-purple-900">94.2%</div>
                    <div className="text-purple-600 text-xs">Target: 90%</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-900 mb-4">Top Performers Today</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-white p-3 rounded border">
                      <span className="font-medium">Sarah Johnson</span>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">67 picks/hr</div>
                        <div className="text-xs text-gray-500">156 total picks</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-white p-3 rounded border">
                      <span className="font-medium">Mike Chen</span>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">61 picks/hr</div>
                        <div className="text-xs text-gray-500">142 total picks</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg text-gray-600 mb-6">
              <strong>This is just one example.</strong> JUSTSKU provides 15+ advanced reports that perfectly complement your SkuVault system.
            </p>
            <Link 
              to="/signup" 
              className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center"
            >
              See All Reports in Action
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section - Value-Focused */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Maximize Your SkuVault Investment
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              For less than what you spend on coffee each month, add powerful reporting 
              and analytics that take your SkuVault system to the next level.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {membershipPlans.map((plan) => (
              <div
                key={plan.level}
                className={`relative bg-white rounded-lg shadow-lg border-2 transition-all duration-200 hover:shadow-xl ${
                  plan.popular 
                    ? 'border-blue-500 scale-105' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${plan.gradient} text-white mb-4`}>
                      {plan.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="text-4xl font-bold text-gray-900 mb-1">
                      ${plan.price}
                      <span className="text-lg font-normal text-gray-600">/month</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Less than ${(plan.price / 30).toFixed(2)}/day
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/signup"
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors text-center block ${
                      plan.popular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    Get Started Risk-Free
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-3xl mx-auto mb-8">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                💡 ROI Calculator: Is JUSTSKU Worth It?
              </h3>
              <p className="text-yellow-700 mb-4">
                If JUSTSKU helps you avoid just <strong>one stockout per month</strong> or improves picker 
                efficiency by <strong>just 5%</strong>, it pays for itself. Most customers see 10x ROI in the first 90 days.
              </p>
            </div>
            <p className="text-gray-600 mb-4">
              ✓ 30-day money back guarantee ✓ No setup fees ✓ Cancel anytime ✓ 5-minute setup
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Enhance Your SkuVault Experience?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join 847+ SkuVault users who've added powerful reporting and analytics to their warehouse operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/signup" 
              className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center justify-center"
            >
              Get Started Risk-Free Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
          <p className="text-sm text-blue-100 mt-4">
            ⚡ Setup in 5 minutes ⚡ See results immediately ⚡ 30-day money-back guarantee
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <img src="/JUSTSKU LOGO.png" alt="JUSTSKU" className="h-6 mr-2" />
                <span className="text-lg font-semibold">JUSTSKU</span>
              </div>
              <p className="text-gray-400 text-sm">
                The reporting and analytics platform that SkuVault users have been waiting for.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                Product
              </h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white text-sm">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white text-sm">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                Support
              </h3>
              <ul className="space-y-2">
                <li><Link to="/support" className="text-gray-400 hover:text-white text-sm">Help Center</Link></li>
                <li><Link to="/contact" className="text-gray-400 hover:text-white text-sm">Contact Us</Link></li>
                <li><Link to="/status" className="text-gray-400 hover:text-white text-sm">Status</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                Company
              </h3>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-gray-400 hover:text-white text-sm">About</Link></li>
                <li><Link to="/privacy" className="text-gray-400 hover:text-white text-sm">Privacy</Link></li>
                <li><Link to="/terms" className="text-gray-400 hover:text-white text-sm">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 JUSTSKU. All rights reserved. Not affiliated with SkuVault.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}