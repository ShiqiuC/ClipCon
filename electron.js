// 引入必要的模块
const {
  app,
  BrowserWindow,
  globalShortcut,
  clipboard,
  ipcMain,
} = require("electron");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { connectToDatabase, getDb } = require("./db");

const dbPath = path.resolve(__dirname, "clipboard-history.db");

// 创建一个新的数据库实例
let db = new sqlite3.Database(
  dbPath,
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log("Connected to the SQLite database.");
  }
);

// 修改创建表的语句，使 time 字段使用 SQL 时间格式
db.run(
  `CREATE TABLE IF NOT EXISTS clipboard_history (id TEXT PRIMARY KEY, content TEXT NOT NULL, time DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log("Table created or already exists.");
  }
);

function getDataFromSqlite(currentPage) {
  return new Promise((resolve, reject) => {
    const itemsPerPage = 10;
    const itemsOffSet = (currentPage - 1) * itemsPerPage;

    db.get("SELECT COUNT(*) AS count FROM clipboard_history", (err, row) => {
      if (err) {
        console.error(err.message);
        reject(err);
        return;
      }

      const totalCount = row.count;
      const totalPages = Math.ceil(totalCount / itemsPerPage);

      db.all(
        `SELECT * FROM clipboard_history ORDER BY time DESC LIMIT ${itemsPerPage} OFFSET ${itemsOffSet}`,
        (err, rows) => {
          if (err) {
            console.error(err.message);
            reject(err);
            return;
          }
          // 成功解析数据并通过Promise返回
          resolve({
            totalCount,
            totalPages,
            items: rows,
            currentPage,
          });
        }
      );
    });
  });
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL("http://localhost:5176");
  mainWindow.webContents.openDevTools();
  mainWindow.webContents.on("did-finish-load", () => {
    getDataFromSqlite(1)
      .then((data) => {
        console.log(data); // 这里处理数据
        mainWindow.webContents.send("initial-data", data);
      })
      .catch((error) => {
        console.error(error); // 处理错误
      });
  });
}

let clipboardCheckInterval;
let clipboardContent = clipboard.readText();

function startClipboardMonitoring() {
  clipboardCheckInterval = setInterval(() => {
    const currentContent = clipboard.readText();
    if (currentContent !== clipboardContent) {
      console.log("剪贴板内容变化:", currentContent);
      // 执行相应的处理逻辑
      clipboardContent = currentContent;
      const uuid = uuidv4(); // 生成 UUID

      // 插入数据
      const insertSql = `INSERT INTO clipboard_history (id, content) VALUES (?, ?)`;
      db.run(insertSql, [uuid, clipboardContent], function (err) {
        if (err) {
          console.error(err.message);
        } else {
          console.log(`A row has been inserted with id ${uuid}`);
          // 立即查询插入行的时间戳
          const querySql = `SELECT time FROM clipboard_history WHERE id = ?`;
          db.get(querySql, [uuid], (err, row) => {
            if (err) {
              console.error(err.message);
            } else {
              // 使用 UUID 和查询到的时间戳填充渲染内容
              mainWindow.webContents.send("clipboard-content", {
                id: uuid,
                content: clipboardContent,
                time: row.time,
              });
            }
          });
        }
      });
    }
  }, 1000); // 每秒检查一次
}

function stopClipboardMonitoring() {
  clearInterval(clipboardCheckInterval);
}

async function insertClipboardContentToMongo(content) {
  try {
    const db = getDb(); // 获取复用的数据库连接
    const collection = db.collection("clipboardHistory");
    const insertResult = await collection.insertOne({
      content,
      time: new Date(),
    });
    console.log("插入成功:", insertResult.insertedId);
  } catch (err) {
    console.error("插入失败:", err);
  }
}

function setupGlobalShortcut() {
  globalShortcut.register("CommandOrControl+Shift+C", async () => {
    const content = clipboard.readText();
    await insertClipboardContentToMongo(content); // 使用数据库连接插入数据
  });
}

app.whenReady().then(async () => {
  await connectToDatabase();
  setupGlobalShortcut();

  createWindow();

  ipcMain.on("request-page-data", (event, currentPage) => {
    getDataFromSqlite(currentPage)
      .then((data) => {
        console.log(data); // 这里处理数据
        mainWindow.webContents.send("initial-data", data);
      })
      .catch((error) => {
        console.error(error); // 处理错误
      });
  });

  ipcMain.on("request-send-to-clipboard", (event, record) => {
    clipboard.writeText(record.content);
  });

  startClipboardMonitoring();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  stopClipboardMonitoring();
});
