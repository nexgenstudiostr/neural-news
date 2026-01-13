const cron = require('node-cron');
const { fetchAllNews } = require('./newsFetcher');

let scheduledTask = null;

/**
 * 45 dakikalık zamanlayıcıyı başlat
 */
function startScheduler() {
    const intervalMinutes = parseInt(process.env.FETCH_INTERVAL_MINUTES) || 45;

    // Cron expression: her X dakikada bir
    // Örnek: */45 * * * * = her 45 dakikada
    const cronExpression = `*/${intervalMinutes} * * * *`;

    console.log(`⏰ Zamanlayıcı başlatıldı: Her ${intervalMinutes} dakikada bir haber çekilecek`);

    scheduledTask = cron.schedule(cronExpression, async () => {
        console.log('\n🔔 Zamanlanmış haber çekme başlıyor...');
        try {
            await fetchAllNews();
        } catch (error) {
            console.error('❌ Zamanlanmış haber çekme hatası:', error.message);
        }
    }, {
        scheduled: true,
        timezone: 'Europe/Istanbul'
    });

    return scheduledTask;
}

/**
 * Zamanlayıcıyı durdur
 */
function stopScheduler() {
    if (scheduledTask) {
        scheduledTask.stop();
        console.log('⏹️ Zamanlayıcı durduruldu');
        scheduledTask = null;
    }
}

/**
 * Zamanlayıcı durumunu kontrol et
 */
function isRunning() {
    return scheduledTask !== null;
}

/**
 * Manuel olarak haber çekmeyi tetikle
 */
async function triggerFetch() {
    console.log('🔄 Manuel haber çekme tetiklendi...');
    return await fetchAllNews();
}

module.exports = {
    startScheduler,
    stopScheduler,
    isRunning,
    triggerFetch
};
