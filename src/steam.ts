import puppeteer from "puppeteer";
import jsdom from "jsdom";

class SteamClient {
  private browser: Promise<puppeteer.Browser> = puppeteer.launch({
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
  });
  private page?: Promise<puppeteer.Page>;
  private interval: number = 60;

  public navigate = async (url: string) => {
    this.page = (await this.browser).newPage();
    await (await this.page).goto(url);
    console.log(`Navigated to ${url}`);
  };

  public closePage = async (): Promise<void> => {
    if (this.page !== undefined) {
      await (await this.page).close();
      console.log("Page closed");
    }
  };

  public getNewComments = async (profileUrl: string): Promise<string[] | null> => {
    await this.navigate(profileUrl);

    const comments = await (await this.page).evaluate(() => Array.from(document.querySelectorAll(".commentthread_comment"), (element) => element.innerHTML));
    const newComments: string[] = [];
    const interval = this.interval;

    comments.some((comment) => {
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

          newComments.push(`${commentAuthor}: ${commentText} (${commentAuthorProfile})`);
        }
      }
    });

    await this.closePage();

    return newComments ? newComments : null;
  };
}

export default SteamClient;
