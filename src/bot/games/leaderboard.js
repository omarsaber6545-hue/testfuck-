const db = require('../../database/db');
const { createCard, COLORS } = require('../utils/components');

async function handleLeaderboardCommand(message, args = []) {
  const guildId = message.guild.id;
  const sub = (args[0] || '').toLowerCase();

  let type = 'cash';
  let title = 'قائمة أثرياء السيرفر (الكاش والبنك)';
  let unit = '💵';

  if (sub === 'ذهب' || sub === 'gold' || message.content.includes('توب-ذهب')) {
    type = 'gold';
    title = 'قائمة حيتان الذهب بالسيرفر';
    unit = '🪙 ذهب';
  } else if (sub === 'نقاط' || sub === 'العاب' || sub === 'ألعاب' || sub === 'points' || message.content.includes('توب-نقاط') || message.content.includes('توب-العاب')) {
    type = 'points';
    title = 'قائمة متصدري ألعاب السيرفر (النقاط 🏆)';
    unit = 'نقطة';
  }

  const topUsers = db.getTopUsers(guildId, type, 10);

  if (topUsers.length === 0) {
    return message.reply({ embeds: [createCard({ title, description: 'لا توجد بيانات مسجلة في قائمة المتصدرين حتى الآن.', color: COLORS.muted })] });
  }

  const medalEmojis = ['🥇', '🥈', '🥉', '4.', '5.', '6.', '7.', '8.', '9.', '10.'];
  const fields = topUsers.map((u, i) => {
    let valueStr = '';
    if (type === 'gold') valueStr = `${(u.gold || 0).toLocaleString()} ${unit}`;
    else if (type === 'points') valueStr = `${(u.gamePoints || 0).toLocaleString()} ${unit}`;
    else valueStr = `${((u.cash || 0) + (u.bank || 0)).toLocaleString()} ${unit}`;

    return {
      name: `${medalEmojis[i]} المركز ${i + 1}`,
      value: `• العضو: <@${u.userId}>\n• الرصيد: **${valueStr}**`,
      inline: false
    };
  });

  const embed = createCard({
    title,
    description: `فيما يلي قائمة أفضل 10 أعضاء في ${title}:\nاستخدم: \`توب-ذهب\` | \`توب-فلوس\` | \`توب-نقاط\``,
    color: type === 'gold' ? COLORS.gold : type === 'points' ? '#8B5CF6' : COLORS.primary,
    fields,
    footer: `سيرفر: ${message.guild.name}`,
    timestamp: true
  });

  return message.reply({ embeds: [embed] });
}

async function handlePointsCommand(message) {
  const target = message.mentions.users.first() || message.author;
  const user = db.getUser(message.guild.id, target.id);
  const points = user.gamePoints || 0;

  // Calculate rank
  const allInGuild = db.users.all().filter(u => u.guildId === message.guild.id);
  allInGuild.sort((a, b) => (b.gamePoints || 0) - (a.gamePoints || 0));
  const rank = allInGuild.findIndex(u => u.userId === target.id) + 1;

  const card = createCard({
    title: `نقاط الألعاب: ${target.username}`,
    description: `• إجمالي نقاط الألعاب: **${points.toLocaleString()} نقطة 🏆**\n• الترتيب في السيرفر: **#${rank || 1}** من أصل ${allInGuild.length} عضواً.\n\nاكسب المزيد من النقاط عبر الفوز في ألعاب:\n\`خمن\` • \`روليت\` • \`مافيا\` • \`سلوت\` • \`عواصم\` • \`إكس_أو\` • \`كراش\``,
    color: '#8B5CF6',
    thumbnail: target.displayAvatarURL({ size: 128 }),
    footer: 'نظام نقاط الألعاب المعتمد'
  });

  return message.reply({ embeds: [card] });
}

module.exports = {
  handleLeaderboardCommand,
  handlePointsCommand
};
