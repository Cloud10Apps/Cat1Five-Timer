import Stripe from 'stripe';

async function main() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-08-27.basil' as any });
  const products = await stripe.products.list({ limit: 10 });
  const product = products.data.find(p => p.name === 'Cat1Five Timer - Per Seat');
  if (!product) {
    console.log('Product not found');
    process.exit(1);
  }
  const updated = await stripe.products.update(product.id, {
    description: 'Elevator inspection compliance tracking. $25 per active user per month.',
  });
  console.log('Updated description:', updated.description);
}

main().catch(console.error);
