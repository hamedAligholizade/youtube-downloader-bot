const TelegramBot = require('node-telegram-bot-api');
const config = require('./config/config');
const { initDatabase } = require('./database/init');
const queries = require('./database/queries');
const { statsHandler } = require('./commands/stats');
const { broadcastHandler } = require('./commands/broadcast');
const { getVideoInfo, downloadVideo, cleanupFile } = require('./youtube/handler');

// Store user states
const userStates = new Map();

async function startBot() {
  try {
    // Initialize database first
    await initDatabase();

    // Initialize bot
    const bot = new TelegramBot(config.botToken, { polling: true });

    // Command handlers
    bot.onText(/\/start/, async (msg) => {
      const { id: userId, username, first_name, last_name } = msg.from;
      const botName = (await bot.getMe()).username;

      try {
        await queries.saveUser(userId, username, first_name, last_name, botName);
        await bot.sendMessage(msg.chat.id, 'Welcome! 👋\nSend me a YouTube video link, and I will help you download it in your preferred format.');
      } catch (error) {
        console.error('Error saving user:', error);
        await bot.sendMessage(msg.chat.id, 'An error occurred while processing your request.');
      }
    });

    // Handle YouTube links
    bot.on('message', async (msg) => {
      if (msg.text && (msg.text.includes('youtube.com/') || msg.text.includes('youtu.be/'))) {
        const chatId = msg.chat.id;
        try {
          await bot.sendMessage(chatId, 'Fetching video information...');
          const videoInfo = await getVideoInfo(msg.text);
          
          // Store video info in user state
          userStates.set(chatId, {
            url: msg.text,
            info: videoInfo
          });

          // Create inline keyboard with format options
          const keyboard = {
            inline_keyboard: [
              ...videoInfo.formats.map(format => [{
                text: format.quality === 'audio' ? '🎵 Audio (MP3)' : `🎥 ${format.quality}`,
                callback_data: `dl_${format.format_id}_${format.quality === 'audio' ? 'audio' : 'video'}`
              }])
            ]
          };

          await bot.sendMessage(
            chatId,
            `📹 *${videoInfo.title}*\n\nSelect your preferred format:`,
            {
              parse_mode: 'Markdown',
              reply_markup: keyboard
            }
          );
        } catch (error) {
          console.error('Error processing YouTube link:', error);
          await bot.sendMessage(chatId, 'Sorry, I could not process this video. Please make sure it\'s a valid YouTube link.');
        }
      }
    });

    // Handle callback queries (format selection)
    bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      const [action, formatId, type] = callbackQuery.data.split('_');

      if (action === 'dl') {
        const userState = userStates.get(chatId);
        if (!userState) {
          await bot.answerCallbackQuery(callbackQuery.id, { text: 'Session expired. Please send the link again.' });
          return;
        }

        try {
          await bot.answerCallbackQuery(callbackQuery.id);
          await bot.sendMessage(chatId, 'Starting download... Please wait.');

          const isAudio = type === 'audio';
          const filePath = await downloadVideo(userState.url, formatId, isAudio);

          await bot.sendMessage(chatId, `Uploading ${isAudio ? 'audio' : 'video'}... Please wait.`);
          
          // Send the file
          if (isAudio) {
            await bot.sendAudio(chatId, filePath, {
              title: userState.info.title
            });
          } else {
            await bot.sendVideo(chatId, filePath, {
              caption: userState.info.title
            });
          }

          // Clean up
          cleanupFile(filePath);
          userStates.delete(chatId);
        } catch (error) {
          console.error('Error downloading/sending file:', error);
          await bot.sendMessage(chatId, 'Sorry, there was an error processing your request. Please try again.');
        }
      }
    });

    bot.onText(/\/stats/, (msg) => statsHandler(msg, bot));
    bot.onText(/\/broadcast (.+)/, (msg) => broadcastHandler(msg, bot));

    // Error handling
    bot.on('polling_error', (error) => {
      console.error('Polling error:', error);
    });

    console.log('Bot is running...');
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

startBot(); 