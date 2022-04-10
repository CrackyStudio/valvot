import "dotenv/config";
import DiscordClient from "./discord";
import SteamClient from "./steam";
import { users } from "./config";

const discordClient = new DiscordClient();
const steamClient = new SteamClient();

const run = async () => {
  for (const { steamProfileUrl } of users) {
    try {
      const newComments = await steamClient.getNewComments(steamProfileUrl);
      if (newComments) {
        newComments.forEach((comment) => {
          discordClient.sendMessage(comment);
        });
      }
    } catch (e) {
      console.error(e);
    }
  }
};

(async () => {
  console.log("Valvot has been started!");
  run();
  setInterval(run, 60000);
})();
