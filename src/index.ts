import 'module-alias/register';
import { token } from './config';
import { Client, GatewayIntentBits } from 'discord.js';
import isValidCommandType from './utils/commands';
import CommandFactory from './factory/commands/main/CommandFactory';
import { generateSetRankComponents } from '@src/utils/setrank-ui';
import { db } from '@src/db';
import {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`Bot ${client.user?.tag} is up!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const [commandToken] = message.content.trim().split(' ');
  const baseCommand = commandToken.toLowerCase();

  if (isValidCommandType(baseCommand)) {
    try {
      const currentCommand = CommandFactory.createCommand(
        message.content,
        message
      );
      await currentCommand.execute();
    } catch (error) {
      console.log(error);
      message.channel.send('Wrong command. Get out bitch!!!');
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (
    interaction.isStringSelectMenu() &&
    interaction.customId.startsWith('setrank_select_page_')
  ) {
    const [, , , , , userId] = interaction.customId.split('_');
    if (interaction.user.id !== userId) {
      return await interaction.reply({
        content: '❌ U need to have the power to change this.',
        ephemeral: true,
      });
    }
    const selectedId = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`setrank_modal:${selectedId}`)
      .setTitle('Nuevo Rank')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('rank_value')
            .setLabel('Nuevo rank (1.0 - 10.0)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

    await interaction.showModal(modal);
  }

  if (interaction.isButton() && interaction.customId.startsWith('setrank_')) {
    const [_, direction, rawPage, __, userId] = interaction.customId.split('_');
    if (interaction.user.id !== userId) {
      return await interaction.reply({
        content: '❌ U need to have the power to change this.',
        ephemeral: true,
      });
    }
    const currentPage = parseInt(rawPage);
    const newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;
    const { components, content } = await generateSetRankComponents(
      newPage,
      userId
    );
    await interaction.update({ content, components });
  }

  if (
    interaction.isModalSubmit() &&
    interaction.customId.startsWith('setrank_modal:')
  ) {
    const selectedId = interaction.customId.split(':')[1];
    const raw = interaction.fields.getTextInputValue('rank_value');
    let rank = parseFloat(raw);
    if (isNaN(rank)) rank = 1.5;
    rank = Math.max(1.0, Math.min(10.0, rank));
    rank = Math.round(rank * 10) / 10;

    await db.query('UPDATE players SET `rank` = ? WHERE id = ?', [
      rank,
      selectedId,
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('✅ Rank updated')
      .setDescription(
        `Player: **${selectedId}** is ranked with **${rank.toFixed(1)}**`
      );

    await interaction?.message?.delete();
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

client.login(token);
