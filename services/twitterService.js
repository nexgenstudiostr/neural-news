const { TwitterApi } = require('twitter-api-v2');

let client = null;

/**
 * Twitter API client'ı başlat
 */
function initializeTwitter() {
    const apiKey = process.env.X_API_KEY;
    const apiSecret = process.env.X_API_SECRET;
    const accessToken = process.env.X_ACCESS_TOKEN;
    const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
        console.log('⚠️ X (Twitter) API anahtarları ayarlanmamış. Paylaşım özelliği devre dışı.');
        return false;
    }

    try {
        client = new TwitterApi({
            appKey: apiKey,
            appSecret: apiSecret,
            accessToken: accessToken,
            accessSecret: accessTokenSecret
        });

        console.log('✅ X (Twitter) API bağlantısı hazır');
        return true;
    } catch (error) {
        console.error('❌ X API başlatılamadı:', error.message);
        return false;
    }
}

/**
 * Tweet gönder
 * @param {string} text - Tweet metni
 * @returns {Promise<object>} Tweet sonucu
 */
async function postTweet(text) {
    if (!client) {
        throw new Error('X API başlatılmamış. Lütfen API anahtarlarını kontrol edin.');
    }

    // Karakter limiti kontrolü (280 karakter)
    if (text.length > 280) {
        text = text.substring(0, 277) + '...';
    }

    try {
        const tweet = await client.v2.tweet(text);
        console.log('✅ Tweet gönderildi:', tweet.data.id);
        return {
            success: true,
            tweetId: tweet.data.id,
            text: text
        };
    } catch (error) {
        console.error('❌ Tweet gönderilemedi:', error.message);
        throw error;
    }
}

/**
 * Haber için tweet metni oluştur
 * @param {object} newsItem - Haber objesi
 * @returns {string} Tweet metni
 */
function formatNewsForTweet(newsItem) {
    const maxTitleLength = 200;
    let title = newsItem.title;

    // Başlığı kısalt
    if (title.length > maxTitleLength) {
        title = title.substring(0, maxTitleLength - 3) + '...';
    }

    // Tweet formatı: Başlık + URL + hashtag
    let tweet = title;

    // URL ekle (varsa)
    if (newsItem.source_url) {
        const remainingChars = 280 - tweet.length - 2; // 2 for newlines
        if (remainingChars > 25) {
            tweet += '\n\n' + newsItem.source_url;
        }
    }

    // Kaynak hashtag'i ekle (yer varsa)
    if (newsItem.source && tweet.length < 260) {
        const hashtag = '\n#' + newsItem.source.replace(/\s+/g, '');
        if (tweet.length + hashtag.length <= 280) {
            tweet += hashtag;
        }
    }

    return tweet;
}

/**
 * Haberi X'te paylaş
 * @param {object} newsItem - Haber objesi
 * @returns {Promise<object>} Paylaşım sonucu
 */
async function shareNews(newsItem) {
    const tweetText = formatNewsForTweet(newsItem);
    return await postTweet(tweetText);
}

/**
 * API bağlantı durumunu kontrol et
 */
function isConnected() {
    return client !== null;
}

module.exports = {
    initializeTwitter,
    postTweet,
    shareNews,
    formatNewsForTweet,
    isConnected
};
