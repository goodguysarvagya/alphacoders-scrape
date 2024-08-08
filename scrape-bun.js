const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const UserPreferencesPlugin = require("puppeteer-extra-plugin-user-preferences");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
const { promisify } = require("util");
const stat = promisify(fs.stat);

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin());
puppeteer.use(
  UserPreferencesPlugin({
    userPrefs: {
      download: {
        prompt_for_download: false,
        default_directory: path.join(__dirname, "wallpapers"),
      },
    },
  })
);

const maxConcurrentDownloads = 6;
const delayBetweenDownloads = 1000; // 1 second
const maxRetryAttempts = 2;
const downloadDirectory = path.join(__dirname, "AlphaCoders");

async function scrapeWebsite() {
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: null,
    args: [
      "--incognito",
      "--start-maximized",
      "--disable-web-security",
      "--disable-dev-shm-usage",
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--blink-settings=imagesEnabled=false",
    ],
  });

  const pages = await Promise.all(
    Array.from(Array(maxConcurrentDownloads)).map(() => browser.newPage())
  );

  const startImageId = 1358133;
  const endImageId = 1358151;

  const userAgents = loadUserAgentsFromFile("user-agent.txt");

  const tagsFilePath = path.join(__dirname, "tags.txt");
  const logFilePath = path.join(__dirname, "log.txt");

  const downloadQueue = [];
  let currentIndex = startImageId;

  while (currentIndex <= endImageId) {
    const remainingDownloads = endImageId - currentIndex + 1;
    const numDownloads = Math.min(maxConcurrentDownloads, remainingDownloads);

    for (let i = 0; i < numDownloads; i++) {
      if (currentIndex <= endImageId) {
        downloadQueue.push(
          downloadImage(currentIndex, pages[i], userAgents, tagsFilePath, logFilePath)
        );
        currentIndex++;
      }
    }

    await Promise.all(downloadQueue);
    downloadQueue.length = 0;

    await delay(5000);
  }

  await browser.close();
}

