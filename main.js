const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const SAVE_FILE = path.join(app.getPath('userData'), 'savegame.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Uncomment to open devtools during development
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // macOS apps commonly stay open until Cmd+Q
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handlers for save/load
ipcMain.handle('save-to-disk', async (_, data) => {
  try {
    fs.writeFileSync(SAVE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, path: SAVE_FILE };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('load-from-disk', async () => {
  try {
    if (!fs.existsSync(SAVE_FILE)) return { success: false, error: 'No save found' };
    const raw = fs.readFileSync(SAVE_FILE, 'utf-8');
    const obj = JSON.parse(raw);
    return { success: true, data: obj, path: SAVE_FILE };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('export-save', async (_, data) => {
  try {
    const text = JSON.stringify(data);
    return { success: true, text };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('import-save', async (_, text) => {
  try {
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== 'object' || !('ticks' in obj)) {
      return { success: false, error: 'Invalid save format' };
    }
    fs.writeFileSync(SAVE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});
