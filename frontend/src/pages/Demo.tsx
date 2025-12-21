import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap, BarChart3, Users, Lock } from 'lucide-react'

export default function DemoPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Try JUSTSKU Free</h1>
          <p className="text-xl text-gray-600">Explore our warehouse management platform with live demo data</p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex items-start mb-4">
              <Zap className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Real-Time Dashboard</h3>
                <p className="text-gray-600 mt-2">
                  Monitor warehouse operations with live pick rates, accuracy metrics, and team performance.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex items-start mb-4">
              <BarChart3 className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Advanced Analytics</h3>
                <p className="text-gray-600 mt-2">
                  Track inventory turnover, aging stock, and low stock alerts with detailed reporting.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex items-start mb-4">
              <Users className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Team Management</h3>
                <p className="text-gray-600 mt-2">
                  Manage picker performance, assign locations, and optimize your team's efficiency.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex items-start mb-4">
              <Lock className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Enterprise Security</h3>
                <p className="text-gray-600 mt-2">
                  Bank-level encryption, role-based access control, and compliance certifications.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-blue-600 rounded-lg shadow-lg p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to see it in action?</h2>
          <button
            onClick={() => navigate('/demo/dashboard')}
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            View Live Demo Dashboard
          </button>
        </div>

        {/* Sign Up Banner */}
        <div className="mt-12 bg-gray-100 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to start?</h3>
          <button
            onClick={() => navigate('/signup')}
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Create Your Free Account
          </button>
          <p className="text-gray-600 mt-4">No credit card required. Get started in minutes.</p>
        </div>
      </div>
    </div>
  )
}
