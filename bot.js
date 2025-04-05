// bot.js (updated with lighter dark gray embeds and thumbnail)
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const API_BASE = 'https://keyauth3.onrender.com';
const THUMBNAIL_URL = 'https://media.discordapp.net/attachments/1357769666474541327/1357872883883577444/intelixlogo1.png?ex=67f1c92b&is=67f077ab&hm=a7457ce8904aa2f554cb02534cea92d5c52b5906af1282f59e838fdbd33d8a23&=&format=webp&quality=lossless&width=216&height=216';

const commands = [
  new SlashCommandBuilder()
    .setName('key')
    .setDescription('Key management')
    .addSubcommand(sub => sub
      .setName('validate')
      .setDescription('Validate a key')
      .addStringOption(opt => opt.setName('key').setDescription('The license key').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Add a new key')
      .addStringOption(opt => opt.setName('key').setDescription('Key to add').setRequired(true))
      .addStringOption(opt => opt.setName('expiry').setDescription('Expiry (e.g. 7d, 1w, 1m, 1y, life)').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('revoke')
      .setDescription('Revoke a key')
      .addStringOption(opt => opt.setName('key').setDescription('Key to revoke').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List all active keys')
    )
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    console.log('🔁 Registering slash commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ Slash commands registered.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
})();

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const sub = interaction.options.getSubcommand();
  const key = interaction.options.getString('key');
  const expiry = interaction.options.getString('expiry');

  try {
    if (sub === 'validate') {
      const res = await fetch(`${API_BASE}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      const data = await res.json();

      const embed = new EmbedBuilder()
        .setColor(0x2f3136)
        .setTitle(data.valid ? '✅ Key is Valid' : '❌ Invalid Key')
        .setDescription(data.valid ? `Key: \`${key}\`\nExpires: \`${data.expiry}\`` : `Reason: ${data.reason}`)
        .setFooter({ text: 'Intelix System' })
        .setThumbnail(THUMBNAIL_URL);

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'add') {
      let finalExpiry = expiry;

      if (/^\d+[dwmy]$/i.test(expiry)) {
        const num = parseInt(expiry);
        const type = expiry.slice(-1).toLowerCase();
        const now = new Date();

        if (type === 'd') now.setDate(now.getDate() + num);
        else if (type === 'w') now.setDate(now.getDate() + (num * 7));
        else if (type === 'm') now.setMonth(now.getMonth() + num);
        else if (type === 'y') now.setFullYear(now.getFullYear() + num);

        finalExpiry = now.toISOString().split('T')[0];
      }

      if (expiry.toLowerCase() === 'life') {
        const now = new Date();
        now.setFullYear(now.getFullYear() + 99999);
        finalExpiry = now.toISOString().split('T')[0];
      }

      await fetch(`${API_BASE}/add-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, expiry: finalExpiry })
      });

      const embed = new EmbedBuilder()
        .setColor(0x2f3136)
        .setTitle('🔑 Key Added')
        .setDescription(`Key: \`${key}\`\nExpires: \`${finalExpiry}\``)
        .setFooter({ text: 'Intelix System' })
        .setThumbnail(THUMBNAIL_URL);

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'revoke') {
      await fetch(`${API_BASE}/revoke-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });

      const embed = new EmbedBuilder()
        .setColor(0x2f3136)
        .setTitle('🚫 Key Revoked')
        .setDescription(`Key: \`${key}\``)
        .setFooter({ text: 'Intelix System' })
        .setThumbnail(THUMBNAIL_URL);

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'list') {
      const res = await fetch(`${API_BASE}/list-keys`);
      const keys = await res.json();

      const embed = new EmbedBuilder()
        .setColor(0x2f3136)
        .setTitle('📋 Key List')
        .setFooter({ text: 'Intelix System' })
        .setThumbnail(THUMBNAIL_URL);

      if (keys.length === 0) {
        embed.setDescription('No keys found.');
      } else {
        const fields = keys.map(k => `**${k.key}** - expires \`${k.expiry}\``);
        embed.setDescription(fields.join('\n'));
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (err) {
    console.error(err);
    const errorEmbed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle('❌ Error')
      .setDescription(`\`\`\`${err.message}\`\`\``)
      .setFooter({ text: 'Intelix System' })
      .setThumbnail(THUMBNAIL_URL);

    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
