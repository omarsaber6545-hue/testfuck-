const db = require('../../database/db');
const { isGameChannelAllowed } = require('../../config/owners');
const { createCard, createRow, createButton, ButtonStyle, COLORS, errorCard } = require('../utils/components');

async function handleMinesCommand(message, args = []) {
  if (!isGameChannelAllowed(message.channel)) {
    return message.reply({ embeds: [errorCard('روم غير مسموح', 'ألعاب السيرفر غير مصرح بها في هذا الروم.')] });
  }

  const bet = Math.max(50, parseInt(args[0], 10) || 100);
  const guildId = message.guild.id;
  const userId = message.author.id;
  const user = db.getUser(guildId, userId);

  if ((user.cash || 0) < bet) {
    return message.reply({ embeds: [errorCard('رصيد غير كافٍ', `تكلفة اللعب: **${bet.toLocaleString()} 💵**، بينما رصيدك: **${(user.cash || 0).toLocaleString()} 💵**.`)] });
  }

  user.cash -= bet;
  db.updateUser(guildId, userId, user);

  // 9 cells: 2 mines, 7 gems
  const totalCells = 9;
  const numMines = 2;
  const mineIndices = new Set();
  while (mineIndices.size < numMines) {
    mineIndices.add(Math.floor(Math.random() * totalCells));
  }

  const revealed = Array(totalCells).fill(false);
  let multiplier = 1.0;
  let safeFound = 0;
  let isGameOver = false;

  const renderGridRows = (disabled = false, showMines = false) => {
    const rows = [];
    for (let r = 0; r < 3; r++) {
      const btns = [];
      for (let c = 0; c < 3; c++) {
        const idx = r * 3 + c;
        const isRev = revealed[idx];
        const isMine = mineIndices.has(idx);

        let label = '❓';
        let style = ButtonStyle.Secondary;

        if (isRev) {
          if (isMine) {
            label = '💣';
            style = ButtonStyle.Danger;
          } else {
            label = '💎';
            style = ButtonStyle.Success;
          }
        } else if (showMines && isMine) {
          label = '💣';
          style = ButtonStyle.Danger;
        }

        btns.push(
          createButton({
            customId: `mines_tile_${idx}`,
            label,
            style,
            disabled: disabled || isRev
          })
        );
      }
      rows.push(createRow(...btns));
    }

    if (!disabled && safeFound > 0) {
      rows.push(
        createRow(
          createButton({
            customId: 'mines_cashout',
            label: `سحب الأرباح (${Math.floor(bet * multiplier).toLocaleString()} 💵)`,
            style: ButtonStyle.Success
          })
        )
      );
    }

    return rows;
  };

  const buildEmbed = (status = 'playing') => {
    let color = COLORS.primary;
    let desc = `💎 **الجواهر المكتشفة:** \`${safeFound}/7\`\n📈 **المضاعف الحالي:** \`${multiplier.toFixed(2)}x\`\n💰 **الأرباح:** \`${Math.floor(bet * multiplier).toLocaleString()} 💵\`\n\nاختر مربعاً آمناً أو اسحب أرباحك!`;

    if (status === 'cashed') {
      color = COLORS.success;
      desc = `🎉 **سحب ناجح!**\nسحبت عند المضاعف \`${multiplier.toFixed(2)}x\` وفزت بـ **+${Math.floor(bet * multiplier).toLocaleString()} 💵**!`;
    } else if (status === 'boom') {
      color = COLORS.danger;
      desc = `💥 **انفجر لغم!**\nخسرت رهانك البالغ **-${bet.toLocaleString()} 💵**.`;
    }

    return createCard({
      title: 'حقل الألغام (Mines)',
      description: desc,
      color,
      footer: `اللاعب: ${message.author.username}`
    });
  };

  const gameMsg = await message.reply({ embeds: [buildEmbed('playing')], components: renderGridRows() });

  const collector = gameMsg.createMessageComponentCollector({
    time: 60000,
    filter: i => i.user.id === userId
  });

  collector.on('collect', async i => {
    if (isGameOver) return;

    if (i.customId === 'mines_cashout') {
      isGameOver = true;
      collector.stop('cashed');

      const winAmount = Math.floor(bet * multiplier);
      user.cash += winAmount;
      user.gamePoints = (user.gamePoints || 0) + 12;
      db.updateUser(guildId, userId, user);

      return i.update({
        embeds: [buildEmbed('cashed')],
        components: renderGridRows(true, true)
      });
    }

    const tileIdx = parseInt(i.customId.replace('mines_tile_', ''), 10);
    revealed[tileIdx] = true;

    if (mineIndices.has(tileIdx)) {
      isGameOver = true;
      collector.stop('boom');
      return i.update({
        embeds: [buildEmbed('boom')],
        components: renderGridRows(true, true)
      });
    }

    // Safe tile!
    safeFound++;
    multiplier = +(multiplier + 0.35).toFixed(2);

    if (safeFound === 7) {
      // All gems found!
      isGameOver = true;
      collector.stop('perfect');

      const winAmount = Math.floor(bet * multiplier);
      user.cash += winAmount;
      user.gamePoints = (user.gamePoints || 0) + 30;
      user.gold = (user.gold || 0) + 1; // Bonus gold for clearing all gems
      db.updateUser(guildId, userId, user);

      return i.update({
        embeds: [createCard({
          title: 'تطهير الحقل بالكامل!',
          description: `🏆 كشفت جميع الجواهر الـ 7 بأمان!\nربحت: **+${winAmount.toLocaleString()} 💵** و **+1 🪙 ذهب** و **+30 نقطة**!`,
          color: COLORS.success
        })],
        components: renderGridRows(true, false)
      });
    }

    await i.update({
      embeds: [buildEmbed('playing')],
      components: renderGridRows()
    });
  });

  collector.on('end', (_, reason) => {
    if (reason === 'time' && !isGameOver) {
      gameMsg.edit({
        embeds: [errorCard('انتهت المهلة', 'توقفت لعبة الألغام لانتهاء وقت الاستجابة.')],
        components: renderGridRows(true, true)
      }).catch(() => {});
    }
  });
}

module.exports = { handleMinesCommand };
