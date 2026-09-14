const db = require('../../database/db');
const { createCard, createRow, createButton, ButtonStyle, COLORS } = require('../utils/components');

async function handleBalance(message, args = []) {
  const target = message.mentions.users.first() || message.author;
  const user = db.getUser(message.guild.id, target.id);

  const cash = (user.cash || 0).toLocaleString();
  const bank = (user.bank || 0).toLocaleString();
  const gold = (user.gold || 0).toLocaleString();
  const points = (user.gamePoints || 0).toLocaleString();
  const networth = ((user.cash || 0) + (user.bank || 0)).toLocaleString();

  const isSelf = target.id === message.author.id;

  const card = createCard({
    title: `الحساب المالي: ${target.username}`,
    color: COLORS.primary,
    fields: [
      { name: 'الكاش (المحفظة)', value: `\`${cash} 💵\``, inline: true },
      { name: 'البنك (الودائع)', value: `\`${bank} 💵\``, inline: true },
      { name: 'الذهب (العملة النادرة)', value: `\`${gold} 🪙\``, inline: true },
      { name: 'نقاط الألعاب', value: `\`${points} نقطة\``, inline: true },
      { name: 'الوظيفة الحالية', value: `\`${user.job || 'عاطل عن العمل'}\``, inline: true },
      { name: 'إجمالي الثروة', value: `\`${networth} 💵\``, inline: true }
    ],
    thumbnail: target.displayAvatarURL({ size: 128 }),
    footer: `معرف الحساب: ${target.id}`,
    timestamp: true
  });

  if (isSelf) {
    const row = createRow(
      createButton({ customId: 'bank_quick_deposit_all', label: 'إيداع الكل بالبنك', style: ButtonStyle.Success }),
      createButton({ customId: 'bank_quick_withdraw_half', label: 'سحب النصف', style: ButtonStyle.Secondary }),
      createButton({ customId: 'bank_view_cooldowns', label: 'أوقات المهلات', style: ButtonStyle.Primary })
    );
    return message.reply({ embeds: [card], components: [row] });
  }

  return message.reply({ embeds: [card] });
}

module.exports = { handleBalance };
