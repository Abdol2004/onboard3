/**
 * Run this ONCE to generate your master seed.
 * Save the 24 words somewhere safe (paper, password manager).
 * Add STACKS_MASTER_SEED to your .env file.
 *
 * Usage: node scripts/generate-stacks-seed.js
 */
const bip39 = require('@scure/bip39');
const { wordlist } = require('@scure/bip39/wordlists/english');
const bip32 = require('@scure/bip32');
const { getAddressFromPrivateKey } = require('@stacks/transactions');

async function main() {
  const mnemonic = bip39.generateMnemonic(wordlist, 256);
  const seed     = await bip39.mnemonicToSeed(mnemonic);
  const root     = bip32.HDKey.fromMasterSeed(seed);
  const parent   = root.derive("m/44'/5757'/0'/0");

  // Show first 3 addresses so you can verify
  console.log('\n========================================');
  console.log('  ONBOARD3 STACKS MASTER SEED');
  console.log('  Generated:', new Date().toISOString());
  console.log('========================================\n');
  console.log('24-WORD SEED PHRASE (KEEP SECRET):');
  console.log(mnemonic);
  console.log('\nFirst 3 derived addresses (for verification):');
  for (let i = 0; i < 3; i++) {
    const child  = parent.deriveChild(i);
    const privKey = Buffer.from(child.privateKey).toString('hex') + '01';
    const addr   = getAddressFromPrivateKey(privKey);
    console.log(`  [${i}] ${addr}`);
  }
  console.log('\n.env entry:');
  console.log(`STACKS_MASTER_SEED="${mnemonic}"`);
  console.log('\n⚠  Write down the 24 words on paper. If you lose them, all wallets are unrecoverable.');
  console.log('========================================\n');
}

main().catch(console.error);
