const db = require('../../database/db');
const { isGameChannelAllowed } = require('../../config/owners');
const { createCard, errorCard, COLORS } = require('../utils/components');

const SYMBOLS = ['🍎', '🍒', '🍋', '🍇', '💎', '7️⃣'];

async function handleSlotsCommand(message, args = []) {
  if (!isGameChannelAllowed(message.channel)) {
    return message.reply({ embeds: [errorCard('روم غير مسموح', 'ألعاب السيرفر غير مصرح بها في هذا الروم.')] });
  }

  const user = db.getUser(message.guild.id, message.author.id);
  const betCash = Math.max(100, parseInt(args[0], 10) || 200);

  if ((user.cash || 0) < betCash) {
    return message.reply({ embeds: [errorCard('رصيد غير كافٍ', `تكلفة تدوير السلوت هي **${betCash.toLocaleString()} 💵**، بينما كاش محفظتك هو **${(user.cash || 0).toLocaleString()} 💵**.`)] });
  }

  user.cash -= betCash;

  // Spin 3 reels
  const r1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const r2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const r3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

  // Check match
  const isTriple = r1 === r2 && r2 === r3;
  const isDouble = r1 === r2 || r2 === r3 || r1 === r3;

  // Rare luck chance: 5% chance to hit gold jackpot
  const isRareLuck = Math.random() < 0.05;

  let won = false;
  let goldReward = 0;
  let cashReward = 0;
  let pointsReward = 0;
  let winType = '';

  if (isTriple || isRareLuck) {
    won = true;
    pointsReward = 20;

    if (isRareLuck) {
      // Rare luck jackpot: 5 or 10 Gold!
      goldReward = Math.random() < 0.5 ? 5 : 10;
      cashReward = betCash * 5;
      winType = `جاكبوت الحظ النادر (+${goldReward} 🪙 ذهب)!`;
    } else {
      // Normal winning payout: random between 3 to 6
      goldReward = Math.floor(Math.random() * 4) + 3; // 3, 4, 5, or 6
      cashReward = betCash * 3;
      winType = `تطابق ثلاثي كامل (+${goldReward} 🪙 ذهب)!`;
    }
  } else if (isDouble) {
    won = true;
    pointsReward = 5;
    // Double match: returns cash with slight bonus, small chance of 1 gold
    cashReward = Math.floor(betCash * 1.5);
    winType = 'تطابق ثنائي جيد!';
  }

  if (won) {
    user.cash += cashReward;
    user.gold = (user.gold || 0) + goldReward;
    user.gamePoints = (user.gamePoints || 0) + pointsReward;
  }

  db.updateUser(message.guild.id, message.author.id, user);

  let desc = `**[ ${r1} | ${r2} | ${r3} ]**\n\n`;
  if (won) {
    desc += `🎉 **مبروك! ${winType}**\n` +
      (goldReward > 0 ? `• الذهب المكتسب: **+${goldReward} 🪙 ذهب**\n` : '') +
      `• أرباح الكاش: **+${cashReward.toLocaleString()} 💵**\n` +
      `• نقاط الألعاب: **+${pointsReward} نقطة 🏆**\n\n` +
      `رصيدك الآن: **${user.cash.toLocaleString()} 💵** | **${user.gold.toLocaleString()} 🪙 ذهب**`;
  } else {
    desc += `❌ **حظ أوفر! لم تتطابق الرموز.**\nخسرت رهانك البالغ: **-${betCash.toLocaleString()} 💵**\n\nالمحفظة: **${user.cash.toLocaleString()} 💵**`;
  }

  const embed = createCard({
    title: 'ماكينة السلوتس (Slots)',
    description: desc,
    color: won ? (goldReward >= 5 ? COLORS.gold : COLORS.success) : COLORS.danger,
    footer: `اللاعب: ${message.author.username}`,
    timestamp: true
  });

  return message.reply({ embeds: [embed] });
}

module.exports = { handleSlotsCommand };
