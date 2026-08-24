const bip32 = require('@scure/bip32');
const bip39 = require('@scure/bip39');
const { wordlist } = require('@scure/bip39/wordlists/english');
const t = require('@stacks/transactions');

async function test() {
  const mnemonic = bip39.generateMnemonic(wordlist, 256);
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = bip32.HDKey.fromMasterSeed(seed);

  // Derive the fixed parent once, then only vary the final index
  const parent = root.derive("m/44'/5757'/0'/0");

  const start = Date.now();
  for (let i = 0; i < 100; i++) {
    parent.deriveChild(i);
  }
  console.log('100 accounts (cached parent) in', Date.now() - start, 'ms');

  // Verify address
  const child = parent.deriveChild(0);
  const privKey = Buffer.from(child.privateKey).toString('hex') + '01';
  const addr = t.getAddressFromPrivateKey(privKey);
  console.log('index 0 addr:', addr);

  const child5 = parent.deriveChild(5);
  const privKey5 = Buffer.from(child5.privateKey).toString('hex') + '01';
  const addr5 = t.getAddressFromPrivateKey(privKey5);
  console.log('index 5 addr:', addr5);
}
test().catch(console.error);
