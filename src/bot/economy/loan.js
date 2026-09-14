const db = require('../../database/db');
const { createCard, successCard, errorCard, COLORS } = require('../utils/components');

// 1. قرض (Bank Loan)
async function handleLoan(message, args = []) {
  const user = db.getUser(message.guild.id, message.author.id);
  const maxLoan = 5000;

  if (user.loan && user.loan > 0) {
    return message.reply({ embeds: [errorCard('لديك قرض قائم', `عليك قرض بنكي غير مسدد بقيمة **${user.loan.toLocaleString()} 💵**.\nيجب تسديده أولاً عبر أمر: \`سداد\`.`)] });
  }

  const requestedAmount = parseInt(args[0], 10) || 2000;
  const loanAmount = Math.min(Math.max(500, requestedAmount), maxLoan);
  const repaymentAmount = Math.floor(loanAmount * 1.10); // 10% interest

  user.cash = (user.cash || 0) + loanAmount;
  user.loan = repaymentAmount;
  db.updateUser(message.guild.id, message.author.id, user);

  const embed = createCard({
    title: 'موافقة على القرض البنكي',
    description: `تم إيداع القرض في محفظتك بنجاح:\n\n• مبلغ القرض المستلم: **+${loanAmount.toLocaleString()} 💵**\n• إجمالي المبلغ المطلوب سداده (مع فائدة 10%): **${repaymentAmount.toLocaleString()} 💵**\n• سدد القرض في أي وقت عبر أمر: \`سداد\``,
    color: COLORS.primary,
    footer: 'البنك المركزي للسيرفر'
  });

  return message.reply({ embeds: [embed] });
}

// 2. سداد (Repay Loan)
async function handleRepay(message) {
  const user = db.getUser(message.guild.id, message.author.id);
  const debt = user.loan || 0;

  if (debt <= 0) {
    return message.reply({ embeds: [errorCard('لا توجد ديون', 'سجلك المالي نظيف ولا توجد عليك أي قروض بنكية!')] });
  }

  const userCash = user.cash || 0;
  if (userCash < debt) {
    return message.reply({ embeds: [errorCard('رصيد غير كافٍ للسداد', `المبلغ المطلوب لسداد كامل القرض هو **${debt.toLocaleString()} 💵**، بينما كاش محفظتك هو **${userCash.toLocaleString()} 💵**.`)] });
  }

  user.cash -= debt;
  user.loan = 0;
  db.updateUser(message.guild.id, message.author.id, user);

  return message.reply({
    embeds: [successCard('تم سداد القرض بالكامل', `سددت كامل القرض البنكي البالغ **${debt.toLocaleString()} 💵** بنجاح!\n• محفظتك الآن: **${user.cash.toLocaleString()} 💵**`)]
  });
}

// 3. بقشيش (Tip / Small relief)
async function handleTip(message) {
  const user = db.getUser(message.guild.id, message.author.id);
  const now = Date.now();
  const cooldownMs = 15 * 60 * 1000; // 15 mins
  const timePassed = now - (user.lastTip || 0);

  if (timePassed < cooldownMs) {
    const remMins = Math.ceil((cooldownMs - timePassed) / 60000);
    return message.reply({ embeds: [errorCard('انتظر قليلاً', `طلبت بقشيشاً مؤخراً. يمكنك المحاولة بعد: **${remMins} دقيقة**.`)] });
  }

  const tipAmount = Math.floor(Math.random() * 200) + 100;
  user.cash = (user.cash || 0) + tipAmount;
  user.lastTip = now;
  db.updateUser(message.guild.id, message.author.id, user);

  return message.reply({
    embeds: [createCard({
      title: 'إكرامية وبقشيش',
      description: `تلقيت إكرامية صغيرة بقيمة **+${tipAmount} 💵** في محفظتك.\n• رصيدك: **${user.cash.toLocaleString()} 💵**`,
      color: COLORS.primary
    })]
  });
}

