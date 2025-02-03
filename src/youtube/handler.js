const play = require('play-dl');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Function to get video info and available formats
async function getVideoInfo(url) {
    try {
        const info = await play.video_info(url);
        const formats = info.format;
        
        // Get video formats (mp4)
        const videoFormats = formats
            .filter(format => format.mimeType?.includes('video/mp4') && format.hasAudio)
            .map(format => ({
                quality: format.qualityLabel,
                format_id: format.itag,
                size: format.contentLength
            }));

        // Get audio formats
        const audioFormats = [{
            quality: 'audio',
            format_id: 'audio',
            size: null
        }];

        return {
            title: info.video_details.title,
            thumbnail: info.video_details.thumbnail.url,
            duration: info.video_details.durationInSec,
            formats: [...videoFormats, ...audioFormats]
        };
    } catch (error) {
        console.error('Error getting video info:', error);
        throw error;
    }
}

// Function to download video
async function downloadVideo(url, format_id, isAudio = false) {
    try {
        const info = await play.video_info(url);
        const videoTitle = info.video_details.title.replace(/[^a-zA-Z0-9]/g, '_');
        const tempDir = os.tmpdir();
        const outputPath = path.join(tempDir, `${videoTitle}_${Date.now()}.${isAudio ? 'mp3' : 'mp4'}`);

        if (isAudio) {
            const stream = await play.stream_from_info(info, { quality: 140 }); // 140 is audio-only format
            return new Promise((resolve, reject) => {
                const writeStream = fs.createWriteStream(outputPath);
                stream.stream.pipe(writeStream)
                    .on('finish', () => resolve(outputPath))
                    .on('error', reject);
            });
        } else {
            const stream = await play.stream_from_info(info, { quality: parseInt(format_id) });
            return new Promise((resolve, reject) => {
                const writeStream = fs.createWriteStream(outputPath);
                stream.stream.pipe(writeStream)
                    .on('finish', () => resolve(outputPath))
                    .on('error', reject);
            });
        }
    } catch (error) {
        console.error('Error downloading video:', error);
        throw error;
    }
}

// Function to clean up temporary files
function cleanupFile(filePath) {
    try {
        fs.unlinkSync(filePath);
    } catch (error) {
        console.error('Error cleaning up file:', error);
    }
}

module.exports = {
    getVideoInfo,
    downloadVideo,
    cleanupFile
}; 