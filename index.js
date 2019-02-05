const path = require('path')
const fs = require('fs')
const TwitchBot = require('twitch-bot')
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
let state = {
  gameTime: 0,
  pvp: {
    rooms: []
  }
}
let chatRoom = ''
let chatRoomTimeout = 0

const ROOM_SWAP_INTERVAL = 10000
resetState()
const roomList = []
for(let y=0; y < 11; y++) {
  for(let x=0; x < 11; x++) {
    roomList.push(`E${x}S${y}`)
  }
}

Vue.component('ba-header', {
  props: ['state'],
  template: `
    <div>
      <div style="font-size: 32pt">BotArena</div>
      <div>https://screepswargames.us/</div>
      <div>http://chat.screeps.com #botarena</div>
      <div>Room: {{state.room}}</div>
      <div>Time: {{state.gameTime}}</div>
    </div>`,
})

Vue.component('scoreboard', {
  props: [],
  template: `
    <div>
      <table>
        <tr>
          <th>#</th>
          <th style="text-align: left">Username</th>
          <th style="text-align: center">Rooms</th>
          <th style="text-align: center">Score</th>
        </tr>
        <tr v-for="(record, index) in records" :key="record.username">
          <td>{{ index+1 }})</td>
          <td><img class="badge" :src="badgeURL(record.username)">{{record.username}}</td>
          <td style="text-align: center">{{record.rooms}}</td>
          <td style="text-align: center">{{record.score}}</td>
        </tr>
      </table>
      <div>Note: Score does not check for active spawns</div>
    </div>
    `,
  data() {
    return {
      updateInterval: null,
      stats: {},
      users: {}
    }
  },
  mounted() {
    this.updateInterval = setInterval(() => this.update(), 5000)
    setTimeout(this.update, 1000)
  },
  unmount() {
    clearInterval(this.updateInterval)
  },
  computed: {
    records() {
      const records = []
      const uids = {}
      for (let room in this.stats) {
        const { own } = this.stats[room]
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
        const { username } = this.users[uid]
       records.push({ username, rooms, score })
      }
      return records
    }
  },
  methods: {
    badgeURL(username) {
      return `${api.opts.url}api/user/badge-svg?username=${username}`
    },
    async update() {
      const { stats, users } = await api.raw.game.mapStats(roomList, 'owner0')
      this.stats = stats
      this.users = users
    }
  }
})

Vue.component("pvp-battles", {
  props: ['state'],
  template: `
    <div>
      <div>Recent Battles:</div>
      <transition-group name="battles">
        <div class="battle" v-for="b in battles" :key="b.room">
          <div class="room">{{ b.room }}</div>
          <div class="ticks">{{ b.ticks }} ticks ago</div>
        </div>
      </transition-group>
    </div>`,
  computed: {
    battles() {
      return state.pvp.rooms.map(({ _id: room, lastPvpTime }) => {
        const ticks = Math.max(0, state.gameTime - lastPvpTime)
        return { room, ticks }
      })
    }
  }
})

const app = new Vue({
  el: '#infoDiv',
  template: `
    <div id="infoDiv">
      <ba-header :state="state"></ba-header>
      <scoreboard></scoreboard>
      <br>
      <pvp-battles :state="state"></pvp-battles>
    </div>`,
  data() {
    return {
      state
    }
  }
})

const app2 = new Vue({
  el: '#usersDiv',
  template: `
    <div id="usersDiv">
      <transition-group name="users">
        <div v-for="user in users" :key="user._id">
          <img class="badge" :src="user.badgeUrl">
          {{user.username}}
        </div>
      </transition-group>
    </div>`,
  data() {
    return { state }
  },
  computed: {
    users () {
      return Object.values(this.state.users).filter(u => u._id.length > 1)
    }
  }
})

// Restart occasionally, sometimes the cycle breaks, this helps auto-recover
setTimeout(() => window.close(), 30 * 60 * 1000)

async function roomSwap() {
  while(true) {
    try {
      let { pvp: { botarena: { rooms } } } = await api.raw.experimental.pvp(100)
      state.pvp.rooms = rooms
      rooms.sort((a,b) => b.lastPvpTime - a.lastPvpTime)
      rooms = rooms.filter(r => r.lastPvpTime > state.gameTime - 10)
      let room = ''
      if (chatRoom && chatRoomTimeout > Date.now()) {
        room = chatRoom
      } else if (rooms.length) {
        const { _id, lastPvpTime: time } = rooms[Math.floor(Math.random() * rooms.length)]
        room = _id
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
      await setRoom(room)
    } catch(e) { console.error('roomSwap', e) }
    await sleep(ROOM_SWAP_INTERVAL)
  }
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
  Object.assign(state, {
    objects: [],
    users: {
      '2': { _id: '2', username: 'Invader', usernameLower: 'invader', cpu: 100, cpuAvailable: 10000, gcl: 13966610.2, active: 0 },
      '3': { _id: '3', username: 'Source Keeper', usernameLower: 'source keeper', cpu: 100, cpuAvailable: 10000, gcl: 13966610.2, active: 0 },
    },
    room: currentRoom
  })
  if (renderer) {
    renderer.applyState(state, 0)
  }
  cachedObjects = {}
}

async function run() {
  api = await ScreepsAPI.fromConfig("botarena",'screeps-cap')
  const { twitch, chatTimeout = 20 } = api.appConfig
  if (twitch) {
    const Bot = new TwitchBot(twitch)
    Bot.on('join', channel => {
      console.log(`Joined channel: ${channel}`)
    })
    Bot.on('error', err => {
      console.log(err)
    })
    Bot.on('message', chatter => {
      const [,room] = chatter.message.match(/^!room ([EW]\d+[NS]\d+)$/) || []
      if (room) {
        setRoom(room)
        chatRoom = room
        chatRoomTimeout = Date.now() + (chatTimeout * 1000)
      }
    })
  }
  const view = mainDiv
  cachedObjects = {}
  const say = worldConfigs.metadata.objects.creep.processors.find(p => p.type === 'say')
  say.when = ({ state: { actionLog: { say } = {} } }) => !!say && say.isPublic
  GameRenderer.compileMetadata(worldConfigs.metadata)
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
  api.socket.on('message', async ({ type, channel, id, data, data: { gameTime=0, info, objects, users = {}, visual } = {} }) => {
    if(type !== 'room') return
    if(id !== currentRoom) return
    let tickSpeed = 1
    if(state.room !== currentRoom) {
      tickSpeed = 0
      console.log(`reset`)
      await api.socket.unsubscribe(`room:${state.room}`)
      await resetState()
      console.log('setTerrain')
      await renderer.setTerrain(currentTerrain)
      const [,controller] = Object.entries(objects).find(([,obj]) => obj && obj.type == 'controller') || []
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
    for (const [id, diff] of Object.entries(objects)) {
      const cobj = cachedObjects[id] = cachedObjects[id] || {}
      if (diff) {
        cachedObjects[id] = Object.assign({}, cobj, diff)
      } else {
        delete cachedObjects[id]
      }
    }
    state.objects = Object.entries(cachedObjects).map(([,e]) => e)
    state.gameTime = gameTime || state.gameTime
    try {
      renderer.applyState(state, tickSpeed)
    }catch(e) {
      console.error('Error in update', e)
      state.room = ''
      setRoom(currentRoom) // Reset the view
    }
  })
  console.log('Complete!')
  roomSwap()
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms))
}

run().catch(err => console.error(err))