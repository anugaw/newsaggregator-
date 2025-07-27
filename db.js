import { createPool } from "mysql2/promise";

const pool = createPool({
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "backup",
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 0,
});

async function initializeDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        birthdate DATE,
        password VARCHAR(255) NOT NULL,
        preferences JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title TEXT NOT NULL,
        content LONGTEXT NOT NULL,
        image_url TEXT,
        source_url TEXT NOT NULL,
        published_at DATETIME,
        category VARCHAR(255),
        sentiment VARCHAR(50),
        sentiment_score FLOAT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        user_id INT NOT NULL,
        article_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, article_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (article_id) REFERENCES articles(id)
      )
    `);

    console.log("Database tables initialized");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

initializeDB();

export default pool;
