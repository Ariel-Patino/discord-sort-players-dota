import { token } from './config';
import { Client, GatewayIntentBits } from 'discord.js';

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
  if (message.content === '!sort') {
    if (!message.member?.voice.channel) {
      message.reply('Works on voice channel only!');
      return;
    }

    const voiceChannel = message.member.voice.channel;
    const members = voiceChannel.members;

    if (members.size < 2) {
      message.reply('R U a f* loser?, call someone else to play with!');
      return;
    }

    const shuffledMembers = Array.from(members.values()).sort(
      () => Math.random() - 0.5
    );

    const team1 = shuffledMembers.slice(
      0,
      Math.ceil(shuffledMembers.length / 2)
    );
    const team2 = shuffledMembers.slice(Math.ceil(shuffledMembers.length / 2));

    message.channel.send(
      `Sentinel: ${team1.map((member) => member.user.username).join(', ')}`
    );
    message.channel.send(
      `Scourge: ${team2.map((member) => member.user.username).join(', ')}`
    );
  }
});

client.login(token);
