const Stripe = require('stripe');
const fs = require('fs');

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Erro: defina a variável STRIPE_SECRET_KEY antes de rodar o script.');
  console.error('Exemplo: $env:STRIPE_SECRET_KEY="sk_live_..."; node setup-stripe.js --reset');
  process.exit(1);
}

const reset = process.argv.includes('--reset');
const stripe = Stripe(key);
const gifts = JSON.parse(fs.readFileSync('gifts.json', 'utf8'));

if (reset) {
  console.log('Modo --reset: apagando links existentes e recriando todos...\n');
  gifts.forEach(g => { g.stripePaymentLink = ''; });
}

const isLive = key.startsWith('sk_live_');
console.log('Modo:', isLive ? '🟢 PRODUÇÃO (live)' : '🟡 Teste (test)', '\n');

async function main() {
  for (const gift of gifts) {
    if (gift.stripePaymentLink) {
      console.log(`[ok] ${gift.name} — já tem link, pulando`);
      continue;
    }

    const product = await stripe.products.create({ name: gift.name });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: gift.price * 100,
      currency: 'brl',
    });

    const link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
    });

    gift.stripePaymentLink = link.url;
    console.log(`[criado] ${gift.name} → ${link.url}`);
  }

  fs.writeFileSync('gifts.json', JSON.stringify(gifts, null, 2));
  console.log('\nPronto! gifts.json atualizado com os Payment Links.');
}

main().catch(err => {
  console.error('Erro ao criar Payment Links:', err.message);
  process.exit(1);
});
