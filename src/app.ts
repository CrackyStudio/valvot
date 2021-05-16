import puppeteer from "puppeteer";
import { writeFile, access, readFile } from "fs";
import Discord, { TextChannel } from "discord.js";

import config from "../configuration.json";
import ProfileData from "interfaces/profileData";

const datasJson = "./datas/comments.json";
const discordClient = new Discord.Client();
let profileData: ProfileData;

const initiate = async (): Promise<void> => {
	access(datasJson, (error) => {
		if (error) {
			writeFile(datasJson, "{}", (err: NodeJS.ErrnoException | null) => {
				if (err) {
					throw new Error("[fs] writeFile error");
				}
			});
		}
	});
};

const getProfileData = async (page: puppeteer.Page, scriptSelector: string): Promise<ProfileData> => {
	await page.waitForSelector(scriptSelector);
	return JSON.parse(
		await page.evaluate((selector: string) => {
			return document
				.querySelector<HTMLElement>(selector)!
				.getElementsByTagName("script")[0]
				.innerHTML.match(/{(.*)}/g)![0];
		}, scriptSelector)
	);
};

const saveToJson = async (commentSelector: string, commentAuthor: string, commentText: string) => {
	const commentObj = {
		author: commentAuthor,
		message: commentText,
	};
	readFile(datasJson, "utf8", function readFileCallback(err, data) {
		if (err) {
			console.log(err);
		} else {
			const obj = JSON.parse(data);
			if (!obj.hasOwnProperty(commentSelector)) {
				obj[`${commentSelector}`] = commentObj;
				writeFile(datasJson, JSON.stringify(obj, null, 2), "utf8", async () => {
					if (err) {
						throw new Error("[fs] writeFile error");
					}
					const channel = discordClient.channels.cache.find((ch) => ch.id === config.channelId);
					if (channel!.isText()) {
						(channel as TextChannel).send(
							`Nouveau commentaire sur le profil de ${profileData.personaname}:\n*${commentText} — ${commentAuthor}*`
						);
					}
				});
			}
		}
	});
};

const getProfileComments = async (page: puppeteer.Page, commentsSelector: string) => {
	await page.waitForSelector(commentsSelector);

	const commentsSelectors = await page.evaluate((selector: string) => {
		const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
		const selectors: string[] = [];
		elements.map((coms) => {
			Array.from(coms.children!).forEach(async (comment) => {
				selectors.push(`#${comment.id}`);
			});
		});
		return selectors;
	}, commentsSelector);

	for (const commentSelector of commentsSelectors) {
		await page.waitForSelector(commentSelector);
		const comment = await page.$(commentSelector);
		const timestamp = await comment!.evaluate((el) =>
			el.querySelectorAll("[data-timestamp]")[0].getAttribute("data-timestamp")
		);
		if (Math.round(new Date().getTime() / 1000) - config.secondsToCheck < timestamp) {
			const commentTextElement = await page.waitForSelector(`#comment_content_${commentSelector.substring(9)}`);
			if (
				(await commentTextElement!.evaluate((el) => el.children.length === 1)) &&
				(await commentTextElement!.evaluate((el) => el.children[0]?.hasClassName("needs_content_check")))
			) {
				console.log("Un nouveau commentaire est disponible, mais est en attente de vérification");
			} else {
				const commentText = await commentTextElement!.evaluate((el) => el.innerText);
				const commentAuthor = await comment!.evaluate((domElement) => {
					return domElement.querySelectorAll("bdi")[0].innerText;
				});
				await saveToJson(commentSelector.substring(9), commentAuthor, commentText);
				// await comment!.screenshot({
				// 	path: `./datas/${commentSelector}.png`,
				// });
			}
		}
	}
};

const getTime = () => {
	const now = new Date();
	return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${
		(now.getHours() < 10 ? "0" : "") + now.getHours()
	}:${(now.getMinutes() < 10 ? "0" : "") + now.getMinutes()}`;
};

const scrap = async () => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	for (const url of config.profileUrl) {
		console.log(`[${getTime()}] Checking ${url.replace(/.*\/(\w+)\/?$/, "$1")}`);
		await page.goto(url);

		const scriptSelector = ".responsive_page_template_content";
		profileData = await getProfileData(page, scriptSelector);

		const commentsSelector = `#commentthread_Profile_${profileData.steamid}_posts`;
		await getProfileComments(page, commentsSelector);
	}

	await browser.close();
};

const process = async () => {
	await initiate();
	await discordClient.login(config.botToken);
	discordClient.on("message", (message) => {
		if (message.content === "!valvot") {
			message.reply(
				"Salut! Je récupère les commentaires des profils Steam toutes les minutes et je les partages ici :D"
			);
		}
		if (message.content === "!clear") {
			if (message!.member!.hasPermission("MANAGE_MESSAGES")) {
				message.channel.messages.fetch().then(
					(list: any) => {
						if (message.channel instanceof TextChannel) {
							message.channel.bulkDelete(list);
						}
					},
					(_err: any) => {
						message.channel.send("ERROR: ERROR CLEARING CHANNEL.");
					}
				);
			} else {
				message.channel.send("Tu ne disposes pas de ce droit.");
			}
		}
	});
	setInterval(() => scrap(), 60000);
};

process();
