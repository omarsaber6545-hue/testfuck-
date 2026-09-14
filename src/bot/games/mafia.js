const db = require('../../database/db');
const { isGameManager, isGameChannelAllowed } = require('../../config/owners');
const { createCard, createRow, createButton, createSelectMenu, ButtonStyle, COLORS, errorCard } = require('../utils/components');

// Active mafia sessions: guildId -> session
const activeMafiaSessions = new Map();

async function handleMafiaCommand(message) {
  const guildId = message.guild.id;

  if (!isGameChannelAllowed(message.channel)) {
    return message.reply({ embeds: [errorCard('روم غير مسموح', 'ألعاب السيرفر غير مصرح بها في هذا الروم.')] });
  }

  if (activeMafiaSessions.has(guildId)) {
    return message.reply({ embeds: [errorCard('اللعبة قيد التشغيل', 'توجد جولة مافيا قائمة بالفعل في السيرفر!')] });
  }

  const canManage = isGameManager(message.member);
  if (!canManage) {
    return message.reply({ embeds: [errorCard('صلاحية مرفوضة', 'بدء لعبة المافيا مخصص لمسؤولي الألعاب.')] });
  }

  const session = {
    guildId,
    channelId: message.channel.id,
    hostId: message.author.id,
    participants: [{ id: message.author.id, username: message.author.username }],
    roles: {}, // userId -> role ('mafia', 'doctor', 'detective', 'citizen')
    alive: [], // array of userIds
    nightActions: { mafiaTarget: null, doctorTarget: null, detectiveTarget: null },
    dayVotes: {}, // voterId -> targetId
    phase: 'LOBBY',
    round: 1
  };

  activeMafiaSessions.set(guildId, session);

  const row = createRow(
    createButton({ customId: 'mafia_join', label: 'انضمام للمافيا', style: ButtonStyle.Success }),
    createButton({ customId: 'mafia_leave', label: 'انسحاب', style: ButtonStyle.Secondary }),
    createButton({ customId: 'mafia_start', label: 'بدء اللعبة (4 لاعبين+)', style: ButtonStyle.Primary })
  );

  const card = createCard({
    title: 'مدينة المافيا - لوبي الانتظار',
    description: `افتتح <@${session.hostId}> جولة مافيا جديدة!\n\n**المشاركون (${session.participants.length} لاعبين):**\n1. <@${session.hostId}>\n\n• تتطلب اللعبة **4 لاعبين على الأقل** لتوزيع الأدوار.\n• الأدوار تشمل: المافيا، الطبيب، المحقق، والمواطنين.`,
    color: COLORS.dark,
    footer: 'انقر على انضمام للمشاركة'
  });

  const msg = await message.reply({ embeds: [card], components: [row] });
  session.messageId = msg.id;
}

/**
 * Handle Mafia button and select interactions
 */
