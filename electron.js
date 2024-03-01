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
const {
  initLocalDb,
  getDataFromSqlite,
  insertClipboardContentToLocalDB,
} = require("./local_db");

initLocalDb();

let mainWindow;
let localData;
let cloudData;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL("http://localhost:5176");

  mainWindow.webContents.on("did-finish-load", async () => {
    try {
      localData = await getDataFromSqlite(1);
    } catch (error) {
      console.error(error); // 错误处理
    }

    // 假设 getDataFromCloud 是另一个异步操作
    try {
      cloudData = await getDataFromCloud(1);
      // 对 cloudData 进行处理
    } catch (error) {
      console.error(error); // 处理来自云端数据的错误
    }

    mainWindow.webContents.send("initial-data", { localData, cloudData });
  });
}

let clipboardCheckInterval;
let clipboardContent = clipboard.readText();

function startClipboardMonitoring() {
  clipboardCheckInterval = setInterval(async () => {
    const currentContent = clipboard.readText();
    if (currentContent !== clipboardContent) {
      console.log("剪贴板内容变化:", currentContent);
      // 执行相应的处理逻辑
      clipboardContent = currentContent;
      const uuid = uuidv4(); // 生成 UUID

      const row = await insertClipboardContentToLocalDB(uuid, clipboardContent);
      console.log(row.content);
      console.log(row.time);

      // 使用 UUID 和查询到的时间戳填充渲染内容
      mainWindow.webContents.send("clipboard-content", {
        type: "local",
        data: {
          id: uuid,
          content: clipboardContent,
          time: row.time,
        },
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
    const insertedDocument = await insertClipboardContentToMongo(content); // 使用数据库连接插入数据
    // 使用 UUID 和查询到的时间戳填充渲染内容
    mainWindow.webContents.send("clipboard-content", {
      type: "cloud",
      data: insertedDocument,
    });
  });
}

app.whenReady().then(async () => {
  await connectToDatabase();
  setupGlobalShortcut();

  createWindow();

  ipcMain.on("request-page-data", async (event, { page, type }) => {
    try {
      if (type == "local") {
        localData = await getDataFromSqlite(page);
      }
      if (type == "cloud") {
        cloudData = await getDataFromCloud(page);
      }
      mainWindow.webContents.send("initial-data", { localData, cloudData });
    } catch (error) {
      console.error(error); // 错误处理
    }
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
