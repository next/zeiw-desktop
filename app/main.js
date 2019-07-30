const { app, BrowserWindow } = require('electron')

function createWindow() {
  app.on('browser-window-created', (evt, createdWin) => {
    createdWin.once('ready-to-show', () => {
      createdWin.show()
    })
  })

  let win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      preload: __dirname + '/preload.js'
    }
  })

  win.setMenuBarVisibility(false)

  win.on('closed', () => {
    win = null
  })

  win.loadURL('https://play.zeiw.me')

  win.webContents.on('new-window', function(e, url) {
    e.preventDefault()
    require('electron').shell.openExternal(url)
  })
}

app.on('ready', createWindow)
