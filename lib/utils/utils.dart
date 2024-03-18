import 'package:intl/intl.dart';

String convertIsoDateTimeToLocal(String isoDateTime) {
  // 解析ISO 8601格式的字符串
  DateTime dateTime = DateTime.parse(isoDateTime);
  // 转换为本地时区
  dateTime = dateTime.toLocal();
  final DateFormat formatter = DateFormat('yyyy-MM-dd HH:mm:ss');
  return formatter.format(dateTime);
}
