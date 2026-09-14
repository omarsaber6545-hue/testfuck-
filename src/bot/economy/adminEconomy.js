const db = require('../../database/db');
const { isOwner } = require('../../config/owners');
const { createCard, successCard, errorCard, COLORS } = require('../utils/components');

/**
 * Handle Owner and Configuration Commands
 */
async function handleAdminCommand(message, commandName, args = []) {
  const guildId = message.guild.id;
  const authorId = message.author.id;

  // Verify owner permission for owner-only actions
  const isUserOwner = isOwner(authorId, message.guild);
  if (!isUserOwner) {
    return message.reply({ embeds: [errorCard('صلاحية مرفوضة', 'هذا الأمر مخصص لمالكي البوت (Bot Owners) فقط.')] });
  }

  const cleanCmd = commandName.replace(/^[!\-]/, '').trim();

  // 1. Give Gold (إعطاء ذهب)
  if (cleanCmd === 'اعطاء-ذهب' || cleanCmd === 'اعطاء_ذهب' || cleanCmd === 'إعطاء-ذهب') {
    const target = message.mentions.users.first();
    const amount = parseInt(args.find(a => !isNaN(parseInt(a, 10)) && !a.startsWith('<@')), 10);

    if (!target || isNaN(amount) || amount <= 0) {
      return message.reply({ embeds: [errorCard('صيغة غير صحيحة', 'طريقة الاستخدام: `اعطاء-ذهب @user 10`')] });
    }

    const userData = db.getUser(guildId, target.id);
    userData.gold = (userData.gold || 0) + amount;
    db.updateUser(guildId, target.id, userData);

    return message.reply({
      embeds: [successCard('تمت إضافة الذهب', `أضاف الأونر <@${authorId}> **+${amount.toLocaleString()} 🪙 ذهب** إلى رصيد <@${target.id}>.\n• إجمالي رصيده من الذهب: **${userData.gold.toLocaleString()} 🪙**`)]
    });
  }

  // 2. Remove Gold (إزالة ذهب)
  if (cleanCmd === 'ازالة-ذهب' || cleanCmd === 'ازالة_ذهب' || cleanCmd === 'سحب-ذهب') {
    const target = message.mentions.users.first();
    const amount = parseInt(args.find(a => !isNaN(parseInt(a, 10)) && !a.startsWith('<@')), 10);

    if (!target || isNaN(amount) || amount <= 0) {
      return message.reply({ embeds: [errorCard('صيغة غير صحيحة', 'طريقة الاستخدام: `ازالة-ذهب @user 5`')] });
    }

    const userData = db.getUser(guildId, target.id);
    userData.gold = Math.max(0, (userData.gold || 0) - amount);
    db.updateUser(guildId, target.id, userData);

    return message.reply({
      embeds: [successCard('تم سحب الذهب', `سحب الأونر <@${authorId}> **-${amount.toLocaleString()} 🪙 ذهب** من <@${target.id}>.\n• رصيده المتبقي: **${userData.gold.toLocaleString()} 🪙**`)]
    });
  }

  // 3. Give Cash (إعطاء فلوس)
  if (cleanCmd === 'اعطاء-فلوس' || cleanCmd === 'اعطاء_فلوس' || cleanCmd === 'إعطاء-فلوس' || cleanCmd === 'اعطاء-كاش') {
    const target = message.mentions.users.first();
    const amount = parseInt(args.find(a => !isNaN(parseInt(a, 10)) && !a.startsWith('<@')), 10);

    if (!target || isNaN(amount) || amount <= 0) {
      return message.reply({ embeds: [errorCard('صيغة غير صحيحة', 'طريقة الاستخدام: `اعطاء-فلوس @user 5000`')] });
    }

    const userData = db.getUser(guildId, target.id);
    userData.cash = (userData.cash || 0) + amount;
    db.updateUser(guildId, target.id, userData);

    return message.reply({
      embeds: [successCard('تمت إضافة الكاش', `أضاف الأونر <@${authorId}> **+${amount.toLocaleString()} 💵** إلى محفظة <@${target.id}>.\n• رصيد محفظته: **${userData.cash.toLocaleString()} 💵**`)]
    });
  }

  // 4. Remove Cash (إزالة فلوس)
  if (cleanCmd === 'ازالة-فلوس' || cleanCmd === 'ازالة_فلوس' || cleanCmd === 'سحب-فلوس' || cleanCmd === 'ازالة-كاش') {
    const target = message.mentions.users.first();
    const amount = parseInt(args.find(a => !isNaN(parseInt(a, 10)) && !a.startsWith('<@')), 10);

    if (!target || isNaN(amount) || amount <= 0) {
      return message.reply({ embeds: [errorCard('صيغة غير صحيحة', 'طريقة الاستخدام: `ازالة-فلوس @user 5000`')] });
    }

    const userData = db.getUser(guildId, target.id);
    userData.cash = Math.max(0, (userData.cash || 0) - amount);
    db.updateUser(guildId, target.id, userData);

    return message.reply({
      embeds: [successCard('تم سحب الكاش', `سحب الأونر <@${authorId}> **-${amount.toLocaleString()} 💵** من محفظة <@${target.id}>.\n• رصيده المتبقي: **${userData.cash.toLocaleString()} 💵**`)]
    });
  }

  // 5. Give Game Points (إعطاء نقاط)
  if (cleanCmd === 'اعطاء-نقاط' || cleanCmd === 'اعطاء_نقاط' || cleanCmd === 'إعطاء-نقاط') {
    const target = message.mentions.users.first();
    const amount = parseInt(args.find(a => !isNaN(parseInt(a, 10)) && !a.startsWith('<@')), 10);

    if (!target || isNaN(amount) || amount <= 0) {
      return message.reply({ embeds: [errorCard('صيغة غير صحيحة', 'طريقة الاستخدام: `اعطاء-نقاط @user 100`')] });
    }

    const userData = db.getUser(guildId, target.id);
    userData.gamePoints = (userData.gamePoints || 0) + amount;
    db.updateUser(guildId, target.id, userData);

    return message.reply({
      embeds: [successCard('تمت إضافة النقاط', `أضاف الأونر <@${authorId}> **+${amount.toLocaleString()} نقطة** إلى <@${target.id}>.\n• إجمالي نقاطه: **${userData.gamePoints.toLocaleString()}**`)]
    });
  }

  // 6. Remove Game Points (إزالة نقاط)
  if (cleanCmd === 'ازالة-نقاط' || cleanCmd === 'ازالة_نقاط') {
    const target = message.mentions.users.first();
    const amount = parseInt(args.find(a => !isNaN(parseInt(a, 10)) && !a.startsWith('<@')), 10);

    if (!target || isNaN(amount) || amount <= 0) {
      return message.reply({ embeds: [errorCard('صيغة غير صحيحة', 'طريقة الاستخدام: `ازالة-نقاط @user 50`')] });
    }

    const userData = db.getUser(guildId, target.id);
    userData.gamePoints = Math.max(0, (userData.gamePoints || 0) - amount);
    db.updateUser(guildId, target.id, userData);

    return message.reply({
      embeds: [successCard('تم سحب النقاط', `سحب الأونر <@${authorId}> **-${amount.toLocaleString()} نقطة** من <@${target.id}>.\n• نقاطه المتبقية: **${userData.gamePoints.toLocaleString()}**`)]
    });
  }

  // 7. Reset Account (تصفير حساب)
  if (cleanCmd === 'تصفير-حساب' || cleanCmd === 'تصفير_حساب') {
    const target = message.mentions.users.first();
    if (!target) {
      return message.reply({ embeds: [errorCard('صيغة غير صحيحة', 'طريقة الاستخدام: `تصفير-حساب @user`')] });
    }

    const userData = db.getUser(guildId, target.id);
    userData.cash = 1000;
    userData.bank = 0;
    userData.gold = 0;
    userData.gamePoints = 0;
    userData.job = null;
    userData.loan = 0;
    db.updateUser(guildId, target.id, userData);

    return message.reply({
      embeds: [successCard('تم تصفير الحساب', `تم تصفير الرصيد المالي والنقاط بالكامل للعضو <@${target.id}> وإعادته للقيم الافتراضية.`)]
    });
  }

  // 8. Manage Allowed Bank Channels (اضف-روم-بنك, ازالة-روم-بنك, رومات-البنك)
  if (cleanCmd === 'اضف-روم-بنك' || cleanCmd === 'اضافة-روم-بنك') {
    const channel = message.mentions.channels.first() || message.channel;
    const settings = db.getGuild(guildId);
    settings.allowedBankChannels = settings.allowedBankChannels || [];

    if (settings.allowedBankChannels.includes(channel.id)) {
      return message.reply({ embeds: [errorCard('موجود بالفعل', `الروم <#${channel.id}> مسجل بالفعل ضمن رومات البنك المسموحة.`)] });
    }

    settings.allowedBankChannels.push(channel.id);
    db.updateGuild(guildId, settings);

    return message.reply({
      embeds: [successCard('تمت إضافة روم البنك', `تمت إضافة <#${channel.id}> إلى قائمة الرومات المسموحة لأوامر البنك والاقتصاد.`)]
    });
  }

  if (cleanCmd === 'ازالة-روم-بنك' || cleanCmd === 'حذف-روم-بنك') {
    const channel = message.mentions.channels.first() || message.channel;
    const settings = db.getGuild(guildId);
    settings.allowedBankChannels = settings.allowedBankChannels || [];

    if (!settings.allowedBankChannels.includes(channel.id)) {
      return message.reply({ embeds: [errorCard('غير موجود', `الروم <#${channel.id}> ليس ضمن رومات البنك المسجلة.`)] });
    }

    settings.allowedBankChannels = settings.allowedBankChannels.filter(id => id !== channel.id);
    db.updateGuild(guildId, settings);

    return message.reply({
      embeds: [successCard('تمت إزالة روم البنك', `تمت إزالة <#${channel.id}> من قائمة رومات البنك المسموحة.`)]
    });
  }

  if (cleanCmd === 'رومات-البنك' || cleanCmd === 'رومات-بنك') {
    const settings = db.getGuild(guildId);
    const channels = settings.allowedBankChannels || [];

    const listText = channels.length > 0
      ? channels.map((id, idx) => `${idx + 1}. <#${id}> (\`${id}\`)`).join('\n')
      : 'لا توجد رومات محددة حالياً (أوامر البنك تعمل في جميع الرومات).';

    return message.reply({
      embeds: [createCard({
        title: 'رومات البنك والاقتصاد المسموحة',
        description: `${listText}\n\n• لإضافة روم: \`اضف-روم-بنك [#channel]\`\n• لإزالة روم: \`ازالة-روم-بنك [#channel]\``,
        color: COLORS.primary
      })]
    });
  }

  // 9. Manage Allowed Game Channels (اضف-روم-العاب, ازالة-روم-العاب, رومات-العاب)
  if (cleanCmd === 'اضف-روم-العاب' || cleanCmd === 'اضافة-روم-العاب') {
    const channel = message.mentions.channels.first() || message.channel;
    const settings = db.getGuild(guildId);
    settings.allowedGameChannels = settings.allowedGameChannels || [];

    if (settings.allowedGameChannels.includes(channel.id)) {
      return message.reply({ embeds: [errorCard('موجود بالفعل', `الروم <#${channel.id}> مسجل بالفعل ضمن رومات الألعاب المسموحة.`)] });
    }

    settings.allowedGameChannels.push(channel.id);
    db.updateGuild(guildId, settings);

    return message.reply({
      embeds: [successCard('تمت إضافة روم الألعاب', `تمت إضافة <#${channel.id}> إلى قائمة الرومات المسموحة لتشغيل الألعاب.`)]
    });
  }

  if (cleanCmd === 'ازالة-روم-العاب' || cleanCmd === 'حذف-روم-العاب') {
    const channel = message.mentions.channels.first() || message.channel;
    const settings = db.getGuild(guildId);
    settings.allowedGameChannels = settings.allowedGameChannels || [];

    if (!settings.allowedGameChannels.includes(channel.id)) {
      return message.reply({ embeds: [errorCard('غير موجود', `الروم <#${channel.id}> ليس ضمن رومات الألعاب المسجلة.`)] });
    }

    settings.allowedGameChannels = settings.allowedGameChannels.filter(id => id !== channel.id);
    db.updateGuild(guildId, settings);

    return message.reply({
      embeds: [successCard('تمت إزالة روم الألعاب', `تمت إزالة <#${channel.id}> من قائمة رومات الألعاب المسموحة.`)]
    });
  }

  if (cleanCmd === 'رومات-العاب' || cleanCmd === 'رومات-الالعاب') {
    const settings = db.getGuild(guildId);
    const channels = settings.allowedGameChannels || [];

    const listText = channels.length > 0
      ? channels.map((id, idx) => `${idx + 1}. <#${id}> (\`${id}\`)`).join('\n')
      : 'لا توجد رومات محددة حالياً (الألعاب تعمل في جميع الرومات).';

    return message.reply({
      embeds: [createCard({
        title: 'رومات الألعاب المسموحة',
        description: `${listText}\n\n• لإضافة روم: \`اضف-روم-العاب [#channel]\`\n• لإزالة روم: \`ازالة-روم-العاب [#channel]\``,
        color: COLORS.primary
      })]
    });
  }

  // 10. Manage Game Manager Roles (اضف-رتبة-العاب, ازالة-رتبة-العاب, رتب-الالعاب)
  if (cleanCmd === 'اضف-رتبة-العاب' || cleanCmd === 'اضافة-رتبة-العاب') {
    const role = message.mentions.roles.first();
    if (!role) {
      return message.reply({ embeds: [errorCard('تحديد الرتبة مفقود', 'طريقة الاستخدام: `اضف-رتبة-العاب @role`')] });
    }

    const settings = db.getGuild(guildId);
    settings.gameManagerRoles = settings.gameManagerRoles || [];

    if (settings.gameManagerRoles.includes(role.id)) {
      return message.reply({ embeds: [errorCard('موجودة بالفعل', `الرتبة <@&${role.id}> مسجلة بالفعل ضمن رتب إدارة الألعاب.`)] });
    }

    settings.gameManagerRoles.push(role.id);
    db.updateGuild(guildId, settings);

    return message.reply({
      embeds: [successCard('تمت إضافة رتبة الألعاب', `تم منح رتبة <@&${role.id}> صلاحية إدارة وبدء الألعاب الجماعية.`)]
    });
  }

  if (cleanCmd === 'ازالة-رتبة-العاب' || cleanCmd === 'حذف-رتبة-العاب') {
    const role = message.mentions.roles.first();
    if (!role) {
      return message.reply({ embeds: [errorCard('تحديد الرتبة مفقود', 'طريقة الاستخدام: `ازالة-رتبة-العاب @role`')] });
    }

    const settings = db.getGuild(guildId);
    settings.gameManagerRoles = settings.gameManagerRoles || [];

    if (!settings.gameManagerRoles.includes(role.id)) {
      return message.reply({ embeds: [errorCard('غير موجودة', `الرتبة <@&${role.id}> ليست ضمن رتب إدارة الألعاب.`)] });
    }

    settings.gameManagerRoles = settings.gameManagerRoles.filter(id => id !== role.id);
    db.updateGuild(guildId, settings);

    return message.reply({
      embeds: [successCard('تمت إزالة رتبة الألعاب', `تمت إزالة صلاحية إدارة الألعاب من رتبة <@&${role.id}>.`)]
    });
  }

  if (cleanCmd === 'رتب-العاب' || cleanCmd === 'رتب-الالعاب') {
    const settings = db.getGuild(guildId);
    const roles = settings.gameManagerRoles || [];

    const listText = roles.length > 0
      ? roles.map((id, idx) => `${idx + 1}. <@&${id}> (\`${id}\`)`).join('\n')
      : 'لا توجد رتب محددة حالياً (الإداريون والأونرز يملكون الصلاحية دائماً).';

    return message.reply({
      embeds: [createCard({
        title: 'رتب إدارة ومسؤولي الألعاب',
        description: `${listText}\n\n• لإضافة رتبة: \`اضف-رتبة-العاب @role\`\n• لإزالة رتبة: \`ازالة-رتبة-العاب @role\``,
        color: COLORS.primary
      })]
    });
  }

  // 11. Manage Owners (اضف-اونر, ازالة-اونر, الاونرز)
  if (cleanCmd === 'اضف-اونر' || cleanCmd === 'اضافة-اونر') {
    const target = message.mentions.users.first();
    if (!target) {
      return message.reply({ embeds: [errorCard('صيغة غير صحيحة', 'طريقة الاستخدام: `اضف-اونر @user`')] });
    }

    const settings = db.getGuild(guildId);
    settings.owners = settings.owners || [];

    if (settings.owners.includes(target.id)) {
      return message.reply({ embeds: [errorCard('موجود بالفعل', `العضو <@${target.id}> مسجل بالفعل كأونر.`)] });
    }

    settings.owners.push(target.id);
    db.updateGuild(guildId, settings);

    return message.reply({
      embeds: [successCard('تم تعيين الأونر', `تم تعيين <@${target.id}> كأونر للبوت في هذا السيرفر بنجاح.`)]
    });
  }

  if (cleanCmd === 'ازالة-اونر' || cleanCmd === 'حذف-اونر') {
    const target = message.mentions.users.first();
    if (!target) {
      return message.reply({ embeds: [errorCard('صيغة غير صحيحة', 'طريقة الاستخدام: `ازالة-اونر @user`')] });
    }

    const settings = db.getGuild(guildId);
    settings.owners = settings.owners || [];

    if (!settings.owners.includes(target.id)) {
      return message.reply({ embeds: [errorCard('غير موجود', `العضو <@${target.id}> ليس أونر في قائمة هذا السيرفر.`)] });
    }

    settings.owners = settings.owners.filter(id => id !== target.id);
    db.updateGuild(guildId, settings);

    return message.reply({
      embeds: [successCard('تمت إزالة الأونر', `تمت إزالة صلاحيات الأونر من <@${target.id}>.`)]
    });
  }

  if (cleanCmd === 'الاونرز' || cleanCmd === 'اونرز') {
    const settings = db.getGuild(guildId);
    const serverOwners = settings.owners || [];
    const serverOwnerId = message.guild.ownerId;

    const ownersList = [
      `• مالك السيرفر الأصلي: <@${serverOwnerId}>`,
      ...serverOwners.map(id => `• أونر بالسيرفر: <@${id}>`)
    ].join('\n');

    return message.reply({
      embeds: [createCard({
        title: 'قائمة مالكي البوت (Owners)',
        description: ownersList,
        color: COLORS.gold
      })]
    });
  }

  return null;
}

module.exports = { handleAdminCommand };
