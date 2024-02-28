// 引入必要的模块
const {
  app,
  BrowserWindow,
  globalShortcut,
  clipboard,
  ipcMain,
} = require("electron");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const {
  connectToDatabase,
  getDataFromCloud,
  insertClipboardContentToMongo,
} = require("./db");
const { initLocalDb, getDataFromSqlite } = require("./local_db");

initLocalDb();

let mainWindow;

async function createWindow() {
  let mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL("http://localhost:5176");

  mainWindow.webContents.on("did-finish-load", async () => {
    try {
      const data = await getDataFromSqlite(1);
      console.log(data); // 成功获取数据后的处理
      mainWindow.webContents.send("initial-data", data);
    } catch (error) {
      console.error(error); // 错误处理
    }

    // 假设 getDataFromCloud 是另一个异步操作
    try {
      const cloudData = await getDataFromCloud(1);
      // 对 cloudData 进行处理
    } catch (error) {
      console.error(error); // 处理来自云端数据的错误
    }
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
