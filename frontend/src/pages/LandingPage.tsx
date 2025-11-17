import { Link } from 'react-router-dom'
import { Crown, Star, Zap, Check, ArrowRight, Package, BarChart3, Bell, MapPin, TrendingUp, Shield as ShieldIcon } from 'lucide-react'

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
    ],
    popular: true
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
      'API Access',
      'Custom Reports'
    ]
  }
]

const features = [
  {
    icon: <Package className="w-12 h-12 text-blue-600" />,
    title: 'Inventory Management',
    description: 'Track your inventory in real-time with powerful warehouse management tools that grow with your business.'
  },
  {
    icon: <BarChart3 className="w-12 h-12 text-green-600" />,
    title: 'Advanced Analytics',
    description: 'Get detailed insights into your inventory performance with comprehensive reporting and analytics.'
  },
  {
    icon: <Bell className="w-12 h-12 text-yellow-600" />,
    title: 'Smart Alerts',
    description: 'Never run out of stock again with intelligent threshold alerts and automated notifications.'
  },
  {
    icon: <MapPin className="w-12 h-12 text-purple-600" />,
    title: 'Multi-Location',
    description: 'Manage inventory across multiple warehouses and locations from a single, unified platform.'
  },
  {
    icon: <TrendingUp className="w-12 h-12 text-red-600" />,
    title: 'Performance Tracking',
    description: 'Monitor team performance, track velocity, and optimize your warehouse operations.'
  },
  {
    icon: <ShieldIcon className="w-12 h-12 text-indigo-600" />,
    title: 'Enterprise Security',
    description: 'Bank-level security with role-based access control and data encryption.'
  }
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">WhOptix</h1>
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
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Powerful Inventory Management
              <span className="text-blue-600"> Made Simple</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Streamline your warehouse operations with real-time inventory tracking, 
              smart alerts, and advanced analytics. Seamlessly integrates with your existing SkuVault system.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/signup" 
                className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center justify-center"
              >
                Get Started Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <a 
                href="#pricing" 
                className="border border-gray-300 text-gray-700 hover:border-gray-400 px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
              >
                View Pricing
              </a>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Professional warehouse optimization • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* SkuVault Integration Section */}
      <section className="py-16 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center items-center mb-6">
              <div className="bg-white p-4 rounded-lg shadow-md mr-4">
                <Package className="w-12 h-12 text-blue-600" />
              </div>
              <div className="text-4xl text-gray-400 mx-4">+</div>
              <div className="bg-white p-4 rounded-lg shadow-md ml-4">
                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-600">SKU</span>
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Built for SkuVault Users
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
              WhOptix enhances your existing SkuVault investment with powerful reporting and analytics tools. 
              We integrate seamlessly with SkuVault's API to provide advanced warehouse optimization features 
              that aren't available in the standard SkuVault interface.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> WhOptix is an independent software solution that integrates with SkuVault. 
                We are not affiliated with or owned by SkuVault, but we specialize in maximizing the value of your SkuVault data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Optimize Your SkuVault Data
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              WhOptix enhances your existing SkuVault investment with advanced reporting, 
              analytics, and warehouse optimization tools.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Why Choose WhOptix?
              </h2>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">SkuVault Integration</h3>
                    <p className="text-gray-600">Seamlessly connects with your existing SkuVault system for enhanced reporting and analytics.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Scalable Architecture</h3>
                    <p className="text-gray-600">Grow from startup to enterprise with our flexible, scalable platform.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Expert Support</h3>
                    <p className="text-gray-600">Get help when you need it with our responsive customer support team.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy Integration</h3>
                    <p className="text-gray-600">Connect with your existing tools and workflows seamlessly.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-lg shadow-2xl p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Dashboard Preview</h3>
                    <p className="text-gray-600">See your inventory at a glance</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Total Products</span>
                    <span className="font-semibold text-gray-900">1,247</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Low Stock Alerts</span>
                    <span className="font-semibold text-red-600">23</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Active Locations</span>
                    <span className="font-semibold text-gray-900">4</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-700">Today's Transactions</span>
                    <span className="font-semibold text-green-600">156</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your business size and needs. 
              All plans include our core inventory management features.
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
                    Get Started
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              Professional warehouse optimization solutions • No setup fees • Cancel anytime
            </p>
            <Link 
              to="/login" 
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Need a custom plan? Contact our sales team →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Inventory Management?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of businesses that trust WhOptix to enhance their SkuVault experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/signup" 
              className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center justify-center"
            >
              Get Started Today
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
          <p className="text-sm text-blue-100 mt-4">
            Professional setup assistance • Setup takes less than 5 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Package className="w-6 h-6 text-blue-400 mr-2" />
                <span className="text-lg font-semibold">WhOptix</span>
              </div>
              <p className="text-gray-400 text-sm">
                Warehouse optimization solutions that enhance your SkuVault system.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                Product
              </h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white text-sm">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white text-sm">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                Support
              </h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white text-sm">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm">Contact Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm">Status</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                Company
              </h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white text-sm">About</a></li>
                <li><Link to="/privacy" className="text-gray-400 hover:text-white text-sm">Privacy</Link></li>
                <li><Link to="/terms" className="text-gray-400 hover:text-white text-sm">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 WhOptix. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}