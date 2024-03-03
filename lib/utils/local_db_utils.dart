import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:uuid/uuid.dart';
import 'package:intl/intl.dart';

class LocalDBUtils {
  static Database? _database;
  static const _databaseName = "clip_con.db";
  static const _databaseVersion = 1;
  static const table = 'clipboard_history'; // 更新表名，使用下划线而不是短横线
  static const columnId = 'id'; // ID列名不变
  static const columnContent = 'content'; // 更新列名为content
  static const columnTime = 'time'; // 时间列名不变，但稍后我们将使用DATETIME

  // 单例模式
  LocalDBUtils._privateConstructor();
  static final LocalDBUtils instance = LocalDBUtils._privateConstructor();

  // 确保数据库初始化
  Future<Database> get database async {
    if (_database != null) return _database!;
    // 如果_database为null则初始化数据库
    _database = await _initDatabase();
    return _database!;
  }

  // 打开/创建数据库
  _initDatabase() async {
    String path = join(await getDatabasesPath(), _databaseName);
    print(path);
    return await openDatabase(path,
        version: _databaseVersion, onCreate: _onCreate);
  }

  // 创建数据库表
  Future _onCreate(Database db, int version) async {
    await db.execute('''
          CREATE TABLE IF NOT EXISTS $table (
            $columnId TEXT PRIMARY KEY,
            $columnContent TEXT NOT NULL,
            $columnTime DATETIME DEFAULT CURRENT_TIMESTAMP
          )
          ''');
  }

  // 插入一条数据
  Future<Map<String, dynamic>> insertContent(String content) async {
    Database db = await instance.database;
    String id = const Uuid().v4(); // 生成UUID
    String currentTime =
        DateFormat('yyyy-MM-dd HH:mm:ss').format(DateTime.now());
    // 不再需要手动设置时间，因为我们使用了DEFAULT CURRENT_TIMESTAMP
    int result = await db.insert(
        table, {columnId: id, columnContent: content, columnTime: currentTime});
    print(result);
    return {columnId: id, columnContent: content, columnTime: currentTime};
  }

  // 在 LocalDBUtils 类中添加
  Future<List<Map<String, dynamic>>> getPaginatedData(
      int page, int pageSize) async {
    final db = await instance.database;
    final offset = (page - 1) * pageSize;
    final List<Map<String, dynamic>> result = await db.query(
      table,
      limit: pageSize,
      offset: offset,
      orderBy: "$columnTime DESC",
    );
    return result;
  }

  // 在 LocalDBUtils 类中添加
  Future<int> getTotalRowCount() async {
    final db = await instance.database;
    final data = await db.rawQuery('SELECT COUNT(*) FROM $table');
    int count = Sqflite.firstIntValue(data) ?? 0; // 获取总数，如果为null，则返回0
    return count;
  }
}
