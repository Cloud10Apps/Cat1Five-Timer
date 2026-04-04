import Stripe from 'stripe';

function getKeys() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  if (!secretKey || !publishableKey) {
    throw new Error('STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY environment variables are required');
  }
  return { secretKey, publishableKey };
}

export async function getUncachableStripeClient() {
  const { secretKey } = getKeys();
  return new Stripe(secretKey, { apiVersion: '2025-08-27.basil' as any });
}

export async function getStripePublishableKey() {
  return getKeys().publishableKey;
}

export async function getStripeSecretKey() {
  return getKeys().secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const { secretKey } = getKeys();
    stripeSync = new StripeSync({
      poolConfig: { connectionString: process.env.DATABASE_URL!, max: 2 },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
