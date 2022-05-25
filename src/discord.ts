import { Client, ClientPresenceStatus, Intents, PresenceStatusData, TextChannel } from "discord.js";
import { discordBotStatus, discordChannelId } from "./config";
import { Comment } from "./types";

class DiscordClient {
  private client: Client = new Client({ intents: [Intents.FLAGS.GUILDS] });
  private channel: TextChannel;
  private status: PresenceStatusData = discordBotStatus as ClientPresenceStatus | "invisible";

  constructor() {
    this.client.login(process.env.DISCORD_TOKEN);

    this.client.once("ready", () => {
      this.setStatus(this.status);
      this.channel = this.client.channels.cache.get(discordChannelId) as TextChannel;
    });
  }

  public setStatus = (status: ClientPresenceStatus | "invisible") => {
    this.client.user?.setStatus(status);
  };

  public sendMessage = (comment: Comment) => {
    this.channel.send(`Nouveau commentaire sur le profil de ${comment.recipient} !\n*“${comment.text}”\n${comment.author}* - ${comment.authorUrl}`);
  };

  public sendPrivateMessage = async (userId: string, comment: Comment) => {
    const user = await this.client.users.fetch(userId);
    user.send(comment.text);
  };
}

export default DiscordClient;
