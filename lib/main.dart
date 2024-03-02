import 'package:clip_con/utils/clipboard_utils.dart';
import 'package:clip_con/utils/local_db_utils.dart';
import 'package:flutter/material.dart';
import 'package:hotkey_manager/hotkey_manager.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await hotKeyManager.unregisterAll();
  startClipboardMonitor();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        // This is the theme of your application.
        //
        // TRY THIS: Try running your application with "flutter run". You'll see
        // the application has a purple toolbar. Then, without quitting the app,
        // try changing the seedColor in the colorScheme below to Colors.green
        // and then invoke "hot reload" (save your changes or press the "hot
        // reload" button in a Flutter-supported IDE, or press "r" if you used
        // the command line to start the app).
        //
        // Notice that the counter didn't reset back to zero; the application
        // state is not lost during the reload. To reset the state, use hot
        // restart instead.
        //
        // This works for code too, not just values: Most code changes can be
        // tested with just a hot reload.
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'Flutter Demo Home Page'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  // This widget is the home page of your application. It is stateful, meaning
  // that it has a State object (defined below) that contains fields that affect
  // how it looks.

  // This class is the configuration for the state. It holds the values (in this
  // case the title) provided by the parent (in this case the App widget) and
  // used by the build method of the State. Fields in a Widget subclass are
  // always marked "final".

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class LocalDBDataSource extends DataTableSource {
  final LocalDBUtils _dbUtils = LocalDBUtils.instance;
  List<Map<String, dynamic>> _data = [];
  int _rowCount = 0;
  final int _pageSize = 10;
  int _offset = 0;

  LocalDBDataSource() {
    _fetchRowCount();
  }

  Future<void> _fetchRowCount() async {
    _rowCount = await _dbUtils.getTotalRowCount();
    // 不需要在这里调用 loadData，因为初始页将由 PaginatedDataTable 控制
    notifyListeners();
  }

  Future<void> loadData(int page) async {
    _offset = (page - 1) * _pageSize;
    _data = await _dbUtils.getPaginatedData(page, _pageSize);
    print(_data.length);
    notifyListeners();
  }

  @override
  DataRow? getRow(int index) {
    index = index - _offset;
    // 实现获取行的逻辑
    if (index >= _data.length) return null;
    final item = _data[index];
    return DataRow.byIndex(index: index, cells: [
      DataCell(Text(item[LocalDBUtils.columnTime])),
      DataCell(Text(item[LocalDBUtils.columnContent])),
    ]);
  }

  @override
  int get rowCount => _rowCount;

  @override
  bool get isRowCountApproximate => false;

  @override
  int get selectedRowCount => 0;
}

class _MyHomePageState extends State<MyHomePage> {
  final LocalDBDataSource _dataSource = LocalDBDataSource();
  final int _rowsPerPage = 10;

  @override
  void initState() {
    super.initState();
    // 初始加载第一页数据
    _dataSource.loadData(1);
  }

  @override
  Widget build(BuildContext context) {
    return PaginatedDataTable(
      columns: const [
        DataColumn(label: Text('Time')),
        DataColumn(label: Text('Content')),
      ],
      source: _dataSource,
      onPageChanged: (pageIndex) {
        // 加载新的一页数据
        print((pageIndex ~/ _rowsPerPage) + 1);
        _dataSource.loadData((pageIndex ~/ _rowsPerPage) + 1);
      },
    );
  }
}
