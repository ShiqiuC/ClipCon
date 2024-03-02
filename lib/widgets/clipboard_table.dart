import 'package:clip_con/utils/local_db_utils.dart';
import 'package:flutter/material.dart';

class ClipboardTable extends StatefulWidget {
  const ClipboardTable({super.key});

  @override
  State<ClipboardTable> createState() => _ClipboardTableState();
}

class LocalDBDataSource extends DataTableSource {
  final LocalDBUtils _dbUtils = LocalDBUtils.instance;
  List<Map<String, dynamic>> _data = [];
  int _rowCount = 0;
  final int _pageSize = 10;
  int _offset = 0;
  double _width = 0;

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

  void setWidth(double width) {
    _width = width;
  }

  @override
  DataRow? getRow(int index) {
    index = index - _offset;
    // 实现获取行的逻辑
    if (index >= _data.length) return null;
    final item = _data[index];
    return DataRow.byIndex(index: index, cells: [
      DataCell(SizedBox(
        width: _width * 0.2,
        child: Text(item[LocalDBUtils.columnTime]),
      )),
      DataCell(SizedBox(
        width: _width * 0.6,
        child: Text(
          item[LocalDBUtils.columnContent],
          overflow: TextOverflow.ellipsis,
          maxLines: 1,
        ),
      )),
    ]);
  }

  @override
  int get rowCount => _rowCount;

  @override
  bool get isRowCountApproximate => false;

  @override
  int get selectedRowCount => 0;
}

class _ClipboardTableState extends State<ClipboardTable> {
  final int _rowsPerPage = 10;
  final LocalDBDataSource _dataSource = LocalDBDataSource();

  @override
  void initState() {
    super.initState();
    _dataSource.loadData(1);
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
      ],
      source: _dataSource,
      onPageChanged: (pageIndex) {
        _dataSource.loadData((pageIndex ~/ _rowsPerPage) + 1);
      },
    ));
  }
}
