

export interface CreatePaymentIntentRequest {
  priceId: string;
  email: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  customerId: string;
}

class StripeService {
  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/stripe/create-payment-intent`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create payment intent: ${error}`);
    }

    return response.json();
  }

  getPriceIdFromTier(tier: string): string {
    const priceMap: Record<string, string> = {
      '2': 'price_1SicwS17Q4Cr8TzenL7IUQ9D', // Standard $99
      '3': 'price_1Sicy617Q4Cr8TzeO8tA4qv4',  // Premium $199
      '4': 'price_1SiczR17Q4Cr8Tzei1NnrhSx' // Enterprise $299
    };
    return priceMap[tier] || 'price_1SicwS17Q4Cr8TzenL7IUQ9D';
  }
}

export const stripeService = new StripeService();