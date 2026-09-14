const { AttachmentBuilder } = require('discord.js');
const db = require('../../database/db');
const { generateRouletteGif } = require('../graphics/rouletteWheel');
const { isGameManager, isGameChannelAllowed } = require('../../config/owners');
const { createCard, createRow, createButton, ButtonStyle, COLORS, errorCard } = require('../utils/components');

// Active roulette lobbies in memory: guildId -> lobbyData
const activeRouletteSessions = new Map();

async function handleRouletteCommand(message, args = []) {
  const guildId = message.guild.id;

  // Check channel permission
  if (!isGameChannelAllowed(message.channel)) {
    return message.reply({ embeds: [errorCard('روم غير مسموح', 'ألعاب السيرفر غير مصرح بها في هذا الروم. يرجى اللعب في الرومات المسموحة المحددة من الإدارة.')] });
  }

  // Check if session already running
  if (activeRouletteSessions.has(guildId)) {
    return message.reply({ embeds: [errorCard('اللعبة قيد التشغيل', 'توجد جولة روليت قائمة بالفعل في هذا السيرفر حالياً!')] });
  }

  // Check game manager permissions
  const canHost = isGameManager(message.member);
  if (!canHost) {
    return message.reply({ embeds: [errorCard('صلاحية مرفوضة', 'بدء جولة الروليت الجماعية مخصص لمسؤولي الألعاب والرتب المحددة.')] });
  }

  const session = {
    guildId,
    channelId: message.channel.id,
    hostId: message.author.id,
    participants: [
      {
        id: message.author.id,
        username: message.author.username,
        avatarURL: message.author.displayAvatarURL({ extension: 'png', size: 128 })
      }
    ],
    status: 'LOBBY',
    betGold: parseInt(args[0], 10) || 0,
    createdAt: Date.now()
  };

  activeRouletteSessions.set(guildId, session);

  const buildLobbyCard = () => {
    const pList = session.participants.map((p, i) => `${i + 1}. <@${p.id}> (\`${p.username}\`)`).join('\n');
    return createCard({
      title: 'عجلة الروليت الجماعية المتحركة',
      description: `بدأ <@${session.hostId}> جولة روليت جديدة!\n\n**المشاركون (${session.participants.length} لاعبين):**\n${pList}\n\n• انقر على **انضمام** للمشاركة في العجلة.\n• يمكن للمضيف أو المسؤول الضغط على **بدء الدوران** للانطلاق.`,
      color: COLORS.primary,
      footer: 'نظام روليت فيزبو المتطور'
    });
  };

  const row = createRow(
    createButton({ customId: 'roulette_join', label: 'انضمام للروليت', style: ButtonStyle.Success }),
    createButton({ customId: 'roulette_leave', label: 'انسحاب', style: ButtonStyle.Secondary }),
    createButton({ customId: 'roulette_spin', label: 'بدء الدوران', style: ButtonStyle.Primary })
  );

  const lobbyMsg = await message.reply({ embeds: [buildLobbyCard()], components: [row] });
  session.messageId = lobbyMsg.id;

  // Auto cancel after 2 minutes if not spun
  setTimeout(() => {
    const cur = activeRouletteSessions.get(guildId);
    if (cur && cur.messageId === lobbyMsg.id && cur.status === 'LOBBY') {
      activeRouletteSessions.delete(guildId);
      lobbyMsg.edit({
        embeds: [errorCard('انتهت مهلة الروليت', 'تم إلغاء الجولة لعدم بدء الدوران خلال المهلة المحددة.')],
        components: []
      }).catch(() => {});
    }
  }, 120000);
}

/**
 * Handle button clicks for Roulette lobby
 */
