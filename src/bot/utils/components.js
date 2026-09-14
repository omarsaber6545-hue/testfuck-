const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require('discord.js');

const COLORS = {
  primary: '#5865F2',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  gold: '#EAB308',
  dark: '#18181B',
  muted: '#71717A'
};

/**
 * Clean modern embed without emoji spam
 */
function createCard({
  title = null,
  description = null,
  color = COLORS.primary,
  fields = [],
  footer = null,
  author = null,
  thumbnail = null,
  image = null,
  timestamp = false
}) {
  const embed = new EmbedBuilder().setColor(color);

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (fields && fields.length > 0) embed.addFields(fields);
  if (footer) {
    if (typeof footer === 'string') embed.setFooter({ text: footer });
    else embed.setFooter(footer);
  }
  if (author) embed.setAuthor(author);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (timestamp) embed.setTimestamp();

  return embed;
}

/**
 * Success message embed
 */
function successCard(title, message) {
  return createCard({
    title: title,
    description: message,
    color: COLORS.success
  });
}

/**
 * Error / alert embed
 */
function errorCard(title, message) {
  return createCard({
    title: title,
    description: message,
    color: COLORS.danger
  });
}

/**
 * Informational / warning embed
 */
function infoCard(title, message) {
  return createCard({
    title: title,
    description: message,
    color: COLORS.primary
  });
}

/**
 * Create a clean button component
 */
function createButton({ customId, label, style = ButtonStyle.Secondary, disabled = false, emoji = null }) {
  const btn = new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style)
    .setDisabled(disabled);

  if (emoji) btn.setEmoji(emoji);
  return btn;
}

/**
 * Create an action row containing components
 */
function createRow(...components) {
  return new ActionRowBuilder().addComponents(...components);
}

/**
 * Create a string select menu
 */
function createSelectMenu({ customId, placeholder, options = [], minValues = 1, maxValues = 1 }) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .setMinValues(minValues)
    .setMaxValues(maxValues);

  const formattedOptions = options.map(opt => {
    const builder = new StringSelectMenuOptionBuilder()
      .setLabel(opt.label)
      .setValue(opt.value);

    if (opt.description) builder.setDescription(opt.description);
    if (opt.emoji) builder.setEmoji(opt.emoji);
    if (opt.default) builder.setDefault(opt.default);
    return builder;
  });

  menu.addOptions(formattedOptions);
  return menu;
}

module.exports = {
  COLORS,
  createCard,
  successCard,
  errorCard,
  infoCard,
  createButton,
  createRow,
  createSelectMenu,
  ButtonStyle
};
