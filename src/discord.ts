import { Client, ClientPresenceStatus, Intents, PresenceStatusData, TextChannel } from "discord.js";

class DiscordClient {
  private client: Client = new Client({ intents: [Intents.FLAGS.GUILDS] });
  private channel: TextChannel;
  private status: PresenceStatusData = process.env.DISCORD_STATUS as ClientPresenceStatus | "invisible";

  constructor() {
    this.client.login(process.env.DISCORD_TOKEN);

    this.client.once("ready", () => {
      this.setStatus(this.status);
      this.channel = this.client.channels.cache.get(process.env.DISCORD_CHANNEL_ID) as TextChannel;
      console.log("Valvot client has been started!");
    });
  }

  public setStatus = (status: ClientPresenceStatus | "invisible") => {
    this.client.user.setStatus(status);
  };

  public sendMessage = (message: string) => {
    this.channel.send(message);
  };

  public sendPrivateMessage = async (message: string) => {
    const user = await this.client.users.fetch(process.env.DISCORD_USER_ID);
    user.send(message);
  };
}

export default DiscordClient;
