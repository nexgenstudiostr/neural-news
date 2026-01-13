require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const { initializeDatabase, news, sources } = require('./db/database');
const { initializeTwitter, shareNews, isConnected } = require('./services/twitterService');
const { addDefaultSources, fetchAllNews } = require('./services/newsFetcher');
const { startScheduler, triggerFetch, isRunning } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic Authentication Middleware
const basicAuth = (req, res, next) => {
    // Admin kullanıcı adı ve şifresi (.env dosyasından alınır)
    const user = process.env.ADMIN_USER || 'admin';
    const pass = process.env.ADMIN_PASSWORD;

    // Şifre ayarlanmamışsa koruma yapma (güvenlik açığı olmaması için uyarı ver)
    if (!pass) {
        // console.warn('UYARI: ADMIN_PASSWORD ayarlanmamış!'); 
        return next();
    }

    const unathorized = (res) => {
        res.set('WWW-Authenticate', 'Basic realm="NeuralNews Admin Paneli"');
        return res.status(401).send('Giriş yapmanız gerekiyor.');
    };

    const auth = req.headers.authorization;
    if (!auth) {
        return unathorized(res);
    }

    const [scheme, credentials] = auth.split(' ');
    if (scheme !== 'Basic' || !credentials) {
        return unathorized(res);
    }

    const [inputUser, inputPass] = Buffer.from(credentials, 'base64').toString().split(':');

    if (inputUser === user && inputPass === pass) {
        return next();
    }

    return unathorized(res);
};

// Tüm siteyi korumaya al (hem API hem Frontend)
app.use(basicAuth);

app.use(express.static(path.join(__dirname, 'public')));

// ============== API ROUTES ==============

// --- Haberler ---

// Tüm haberleri getir
app.get('/api/news', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const filter = {
            isShared: req.query.shared === 'true' ? true : (req.query.shared === 'false' ? false : undefined),
            source: req.query.source,
            search: req.query.search
        };

        const newsItems = news.getAll(limit, offset, filter);
        const stats = news.getStats();

        res.json({
            success: true,
            data: newsItems,
            stats: stats,
            pagination: { limit, offset }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Tek haber getir
app.get('/api/news/:id', (req, res) => {
    try {
        const newsItem = news.getById(parseInt(req.params.id));
        if (!newsItem) {
            return res.status(404).json({ success: false, error: 'Haber bulunamadı' });
        }
        res.json({ success: true, data: newsItem });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Yeni haber ekle
app.post('/api/news', (req, res) => {
    try {
        const { title, summary, content, source, source_url, image_url, category } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, error: 'Başlık gerekli' });
        }

        const id = news.create({ title, summary, content, source, source_url, image_url, category });
        res.status(201).json({ success: true, id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Haber güncelle
app.put('/api/news/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = news.update(id, req.body);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: 'Haber bulunamadı' });
        }

        res.json({ success: true, message: 'Haber güncellendi' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Haber sil
app.delete('/api/news/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = news.delete(id);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, error: 'Haber bulunamadı' });
        }

        res.json({ success: true, message: 'Haber silindi' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// X'te paylaş
app.post('/api/news/:id/share', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const newsItem = news.getById(id);

        if (!newsItem) {
            return res.status(404).json({ success: false, error: 'Haber bulunamadı' });
        }

        if (!isConnected()) {
            return res.status(503).json({
                success: false,
                error: 'X API bağlantısı yok. Lütfen API anahtarlarını ayarlayın.'
            });
        }

        const result = await shareNews(newsItem);
        news.markAsShared(id);

        res.json({
            success: true,
            message: 'Haber X\'te paylaşıldı',
            tweetId: result.tweetId
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Kaynaklar ---

// Tüm kaynakları getir
app.get('/api/sources', (req, res) => {
    try {
        const allSources = sources.getAll();
        res.json({ success: true, data: allSources });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Kaynak ekle
app.post('/api/sources', (req, res) => {
    try {
        const { name, url, type, is_active } = req.body;

        if (!name || !url) {
            return res.status(400).json({ success: false, error: 'İsim ve URL gerekli' });
        }

        sources.create({ name, url, type, is_active });
        res.status(201).json({ success: true, message: 'Kaynak eklendi' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Kaynak güncelle
app.put('/api/sources/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        sources.update(id, req.body);
        res.json({ success: true, message: 'Kaynak güncellendi' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Kaynak sil
app.delete('/api/sources/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        sources.delete(id);
        res.json({ success: true, message: 'Kaynak silindi' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Sistem ---

// İstatistikler
app.get('/api/stats', (req, res) => {
    try {
        const stats = news.getStats();
        const allSources = sources.getAll();

        res.json({
            success: true,
            data: {
                news: stats,
                sources: {
                    total: allSources.length,
                    active: allSources.filter(s => s.is_active).length
                },
                scheduler: {
                    running: isRunning(),
                    interval: process.env.FETCH_INTERVAL_MINUTES || 45
                },
                twitter: {
                    connected: isConnected()
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Manuel haber çekme
app.post('/api/fetch', async (req, res) => {
    try {
        const result = await triggerFetch();
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============== STARTUP ==============

async function startServer() {
    console.log('\n🚀 Haber Toplama Sistemi Başlatılıyor...\n');

    // Veritabanını başlat (AWAIT ile bekle!)
    await initializeDatabase();

    // Varsayılan kaynakları ekle
    addDefaultSources();

    // Twitter API'yi başlat
    initializeTwitter();

    // Zamanlayıcıyı başlat
    startScheduler();

    // Sunucuyu başlat
    app.listen(PORT, async () => {
        console.log(`\n✅ Sunucu çalışıyor: http://localhost:${PORT}`);
        console.log('📱 Mobil cihazdan erişmek için yerel IP adresinizi kullanın');
        console.log('\n-------------------------------------------\n');

        // İlk haber çekme (sunucu başladıktan sonra)
        console.log('📡 İlk haber çekme işlemi başlatılıyor...');
        await fetchAllNews();
    });
}

startServer().catch(console.error);

