const { app, BrowserWindow, shell } = require('electron')

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
    minWidth: 600,
    minHeight: 450,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      preload: `${__dirname}/preload.js`
    }
  })

  win.setMenuBarVisibility(false)

  win.on('closed', () => {
    win = null
  })

  win.loadURL('https://play.zeiw.me')

  win.webContents.on('new-window', (e, url) => {
    e.preventDefault()
    shell.openExternal(url)
  })
}

app.on('ready', createWindow)
