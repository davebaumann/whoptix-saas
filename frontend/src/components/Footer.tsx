import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SuggestionBox from './SuggestionBox';
import ContactUsModal from './ContactUsModal';

export default function Footer() {
  const { user } = useAuth();
  const [showSuggestionBox, setShowSuggestionBox] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <>
      <footer className="bg-gray-900 text-gray-300 border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div>
              <h3 className="text-white font-semibold mb-4">JUSTSKU</h3>
              <p className="text-sm text-gray-400">
                Warehouse management made simple with Stripe payments and SkuVault integration.
              </p>
            </div>

            {/* Help & Support */}
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://justsku.com/support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-white transition-colors"
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  {user ? (
                    <button
                      onClick={() => setShowContactModal(true)}
                      className="text-sm hover:text-white transition-colors"
                    >
                      Contact Us
                    </button>
                  ) : (
                    <a
                      href="mailto:support@justsku.com"
                      className="text-sm hover:text-white transition-colors"
                    >
                      Contact Us
                    </a>
                  )}
                </li>
                <li>
                  <a
                    href="https://status.justsku.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-white transition-colors"
                  >
                    System Status
                  </a>
                </li>
              </ul>
            </div>

            {/* Feedback */}
            <div>
              <h4 className="text-white font-semibold mb-4">Feedback</h4>
              <button
                onClick={() => setShowSuggestionBox(true)}
                className="text-sm hover:text-white transition-colors"
              >
                Suggestion Box
              </button>
              <p className="text-xs text-gray-500 mt-3">
                Help us improve your experience
              </p>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://justsku.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="https://justsku.com/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-white transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
            <p>&copy; 2026 JUSTSKU. All rights reserved.</p>
            <p>v1.0.0</p>
          </div>
        </div>
      </footer>

      {/* Suggestion Box Modal */}
      {showSuggestionBox && (
        <SuggestionBox onClose={() => setShowSuggestionBox(false)} />
      )}

      {/* Contact Us Modal */}
      {showContactModal && (
        <ContactUsModal onClose={() => setShowContactModal(false)} />
      )}
    </>
  );
}
