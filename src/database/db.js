const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class Collection {
  constructor(name) {
    this.name = name;
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    this.data = new Map();
    this.saveTimeout = null;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        for (const [key, value] of Object.entries(parsed)) {
          this.data.set(key, value);
        }
      }
    } catch (err) {
      console.error(`[Database] Error loading collection ${this.name}:`, err);
    }
  }

  save() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      try {
        const obj = Object.fromEntries(this.data);
        const tempPath = `${this.filePath}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(obj, null, 2), 'utf8');
        fs.renameSync(tempPath, this.filePath);
      } catch (err) {
        console.error(`[Database] Error saving collection ${this.name}:`, err);
      } finally {
        this.saveTimeout = null;
      }
    }, 100);
  }

  get(key, defaultValue = null) {
    if (!this.data.has(key)) {
      if (defaultValue !== null) {
        const clone = JSON.parse(JSON.stringify(defaultValue));
        this.set(key, clone);
        return clone;
      }
      return null;
    }
    return this.data.get(key);
  }

  set(key, value) {
    this.data.set(key, value);
    this.save();
    return value;
  }

  update(key, updater, defaultValue = {}) {
    let current = this.get(key);
    if (!current) {
      current = JSON.parse(JSON.stringify(defaultValue));
    }
    const updated = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
    this.set(key, updated);
    return updated;
  }

  delete(key) {
    const res = this.data.delete(key);
    if (res) this.save();
    return res;
  }

  all() {
    return Array.from(this.data.entries()).map(([key, value]) => ({ key, ...value }));
  }

  filter(predicate) {
    const results = [];
    for (const [key, value] of this.data.entries()) {
      if (predicate(value, key)) results.push({ key, ...value });
    }
    return results;
  }
}

class Database {
  constructor() {
    this.guilds = new Collection('guilds');
    this.users = new Collection('users');
    this.games = new Collection('games_history');
  }

  // Guild settings (no hardcoded channels or roles!)
  getGuild(guildId) {
    const defaultSettings = {
      guildId,
      prefix: '!',
      secondaryPrefix: '-',
      allowedBankChannels: [],   // If empty, bank works in all channels unless configured
      allowedGameChannels: [],   // If empty, games work in all channels unless configured
      gameManagerRoles: [],      // Roles that can start/manage host games (Roulette, Mafia)
      owners: []                 // Guild-specific owners (in addition to global env owners)
    };
    return this.guilds.get(guildId, defaultSettings);
  }

  updateGuild(guildId, updater) {
    return this.guilds.update(guildId, updater, this.getGuild(guildId));
  }

  // User economy & points profile
  getUser(guildId, userId) {
    const key = `${guildId}_${userId}`;
    const defaultUserData = {
      guildId,
      userId,
      cash: 1000,
      gold: 5,
      bank: 0,
      gamePoints: 0,
      job: null,
      lastWork: 0,
      lastDaily: 0,
      dailyStreak: 0,
      lastRob: 0,
      lastTip: 0,
      shieldUntil: 0,
      loan: 0,
      totalRobbed: 0,
      level: 1,
      xp: 0
    };
    return this.users.get(key, defaultUserData);
  }

  updateUser(guildId, userId, updater) {
    const key = `${guildId}_${userId}`;
    return this.users.update(key, updater, this.getUser(guildId, userId));
  }

  // Leaderboard helpers
  getTopUsers(guildId, type = 'cash', limit = 10) {
    const allUsers = this.users.all().filter(u => u.guildId === guildId);
    if (type === 'gold') {
      return allUsers.sort((a, b) => (b.gold || 0) - (a.gold || 0)).slice(0, limit);
    }
    if (type === 'points') {
      return allUsers.sort((a, b) => (b.gamePoints || 0) - (a.gamePoints || 0)).slice(0, limit);
    }
    if (type === 'bank') {
      return allUsers.sort((a, b) => (b.bank || 0) - (a.bank || 0)).slice(0, limit);
    }
    // Networth (Cash + Bank)
    return allUsers.sort((a, b) => ((b.cash || 0) + (b.bank || 0)) - ((a.cash || 0) + (a.bank || 0))).slice(0, limit);
  }
}

const db = new Database();
module.exports = db;
