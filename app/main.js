const { app, BrowserWindow } = require('electron')

function createWindow() {
  let win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      preload: __dirname + '/preload.js'
    }
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  win.setMenuBarVisibility(false)

  win.on('closed', () => {
    win = null
  })

  win.loadURL('https://play.zeiw.me')
}

app.on('ready', createWindow)
