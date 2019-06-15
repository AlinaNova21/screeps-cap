const path = require('path')
const fs = require('fs')
const { ScreepsAPI } = require('screeps-api')
const { GameRenderer } = require('@screeps/renderer')
const worldConfigs = require('./assets/worldConfigs')
const { resourceMap, rescaleResources } = require('./assets/resourceMap')
const argv = require('electron').remote.process.argv

let api = null 
let renderer = null
let currentRoom = ''
let currentTerrain = null
let cachedObjects = {}
let state = {}
let resetting = false
let lastPvpTime = null
const ROOM_SWAP_INTERVAL = 10000

const roomList = []
for(let y=0; y < 11; y++) {
  for(let x=0; x < 11; x++) {
    roomList.push(`E${x}S${y}`)
  }
}

setTimeout(() => window.close(), 30 * 60 * 1000)

async function renderUsers() {
  while(true) {
    let out = ''
    for(const id in state.users) {
      const user = state.users[id]
      if(id.length === 1) continue
      out += `<div><img class="badge" src="${user.badgeUrl}">${user.username}</div>`
    }    
    usersDiv.innerHTML = out
    await sleep(1000)
  }
}

async function roomSwap() {
  while(true) {
    await sleep(ROOM_SWAP_INTERVAL)
    let { pvp: { botarena: { rooms } } } = await api.raw.experimental.pvp(100)
    rooms.sort((a,b) => b.lastPvpTime - a.lastPvpTime)
    const pi = await playerInfo()
    infoDiv.innerHTML = `
      <span style="font-size: 32pt">BotArena</span>
      https://screepswargames.us/
      http://chat.screeps.com #botarena
      Room: ${currentRoom}
      Time: ${state.gameTime}
      
      ${pi}
      ${buildSideTable(rooms)}
    `.replace(/\n/g, '<br>')
    rooms = rooms.filter(r => r.lastPvpTime > state.gameTime - 10)
    let room = ''
    if (rooms.length) {
      const { _id, lastPvpTime: time } = rooms[Math.floor(Math.random() * rooms.length)]
      room = _id
      lastPvpTime = time
    } else {
      const { stats } = await api.raw.game.mapStats(roomList, 'owner0')
      for(let k in stats) {
        const r = stats[k]
        if (r.own && r.own.level) {
          rooms.push(k)
        }
      }
      console.log(stats)
//      infoDiv.innerHTML += '<br>Swapping to random owned room'
      room = rooms[Math.floor(Math.random() * rooms.length)]
    }
    infoDiv.innerHTML = infoDiv.innerHTML.replace(currentRoom, room)
    await setRoom(room)
  }
}

function buildSideTable(rooms) {
  let out = ''
  if(rooms.length) {
    out += 'Recent Battles:\n'
  }
  rooms.forEach(({ _id, lastPvpTime }) => {
    out += `${_id} ~${Math.max(0,state.gameTime - lastPvpTime)} ticks ago\n`
  })
  return out
}

async function playerInfo() {
  let out = `<table><tr>
    <th>#</th>
    <th style="text-align: left">Username</th>
    <th style="text-align: center">Rooms</th>
    <th style="text-align: center">Score</th>
  </tr>`
  const uids = {}
  const { stats, users } = await api.raw.game.mapStats(roomList, 'owner0')
  for(let room in stats) {
    const { own } = stats[room]
    if (!own || !own.level) continue
    if (uids[own.user]) {
      uids[own.user].rooms++
      uids[own.user].score += own.level
    } else {
      uids[own.user] = {
        uid: own.user,
        rooms: 1,
        score: own.level
      }
    }
  }
  const data = Object.keys(uids).map(k => uids[k])
  data.sort((a,b) => b.score - a.score)
  for(let record of data) {
    const { score, rooms, uid } = record
    const user = users[uid]
    let username = user.username
    let ind = data.indexOf(record) + 1
    out += `<tr>
      <td>${ind})</td>
      <td><img class="badge" src="${api.opts.url}api/user/badge-svg?username=${username}">${username}</td>
      <td style="text-align: center">${rooms}</td>
      <td style="text-align: center">${score}</td>
    </tr>`
  }
  out += '</table>Note: Score does not check for active spawns<br>'
  return out.replace(/\n/g, '')
}

