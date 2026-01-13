require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

async function testConnection() {
    console.log('🔍 Twitter API Bağlantı Testi Başlatılıyor...');

    const apiKey = process.env.X_API_KEY;
    const apiSecret = process.env.X_API_SECRET;
    const accessToken = process.env.X_ACCESS_TOKEN;
    const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

    console.log('1. Çevresel Değişkenler Kontrol Ediliyor:');
    console.log(`- API Key: ${apiKey ? '✅ Var (' + apiKey.substring(0, 4) + '...)' : '❌ YOK'}`);
    console.log(`- API Secret: ${apiSecret ? '✅ Var' : '❌ YOK'}`);
    console.log(`- Access Token: ${accessToken ? '✅ Var (' + accessToken.substring(0, 4) + '...)' : '❌ YOK'}`);
    console.log(`- Access Secret: ${accessSecret ? '✅ Var' : '❌ YOK'}`);

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
        console.error('❌ EKSİK: Bazı anahtarlar .env dosyasında bulunamadı!');
        return;
    }

    const client = new TwitterApi({
        appKey: apiKey,
        appSecret: apiSecret,
        accessToken: accessToken,
        accessSecret: accessSecret
    });

    try {
        console.log('\n2. "Ben Kimim?" (me) sorgusu yapılıyor...');
        const me = await client.v2.me();
        console.log('✅ BAŞARILI! Bağlantı kuruldu.');
        console.log(`👤 Kullanıcı: @${me.data.username} (${me.data.name})`);

        console.log('\n3. Test Tweet denemesi yapılıyor...');
        // Rastgele bir sayı ekleyelim ki duplicate olmasın
        const testTweet = await client.v2.tweet(`NeuralNews API Test Bağlantısı ${Math.floor(Math.random() * 1000)} - 🤖`);
        console.log('✅ BAŞARILI! Test tweeti atıldı.');
        console.log(`🆔 Tweet ID: ${testTweet.data.id}`);
        console.log('⚠️ (Bu tweeti profilinizden silebilirsiniz)');

    } catch (error) {
        console.error('\n❌ HATA OLUŞTU!');
        console.error('Hata Kodu:', error.code);
        console.error('Hata Mesajı:', error.message);

        if (error.data) {
            console.error('\nDetaylı Hata Verisi:');
            console.error(JSON.stringify(error.data, null, 2));
        }

        if (error.code === 401) {
            console.log('\n💡 İPUCU (401 Hatası):');
            console.log('1. API Anahtarlarınız yanlış kopyalanmış olabilir.');
            console.log('2. "Read and Write" izni verdikten sonra Access Token\'ı "Regenerate" yapmamış olabilirsiniz.');
            console.log('   (İzin değiştikten sonra eski tokenlar ÇALIŞMAZ)');
            console.log('3. Bilgisayar saatiniz çok yanlış olabilir.');
        } else if (error.code === 403) {
            console.log('\n💡 İPUCU (403 Hatası):');
            console.log('1. Bu işlem için yetkiniz yok (örn: Ücretsiz planda v1.1 endpoint kullanımı).');
            console.log('2. Günlük limitiniz dolmuş olabilir.');
            console.log('3. Uygulamanız "Suspended" (askıya alınmış) durumda olabilir.');
        }
    }
}

testConnection();
