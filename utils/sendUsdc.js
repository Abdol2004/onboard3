const { Connection, PublicKey, Keypair, Transaction } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, createTransferInstruction } = require('@solana/spl-token');
const bs58 = require('bs58');

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const USDC_DECIMALS = 6;

async function sendUsdc(toAddress, amountUsd) {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const privateKeyB58 = process.env.TREASURY_PRIVATE_KEY;

  if (!privateKeyB58 || privateKeyB58 === 'your_base58_private_key_here') {
    throw new Error('TREASURY_PRIVATE_KEY not configured in .env');
  }

  const connection = new Connection(rpcUrl, 'confirmed');
  const payer = Keypair.fromSecretKey(bs58.decode(privateKeyB58));
  const toPublicKey = new PublicKey(toAddress);
  const lamports = Math.round(amountUsd * Math.pow(10, USDC_DECIMALS));

  const fromAta = await getOrCreateAssociatedTokenAccount(connection, payer, USDC_MINT, payer.publicKey);
  const toAta   = await getOrCreateAssociatedTokenAccount(connection, payer, USDC_MINT, toPublicKey);

  const ix = createTransferInstruction(fromAta.address, toAta.address, payer.publicKey, BigInt(lamports));
  const tx = new Transaction().add(ix);
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer.publicKey;
  tx.sign(payer);

  const sig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(sig, 'confirmed');
  return sig;
}

async function getTreasuryBalance() {
  try {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const privateKeyB58 = process.env.TREASURY_PRIVATE_KEY;
    if (!privateKeyB58 || privateKeyB58 === 'your_base58_private_key_here') return null;

    const connection = new Connection(rpcUrl, 'confirmed');
    const payer = Keypair.fromSecretKey(bs58.decode(privateKeyB58));

    const { value } = await connection.getParsedTokenAccountsByOwner(payer.publicKey, { mint: USDC_MINT });
    if (!value.length) return 0;
    return value[0].account.data.parsed.info.tokenAmount.uiAmount;
  } catch (_) { return null; }
}

module.exports = { sendUsdc, getTreasuryBalance };
