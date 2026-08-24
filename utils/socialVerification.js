const axios = require('axios');

async function verifyTelegramMembership(chatId, telegramUserId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { isMember: false, error: 'Bot not configured' };

  try {
    const res = await axios.get(`https://api.telegram.org/bot${token}/getChatMember`, {
      params: { chat_id: chatId, user_id: telegramUserId },
      timeout: 8000
    });
    const status = res.data?.result?.status;
    // 'left' and 'kicked' are not members
    const isMember = ['member', 'administrator', 'creator', 'restricted'].includes(status);
    return { isMember, status };
  } catch (err) {
    // Telegram returns 400 when user is not in chat or chat not found
    const errCode = err.response?.data?.error_code;
    if (errCode === 400) return { isMember: false, status: 'not_member' };
    console.error('[TelegramVerification] Error:', err.message);
    return { isMember: false, error: err.message };
  }
}

async function verifyDiscordMembership(guildId, discordUserId) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { isMember: false, error: 'Discord bot not configured' };

  try {
    await axios.get(`https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}`, {
      headers: { Authorization: `Bot ${token}` },
      timeout: 8000
    });
    return { isMember: true };
  } catch (err) {
    if (err.response?.status === 404) return { isMember: false };
    console.error('[DiscordVerification] Error:', err.message);
    return { isMember: false, error: err.message };
  }
}

async function callWebhook(webhookUrl, payload) {
  try {
    const res = await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    // Webhook must return { success: true } to pass; anything else fails
    const success = res.data?.success === true;
    return { success, message: res.data?.message || (success ? 'Verified' : 'Verification failed') };
  } catch (err) {
    console.error('[WebhookVerification] Error:', err.message);
    const msg = err.response?.data?.message || 'Could not reach verification endpoint';
    return { success: false, message: msg };
  }
}

module.exports = { verifyTelegramMembership, verifyDiscordMembership, callWebhook };
