const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  receiveClipboardContent: (callback) =>
    ipcRenderer.on("clipboard-content", callback),
  removeClipboardContentListener: (callback) =>
    ipcRenderer.removeListener("clipboard-content", callback),

  receiveInitialData: (callback) => ipcRenderer.on("initial-data", callback),
  removeInitialDataListener: (callback) =>
    ipcRenderer.removeListener("initial-data", callback),

  requestPageData: (currentPage) =>
    ipcRenderer.send("request-page-data", currentPage),

  requestCopyToClipboard: (record) =>
    ipcRenderer.send("request-send-to-clipboard", record),
});