async function setRoom(room) {
  console.log(`setRoom ${room}`)
  let terrain = null
  if (room !== currentRoom) {
    let { terrain: [{ terrain: encoded } = {}] = [] } = await api.raw.game.roomTerrain(room, true)
    const types = ['plain', 'wall', 'swamp', 'wall']
    terrain = encoded.split('').filter(t => t).map((v, i) => ({
      x: i % 50,
      y: Math.floor(i / 50),
      type: types[v]
    }))
    currentTerrain = terrain
  }
  if (room !== currentRoom) {
    console.log(`sub ${room}`)
    currentRoom = room
    api.socket.subscribe(`room:${room}`)
  }
}

async function resetState() {
 state = {
    objects: [],
    users: {
      '2': { _id: '2', username: 'Invader', usernameLower: 'invader', cpu: 100, cpuAvailable: 10000, gcl: 13966610.2, active: 0 },
      '3': { _id: '3', username: 'Source Keeper', usernameLower: 'source keeper', cpu: 100, cpuAvailable: 10000, gcl: 13966610.2, active: 0 },
    },
    gameTime: 0,
    room: currentRoom
  }
  cachedObjects = {}
  if (renderer) {
    await renderer.applyState(state, 0)
  }
}

async function run() {
  // const [shard, room, startTick] = ['shard2', 'E49S36', 12893500]
  // const [shard, room, startTick] = ['shard3', 'E24S3', 3571200]
  // const [shard, room, startTick] = ['shard2', 'E45S22', 12895300]
  // const [shard, room, startTick] = ['shard1', 'E17S48', 14866500]
  // const [shard, room, startTick] = ['shard0', 'W15S31', 29897400]
  /*
  const [shard, room, startTick] = argv.slice(-3).map(v => parseInt(v) || v) //['shard0', 'W15S31', 29897400]
  infoDiv.innerHTML = `
    Shard: ${shard}
    Room: ${room}
    Tick: ${startTick}
  `.replace(/\n/g,"<br>")
  */
  // const shard = 'shard1'
  // const room = 'E44N38'
  // const startTick = 14853000
  resetState()
  renderUsers()
  const preTicks = 0
  const ticksToRecord = 1000
  const ticksPerSecond = 40
  api = await ScreepsAPI.fromConfig("botarena")
  const started = false
  const view = mainDiv
  cachedObjects = {}
  GameRenderer.compileMetadata(worldConfigs.metadata)
  worldConfigs.metadata.objects.creep.calculations[0].func = ({ state : { user }, stateExtra: { users } }) => users[user].username
  worldConfigs.BADGE_URL = `${api.opts.url}api/user/badge-svg?username=%1`
  renderer = new GameRenderer({
    size: {
      width: view.offsetWidth,
      height: view.offsetHeight
    },
    autoFocus: false,
    resourceMap,
    rescaleResources,
    worldConfigs,
    onGameLoop: () => {},
    countMetrics: false,
    fitToWorld: {
      width: 50,
      height: 50
    },
    useDefaultLogger: false, //true,
    backgroundColor: 0x555555
  })
  // infoDiv.style.width = (window.innerWidth - window.innerHeight) + 'px'
  await renderer.init(view)
  renderer.resize()
  /*
  let { terrain: [{ terrain } = {}] = [] } = await api.raw.game.roomTerrain(room, true, shard)
  const types = ['plain', 'wall', 'swamp', 'wall']
  terrain = terrain.split('').filter(t => t).map((v, i) => ({
    x: i % 50,
    y: Math.floor(i / 50),
    type: types[v]
  }))
  await renderer.setTerrain(terrain)*/
  if (false) { //startTick) {
    const allTicks = {}
    let tickNum = startTick - preTicks
    let tries = 5
    while (tries && Object.keys(allTicks).length < ticksToRecord) {
      infoDiv.innerHTML=`Loading Ticks... <progress min="0" max="${ticksToRecord}" value="${Object.keys(allTicks).length}"></progress>`
      try {
        const { ticks } = await api.raw.history(room, tickNum, shard)
        for (const tick in ticks) {
          allTicks[tick] = ticks[tick]
        }
        if(api.opts.url.match('screeps.com')) await new Promise((res) => setTimeout(res, 1000))    
      } catch(err) {
        console.log(`${tickNum} not available`)
        tries--
      }
      tickNum += api.opts.url.match('screeps.com') ? 100 : 20
    }
    infoDiv.innerHTML = 'Starting...'
    startRecording()
    for(const tick in allTicks) {
      const start = Date.now()
      const objects = allTicks[tick]
      state.gameTime = parseInt(tick)
      for (const [id,diff] of Object.entries(objects)) {
        const cobj = cachedObjects[id] = cachedObjects[id] || {}
        if (diff) {
          cachedObjects[id] = Object.assign({}, cobj, diff)
        } else {
          delete cachedObjects[id]
        }
      }
      const users = []
      for (const id in cachedObjects) {
        const obj = cachedObjects[id]
        if (obj.user) users.push(obj.user)
        if (obj.reservation) users.push(obj.reservation.user)
        if (obj.sign) users.push(obj.sign.user)
      }
      for (const id of users) {
        if(!id || id.length === 1) continue
        if(state.users[id]) continue // Use cache if available
        const { user } = await api.raw.user.findById(id)
        state.users[id] = user
        await new Promise((res) => setTimeout(res, 1000))
      }
      state.objects = Object.entries(cachedObjects).map(([,e]) => e)
      renderer.applyState(state, 1 / ticksPerSecond)
      infoDiv.innerHTML = `
        Shard: ${shard}
        Room: ${room}
        Tick: ${state.gameTime}
      `.replace(/\n/g,"<br>")
      const end = Date.now()
      const dur = end - start
      await new Promise((res) => setTimeout(res, (1000 / ticksPerSecond) - dur))
      // if(t - startTick == 20) break
    }
    const video = `./${shard}_${room}_${startTick}.webm`
    await stopRecording(video)
    if(argv.includes('--upload')) {
      try {
        const res = await upload({
          shard, room, tick: startTick, video
        })
        console.log(res)
      } catch(err) {
        infoDiv.innerHTML = `<pre style="color:red;">${err.stack || err.message || err}</pre>`
        await new Promise((res) => setTimeout(res, 10 * 1000))
      }
    }
  } else {
    //api.socket.on('message', (msg) => console.log(msg))
    await api.socket.connect()
    //api.socket.subscribe(`room:${shard}/${room}`)
    api.socket.on('message', async ({ type, channel, id, data, data: { gameTime, info, objects, users = {}, visual } = {} }) => {
      if(type !== 'room') return
      if(resetting) return
      if(id !== currentRoom) return
      if(state.room !== currentRoom) {
        console.log(`reset`)
        await api.socket.unsubscribe(`room:${state.room}`)
        await resetState()
        console.log('setTerrain')
        await renderer.setTerrain(currentTerrain)
        const [,controller] = Object.entries(objects).find(([,obj]) => obj.type == 'controller')
        worldConfigs.gameData.player = ''
        if (controller) {
          if (controller.user) {
            worldConfigs.gameData.player = controller.user
          }
          if (controller.reservation) {
            worldConfigs.gameData.player = controller.reservation.user
          }
        }
      }
      // if(objects[0].room && objects[0].room !== currentRoom) return // Don't mix state from other rooms.
      // console.log(data)
      for (const k in users) {
        state.users[k] = users[k]
      }
      for (const [id,diff] of Object.entries(objects)) {
        const cobj = cachedObjects[id] = cachedObjects[id] || {}
        if (diff) {
          cachedObjects[id] = Object.assign({}, cobj, diff)
        } else {
          delete cachedObjects[id]
        }
      }
      state.objects = Object.entries(cachedObjects).map(([,e]) => e)
      state.gameTime = gameTime
      try {
        renderer.applyState(state, 1)
      }catch(e) {
        console.error('Error in update', e)
        setRoom(currentRoom) // Reset the view
      }
    })
  }
  console.log('Complete!')
  if(!argv.includes('--dev')) {
    //infoDiv.innerHTML='<span style="color:green;">Complete!</span>'
    //window.close()
  }
  roomSwap()
}


