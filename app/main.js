const { app, BrowserWindow } = require('electron')

function createWindow() {
  let win = new BrowserWindow({ show: false })

  win.once('ready-to-show', () => {
    win.show({
      width: 1200,
      height: 900,
      webPreferences: {
        nodeIntegration: false
      }
    })
  })

  win.setMenuBarVisibility(false)

  win.on('closed', () => {
    win = null
  })

  win.loadURL('https://play.zeiw.me')
}

app.on('ready', createWindow)
