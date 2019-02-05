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

// Restart occasionally, sometimes the cycle breaks, this helps auto-recover
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
    try {
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
        room = rooms[Math.floor(Math.random() * rooms.length)]
      }
      infoDiv.innerHTML = infoDiv.innerHTML.replace(currentRoom, room)
      await setRoom(room)
    } catch(e) { }
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
  await renderer.init(view)
  renderer.resize()
  await api.socket.connect()
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
  console.log('Complete!')
  roomSwap()
}

var electron = require('electron');

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms))
}

run().catch(err => console.error(err))