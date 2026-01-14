// ===== API Helper =====
const API_BASE = '';

async function api(endpoint, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ===== State =====
let currentNews = [];
let currentSources = [];
let selectedNewsId = null;

// ===== DOM Elements =====
const elements = {
    // Stats
    totalNews: document.getElementById('totalNews'),
    todayNews: document.getElementById('todayNews'),
    sharedNews: document.getElementById('sharedNews'),
    sourcesCount: document.getElementById('sourcesCount'),

    // Tabs
    tabs: document.querySelectorAll('.tab'),
    newsTab: document.getElementById('newsTab'),
    sourcesTab: document.getElementById('sourcesTab'),

    // News
    newsList: document.getElementById('newsList'),
    searchInput: document.getElementById('searchInput'),
    filterSource: document.getElementById('filterSource'),
    filterShared: document.getElementById('filterShared'),
    newsSearchBar: document.getElementById('newsSearchBar'),

    // News Modal
    newsModal: document.getElementById('newsModal'),
    closeNewsModal: document.getElementById('closeNewsModal'),
    newsForm: document.getElementById('newsForm'),
    newsId: document.getElementById('newsId'),
    newsTitle: document.getElementById('newsTitle'),
    newsSummary: document.getElementById('newsSummary'),
    newsCategory: document.getElementById('newsCategory'),
    newsSource: document.getElementById('newsSource'),
    tweetPreview: document.getElementById('tweetPreview'),
    charCount: document.getElementById('charCount'),
    deleteNewsBtn: document.getElementById('deleteNewsBtn'),
    shareNewsBtn: document.getElementById('shareNewsBtn'),

    // Sources
    sourcesList: document.getElementById('sourcesList'),
    addSourceBtn: document.getElementById('addSourceBtn'),

    // Source Modal
    sourceModal: document.getElementById('sourceModal'),
    sourceModalTitle: document.getElementById('sourceModalTitle'),
    closeSourceModal: document.getElementById('closeSourceModal'),
    sourceForm: document.getElementById('sourceForm'),
    sourceId: document.getElementById('sourceId'),
    sourceName: document.getElementById('sourceName'),
    sourceUrl: document.getElementById('sourceUrl'),
    sourceActive: document.getElementById('sourceActive'),
    cancelSourceBtn: document.getElementById('cancelSourceBtn'),

    // Header
    fetchBtn: document.getElementById('fetchBtn'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
};

// ===== Toast Notifications =====
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ===== Format Date =====
function formatDate(dateStr) {
    const date = new Date(dateStr);

    // Geçersiz tarih kontrolü
    if (isNaN(date.getTime())) return '';

    // Her zaman Türkiye saat dilimine (Europe/Istanbul) göre formatla
    return new Intl.DateTimeFormat('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Istanbul'
    }).format(date);
}

// ===== Load Stats =====
async function loadStats() {
    try {
        const data = await api('/api/stats');
        elements.totalNews.textContent = data.data.news.total;
        elements.todayNews.textContent = data.data.news.today;
        elements.sharedNews.textContent = data.data.news.shared;
        elements.sourcesCount.textContent = data.data.sources.active;
    } catch (error) {
        console.error('Stats yüklenemedi:', error);
    }
}

// ===== Load News =====
async function loadNews() {
    try {
        elements.newsList.innerHTML = '<div class="loading">Yükleniyor...</div>';

        const params = new URLSearchParams();
        if (elements.searchInput.value) params.set('search', elements.searchInput.value);
        if (elements.filterSource.value) params.set('source', elements.filterSource.value);
        if (elements.filterShared.value) params.set('shared', elements.filterShared.value);

        const data = await api(`/api/news?${params}`);
        currentNews = data.data;

        if (currentNews.length === 0) {
            elements.newsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <p>Henüz haber yok</p>
        </div>
      `;
            return;
        }

        elements.newsList.innerHTML = currentNews.map(news => `
      <div class="news-card ${news.is_shared ? 'shared' : ''}" data-id="${news.id}">
        <div class="news-header">
          <h3 class="news-title">${escapeHtml(news.title)}</h3>
          ${news.is_shared ? '<span class="news-badge">Paylaşıldı</span>' : ''}
        </div>
        ${news.summary ? `<p class="news-summary">${escapeHtml(news.summary)}</p>` : ''}
        <div class="news-meta">
          <span class="news-source">${escapeHtml(news.source || 'Bilinmeyen')}</span>
          <span class="news-date">${formatDate(news.created_at)}</span>
        </div>
      </div>
    `).join('');

    } catch (error) {
        elements.newsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <p>Haberler yüklenemedi</p>
      </div>
    `;
        showToast('Haberler yüklenemedi', 'error');
    }
}

// ===== Load Sources =====
async function loadSources() {
    try {
        const data = await api('/api/sources');
        currentSources = data.data;

        // Filter dropdown'ı güncelle
        elements.filterSource.innerHTML = '<option value="">Tüm Kaynaklar</option>' +
            currentSources.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');

        if (currentSources.length === 0) {
            elements.sourcesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📡</div>
          <p>Henüz kaynak eklenmemiş</p>
        </div>
      `;
            return;
        }

        elements.sourcesList.innerHTML = currentSources.map(source => `
      <div class="source-card" data-id="${source.id}">
        <div class="source-info">
          <div class="source-name">${escapeHtml(source.name)}</div>
          <div class="source-url">${escapeHtml(source.url)}</div>
        </div>
        <div class="source-status">
          <span class="status-dot ${source.is_active ? 'active' : ''}"></span>
        </div>
        <div class="source-actions">
          <button class="btn btn-sm btn-secondary edit-source-btn">✏️</button>
          <button class="btn btn-sm btn-danger delete-source-btn">🗑️</button>
        </div>
      </div>
    `).join('');

    } catch (error) {
        showToast('Kaynaklar yüklenemedi', 'error');
    }
}

// ===== Open News Modal =====
function openNewsModal(news) {
    selectedNewsId = news.id;
    elements.newsId.value = news.id;
    elements.newsTitle.value = news.title;
    elements.newsSummary.value = news.summary || '';
    elements.newsCategory.value = news.category || '';
    elements.newsSource.value = news.source || '';

    updateTweetPreview();
    elements.newsModal.classList.add('active');
}

// ===== Update Tweet Preview =====
function updateTweetPreview() {
    const title = elements.newsTitle.value;
    const newsItem = currentNews.find(n => n.id === selectedNewsId);

    let tweet = title;
    if (newsItem?.source_url) {
        tweet += '\n\n' + newsItem.source_url;
    }
    if (newsItem?.source) {
        tweet += '\n#' + newsItem.source.replace(/\s+/g, '');
    }

    elements.tweetPreview.textContent = tweet;
    elements.charCount.textContent = `${tweet.length}/280`;
    elements.charCount.classList.toggle('over', tweet.length > 280);
}

// ===== Close Modals =====
function closeNewsModal() {
    elements.newsModal.classList.remove('active');
    selectedNewsId = null;
}

function closeSourceModal() {
    elements.sourceModal.classList.remove('active');
    elements.sourceForm.reset();
    elements.sourceId.value = '';
}

// ===== Tab Switching =====
function switchTab(tabName) {
    elements.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    elements.newsTab.classList.toggle('hidden', tabName !== 'news');
    elements.sourcesTab.classList.toggle('hidden', tabName !== 'sources');
    elements.newsSearchBar.style.display = tabName === 'news' ? 'flex' : 'none';

    if (tabName === 'sources') loadSources();
}

// ===== Escape HTML =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Event Listeners =====

// Tabs
elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// News Card Click
elements.newsList.addEventListener('click', (e) => {
    const card = e.target.closest('.news-card');
    if (card) {
        const news = currentNews.find(n => n.id === parseInt(card.dataset.id));
        if (news) openNewsModal(news);
    }
});

// Close News Modal
elements.closeNewsModal.addEventListener('click', closeNewsModal);
elements.newsModal.querySelector('.modal-overlay').addEventListener('click', closeNewsModal);

// News Title Change
elements.newsTitle.addEventListener('input', updateTweetPreview);

// News Form Submit
elements.newsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        await api(`/api/news/${selectedNewsId}`, {
            method: 'PUT',
            body: JSON.stringify({
                title: elements.newsTitle.value,
                summary: elements.newsSummary.value,
                category: elements.newsCategory.value
            })
        });

        showToast('Haber güncellendi', 'success');
        closeNewsModal();
        loadNews();
        loadStats();
    } catch (error) {
        showToast('Güncelleme başarısız', 'error');
    }
});

// Delete News
elements.deleteNewsBtn.addEventListener('click', async () => {
    if (!confirm('Bu haberi silmek istediğinize emin misiniz?')) return;

    try {
        await api(`/api/news/${selectedNewsId}`, { method: 'DELETE' });
        showToast('Haber silindi', 'success');
        closeNewsModal();
        loadNews();
        loadStats();
    } catch (error) {
        showToast('Silme başarısız', 'error');
    }
});

// Share News
elements.shareNewsBtn.addEventListener('click', async () => {
    elements.shareNewsBtn.disabled = true;
    elements.shareNewsBtn.textContent = 'Paylaşılıyor...';

    try {
        await api(`/api/news/${selectedNewsId}/share`, { method: 'POST' });
        showToast('X\'te paylaşıldı! 🎉', 'success');
        closeNewsModal();
        loadNews();
        loadStats();
    } catch (error) {
        showToast(error.message || 'Paylaşım başarısız', 'error');
    } finally {
        elements.shareNewsBtn.disabled = false;
        elements.shareNewsBtn.textContent = '𝕏 Paylaş';
    }
});

// Search & Filter
let searchTimeout;
elements.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadNews, 300);
});
elements.filterSource.addEventListener('change', loadNews);
elements.filterShared.addEventListener('change', loadNews);

// Fetch Button
elements.fetchBtn.addEventListener('click', async () => {
    elements.fetchBtn.disabled = true;
    elements.fetchBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Çekiliyor...</span>';

    try {
        const data = await api('/api/fetch', { method: 'POST' });
        showToast(`${data.data.total} yeni haber eklendi`, 'success');
        loadNews();
        loadStats();
    } catch (error) {
        showToast('Haber çekme başarısız', 'error');
    } finally {
        elements.fetchBtn.innerHTML = '<span class="btn-icon">🔄</span><span class="btn-text">Güncelle</span>';
    }
});

// Delete All Button
const deleteAllBtn = document.getElementById('deleteAllBtn');
if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', async () => {
        if (!confirm('DİKKAT! Tüm haberler silinecek. Bu işlem geri alınamaz.\n\nEski tarihli haberleri temizlemek için bunu kullanabilirsiniz. Onaylıyor musunuz?')) return;

        try {
            deleteAllBtn.disabled = true;
            await api('/api/news/all', { method: 'DELETE' });
            showToast('Tüm haberler temizlendi', 'success');
            loadNews();
            loadStats();
        } catch (error) {
            showToast('Temizleme başarısız', 'error');
        } finally {
            deleteAllBtn.disabled = false;
        }
    });
}

// Add Source Button
elements.addSourceBtn.addEventListener('click', () => {
    elements.sourceModalTitle.textContent = 'Kaynak Ekle';
    elements.sourceId.value = '';
    elements.sourceForm.reset();
    elements.sourceActive.checked = true;
    elements.sourceModal.classList.add('active');
});

// Close Source Modal
elements.closeSourceModal.addEventListener('click', closeSourceModal);
elements.cancelSourceBtn.addEventListener('click', closeSourceModal);
elements.sourceModal.querySelector('.modal-overlay').addEventListener('click', closeSourceModal);

// Source Form Submit
elements.sourceForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const sourceData = {
        name: elements.sourceName.value,
        url: elements.sourceUrl.value,
        is_active: elements.sourceActive.checked ? 1 : 0
    };

    try {
        if (elements.sourceId.value) {
            await api(`/api/sources/${elements.sourceId.value}`, {
                method: 'PUT',
                body: JSON.stringify(sourceData)
            });
            showToast('Kaynak güncellendi', 'success');
        } else {
            await api('/api/sources', {
                method: 'POST',
                body: JSON.stringify(sourceData)
            });
            showToast('Kaynak eklendi', 'success');
        }

        closeSourceModal();
        loadSources();
        loadStats();
    } catch (error) {
        showToast('İşlem başarısız', 'error');
    }
});

// Source Actions
elements.sourcesList.addEventListener('click', async (e) => {
    const card = e.target.closest('.source-card');
    if (!card) return;

    const sourceId = parseInt(card.dataset.id);
    const source = currentSources.find(s => s.id === sourceId);

    if (e.target.closest('.edit-source-btn')) {
        elements.sourceModalTitle.textContent = 'Kaynak Düzenle';
        elements.sourceId.value = source.id;
        elements.sourceName.value = source.name;
        elements.sourceUrl.value = source.url;
        elements.sourceActive.checked = source.is_active;
        elements.sourceModal.classList.add('active');
    }

    if (e.target.closest('.delete-source-btn')) {
        if (!confirm('Bu kaynağı silmek istediğinize emin misiniz?')) return;

        try {
            await api(`/api/sources/${sourceId}`, { method: 'DELETE' });
            showToast('Kaynak silindi', 'success');
            loadSources();
            loadStats();
        } catch (error) {
            showToast('Silme başarısız', 'error');
        }
    }
});

// ===== Initialize =====
async function init() {
    await Promise.all([
        loadStats(),
        loadNews(),
        loadSources()
    ]);
}

init();

// Pull-to-refresh simulation
let touchStartY = 0;
document.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchend', (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;

    if (scrollTop === 0 && touchEndY - touchStartY > 100) {
        loadNews();
        loadStats();
        showToast('Yenileniyor...', 'info');
    }
});
