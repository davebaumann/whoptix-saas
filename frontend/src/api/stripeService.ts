

export interface CreatePaymentIntentRequest {
  priceId: string;
  email: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  customerId: string;
}

export interface PricingConfig {
  priceIds: Record<string, string>;
}

class StripeService {
  private pricingConfigCache: PricingConfig | null = null;

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

  async getPricingConfig(): Promise<PricingConfig> {
    if (this.pricingConfigCache) {
      return this.pricingConfigCache;
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/membership/pricing-config`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch pricing configuration');
    }

    this.pricingConfigCache = await response.json();
    return this.pricingConfigCache!;
  }

  async getPriceIdFromTier(tier: string): Promise<string> {
    try {
      const config = await this.getPricingConfig();
      const tierMap: Record<string, string> = {
        '2': 'standard_monthly',
        '3': 'premium_monthly',
        '4': 'enterprise_monthly',
      };
      const configKey = tierMap[tier];
      return config.priceIds[configKey] || config.priceIds['standard_monthly'] || '';
    } catch (error) {
      console.error('Error fetching pricing config:', error);
      throw error;
    }
  }
}

export const stripeService = new StripeService();