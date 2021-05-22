import puppeteer from "puppeteer";
import { writeFile, access, readFile, unlink } from "fs";
import Discord, { TextChannel } from "discord.js";

import config from "../configuration.json";
import ProfileData from "interfaces/profileData";

const datasJson = "./datas/comments.json";
const discordClient = new Discord.Client();
let browser: puppeteer.Browser;
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

const saveToJson = async (
	page: puppeteer.Page,
	commentSelector: string,
	commentAuthor: string,
	commentText: string
) => {
	const commentObj = {
		author: commentAuthor,
		message: commentText,
	};
	readFile(datasJson, "utf8", (err, data) => {
		if (err) {
			console.log(err);
		} else {
			const commentId = commentSelector.substring(9);
			const obj = JSON.parse(data);
			if (!obj.hasOwnProperty(commentId)) {
				obj[`${commentId}`] = commentObj;
				writeFile(datasJson, JSON.stringify(obj, null, 2), "utf8", async () => {
					if (err) {
						throw new Error("[fs] writeFile error");
					}
					await page.evaluate((selector: string) => {
						const element = document!.querySelector(selector) as HTMLElement;
						element.style.display = "inline-block";
					}, commentSelector);
					const comment = await page.$(commentSelector);
					await comment!.screenshot({
						path: "./datas/screenshot.png",
					});
					const channel = discordClient.channels.cache.find((ch) => ch.id === config.channelId);
					if (channel!.isText()) {
						await (channel as TextChannel).send(`Nouveau commentaire sur le profil de ${profileData.personaname}:\n`, {
							files: ["./datas/screenshot.png"],
						});
					}
					unlink("./datas/screenshot.png", (error) => {
						if (error) {
							throw new Error("[fs] unlink error");
						}
					});
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
				await saveToJson(page, commentSelector, commentAuthor, commentText);
			}
		}
	}
};

const getTime = () => {
	const now = new Date();
	return `${now.getFullYear()}-${(now.getMonth() < 10 ? "0" : "") + now.getMonth()}-${
		(now.getDate() < 10 ? "0" : "") + now.getDate()
	} ${(now.getHours() < 10 ? "0" : "") + now.getHours()}:${(now.getMinutes() < 10 ? "0" : "") + now.getMinutes()}`;
};

const scrap = async () => {
	for (const url of config.profileUrl) {
		const page = await browser.newPage();
		console.log(`[${getTime()}] Checking ${url.replace(/.*\/(\w+)\/?$/, "$1")}`);
		await page.goto(url);

		const scriptSelector = ".responsive_page_template_content";
		profileData = await getProfileData(page, scriptSelector);

		const commentsSelector = `#commentthread_Profile_${profileData.steamid}_posts`;
		await getProfileComments(page, commentsSelector);
		await page.close();
	}
};

const process = async () => {
	await initiate();
	await discordClient.login(config.botToken);
	browser = await puppeteer.launch();
	setInterval(() => scrap(), 60000);
};

process();
