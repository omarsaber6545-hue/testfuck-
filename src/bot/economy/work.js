const db = require('../../database/db');
const { getJobsConfig } = require('./jobs');
const { createCard, successCard, errorCard, COLORS } = require('../utils/components');

async function handleWork(message) {
  const user = db.getUser(message.guild.id, message.author.id);
  const jobs = getJobsConfig();

  if (!user.job) {
    return message.reply({
      embeds: [errorCard('عاطل عن العمل', 'أنت لا تملك أي وظيفة حالياً!\nاستخدم أمر `وظائف` لاستعراض الوظائف وشرائها بعملة الذهب ثم ابدأ العمل.')]
    });
  }

  const job = jobs.find(j => j.id === user.job);
  if (!job) {
    user.job = null;
    db.updateUser(message.guild.id, message.author.id, user);
    return message.reply({ embeds: [errorCard('وظيفة غير متوفرة', 'تم تحديث قائمة الوظائف وأصبحت وظيفتك السابقة ملغاة. يرجى اختيار وظيفة جديدة عبر `وظائف`.')] });
  }

  const now = Date.now();
  const cooldownMs = (job.cooldownMinutes || 60) * 60 * 1000;
  const lastWork = user.lastWork || 0;
  const timePassed = now - lastWork;

  if (timePassed < cooldownMs) {
    const remainingMs = cooldownMs - timePassed;
    const remainingMins = Math.ceil(remainingMs / 60000);
    return message.reply({
      embeds: [errorCard('أنت في فترة راحة', `لقد عملت مؤخراً في وظيفة **${job.name}**.\n• يرجى الانتظار: **${remainingMins} دقيقة** قبل استلام الراتب القادم.`)]
    });
  }

  // Calculate earnings
  const cashSalary = Math.floor(Math.random() * (job.salaryCashMax - job.salaryCashMin + 1)) + job.salaryCashMin;
  const goldSalary = job.salaryGold || 1;
  const xpEarned = 25;

  user.cash = (user.cash || 0) + cashSalary;
  user.gold = (user.gold || 0) + goldSalary;
  user.xp = (user.xp || 0) + xpEarned;
  user.lastWork = now;

  // Level up check: Level N requires N * 100 XP
  let leveledUp = false;
  const requiredXp = (user.level || 1) * 100;
  if (user.xp >= requiredXp) {
    user.level = (user.level || 1) + 1;
    user.xp = 0;
    user.gold += 2; // Bonus gold on level up
    leveledUp = true;
  }

  db.updateUser(message.guild.id, message.author.id, user);

  let desc = `أنهيت نوبتك كـ **${job.name}** بنجاح واستلمت مستحقاتك:\n` +
    `• الكاش: **+${cashSalary.toLocaleString()} 💵**\n` +
    `• الذهب: **+${goldSalary.toLocaleString()} 🪙**\n` +
    `• نقاط الخبرة: **+${xpEarned} XP**`;

  if (leveledUp) {
    desc += `\n\n🎉 **مبروك! ارتقيت إلى المستوى ${user.level}!** وحصلت على **+2 🪙 ذهب** هدية ترقية!`;
  }

  const embed = createCard({
    title: 'استلام الراتب والعمل',
    description: desc,
    color: COLORS.success,
    footer: `المهلة القادمة: بعد ${job.cooldownMinutes} دقيقة`,
    timestamp: true
  });

  return message.reply({ embeds: [embed] });
}

module.exports = { handleWork };
