import 'dart:async';
import 'dart:convert';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

class CloudAPIUtils {
  static const columnId = 'ID'; // ID列名不变
  static const columnContent = 'Content'; // 更新列名为content
  static const columnTime = 'CreatedAt'; // 时间列名不变，但稍后我们将使用DATETIME

  Future<int> fetchTotalClipboardItems() async {
    final url = Uri.parse('${dotenv.env['BASE_URL']}/api/v1/clipboard/total');

    try {
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['total']
            as int; // Assuming the total count is returned under the 'total' key
      } else {
        // Handle server errors or invalid responses
        throw Exception('Failed to load total count');
      }
    } catch (e) {
      // Handle exceptions from the http call
      throw Exception('Failed to fetch data');
    }
  }

  Future<List<Map<String, dynamic>>> getPaginatedData(
      int page, int pageSize) async {
    // Constructing the URL with query parameters for pagination
    final url = Uri.parse(
        '${dotenv.env['BASE_URL']}/api/v1/clipboard?page=$page&limit=$pageSize');

    try {
      // Making the GET request to the API
      final response = await http.get(url);

      // Check if the request was successful
      if (response.statusCode == 200) {
        // Parse the JSON response into a list of maps
        final List<dynamic> data = json.decode(response.body);
        return data.map((item) => item as Map<String, dynamic>).toList();
      } else {
        // Handle server errors or invalid responses
        throw Exception('Failed to load paginated data');
      }
    } catch (e) {
      // Handle exceptions from the HTTP call
      throw Exception('Failed to fetch paginated data');
    }
  }

  Future<void> postClipboardItem(String text) async {
    final url = Uri.parse('${dotenv.env['BASE_URL']}/api/v1/clipboard');
    try {
      final response = await http.post(
        url,
        headers: {"Content-Type": "application/json"},
        body: json.encode({'content': text}),
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> responseData = json.decode(response.body);
        CloudMonitor._cloudChangeController.add(responseData);
      } else {
        throw Exception('Failed to post clipboard text');
      }
    } catch (e) {
      throw Exception('Failed to post clipboard text');
    }
  }
}

class CloudMonitor {
  static final _cloudChangeController =
      StreamController<Map<String, dynamic>>.broadcast();

  static Stream<Map<String, dynamic>> get onCloudChanged =>
      _cloudChangeController.stream;

  static void dispose() {
    _cloudChangeController.close();
  }
}
