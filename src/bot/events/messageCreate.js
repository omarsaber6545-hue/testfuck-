const db = require('../../database/db');
const { isBankChannelAllowed, isGameChannelAllowed } = require('../../config/owners');

// Import Economy Handlers
const { handleBalance } = require('../economy/balance');
const { handleDeposit, handleWithdraw } = require('../economy/deposit');
const { handleTransfer } = require('../economy/transfer');
const { handleJobs } = require('../economy/jobs');
const { handleWork } = require('../economy/work');
const { handleDaily } = require('../economy/daily');
const { handleRob, handleShield } = require('../economy/rob');
const { handleLoan, handleRepay, handleTip, handleInspect, handleCooldowns } = require('../economy/loan');
const { handleAdminCommand } = require('../economy/adminEconomy');

// Import Game Handlers
const { handleRouletteCommand } = require('../games/roulette');
const { handleMafiaCommand } = require('../games/mafia');
const { handleGuessCommand } = require('../games/guess');
const { handleSlotsCommand } = require('../games/slots');
const {
  handleCapitalsCommand,
  handleFlagsCommand,
  handleUnscrambleCommand,
  handleAssembleCommand,
  handleSpeedTypeCommand,
  handleCutTweetCommand
} = require('../games/wordGames');
const { handleXOCommand } = require('../games/xo');
const { handleCrashCommand } = require('../games/crash');
const { handleMinesCommand } = require('../games/mines');
const { handleDiceCommand, handleRPSCommand, handleMathCommand } = require('../games/quickGames');
const { handleLeaderboardCommand, handlePointsCommand } = require('../games/leaderboard');
const { buildHelpMenu } = require('../utils/helpMenu');
const { errorCard } = require('../utils/components');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;

    const content = message.content.trim();
    if (!content) return;

    const guildSettings = db.getGuild(message.guild.id);
    const prefixes = [guildSettings.prefix || '!', guildSettings.secondaryPrefix || '-'];

    // Determine if message starts with a configured prefix
    let hasPrefix = false;
    let commandBody = content;

    for (const p of prefixes) {
      if (content.startsWith(p)) {
        hasPrefix = true;
        commandBody = content.slice(p.length).trim();
        break;
      }
    }

    const parts = commandBody.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    // =========================================================================
    // 1. HELP MENU (اوامر, مساعدة, help)
    // =========================================================================
    if (cmd === 'اوامر' || cmd === 'مساعدة' || cmd === 'help') {
      const menu = buildHelpMenu('main');
      return message.reply({ embeds: [menu.embed], components: menu.rows });
    }

    // =========================================================================
    // 2. OWNER & ADMIN COMMANDS (اعطاء-ذهب, ازالة-ذهب, رومات-البنك, رومات-العاب...)
    // =========================================================================
    const adminTriggers = [
      'اعطاء-ذهب', 'اعطاء_ذهب', 'إعطاء-ذهب', 'ازالة-ذهب', 'ازالة_ذهب', 'سحب-ذهب',
      'اعطاء-فلوس', 'اعطاء_فلوس', 'إعطاء-فلوس', 'ازالة-فلوس', 'ازالة_فلوس', 'سحب-فلوس', 'اعطاء-كاش', 'ازالة-كاش',
      'اعطاء-نقاط', 'اعطاء_نقاط', 'ازالة-نقاط', 'ازالة_نقاط',
      'تصفير-حساب', 'تصفير_حساب',
      'اضف-روم-بنك', 'اضافة-روم-بنك', 'ازالة-روم-بنك', 'حذف-روم-بنك', 'رومات-البنك', 'رومات-بنك',
      'اضف-روم-العاب', 'اضافة-روم-العاب', 'ازالة-روم-العاب', 'حذف-روم-العاب', 'رومات-العاب', 'رومات-الالعاب',
      'اضف-رتبة-العاب', 'اضافة-رتبة-العاب', 'ازالة-رتبة-العاب', 'حذف-رتبة-العاب', 'رتب-العاب', 'رتب-الالعاب',
      'اضف-اونر', 'اضافة-اونر', 'ازالة-اونر', 'حذف-اونر', 'الاونرز', 'اونرز'
    ];

    if (adminTriggers.includes(cmd)) {
      return handleAdminCommand(message, cmd, args);
    }

    // =========================================================================
    // 3. ECONOMY & BANK COMMANDS
    // =========================================================================
    const bankCommands = [
      'رصيد', 'الرصيد', 'balance', 'bal',
      'ايداع', 'إيداع', 'dep', 'deposit',
      'سحب', 'with', 'withdraw',
      'تحويل', 'transfer', 'pay',
      'وظائف', 'الوظائف', 'وظيفة', 'jobs', 'job',
      'راتب', 'عمل', 'شغل', 'work',
      'هدية', 'يومي', 'daily',
      'نهب', 'سرقة', 'rob',
      'حماية', 'درع', 'shield',
      'قرض', 'loan',
      'سداد', 'تسديد', 'repay',
      'بقشيش', 'tip',
      'كشف', 'inspect',
      'الوقت', 'وقت', 'cooldowns'
    ];

    if (bankCommands.includes(cmd)) {
      // Enforce allowed bank channels
      if (!isBankChannelAllowed(message.channel)) {
        return message.reply({ embeds: [errorCard('روم غير مسموح', 'أوامر البنك والاقتصاد غير مصرح بها في هذا الروم. يرجى التوجه إلى الرومات المسموحة المخصصة للبنك.')] });
      }

      switch (cmd) {
        case 'رصيد':
        case 'الرصيد':
        case 'balance':
        case 'bal':
          return handleBalance(message, args);

        case 'ايداع':
        case 'إيداع':
        case 'dep':
        case 'deposit':
          return handleDeposit(message, args);

        case 'سحب':
        case 'with':
        case 'withdraw':
          return handleWithdraw(message, args);

        case 'تحويل':
        case 'transfer':
        case 'pay':
          return handleTransfer(message, args);

        case 'وظائف':
        case 'الوظائف':
        case 'وظيفة':
        case 'jobs':
        case 'job':
          return handleJobs(message, args);

        case 'راتب':
        case 'عمل':
        case 'شغل':
        case 'work':
          return handleWork(message);

        case 'هدية':
        case 'يومي':
        case 'daily':
          return handleDaily(message);

        case 'نهب':
        case 'سرقة':
        case 'rob':
          return handleRob(message, args);

        case 'حماية':
        case 'درع':
        case 'shield':
          return handleShield(message);

        case 'قرض':
        case 'loan':
          return handleLoan(message, args);

        case 'سداد':
        case 'تسديد':
        case 'repay':
          return handleRepay(message);

        case 'بقشيش':
        case 'tip':
          return handleTip(message);

        case 'كشف':
        case 'inspect':
          return handleInspect(message, args);

        case 'الوقت':
        case 'وقت':
        case 'cooldowns':
          return handleCooldowns(message);
      }
    }

    // =========================================================================
    // 4. LEADERBOARDS & POINTS
    // =========================================================================
    if (cmd === 'توب' || cmd === 'توب-فلوس' || cmd === 'توب-ذهب' || cmd === 'توب-نقاط' || cmd === 'توب-العاب' || cmd === 'top' || cmd === 'leaderboard') {
      return handleLeaderboardCommand(message, args);
    }

    if (cmd === 'نقاط' || cmd === 'نقاطي' || cmd === 'points') {
      return handlePointsCommand(message);
    }

    // =========================================================================
    // 5. GAMES ROUTER
    // =========================================================================
    const gameTriggers = [
      'روليت', 'roulette',
      'مافيا', 'mafia',
      'خمن', 'guess',
      'سلوت', 'سلوتس', 'slot', 'slots',
      'عواصم', 'عاصمة', 'capitals',
      'اعلام', 'أعلام', 'علم', 'flags',
      'فكك', 'تفكيك', 'unscramble',
      'ركب', 'تركيب', 'assemble',
      'اسرع', 'أسرع', 'fast',
      'كت', 'كت-تويت', 'كت_تويت',
      'xo', 'اكس_او', 'إكس_أو', 'اكس-او',
      'كراش', 'crash',
      'الغام', 'ألغام', 'mines',
      'نرد', 'dice',
      'حجر', 'حجر-ورقة-مقص', 'rps',
      'حساب', 'رياضيات', 'math'
    ];

    if (gameTriggers.includes(cmd)) {
      // Enforce allowed game channels
      if (!isGameChannelAllowed(message.channel)) {
        return message.reply({ embeds: [errorCard('روم غير مسموح', 'ألعاب السيرفر غير مصرح بها في هذا الروم. يرجى اللعب في الرومات المسموحة المحددة من الإدارة.')] });
      }

      switch (cmd) {
        case 'روليت':
        case 'roulette':
          return handleRouletteCommand(message, args);

        case 'مافيا':
        case 'mafia':
          return handleMafiaCommand(message);

        case 'خمن':
        case 'guess':
          return handleGuessCommand(message);

        case 'سلوت':
        case 'سلوتس':
        case 'slot':
        case 'slots':
          return handleSlotsCommand(message, args);

        case 'عواصم':
        case 'عاصمة':
        case 'capitals':
          return handleCapitalsCommand(message);

        case 'اعلام':
        case 'أعلام':
        case 'علم':
        case 'flags':
          return handleFlagsCommand(message);

        case 'فكك':
        case 'تفكيك':
        case 'unscramble':
          return handleUnscrambleCommand(message);

        case 'ركب':
        case 'تركيب':
        case 'assemble':
          return handleAssembleCommand(message);

        case 'اسرع':
        case 'أسرع':
        case 'fast':
          return handleSpeedTypeCommand(message);

        case 'كت':
        case 'كت-تويت':
        case 'كت_تويت':
          return handleCutTweetCommand(message);

        case 'xo':
        case 'اكس_او':
        case 'إكس_أو':
        case 'اكس-او':
          return handleXOCommand(message, args);

        case 'كراش':
        case 'crash':
          return handleCrashCommand(message, args);

        case 'الغام':
        case 'ألغام':
        case 'mines':
          return handleMinesCommand(message, args);

        case 'نرد':
        case 'dice':
          return handleDiceCommand(message, args);

        case 'حجر':
        case 'حجر-ورقة-مقص':
        case 'rps':
          return handleRPSCommand(message);

        case 'حساب':
        case 'رياضيات':
        case 'math':
          return handleMathCommand(message);
      }
    }
  }
};
