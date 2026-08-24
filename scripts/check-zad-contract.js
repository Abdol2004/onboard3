const axios = require('axios');

async function main() {
  try {
    const r = await axios.get(
      'https://api.mainnet.hiro.so/v2/contracts/interface/SP2GW18TVQR75W1VT53HYGBRGKFRV5BFYNAF5SS5J/ZADAO-V2-MultiW-Bounty',
      { timeout: 15000 }
    );
    const fn = r.data.functions.find(f => f.name === 'submit-entry');
    if (fn) {
      console.log('submit-entry found:');
      console.log(JSON.stringify(fn, null, 2));
    } else {
      console.log('submit-entry NOT found. All functions:');
      r.data.functions.forEach(f => console.log(' -', f.name));
    }
  } catch (e) {
    console.log('Error:', e.message);
    // Try alternate contract name
    try {
      const r2 = await axios.get(
        'https://api.mainnet.hiro.so/v2/contracts/interface/SP2GW18TVQR75W1VT53HYGBRGKFRV5BFYNAF5SS5J/zadao-bounty',
        { timeout: 15000 }
      );
      console.log('Found alternate:', r2.data.functions.map(f => f.name));
    } catch (e2) {
      console.log('Alternate also failed:', e2.message);
    }
  }
}
main();
