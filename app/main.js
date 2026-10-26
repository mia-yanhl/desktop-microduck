// Desktop Microduck — the window that lets the duck walk on your desktop.
// A see-through, always-on-top window covers the screen; clicks pass straight through it except on the duck itself.
const { app, BrowserWindow, screen, ipcMain, Menu, Tray, nativeImage, shell } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');   // the duck may quack on its own
if (!app.requestSingleInstanceLock()) app.quit();

let win = null, tray = null, state = {};
const send = c => { if (win && !win.isDestroyed()) win.webContents.send('cmd', c); };
const cap = s => s[0].toUpperCase() + s.slice(1);

// right-click on a duck: that duck's moves and colour, then the settings for everyone
function duckMenu(s){
  const go = c => () => send(s.id + '|' + c);
  return [
    { label: 'Walk forward', click: go('walk') },
    { label: 'Walk back', click: go('back') },
    { label: 'Turn left', click: go('left') },
    { label: 'Turn right', click: go('right') },
    { type: 'separator' },
    { label: s.sitting ? 'Stand up' : 'Sit down', click: go('sit') },
    { label: s.crouching ? 'Stand tall' : 'Crouch', click: go('crouch') },
    { label: 'Kick the ball', click: go('kick') },
    { label: s.holding ? 'Put the block down' : 'Pick up a block', click: go('pick') },
    { label: s.skates ? 'Skates off' : 'Roller skates', click: go('skates') },
    { label: 'Look around', click: go('look') },
    { label: 'Quack', click: go('quack') },
    { label: 'See-through', type: 'checkbox', checked: !!s.xray, click: go('xray') },
    { label: 'Colour', submenu: (s.pals || []).map(p => ({ label: cap(p), type: 'radio', checked: s.pal === p, click: go('pal:' + p) })) },
    { type: 'separator' },
    ...shared(s),
  ];
}
// the menu bar icon: everyone at once, plus the settings
function trayMenu(s = state){
  return [
    { label: 'Everyone: Quack', click: () => send('quack') },
    { label: 'Everyone: Look around', click: () => send('look') },
    { label: 'Everyone: See-through', type: 'checkbox', checked: !!s.xray, click: () => send('xray') },
    { type: 'separator' },
    ...shared(s),
  ];
}
function shared(s){
  return [
    { label: 'Ducks', submenu: Array.from({ length: s.max || 5 }, (_, i) => i + 1).map(n => ({ label: n === 1 ? '1 duck' : n + ' ducks', type: 'radio', checked: s.count === n, click: () => send('count:' + n) })) },
    { label: 'Wander on their own', type: 'checkbox', checked: s.roam !== false, click: () => send('roam') },
    { label: 'Size', submenu: (s.sizes || ['small', 'medium', 'large']).map(z => ({ label: cap(z), type: 'radio', checked: s.size === z, click: () => send('size:' + z) })) },
    { label: 'Sound', type: 'checkbox', checked: s.sound !== false, click: () => send('sound') },
    { label: 'Bring the ducks back', click: () => send('home') },
    { type: 'separator' },
    { label: 'About the real Microduck', click: () => shell.openExternal('https://github.com/pollen-robotics') },
    { label: 'Quit Desktop Microduck', accelerator: 'CommandOrControl+Q', click: () => app.quit() },
  ];
}

function fitToScreen(){
  if (!win) return;
  const wa = screen.getPrimaryDisplay().workArea;
  win.setBounds({ x: wa.x, y: wa.y, width: wa.width, height: wa.height });
}

function createWindow(){
  const wa = screen.getPrimaryDisplay().workArea;
  win = new BrowserWindow({
    x: wa.x, y: wa.y, width: wa.width, height: wa.height,
    transparent: true, backgroundColor: '#00000000', frame: false, hasShadow: false,
    resizable: false, movable: false, minimizable: false, maximizable: false, fullscreenable: false,
    skipTaskbar: true, alwaysOnTop: true, show: false, roundedCorners: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false, contextIsolation: true, sandbox: true },
  });
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'duck.html'));
  win.once('ready-to-show', () => win.showInactive());
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
}

function createTray(){
  const img = nativeImage.createFromPath(path.join(__dirname, 'trayTemplate.png'));
  img.setTemplateImage(true);
  tray = new Tray(img);
  tray.setToolTip('Desktop Microduck');
  tray.setContextMenu(Menu.buildFromTemplate(trayMenu()));
}

ipcMain.on('ignore', (e, v) => { if (win) win.setIgnoreMouseEvents(!!v, { forward: true }); });
ipcMain.on('state', (e, s) => { state = s || {}; if (tray) tray.setContextMenu(Menu.buildFromTemplate(trayMenu())); });
ipcMain.on('popup', (e, s) => { if (s) Menu.buildFromTemplate(duckMenu(s)).popup({ window: win }); });

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) app.dock.hide();   // lives in the menu bar, not the Dock
  createWindow();
  createTray();
  screen.on('display-metrics-changed', fitToScreen);
  screen.on('display-added', fitToScreen);
  screen.on('display-removed', fitToScreen);
});
app.on('second-instance', () => send('home'));
app.on('window-all-closed', () => app.quit());
