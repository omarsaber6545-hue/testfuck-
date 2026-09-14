const db = require('../../database/db');
const { successCard, errorCard } = require('../utils/components');

async function handleDeposit(message, args = []) {
  const user = db.getUser(message.guild.id, message.author.id);
  const currentCash = user.cash || 0;

  if (currentCash <= 0) {
    return message.reply({ embeds: [errorCard('إيداع غير ممكن', 'لا تملك أي كاش في محفظتك لإيداعه بالبنك.')] });
  }

  const rawAmount = (args[0] || '').toLowerCase().trim();
  let amount = 0;

  if (rawAmount === 'الكل' || rawAmount === 'all') {
    amount = currentCash;
  } else {
    amount = parseInt(rawAmount, 10);
  }

  if (isNaN(amount) || amount <= 0) {
    return message.reply({ embeds: [errorCard('صيغة غير صحيحة', 'يرجى تحديد المبلغ المراد إيداعه.\nمثال: `ايداع 500` أو `ايداع الكل`')] });
  }

  if (amount > currentCash) {
    return message.reply({ embeds: [errorCard('رصيد غير كافٍ', `المبلغ المطلوب إيداعه أكبر من رصيدك في المحفظة (${currentCash.toLocaleString()} 💵).`)] });
  }

  user.cash = currentCash - amount;
  user.bank = (user.bank || 0) + amount;
  db.updateUser(message.guild.id, message.author.id, user);

  return message.reply({
    embeds: [successCard('تم الإيداع بنجاح', `تم إيداع **${amount.toLocaleString()} 💵** في حسابك البنكي.\n• رصيد البنك الحالي: **${user.bank.toLocaleString()} 💵**\n• الكاش المتبقي: **${user.cash.toLocaleString()} 💵**`)]
  });
}

async function handleWithdraw(message, args = []) {
  const user = db.getUser(message.guild.id, message.author.id);
  const currentBank = user.bank || 0;

  if (currentBank <= 0) {
    return message.reply({ embeds: [errorCard('سحب غير ممكن', 'لا تملك أي رصيد في حسابك البنكي للسحب.')] });
  }

  const rawAmount = (args[0] || '').toLowerCase().trim();
  let amount = 0;

  if (rawAmount === 'الكل' || rawAmount === 'all') {
    amount = currentBank;
  } else {
    amount = parseInt(rawAmount, 10);
  }

  if (isNaN(amount) || amount <= 0) {
    return message.reply({ embeds: [errorCard('صيغة غير صحيحة', 'يرجى تحديد المبلغ المراد سحبه.\nمثال: `سحب 500` أو `سحب الكل`')] });
  }

  if (amount > currentBank) {
    return message.reply({ embeds: [errorCard('رصيد بنكي غير كافٍ', `المبلغ المطلوب سحبه أكبر من رصيدك البنكي (${currentBank.toLocaleString()} 💵).`)] });
  }

  user.bank = currentBank - amount;
  user.cash = (user.cash || 0) + amount;
  db.updateUser(message.guild.id, message.author.id, user);

  return message.reply({
    embeds: [successCard('تم السحب بنجاح', `تم سحب **${amount.toLocaleString()} 💵** من البنك إلى محفظتك.\n• رصيدك في المحفظة الآن: **${user.cash.toLocaleString()} 💵**\n• الرصيد البنكي المتبقي: **${user.bank.toLocaleString()} 💵**`)]
  });
}

module.exports = {
  handleDeposit,
  handleWithdraw
};