async function handleMafiaInteraction(interaction) {
  const guildId = interaction.guild.id;
  const session = activeMafiaSessions.get(guildId);
  const userId = interaction.user.id;

  if (!session) {
    return interaction.reply({ content: '❌ لا توجد لعبة مافيا نشطة!', ephemeral: true });
  }

  // --- LOBBY ACTIONS ---
  if (session.phase === 'LOBBY') {
    if (interaction.customId === 'mafia_join') {
      if (session.participants.some(p => p.id === userId)) {
        return interaction.reply({ content: 'أنت منضم بالفعل!', ephemeral: true });
      }
      session.participants.push({ id: userId, username: interaction.user.username });
      await interaction.deferUpdate();
      return updateMafiaLobby(interaction, session);
    }

    if (interaction.customId === 'mafia_leave') {
      session.participants = session.participants.filter(p => p.id !== userId);
      if (session.participants.length === 0) {
        activeMafiaSessions.delete(guildId);
        return interaction.update({ embeds: [errorCard('أُلغيت اللعبة', 'انسحب جميع اللاعبين.')], components: [] });
      }
      await interaction.deferUpdate();
      return updateMafiaLobby(interaction, session);
    }

    if (interaction.customId === 'mafia_start') {
      if (session.hostId !== userId && !isGameManager(interaction.member)) {
        return interaction.reply({ content: 'فقط المضيف أو مسؤول الألعاب يمكنه بدء اللعبة!', ephemeral: true });
      }
      if (session.participants.length < 4) {
        return interaction.reply({ content: 'تحتاج اللعبة إلى 4 لاعبين على الأقل للبدء!', ephemeral: true });
      }

      session.phase = 'RUNNING';
      await interaction.deferUpdate();
      return startMafiaGame(interaction.message.channel, session);
    }
  }

  // --- NIGHT ACTIONS (Secret Ephemeral) ---
  if (interaction.customId.startsWith('mafia_night_action_')) {
    if (!session.alive.includes(userId)) {
      return interaction.reply({ content: 'أنت لست على قيد الحياة للمشاركة في هذا الدور!', ephemeral: true });
    }

    const myRole = session.roles[userId];
    const targetId = interaction.values ? interaction.values[0] : null;

    if (myRole === 'mafia') {
      session.nightActions.mafiaTarget = targetId;
      return interaction.reply({ content: `✅ حددت المافيا ضحيتها: <@${targetId}>.`, ephemeral: true });
    }
    if (myRole === 'doctor') {
      session.nightActions.doctorTarget = targetId;
      return interaction.reply({ content: `✅ قرر الطبيب حماية: <@${targetId}> هذه الليلة.`, ephemeral: true });
    }
    if (myRole === 'detective') {
      session.nightActions.detectiveTarget = targetId;
      const targetRole = session.roles[targetId];
      const isMafia = targetRole === 'mafia';
      return interaction.reply({
        content: `🔍 **نتائج التحقيق السرية:**\nالعضو <@${targetId}> هو: **${isMafia ? 'عضو مافيا خبيث 🩸' : 'مواطن بريء 🕊️'}**!`,
        ephemeral: true
      });
    }

    return interaction.reply({ content: 'أنت مواطن شريف، نم بسلام حتى الصباح.', ephemeral: true });
  }

  // --- DAY VOTING ---
  if (interaction.customId === 'mafia_day_vote') {
    if (!session.alive.includes(userId)) {
      return interaction.reply({ content: 'الموتى لا يصوتون!', ephemeral: true });
    }

    const votedTarget = interaction.values[0];
    session.dayVotes[userId] = votedTarget;
    return interaction.reply({ content: `✅ تم تسجيل صوتك ضد <@${votedTarget}>.`, ephemeral: true });
  }
}

async function updateMafiaLobby(interaction, session) {
  const pList = session.participants.map((p, i) => `${i + 1}. <@${p.id}> (\`${p.username}\`)`).join('\n');
  const card = createCard({
    title: 'مدينة المافيا - لوبي الانتظار',
    description: `المشاركون (${session.participants.length} لاعبين):\n${pList}\n\n• تتطلب اللعبة **4 لاعبين على الأقل** للبدء.`,
    color: COLORS.dark,
    footer: 'انقر على انضمام للمشاركة'
  });

  const row = createRow(
    createButton({ customId: 'mafia_join', label: 'انضمام للمافيا', style: ButtonStyle.Success }),
    createButton({ customId: 'mafia_leave', label: 'انسحاب', style: ButtonStyle.Secondary }),
    createButton({ customId: 'mafia_start', label: 'بدء اللعبة (4 لاعبين+)', style: ButtonStyle.Primary })
  );

  return interaction.message.edit({ embeds: [card], components: [row] });
}

