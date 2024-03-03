import 'dart:async';
import 'package:clip_con/utils/local_db_utils.dart';
import 'package:flutter/services.dart';

Timer? _clipboardMonitorTimer;

Future<String> getClipboardData() async {
  final ClipboardData? data = await Clipboard.getData(Clipboard.kTextPlain);
  if (data != null && data.text != null) {
    return data.text!;
  } else {
    return '';
  }
}

void startClipboardMonitor() async {
  String lastClipboardData = await getClipboardData();
  _clipboardMonitorTimer?.cancel();
  _clipboardMonitorTimer =
      Timer.periodic(const Duration(seconds: 1), (timer) async {
    String currentClipboardData = await getClipboardData();
    if (currentClipboardData != lastClipboardData) {
      print('剪贴板内容变化了: $currentClipboardData');
      lastClipboardData = currentClipboardData;
      Map<String, dynamic> insertedRow =
          await LocalDBUtils.instance.insertContent(lastClipboardData);
      ClipboardMonitor._clipboardChangeController.add(insertedRow);
    }
  });
}

void stopClipboardMonitor() {
  _clipboardMonitorTimer?.cancel();
}

class ClipboardMonitor {
  static final _clipboardChangeController =
      StreamController<Map<String, dynamic>>.broadcast();

  static Stream<Map<String, dynamic>> get onClipboardChanged =>
      _clipboardChangeController.stream;

  static void dispose() {
    _clipboardChangeController.close();
  }
}