async function downloadImage(imageId, page, userAgents, tagsFilePath, logFilePath) {
  try {
    const imageUrl = `https://wall.alphacoders.com/big.php?i=${imageId}`;
    const filePath = path.join(downloadDirectory, `${imageId}.jpg`);

    if (await isValidImageFile(filePath)) {
      const skipMessage = `Skipping existing file: ${filePath}`;
      console.log(`[${getCurrentTimestamp()}] ${skipMessage}`);
      await Bun.write(Bun.file(logFilePath), `[${getCurrentTimestamp()}] ${skipMessage}\n`);
      return;
    }

    const randomUserAgent = getRandomUserAgent(userAgents);
    await page.setUserAgent(randomUserAgent);
    await page.goto(imageUrl, { waitUntil: "domcontentloaded" });

    const pageTitle = await page.title();
    if (pageTitle.includes("404")) {
      const errorMessage = `Page with ID ${imageId} not found (404 error)`;
      console.log(`[${getCurrentTimestamp()}] ${errorMessage}`);
      await Bun.write(Bun.file(logFilePath), `[${getCurrentTimestamp()}] ${errorMessage}\n`);
      return;
    }

    await page.waitForSelector(`#wallpaper_${imageId}_download_button`);
    const tags = await page.$$eval("#content-organization-container a", (elements) =>
      elements.map((el) => el.textContent)
    );

    const tagsString = `${imageId}: ${tags.join(", ")}\n`;
    await Bun.write(Bun.file(tagsFilePath), tagsString);

    // Trigger the download
    await page.evaluate((id) => {
      const downloadButton = document.querySelector(`#wallpaper_${id}_download_button`);
      downloadButton.click();
    }, imageId);

    const downloadMessage = `Download initiated for wallpaper with ID ${imageId}`;
    console.log(`[${getCurrentTimestamp()}] ${downloadMessage}`);
    await Bun.write(Bun.file(logFilePath), `[${getCurrentTimestamp()}] ${downloadMessage}\n`);

    await delay(delayBetweenDownloads);
  } catch (error) {
    const errorMessage = `Error downloading wallpaper with ID ${imageId}: ${error}`;
    console.log(`[${getCurrentTimestamp()}] ${errorMessage}`);
    await Bun.write(Bun.file(logFilePath), `[${getCurrentTimestamp()}] ${errorMessage}\n`);

    for (let attempt = 1; attempt <= maxRetryAttempts; attempt++) {
      const retryMessage = `Retry attempt ${attempt} for wallpaper with ID ${imageId}`;
      console.log(`[${getCurrentTimestamp()}] ${retryMessage}`);
      await Bun.write(Bun.file(logFilePath), `[${getCurrentTimestamp()}] ${retryMessage}\n`);
      await delay(5000 * attempt);

      try {
        const imageUrl = `https://wall.alphacoders.com/big.php?i=${imageId}`;
        const randomUserAgent = getRandomUserAgent(userAgents);
        await page.setUserAgent(randomUserAgent);
        await page.goto(imageUrl, { waitUntil: "networkidle0" });

        const pageTitle = await page.title();
        if (pageTitle.includes("404")) {
          const errorMessage = `Page with ID ${imageId} not found (404 error)`;
          console.log(`[${getCurrentTimestamp()}] ${errorMessage}`);
          await Bun.write(Bun.file(logFilePath), `[${getCurrentTimestamp()}] ${errorMessage}\n`);
          return;
        }

        await page.waitForSelector(`#wallpaper_${imageId}_download_button`);
        const tags = await page.$$eval("#content-organization-container a", (elements) =>
          elements.map((el) => el.textContent)
        );

        const tagsString = `${imageId}: ${tags.join(", ")}\n`;
        await Bun.write(Bun.file(tagsFilePath), tagsString);

        // Trigger the download
        await page.evaluate((id) => {
          const downloadButton = document.querySelector(`#wallpaper_${id}_download_button`);
          downloadButton.click();
        }, imageId);

        const retryDownloadMessage = `Download initiated for wallpaper with ID ${imageId}`;
        console.log(`[${getCurrentTimestamp()}] ${retryDownloadMessage}`);
        await Bun.write(
          Bun.file(logFilePath),
          `[${getCurrentTimestamp()}] ${retryDownloadMessage}\n`
        );
        await delay(delayBetweenDownloads);
        break;
      } catch (retryError) {
        const retryErrorMessage = `Error downloading wallpaper with ID ${imageId} on retry ${attempt}: ${retryError}`;
        console.log(`[${getCurrentTimestamp()}] ${retryErrorMessage}`);
        await Bun.write(Bun.file(logFilePath), `[${getCurrentTimestamp()}] ${retryErrorMessage}\n`);

        if (attempt === maxRetryAttempts) {
          const maxRetryErrorMessage = `Max retry attempts reached for wallpaper with ID ${imageId}`;
          console.log(`[${getCurrentTimestamp()}] ${maxRetryErrorMessage}`);
          await Bun.write(
            Bun.file(logFilePath),
            `[${getCurrentTimestamp()}] ${maxRetryErrorMessage}\n`
          );
        }
      }
    }
  }
}

function loadUserAgentsFromFile(filePath) {
  const userAgents = fs.readFileSync(filePath, "utf-8").split("\n");
  return userAgents.filter((agent) => agent.trim().length > 0);
}

function getRandomUserAgent(userAgents) {
  const randomIndex = Math.floor(Math.random() * userAgents.length);
  return userAgents[randomIndex];
}

function getCurrentTimestamp() {
  const now = new Date();
  return now.toLocaleString();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isValidImageFile(filePath) {
  try {
    const stats = await stat(filePath);
    return stats.size > 0;
  } catch (error) {
    return false;
  }
}

scrapeWebsite().catch(console.error);