// 4. كشف (Inspect player record)
async function handleInspect(message, args = []) {
  const target = message.mentions.users.first() || message.author;
  const user = db.getUser(message.guild.id, target.id);
  const now = Date.now();

  const isProtected = user.shieldUntil && user.shieldUntil > now;
  const shieldStatus = isProtected
    ? `نشط (متبقي ${Math.ceil((user.shieldUntil - now) / 3600000)} ساعة)`
    : 'غير محمي (عرضة للسرقة)';

  const loanText = (user.loan || 0) > 0 ? `${(user.loan || 0).toLocaleString()} 💵 (مستحق)` : 'لا توجد ديون';

  const embed = createCard({
    title: `السجل المالي والأمني: ${target.username}`,
    color: isProtected ? COLORS.success : COLORS.primary,
    fields: [
      { name: 'الكاش في المحفظة', value: `\`${(user.cash || 0).toLocaleString()} 💵\``, inline: true },
      { name: 'الودائع بالبنك', value: `\`${(user.bank || 0).toLocaleString()} 💵\``, inline: true },
      { name: 'رصيد الذهب', value: `\`${(user.gold || 0).toLocaleString()} 🪙\``, inline: true },
      { name: 'المهنة والوظيفة', value: `\`${user.job || 'عاطل عن العمل'}\``, inline: true },
      { name: 'درع الحماية', value: `\`${shieldStatus}\``, inline: true },
      { name: 'القروض البنكية', value: `\`${loanText}\``, inline: true },
      { name: 'إجمالي المسروقات', value: `\`${(user.totalRobbed || 0).toLocaleString()} 💵\``, inline: true },
      { name: 'المستوى والخبرة', value: `Level **${user.level || 1}** (${user.xp || 0} XP)`, inline: true }
    ],
    thumbnail: target.displayAvatarURL({ size: 128 }),
    footer: `معرف الحساب: ${target.id}`,
    timestamp: true
  });

  return message.reply({ embeds: [embed] });
}

// 5. الوقت (Remaining cooldowns)
async function handleCooldowns(message) {
  const user = db.getUser(message.guild.id, message.author.id);
  const now = Date.now();

  const dailyCooldown = 24 * 60 * 60 * 1000;
  const robCooldown = 2 * 60 * 60 * 1000;
  const tipCooldown = 15 * 60 * 1000;
  const workCooldown = 60 * 60 * 1000; // Default 60 mins

  const calcRem = (lastTime, dur) => {
    const passed = now - (lastTime || 0);
    if (passed >= dur) return 'متاح الآن للطلب';
    const rem = dur - passed;
    const hours = Math.floor(rem / 3600000);
    const mins = Math.ceil((rem % 3600000) / 60000);
    return `متبقي: ${hours > 0 ? `${hours} س و ` : ''}${mins} دقيقة`;
  };

  const isProtected = user.shieldUntil && user.shieldUntil > now;
  const shieldRem = isProtected
    ? `نشط حتى ${new Date(user.shieldUntil).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`
    : 'غير مفعل (استخدم أمر `حماية`)';

  const embed = createCard({
    title: `عداد المهلات والأوقات: ${message.author.username}`,
    color: COLORS.primary,
    fields: [
      { name: 'الراتب والوظيفة (`راتب`)', value: `\`${calcRem(user.lastWork, workCooldown)}\``, inline: false },
      { name: 'الهدية اليومية (`هدية`)', value: `\`${calcRem(user.lastDaily, dailyCooldown)}\``, inline: false },
      { name: 'النهب والسرقة (`نهب`)', value: `\`${calcRem(user.lastRob, robCooldown)}\``, inline: false },
      { name: 'البقشيش (`بقشيش`)', value: `\`${calcRem(user.lastTip, tipCooldown)}\``, inline: false },
      { name: 'درع الحماية (`حماية`)', value: `\`${shieldRem}\``, inline: false }
    ],
    footer: 'يتم تحديث التوقيت بشكل مستمر',
    timestamp: true
  });

  return message.reply({ embeds: [embed] });
}

module.exports = {
  handleLoan,
  handleRepay,
  handleTip,
  handleInspect,
  handleCooldowns
};
