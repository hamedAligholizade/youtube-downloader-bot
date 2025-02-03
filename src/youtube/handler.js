const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');
const execPromise = util.promisify(exec);

// Function to get video info and available formats
async function getVideoInfo(url) {
    try {
        // Use yt-dlp to get video info
        const { stdout } = await execPromise(`yt-dlp -j "${url}"`);
        const info = JSON.parse(stdout);
        
        // Get video formats (mp4)
        const videoFormats = info.formats
            .filter(format => 
                format.ext === 'mp4' && 
                format.acodec !== 'none' && 
                format.vcodec !== 'none'
            )
            .map(format => ({
                quality: format.height ? `${format.height}p` : format.format_note,
                format_id: format.format_id,
                size: format.filesize
            }));

        // Add audio option
        const audioFormats = [{
            quality: 'audio',
            format_id: 'ba',  // best audio
            size: null
        }];

        return {
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
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
        const tempDir = os.tmpdir();
        const timestamp = Date.now();
        const outputPath = path.join(tempDir, `video_${timestamp}.${isAudio ? 'mp3' : 'mp4'}`);
        
        // Construct yt-dlp command
        const format = isAudio ? 'ba' : format_id;
        const command = isAudio
            ? `yt-dlp -f ${format} -x --audio-format mp3 -o "${outputPath}" "${url}"`
            : `yt-dlp -f ${format} -o "${outputPath}" "${url}"`;

        // Execute download
        await execPromise(command);
        
        // Return the path to the downloaded file
        return outputPath;
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