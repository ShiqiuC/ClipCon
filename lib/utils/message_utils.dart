import 'package:flutter/material.dart';

void showSuccessSnackBar(BuildContext context, String message, int seconds) {
  final snackBar = SnackBar(
    content: Text(message),
    backgroundColor: Colors.green, // 成功消息通常用绿色表示
    duration: Duration(seconds: seconds), // 持续时间，这里设置为2秒
  );

  // 查找当前Scaffold的context，并显示SnackBar
  ScaffoldMessenger.of(context).showSnackBar(snackBar);
}

void showFullContentDialog(BuildContext context, String content) {
  showDialog(
    context: context,
    builder: (BuildContext context) {
      return AlertDialog(
        title: const Text('Full Content'),
        content: SingleChildScrollView(
          child: SelectableText(content),
        ),
        actions: <Widget>[
          TextButton(
            child: const Text('Close'),
            onPressed: () {
              Navigator.of(context).pop();
            },
          ),
        ],
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(6),
        ),
      );
    },
  );
}
