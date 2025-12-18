import { Link } from 'react-router-dom';
import { ArrowLeft, Package, Users, Target, Award, TrendingUp, Shield } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">About JUSTSKU</h1>
          <p className="text-gray-600">
            Empowering businesses with intelligent warehouse optimization solutions
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              To revolutionize warehouse operations by providing intelligent analytics and optimization tools 
              that enhance existing SkuVault investments, helping businesses maximize efficiency and profitability.
            </p>
          </div>
        </div>

        {/* Company Story */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Story</h2>
          <div className="prose max-w-none text-gray-600">
            <p className="mb-4">
              Founded in 2024, JUSTSKU emerged from a simple observation: while SkuVault provides excellent 
              warehouse management capabilities, businesses needed deeper insights and advanced analytics to 
              truly optimize their operations.
            </p>
            <p className="mb-4">
              Our team of warehouse optimization experts and software engineers recognized that many companies 
              were sitting on goldmines of operational data but lacked the tools to extract actionable insights. 
              We set out to bridge this gap by creating powerful analytics and reporting tools specifically 
              designed to enhance SkuVault implementations.
            </p>
            <p>
              Today, JUSTSKU serves businesses of all sizes, from growing startups to established enterprises, 
              helping them unlock the full potential of their warehouse operations through data-driven insights 
              and intelligent optimization recommendations.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Focus</h3>
              <p className="text-gray-600 text-sm">
                Every feature we build is designed with our customers' success in mind, ensuring maximum value and usability.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Innovation</h3>
              <p className="text-gray-600 text-sm">
                We continuously push the boundaries of warehouse analytics, leveraging cutting-edge technology and methodologies.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 mb-4">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Trust & Security</h3>
              <p className="text-gray-600 text-sm">
                We maintain the highest standards of data security and privacy, treating your business data with utmost care.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <Award className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Excellence</h3>
              <p className="text-gray-600 text-sm">
                We strive for excellence in everything we do, from product development to customer support.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Users className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Collaboration</h3>
              <p className="text-gray-600 text-sm">
                We believe in the power of partnership, working closely with our clients to achieve shared success.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
                <Package className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Simplicity</h3>
              <p className="text-gray-600 text-sm">
                Complex problems deserve elegant solutions. We make powerful analytics accessible and easy to use.
              </p>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Team</h2>
          <div className="text-gray-600">
            <p className="mb-4">
              JUSTSKU is built by a diverse team of warehouse operations experts, data scientists, and software engineers 
              who share a passion for solving complex logistics challenges through technology.
            </p>
            <p className="mb-4">
              Our leadership team brings decades of combined experience in warehouse management, supply chain optimization, 
              and enterprise software development. We understand the challenges businesses face because we've been there ourselves.
            </p>
            <p>
              Every team member is committed to our mission of helping businesses optimize their warehouse operations 
              and achieve sustainable growth through data-driven insights.
            </p>
          </div>
        </div>

        {/* SkuVault Integration */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">SkuVault Integration</h2>
          <p className="text-blue-800 mb-4">
            JUSTSKU is an independent software solution that integrates seamlessly with SkuVault systems. 
            We are not affiliated with or owned by SkuVault, but we specialize in maximizing the value of your SkuVault investment.
          </p>
          <p className="text-blue-800">
            Our deep understanding of SkuVault's capabilities allows us to provide complementary analytics and 
            optimization tools that enhance your existing warehouse management system.
          </p>
        </div>

        {/* Contact CTA */}
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Optimize Your Warehouse?</h2>
          <p className="text-gray-600 mb-6">
            Join hundreds of businesses that trust JUSTSKU to enhance their SkuVault operations.
          </p>
          <div className="space-x-4">
            <Link 
              to="/signup" 
              className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Get Started Today
            </Link>
            <Link 
              to="/contact" 
              className="inline-flex items-center border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}