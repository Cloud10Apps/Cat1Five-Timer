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

    const prices = await stripe.prices.list({
      active: true,
      limit: 100,
      expand: ["data.product"],
    });

    return prices.data
      .filter(price => {
        const product = price.product as any;
        return (
          price.recurring != null &&
          typeof product === "object" &&
          product !== null &&
          product.active === true
        );
      })
      .map(price => {
        const product = price.product as any;
        return {
          product_id: product.id,
          product_name: product.name,
          product_description: product.description ?? null,
          price_id: price.id,
          unit_amount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring,
        };
      });
  }
}

export const stripeStorage = new StripeStorage();
