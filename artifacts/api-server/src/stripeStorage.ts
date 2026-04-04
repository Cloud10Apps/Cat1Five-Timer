import { getUncachableStripeClient } from './stripeClient.js';

export class StripeStorage {
  async getSubscription(subscriptionId: string) {
    const stripe = await getUncachableStripeClient();
    try {
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch {
      return null;
    }
  }

  async getProductsWithPrices() {
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, limit: 20 });
    const results: any[] = [];

    for (const product of products.data) {
      const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
      for (const price of prices.data) {
        results.push({
          product_id: product.id,
          product_name: product.name,
          product_description: product.description,
          price_id: price.id,
          unit_amount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring,
        });
      }
    }
    return results;
  }
}

export const stripeStorage = new StripeStorage();
