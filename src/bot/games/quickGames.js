const db = require('../../database/db');
const { isGameChannelAllowed } = require('../../config/owners');
const { createCard, createRow, createButton, ButtonStyle, COLORS, errorCard } = require('../utils/components');

// 1. نرد (Dice roll)
async function handleDiceCommand(message, args = []) {
  if (!isGameChannelAllowed(message.channel)) {
    return message.reply({ embeds: [errorCard('روم غير مسموح', 'ألعاب السيرفر غير مصرح بها في هذا الروم.')] });
  }

  const user = db.getUser(message.guild.id, message.author.id);
  const bet = Math.max(50, parseInt(args[0], 10) || 100);

  if ((user.cash || 0) < bet) {
    return message.reply({ embeds: [errorCard('رصيد غير كافٍ', `الرهان: **${bet.toLocaleString()} 💵**، ورصيدك: **${(user.cash || 0).toLocaleString()} 💵**.`)] });
  }

  user.cash -= bet;

  const playerRoll = Math.floor(Math.random() * 6) + 1;
  const botRoll = Math.floor(Math.random() * 6) + 1;

  let won = false;
  let tied = false;

  if (playerRoll > botRoll) {
    won = true;
    user.cash += bet * 2;
    user.gamePoints = (user.gamePoints || 0) + 8;
  } else if (playerRoll === botRoll) {
    tied = true;
    user.cash += bet; // Refund
  }

  db.updateUser(message.guild.id, message.author.id, user);

  const embed = createCard({
    title: 'تحدي رمي النرد (Dice)',
    description: `🎲 نردك أنت: **${playerRoll}**\n🤖 نرد البوت: **${botRoll}**\n\n` +
      (won ? `🎉 **فزت!** ربحت **+${(bet * 2).toLocaleString()} 💵** و **+8 نقاط 🏆**!` :
        tied ? '⚖️ **تعادل!** تم استرداد رهانك بالكامل.' :
        `❌ **خسرت!** حظ أوفر في الرمية القادمة (-${bet.toLocaleString()} 💵).`),
    color: won ? COLORS.success : tied ? COLORS.muted : COLORS.danger
  });

  return message.reply({ embeds: [embed] });
}

// 2. حجر ورقة مقص (Rock Paper Scissors)
async function handleRPSCommand(message) {
  if (!isGameChannelAllowed(message.channel)) {
    return message.reply({ embeds: [errorCard('روم غير مسموح', 'ألعاب السيرفر غير مصرح بها في هذا الروم.')] });
  }

  const row = createRow(
    createButton({ customId: 'rps_rock', label: 'حجر 🪨', style: ButtonStyle.Primary }),
    createButton({ customId: 'rps_paper', label: 'ورقة 📄', style: ButtonStyle.Primary }),
    createButton({ customId: 'rps_scissors', label: 'مقص ✂️', style: ButtonStyle.Primary })
  );

  const card = createCard({
    title: 'تحدي حجر ورقة مقص',
    description: 'اختر حركتك بالضغط على أحد الأزرار أدناه لمواجهة البوت!',
    color: COLORS.primary,
    footer: 'معك 20 ثانية للاختيار'
  });

  const msg = await message.reply({ embeds: [card], components: [row] });

  const collector = msg.createMessageComponentCollector({
    time: 20000,
    filter: i => i.user.id === message.author.id
  });

  collector.on('collect', async i => {
    collector.stop('played');

    const choices = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    const userChoice = i.customId.replace('rps_', '');

    const nameMap = { rock: 'حجر 🪨', paper: 'ورقة 📄', scissors: 'مقص ✂️' };

    let result = 'tie';
    if (
      (userChoice === 'rock' && botChoice === 'scissors') ||
      (userChoice === 'paper' && botChoice === 'rock') ||
      (userChoice === 'scissors' && botChoice === 'paper')
    ) {
      result = 'win';
    } else if (userChoice !== botChoice) {
      result = 'loss';
    }

    const user = db.getUser(message.guild.id, message.author.id);
    let desc = `• اختيارك: **${nameMap[userChoice]}**\n• اختيار البوت: **${nameMap[botChoice]}**\n\n`;

    if (result === 'win') {
      user.cash = (user.cash || 0) + 300;
      user.gamePoints = (user.gamePoints || 0) + 8;
      desc += '🎉 **مبروك الفوز!** ربحت **+300 💵** و **+8 نقاط ألعاب 🏆**!';
    } else if (result === 'tie') {
      desc += '⚖️ **تعادل!** كرر التحدي مرة أخرى.';
    } else {
      desc += '❌ **تغلّب عليك البوت!** حظ أوفر في الجولة القادمة.';
    }

    db.updateUser(message.guild.id, message.author.id, user);

    await i.update({
      embeds: [createCard({
        title: 'نتيجة حجر ورقة مقص',
        description: desc,
        color: result === 'win' ? COLORS.success : result === 'tie' ? COLORS.muted : COLORS.danger
      })],
      components: []
    });
  });
}

// 3. رياضيات (Math)
async function handleMathCommand(message) {
  if (!isGameChannelAllowed(message.channel)) {
    return message.reply({ embeds: [errorCard('روم غير مسموح', 'ألعاب السيرفر غير مصرح بها في هذا الروم.')] });
  }

  const n1 = Math.floor(Math.random() * 45) + 5;
  const n2 = Math.floor(Math.random() * 40) + 5;
  const isAddition = Math.random() < 0.6;

  const expression = isAddition ? `${n1} + ${n2}` : `${n1 + n2} - ${n2}`;
  const answer = isAddition ? n1 + n2 : n1;

  const card = createCard({
    title: 'تحدي الحساب والرياضيات السريع',
    description: `احسب الناتج بأسرع وقت:\n## **${expression} = ؟**\n\n• الجائزة: **+10 نقاط 🏆** و **+400 💵 كاش**`,
    color: COLORS.primary,
    footer: 'معكم 20 ثانية للإجابة بالشات'
  });

  await message.reply({ embeds: [card] });

  let won = false;
  const collector = message.channel.createMessageCollector({
    filter: m => !m.author.bot,
    time: 20000
  });

  collector.on('collect', async m => {
    if (won) return;
    if (m.content.trim() === answer.toString()) {
      won = true;
      collector.stop('correct');

      const user = db.getUser(message.guild.id, m.author.id);
      user.gamePoints = (user.gamePoints || 0) + 10;
      user.cash = (user.cash || 0) + 400;
      db.updateUser(message.guild.id, m.author.id, user);

      await m.reply({
        embeds: [createCard({
          title: 'إجابة حسابية دقيقة',
          description: `أحسنت يا <@${m.author.id}>! الناتج الصحيح هو **${answer}**.\n\n• كسبت: **+10 نقاط 🏆** و **+400 💵**.\n• إجمالي نقاطك: **${user.gamePoints}**`,
          color: COLORS.success
        })]
      });
    }
  });

  collector.on('end', (_, reason) => {
    if (!won && reason === 'time') {
      message.channel.send({
        embeds: [createCard({
          title: 'انتهى وقت المسألة',
          description: `انتهت الـ 20 ثانية ولم يحلها أحد! الناتج الصحيح كان: **${answer}**.`,
          color: COLORS.muted
        })]
      }).catch(() => {});
    }
  });
}

module.exports = {
  handleDiceCommand,
  handleRPSCommand,
  handleMathCommand
};
