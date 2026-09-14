const chalk = require('chalk');
const { ActivityType, Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady || 'ready',
  once: true,
  execute(client) {
    console.log(chalk.green(`[Bot] Connected successfully as ${client.user.tag}`));
    console.log(chalk.cyan(`[Bot] Serving ${client.guilds.cache.size} servers with full Games & Bank system.`));

    // Set custom activity
    client.user.setPresence({
      activities: [
        {
          name: '!اوامر | !روليت | !رصيد',
          type: ActivityType.Playing
        }
      ],
      status: 'online'
    });
  }
};
