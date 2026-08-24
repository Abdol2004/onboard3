const TelegramBot = require('node-telegram-bot-api');
const User        = require('../models/User');

const TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const BOT_NAME = process.env.TELEGRAM_BOT_USERNAME || 'onboard3bot';

if (!TOKEN) {
    console.warn('[TelegramBot] No TELEGRAM_BOT_TOKEN — bot disabled');
    module.exports = { start: () => {}, bot: null };
    return;
}

let bot;

function start() {
    try {
        bot = new TelegramBot(TOKEN, { polling: { interval: 2000, autoStart: true, params: { timeout: 10 } } });
        console.log(`[TelegramBot] @${BOT_NAME} polling started`);

        // Handle /start command — including deep-link connect_<userId>
        bot.onText(/\/start(.*)/, async (msg, match) => {
            const chatId    = msg.chat.id;
            const telegramId = String(msg.from.id);
            const tgUsername = msg.from.username || '';
            const param      = (match[1] || '').trim();

            // Deep-link: /start connect_<userId>
            if (param.startsWith('connect_')) {
                const userId = param.replace('connect_', '');
                try {
                    const user = await User.findById(userId);
                    if (!user) {
                        return bot.sendMessage(chatId, '❌ Invalid link. Please go back to the ONBOARD3 website and try again.');
                    }
                    if (user.telegramConnected && user.telegramId === telegramId) {
                        return bot.sendMessage(chatId,
                            `✅ Your Telegram is already connected to @${user.username} on ONBOARD3!\n\nYou can now access quests.`
                        );
                    }
                    // Check this Telegram account isn't linked to another user
                    const existing = await User.findOne({ telegramId, telegramConnected: true, _id: { $ne: userId } });
                    if (existing) {
                        return bot.sendMessage(chatId,
                            `❌ This Telegram account is already linked to another ONBOARD3 account (@${existing.username}).\n\nEach Telegram account can only be linked to one ONBOARD3 account.`
                        );
                    }
                    // Connect the account
                    await User.findByIdAndUpdate(userId, {
                        telegramId,
                        telegramUsername: tgUsername ? '@' + tgUsername : `tg:${telegramId}`,
                        telegram: tgUsername || telegramId,
                        telegramConnected: true,
                        telegramVerifiedAt: new Date()
                    });
                    await bot.sendMessage(chatId,
                        `🎉 *Successfully connected!*\n\n` +
                        `Your Telegram account has been linked to *${user.username}* on ONBOARD3.\n\n` +
                        `🔓 Quests are now unlocked — go back to the website and refresh the page!`,
                        { parse_mode: 'Markdown' }
                    );
                } catch (err) {
                    console.error('[TelegramBot] connect error:', err);
                    bot.sendMessage(chatId, '❌ Something went wrong. Please try again or contact support.');
                }
                return;
            }

            // Generic /start — welcome message
            bot.sendMessage(chatId,
                `👋 *Welcome to @${BOT_NAME}!*\n\n` +
                `This bot connects your Telegram account to ONBOARD3 to unlock quests and rewards.\n\n` +
                `*How to connect:*\n` +
                `1. Go to ONBOARD3 → Quests page\n` +
                `2. Click "Connect Telegram"\n` +
                `3. The link will bring you back here and connect your account automatically\n\n` +
                `_Already on the website? Click the "Connect Telegram" button there._`,
                { parse_mode: 'Markdown' }
            );
        });

        // Handle /status command
        bot.onText(/\/status/, async (msg) => {
            const telegramId = String(msg.from.id);
            const user = await User.findOne({ telegramId, telegramConnected: true }).select('username xp').lean();
            if (user) {
                bot.sendMessage(msg.chat.id,
                    `✅ *Connected!*\n\nLinked to ONBOARD3 account: *${user.username}*\nXP: *${(user.xp||0).toLocaleString()}*`,
                    { parse_mode: 'Markdown' }
                );
            } else {
                bot.sendMessage(msg.chat.id, '❌ No ONBOARD3 account linked. Visit the website and click "Connect Telegram".');
            }
        });

        // Handle /disconnect command
        bot.onText(/\/disconnect/, async (msg) => {
            const telegramId = String(msg.from.id);
            const user = await User.findOneAndUpdate(
                { telegramId, telegramConnected: true },
                { telegramConnected: false, telegramId: null, telegramVerifiedAt: null },
                { new: true }
            );
            if (user) {
                bot.sendMessage(msg.chat.id, `✅ Disconnected @${user.username} from ONBOARD3. Your quests will be locked until you reconnect.`);
            } else {
                bot.sendMessage(msg.chat.id, '❌ No connected account found.');
            }
        });

        // Log errors without crashing
        bot.on('polling_error', (err) => {
            if (err.code !== 'ETELEGRAM') console.error('[TelegramBot] Polling error:', err.message);
        });

    } catch (err) {
        console.error('[TelegramBot] Failed to start:', err.message);
    }
}

module.exports = { start, get bot() { return bot; } };
