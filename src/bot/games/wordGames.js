const fs = require('fs');
const path = require('path');
const db = require('../../database/db');
const { isGameChannelAllowed } = require('../../config/owners');
const { createCard, createRow, createButton, ButtonStyle, COLORS, errorCard } = require('../utils/components');

function getGamesData() {
  const filePath = path.join(__dirname, '../../../data/games_data.json');
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading games_data.json:', err);
  }
  return {};
}

function normalizeArabic(text) {
  return (text || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '');
}

const activeChannelCollectors = new Set();

// 1. عواصم (Capitals)
async function handleCapitalsCommand(message) {
  if (!isGameChannelAllowed(message.channel)) {
    return message.reply({ embeds: [errorCard('روم غير مسموح', 'ألعاب السيرفر غير مصرح بها في هذا الروم.')] });
  }

  const channelId = message.channel.id;
  if (activeChannelCollectors.has(channelId)) {
    return message.reply({ embeds: [errorCard('لعبة جارية', 'توجد مسابقة نشطة حالياً في هذا الروم!')] });
  }

  const data = getGamesData();
  const list = data.capitals || [];
  const item = list[Math.floor(Math.random() * list.length)];

  activeChannelCollectors.add(channelId);

  const embed = createCard({
    title: 'تحدي العواصم الجغرافية',
    description: `ما هي عاصمة: **${item.country}**؟\n\nأول شخص يكتب العاصمة الصحيحة يفوز بـ:\n• **10 نقاط ألعاب 🏆**\n• **400 💵 كاش**`,
    color: COLORS.primary,
    footer: 'معكم 25 ثانية للإجابة بالشات'
  });

  await message.reply({ embeds: [embed] });

  const validAnswers = [normalizeArabic(item.capital), ...(item.aliases || []).map(a => normalizeArabic(a))];
  listenForWinner(message, validAnswers, item.capital, 10, 400);
}

// 2. أعلام (Flags)
async function handleFlagsCommand(message) {
  if (!isGameChannelAllowed(message.channel)) {
    return message.reply({ embeds: [errorCard('روم غير مسموح', 'ألعاب السيرفر غير مصرح بها في هذا الروم.')] });
  }

  const channelId = message.channel.id;
  if (activeChannelCollectors.has(channelId)) {
    return message.reply({ embeds: [errorCard('لعبة جارية', 'توجد مسابقة نشطة حالياً في هذا الروم!')] });
  }

  const data = getGamesData();
  const list = data.flags || [];
  const item = list[Math.floor(Math.random() * list.length)];

  activeChannelCollectors.add(channelId);

  const embed = createCard({
    title: 'تحدي أعلام الدول',
    description: `ما هي الدولة صاحبة هذا العلم: ## ${item.flag}\n\nأول من يكتب اسم الدولة الصحيح يربح:\n• **10 نقاط ألعاب 🏆**\n• **400 💵 كاش**`,
    color: COLORS.primary,
    footer: 'معكم 25 ثانية للإجابة'
  });

  await message.reply({ embeds: [embed] });

  const validAnswers = [normalizeArabic(item.country), ...(item.aliases || []).map(a => normalizeArabic(a))];
  listenForWinner(message, validAnswers, item.country, 10, 400);
}

// 3. فكك (Unscramble)
async function handleUnscrambleCommand(message) {
  if (!isGameChannelAllowed(message.channel)) {
    return message.reply({ embeds: [errorCard('روم غير مسموح', 'ألعاب السيرفر غير مصرح بها في هذا الروم.')] });
  }

  const channelId = message.channel.id;
  if (activeChannelCollectors.has(channelId)) {
    return message.reply({ embeds: [errorCard('لعبة جارية', 'توجد مسابقة نشطة حالياً في هذا الروم!')] });
  }

  const data = getGamesData();
  const list = data.unscramble || [];
  const item = list[Math.floor(Math.random() * list.length)];

  activeChannelCollectors.add(channelId);

  const embed = createCard({
    title: 'تحدي فكك الكلمة',
    description: `فكك حروف الكلمة التالية بمسافات:\n## **${item.word}**\n\nاكتب الحروف مفصولة بمسافة (مثال: أ ب ت)\n• الجائزة: **8 نقاط 🏆** و **350 💵 كاش**`,
    color: COLORS.primary,
    footer: 'معكم 25 ثانية للإجابة'
  });

  await message.reply({ embeds: [embed] });

  const validAnswers = [normalizeArabic(item.answer)];
  listenForWinner(message, validAnswers, item.answer, 8, 350);
}

