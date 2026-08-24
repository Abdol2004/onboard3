const bip32   = require('@scure/bip32');
const bip39   = require('@scure/bip39');
const { wordlist } = require('@scure/bip39/wordlists/english');
const { makeSTXTokenTransfer, makeContractCall, broadcastTransaction, sponsorTransaction, AnchorMode, getAddressFromPrivateKey, stringAsciiCV, signWithKey } = require('@stacks/transactions');
const { signatureVrsToRsv } = require('@stacks/common');
const { STACKS_MAINNET } = require('@stacks/network');
const { getPublicKeyFromPrivate, hashMessage } = require('@stacks/encryption');
const axios  = require('axios');

const HIRO_API    = 'https://api.mainnet.hiro.so';
const STACKS_PATH = "m/44'/5757'/0'/0";
const NETWORK_FEE = BigInt(2000); // 0.002 STX

// Cache parent HD key in memory — derived once, used for all users
let _parent    = null;
let _parentAt  = 0;

async function getParent() {
  if (_parent) return _parent;
  const mnemonic = process.env.STACKS_MASTER_SEED;
  if (!mnemonic) throw new Error('STACKS_MASTER_SEED not set in environment');
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = bip32.HDKey.fromMasterSeed(seed);
  _parent = root.derive(STACKS_PATH);
  return _parent;
}

function derivePrivKey(parent, index) {
  const child = parent.deriveChild(index);
  return Buffer.from(child.privateKey).toString('hex') + '01'; // compressed
}

async function getAddress(index) {
  const parent = await getParent();
  return getAddressFromPrivateKey(derivePrivKey(parent, index));
}

async function getBalance(address) {
  try {
    const res = await axios.get(`${HIRO_API}/extended/v1/address/${address}/balances`, { timeout: 8000 });
    const locked = parseInt(res.data.stx.locked  || '0');
    const total  = parseInt(res.data.stx.balance || '0');
    return Math.max(0, total - locked);
  } catch {
    return -1; // -1 = fetch failed
  }
}

// STX price cache (10 min TTL)
let _stxPrice = 0, _stxPriceAt = 0;
async function getSTXPrice() {
  if (_stxPrice && Date.now() - _stxPriceAt < 600000) return _stxPrice;
  try {
    const r = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=blockstack&vs_currencies=usd', { timeout: 6000 });
    _stxPrice   = r.data.blockstack?.usd || 0;
    _stxPriceAt = Date.now();
  } catch {}
  return _stxPrice;
}

// Sweep user wallet → main wallet, credit user USDC (minus platform fee)
async function sweepWallet(userId) {
  const User    = require('../models/User');
  const mainWallet = process.env.STACKS_MAIN_WALLET;
  if (!mainWallet) throw new Error('STACKS_MAIN_WALLET not set');

  const user = await User.findById(userId);
  if (!user || user.stacksWalletIndex == null) throw new Error('User has no Stacks wallet');

  const parent  = await getParent();
  const privKey = derivePrivKey(parent, user.stacksWalletIndex);
  const address = getAddressFromPrivateKey(privKey);

  const microSTX = await getBalance(address);
  if (microSTX <= 0) throw new Error('Wallet has no balance');
  if (BigInt(microSTX) <= NETWORK_FEE) throw new Error('Balance too low to cover network fee');

  const sendAmount = BigInt(microSTX) - NETWORK_FEE;

  const network = STACKS_MAINNET;
  const tx = await makeSTXTokenTransfer({
    recipient:  mainWallet,
    amount:     sendAmount,
    senderKey:  privKey,
    network,
    anchorMode: AnchorMode.Any,
    fee:        NETWORK_FEE,
  });

  const result = await broadcastTransaction({ transaction: tx, network });
  if (result.error) throw new Error(result.error);

  // Calculate USDC credit (90% of value)
  const stxPrice   = await getSTXPrice();
  const totalSTX   = Number(sendAmount) / 1_000_000;
  const totalUSD   = totalSTX * stxPrice;
  const platformCut = totalUSD * 0.10;
  const userCredit  = Math.round((totalUSD - platformCut) * 100) / 100;

  user.usdcBalance    = Math.round(((user.usdcBalance || 0) + userCredit) * 100) / 100;
  user.stacksBalance  = 0;
  user.stacksCheckedAt = new Date();
  if (!user.recentActivity) user.recentActivity = [];
  user.recentActivity.unshift({
    action: `Bounty reward swept: $${userCredit} USDC credited (${totalSTX.toFixed(4)} STX, 10% platform fee deducted)`,
    timestamp: new Date()
  });
  if (user.recentActivity.length > 10) user.recentActivity = user.recentActivity.slice(0, 10);
  await user.save();

  return { txId: result.txid, totalSTX, totalUSD, platformCut, userCredit };
}