async function upload(data) {
  const { shard='', room='', tick=0, video } = data
  const { google } = require('googleapis')
  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
  ]
  const sampleClient = require('./sampleClient')
  await sampleClient.authenticate(scopes)
  const youtube = google.youtube({
    version: 'v3',
    auth :sampleClient.oAuth2Client
    // auth: process.env.GAPI_KEY
  })
  const keyPath = path.join(__dirname, 'oauth2.keys.json')
  let keys = {}
  if (fs.existsSync(keyPath)) {
    const keyFile = require(keyPath)
    keys = keyFile.installed || keyFile.web
  }
  const fileSize = fs.statSync(video).size
  const res = await youtube.videos.insert({
    part: 'id,snippet,status',
    notifySubscribers: false,
    requestBody: {
      snippet: {
        title: `Screeps Battle ${shard} ${room} ${tick}`,
        description:`Shard: ${shard}\nRoom: ${room}\nTick: ${tick}`,
        tags: "screeps",
        categoryId: 20
      },
      status: {
        // privacyStatus: 'unlisted'
        privacyStatus: 'public'
      }
    },
    media: {
      body: fs.createReadStream(video)
    }
  },
  {
    onUploadProgress (evt) {
      const complete = evt.loaded || evt.bytesRead
      const perc = (complete / fileSize) * 100;
      infoDiv.innerHTML = `Uploading... ${complete}/${fileSize} ${perc.toFixed(0)}% <br><progress min="0" max="100" value="${perc}"></progress>`
    }
  })
  return res.data
}

