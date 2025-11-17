import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfService() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-600">Last updated: November 17, 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white shadow rounded-lg p-8 prose max-w-none">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using Whoptix ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Whoptix provides cloud-based warehouse optimization and inventory analytics software that integrates with SkuVault systems. Our solutions include advanced reporting, analytics, performance tracking, and warehouse management tools. The Service is provided on a subscription basis with multiple tiers of functionality.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg my-6">
            <h3 className="text-blue-800 font-semibold mb-2">SkuVault Integration</h3>
            <p className="text-blue-700 mb-0">
              Whoptix is an independent software solution that integrates with SkuVault via API. We are not affiliated with or owned by SkuVault. Our service enhances your existing SkuVault investment with additional reporting and optimization capabilities.
            </p>
          </div>

          <h2>3. User Accounts</h2>
          <p>
            To access certain features of the Service, you must register for an account. You agree to:
          </p>
          <ul>
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and update your account information</li>
            <li>Keep your login credentials secure and confidential</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>

          <h2>4. Subscription and Payment</h2>
          <p>
            The Service is provided on a subscription basis. Payment terms include:
          </p>
          <ul>
            <li>Subscription fees are billed monthly in advance</li>
            <li>All fees are non-refundable except as required by law</li>
            <li>We reserve the right to change pricing with 30 days notice</li>
            <li>Failure to pay may result in service suspension or termination</li>
            <li>You authorize us to charge your payment method for all applicable fees</li>
          </ul>

          <h2>5. Acceptable Use Policy</h2>
          <p>
            You agree not to use the Service to:
          </p>
          <ul>
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on intellectual property rights</li>
            <li>Transmit malicious software or engage in harmful activities</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Use the Service for illegal or fraudulent purposes</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
          </ul>

          <h2>6. Data and Privacy</h2>
          <p>
            Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service. You retain ownership of your data, and we will handle it in accordance with our Privacy Policy.
          </p>

          <h2>7. Intellectual Property</h2>
          <p>
            The Service and its original content, features, and functionality are and will remain the exclusive property of Whoptix and its licensors. The Service is protected by copyright, trademark, and other laws.
          </p>

          <h2>8. Service Availability</h2>
          <p>
            We strive to maintain high service availability but do not guarantee uninterrupted access. We may:
          </p>
          <ul>
            <li>Perform scheduled maintenance with advance notice</li>
            <li>Suspend service for emergency maintenance</li>
            <li>Experience occasional downtime due to technical issues</li>
            <li>Update or modify the Service features</li>
          </ul>

          <h2>9. Termination</h2>
          <p>
            Either party may terminate this agreement at any time:
          </p>
          <ul>
            <li>You may cancel your subscription at any time</li>
            <li>We may suspend or terminate accounts for violations of these terms</li>
            <li>Upon termination, your access to the Service will cease</li>
            <li>We will retain your data for a reasonable period to allow export</li>
          </ul>

          <h2>10. Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>

          <h2>11. Limitation of Liability</h2>
          <p>
            IN NO EVENT SHALL WHOPTIX BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE.
          </p>

          <h2>12. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless Whoptix and its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Service or violation of these terms.
          </p>

          <h2>13. Governing Law</h2>
          <p>
            These terms shall be interpreted and governed in accordance with the laws of the jurisdiction in which Whoptix is headquartered, without regard to conflict of law provisions.
          </p>

          <h2>14. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the new terms.
          </p>

          <h2>15. Severability</h2>
          <p>
            If any provision of these terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
          </p>

          <h2>16. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <p>
            Email: legal@whoptix.com<br />
            Address: [Your Business Address]<br />
            Phone: [Your Phone Number]
          </p>

          <div className="mt-12 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Questions?</h3>
            <p className="text-gray-700 mb-4">
              If you have any questions about these terms, please don't hesitate to contact our support team.
            </p>
            <Link 
              to="/login" 
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}