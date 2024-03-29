import 'dart:async';

import 'package:clip_con/utils/clipboard_utils.dart';
import 'package:clip_con/utils/cloud_api_utils.dart';
import 'package:clip_con/utils/local_db_utils.dart';
import 'package:clip_con/utils/message_utils.dart';
import 'package:flutter/material.dart';

class LocalClipboardTable extends StatefulWidget {
  const LocalClipboardTable({super.key});

  @override
  State<LocalClipboardTable> createState() => _LocalClipboardTableState();
}

class LocalDBDataSource extends DataTableSource {
  CloudAPIUtils cloudAPIUtils = CloudAPIUtils();
  final LocalDBUtils _dbUtils = LocalDBUtils.instance;
  List<Map<String, dynamic>> _data = [];
  int _rowCount = 0;
  final int _pageSize = 10;
  int _offset = 0;
  double _width = 0;
  final void Function(String content) showFullContentDialog;
  final void Function(String successContent) showSuccessSnackBar;

  LocalDBDataSource(
      {required this.showFullContentDialog,
      required this.showSuccessSnackBar}) {
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
    notifyListeners();
  }

  void setWidth(double width) {
    _width = width;
  }

  void addNewSingleData(Map<String, dynamic> singleData) {
    if (_offset == 0) {
      List<Map<String, dynamic>> newData = List.from(_data); // 创建一个新的列表副本
      newData.insert(0, singleData); // 在新列表中插入数据
      int end = newData.length >= 10 ? 10 : newData.length;
      _data = newData.sublist(0, end); // 使用新列表的子列表更新_data
      _rowCount++;
    }
    notifyListeners();
  }

  @override
  DataRow? getRow(int index) {
    index = index - _offset;
    // 实现获取行的逻辑
    if (index >= _data.length) return null;
    final item = _data[index];
    return DataRow.byIndex(index: index, cells: [
      DataCell(SizedBox(
        width: _width * 0.20,
        child: Text(item[LocalDBUtils.columnTime]),
      )),
      DataCell(SizedBox(
        width: _width * 0.40,
        child: InkWell(
          onTap: () => showFullContentDialog(item[LocalDBUtils.columnContent]),
          child: Text(
            item[LocalDBUtils.columnContent],
            overflow: TextOverflow.ellipsis,
            maxLines: 1,
          ),
        ),
      )),
      DataCell(SizedBox(
          width: _width * 0.25,
          child: Row(
            children: [
              TextButton(
                onPressed: () async {
                  await setClipboardData(item[LocalDBUtils.columnContent]);
                  showSuccessSnackBar("Copied to clipboard");
                },
                child: const Row(
                  children: <Widget>[
                    Icon(Icons.content_copy, size: 16.0), // 添加图标，设置合适的大小
                    SizedBox(width: 4.0), // 在图标和文本之间添加一些间距
                    Text('Copy'), // 按钮文本
                  ],
                ),
              ),
              TextButton(
                onPressed: () async {
                  await cloudAPIUtils
                      .postClipboardItem(item[LocalDBUtils.columnContent]);
                  showSuccessSnackBar("Uploaded to cloud");
                },
                child: const Row(
                  children: <Widget>[
                    Icon(Icons.upload, size: 16.0), // 添加图标，设置合适的大小
                    SizedBox(width: 4.0), // 在图标和文本之间添加一些间距
                    Text('Upload'), // 按钮文本
                  ],
                ),
              )
            ],
          )))
    ]);
  }

  @override
  int get rowCount => _rowCount;

  @override
  bool get isRowCountApproximate => false;

  @override
  int get selectedRowCount => 0;
}

class _LocalClipboardTableState extends State<LocalClipboardTable> {
  final int _rowsPerPage = 10;
  late LocalDBDataSource _dataSource;
  late StreamSubscription<Map<String, dynamic>> _clipboardSubscription;

  @override
  void initState() {
    super.initState();
    _dataSource = LocalDBDataSource(
      showFullContentDialog: (String content) {
        showFullContentDialog(context, content);
      },
      showSuccessSnackBar: (successContent) {
        showSuccessSnackBar(context, successContent, 2);
      },
    );
    // 订阅剪贴板变化事件
    _clipboardSubscription = ClipboardMonitor.onClipboardChanged.listen((data) {
      _dataSource.addNewSingleData(data);
    });
    _dataSource.loadData(1);
  }

  @override
  void dispose() {
    // 取消订阅，避免内存泄漏
    _clipboardSubscription.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final double width = MediaQuery.of(context).size.width;
    _dataSource.setWidth(width);

    return SingleChildScrollView(
        child: PaginatedDataTable(
      columns: const [
        DataColumn(label: Text('Time')),
        DataColumn(label: Text('Content')),
        DataColumn(label: Text('Action'))
      ],
      source: _dataSource,
      onPageChanged: (pageIndex) {
        _dataSource.loadData((pageIndex ~/ _rowsPerPage) + 1);
      },
    ));
  }
}