// Assign a wallet to a user (on first bounty submission)
async function assignWallet(userId) {
  const User    = require('../models/User');
  const Counter = require('../models/Counter');

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (user.stacksAddress) return { address: user.stacksAddress, index: user.stacksWalletIndex };

  const counter = await Counter.findByIdAndUpdate(
    'stacksWalletIndex',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const index   = counter.seq - 1;
  const address = await getAddress(index);

  user.stacksWalletIndex = index;
  user.stacksAddress     = address;
  await user.save();

  return { address, index };
}

const ZAD_CONTRACT_ADDRESS = 'SP2GW18TVQR75W1VT53HYGBRGKFRV5BFYNAF5SS5J';
const ZAD_CONTRACT_NAME    = 'ZADAO-V2-MultiW-Bounty';
const FEE_WALLET_PATH      = "m/44'/5757'/1'/0/0"; // separate account, never used for user wallets
const SPONSOR_FEE          = BigInt(3000); // 0.003 STX per submission

// Derive the ONBOARD3 fee wallet key (used to sponsor tx fees)
async function getFeeKey() {
  const mnemonic = process.env.STACKS_MASTER_SEED;
  if (!mnemonic) throw new Error('STACKS_MASTER_SEED not set');
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = bip32.HDKey.fromMasterSeed(seed);
  const child = root.derive(FEE_WALLET_PATH);
  return Buffer.from(child.privateKey).toString('hex') + '01';
}

// Submit a bounty entry on-chain to ZeroAuthDAO from the user's custodial wallet
// Fee is sponsored by ONBOARD3's fee wallet — user wallet needs zero STX balance
// ZAD's Server Action broadcasts the tx AND creates the DB record (so it appears on their site)
async function submitBountyOnChain(userId, bountyId, summary, submissionUrl) {
  const User = require('../models/User');
  const user = await User.findById(userId).select('stacksWalletIndex stacksAddress username profilePicture').lean();
  if (!user || user.stacksWalletIndex == null) throw new Error('User has no Stacks wallet assigned');

  const parent  = await getParent();
  const userKey = derivePrivKey(parent, user.stacksWalletIndex);
  const feeKey  = await getFeeKey();
  const network = STACKS_MAINNET;

  // Build transaction with sponsored: true so user wallet pays no fees
  const tx = await makeContractCall({
    contractAddress: ZAD_CONTRACT_ADDRESS,
    contractName:    ZAD_CONTRACT_NAME,
    functionName:    'submit-entry',
    functionArgs:    [stringAsciiCV(bountyId)],
    senderKey:       userKey,
    network,
    anchorMode:      AnchorMode.Any,
    sponsored:       true,
  });

  // Fee wallet signs the sponsored portion
  const sponsored = await sponsorTransaction({
    transaction:       tx,
    sponsorPrivateKey: feeKey,
    fee:               SPONSOR_FEE,
    network,
  });

  // serialize() already returns a hex string — do NOT wrap in Buffer.from() or it double-encodes
  const raw = sponsored.serialize();
  const signedTxHex = typeof raw === 'string' ? raw : Buffer.from(raw).toString('hex');

  // Call ZAD's Server Action (broadcasts + creates DB record so it appears on their platform)
  const webResult = await submitToZADWebAPI(userKey, bountyId, summary || '', submissionUrl || null, signedTxHex, {
    username: user.username || null,
    avatarUrl: user.profilePicture || null,
  });
  console.log('[ZAD] Web2 result:', webResult);

  // If ZAD broadcast it, use the txId from their response; otherwise fall back to broadcasting ourselves
  let txId = webResult.txId;
  if (!txId) {
    const result = await broadcastTransaction({ transaction: sponsored, network });
    // Treat "already in mempool/confirmed" as success — ZAD may have already broadcast it
    const alreadyExists = result.error && /ConflictingNonce|AlreadyExists|already/i.test(result.reason || result.error);
    if (result.error && !alreadyExists) {
      throw new Error(result.error + (result.reason ? ': ' + result.reason : ''));
    }
    txId = result.txid || null;
  }

  if (!txId) throw new Error('Failed to submit transaction to Stacks network');

  return { txId, address: user.stacksAddress, zadSubId: webResult.zadSubId };
}

async function getFeeWalletInfo() {
  const feeKey  = await getFeeKey();
  const address = getAddressFromPrivateKey(feeKey);
  const microSTX = await getBalance(address);
  const stxPrice = await getSTXPrice();
  const stx = microSTX > 0 ? microSTX / 1_000_000 : 0;
  return { address, microSTX: Math.max(0, microSTX), stx, usd: Math.round(stx * stxPrice * 100) / 100 };
}

const ZAD_BASE = 'https://zeroauthoritydao.com';
const ZAD_API_KEY = () => process.env.ZAD_API_KEY || '';

// Build a SIWE/SIWS message exactly as ZeroAuthDAO's frontend does
// They use: new SiweMessage({ statement:"Cerulean Marketplace", domain: origin, address, uri: origin, ... })
function buildSiwsMessage(address, nonce) {
  const origin   = 'https://zeroauthoritydao.com';
  const issuedAt = new Date().toISOString();
  // Standard EIP-4361 prepareMessage() output format
  return [
    `${origin} wants you to sign in with your Stacks account:`,
    address,
    '',
    'Cerulean Marketplace',
    '',
    `URI: ${origin}`,
    'Version: 1',
    'Chain ID: 1',
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}

// Sign a UTF-8 message using Stacks personal sign (Leather wallet RSV format)
// Leather's stx_signMessage returns RSV: compact(r+s 64 bytes) + recovery(1 byte)
function stacksPersonalSign(privKeyHex, message) {
  const hash    = hashMessage(message);
  const hashHex = Buffer.from(hash).toString('hex');
  // signWithKey produces VRS; convert to RSV to match Leather wallet output
  return signatureVrsToRsv(signWithKey(privKeyHex + '01', hashHex));
}

// Authenticate a custodial wallet with ZeroAuthDAO using SIWS
// Returns session cookies to use in subsequent requests
async function authenticateWithZAD(privKey, profile = {}) {
  const privKeyHex = privKey.slice(0, 64);
  const address    = getAddressFromPrivateKey(privKey);
  const pubKey     = getPublicKeyFromPrivate(privKeyHex);

  const nonceRes = await axios.get(`${ZAD_BASE}/api/auth/nonce`, { timeout: 8000 });
  const nonce    = nonceRes.data.nonce;

  const message   = buildSiwsMessage(address, nonce);
  const signature = await stacksPersonalSign(privKeyHex, message);

  let res;
  try {
    res = await axios.post(`${ZAD_BASE}/api/auth/wallet-signin`, {
      message,
      signature,
      walletType: 'leather',
      chain:      'Stacks',
      nonce,
      publicKey:  pubKey,
      // Pass username on signin — some platforms set display name on first account creation
      ...(profile.username ? { username: profile.username, name: profile.username, displayName: profile.username } : {}),
      ...(profile.avatarUrl ? { image: profile.avatarUrl, avatarUrl: profile.avatarUrl } : {}),
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 12000,
    });
  } catch (authErr) {
    const status = authErr.response?.status;
    const body   = authErr.response?.data;
    console.error('[ZAD] wallet-signin failed:', status, typeof body === 'string' ? body.slice(0, 300) : JSON.stringify(body).slice(0, 300));
    console.error('[ZAD] message was:', message.slice(0, 200));
    console.error('[ZAD] signature was:', signature.slice(0, 20) + '...');
    throw authErr;
  }

  const setCookie = res.headers['set-cookie'] || [];
  const cookieStr = setCookie.map(c => c.split(';')[0]).join('; ');
  // Also log the signin response so we can see what user fields ZAD returns
  const signinData = typeof res.data === 'object' ? res.data : {};
  console.log('[ZAD] Auth OK | user from signin:', JSON.stringify(signinData).slice(0, 300));
  return { cookieStr, address, signinUser: signinData };
}

// Try to update the ZAD user profile via their settings Server Actions
async function tryUpdateZADProfile(cookieStr, username, avatarUrl) {
  if (!username) return;

  const jsonHeaders = { 'Content-Type': 'application/json', 'Cookie': cookieStr };
  const saHeaders = {
    'Cookie':                 cookieStr,
    'Next-Router-State-Tree': '%5B%22%22%2C%7B%7D%5D',
    'Origin':                 ZAD_BASE,
    'Referer':                `${ZAD_BASE}/settings`,
  };

  // ZAD uses Next.js Server Actions for settings — hashes found in their bundle chunk 4832
  // Try each one with profile data until one accepts it (200/201)
  const ACTION_HASHES = [
    '13b35c40ed6572e56004b9107158ff6031eba5e8', // exported as Rx
    'db8221deb5eda1ebffe98847f0cd72065ad7b73e', // exported as uv
    '684e86e176ad10a5d14dd6b0be2f5a86fe221e02', // exported as lP
    '004c6de5f1cfefc9965c7ac5a3e051a07fcde1b2',
    '6cbe8c93fb710967f41684e2d03c495d8895a393',
    'ec0c4ba5407f61380e08ea5eb0b2d3f3cadd361a',
    '1baff3dcd411e2a16a8c680c54ed74f442923793',
    '4be4bab85bfd3db5c36d84e6d5732920970a7c7f',
    '4d7f511e3aed9967f55c6be56bef6bffb0c7bb8b',
  ];

  const payload = [{ username, name: username, displayName: username, ...(avatarUrl ? { image: avatarUrl } : {}) }];

  for (const hash of ACTION_HASHES) {
    try {
      const r = await axios.post(`${ZAD_BASE}/settings`, payload, {
        headers: { ...saHeaders, 'Next-Action': hash, 'Content-Type': 'application/json' },
        timeout: 8000,
      });
      const text = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
      console.log('[ZAD] Profile SA', hash.slice(0, 8), '→', r.status, text.slice(0, 150));
      // If response looks like success (not an error message), stop
      if (r.status < 400 && !text.includes('"error"') && !text.includes('Error')) return;
    } catch (e) {
      console.log('[ZAD] Profile SA', hash.slice(0, 8), '→', e.response?.status || e.message);
    }
  }

  // Fallback: try REST endpoints
  const body = { username, name: username, displayName: username, ...(avatarUrl ? { image: avatarUrl } : {}) };
  for (const [url, method] of [
    [`${ZAD_BASE}/api/user`, 'PATCH'],
    [`${ZAD_BASE}/api/users/me`, 'PATCH'],
    [`${ZAD_BASE}/api/profile`, 'PATCH'],
  ]) {
    try {
      const r = await axios({ method, url, data: body, headers: jsonHeaders, timeout: 6000 });
      console.log('[ZAD] Profile REST', method, url, '→', r.status);
      return;
    } catch (e) {
      console.log('[ZAD] Profile REST', method, url, '→', e.response?.status || e.message);
    }
  }
  console.log('[ZAD] Profile update: no working endpoint found');
}

// Submit a bounty via ZAD's Next.js Server Action — this broadcasts the tx AND creates the DB record
// signedTxHex: hex of the fully signed+sponsored transaction (ZAD broadcasts it on their end)
// profile: { username, avatarUrl } — optional, used to update ZAD account name so it shows instead of Anonymous
async function submitToZADWebAPI(privKey, bountyId, summary, submissionUrl, signedTxHex, profile = {}) {
  try {
    if (!privKey) {
      const parent = await getParent();
      privKey = derivePrivKey(parent, 0);
    }
    const { cookieStr, address } = await authenticateWithZAD(privKey, profile);

    // Update ZAD profile with ONBOARD3 username so submissions don't show as Anonymous
    await tryUpdateZADProfile(cookieStr, profile.username, profile.avatarUrl);

    // ZAD uses a Next.js Server Action for submissions (not a REST endpoint)
    // Action ID found in their bundle: 3412751565eefa5c83032aedc403d0a6c1808442
    const headers = {
      'Content-Type':            'application/json',
      'Cookie':                  cookieStr,
      'Next-Action':             '3412751565eefa5c83032aedc403d0a6c1808442',
      'Next-Router-State-Tree':  '%5B%22%22%2C%7B%7D%5D',
      'Origin':                  ZAD_BASE,
      'Referer':                 `${ZAD_BASE}/bounty/${bountyId}`,
    };

    // Server Action payload must be wrapped in an array
    const payload = [{ bountyId, submitterAddress: address, signedTxHex, summary, submissionUrl: submissionUrl || null }];

    const subRes = await axios.post(`${ZAD_BASE}/bounty/${bountyId}`, payload, { headers, timeout: 30000 });
    console.log('[ZAD] Server Action status:', subRes.status);

    const responseText = typeof subRes.data === 'string' ? subRes.data : JSON.stringify(subRes.data);
    console.log('[ZAD] Server Action response:', responseText.slice(0, 500));

    // Parse RSC (React Server Components) streaming response
    // Format: "0:[...]\n1:{...}\n" — look for submission id and txId in all lines
    let zadSubId = null;
    let txId = null;
    try {
      for (const line of responseText.split('\n')) {
        const match = line.match(/^\d+:(.*)/s);
        if (!match) continue;
        try {
          const parsed = JSON.parse(match[1]);
          const obj = Array.isArray(parsed) ? parsed[1] : parsed;
          if (obj && typeof obj === 'object') {
            if (obj.id)    zadSubId = obj.id;
            if (obj.txId)  txId     = obj.txId;
            if (obj.txid)  txId     = obj.txid;
          }
        } catch {}
      }
    } catch {}

    return { success: true, zadSubId, txId, address };
  } catch (err) {
    const status = err.response?.status;
    const body   = err.response?.data;
    console.error('[ZAD] Server Action failed:', status, (typeof body === 'string' ? body : JSON.stringify(body || err.message)).slice(0, 500));
    return { success: false, zadSubId: null, txId: null };
  }
}

module.exports = { getAddress, getBalance, getSTXPrice, sweepWallet, assignWallet, submitBountyOnChain, getFeeWalletInfo, submitToZADWebAPI };
