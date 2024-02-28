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

module.exports = { connectToDatabase, getDb };
