// Modules to control application life and create native browser window
const electron = require('electron')
const {app, BrowserWindow} = electron

let mainWindow

const DEV = process.argv.includes('--dev')

function createWindow () {
  const displays = electron.screen.getAllDisplays()
  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize
  
  mainWindow = new BrowserWindow({ 
    webgl: true,
    webSecurity: false,
    experimentalFeatures: true,
    experimentalCanvasFeatures: true,
    offscreen: true,
    x:0, y:0,
    fullscreen: true,
    width, height, 
    frame: DEV 
  })
  mainWindow.loadFile('index.html')
  if(DEV) {
    const { default: installExtension, VUEJS_DEVTOOLS } = require('electron-devtools-installer');
    installExtension(VUEJS_DEVTOOLS)
        .then((name) => console.log(`Added Extension:  ${name}`))
        .catch((err) => console.log('An error occurred: ', err));
    mainWindow.webContents.openDevTools()
    mainWindow.maximize()
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
