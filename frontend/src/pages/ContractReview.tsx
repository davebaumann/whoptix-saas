import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, CheckCircle } from 'lucide-react';

const getTierInfo = (tier: string) => {
  const tierMap: Record<string, { name: string; price: string }> = {
    '2': { name: 'Standard', price: '$59/month' },
    '3': { name: 'Premium', price: '$99/month' },
    '4': { name: 'Enterprise', price: '$199/month' }
  };
  return tierMap[tier] || { name: 'Unknown', price: 'N/A' };
};

export default function ContractReview() {
  const [searchParams] = useSearchParams();
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const tier = searchParams.get('tier') || '2';
  const tierInfo = getTierInfo(tier);

  useEffect(() => {
    if (!tier) {
      navigate('/app/account-setup');
    }
  }, [tier, navigate]);

  const handleAcceptContract = async () => {
    if (!agreed) return;
    
    setIsLoading(true);
    
    // TODO: Save contract acceptance to backend
    
    // Navigate to Stripe payment with tier info
    navigate(`/app/stripe-setup?tier=${tier}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-center text-3xl font-bold text-blue-600 mb-2">JUSTSKU</h1>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Service Agreement
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please review and accept our terms of service for your {tierInfo.name} plan
          </p>
        </div>

        <div className="bg-white rounded-lg shadow">
          {/* Plan Summary */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Selected Plan</h3>
                <p className="text-sm text-gray-600">Your chosen subscription tier</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">{tierInfo.name}</p>
                <p className="text-sm text-gray-600">{tierInfo.price}</p>
              </div>
            </div>
          </div>

          {/* Contract Content */}
          <div className="px-6 py-6">
            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                JUSTSKU Service Agreement
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-6 max-h-96 overflow-y-auto">
                <div className="space-y-4 text-sm text-gray-700">
                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">Non-Binding Summary for Customers</h4>
                    <p className="mb-2">
                      This summary is provided to help you understand the key points.
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Annual subscriptions only, with automatic 12 month renewals</li>
                      <li>30 days written notice required to cancel renewal</li>
                      <li>Late cancellation triggers a 2 month pro-rated fee</li>
                      <li>No early termination except bankruptcy, or approved closure or disaster</li>
                      <li>Reports depend on your data and warehouse processes</li>
                      <li>Late invoices incur monthly surcharges and may go to collections</li>
                    </ul>
                    <p className="mt-2 font-medium">
                      The full agreement below is legally binding:
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">1. Parties and Acceptance</h4>
                    <p>
                      This Software as a Service Agreement (Agreement) is entered into by and between the service provider identified 
                      in the applicable order form (Company) and the subscribing customer (Customer). 
                      This Agreement becomes effective upon the earliest of execution of an order form, electronic acceptance, payment 
                      of fees, or use of the services.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">2. Definitions</h4>
                    <p>
                      "Services" means the hosted software platform, related features, and documentation made available by Company. 
                      "Order Form" means any written or electronic ordering document referencing this Agreement. 
                      "Subscription Term" means the initial twelve month term and any renewal terms.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">3. Scope of Services</h4>
                    <p>
                      Company shall provide Customer with access to the Services during the Subscription Term, subject to this 
                      Agreement. Company may modify, update, or enhance the Services from time to time, provided such changes do not materially 
                      reduce the core functionality purchased.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">4. Customer Obligations</h4>
                    <p className="mb-2">Customer is solely responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 mb-2">
                      <li>the accuracy, completeness, and legality of all data entered into the Services</li>
                      <li>pricing, catalog configuration, inventory counts, and warehouse workflows</li>
                      <li>training personnel and ensuring proper system usage</li>
                      <li>compliance with applicable laws</li>
                    </ul>
                    <p>Customer acknowledges that Company does not audit or validate Customer data or operational processes.</p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">5. Fees and Payment</h4>
                    <p>
                      Fees are specified in the Order Form and are non refundable except as expressly stated. 
                      Invoices are due and payable according to the invoice terms. 
                      Customer shall pay all applicable taxes excluding taxes based on Company income.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">6. Late Payments and Collections</h4>
                    <p>
                      Amounts not paid when due shall accrue a late fee of ten percent (10%) per month or the maximum amount 
                      permitted by applicable law, whichever is less. This late fee is a reasonable service charge for the delay in payment 
                      and is not intended as interest. Company may suspend Services for undisputed past due balances. 
                      Customer agrees to pay all reasonable costs of collection, including third party collection agency fees and 
                      attorneys fees where permitted by law. This late fee provision is intended to comply with Indiana contract law standards for commercial agreements and is 
                      fully disclosed in this Agreement.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">7. Subscription Term and Renewal</h4>
                    <p>
                      All subscriptions are for a twelve month term. 
                      Subscriptions automatically renew for successive twelve month terms unless Customer provides written notice of 
                      non renewal at least thirty (30) days prior to the end of the then current term.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">8. Cancellation and Termination</h4>
                    <p className="mb-2"><strong>8.1 No Convenience Termination</strong></p>
                    <p className="mb-2">Customer may not terminate this Agreement for convenience during an active Subscription Term.</p>
                    <p className="mb-2"><strong>8.2 Late Cancellation Penalty</strong></p>
                    <p className="mb-2">If notice of non renewal is provided fewer than thirty (30) days prior to renewal, Customer shall owe a cancellation 
                    penalty equal to two (2) months of subscription fees, due immediately.</p>
                    <p className="mb-2"><strong>8.3 Bankruptcy</strong></p>
                    <p className="mb-2">Either party may terminate upon the other party filing for bankruptcy, insolvency, or similar proceedings, upon 
                    receipt of documented proof.</p>
                    <p className="mb-2"><strong>8.4 Business Closure or Force Majeure Events</strong></p>
                    <p>If Customer permanently ceases operations or suffers a force majeure event materially preventing use of the 
                    Services, including fire or natural disaster, Customer may request early termination. 
                    If approved by Company, Customer shall be liable for fifty percent (50%) of the remaining unpaid fees for the 
                    Subscription Term.</p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">9. Force Majeure</h4>
                    <p>
                      Neither party shall be liable for failure to perform due to events beyond reasonable control, including natural 
                      disasters, acts of government, or infrastructure failures.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">10. Intellectual Property</h4>
                    <p>
                      Company retains all right, title, and interest in the Services. 
                      Customer is granted a limited, non exclusive, non transferable license to use the Services during the Subscription 
                      Term.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">11. Reporting Disclaimer</h4>
                    <p>
                      Customer acknowledges that all reporting, analytics, and outputs are dependent upon Customer data, 
                      configurations, and operational practices. 
                      Company disclaims all liability for inaccuracies caused by Customer data, pricing errors, inventory discrepancies, 
                      workflow deviations, or third party systems.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">12. Disclaimer of Warranties</h4>
                    <p>
                      The Services are provided "as is" and "as available." Company disclaims all warranties, express or implied, 
                      including merchantability and fitness for a particular purpose.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">13. Limitation of Liability</h4>
                    <p>
                      To the maximum extent permitted by law, Company total liability shall not exceed the fees paid by Customer in the 
                      twelve (12) months preceding the claim. 
                      Company shall not be liable for indirect, incidental, consequential, or punitive damages.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">14. Indemnification</h4>
                    <p>
                      Customer shall indemnify and hold harmless Company from claims arising from Customer data, misuse of the 
                      Services, or violation of this Agreement.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">15. Suspension and Termination for Cause</h4>
                    <p>
                      Company may suspend or terminate access for material breach, including non payment, upon reasonable notice.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">16. Confidentiality</h4>
                    <p>
                      Each party shall protect confidential information using reasonable care.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">17. Governing Law and Venue</h4>
                    <p>
                      This Agreement shall be governed by and construed in accordance with the laws of the State of Indiana, without regard to its conflict of laws principles. Any legal action or proceeding arising out of or relating to this Agreement shall be brought exclusively in the state courts located in Harrison County, Indiana, and the parties hereby irrevocably submit to the personal jurisdiction and venue of such courts. 
                      Client shall be responsible for all reasonable attorneys' fees, court costs, collection agency fees, and other expenses incurred by Company in connection with (i) enforcement of this Agreement, (ii) collection of amounts owed, or (iii) defense of claims arising from Client's breach.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">18. Assignment</h4>
                    <p>
                      Customer may not assign this Agreement without Company prior written consent.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">19. Entire Agreement</h4>
                    <p>
                      This Agreement and all Order Forms constitute the entire agreement and supersede prior understandings.
                    </p>
                  </section>

                  <section>
                    <h4 className="font-semibold text-gray-900 mb-2">20. Electronic Execution</h4>
                    <p>
                      Electronic acceptance constitutes binding execution of this Agreement.
                    </p>
                  </section>
                </div>
              </div>

              {/* Agreement Checkbox */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-start">
                  <input
                    id="agree-terms"
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="agree-terms" className="ml-3 text-sm text-gray-700">
                    I have read and agree to the JUSTSKU Service Agreement and{' '}
                    <a href="/terms" className="text-blue-600 hover:text-blue-500" target="_blank">
                      Terms of Service
                    </a>
                    {' '}and{' '}
                    <a href="/privacy" className="text-blue-600 hover:text-blue-500" target="_blank">
                      Privacy Policy
                    </a>
                    . I understand that my subscription will be billed monthly at {tierInfo.price}.
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex justify-between">
              <button
                onClick={() => navigate('/app/account-setup')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back to Plan Selection
              </button>
              
              <button
                onClick={handleAcceptContract}
                disabled={!agreed || isLoading}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept & Continue to Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}