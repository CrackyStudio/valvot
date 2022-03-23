import { Client, ClientPresenceStatus, Intents, PresenceStatusData, TextChannel } from "discord.js";
import { discordBotStatus, discordChannelId } from "./config.json";

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
    this.client.user.setStatus(status);
  };

  public sendMessage = (message: string) => {
    this.channel.send(message);
  };

  public sendPrivateMessage = async (userId: string, message: string) => {
    const user = await this.client.users.fetch(userId);
    user.send(message);
  };
}

export default DiscordClient;
