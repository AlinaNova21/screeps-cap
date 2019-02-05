// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron')

let mainWindow

const DEV = process.argv.includes('--dev')

function createWindow () {
  mainWindow = new BrowserWindow({width: 800, height: 600, frame: DEV })
  mainWindow.loadFile('index.html')
  if(DEV) {
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.setMenu(null)
  }
  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})
