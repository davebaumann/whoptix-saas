import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Send, Book, MessageCircle, Mail } from 'lucide-react';

export default function Support() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    priority: '',
    category: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: formData.email,
          priority: formData.priority,
          category: formData.category,
          subject: formData.subject,
          message: formData.message
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send support request');
      }
      
      setIsSubmitted(true);
      setFormData({
        name: '',
        email: '',
        priority: '',
        category: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      console.error('Error submitting support request:', error);
      alert('Failed to send support request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <Send className="h-6 w-6 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Support Request Submitted!</h1>
            <p className="text-gray-600 mb-8">
              Your support request has been sent to our technical team. We'll respond within 4 hours during business hours.
            </p>
            <div className="space-x-4">
              <Link 
                to="/" 
                className="inline-flex items-center text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-gray-600 hover:text-gray-700"
              >
                Submit Another Request
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Help Center</h1>
          <p className="text-gray-600">
            Get technical support and find answers to common questions about JUSTSKU.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Quick Help */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <HelpCircle className="w-5 h-5 mr-2 text-blue-600" />
                Quick Help
              </h2>
              
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Book className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-900">Documentation</span>
                  </div>
                  <p className="text-sm text-blue-700">Setup guides and API documentation</p>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <MessageCircle className="w-4 h-4 text-green-600 mr-2" />
                    <span className="font-medium text-green-900">Live Chat</span>
                  </div>
                  <p className="text-sm text-green-700">Available Mon-Fri 9AM-6PM EST</p>
                </div>
                
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Mail className="w-4 h-4 text-purple-600 mr-2" />
                    <span className="font-medium text-purple-900">Email Support</span>
                  </div>
                  <p className="text-sm text-purple-700">techsupport@justsku.com</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Response Times</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Critical Issues:</span>
                  <span className="font-medium">1 hour</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">High Priority:</span>
                  <span className="font-medium">4 hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Normal:</span>
                  <span className="font-medium">24 hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Low Priority:</span>
                  <span className="font-medium">48 hours</span>
                </div>
              </div>
            </div>
          </div>

          {/* Support Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Submit a Support Request</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                      Priority Level *
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      required
                      value={formData.priority}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select priority</option>
                      <option value="critical">Critical - System Down</option>
                      <option value="high">High - Major Feature Broken</option>
                      <option value="normal">Normal - General Issue</option>
                      <option value="low">Low - Question/Enhancement</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      id="category"
                      name="category"
                      required
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select category</option>
                      <option value="skuvault-integration">SkuVault Integration</option>
                      <option value="reports">Reports & Analytics</option>
                      <option value="performance">Performance Issues</option>
                      <option value="billing">Billing & Account</option>
                      <option value="login">Login & Access</option>
                      <option value="data">Data Sync Issues</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of the issue"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Detailed Description *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Please provide as much detail as possible including steps to reproduce the issue, error messages, and what you expected to happen."
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Support Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}