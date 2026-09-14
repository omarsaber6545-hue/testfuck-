require('dotenv').config();
const db = require('../database/db');

// Read global owner IDs from .env
function getGlobalOwners() {
  const envOwners = process.env.OWNER_IDS || '';
  return envOwners
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
}

// Check if a user is an authorized owner
function isOwner(userId, guild = null) {
  const globalOwners = getGlobalOwners();
  if (globalOwners.includes(userId)) return true;

  if (guild) {
    // Check if user is the guild owner
    if (guild.ownerId === userId) return true;

    // Check guild-specific owners list
    const settings = db.getGuild(guild.id);
    if (settings.owners && settings.owners.includes(userId)) return true;
  }

  return false;
}

// Check if a member has Game Manager permissions
function isGameManager(member) {
  if (!member || !member.guild) return false;
  if (isOwner(member.id, member.guild)) return true;
  if (member.permissions.has('Administrator')) return true;

  const settings = db.getGuild(member.guild.id);
  const managerRoles = settings.gameManagerRoles || [];
  return member.roles.cache.some(r => managerRoles.includes(r.id));
}

// Check if a channel is allowed for bank commands
function isBankChannelAllowed(channel) {
  if (!channel || !channel.guild) return true;
  const settings = db.getGuild(channel.guild.id);
  const allowed = settings.allowedBankChannels || [];
  if (allowed.length === 0) return true; // If no restriction configured, allow all
  return allowed.includes(channel.id);
}

// Check if a channel is allowed for games
function isGameChannelAllowed(channel) {
  if (!channel || !channel.guild) return true;
  const settings = db.getGuild(channel.guild.id);
  const allowed = settings.allowedGameChannels || [];
  if (allowed.length === 0) return true; // If no restriction configured, allow all
  return allowed.includes(channel.id);
}

module.exports = {
  getGlobalOwners,
  isOwner,
  isGameManager,
  isBankChannelAllowed,
  isGameChannelAllowed
};