// 4. ركب (Assemble)
async function handleAssembleCommand(message) {
  if (!isGameChannelAllowed(message.channel)) {
    return message.reply({ embeds: [errorCard('روم غير مسموح', 'ألعاب السيرفر غير مصرح بها في هذا الروم.')] });
  }

  const channelId = message.channel.id;
  if (activeChannelCollectors.has(channelId)) {
    return message.reply({ embeds: [errorCard('لعبة جارية', 'توجد مسابقة نشطة حالياً في هذا الروم!')] });
  }

  const data = getGamesData();
  const list = data.assemble || [];
  const item = list[Math.floor(Math.random() * list.length)];

  activeChannelCollectors.add(channelId);

  const embed = createCard({
    title: 'تحدي ركب الحروف',
    description: `ركب الكلمة من الحروف التالية:\n## **[ ${item.letters} ]**\n\nاكتب الكلمة كاملة متصلة.\n• الجائزة: **8 نقاط 🏆** و **350 💵 كاش**`,
    color: COLORS.primary,
    footer: 'معكم 25 ثانية للإجابة'
  });

  await message.reply({ embeds: [embed] });

  const validAnswers = [normalizeArabic(item.word)];
  listenForWinner(message, validAnswers, item.word, 8, 350);
}

// 5. أسرع (Speed Typing)
async function handleSpeedTypeCommand(message) {
  if (!isGameChannelAllowed(message.channel)) {
    return message.reply({ embeds: [errorCard('روم غير مسموح', 'ألعاب السيرفر غير مصرح بها في هذا الروم.')] });
  }

  const channelId = message.channel.id;
  if (activeChannelCollectors.has(channelId)) {
    return message.reply({ embeds: [errorCard('لعبة جارية', 'توجد مسابقة نشطة حالياً في هذا الروم!')] });
  }

  const data = getGamesData();
  const list = data.speedType || [];
  const sentence = list[Math.floor(Math.random() * list.length)];

  activeChannelCollectors.add(channelId);

  const embed = createCard({
    title: 'تحدي أسرع كتابة',
    description: `أول من يكتب الجملة التالية تماماً في الشات يفوز:\n\n> **${sentence}**\n\n• الجائزة: **12 نقطة 🏆** و **450 💵 كاش**`,
    color: COLORS.primary,
    footer: 'معكم 30 ثانية للإجابة'
  });

  await message.reply({ embeds: [embed] });

  const validAnswers = [normalizeArabic(sentence)];
  listenForWinner(message, validAnswers, sentence, 12, 450);
}

// 6. كت تويت (Cut Tweet)
async function handleCutTweetCommand(message) {
  const data = getGamesData();
  const list = data.cutTweet || [];
  const question = list[Math.floor(Math.random() * list.length)];

  const card = createCard({
    title: 'كت تويت - سؤال للنقاش',
    description: `**${question}**\n\nشاركنا رأيك أو إجابتك بحرية في الشات أدناه!`,
    color: COLORS.primary,
    footer: 'سؤال نقاشي تفاعلي'
  });

  const row = createRow(
    createButton({ customId: 'cuttweet_next', label: 'سؤال آخر', style: ButtonStyle.Secondary }),
    createButton({ customId: 'cuttweet_like', label: 'أعجبني السؤال', style: ButtonStyle.Primary })
  );

  return message.reply({ embeds: [card], components: [row] });
}

function listenForWinner(message, validAnswers, displayAnswer, points, cash) {
  const channelId = message.channel.id;
  const guildId = message.guild.id;
  let won = false;

  const collector = message.channel.createMessageCollector({
    filter: m => !m.author.bot,
    time: 25000
  });

  collector.on('collect', async m => {
    if (won) return;
    const input = normalizeArabic(m.content);

    if (validAnswers.some(ans => input === ans)) {
      won = true;
      collector.stop('correct');

      const user = db.getUser(guildId, m.author.id);
      user.gamePoints = (user.gamePoints || 0) + points;
      user.cash = (user.cash || 0) + cash;
      db.updateUser(guildId, m.author.id, user);

      const winCard = createCard({
        title: 'إجابة صحيحة وسريعة',
        description: `أحسنت يا <@${m.author.id}>! الإجابة هي: **${displayAnswer}**\n\n` +
          `• الجوائز المكتسبة:\n` +
          `  - نقاط ألعاب: **+${points} نقطة 🏆**\n` +
          `  - كاش: **+${cash.toLocaleString()} 💵**\n\n` +
          `إجمالي نقاطك الآن: **${user.gamePoints.toLocaleString()}**`,
        color: COLORS.success
      });

      await m.reply({ embeds: [winCard] });
    }
  });

  collector.on('end', (_, reason) => {
    activeChannelCollectors.delete(channelId);
    if (!won && reason === 'time') {
      message.channel.send({
        embeds: [createCard({
          title: 'انتهت المهلة',
          description: `انتهت المهلة ولم يجب أحد بشكل صحيح!\nالإجابة الصحيحة كانت: **${displayAnswer}**.`,
          color: COLORS.muted
        })]
      }).catch(() => {});
    }
  });
}

module.exports = {
  handleCapitalsCommand,
  handleFlagsCommand,
  handleUnscrambleCommand,
  handleAssembleCommand,
  handleSpeedTypeCommand,
  handleCutTweetCommand
};
