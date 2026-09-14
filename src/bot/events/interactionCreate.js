const db = require('../../database/db');
const { buildHelpMenu } = require('../utils/helpMenu');
const { handleRouletteInteraction } = require('../games/roulette');
const { handleMafiaInteraction } = require('../games/mafia');
const { applyJob, getJobsConfig } = require('../economy/jobs');
const { handleCooldowns } = require('../economy/loan');
const { successCard, errorCard } = require('../utils/components');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.guild) return;

    // 1. HELP MENU NAVIGATION
    if (interaction.isButton() && interaction.customId.startsWith('help_nav_')) {
      const category = interaction.customId.replace('help_nav_', '');
      const menu = buildHelpMenu(category);
      return interaction.update({ embeds: [menu.embed], components: menu.rows });
    }

    // 2. ROULETTE INTERACTIONS
    if (interaction.isButton() && interaction.customId.startsWith('roulette_')) {
      return handleRouletteInteraction(interaction);
    }

    // 3. MAFIA INTERACTIONS
    if (interaction.customId.startsWith('mafia_')) {
      return handleMafiaInteraction(interaction);
    }

    // 4. JOB APPLICATION SELECT MENU
    if (interaction.isStringSelectMenu() && interaction.customId === 'job_apply_select_menu') {
      const selectedValue = interaction.values[0];
      const jobId = selectedValue.replace('job_select_', '');
      const jobs = getJobsConfig();
      const job = jobs.find(j => j.id === jobId);

      if (!job) {
        return interaction.reply({ content: '❌ وظيفة غير موجودة!', ephemeral: true });
      }

      const user = db.getUser(interaction.guild.id, interaction.user.id);
      return applyJob(interaction, user, job);
    }

    // 5. QUICK BANK BUTTONS
    if (interaction.isButton() && interaction.customId === 'bank_quick_deposit_all') {
      const user = db.getUser(interaction.guild.id, interaction.user.id);
      const cash = user.cash || 0;
      if (cash <= 0) {
        return interaction.reply({ content: '❌ لا يوجد كاش في محفظتك لإيداعه!', ephemeral: true });
      }
      user.bank = (user.bank || 0) + cash;
      user.cash = 0;
      db.updateUser(interaction.guild.id, interaction.user.id, user);
      return interaction.reply({
        embeds: [successCard('إيداع فوري كامل', `تم إيداع كامل الكاش (**${cash.toLocaleString()} 💵**) في حسابك البنكي.`)],
        ephemeral: true
      });
    }

    if (interaction.isButton() && interaction.customId === 'bank_quick_withdraw_half') {
      const user = db.getUser(interaction.guild.id, interaction.user.id);
      const bank = user.bank || 0;
      if (bank <= 0) {
        return interaction.reply({ content: '❌ لا يوجد رصيد في حسابك البنكي للسحب!', ephemeral: true });
      }
      const half = Math.floor(bank / 2);
      user.bank -= half;
      user.cash = (user.cash || 0) + half;
      db.updateUser(interaction.guild.id, interaction.user.id, user);
      return interaction.reply({
        embeds: [successCard('سحب نصف الرصيد', `تم سحب نصف رصيدك البنكي (**${half.toLocaleString()} 💵**) إلى محفظتك.`)],
        ephemeral: true
      });
    }

    if (interaction.isButton() && interaction.customId === 'bank_view_cooldowns') {
      // Show ephemeral cooldown card
      const fakeMsg = {
        guild: interaction.guild,
        author: interaction.user,
        reply: (payload) => interaction.reply({ ...payload, ephemeral: true })
      };
      return handleCooldowns(fakeMsg);
    }

    // 6. CUT TWEET BUTTONS
    if (interaction.isButton() && interaction.customId === 'cuttweet_like') {
      return interaction.reply({ content: '❤️ تم تسجيل إعجابك بالسؤال!', ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'cuttweet_next') {
      return interaction.reply({ content: '💡 اكتب `كت` في الشات للحصول على سؤال جديد!', ephemeral: true });
    }
  }
};
