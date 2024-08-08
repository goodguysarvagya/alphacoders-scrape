const fs = require("fs");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const UserPreferencesPlugin = require("puppeteer-extra-plugin-user-preferences");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
const path = require("path");
const maxConcurrentDownloads = 6;
const delayBetweenDownloads = 1000; // 1 seconds
const maxRetryAttempts = 2;
const downloadDirectory = path.join(__dirname, "wallpapers");

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin());
puppeteer.use(
  UserPreferencesPlugin({
    userPrefs: {
      download: {
        prompt_for_download: false,
        default_directory: downloadDirectory,
      },
    },
  })
);

async function scrapeWebsite() {
  const browser = await puppeteer.launch({
    //headless: false,
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

  // Specify the range of image IDs to download
  const startImageId = 1368845; //
  const endImageId = 1369176; //

  // Load user agents from the file
  const userAgents = loadUserAgentsFromFile("user-agent.txt");

  // Open the tags text file for writing (in append mode)
  const tagsFilePath = "tags.txt";
  const tagsStream = fs.createWriteStream(tagsFilePath, { flags: "a" });

  // Open the log file for writing (in append mode)
  const logFilePath = path.join(__dirname, "log.txt");
  const logStream = fs.createWriteStream(logFilePath, { flags: "a" });

  const downloadQueue = [];
  let currentIndex = startImageId;

  while (currentIndex <= endImageId) {
    const remainingDownloads = endImageId - currentIndex + 1;
    const numDownloads = Math.min(maxConcurrentDownloads, remainingDownloads);

    for (let i = 0; i < numDownloads; i++) {
      if (currentIndex <= endImageId) {
        downloadQueue.push(
          downloadImage(currentIndex, pages[i], userAgents, tagsStream, logStream)
        );
        currentIndex++;
      }
    }

    await Promise.all(downloadQueue);
    downloadQueue.length = 0; // Clear the download queue

    // Delay between batches of downloads
    await delay(5000);
  }

  // Close the tags text file
  tagsStream.end();

  await browser.close();
}

async function downloadImage(imageId, page, userAgents, tagsStream, logStream) {
  try {
    const imageUrl = `https://wall.alphacoders.com/big.php?i=${imageId}`;

    // Check if the file already exists with .jpg, .png, or .jpeg extension
    const fileExtensions = [".jpg", ".png", ".jpeg"];
    const existingFile = fileExtensions.find((extension) =>
      fs.existsSync(path.join(downloadDirectory, `${imageId}${extension}`))
    );

    if (existingFile) {
      const fileName = `${imageId}${existingFile}`;
      const skipMessage = `Skipping existing file: ${fileName}`;
      console.log(`[${getCurrentTimestamp()}] ${skipMessage}`);
      logStream.write(`${getCurrentTimestamp()} ${skipMessage}\n`);
      return;
    }

    // Set a new User-Agent header for each request
    const randomUserAgent = getRandomUserAgent(userAgents);

    await page.setUserAgent(randomUserAgent);
    await page.goto(imageUrl, { waitUntil: "domcontentloaded" });

    // Check the page title for a 404 error
    const pageTitle = await page.title();
    if (pageTitle.includes("404")) {
      const errorMessage = `Page with ID ${imageId} not found (404 error)`;
      console.log(`[${getCurrentTimestamp()}] ${errorMessage}`);
      logStream.write(`${getCurrentTimestamp()} ${errorMessage}\n`);
      return; // Skip the download
    }

    // Wait for the download button to appear
    await page.waitForSelector(`#wallpaper_${imageId}_download_button`);

    // Fetch the tags from the page
    const tags = await page.$$eval("#content-organization-container a", (elements) =>
      elements.map((el) => el.textContent)
    );

    // Write the tags and image ID to the text file
    const tagsString = `${imageId}: ${tags.join(", ")}\n`;
    tagsStream.write(tagsString);

    // Trigger the download
    await page.evaluate((id) => {
      const downloadButton = document.querySelector(`#wallpaper_${id}_download_button`);
      downloadButton.click();
    }, imageId);

    const downloadMessage = `Download initiated for wallpaper with ID ${imageId}`;
    console.log(`[${getCurrentTimestamp()}] ${downloadMessage}`);
    logStream.write(`${getCurrentTimestamp()} ${downloadMessage}\n`);

    // Wait for the download to complete
    await delay(delayBetweenDownloads);
  } catch (error) {
    const errorMessage = `Error downloading wallpaper with ID ${imageId}: ${error}`;
    console.log(`[${getCurrentTimestamp()}] ${errorMessage}`);
    logStream.write(`${getCurrentTimestamp()} ${errorMessage}\n`);

    // Retry the download if it failed due to block or error
    for (let attempt = 1; attempt <= maxRetryAttempts; attempt++) {
      const retryMessage = `Retry attempt ${attempt} for wallpaper with ID ${imageId}`;
      console.log(`[${getCurrentTimestamp()}] ${retryMessage}`);
      logStream.write(`${getCurrentTimestamp()} ${retryMessage}\n`);
      await delay(5000 * attempt); // Increase the delay for each retry

      try {
        const imageUrl = `https://wall.alphacoders.com/big.php?i=${imageId}`;

        // Set a new User-Agent header for each request
        const randomUserAgent = getRandomUserAgent(userAgents);

        await page.setUserAgent(randomUserAgent);
        await page.goto(imageUrl, { waitUntil: "networkidle0" });

        // Check the page title for a 404 error
        const pageTitle = await page.title();
        if (pageTitle.includes("404")) {
          const errorMessage = `Page with ID ${imageId} not found (404 error)`;
          console.log(`[${getCurrentTimestamp()}] ${errorMessage}`);
          logStream.write(`${getCurrentTimestamp()} ${errorMessage}\n`);
          return; // Skip the download
        }

        await page.waitForSelector(`#wallpaper_${imageId}_download_button`);
        const tags = await page.$$eval("#content-organization-container a", (elements) =>
          elements.map((el) => el.textContent)
        );

        const tagsString = `${imageId}: ${tags.join(", ")}\n`;
        tagsStream.write(tagsString);

        // Trigger the download
        await page.evaluate((id) => {
          const downloadButton = document.querySelector(`#wallpaper_${id}_download_button`);
          downloadButton.click();
        }, imageId);

        const retryDownloadMessage = `Download initiated for wallpaper with ID ${imageId}`;
        console.log(`[${getCurrentTimestamp()}] ${retryDownloadMessage}`);
        logStream.write(`${getCurrentTimestamp()} ${retryDownloadMessage}\n`);
        await delay(delayBetweenDownloads);
        break; // Exit the retry loop if download succeeds
      } catch (retryError) {
        const retryErrorMessage = `Error downloading wallpaper with ID ${imageId} on retry ${attempt}: ${retryError}`;
        console.log(`[${getCurrentTimestamp()}] ${retryErrorMessage}`);
        logStream.write(`${getCurrentTimestamp()} ${retryErrorMessage}\n`);

        if (attempt === maxRetryAttempts) {
          const maxRetryErrorMessage = `Max retry attempts reached for wallpaper with ID ${imageId}`;
          console.log(`[${getCurrentTimestamp()}] ${maxRetryErrorMessage}`);
          logStream.write(`${getCurrentTimestamp()} ${maxRetryErrorMessage}\n`);
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
  return now.toISOString();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

scrapeWebsite().catch(console.error);
