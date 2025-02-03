const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');
const execPromise = util.promisify(exec);

// Common yt-dlp options to bypass restrictions
const YT_DLP_OPTIONS = [
    '--no-check-certificates',
    '--no-cache-dir',
    '--extractor-retries 3',
    '--force-ipv4',
    '--geo-bypass',
    '--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"'
].join(' ');

// Function to get video info and available formats
async function getVideoInfo(url) {
    try {
        // Use yt-dlp to get video info with additional options
        const { stdout } = await execPromise(`yt-dlp ${YT_DLP_OPTIONS} -j "${url}"`);
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
        
        // Construct yt-dlp command with additional options
        const format = isAudio ? 'ba' : format_id;
        const command = isAudio
            ? `yt-dlp ${YT_DLP_OPTIONS} -f ${format} -x --audio-format mp3 -o "${outputPath}" "${url}"`
            : `yt-dlp ${YT_DLP_OPTIONS} -f ${format} -o "${outputPath}" "${url}"`;

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