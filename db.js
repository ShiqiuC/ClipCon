// db.js
const { MongoClient } = require("mongodb");
require("dotenv").config();

// MongoDB 连接 URL 和数据库名称
const url = process.env.MONGODB_CONNECTION_STRING;
const dbName = "clipboard"; // 替换为你的数据库名称

let db = null;

// 连接到MongoDB数据库
async function connectToDatabase() {
  const client = new MongoClient(url, { useUnifiedTopology: true });
  await client.connect();
  console.log("Connected successfully to MongoDB server");
  db = client.db(dbName);
}

// 获取数据库连接
function getDb() {
  return db;
}

async function getDataFromCloud(currentPage) {
  try {
    const itemsPerPage = 10;
    const itemsOffSet = (currentPage - 1) * itemsPerPage;
    const db = getDb();
    const collection = db.collection("clipboardHistory");
    // 使用 await 等待异步操作完成
    const data = await collection
      .find()
      .sort({ time: -1 })
      .skip(itemsOffSet)
      .limit(itemsPerPage)
      .toArray();
    console.log(data);
  } catch (error) {
    console.error("Error fetching data from cloud:", error);
    // 处理错误或者根据需求进行相应的错误反馈
  }
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

module.exports = {
  connectToDatabase,
  getDataFromCloud,
  insertClipboardContentToMongo,
};
