'use strict';
const electron = require(`electron`);
const app = electron.app;

let mainWindow;

const createMainWindow = () => {
  const win = new electron.BrowserWindow({
    width: 800,
    height: 600
  });

  win.loadURL(`file://${__dirname}/index.html`);
  win.on(`closed`, () => {
    mainWindow = null;
  });

  return win;
};

app.on(`window-all-closed`, () => {
  if (process.platform !== `darwin`) {
    app.quit();
  }
});

app.on(`activate`, () => {
  if (!mainWindow) {
    mainWindow = createMainWindow();
  }
});

app.on(`ready`, () => {
  mainWindow = createMainWindow();
});
