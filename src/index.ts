import 'module-alias/register';
import { token } from './config';
import { Client, GatewayIntentBits } from 'discord.js';
import isValidCommandType from './utils/commands';
import CommandFactory from './factory/commands/main/CommandFactory';

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

client.login(token);
