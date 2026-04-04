import { getUncachableStripeClient } from './stripeClient.js';

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log('Checking for existing Cat1Five Timer seat plan...');

    const existing = await stripe.products.search({
      query: "name:'Cat1Five Timer - Per Seat' AND active:'true'",
    });

    if (existing.data.length > 0) {
      console.log('Product already exists:', existing.data[0].id);
      const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
      prices.data.forEach(p => console.log(`  Price: ${p.id}  $${(p.unit_amount ?? 0) / 100}/${p.recurring?.interval}`));
      return;
    }

    const product = await stripe.products.create({
      name: 'Cat1Five Timer - Per Seat',
      description: 'Elevator inspection compliance tracking. $50 per active user per month.',
    });
    console.log('Created product:', product.id);

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 5000,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    console.log(`Created price: ${price.id}  $50/user/month`);
    console.log('Done. Webhooks will sync this to your database automatically.');
  } catch (err: any) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createProducts();
