import { getUncachableStripeClient } from './stripeClient.js';

async function main() {
  const stripe = await getUncachableStripeClient();
  const account = await stripe.account.retrieve();
  console.log('Account ID:', account.id);
  console.log('Display name:', (account as any).settings?.dashboard?.display_name ?? '(none)');
  console.log('Email:', account.email);
  
  const products = await stripe.products.list({ limit: 10 });
  console.log('\nProducts in this account:');
  if (products.data.length === 0) {
    console.log('  (none)');
  } else {
    products.data.forEach(p => console.log(` - ${p.name} (${p.id})`));
  }
}

main().catch(console.error);
