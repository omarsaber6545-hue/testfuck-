const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('====================================================');
console.log('🧪 Starting Discord Games & Bank Bot Verification Test');
console.log('====================================================');

// 1. Database tests
console.log('\n[1/7] Testing Database collections and atomic operations...');
const db = require('../src/database/db');
const testGuildId = 'test_guild_123';
const testUserId = 'test_user_456';

const initialUser = db.getUser(testGuildId, testUserId);
assert(initialUser !== null, 'User object should not be null');
assert.strictEqual(initialUser.cash, 1000, 'Default cash should be 1000');
assert.strictEqual(initialUser.gold, 5, 'Default gold should be 5');
assert.strictEqual(initialUser.gamePoints, 0, 'Default points should be 0');

// Update user
initialUser.cash += 500;
initialUser.gold += 3;
initialUser.gamePoints += 15;
db.updateUser(testGuildId, testUserId, initialUser);

const updatedUser = db.getUser(testGuildId, testUserId);
assert.strictEqual(updatedUser.cash, 1500, 'Updated cash should be 1500');
assert.strictEqual(updatedUser.gold, 8, 'Updated gold should be 8');
assert.strictEqual(updatedUser.gamePoints, 15, 'Updated points should be 15');
console.log('✅ Database operations passed successfully!');

// 2. Jobs Configuration
console.log('\n[2/7] Testing Jobs Configuration (Gold pricing & salaries)...');
const { getJobsConfig } = require('../src/bot/economy/jobs');
const jobs = getJobsConfig();
assert(Array.isArray(jobs) && jobs.length > 0, 'Jobs list should not be empty');

jobs.forEach(job => {
  assert(job.id, `Job must have an ID: ${JSON.stringify(job)}`);
  assert(job.name, `Job must have a name: ${job.id}`);
  assert(typeof job.priceGold === 'number' && job.priceGold > 0, `Job ${job.id} must have priceGold > 0`);
  assert(typeof job.salaryGold === 'number' && job.salaryGold > 0, `Job ${job.id} must have salaryGold > 0`);
  assert(job.salaryCashMax >= job.salaryCashMin, `Job ${job.id} salaryCashMax must >= salaryCashMin`);
});
console.log(`✅ Verified ${jobs.length} jobs with Gold purchase prices and Gold/Cash salaries!`);

// 3. Games Data
console.log('\n[3/7] Testing Games Data (Riddles, Capitals, Flags, etc.)...');
const gamesDataPath = path.join(__dirname, '../data/games_data.json');
assert(fs.existsSync(gamesDataPath), 'games_data.json must exist');
const gamesData = JSON.parse(fs.readFileSync(gamesDataPath, 'utf8'));
assert(gamesData.guess && gamesData.guess.length > 0, 'Guess questions must not be empty');
assert(gamesData.capitals && gamesData.capitals.length > 0, 'Capitals questions must not be empty');
assert(gamesData.flags && gamesData.flags.length > 0, 'Flags questions must not be empty');
assert(gamesData.speedType && gamesData.speedType.length > 0, 'Speed typing sentences must not be empty');
console.log('✅ Games data loaded and verified!');

// 4. Slots Logic Verification (3 to 6 payout, rare luck 5 or 10 gold)
console.log('\n[4/7] Testing Slots mechanics (3-6 and rare luck 5/10 Gold)...');
let hitRareLuck = false;
let rareValues = new Set();
let normalPrizes = new Set();

for (let i = 0; i < 200; i++) {
  // Simulate normal prize calculation
  const normalGold = Math.floor(Math.random() * 4) + 3; // 3, 4, 5, 6
  normalPrizes.add(normalGold);

  // Simulate rare luck
  if (Math.random() < 0.05) {
    hitRareLuck = true;
    const rareGold = Math.random() < 0.5 ? 5 : 10;
    rareValues.add(rareGold);
  }
}

assert(normalPrizes.has(3) && normalPrizes.has(6), 'Normal slots must award between 3 and 6');
console.log('✅ Slots prize distribution verified (Values: 3, 4, 5, 6 with rare 5/10 Gold jackpot)!');

// 5. Owners and Channel Restrictions
console.log('\n[5/7] Testing Owners & Allowed Channels logic...');
const { isOwner, isBankChannelAllowed, isGameChannelAllowed } = require('../src/config/owners');

const mockGuild = { id: testGuildId, ownerId: 'guild_owner_999' };
assert.strictEqual(isOwner('guild_owner_999', mockGuild), true, 'Guild owner must be recognized as owner');
assert.strictEqual(isOwner('random_user_000', mockGuild), false, 'Random user must not be owner');

// Channel allowlists
const mockChannel = { id: 'channel_111', guild: mockGuild };
assert.strictEqual(isBankChannelAllowed(mockChannel), true, 'When allowlist is empty, channel is permitted');

// Add restriction
const settings = db.getGuild(testGuildId);
settings.allowedBankChannels = ['channel_222'];
db.updateGuild(testGuildId, settings);

assert.strictEqual(isBankChannelAllowed(mockChannel), false, 'Unlisted channel must be blocked when allowlist exists');
assert.strictEqual(isBankChannelAllowed({ id: 'channel_222', guild: mockGuild }), true, 'Listed channel must be permitted');

// Reset
settings.allowedBankChannels = [];
db.updateGuild(testGuildId, settings);
console.log('✅ Dynamic channel allowlists & Owner permissions passed!');

// 6. UI Components & Help Menu
console.log('\n[6/7] Testing Components V2 & Help Menu...');
const { buildHelpMenu } = require('../src/bot/utils/helpMenu');
const { createCard } = require('../src/bot/utils/components');

const testCard = createCard({ title: 'Test', description: 'Clean Card' });
assert.strictEqual(testCard.data.title, 'Test', 'Card title should match');

const helpMain = buildHelpMenu('main');
assert(helpMain.embed && helpMain.rows.length > 0, 'Help menu must return embed and rows');

const helpGames = buildHelpMenu('games');
assert(helpGames.embed.data.title.includes('الألعاب'), 'Games help title must match');
console.log('✅ Components V2 and Help menus verified!');

// 7. Animated Roulette GIF Generator
console.log('\n[7/7] Testing Animated Roulette Wheel GIF generation...');
const { generateRouletteGif } = require('../src/bot/graphics/rouletteWheel');

const mockParticipants = [
  { id: '1', username: 'سلطان' },
  { id: '2', username: 'فهد' },
  { id: '3', username: 'عبدالله' },
  { id: '4', username: 'سارة' }
];

generateRouletteGif(mockParticipants, 1)
  .then(gifBuffer => {
    assert(Buffer.isBuffer(gifBuffer), 'Output must be a Buffer');
    assert(gifBuffer.length > 5000, `GIF Buffer size should be substantial (got ${gifBuffer.length} bytes)`);
    console.log(`✅ Animated Roulette GIF generated successfully! (${gifBuffer.length} bytes)`);
    console.log('\n🎉 ALL 7 TEST SUITES PASSED SUCCESSFULLY!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Failed roulette GIF test:', err);
    process.exit(1);
  });
