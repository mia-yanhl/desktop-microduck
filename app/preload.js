// The small bridge between the duck page and the window (see main.js).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pet', {
  setIgnore: v => ipcRenderer.send('ignore', !!v),          // let clicks fall through to the desktop (true) or catch them (false)
  popup: s => ipcRenderer.send('popup', s),                 // right-click menu
  state: s => ipcRenderer.send('state', s),                 // keeps the menu bar menu in step with the duck
  onCmd: cb => ipcRenderer.on('cmd', (e, c) => cb(c)),      // a menu item was chosen
});
