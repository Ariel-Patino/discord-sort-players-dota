import 'module-alias/register';
import retieveChatMembers from '@root/src/helpers/sort/retieveChatMembers';
import Command from './Command';
import { players } from '@root/src/store/players';

export default class SortRankedCommand extends Command {
  constructor(command: string, chatChannel: any) {
    super(command, chatChannel);
  }

  execute(): void {
    const members = retieveChatMembers(this.chatChannel);
    if (!members) {
      return;
    }
    this.sentTeamsPlayers(members);
    this.chatChannel.channel.send(`Sort Ranked not implemented yet`);
  }

  sentTeamsPlayers(members: any) {
    const suffledPlayers = this.shuffleTeams(Array.from(members.values()));
    const dotaPlayers = this.getDotaPlayers(suffledPlayers);
    const teamsBalanced = this.balanceTeams(dotaPlayers);
  }

  getDotaPlayers = (suffledPlayers: any[]) => {
    return suffledPlayers.map((member: any) => {
      const user = players[member?.user?.username as string];
      if (!user) {
        return {
          dotaName: `${member.user.username}`,
          rank: 0,
          support: false,
          carry: false,
          tanque: true,
        };
      }
      return user;
    });
  };

  shuffleTeams = (array: any[]): any[] => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  balanceTeams = (players: any[]) => {
    const team1: any[] = [];
    const team2: any[] = [];
    let team1Score = 0;
    let team2Score = 0;
    let team1Roles = { carry: 0, support: 0, tanque: 0 };
    let team2Roles = { carry: 0, support: 0, tanque: 0 };

    for (const player of players) {
      if (team1Score <= team2Score) {
        team1.push(player);
        team1Score += player.rank;
        if (player.carry) team1Roles.carry++;
        if (player.support) team1Roles.support++;
        if (player.tanque) team1Roles.tanque++;
      } else {
        team2.push(player);
        team2Score += player.rank;
        if (player.carry) team2Roles.carry++;
        if (player.support) team2Roles.support++;
        if (player.tanque) team2Roles.tanque++;
      }
    }
    this.verifyRoles(team1, team1Roles, players);
    this.verifyRoles(team2, team2Roles, players);
    return { team1, team2 };
  };
  //It is necessaty for Roles implement 1v1 2v2 3v3 4v4 5v5
  verifyRoles = (
    team: any[],
    roles: { carry: number; support: number; tanque: number },
    players: any[]
  ) => {
    const rolesNeeded = ['carry', 'support', 'tanque'] as const;

    rolesNeeded.forEach((rol) => {
      if (roles[rol] === 0) {
        for (let i = team.length - 1; i >= 0; i--) {
          if (!team[i][rol]) {
            const replacement = team.splice(i, 1)[0];
            const newPlayer = players.find(
              (user) => user[rol] && !team.includes(user)
            );
            if (newPlayer) {
              team.push(newPlayer);
              roles[rol]++;
              if (replacement.carry) roles.carry--;
              if (replacement.support) roles.support--;
              if (replacement.tanque) roles.tanque--;
              break;
            }
          }
        }
      }
    });
  };
}
