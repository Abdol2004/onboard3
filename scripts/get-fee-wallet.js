const bip32 = require('@scure/bip32');
const bip39 = require('@scure/bip39');
const { getAddressFromPrivateKey } = require('@stacks/transactions');

async function main() {
  const mnemonic = process.argv[2];
  if (!mnemonic) { console.log('Usage: node scripts/get-fee-wallet.js "<24 words>"'); process.exit(1); }

  const seed   = await bip39.mnemonicToSeed(mnemonic);
  const root   = bip32.HDKey.fromMasterSeed(seed);

  // Reserved fee wallet — account index 1, separate from user wallets (account 0)
  const feeKey  = root.derive("m/44'/5757'/1'/0/0");
  const privKey = Buffer.from(feeKey.privateKey).toString('hex') + '01';
  const address = getAddressFromPrivateKey(privKey);

  console.log('\n========================================');
  console.log('  ONBOARD3 FEE WALLET');
  console.log('========================================');
  console.log(address);
  console.log('\nSend 5-10 STX to this address.');
  console.log('Covers ~1,600 sponsored submissions.');
  console.log('========================================\n');
}
main().catch(console.error);
