import puppeteer from "puppeteer";
import jsdom from "jsdom";
import { Comment } from "./types";

class SteamClient {
  private browser: Promise<puppeteer.Browser> = puppeteer.launch({
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
  });
  private page?: Promise<puppeteer.Page>;
  private interval: number = 60;

  public navigate = async (url: string) => {
    this.page = (await this.browser).newPage();
    await this.setRequestInterception(true);
    await (await this.page).goto(url);
    console.log(`Navigated to ${url}`);
  };

  private setRequestInterception = async (enable: boolean) => {
    if (!enable) {
      return;
    }
    await (await this.page).setRequestInterception(true);
    (await this.page).on("request", (request) => {
      if (["image", "stylesheet", "font", "script"].indexOf(request.resourceType()) !== -1) {
        request.abort();
      } else {
        request.continue();
      }
    });
  };

  public closePage = async (): Promise<void> => {
    if (this.page !== undefined) {
      await (await this.page).close();
      console.log("Page closed");
    }
  };

  public getNewComments = async (profileUrl: string): Promise<Comment[] | null> => {
    await this.navigate(profileUrl);

    const username = await (await this.page).evaluate(() => document.querySelector(".persona_name_text_content").textContent.trim());
    const comments = await (await this.page).evaluate(() => Array.from(document.querySelectorAll(".commentthread_comment"), (element) => element.innerHTML));
    const newComments: Comment[] = [];
    const interval = this.interval;

    comments.some(async (comment) => {
      comment.replace("\\t", "");
      comment.replace("\\n", "");

      const commentDom = new jsdom.JSDOM(comment).window.document;
      const commentTimestamp = commentDom.querySelector(".commentthread_comment_timestamp").getAttribute("data-timestamp");

      if ((Math.round(new Date().getTime() / 1000) - interval).toString() < commentTimestamp) {
        const commentText = commentDom.querySelector(".commentthread_comment_text").textContent.trim();

        if (commentText.includes("This comment is awaiting analysis")) {
          this.interval = 120;
          newComments.length = 0;
          return true;
        } else {
          this.interval = 60;
          const commentAuthor = commentDom.querySelector(".commentthread_author_link").textContent.trim();
          const commentAuthorProfile = (<HTMLLinkElement>commentDom.querySelector(".commentthread_author_link")).href;

          newComments.push({ author: commentAuthor, authorUrl: commentAuthorProfile, recipient: username, text: commentText });
        }
      }
    });

    await this.closePage();

    return newComments ? newComments : null;
  };
}

export default SteamClient;
