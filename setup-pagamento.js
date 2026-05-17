const { MercadoPagoConfig, Preference } = require('mercadopago');
const fs = require('fs');

const token = process.env.MP_ACCESS_TOKEN;
if (!token) {
  console.error('Erro: defina MP_ACCESS_TOKEN antes de rodar.');
  console.error('Exemplo: $env:MP_ACCESS_TOKEN="APP_USR-..."; node setup-pagamento.js');
  process.exit(1);
}

const reset = process.argv.includes('--reset');
const isLive = token.startsWith('APP_USR-');
const client = new MercadoPagoConfig({ accessToken: token });
const preference = new Preference(client);
const gifts = JSON.parse(fs.readFileSync('gifts.json', 'utf8'));

if (reset) {
  console.log('Modo --reset: recriando todos os links...\n');
  gifts.forEach(g => { g.paymentLink = ''; });
}

console.log('Modo:', isLive ? '🟢 PRODUÇÃO (live)' : '🟡 Teste (sandbox)', '\n');

async function main() {
  for (const gift of gifts) {
    if (gift.paymentLink) {
      console.log(`[ok] ${gift.name} — já tem link, pulando`);
      continue;
    }

    const result = await preference.create({
      body: {
        items: [{
          title: gift.name,
          unit_price: gift.price,
          quantity: 1,
          currency_id: 'BRL',
        }],
      },
    });

    gift.paymentLink = isLive ? result.init_point : result.sandbox_init_point;
    console.log(`[criado] ${gift.name} → ${gift.paymentLink}`);
  }

  fs.writeFileSync('gifts.json', JSON.stringify(gifts, null, 2));
  console.log('\nPronto! gifts.json atualizado com os links do Mercado Pago.');
}

main().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
