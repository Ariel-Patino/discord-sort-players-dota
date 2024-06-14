import { token } from './config';
import { Client, GatewayIntentBits } from 'discord.js';
import isValidCommandType from './utils/commands';
import CommandFactory from './factory/commands/CommandFactory';

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
  if (isValidCommandType(message.content)) {
    const currentCommand = CommandFactory.createCommand(
      message.content,
      message
    );
    currentCommand.execute();
  }
});

client.login(token);
