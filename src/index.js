require('dotenv').config();
const chalk = require('chalk');
const { createClient } = require('./bot/client');

// Import events
const readyEvent = require('./bot/events/ready');
const messageCreateEvent = require('./bot/events/messageCreate');
const interactionCreateEvent = require('./bot/events/interactionCreate');

const token = process.env.DISCORD_TOKEN;

if (!token || token === 'your_bot_token_here') {
  console.error(chalk.red('[Error] DISCORD_TOKEN is missing or not configured in .env file!'));
  process.exit(1);
}

const client = createClient();

// Register events
client.once(readyEvent.name, (...args) => readyEvent.execute(...args, client));
client.on(messageCreateEvent.name, (...args) => messageCreateEvent.execute(...args, client));
client.on(interactionCreateEvent.name, (...args) => interactionCreateEvent.execute(...args, client));

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('[UnhandledRejection]'), reason);
});

process.on('uncaughtException', (err) => {
  console.error(chalk.red('[UncaughtException]'), err);
});

console.log(chalk.blue('----------------------------------------------------'));
console.log(chalk.blue('   Discord Games & Bank Bot (Fezbo Edition)         '));
console.log(chalk.blue('----------------------------------------------------'));
console.log(chalk.yellow('[Bot] Logging in to Discord...'));

client.login(token).catch(err => {
  console.error(chalk.red('[Bot] Login failed:'), err.message);
});
