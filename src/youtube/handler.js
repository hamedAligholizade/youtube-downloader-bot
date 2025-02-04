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
    '--extractor-retries 10',
    '--force-ipv4',
    '--geo-bypass',
    '--ignore-errors',
    '--no-playlist',
    '--format-sort quality',
    '--no-warnings',
    '--no-check-formats',
    '--progress',
    '--quiet',
    '--no-resize-buffer',
    '--http-chunk-size 10M',
    '--proxy "socks5://127.0.0.1:9050"',
    '--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
    '--add-header "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"',
    '--add-header "Accept-Language: en-US,en;q=0.5"',
    '--add-header "Origin: https://www.youtube.com"',
    '--add-header "Referer: https://www.youtube.com"',
    '--add-header "Sec-Fetch-Dest: document"',
    '--add-header "Sec-Fetch-Mode: navigate"',
    '--add-header "Sec-Fetch-Site: none"',
    '--add-header "Sec-Fetch-User: ?1"',
    '--add-header "Upgrade-Insecure-Requests: 1"'
].join(' ');

// Function to get video info and available formats
async function getVideoInfo(url) {
    try {
        // First try with basic format
        try {
            const { stdout } = await execPromise(`yt-dlp ${YT_DLP_OPTIONS} -j "${url}"`);
            const info = JSON.parse(stdout);
            return processVideoInfo(info);
        } catch (firstError) {
            console.log('First attempt failed, trying with additional options...');
            // Try again with more aggressive options
            const { stdout } = await execPromise(`yt-dlp ${YT_DLP_OPTIONS} --rm-cache-dir --force-generic-extractor --no-playlist -j "${url}"`);
            const info = JSON.parse(stdout);
            return processVideoInfo(info);
        }
    } catch (error) {
        console.error('Error getting video info:', error);
        throw error;
    }
}

// Helper function to process video info
function processVideoInfo(info) {
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
        format_id: 'bestaudio/best',  // best audio quality
        size: null
    }];

    return {
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        formats: [...videoFormats, ...audioFormats]
    };
}

// Function to download video
async function downloadVideo(url, format_id, isAudio = false) {
    try {
        const tempDir = os.tmpdir();
        const timestamp = Date.now();
        const outputPath = path.join(tempDir, `video_${timestamp}.${isAudio ? 'mp3' : 'mp4'}`);
        
        // Construct yt-dlp command with additional options
        const format = isAudio ? 'bestaudio/best' : format_id;
        const command = isAudio
            ? `yt-dlp ${YT_DLP_OPTIONS} --rm-cache-dir -f ${format} -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" "${url}"`
            : `yt-dlp ${YT_DLP_OPTIONS} --rm-cache-dir -f ${format}+bestaudio/best --merge-output-format mp4 -o "${outputPath}" "${url}"`;

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