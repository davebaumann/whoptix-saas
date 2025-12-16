

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
      '2': 'price_standard_monthly', // $59 -> matches Standard tier
      '3': 'price_premium_monthly',  // $99 -> matches Premium tier
      '4': 'price_enterprise_monthly' // $199 -> matches Enterprise tier
    };
    return priceMap[tier] || 'price_standard_monthly';
  }
}

export const stripeService = new StripeService();