async function startMafiaGame(channel, session) {
  // Shuffle participants and assign roles
  const shuffled = [...session.participants].sort(() => Math.random() - 0.5);
  session.alive = shuffled.map(p => p.id);

  // 1 Mafia, 1 Doctor, 1 Detective, Rest Citizens
  session.roles[shuffled[0].id] = 'mafia';
  session.roles[shuffled[1].id] = 'doctor';
  session.roles[shuffled[2].id] = 'detective';
  for (let i = 3; i < shuffled.length; i++) {
    session.roles[shuffled[i].id] = 'citizen';
  }

  await channel.send({
    embeds: [createCard({
      title: 'بدأت لعبة المافيا',
      description: `تم توزيع الأدوار سراً على جميع اللاعبين!\n\n**قائمة الأحياء (${session.alive.length} لاعبين):**\n${session.alive.map(id => `• <@${id}>`).join('\n')}\n\n🌙 **حل الظلام على المدينة... بدأت مرحلة الليل!**`,
      color: COLORS.dark
    })]
  });

  // Run Night Phase
  await runNightPhase(channel, session);
}

async function runNightPhase(channel, session) {
  session.nightActions = { mafiaTarget: null, doctorTarget: null, detectiveTarget: null };

  const targetOptions = session.alive.map(id => ({
    label: session.participants.find(p => p.id === id)?.username || id,
    value: id
  }));

  const menu = createRow(
    createSelectMenu({
      customId: 'mafia_night_action_menu',
      placeholder: 'اختر هدفك لليلة الحالية...',
      options: targetOptions
    })
  );

  const nightCard = createCard({
    title: `المرحلة الليلية - الجولة ${session.round}`,
    description: `جميع سكان المدينة نائمون الآن... 🌙\n\nأصحاب الأدوار الخاصة (المافيا، الطبيب، المحقق)، قوموا بتحديد أهدافكم سراً من القائمة أدناه.\n• معكم **30 ثانية** قبل طلوع الفجر!`,
    color: '#312E81'
  });

  const nightMsg = await channel.send({ embeds: [nightCard], components: [menu] });

  // 30 seconds night duration
  setTimeout(async () => {
    nightMsg.edit({ components: [] }).catch(() => {});
    await resolveNightAndStartDay(channel, session);
  }, 30000);
}

async function resolveNightAndStartDay(channel, session) {
  const { mafiaTarget, doctorTarget } = session.nightActions;
  let killedId = null;

  if (mafiaTarget && mafiaTarget !== doctorTarget) {
    killedId = mafiaTarget;
    session.alive = session.alive.filter(id => id !== killedId);
  }

  let resultDesc = '☀️ **أشرقت الشمس واستيقظت المدينة...**\n\n';
  if (killedId) {
    resultDesc += `🩸 عُثر على جثة <@${killedId}> مقتولاً الليلة الماضية على يد المافيا! دور الضحية كان: **${session.roles[killedId]}**.\n`;
  } else {
    resultDesc += '🕊️ مرت الليلة بسلام بفضل تدخل الطبيب الشجاع ولم يمت أحد!\n';
  }

  // Check win condition
  const mafiaAlive = session.alive.filter(id => session.roles[id] === 'mafia');
  const citizensAlive = session.alive.filter(id => session.roles[id] !== 'mafia');

  if (mafiaAlive.length === 0) {
    return finishMafiaGame(channel, session, 'CITIZENS');
  }
  if (mafiaAlive.length >= citizensAlive.length) {
    return finishMafiaGame(channel, session, 'MAFIA');
  }

  resultDesc += `\n**الأحياء المتبقون (${session.alive.length}):**\n${session.alive.map(id => `• <@${id}>`).join('\n')}\n\nحان وقت النقاش والتصويت على المشتبه به!`;

  const voteOptions = session.alive.map(id => ({
    label: session.participants.find(p => p.id === id)?.username || id,
    value: id
  }));

  const voteRow = createRow(
    createSelectMenu({
      customId: 'mafia_day_vote',
      placeholder: 'صوت على المشتبه به لإعدامه...',
      options: voteOptions
    })
  );

  session.dayVotes = {};
  const dayMsg = await channel.send({
    embeds: [createCard({ title: `المرحلة الصباحية - الجولة ${session.round}`, description: resultDesc, color: COLORS.warning })],
    components: [voteRow]
  });

  // 45 seconds voting duration
  setTimeout(async () => {
    dayMsg.edit({ components: [] }).catch(() => {});
    await resolveDayVoting(channel, session);
  }, 45000);
}

