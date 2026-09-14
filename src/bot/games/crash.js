const db = require('../../database/db');
const { isGameChannelAllowed } = require('../../config/owners');
const { createCard, createRow, createButton, ButtonStyle, COLORS, errorCard } = require('../utils/components');

async function handleCrashCommand(message, args = []) {
  if (!isGameChannelAllowed(message.channel)) {
    return message.reply({ embeds: [errorCard('روم غير مسموح', 'ألعاب السيرفر غير مصرح بها في هذا الروم.')] });
  }

  const bet = Math.max(50, parseInt(args[0], 10) || 100);
  const guildId = message.guild.id;
  const userId = message.author.id;
  const user = db.getUser(guildId, userId);

  if ((user.cash || 0) < bet) {
    return message.reply({ embeds: [errorCard('رصيد غير كافٍ', `الرهان المطلوب: **${bet.toLocaleString()} 💵**، بينما رصيدك: **${(user.cash || 0).toLocaleString()} 💵**.`)] });
  }

  user.cash -= bet;
  db.updateUser(guildId, userId, user);

  // Determine crash point upfront: between 1.20x and 6.00x
  const crashPoint = +(1.15 + Math.random() * Math.random() * 5.0).toFixed(2);
  let currentMultiplier = 1.0;
  let cashedOut = false;

  const buildEmbed = (mult, state = 'running') => {
    let color = COLORS.primary;
    let desc = `🚀 **الصاروخ ينطلق:** \`${mult.toFixed(2)}x\`\n💰 **الأرباح المتوقعة:** \`${Math.floor(bet * mult).toLocaleString()} 💵\`\n\nاضغط على الزر أدناه للسحب قبل أن ينفجر الصاروخ!`;

    if (state === 'cashed') {
      color = COLORS.success;
      desc = `🎉 **سحب ناجح!**\nسحبت عند المضاعف: \`${mult.toFixed(2)}x\`\nربحت: **+${Math.floor(bet * mult).toLocaleString()} 💵** ونقاط فوز!`;
    } else if (state === 'crashed') {
      color = COLORS.danger;
      desc = `💥 **انفجر الصاروخ عند \`${crashPoint.toFixed(2)}x\`!**\nخسرت رهانك البالغ: **-${bet.toLocaleString()} 💵**.`;
    }

    return createCard({
      title: 'صاروخ كراش (Crash)',
      description: desc,
      color,
      footer: `اللاعب: ${message.author.username}`
    });
  };

  const cashBtn = createButton({ customId: 'crash_cashout', label: 'سحب الأرباح الآن', style: ButtonStyle.Success });
  const row = createRow(cashBtn);

  const gameMsg = await message.reply({ embeds: [buildEmbed(1.0)], components: [row] });

  const collector = gameMsg.createMessageComponentCollector({
    time: 25000,
    filter: i => i.user.id === userId
  });

  collector.on('collect', async i => {
    if (i.customId === 'crash_cashout' && !cashedOut) {
      cashedOut = true;
      collector.stop('cashed');

      const winAmount = Math.floor(bet * currentMultiplier);
      const points = 10;
      user.cash += winAmount;
      user.gamePoints = (user.gamePoints || 0) + points;
      db.updateUser(guildId, userId, user);

      await i.update({
        embeds: [buildEmbed(currentMultiplier, 'cashed')],
        components: []
      });
    }
  });

  // Increment multiplier in loop
  const interval = setInterval(async () => {
    if (cashedOut) {
      clearInterval(interval);
      return;
    }

    currentMultiplier = +(currentMultiplier + 0.25).toFixed(2);

    if (currentMultiplier >= crashPoint) {
      clearInterval(interval);
      collector.stop('crashed');
      if (!cashedOut) {
        await gameMsg.edit({
          embeds: [buildEmbed(crashPoint, 'crashed')],
          components: []
        }).catch(() => {});
      }
      return;
    }

    await gameMsg.edit({
      embeds: [buildEmbed(currentMultiplier, 'running')]
    }).catch(() => {
      clearInterval(interval);
    });
  }, 1200);
}

module.exports = { handleCrashCommand };