async function handleRouletteInteraction(interaction) {
  const guildId = interaction.guild.id;
  const session = activeRouletteSessions.get(guildId);

  if (!session || session.status !== 'LOBBY') {
    return interaction.reply({ content: '❌ لا توجد جولة روليت نشطة حالياً!', ephemeral: true });
  }

  const userId = interaction.user.id;

  // 1. Join
  if (interaction.customId === 'roulette_join') {
    if (session.participants.some(p => p.id === userId)) {
      return interaction.reply({ content: 'أنت منضم بالفعل إلى هذه الجولة!', ephemeral: true });
    }

    if (session.participants.length >= 12) {
      return interaction.reply({ content: 'اكتمل الحد الأقصى للمشاركين في الجولة (12 لاعباً)!', ephemeral: true });
    }

    session.participants.push({
      id: userId,
      username: interaction.user.username,
      avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 128 })
    });

    await interaction.deferUpdate();
    return updateLobbyMessage(interaction, session);
  }

  // 2. Leave
  if (interaction.customId === 'roulette_leave') {
    if (!session.participants.some(p => p.id === userId)) {
      return interaction.reply({ content: 'أنت لست ضمن المشاركين!', ephemeral: true });
    }

    session.participants = session.participants.filter(p => p.id !== userId);
    if (session.participants.length === 0) {
      activeRouletteSessions.delete(guildId);
      return interaction.update({
        embeds: [errorCard('أُلغيت الجولة', 'انسحب جميع المشاركين من جولة الروليت.')],
        components: []
      });
    }

    await interaction.deferUpdate();
    return updateLobbyMessage(interaction, session);
  }

  // 3. Spin
  if (interaction.customId === 'roulette_spin') {
    const isHost = session.hostId === userId;
    const canManage = isGameManager(interaction.member);

    if (!isHost && !canManage) {
      return interaction.reply({ content: 'فقط مضيف الجولة أو مسؤولو الألعاب يمكنهم إطلاق العجلة!', ephemeral: true });
    }

    if (session.participants.length < 2) {
      return interaction.reply({ content: 'يجب توفر لاعبين على الأقل لبدء دوران الروليت!', ephemeral: true });
    }

    session.status = 'SPINNING';
    await interaction.deferUpdate();

    // Pick random winner
    const winnerIndex = Math.floor(Math.random() * session.participants.length);
    const winner = session.participants[winnerIndex];

    await interaction.editReply({
      embeds: [createCard({
        title: 'عجلة الروليت تدور الآن',
        description: `العجلة تدور الآن بسرعة فائقة بـ **${session.participants.length} لاعبين**...\nجارِ توليد حركة الدوران وتحديد الفائز!`,
        color: COLORS.gold
      })],
      components: []
    });

    try {
      // Generate realistic animated GIF with participants and avatar in the center
      const gifBuffer = await generateRouletteGif(session.participants, winnerIndex);
      const attachment = new AttachmentBuilder(gifBuffer, { name: 'roulette.gif' });

      // Reward winner: Points + Cash + Gold
      const winnerData = db.getUser(guildId, winner.id);
      const pointsAwarded = 25;
      const cashAwarded = 1000;
      const goldAwarded = 1;

      winnerData.gamePoints = (winnerData.gamePoints || 0) + pointsAwarded;
      winnerData.cash = (winnerData.cash || 0) + cashAwarded;
      winnerData.gold = (winnerData.gold || 0) + goldAwarded;
      db.updateUser(guildId, winner.id, winnerData);

      const winEmbed = createCard({
        title: 'استقرت عجلة الروليت',
        description: `توقفت العجلة ومبروك الفوز للاعب: <@${winner.id}>\n\n` +
          `• الجوائز المستلمة:\n` +
          `  - نقاط ألعاب: **+${pointsAwarded} نقطة 🏆**\n` +
          `  - كاش: **+${cashAwarded.toLocaleString()} 💵**\n` +
          `  - ذهب: **+${goldAwarded} 🪙**\n\n` +
          `إجمالي نقاطه الآن: **${winnerData.gamePoints.toLocaleString()}**`,
        color: COLORS.success,
        image: 'attachment://roulette.gif',
        footer: 'تم توثيق الفوز بنظام النقاط',
        timestamp: true
      });

      await interaction.message.channel.send({
        content: `🎉 مبروك الفوز يا <@${winner.id}>!`,
        embeds: [winEmbed],
        files: [attachment]
      });
    } catch (err) {
      console.error('Error generating roulette animation:', err);
      await interaction.message.channel.send(`🎉 فاز بالروليت اللاعب: <@${winner.id}>!`);
    } finally {
      activeRouletteSessions.delete(guildId);
    }
  }
}

async function updateLobbyMessage(interaction, session) {
  const pList = session.participants.map((p, i) => `${i + 1}. <@${p.id}> (\`${p.username}\`)`).join('\n');
  const card = createCard({
    title: 'عجلة الروليت الجماعية المتحركة',
    description: `بدأ <@${session.hostId}> جولة روليت جديدة!\n\n**المشاركون (${session.participants.length} لاعبين):**\n${pList}\n\n• انقر على **انضمام** للمشاركة في العجلة.\n• يمكن للمضيف أو المسؤول الضغط على **بدء الدوران** للانطلاق.`,
    color: COLORS.primary,
    footer: 'نظام روليت فيزبو المتطور'
  });

  const row = createRow(
    createButton({ customId: 'roulette_join', label: 'انضمام للروليت', style: ButtonStyle.Success }),
    createButton({ customId: 'roulette_leave', label: 'انسحاب', style: ButtonStyle.Secondary }),
    createButton({ customId: 'roulette_spin', label: 'بدء الدوران', style: ButtonStyle.Primary })
  );

  return interaction.message.edit({ embeds: [card], components: [row] });
}

module.exports = {
  handleRouletteCommand,
  handleRouletteInteraction
};
