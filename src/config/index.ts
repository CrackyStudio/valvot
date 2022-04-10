import config from "./config.json";

interface Config {
  discordBotStatus: string;
  discordChannelId: string;
  users: ConfigUser[];
}

interface ConfigUser {
  steamProfileUrl: string;
  discordUserId: string;
}

export const { discordBotStatus, discordChannelId, users } = config as Config;
