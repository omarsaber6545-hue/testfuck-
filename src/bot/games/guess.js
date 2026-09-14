const fs = require('fs');
const path = require('path');
const db = require('../../database/db');
const { isGameChannelAllowed } = require('../../config/owners');
const { createCard, errorCard, COLORS } = require('../utils/components');

function getGamesData() {
  const filePath = path.join(__dirname, '../../../data/games_data.json');
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading games_data.json:', err);
  }
  return { guess: [] };
}

function normalizeArabic(text) {
  return (text || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, ''); // Remove tashkeel
}

// Active guess game per channel to prevent overlapping
const activeGuessGames = new Set();

async function handleGuessCommand(message) {
  const channelId = message.channel.id;
  const guildId = message.guild.id;

  if (!isGameChannelAllowed(message.channel)) {
    return message.reply({ embeds: [errorCard('روم غير مسموح', 'ألعاب السيرفر غير مصرح بها في هذا الروم.')] });
  }

  if (activeGuessGames.has(channelId)) {
    return message.reply({ embeds: [errorCard('لعبة جارية', 'توجد لعبة خمن نشطة حالياً في هذا الروم! أجب على السؤال المطروح أولاً.')] });
  }

  const data = getGamesData();
  const list = data.guess || [];
  if (list.length === 0) {
    return message.reply('❌ لا توجد أسئلة متوفرة حالياً.');
  }

  const item = list[Math.floor(Math.random() * list.length)];
  let expectedAnswers = [];
  let questionText = item.question;

  if (item.isRandomNumber) {
    const targetNum = Math.floor(Math.random() * (item.max - item.min + 1)) + item.min;
    expectedAnswers = [targetNum.toString()];
    questionText = `${item.question} (بين ${item.min} و ${item.max})`;
  } else {
    expectedAnswers = (item.answers || []).map(a => normalizeArabic(a));
  }

  activeGuessGames.add(channelId);

  const embed = createCard({
    title: 'تحدي خمن (جائزة 3 ذهب)',
    description: `**${questionText}**\n\nأول شخص يكتب الإجابة الصحيحة في الشات يفوز بـ:\n• **3 🪙 ذهب خالص**\n• **15 نقطة فوز 🏆**\n• **500 💵 كاش**`,
    color: COLORS.gold,
    footer: 'معكم 30 ثانية للإجابة بالشات مباشرة'
  });

  await message.reply({ embeds: [embed] });

  const filter = m => !m.author.bot;
  const collector = message.channel.createMessageCollector({
    filter,
    time: 30000
  });

  let won = false;

  collector.on('collect', async m => {
    if (won) return;
    const input = normalizeArabic(m.content);

    const isCorrect = expectedAnswers.some(ans => input === ans || (ans.length > 2 && input.includes(ans)));
    if (isCorrect) {
      won = true;
      collector.stop('correct');

      // Reward: EXACTLY 3 Gold + Points + Cash
      const winner = db.getUser(guildId, m.author.id);
      const goldReward = 3;
      const pointsReward = 15;
      const cashReward = 500;

      winner.gold = (winner.gold || 0) + goldReward;
      winner.gamePoints = (winner.gamePoints || 0) + pointsReward;
      winner.cash = (winner.cash || 0) + cashReward;
      db.updateUser(guildId, m.author.id, winner);

      const winCard = createCard({
        title: 'إجابة صحيحة وفوز مستحق',
        description: `أحسنت يا <@${m.author.id}>! إجابتك صحيحة: **${item.isRandomNumber ? expectedAnswers[0] : (item.answers[0] || m.content)}**\n\n` +
          `• الجوائز المكتسبة:\n` +
          `  - الذهب: **+${goldReward} 🪙 ذهب**\n` +
          `  - نقاط الألعاب: **+${pointsReward} نقطة 🏆**\n` +
          `  - الكاش: **+${cashReward} 💵**\n\n` +
          `رصيدك من الذهب الآن: **${winner.gold.toLocaleString()} 🪙**`,
        color: COLORS.success,
        footer: 'تم توثيق المكافأة بحسابك'
      });

      await m.reply({ embeds: [winCard] });
    }
  });

  collector.on('end', (_, reason) => {
    activeGuessGames.delete(channelId);
    if (!won && reason === 'time') {
      message.channel.send({
        embeds: [createCard({
          title: 'انتهت المهلة',
          description: `انتهت الـ 30 ثانية ولم ينجح أحد في التخمين!\nالإجابة الصحيحة كانت: **${item.isRandomNumber ? expectedAnswers[0] : item.answers[0]}**.`,
          color: COLORS.muted
        })]
      }).catch(() => {});
    }
  });
}

module.exports = { handleGuessCommand };