async function resolveDayVoting(channel, session) {
  const voteCounts = {};
  for (const targetId of Object.values(session.dayVotes)) {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
  }

  let highestVotes = 0;
  let executedId = null;

  for (const [targetId, count] of Object.entries(voteCounts)) {
    if (count > highestVotes) {
      highestVotes = count;
      executedId = targetId;
    }
  }

  let announceText = '';
  if (executedId && highestVotes >= 2) {
    session.alive = session.alive.filter(id => id !== executedId);
    const role = session.roles[executedId];
    announceText = `⚖️ قرر سكان المدينة بالأغلبية إعدام <@${executedId}>!\n• ودوره الحقيقي كان: **${role === 'mafia' ? 'عضو مافيا 🩸' : 'مواطن بريء 🕊️'}**!`;
  } else {
    announceText = '⚖️ لم تتوصل المدينة إلى اتفاق حاسم، ولم يتم إعدام أي مشتبه به اليوم.';
  }

  await channel.send({
    embeds: [createCard({ title: 'نتائج محاكمة المدينة', description: announceText, color: COLORS.primary })]
  });

  // Check win condition
  const mafiaAlive = session.alive.filter(id => session.roles[id] === 'mafia');
  const citizensAlive = session.alive.filter(id => session.roles[id] !== 'mafia');

  if (mafiaAlive.length === 0) {
    return finishMafiaGame(channel, session, 'CITIZENS');
  }
  if (mafiaAlive.length >= citizensAlive.length) {
    return finishMafiaGame(channel, session, 'MAFIA');
  }

  session.round++;
  // Run next night
  await runNightPhase(channel, session);
}

async function finishMafiaGame(channel, session, winnerTeam) {
  const guildId = session.guildId;
  activeMafiaSessions.delete(guildId);

  const isMafiaWin = winnerTeam === 'MAFIA';
  const winningRole = isMafiaWin ? 'mafia' : 'citizen';

  const winners = session.participants.filter(p => {
    const r = session.roles[p.id];
    return isMafiaWin ? r === 'mafia' : r !== 'mafia';
  });

  // Award Points + Gold + Cash
  winners.forEach(w => {
    const u = db.getUser(guildId, w.id);
    u.gamePoints = (u.gamePoints || 0) + 50;
    u.cash = (u.cash || 0) + 2000;
    u.gold = (u.gold || 0) + 2;
    db.updateUser(guildId, w.id, u);
  });

  const card = createCard({
    title: isMafiaWin ? '🩸 انتصرت المافيا وسيطرت على المدينة!' : '🕊️ انتصر المواطنون وطهروا المدينة من المافيا!',
    description: `انتهت اللعبة بفوز فريق: **${isMafiaWin ? 'المافيا' : 'المواطنين والشرطة'}**!\n\n` +
      `**الفائزون المستحقون (+50 نقطة 🏆، +2,000 💵، +2 🪙 ذهب):**\n` +
      winners.map(w => `• <@${w.id}> (${session.roles[w.id]})`).join('\n') +
      `\n\n**كشف جميع الأدوار:**\n` +
      session.participants.map(p => `• <@${p.id}>: **${session.roles[p.id]}**`).join('\n'),
    color: isMafiaWin ? COLORS.danger : COLORS.success
  });

  return channel.send({ embeds: [card] });
}

module.exports = {
  handleMafiaCommand,
  handleMafiaInteraction
};
