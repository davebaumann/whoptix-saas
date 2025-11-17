import { Link } from 'react-router-dom'
import { ArrowLeft, Shield, Lock, Eye, Database } from 'lucide-react'

export default function PrivacyPolicy() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-600">Last updated: November 17, 2025</p>
        </div>

        {/* Privacy Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h3 className="font-semibold text-sm">We Don't Sell Data</h3>
            <p className="text-xs text-gray-600">Your data is never sold to third parties</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <Lock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold text-sm">Encrypted Storage</h3>
            <p className="text-xs text-gray-600">All data is encrypted at rest and in transit</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <Eye className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold text-sm">Transparent Usage</h3>
            <p className="text-xs text-gray-600">Clear information about how we use your data</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <Database className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <h3 className="font-semibold text-sm">Data Control</h3>
            <p className="text-xs text-gray-600">You maintain ownership and control</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white shadow rounded-lg p-8 prose max-w-none">
          <h2>1. Introduction</h2>
          <p>
            At Whoptix, we are committed to protecting your privacy and ensuring the security of your personal and business data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our warehouse optimization and inventory analytics service that integrates with SkuVault systems.
          </p>
          
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg my-6">
            <h3 className="text-green-800 font-semibold mb-2">Our Data Promise</h3>
            <p className="text-green-700 mb-0">
              <strong>We do not sell, rent, or trade your personal or business data to third parties for their commercial purposes.</strong> Your data is used solely to provide and improve our service to you.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg my-6">
            <h3 className="text-blue-800 font-semibold mb-2">SkuVault Integration</h3>
            <p className="text-blue-700 mb-0">
              Whoptix integrates with SkuVault via API to enhance your warehouse operations. We are an independent company and are not affiliated with or owned by SkuVault. Your SkuVault data is processed according to this privacy policy when using our optimization tools.
            </p>
          </div>

          <h2>2. Information We Collect</h2>
          
          <h3>2.1 Information You Provide</h3>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, company name, phone number</li>
            <li><strong>Payment Information:</strong> Billing address and payment method details (processed securely through third-party payment processors)</li>
            <li><strong>Business Data:</strong> SkuVault inventory data, product information, warehouse details, transaction records accessed via SkuVault API</li>
            <li><strong>Communications:</strong> Support requests, feedback, and correspondence</li>
          </ul>

          <h3>2.2 Automatically Collected Information</h3>
          <ul>
            <li><strong>Usage Data:</strong> How you interact with our service, features used, time spent</li>
            <li><strong>Technical Data:</strong> IP address, browser type, device information, operating system</li>
            <li><strong>Performance Data:</strong> System performance metrics, error logs, response times</li>
            <li><strong>Cookies and Tracking:</strong> Session cookies, preference cookies, analytics cookies</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          
          <p>We use your information for the following purposes:</p>
          
          <h3>3.1 Service Provision</h3>
          <ul>
            <li>Provide warehouse optimization and SkuVault data enhancement services</li>
            <li>Process transactions and maintain your account</li>
            <li>Generate advanced reports and analytics using your SkuVault data</li>
            <li>Provide customer support and technical assistance</li>
          </ul>

          <h3>3.2 Service Improvement</h3>
          <ul>
            <li>Analyze usage patterns to improve our service</li>
            <li>Develop new features and functionality</li>
            <li>Monitor system performance and security</li>
            <li>Conduct internal research and development</li>
          </ul>

          <h3>3.3 Communication</h3>
          <ul>
            <li>Send service updates and security notifications</li>
            <li>Provide account and billing information</li>
            <li>Respond to inquiries and support requests</li>
            <li>Send marketing communications (with your consent)</li>
          </ul>

          <h2>4. Data Sharing and Disclosure</h2>
          
          <p>We do not sell your personal data. We may share your information only in the following limited circumstances:</p>

          <h3>4.1 Service Providers</h3>
          <p>
            We work with trusted third-party service providers who assist us in operating our service, such as:
          </p>
          <ul>
            <li>Cloud hosting providers (for secure data storage)</li>
            <li>Payment processors (for billing and payments)</li>
            <li>Email service providers (for communications)</li>
            <li>Analytics providers (for service improvement)</li>
          </ul>
          <p>These providers are contractually bound to protect your data and use it only for specified purposes.</p>

          <h3>4.2 Legal Requirements</h3>
          <p>We may disclose your information when required by law or to:</p>
          <ul>
            <li>Comply with legal obligations or court orders</li>
            <li>Protect our rights, property, or safety</li>
            <li>Protect the rights, property, or safety of our users</li>
            <li>Prevent fraud or illegal activities</li>
          </ul>

          <h3>4.3 Business Transfers</h3>
          <p>
            In the event of a merger, acquisition, or sale of assets, your information may be transferred to the new entity, subject to the same privacy protections.
          </p>

          <h2>5. Data Security</h2>
          
          <p>We implement comprehensive security measures to protect your data:</p>
          
          <ul>
            <li><strong>Encryption:</strong> Data is encrypted in transit (TLS/SSL) and at rest (AES-256)</li>
            <li><strong>Access Controls:</strong> Role-based access with multi-factor authentication</li>
            <li><strong>Regular Audits:</strong> Security assessments and vulnerability testing</li>
            <li><strong>Monitoring:</strong> 24/7 monitoring for security incidents</li>
            <li><strong>Backup and Recovery:</strong> Regular backups with tested recovery procedures</li>
          </ul>

          <h2>6. Data Retention</h2>
          
          <p>We retain your data for as long as:</p>
          <ul>
            <li>Your account is active and you continue using our service</li>
            <li>Required to provide you with the service</li>
            <li>Necessary to comply with legal obligations</li>
            <li>Needed to resolve disputes and enforce agreements</li>
          </ul>
          
          <p>
            When you terminate your account, we will delete or anonymize your data within a reasonable timeframe, except where retention is required by law.
          </p>

          <h2>7. Your Rights and Choices</h2>
          
          <p>You have the following rights regarding your personal data:</p>
          
          <ul>
            <li><strong>Access:</strong> Request access to your personal data</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data</li>
            <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
            <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
            <li><strong>Restriction:</strong> Limit how we process your data</li>
          </ul>

          <h2>8. Cookies and Tracking Technologies</h2>
          
          <p>We use cookies and similar technologies to:</p>
          <ul>
            <li>Maintain your session and keep you logged in</li>
            <li>Remember your preferences and settings</li>
            <li>Analyze service usage and performance</li>
            <li>Provide personalized experiences</li>
          </ul>
          
          <p>You can control cookie settings through your browser preferences.</p>

          <h2>9. International Data Transfers</h2>
          
          <p>
            Your data may be processed in countries other than your own. When we transfer data internationally, we ensure appropriate safeguards are in place to protect your information in accordance with applicable data protection laws.
          </p>

          <h2>10. Children's Privacy</h2>
          
          <p>
            Our service is not intended for children under 16 years of age. We do not knowingly collect personal information from children under 16. If we discover we have collected such information, we will delete it promptly.
          </p>

          <h2>11. Changes to This Privacy Policy</h2>
          
          <p>
            We may update this Privacy Policy periodically. We will notify you of significant changes via email or through our service. Your continued use of the service after changes constitutes acceptance of the updated policy.
          </p>

          <h2>12. Contact Us</h2>
          
          <p>
            If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:
          </p>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="mb-2"><strong>Privacy Officer</strong></p>
            <p>Email: privacy@whoptix.com</p>
            <p>Address: [Your Business Address]</p>
            <p>Phone: [Your Phone Number]</p>
          </div>

          <div className="mt-12 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Questions About Your Data?</h3>
            <p className="text-gray-700 mb-4">
              We're here to help you understand how we protect and use your information. Don't hesitate to reach out with any privacy-related questions.
            </p>
            <div className="flex gap-4">
              <Link 
                to="/login" 
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
              <Link 
                to="/terms" 
                className="inline-block border border-blue-600 text-blue-600 px-6 py-2 rounded-md hover:bg-blue-50 transition-colors"
              >
                View Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}