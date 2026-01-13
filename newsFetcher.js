const Parser = require('rss-parser');
const { news, sources } = require('../db/database');

const parser = new Parser({
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
});

/**
 * Tek bir RSS kaynağından haberleri çeker
 */
async function fetchFromSource(source) {
    try {
        console.log(`📰 ${source.name} kaynağından haberler çekiliyor...`);

        const feed = await parser.parseURL(source.url);
        let addedCount = 0;

        for (const item of feed.items) {
            // Duplicate kontrolü
            if (item.link && news.existsByUrl(item.link)) {
                continue;
            }

            // Özet oluştur (description'ı temizle)
            let summary = item.contentSnippet || item.description || '';
            summary = summary.replace(/<[^>]*>/g, '').trim();
            if (summary.length > 300) {
                summary = summary.substring(0, 297) + '...';
            }

            // Resim URL'si bul
            let imageUrl = null;
            if (item.enclosure && item.enclosure.url) {
                imageUrl = item.enclosure.url;
            } else if (item['media:content'] && item['media:content'].$.url) {
                imageUrl = item['media:content'].$.url;
            }

            // Tarihi al (Gelişmiş Parsing)
            let pubDate;
            try {
                const rawDate = item.isoDate || item.pubDate || item.date || item['dc:date'] || new Date().toISOString();
                pubDate = new Date(rawDate).toISOString();

                // Tarih geçersizse (Invalid Date) şu anı kullan
                if (pubDate === 'Invalid Date') {
                    pubDate = new Date().toISOString();
                }
            } catch (e) {
                pubDate = new Date().toISOString();
            }

            // Haberi kaydet
            news.create({
                title: item.title || 'Başlıksız Haber',
                summary: summary,
                content: item.content || item['content:encoded'] || summary,
                source: source.name,
                source_url: item.link,
                image_url: imageUrl,
                category: item.categories?.[0] || 'genel',
                created_at: pubDate // Haber yayınlanma tarihini kullan
            });

            addedCount++;
        }

        // Son çekim zamanını güncelle
        sources.updateLastFetched(source.id);

        console.log(`✅ ${source.name}: ${addedCount} yeni haber eklendi`);
        return addedCount;

    } catch (error) {
        console.error(`❌ ${source.name} kaynağından haber çekilemedi:`, error.message);
        return 0;
    }
}

/**
 * Tüm aktif kaynaklardan haberleri çeker
 */
async function fetchAllNews() {
    console.log('\n🔄 Tüm kaynaklardan haberler çekiliyor...');
    console.log('⏰ Zaman:', new Date().toLocaleString('tr-TR'));

    const activeSources = sources.getActive();

    if (activeSources.length === 0) {
        console.log('⚠️ Aktif haber kaynağı bulunamadı. Lütfen kaynak ekleyin.');
        return { total: 0, sources: 0 };
    }

    let totalAdded = 0;

    for (const source of activeSources) {
        const added = await fetchFromSource(source);
        totalAdded += added;

        // Rate limiting - kaynaklar arası 1 saniye bekle
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n📊 Toplam: ${totalAdded} yeni haber, ${activeSources.length} kaynaktan çekildi\n`);

    return {
        total: totalAdded,
        sources: activeSources.length
    };
}

/**
 * Varsayılan Türk haber kaynakları ekler
 */
function addDefaultSources() {
    const defaultSources = [
        { name: 'NTV', url: 'https://www.ntv.com.tr/son-dakika.rss', type: 'rss' },
        { name: 'Sözcü', url: 'https://www.sozcu.com.tr/rss/tum-haberler.xml', type: 'rss' },
        { name: 'Hürriyet', url: 'https://www.hurriyet.com.tr/rss/gundem', type: 'rss' },
        { name: 'CNN Türk', url: 'https://www.cnnturk.com/feed/rss/all/news', type: 'rss' },
        { name: 'TRT Haber', url: 'https://www.trthaber.com/sondakika.rss', type: 'rss' },
        { name: 'Habertürk', url: 'https://www.haberturk.com/rss/manset.xml', type: 'rss' },
        { name: 'BBC Türkçe', url: 'https://feeds.bbci.co.uk/turkce/rss.xml', type: 'rss' },
        { name: 'Onedio', url: 'https://onedio.com/support/rss.xml', type: 'rss' },
        { name: 'Webtekno', url: 'https://www.webtekno.com/rss.xml', type: 'rss' },
        { name: 'ShiftDelete', url: 'https://shiftdelete.net/feed', type: 'rss' }
    ];

    console.log('📌 Varsayılan haber kaynakları kontrol ediliyor...');
    for (const source of defaultSources) {
        // Zaten var mı kontrol et (basitçe URL veya İsim ile)
        const exists = sources.getAll().some(s => s.url === source.url || s.name === source.name);

        if (!exists) {
            try {
                sources.create(source);
                console.log(`  ✅ ${source.name} eklendi`);
            } catch (err) {
                console.log(`  ⚠️ ${source.name} eklenemedi:`, err.message);
            }
        }
    }
}

module.exports = {
    fetchFromSource,
    fetchAllNews,
    addDefaultSources
};
