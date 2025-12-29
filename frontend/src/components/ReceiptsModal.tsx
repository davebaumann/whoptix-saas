import { useState, useEffect } from 'react';
import { X, Download, Loader } from 'lucide-react';

interface Receipt {
  id: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
  receiptUrl: string;
  description?: string;
}

interface ReceiptsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReceiptsModal({ isOpen, onClose }: ReceiptsModalProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadReceipts();
    }
  }, [isOpen]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/stripe/receipts`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load receipts');
      }

      const data = await response.json();
      setReceipts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Payment Receipts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex justify-center items-center h-32">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          )}

          {error && (
            <div className="text-red-600 text-center py-8">
              {error}
            </div>
          )}

          {!loading && !error && receipts.length === 0 && (
            <div className="text-gray-500 text-center py-8">
              No receipts found.
            </div>
          )}

          {!loading && !error && receipts.length > 0 && (
            <div className="space-y-3">
              {receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">
                        {formatAmount(receipt.amount, receipt.currency)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(receipt.date)}
                      </p>
                    </div>
                    {receipt.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {receipt.description}
                      </p>
                    )}
                  </div>
                  <a
                    href={receipt.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Download receipt"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
