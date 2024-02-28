const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// 使用环境变量或配置文件来设置数据库路径
const dbPath = path.resolve(__dirname, "clipboard-history.db");
let db;

function handleError(err) {
  if (err) {
    console.error(err.message);
    throw err; // 抛出错误，让调用者处理
  }
}

async function initLocalDb() {
  db = new sqlite3.Database(
    dbPath,
    sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
    handleError
  );

  // 使用异步操作和await等待操作完成
  await new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS clipboard_history (id TEXT PRIMARY KEY, content TEXT NOT NULL, time DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      (err) => {
        if (err) {
          console.error(err.message);
          reject(err);
        } else {
          console.log(
            "Connected to the SQLite database and ensured table exists."
          );
          resolve();
        }
      }
    );
  });
}

async function getDataFromSqlite(currentPage) {
  const itemsPerPage = 10;
  const itemsOffSet = (currentPage - 1) * itemsPerPage;

  const totalCount = await new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) AS count FROM clipboard_history", (err, row) => {
      if (err) {
        console.error(err.message);
        reject(err);
        return;
      }
      resolve(row.count);
    });
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const items = await new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM clipboard_history ORDER BY time DESC LIMIT ? OFFSET ?`,
      [itemsPerPage, itemsOffSet], // 使用参数化查询提高安全性
      (err, rows) => {
        if (err) {
          console.error(err.message);
          reject(err);
          return;
        }
        resolve(rows);
      }
    );
  });

  return {
    totalCount,
    totalPages,
    items,
    currentPage,
  };
}

async function insertClipboardContentToLocalDB(uuid, clipboardContent) {
  // 假设 db 是一个支持 Promise 的 SQLite3 数据库实例
  const insertSql = `INSERT INTO clipboard_history (id, content) VALUES (?, ?)`;

  try {
    // 插入数据
    await new Promise((resolve, reject) => {
      db.run(insertSql, [uuid, clipboardContent], function (err) {
        if (err) {
          console.error(err.message);
          reject(err);
        } else {
          console.log(`A row has been inserted with id ${uuid}`);
          resolve();
        }
      });
    });

    // 立即查询插入行的时间戳
    const querySql = `SELECT * FROM clipboard_history WHERE id = ?`;
    const row = await new Promise((resolve, reject) => {
      db.get(querySql, [uuid], (err, row) => {
        if (err) {
          console.error(err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    return row;
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  initLocalDb,
  getDataFromSqlite,
  insertClipboardContentToLocalDB,
};
