# Haber Toplama ve X Paylaşım Sistemi

Sosyal medya için haber içerikleri oluşturmak amacıyla çoklu kaynaklardan haber çeken, telefondan yönetilebilen ve X (Twitter) üzerinden paylaşım yapabilen bir sistem.

## 🚀 Hızlı Başlangıç

### 1. Bağımlılıkları Yükle
```bash
npm install
```

### 2. Ortam Değişkenlerini Ayarla
`.env.example` dosyasını `.env` olarak kopyalayın ve X API anahtarlarınızı ekleyin:
```bash
cp .env.example .env
```

### 3. Sunucuyu Başlat
```bash
npm start
```

Tarayıcınızda `http://localhost:3000` adresini açın.

## 📱 Mobil Erişim

Telefonunuzdan erişmek için:
1. Bilgisayarınızın yerel IP adresini bulun (`ipconfig` komutu ile)
2. Telefonunuzda `http://YEREL_IP:3000` adresine gidin

## 🔑 X (Twitter) API Kurulumu

1. [developer.twitter.com](https://developer.twitter.com) adresine gidin
2. Developer hesabı oluşturun
3. Yeni bir App oluşturun
4. API Key, API Secret, Access Token ve Access Token Secret alın
5. `.env` dosyasına bu bilgileri ekleyin

## 📡 Haber Kaynakları

Varsayılan olarak şu kaynaklar eklenmiştir:
- NTV
- Sözcü
- Hürriyet
- CNN Türk
- TRT Haber

Admin panelinden yeni RSS kaynakları ekleyebilirsiniz.

## ☁️ Render.com'a Deploy

1. [render.com](https://render.com) hesabı oluşturun
2. GitHub repo'nuzu bağlayın
3. "New Web Service" seçin
4. `render.yaml` otomatik olarak yapılandırmayı algılayacaktır
5. Environment Variables bölümünden X API anahtarlarınızı ekleyin

## 📁 Proje Yapısı

```
haber/
├── server.js              # Ana sunucu
├── package.json           # Bağımlılıklar
├── .env.example           # Örnek ortam değişkenleri
├── render.yaml            # Render deploy config
├── db/
│   └── database.js        # SQLite veritabanı
├── services/
│   ├── newsFetcher.js     # RSS haber çekici
│   ├── twitterService.js  # X API entegrasyonu
│   └── scheduler.js       # Cron zamanlayıcı
└── public/
    ├── index.html         # Admin paneli
    ├── css/style.css      # Stiller
    └── js/app.js          # Frontend JS
```

## 📝 API Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | /api/news | Haberleri listele |
| GET | /api/news/:id | Tek haber getir |
| POST | /api/news | Yeni haber ekle |
| PUT | /api/news/:id | Haber güncelle |
| DELETE | /api/news/:id | Haber sil |
| POST | /api/news/:id/share | X'te paylaş |
| GET | /api/sources | Kaynakları listele |
| POST | /api/sources | Kaynak ekle |
| PUT | /api/sources/:id | Kaynak güncelle |
| DELETE | /api/sources/:id | Kaynak sil |
| POST | /api/fetch | Manuel haber çek |
| GET | /api/stats | İstatistikler |
