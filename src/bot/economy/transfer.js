const db = require('../../database/db');
const { successCard, errorCard } = require('../utils/components');

async function handleTransfer(message, args = []) {
  const target = message.mentions.users.first();
  if (!target) {
    return message.reply({ embeds: [errorCard('تحديد العضو مفقود', 'يرجى منشن العضو المراد التحويل له.\nمثال: `تحويل @user 500` أو `تحويل ذهب @user 2`')] });
  }

  if (target.id === message.author.id) {
    return message.reply({ embeds: [errorCard('عملية غير صالحة', 'لا يمكنك تحويل الأموال أو الذهب لنفسك!')] });
  }

  if (target.bot) {
    return message.reply({ embeds: [errorCard('عملية غير صالحة', 'لا يمكن تحويل الرصيد للبوتات.')] });
  }

  // Detect whether it's gold or cash
  const isGoldTransfer = args.some(a => a.includes('ذهب') || a.toLowerCase() === 'gold');

  // Extract numeric amount
  const numArg = args.find(a => !isNaN(parseInt(a, 10)) && !a.startsWith('<@'));
  const amount = parseInt(numArg, 10);

  if (!amount || amount <= 0) {
    return message.reply({ embeds: [errorCard('مبلغ غير صالح', 'يرجى كتابة مبلغ صحيح أكبر من الصفر.')] });
  }

  const sender = db.getUser(message.guild.id, message.author.id);
  const recipient = db.getUser(message.guild.id, target.id);

  if (isGoldTransfer) {
    // Gold transfer
    if ((sender.gold || 0) < amount) {
      return message.reply({ embeds: [errorCard('رصيد ذهب غير كافٍ', `رصيدك الحالي من الذهب هو: **${(sender.gold || 0).toLocaleString()} 🪙**.`)] });
    }

    sender.gold -= amount;
    recipient.gold = (recipient.gold || 0) + amount;

    db.updateUser(message.guild.id, message.author.id, sender);
    db.updateUser(message.guild.id, target.id, recipient);

    return message.reply({
      embeds: [successCard('تم تحويل الذهب بنجاح', `حول <@${message.author.id}> **${amount.toLocaleString()} 🪙 ذهب** إلى <@${target.id}> مباشرة بدون ضرائب.`)]
    });
  } else {
    // Cash transfer with 5% tax
    if ((sender.cash || 0) < amount) {
      return message.reply({ embeds: [errorCard('كاش غير كافٍ', `رصيد محفظتك الحالي هو: **${(sender.cash || 0).toLocaleString()} 💵**.`)] });
    }

    const tax = Math.floor(amount * 0.05);
    const netReceived = amount - tax;

    sender.cash -= amount;
    recipient.cash = (recipient.cash || 0) + netReceived;

    db.updateUser(message.guild.id, message.author.id, sender);
    db.updateUser(message.guild.id, target.id, recipient);

    return message.reply({
      embeds: [successCard('تم تحويل الكاش بنجاح', `حول <@${message.author.id}> **${amount.toLocaleString()} 💵** إلى <@${target.id}>.\n• ضريبة التحويل (5%): **${tax.toLocaleString()} 💵**\n• المبلغ الصافي المستلم: **${netReceived.toLocaleString()} 💵**`)]
    });
  }
}

module.exports = { handleTransfer };
