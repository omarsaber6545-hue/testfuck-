const db = require('../../database/db');
const { isGameChannelAllowed } = require('../../config/owners');
const { createCard, createRow, createButton, ButtonStyle, COLORS, errorCard } = require('../utils/components');

async function handleXOCommand(message, args = []) {
  if (!isGameChannelAllowed(message.channel)) {
    return message.reply({ embeds: [errorCard('روم غير مسموح', 'ألعاب السيرفر غير مصرح بها في هذا الروم.')] });
  }

  const opponent = message.mentions.users.first();
  if (!opponent) {
    return message.reply({ embeds: [errorCard('تحديد المنافس مفقود', 'طريقة الاستخدام: `xo @user` أو `إكس_أو @user`')] });
  }

  if (opponent.id === message.author.id) {
    return message.reply({ embeds: [errorCard('غير مسموح', 'لا يمكنك خوض مباراة XO ضد نفسك!')] });
  }

  if (opponent.bot) {
    return message.reply({ embeds: [errorCard('غير مسموح', 'لا يمكنك تحدي البوتات!')] });
  }

  const playerX = message.author;
  const playerO = opponent;
  const board = Array(9).fill(null);
  let currentTurn = playerX.id; // X starts

  const renderBoardRows = (disabled = false) => {
    const rows = [];
    for (let r = 0; r < 3; r++) {
      const btns = [];
      for (let c = 0; c < 3; c++) {
        const idx = r * 3 + c;
        const val = board[idx];
        btns.push(
          createButton({
            customId: `xo_cell_${idx}`,
            label: val || '‎',
            style: val === 'X' ? ButtonStyle.Primary : val === 'O' ? ButtonStyle.Danger : ButtonStyle.Secondary,
            disabled: disabled || val !== null
          })
        );
      }
      rows.push(createRow(...btns));
    }
    return rows;
  };

  const checkWinner = () => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    if (board.every(cell => cell !== null)) return 'TIE';
    return null;
  };

  const card = createCard({
    title: 'تحدي إكس أو (Tic-Tac-Toe)',
    description: `مباراة تفاعلية بين:\n• **اللاعب الأول (X):** <@${playerX.id}>\n• **اللاعب الثاني (O):** <@${playerO.id}>\n\n👉 الدور الحالي عند: <@${currentTurn}>`,
    color: COLORS.primary,
    footer: 'انقر على المربع لوضع حركتك'
  });

  const gameMsg = await message.reply({
    content: `<@${playerO.id}>، لقد تحداك <@${playerX.id}> في مواجهة XO!`,
    embeds: [card],
    components: renderBoardRows()
  });

  const collector = gameMsg.createMessageComponentCollector({
    time: 90000
  });

  collector.on('collect', async i => {
    if (i.user.id !== currentTurn) {
      return i.reply({ content: `ليس دورك الآن! الدور عند <@${currentTurn}>.`, ephemeral: true });
    }

    const idx = parseInt(i.customId.replace('xo_cell_', ''), 10);
    if (board[idx] !== null) {
      return i.reply({ content: 'هذا المربع مأخوذ بالفعل!', ephemeral: true });
    }

    board[idx] = currentTurn === playerX.id ? 'X' : 'O';
    const result = checkWinner();

    if (result) {
      collector.stop(result);
      if (result === 'TIE') {
        return i.update({
          embeds: [createCard({ title: 'تعادل في مباراة XO', description: 'انتهت المباراة بالتعادل بين الطرفين!', color: COLORS.muted })],
          components: renderBoardRows(true)
        });
      } else {
        const winner = result === 'X' ? playerX : playerO;
        // Reward winner: 15 points + 500 cash
        const winnerData = db.getUser(message.guild.id, winner.id);
        winnerData.gamePoints = (winnerData.gamePoints || 0) + 15;
        winnerData.cash = (winnerData.cash || 0) + 500;
        db.updateUser(message.guild.id, winner.id, winnerData);

        return i.update({
          embeds: [createCard({
            title: 'انتصار في مباراة XO',
            description: `🎉 انتصر اللاعب <@${winner.id}> (${result}) بذكاء!\n\n• الجائزة المكتسبة:\n  - نقاط ألعاب: **+15 نقطة 🏆**\n  - كاش: **+500 💵**\n\nإجمالي نقاطه: **${winnerData.gamePoints.toLocaleString()}**`,
            color: COLORS.success
          })],
          components: renderBoardRows(true)
        });
      }
    }

    // Switch turn
    currentTurn = currentTurn === playerX.id ? playerO.id : playerX.id;

    const nextCard = createCard({
      title: 'تحدي إكس أو (Tic-Tac-Toe)',
      description: `• **اللاعب الأول (X):** <@${playerX.id}>\n• **اللاعب الثاني (O):** <@${playerO.id}>\n\n👉 الدور الحالي عند: <@${currentTurn}>`,
      color: COLORS.primary
    });

    await i.update({ embeds: [nextCard], components: renderBoardRows() });
  });

  collector.on('end', (_, reason) => {
    if (reason === 'time') {
      gameMsg.edit({
        embeds: [errorCard('انتهت مهلة المباراة', 'توقفت مباراة XO بسبب تجاوز مهلة اللعب.')],
        components: renderBoardRows(true)
      }).catch(() => {});
    }
  });
}

module.exports = { handleXOCommand };
