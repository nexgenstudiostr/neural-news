const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// Veritabanı dosya yolu
const dbPath = path.join(__dirname, 'news.db');

let db = null;

// Veritabanını başlat
async function initializeDatabase() {
  const SQL = await initSqlJs();

  // Mevcut veritabanı dosyası varsa yükle
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Tabloları oluştur
  db.run(`
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT,
      content TEXT,
      source TEXT,
      source_url TEXT,
      image_url TEXT,
      category TEXT DEFAULT 'genel',
      is_shared INTEGER DEFAULT 0,
      shared_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT DEFAULT 'rss',
      is_active INTEGER DEFAULT 1,
      last_fetched TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Index'ler
  db.run(`CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_news_is_shared ON news(is_shared)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_news_source ON news(source)`);

  saveDatabase();
  console.log('✅ Veritabanı başarıyla başlatıldı');
}

// Veritabanını dosyaya kaydet
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Haber CRUD işlemleri
const newsQueries = {
  getAll: (limit = 50, offset = 0, filter = {}) => {
    let query = 'SELECT * FROM news';
    const conditions = [];
    const params = [];

    if (filter.isShared !== undefined) {
      conditions.push('is_shared = ?');
      params.push(filter.isShared ? 1 : 0);
    }

    if (filter.source) {
      conditions.push('source = ?');
      params.push(filter.source);
    }

    if (filter.search) {
      conditions.push('(title LIKE ? OR summary LIKE ?)');
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    stmt.bind(params);

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  },

  getById: (id) => {
    const stmt = db.prepare('SELECT * FROM news WHERE id = ?');
    stmt.bind([id]);
    let result = null;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  },

  create: (news) => {
    db.run(`
      INSERT INTO news (title, summary, content, source, source_url, image_url, category)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      news.title,
      news.summary || null,
      news.content || null,
      news.source || null,
      news.source_url || null,
      news.image_url || null,
      news.category || 'genel'
    ]);
    saveDatabase();

    const result = db.exec('SELECT last_insert_rowid() as id');
    return result[0]?.values[0]?.[0];
  },

  update: (id, news) => {
    db.run(`
      UPDATE news SET
        title = COALESCE(?, title),
        summary = COALESCE(?, summary),
        content = COALESCE(?, content),
        category = COALESCE(?, category),
        image_url = COALESCE(?, image_url),
        updated_at = datetime('now')
      WHERE id = ?
    `, [
      news.title || null,
      news.summary || null,
      news.content || null,
      news.category || null,
      news.image_url || null,
      id
    ]);
    saveDatabase();
    return { changes: db.getRowsModified() };
  },

  delete: (id) => {
    db.run('DELETE FROM news WHERE id = ?', [id]);
    saveDatabase();
    return { changes: db.getRowsModified() };
  },

  markAsShared: (id) => {
    db.run(`UPDATE news SET is_shared = 1, shared_at = datetime('now') WHERE id = ?`, [id]);
    saveDatabase();
    return { changes: db.getRowsModified() };
  },

  existsByUrl: (url) => {
    const stmt = db.prepare('SELECT id FROM news WHERE source_url = ?');
    stmt.bind([url]);
    const exists = stmt.step();
    stmt.free();
    return exists;
  },

  getStats: () => {
    const total = db.exec('SELECT COUNT(*) as count FROM news');
    const shared = db.exec('SELECT COUNT(*) as count FROM news WHERE is_shared = 1');
    const today = db.exec(`SELECT COUNT(*) as count FROM news WHERE date(created_at) = date('now')`);

    return {
      total: total[0]?.values[0]?.[0] || 0,
      shared: shared[0]?.values[0]?.[0] || 0,
      today: today[0]?.values[0]?.[0] || 0
    };
  }
};

// Kaynak CRUD işlemleri
const sourceQueries = {
  getAll: () => {
    const result = db.exec('SELECT * FROM sources ORDER BY name');
    if (!result[0]) return [];

    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
  },

  getActive: () => {
    const result = db.exec('SELECT * FROM sources WHERE is_active = 1');
    if (!result[0]) return [];

    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
  },

  create: (source) => {
    db.run(`
      INSERT INTO sources (name, url, type, is_active)
      VALUES (?, ?, ?, ?)
    `, [source.name, source.url, source.type || 'rss', source.is_active ?? 1]);
    saveDatabase();
  },

  update: (id, source) => {
    db.run(`
      UPDATE sources SET
        name = COALESCE(?, name),
        url = COALESCE(?, url),
        type = COALESCE(?, type),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `, [source.name, source.url, source.type, source.is_active, id]);
    saveDatabase();
  },

  delete: (id) => {
    db.run('DELETE FROM sources WHERE id = ?', [id]);
    saveDatabase();
  },

  updateLastFetched: (id) => {
    db.run(`UPDATE sources SET last_fetched = datetime('now') WHERE id = ?`, [id]);
    saveDatabase();
  }
};

module.exports = {
  initializeDatabase,
  saveDatabase,
  news: newsQueries,
  sources: sourceQueries
};
