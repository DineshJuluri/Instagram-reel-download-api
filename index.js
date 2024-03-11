const express = require('express');
const app = express();
const cors = require('cors');
const puppeteer = require('puppeteer');
const axios = require('axios');
require('dotenv').config();

const port = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

let videoSrcDataUrl = ''; // Variable to store videoSrc data URL

app.post('/reel-download', async (req, res) => {
    const { url } = req.body;

    try {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: process.env.NODE_ENV === 'production'
                ? process.env.PUPPETEER_EXECUTABLE_PATH
                : puppeteer.executablePath(),
            headless: 'new',
        });

        const page = await browser.newPage();
        await page.goto(url);
        await page.waitForSelector('video');

        const videoSrc = await page.evaluate(() => {
            const video = document.querySelector('video');
            return video ? video.src : null;
        });

        await browser.close();

        if (videoSrc) {
            videoSrcDataUrl = videoSrc;
            const proxyUrl = await fetchProxyVideoUrl(videoSrc);
            res.json({ proxyUrl, videoSrc });
        } else {
            res.status(404).json({ error: 'Video source not found.' });
        }
    } catch (error) {
        console.error('Error scraping data:', error);
        res.status(500).json({ error: 'Error scraping data' });
    }
});

const fetchProxyVideoUrl = async (originalUrl) => {
    try {
        const response = await axios.get(originalUrl, { responseType: 'stream' });
        return `http://localhost:${port}/proxy-video?videoSrc=${encodeURIComponent(videoSrcDataUrl)}`;
    } catch (error) {
        console.error('Error fetching proxy video URL:', error);
        throw error;
    }
};

app.get('/proxy-video', async (req, res) => {
    try {
        const videoSrc = decodeURIComponent(req.query.videoSrc);

        const response = await axios.get(videoSrc, {
            responseType: 'stream',
        });

        res.setHeader('Content-Type', response.headers['content-type']);
        res.setHeader('Content-Length', response.headers['content-length']);
        res.setHeader('Content-Disposition', 'inline');

        response.data.pipe(res);
    } catch (error) {
        console.error('Error serving proxy video:', error);
        res.status(500).json({ error: 'Error serving proxy video' });
    }
});

app.listen(port, () => {
    console.log(`Server Running on port ${port}`);
});