var electron = require('electron');

var SECRET_KEY = 'screepsRecorder';

var recorder;
var blobs = [];

function startRecording() {
    var title = document.title;
    document.title = SECRET_KEY;

    electron.desktopCapturer.getSources({ types: ['window', 'screen'] }, function(error, sources) {
        if (error) throw error;
        for (let i = 0; i < sources.length; i++) {
            let src = sources[i];
            if (src.name === SECRET_KEY) {
                // document.title = title;
                console.log(src)

                navigator.webkitGetUserMedia({
                    audio: false,
                    video: {
                        mandatory: {
                            chromeMediaSource: 'desktop',
                            chromeMediaSourceId: src.id,
                            minWidth: 800,
                            maxWidth: 1920,
                            minHeight: 600,
                            maxHeight: 1080
                        }
                    }
                }, handleStream, handleUserMediaError);
                return;
            }
        }
    });
}

function handleStream(stream) {
    recorder = new MediaRecorder(stream);
    blobs = [];
    recorder.ondataavailable = function(event) {
      console.log('data', event)
        blobs.push(event.data);
    };
    recorder.start();
}

async function stopRecording(file) {
    recorder.stop();
    while(!blobs.length) {
      await new Promise((res) => setTimeout(res, 300))
    }
    const blob = new Blob(blobs, {type: blobs[0].type || 'video/webm'})
    const buffer = await toBuffer(blob)
    console.log(blobs, blob, buffer)
    fs.writeFileSync(file, buffer, function(err) {
        if (err) {
            console.error('Failed to save video ' + err);
        } else {
            console.log('Saved video: ' + file);
        }
    });
    return buffer
}

function handleUserMediaError(e) {
    console.error('handleUserMediaError', e);
}

async function toBuffer(blob) {
  return new Promise((resolve) => {
    let fileReader = new FileReader();
    function onLoadEnd () {
      fileReader.removeEventListener('loadend', onLoadEnd) 
      resolve(Buffer.from(fileReader.result));
    };
    fileReader.addEventListener('loadend', onLoadEnd) 
    fileReader.readAsArrayBuffer(blob);
  })
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms))
}

run().catch(err => console.error(err))