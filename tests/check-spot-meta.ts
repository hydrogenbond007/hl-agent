import { InfoClient, HttpTransport } from '@nktkas/hyperliquid';

const client = new InfoClient({ transport: new HttpTransport() });
const spotMeta = await client.spotMeta();

console.log('=== SPOT META STRUCTURE ===\n');
console.log('Tokens count:', spotMeta.tokens.length);
console.log('Universe count:', spotMeta.universe.length);

console.log('\nFirst 5 tokens:');
spotMeta.tokens.slice(0, 5).forEach((t, i) => {
  console.log(`  [${i}] ${t.name} (index: ${t.index}, tokenId: ${t.tokenId})`);
});

console.log('\nFirst 5 universe entries:');
spotMeta.universe.slice(0, 5).forEach((u, i) => {
  console.log(`  [${i}] ${u.name} (index: ${u.index}, tokens: [${u.tokens}])`);
});

console.log('\n=== LOOKING FOR HYPE ===');
const hypeToken = spotMeta.tokens.find(t => t.name === 'HYPE');
const hypeUniverse = spotMeta.universe.find(u => u.name.includes('HYPE'));

if (hypeToken) {
  console.log('HYPE token found:', JSON.stringify(hypeToken, null, 2));
}
if (hypeUniverse) {
  console.log('HYPE universe found:', JSON.stringify(hypeUniverse, null, 2));
}

console.log('\n=== FOR SPOT ORDERS ===');
console.log('Spot asset index = 10000 + universe.index');
console.log('So HYPE/USDC would be:', hypeUniverse ? `10000 + ${hypeUniverse.index} = ${10000 + hypeUniverse.index}` : 'NOT FOUND');
