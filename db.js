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
  const itemsPerPage = 10;
  const itemsOffSet = (currentPage - 1) * itemsPerPage;
  let totalCount, totalPages, items;

  try {
    const db = getDb(); // 假设getDb()已正确配置并可以返回数据库实例
    const collection = db.collection("clipboardHistory");

    // 首先获取总条目数
    totalCount = await collection.countDocuments();

    // 计算总页数
    totalPages = Math.ceil(totalCount / itemsPerPage);

    // 然后根据当前页码获取具体的条目
    items = await collection
      .find()
      .sort({ time: -1 })
      .skip(itemsOffSet)
      .limit(itemsPerPage)
      .toArray();

    // 返回与getDataFromSqlite相同结构的对象
    return {
      totalCount,
      totalPages,
      items,
      currentPage,
    };
  } catch (error) {
    console.error("Error fetching data from cloud:", error);
    // 如果有必要，这里可以抛出错误或者返回一个错误对象
    throw error;
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
