import "dotenv/config";
import DiscordClient from "./discord";
import SteamClient from "./steam";

const discordClient = new DiscordClient();
const steamClient = new SteamClient();

const run = async () => {
  try {
    const newComments = await steamClient.getNewComments();
    if (newComments) {
      newComments.forEach((comment) => {
        discordClient.sendPrivateMessage(comment);
      });
    }
  } catch (e) {
    console.error(e);
  }
};

(async () => {
  run();
  setInterval(run, 60000);
})();
