const { app, BrowserWindow } = require("electron");

// Desktop App Reference: https://github.com/lencx/ChatGPT

// 判断是否处于开发模式
const isDevMode =
  process.env.NODE_ENV === "development" ||
  process.argv.includes("--dev") ||
  process.argv.includes("-d") ||
  !app.isPackaged;
console.log("Dev Mode:", isDevMode);

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  // 根据开发环境和正式环境切换启动
  if (isDevMode) {
    win.loadURL("http://localhost:5173/");
    win.webContents.openDevTools();
  } else {
    win.loadFile("index.html");
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
