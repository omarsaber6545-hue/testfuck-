const db = require('../../database/db');
const { createCard, errorCard, COLORS } = require('../utils/components');

async function handleDaily(message) {
  const user = db.getUser(message.guild.id, message.author.id);
  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000;
  const lastDaily = user.lastDaily || 0;
  const timePassed = now - lastDaily;

  if (timePassed < cooldown) {
    const rem = cooldown - timePassed;
    const hours = Math.floor(rem / 3600000);
    const mins = Math.ceil((rem % 3600000) / 60000);
    return message.reply({
      embeds: [errorCard('الهدية غير متاحة الآن', `لقد استلمت هديتك اليومية مؤخراً.\n• يمكنك العودة بعد: **${hours} ساعة و ${mins} دقيقة**.`)]
    });
  }

  // Calculate streak: if collected within 48h, increment streak; otherwise reset to 1
  let streak = (user.dailyStreak || 0);
  if (timePassed < 48 * 60 * 60 * 1000) {
    streak += 1;
  } else {
    streak = 1;
  }

  // Rewards: Base cash + streak bonus + 1 to 2 gold
  const baseCash = 1000;
  const streakBonus = Math.min(streak * 150, 3000);
  const totalCash = baseCash + streakBonus;
  const goldReward = streak >= 5 ? 2 : 1;

  user.cash = (user.cash || 0) + totalCash;
  user.gold = (user.gold || 0) + goldReward;
  user.dailyStreak = streak;
  user.lastDaily = now;

  db.updateUser(message.guild.id, message.author.id, user);

  const embed = createCard({
    title: 'الهدية والمكافأة اليومية',
    description: `استلمت مكافأتك اليومية بنجاح!\n\n` +
      `• الكاش: **+${totalCash.toLocaleString()} 💵** (يشمل مكافأة ستريك ${streak} أيام)\n` +
      `• الذهب: **+${goldReward} 🪙**\n` +
      `• أيام التتالي (Streak): **${streak} يوم**\n\n` +
      `حافظ على تسجيلك اليومي لزيادة الأرباح!`,
    color: COLORS.gold,
    footer: 'تتاح الهدية مرة واحدة كل 24 ساعة',
    timestamp: true
  });

  return message.reply({ embeds: [embed] });
}

module.exports = { handleDaily };
