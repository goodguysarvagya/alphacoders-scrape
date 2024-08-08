# Wallpaper Scraper

A Puppeteer-powered script that scrapes and downloads high-quality wallpapers from the [wall.alphacoders.com](https://wall.alphacoders.com/), with features like parallel downloading and tag information retrieval, logging etc.

## Features

- **Parallel Downloading**: The script leverages Puppeteer's concurrency capabilities to download multiple wallpapers simultaneously, significantly improving the download speed.
- **Tag Extraction**: The script retrieves and stores the relevant tags (e.g., resolution, artist, category) associated with each wallpaper, providing valuable metadata.
- **Configurable Scraping**: Users can specify the range of image IDs to download, as well as adjust the number of concurrent downloads and delay between them.
- **Robust Error Handling**: The script includes comprehensive error handling to ensure a smooth execution, with automatic retry attempts in case of temporary issues.
- **Logging and Tracking**: The script logs all actions, including skipped downloads, errors, and retry attempts, to a separate log file for troubleshooting and monitoring.

## Prerequisites

- Node (version 16 or higher)
- npm (Node.js package manager) or pnpm (preferred)
- A `user-agent.txt` file containing a list of user agent strings (one per line)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/goodguysarvagya/alphacoders-scrape.git
   ```
2. Navigate to the project directory:
   ```
   cd wallpaper-scraper
   ```
3. Install the required dependencies:
   ```
   pnpm i
   ```

## Usage

1. Open the `scrape.js` file and update the following configuration options:
   - `startImageId`: The starting image ID to download.
   - `endImageId`: The ending image ID to download.
   - `maxConcurrentDownloads`: The maximum number of concurrent downloads.
   - `delayBetweenDownloads`: The delay (in milliseconds) between each download.
   - `maxRetryAttempts`: The maximum number of retry attempts for failed downloads.
   - `downloadDirectory`: The local directory where the downloaded wallpapers will be saved.
2. Ensure the `user-agent.txt` file is present in the project directory and contains a list of user agent strings.

3. Run the script:
   ```
   node scrape.js
   ```
4. The script will start scraping and downloading the wallpapers, logging the progress and any errors to the `log.txt` file.
5. The downloaded wallpapers will be saved in the `wallpapers` directory, and the associated tags will be written to the `tags.txt` file.

## Customization

- **Adjusting the Image ID Range**: Update the `startImageId` and `endImageId` variables in the `scrape.js` file to change the range of image IDs to be downloaded.
- **Modifying Concurrency and Delay**: Adjust the `maxConcurrentDownloads` and `delayBetweenDownloads` variables to control the download speed and resource usage.
- **Changing the Output Directory**: Modify the `downloadDirectory` variable in the `scrape.js` file to save the downloaded wallpapers to a different location.

## Upcoming Features

We're constantly working to improve the Wallpaper Scraper. Here are some features we're planning to implement in future updates:

1. **Command-line Interface**: Allow users to specify configuration options directly from the command line, making it easier to run the script with different parameters without modifying the source code.

2. **bun optimised version**: An experimental scrape-bun.js is provided, aim is to make a bun version of the script and compare the results between the two versions.

3. **Filtering Options**: Implement filters for resolution, aspect ratio, and categories to allow users to download only the wallpapers that meet specific criteria.

4. **Resume Functionality**: Add the ability to resume a previously interrupted download session, picking up where it left off.

5. **Duplicate Detection**: Implement a feature to detect and skip duplicate wallpapers based on file hash or image similarity.

6. **Automatic Tagging**: Enhance the tag extraction feature with machine learning-based image recognition to automatically generate additional relevant tags.

7. **Web Interface**: Develop a simple web interface for easier configuration and monitoring of the scraping process.

8. **Scheduled Scraping**: Add functionality to automatically run the scraper at scheduled intervals to keep the wallpaper collection up-to-date.

## Contributing

If you find any issues or have suggestions for improvements, feel free to open an issue or submit a pull request. Contributions are always welcome!

## License

This project is licensed under the [MIT License](LICENSE).
