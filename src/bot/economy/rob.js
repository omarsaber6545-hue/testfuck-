const db = require('../../database/db');
const { createCard, successCard, errorCard, COLORS } = require('../utils/components');

async function handleRob(message, args = []) {
  const target = message.mentions.users.first();
  if (!target) {
    return message.reply({ embeds: [errorCard('تحديد الهدف مفقود', 'يرجى منشن العضو المراد نهبه.\nمثال: `نهب @user`')] });
  }

  if (target.id === message.author.id) {
    return message.reply({ embeds: [errorCard('خطأ', 'لا يمكنك سرقة نفسك!')] });
  }

  if (target.bot) {
    return message.reply({ embeds: [errorCard('خطأ', 'لا يمكنك سرقة البوتات!')] });
  }

  const robber = db.getUser(message.guild.id, message.author.id);
  const victim = db.getUser(message.guild.id, target.id);
  const now = Date.now();

  const robCooldown = 2 * 60 * 60 * 1000; // 2 hours
  const timePassed = now - (robber.lastRob || 0);

  if (timePassed < robCooldown) {
    const rem = robCooldown - timePassed;
    const mins = Math.ceil(rem / 60000);
    return message.reply({ embeds: [errorCard('النهب غير متاح الآن', `أنت تحت مراقبة الشرطة حالياً.\n• يمكنك المحاولة مجدداً بعد: **${mins} دقيقة**.`)] });
  }

  // Check victim cash
  const victimCash = victim.cash || 0;
  if (victimCash < 200) {
    return message.reply({ embeds: [errorCard('الضحية مفلس', `<@${target.id}> لا يملك سوى **${victimCash} 💵** في محفظته! الأموال المودعة بالبنك محصنة تماماً.`)] });
  }

  // Check victim shield
  if (victim.shieldUntil && victim.shieldUntil > now) {
    const remHours = Math.ceil((victim.shieldUntil - now) / 3600000);
    return message.reply({ embeds: [errorCard('الهدف محمي بالدرع', `<@${target.id}> مفعل درع الحماية ومحصن ضد السرقة لمتبقي **${remHours} ساعة**!`)] });
  }

  robber.lastRob = now;

  // 50% chance
  const success = Math.random() < 0.50;

  if (success) {
    // Steal 15% to 35% of victim's cash
    const percent = 0.15 + Math.random() * 0.20;
    const stolenAmount = Math.max(50, Math.floor(victimCash * percent));

    victim.cash -= stolenAmount;
    robber.cash = (robber.cash || 0) + stolenAmount;
    robber.totalRobbed = (robber.totalRobbed || 0) + stolenAmount;

    db.updateUser(message.guild.id, target.id, victim);
    db.updateUser(message.guild.id, message.author.id, robber);

    const embed = createCard({
      title: 'عملية نهب ناجحة',
      description: `تمكن <@${message.author.id}> من التسلل ونهب محفظة <@${target.id}>!\n\n• المبلغ المنهوب: **+${stolenAmount.toLocaleString()} 💵**\n• محفظتك الآن: **${robber.cash.toLocaleString()} 💵**`,
      color: COLORS.success,
      footer: 'نظام العمليات المالية المشبوهة',
      timestamp: true
    });

    return message.reply({ embeds: [embed] });
  } else {
    // Failed: Pay police fine
    const fine = Math.min(robber.cash || 0, 500);
    if (fine > 0) {
      robber.cash -= fine;
      // Compensate victim half the fine
      victim.cash = (victim.cash || 0) + Math.floor(fine / 2);
      db.updateUser(message.guild.id, target.id, victim);
    }
    db.updateUser(message.guild.id, message.author.id, robber);

    const embed = createCard({
      title: 'فشلت عملية النهب',
      description: `تم كشف <@${message.author.id}> أثناء محاولة سرقة <@${target.id}> وألقت الشرطة القبض عليه!\n\n• الغرامة المفروضة: **-${fine.toLocaleString()} 💵** تم تحويل جزء منها كتعويض للمتضرر.`,
      color: COLORS.danger,
      footer: 'مهلة المحاولة القادمة: ساعتان',
      timestamp: true
    });

    return message.reply({ embeds: [embed] });
  }
}

async function handleShield(message) {
  const user = db.getUser(message.guild.id, message.author.id);
  const now = Date.now();
  const shieldPriceCash = 2500;
  const shieldDurationMs = 24 * 60 * 60 * 1000; // 24 hours

  if (user.shieldUntil && user.shieldUntil > now) {
    const remHours = Math.ceil((user.shieldUntil - now) / 3600000);
    return message.reply({ embeds: [errorCard('الدرع مفعل بالفعل', `درع الحماية الخاص بك لا يزال نشطاً ومتبقي له: **${remHours} ساعة**.`)] });
  }

  if ((user.cash || 0) < shieldPriceCash) {
    return message.reply({ embeds: [errorCard('رصيد غير كافٍ', `تكلفة تفعيل درع الحماية لمدة 24 ساعة هي **${shieldPriceCash.toLocaleString()} 💵**.\nرصيدك الحالي: **${(user.cash || 0).toLocaleString()} 💵**.`)] });
  }

  user.cash -= shieldPriceCash;
  user.shieldUntil = now + shieldDurationMs;
  db.updateUser(message.guild.id, message.author.id, user);

  return message.reply({
    embeds: [successCard('تم تفعيل درع الحماية', `تم تفعيل الدرع بنجاح لمدة **24 ساعة**!\n• أصبحت محفظتك الآن محصنة بالكامل ضد محاولات السرقة والنهب.\n• الكاش المتبقي: **${user.cash.toLocaleString()} 💵**`)]
  });
}

module.exports = {
  handleRob,
  handleShield
};
