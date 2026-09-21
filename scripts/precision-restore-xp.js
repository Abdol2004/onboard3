// Precision restore: use EXACT original taskXp values captured from the bad script's output.
// Adjusts the difference between what emergency-restore gave vs the true original.
require('dotenv').config();
const mongoose = require('mongoose');
const UserQuestProgress = require('../models/UserQuestProgress');
const User = require('../models/User');

// Exact original taskXp values from fix-all-xp.js output before it was killed
// Format: [username, questId, originalTaskXp]
const ORIGINALS = [
  // Quest: Twitter Premium X 30 People (691accad98869311a99df4ab)
  ['Ayoeth',         '691accad98869311a99df4ab', 350],
  ['OlaWeb305',      '691accad98869311a99df4ab', 369],
  ['bolubtc',        '691accad98869311a99df4ab', 482],
  ['Smartyga',       '691accad98869311a99df4ab', 627],
  ['DegenUnchain',   '691accad98869311a99df4ab', 506],
  ['Davidfx',        '691accad98869311a99df4ab', 601],
  ['DragonCrypt307', '691accad98869311a99df4ab', 315],
  ['web3perfect',    '691accad98869311a99df4ab', 358],
  ['heemanuel',      '691accad98869311a99df4ab', 324],
  ['vibezsolana',    '691accad98869311a99df4ab', 458],
  ['cryptokitty',    '691accad98869311a99df4ab', 355],
  ['blockchainboss', '691accad98869311a99df4ab', 528],
  ['AyindeFX',       '691accad98869311a99df4ab', 360],
  ['CyptBros',       '691accad98869311a99df4ab', 230],

  // Quest: $1K Race to the Top! (6917c15261daa4a5f9ab52fb)
  ['AyindeFX', '6917c15261daa4a5f9ab52fb', 360],
  ['CyptBros',  '6917c15261daa4a5f9ab52fb', 230],
  ['0xGee',     '6917c15261daa4a5f9ab52fb', 555],

  // Quest: Birthday Quest $300 (692a48d5cc81fcb68eb29eb7)
  // NOTE: stored values were 1500-5800, likely a legacy scoring bug.
  // Keeping emergency-restore values (210) which match current task definitions.
  // Uncomment below ONLY if you confirm these large XP amounts were intentional:
  // ['Vitalis',    '692a48d5cc81fcb68eb29eb7', 2964],
  // ['Toshmoney',  '692a48d5cc81fcb68eb29eb7', 5479],
  // ['Khaleel',    '692a48d5cc81fcb68eb29eb7', 5804],
  // ['Oladev',     '692a48d5cc81fcb68eb29eb7', 5076],
  // ['Johnnyweb3', '692a48d5cc81fcb68eb29eb7', 3932],
  // ['Daphs',      '692a48d5cc81fcb68eb29eb7', 4062],
  // ['Kamal',      '692a48d5cc81fcb68eb29eb7', 1527],

  // Quest: Social Media Onboarding Boost (693d995cad4bb7c933ad8f84)
  // Similarly large values — keeping 250 from task definitions
  // ['Johnnyweb3', '693d995cad4bb7c933ad8f84', 3672],
  // ['Alkane',     '693d995cad4bb7c933ad8f84', 1852],
  // ['Olawale',    '693d995cad4bb7c933ad8f84', 3620],
  // ['Krustal',    '693d995cad4bb7c933ad8f84', 2398],
  // ['Nnamdi',     '693d995cad4bb7c933ad8f84', 2366],
  // ['Kamal',      '693d995cad4bb7c933ad8f84', 1527],
  // ['Daphs',      '693d995cad4bb7c933ad8f84', 1462],

  // Quest: Christmas and New Year Quest (694d87caac67a59d9cbf0d85)
  // Alkane's original (195) < current restored (400): need to correct DOWN
  ['Alkane', '694d87caac67a59d9cbf0d85', 195],
  // Others: original > restored, correct UP
  ['Daphs',      '694d87caac67a59d9cbf0d85', 682],
  ['Kamal',      '694d87caac67a59d9cbf0d85', 637],
  ['Johnnyweb3', '694d87caac67a59d9cbf0d85', 643],
  ['Krustal',    '694d87caac67a59d9cbf0d85', 422],
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  let fixed = 0;

  for (const [username, questId, targetTaskXp] of ORIGINALS) {
    const user = await User.findOne({ username }).lean();
    if (!user) { console.log(`User not found: ${username}`); continue; }

    const prog = await UserQuestProgress.findOne({ userId: user._id, questId });
    if (!prog) { console.log(`Progress not found: ${username} / ${questId}`); continue; }

    const currentTaskXp = prog.xpBreakdown.taskXp || 0;
    const diff = targetTaskXp - currentTaskXp;
    if (diff === 0) { console.log(`${username} already correct (${targetTaskXp})`); continue; }

    prog.xpBreakdown.taskXp = targetTaskXp;
    prog.xpBreakdown.totalXp =
      targetTaskXp +
      (prog.xpBreakdown.baseXp || 0) +
      (prog.xpBreakdown.referralJoinBonus || 0) +
      (prog.xpBreakdown.referralCompleteBonus || 0) +
      (prog.xpBreakdown.winnerBonus || 0);
    prog.markModified('xpBreakdown');
    await prog.save();

    const userDoc = await User.findById(user._id);
    userDoc.xp += diff;
    await userDoc.save();

    console.log(`${username} / ${questId}: taskXp ${currentTaskXp} → ${targetTaskXp} (user.xp ${diff > 0 ? '+' : ''}${diff})`);
    fixed++;
  }

  console.log(`\nDone — precision-corrected ${fixed} records.`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
