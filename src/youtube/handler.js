const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Function to get video info and available formats
async function getVideoInfo(url) {
    try {
        const info = await ytdl.getInfo(url);
        const formats = info.formats;
        
        // Get video formats (mp4)
        const videoFormats = formats.filter(format => 
            format.container === 'mp4' && format.hasVideo && format.hasAudio
        ).map(format => ({
            quality: format.qualityLabel,
            format_id: format.itag,
            size: format.contentLength
        }));

        // Get audio formats (mp3)
        const audioFormats = formats.filter(format => 
            format.hasAudio && !format.hasVideo
        ).map(format => ({
            quality: 'audio',
            format_id: format.itag,
            size: format.contentLength
        }));

        return {
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
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
        const info = await ytdl.getInfo(url);
        const videoTitle = info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, '_');
        const tempDir = os.tmpdir();
        const outputPath = path.join(tempDir, `${videoTitle}_${Date.now()}.${isAudio ? 'mp3' : 'mp4'}`);

        return new Promise((resolve, reject) => {
            const stream = ytdl(url, {
                quality: format_id,
                filter: isAudio ? 'audioonly' : 'videoandaudio'
            });

            stream.pipe(fs.createWriteStream(outputPath))
                .on('finish', () => resolve(outputPath))
                .on('error', reject);
        });
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