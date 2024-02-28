import "./App.css";
import { Table, Tooltip, Space, Button, message, Tabs } from "antd";
import moment from "moment";
import React, { useState, useEffect, useRef } from "react";
import { CopyOutlined } from "@ant-design/icons";

const { TabPane } = Tabs;

const columns = [
  {
    title: "Time",
    dataIndex: "time",
    key: "time",
    width: 200,
    render: (text) => {
      var stillUtc = moment.utc(text).toDate();
      var local = moment(stillUtc).local().format("YYYY-MM-DD HH:mm:ss");
      return <a>{local}</a>;
    },
  },
  {
    title: "Content",
    dataIndex: "content",
    key: "content",
    ellipsis: "true",
    render: (text) => (
      <Tooltip placement="topLeft" title={text}>
        <span>{text}</span>
      </Tooltip>
    ),
  },
  {
    title: "Action",
    key: "action",
    width: 150,
    render: (_, record) => (
      <Space size="middle">
        <Button
          onClick={() => copyInfo(record)}
          icon={<CopyOutlined />}
          type="link"
        >
          Copy
        </Button>
      </Space>
    ),
  },
];

const copyInfo = (record) => {
  // 实际的复制逻辑应根据需求实现，这里仅显示消息
  message.success(`Copy Success`);
  window.electron.requestCopyToClipboard(record);
};

const App = () => {
  const [localData, setLocalData] = useState([]);
  const [cloudData, setCloudData] = useState([]);
  const [localTotals, setLocalTotals] = useState(0);
  const [cloudTotals, setCloudTotals] = useState(0);
  const [currentLocalPage, setCurrentLocalPage] = useState(1);
  const [currentCloudPage, setCurrentCloudPage] = useState(1);

  // 使用useRef来追踪currentPage的最新值
  const currentLocalPageRef = useRef(currentLocalPage);
  const currentCloudPageRef = useRef(currentCloudPage);

  // 每当currentPage更新时，同步更新currentPageRef.current
  useEffect(() => {
    currentLocalPageRef.current = currentLocalPage;
  }, [currentLocalPage]);

  useEffect(() => {
    currentCloudPageRef.current = currentCloudPage;
  }, [currentCloudPage]);

  // 分页改变的处理函数
  const changeLocalPage = (page) => {
    window.electron.requestPageData({ page: page, type: "local" });
  };

  // 分页改变的处理函数
  const changeCloudPage = (page) => {
    window.electron.requestPageData({ page: page, type: "cloud" });
  };

  const localPaginationProps = {
    showTotal: () => `共${localTotals}条`,
    pageSize: 10,
    current: currentLocalPage,
    total: localTotals,
    onChange: changeLocalPage, // 使用定义的函数，而不是this.changePage
  };

  const cloudPaginationProps = {
    showTotal: () => `共${cloudTotals}条`,
    pageSize: 10,
    current: currentCloudPage,
    total: cloudTotals,
    onChange: changeCloudPage, // 使用定义的函数，而不是this.changePage
  };

  useEffect(() => {
    // 接收剪贴板内容的更新
    const clipboardCallback = (event, content) => {
      console.log(currentLocalPageRef.current);
      if (currentLocalPageRef.current == 1) {
        setLocalData((prevData) => {
          // 如果数组长度达到10，先删除最后一个元素，然后在前面添加新元素
          if (prevData.length >= 10) {
            // 删除最后一个元素，并在数组前面插入新内容
            const newData = prevData.slice(0, 9); // 保留前9个元素
            return [content, ...newData];
          } else {
            // 如果数组长度小于10，直接在前面添加新内容
            return [content, ...prevData];
          }
        });
      }
      setLocalTotals((prevTotals) => {
        return prevTotals + 1;
      });
    };

    window.electron.receiveClipboardContent(clipboardCallback);

    // 接收初始数据
    const initialDataCallback = (event, { localData, cloudData }) => {
      setLocalData(localData.items);
      setLocalTotals(localData.totalCount);
      setCurrentLocalPage(localData.currentPage);
      setCloudData(cloudData.items);
      setCloudTotals(cloudData.totalCount);
      setCurrentCloudPage(cloudData.currentPage);
    };

    window.electron.receiveInitialData(initialDataCallback);

    return () => {
      window.electron.removeClipboardContentListener(clipboardCallback);
      window.electron.removeInitialDataListener(initialDataCallback);
    };
  }, []);

  const tablsItems = [
    {
      key: "1",
      label: "Local Data",
      children: (
        <Table
          columns={columns}
          dataSource={localData}
          pagination={localPaginationProps}
          rowKey="id"
          className="Table"
        />
      ),
    },
    {
      key: "2",
      label: "Cloud Data",
      children: (
        <Table
          columns={columns}
          dataSource={cloudData}
          pagination={cloudPaginationProps}
          rowKey="_id"
          className="Table"
        />
      ),
    },
  ];

  return (
    <div className="App">
      <Tabs className="Tabs" defaultActiveKey="1" items={tablsItems} />
    </div>
  );
};

export default App;
