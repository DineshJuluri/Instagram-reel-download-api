const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const port = 3000;
app.use(express.json());
app.post('/reel-download', async (req, res) => {
    const { url } = req.body;
    console.log(url);
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url);
        await page.waitForSelector('video');
        const videoSrc = await page.evaluate(() => {
            const video = document.querySelector('video');
            return video ? video.src : null;
        });
        console.log(videoSrc);
        await browser.close();
        if (videoSrc) {
            res.json({ videoSrc });
        } else {
            res.status(404).json({ error: 'Video source not found.' });
        }
    } catch (error) {
        console.error('Error scraping data:', error);
        res.status(500).json({ error: 'Error scraping data' });
    }
});
app.listen(port, () => {
    console.log(`Server Running`);
});
