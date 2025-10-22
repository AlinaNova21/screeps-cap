const _ = require('lodash')
const seedrandom = require('seedrandom')
const randomColor = require('randomcolor')
const fs = require('fs')
const TwitchBot = require('twitch-bot')
const { ScreepsAPI } = require('screeps-api')
const { GameRenderer } = require('@screeps/renderer')
const YAML = require("yaml")
// const worldConfigs = require('./assets/worldConfigs')
// const { resourceMap, rescaleResources } = require('./assets/resourceMap')

function hookConsole() {
  const realConsole = {
    "debug": console.debug,
    "info": console.info,
    "log": console.log,
    "warn": console.warn,
    "error": console.error,
  }
  const formatArg = (arg) => {
    if (arg instanceof Error) {
      return `${arg}\n${arg.stack}`
    }
    return `${arg}`
  }
  const log = (lvl, ...args) => {
    fs.appendFile('output.log', `[${lvl}]:` + args.map(formatArg).join(' ') + "\n", () => {})
    
    realConsole[lvl].apply(console, args)
  }
  for (const key in realConsole) {
    console[key] = (...a) => log(key, ...a);
  }
}
hookConsole();

require('@screeps/renderer-metadata');

const worldConfigs = {
    ATTACK_PENETRATION: 10,
    CELL_SIZE: 100,
    RENDER_SIZE: {
        width: 2048,
        height: 2048,
    },
    VIEW_BOX: 5000,
    BADGE_URL: '/api/user/badge-svg?username=%1',
    metadata: RENDERER_METADATA,
    gameData: {
        player: '', //561e4d4645f3f7244a7622e8',
        showMyNames: {
            spawns: false,
            creeps: false,
        },
        showEnemyNames: {
            spawns: false,
            creeps: false,
        },
        showFlagsNames: true,
        showCreepSpeech: true,
        swampTexture: 'animated',
        // swampTexture: 'disabled',
    },
    // lighting: 'disabled',
    lighting: 'normal',
    forceCanvas: false,
};

const resourceMap = {
    berserk: 'berserk.svg',
    bodyPartBar: 'bodyPartBar.svg',
    // circle: 'circle.svg',
    'commander-lvl0': 'commander-lvl0.svg',
    'commander-lvl1': 'commander-lvl1.svg',
    'commander-lvl2': 'commander-lvl2.svg',
    'commander-lvl3': 'commander-lvl3.svg',
    'commander-lvl4': 'commander-lvl4.svg',
    constructedWall: 'constructedWall.svg',
    controller: 'controller.svg',
    'controller-level': 'controller-level.svg',
    'disrupt-source': 'disrupt-source.svg',
    cover: 'cover.svg',
    'creep-npc': 'creep-npc.svg',
    'creep-mask': 'creep-mask.png',
    defend: 'defend.svg',
    demolish: 'demolish.svg',
    disable: 'disable.svg',
    'disrupt-spawn': 'disrupt-spawn.svg',
    'disrupt-tower': 'disrupt-tower.svg',
    'disrupt-terminal': 'disrupt-terminal.svg',
    'drain-extension': 'drain-extension.svg',
    encourage: 'encourage.svg',
    exhaust: 'exhaust.svg',
    //'regenerate-mineral': 'regenerate-mineral.svg',
    //'regenerate-source': 'regenerate-source.svg',
    flag: 'flag.svg',
    'flag-secondary': 'flag-secondary.svg',
    'executor-lvl0': 'executor-lvl0.svg',
    'executor-lvl1': 'executor-lvl1.svg',
    'executor-lvl2': 'executor-lvl2.svg',
    'executor-lvl3': 'executor-lvl3.svg',
    'executor-lvl4': 'executor-lvl4.svg',
    extension: 'extension.svg',
    'extension-border50': 'extension-border50.svg',
    'extension-border100': 'extension-border100.svg',
    'extension-border200': 'extension-border200.svg',
    extractor: 'extractor.svg',
    'exit-left': 'exit-left.svg',
    'exit-top': 'exit-top.svg',
    'exit-bottom': 'exit-bottom.svg',
    'exit-right': 'exit-right.svg',
    flare1: 'flare1.png',
    flare2: 'flare2.png',
    flare3: 'flare3.png',
    'harvest-energy': 'harvest-energy.svg',
    'harvest-mineral': 'harvest-mineral.svg',
    'generate-ops': 'generate-ops.svg',
    glow: 'glow.png',
    ground: 'ground.png',
    'ground-mask': 'ground-mask.png',
    //'ground-mask2': 'ground-mask2.png',
    kill: 'kill.svg',
    lab: 'lab.svg',
    'lab-highlight': 'lab-highlight.svg',
    'lab-mineral': 'lab-mineral.svg',
    link: 'link.svg',
    'link-energy': 'link-energy.svg',
    'link-border': 'link-border.svg',
    'mass-repair': 'mass-repair.svg',
    noise1: 'noise1.png',
    noise2: 'noise2.png',
    nuke: 'nuke.svg',
    nuker: 'nuker.svg',
    'nuker-border': 'nuker-border.svg',
    'operate-extension': 'operate-extension.svg',
    'operate-lab': 'operate-lab.svg',
    'operate-observer': 'operate-observer.svg',
    'operate-spawn': 'operate-spawn.svg',
    'operate-storage': 'operate-storage.svg',
    'operate-terminal': 'operate-terminal.svg',
    'operate-tower': 'operate-tower.svg',
    'operator-lvl0': 'operator-lvl0.svg',
    'operator-lvl1': 'operator-lvl1.svg',
    'operator-lvl2': 'operator-lvl2.svg',
    'operator-lvl3': 'operator-lvl3.svg',
    'operator-lvl4': 'operator-lvl4.svg',
    powerBank: 'powerBank.svg',
    punch: 'punch.svg',
    rampart: 'rampart.svg',
    rectangle: 'rectangle.svg',
    reflect: 'reflect.svg',
    reinforce: 'reinforce.svg',
    'remote-transfer': 'remote-transfer.svg',
    renew: 'renew.svg',
    shield: 'shield.svg',
    sight: 'sight.svg',
    snipe: 'snipe.svg',
    storage: 'storage.svg',
    'storage-border': 'storage-border.svg',
    summon: 'summon.svg',
    tbd: 'tbd.svg',
    terminal: 'terminal.svg',
    'terminal-border': 'terminal-border.svg',
    'terminal-highlight': 'terminal-highlight.svg',
    'terminal-arrows': 'terminal-arrows.svg',
    'tombstone-border': 'tombstone-border.svg',
    'tombstone-resource': 'tombstone-resource.svg',
    tough: 'tough.svg',
    'tower-base': 'tower-base.svg',
    'tower-rotatable': 'tower-rotatable.svg',
}

for(const k in resourceMap) {
 resourceMap[k] = `node_modules/@screeps/renderer-metadata/images/${resourceMap[k]}`
}  
const rescaleResources = [
    'bodyPartBar',
    'controller',
    'controller-level',
    'constructedWall',
    'creep-npc',
    'extension-border50',
    'extension-border100',
    'extension-border200',
    'extractor',
    'flag',
    'flag-secondary',
    'lab',
    'link',
    'link-border',
    'nuker',
    'nuker-border',
    'powerBank',
    'storage',
    'storage-border',
    'terminal-border',
    'terminal-arrows',
    'tombstone-border',
    'tombstone-resource',
    'tower-base',
]

const warpathCache = new Map()
const battles = new Map()
/** @type {ScreepsAPI} */
let api = null
let renderer = null
let currentRoom = ''
let currentTerrain = null
let cachedObjects = {}
let state = {
  gameTime: 0,
  pvp: {
    rooms: []
  },
  battles: [],
  stats: {
    users: []
  }
}

let chatRoom = ''
let chatRoomTimeout = 0
let mapRoomsCache = null
const ROOM_SWAP_INTERVAL = 10000

const CONFIG = YAML.parse(fs.readFileSync(".screeps.yml", { encoding: 'utf-8' }))['screeps-cap']

CONFIG.scoreMode ??= 'gpl'

CONFIG.server ??= 'mmo'
CONFIG.shard ??= ""
CONFIG.streamTitle ??= 'PowerArena'
CONFIG.slackChannel ??= '#powerarena'

CONFIG.teams ??= []
CONFIG.teams.forEach(t => t.users ??= [])

resetState()

Vue.component('ba-header', {
  props: ['state'],
  template: `
    <div>
      <div style="font-size: 24pt">${CONFIG.streamTitle}</div>
      <div>https://screepspl.us/events/</div>
      <div>http://chat.screeps.com ${CONFIG.slackChannel}</div>
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
        <tr v-for="(record, index) in slicedRecords" :key="record.username" v-if="!slicedTeams.length">
          <td>{{ index+1 }})</td>
          <td><img class="badge" :src="badgeURL(record.username)">{{record.username}}</td>
          <td style="text-align: center">{{record.rooms}}</td>
          <td style="text-align: center">{{record.score}}</td>
        </tr>
        <template v-for="(team, index) in slicedTeams" :key="team.name">
          <tr>
            <td>{{ index+1 }})</td>
            <td>{{team.name}}</td>
            <td style="text-align: center">{{team.rooms}}</td>
            <td style="text-align: center">{{team.score}}</td>
          </tr>
          <tr v-for="(record, index) in team.users" :key="record.username">
            <td></td>
            <td><img class="badge" :src="badgeURL(record.username)">{{record.username}}</td>
            <td style="text-align: center">{{record.rooms}}</td>
            <td style="text-align: center">{{record.score}}</td>
          </tr>
        </template>
      </table>
      <div v-if="records.length > 15">Only top 15 players listed</div>
      <div v-if="scoreMode === 'roomLevels'">Note: Score does not check for active spawns</div>
    </div>
    `,
  data() {
    return {
      updateInterval: null,
      rooms: [],
      users: {},
      scoreMode: CONFIG.scoreMode
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
      if (this.scoreMode === 'roomLevels') {
        const uids = {}
        for (const { own } of this.rooms) {
          if (!own || !own.level) continue
          if (!uids[own.user]) {
            uids[own.user] = {
              uid: own.user,
              rooms: 1,
              score: 0
            }
          }
          uids[own.user].rooms++
          uids[own.user].roomLevels += own.level
          uids[own.user].score += own.level
        }
        const data = Object.keys(uids).map(k => uids[k])
        data.sort((a, b) => b.score - a.score)
        for (let record of data) {
          const { score, rooms, uid } = record
          const { username } = this.users[uid]
          if (username === 'Invader') continue
          records.push({ username, rooms, score })
        }
      }
      if (this.scoreMode === 'gpl') {
        const { users = [] } = state.stats
        users.sort((a, b) => b.power - a.power)
        for (const user of users) {
          // if (!user.power) continue
          records.push({
            score: user.powerLevel,
            rooms: this.rooms.filter(r => r.own && r.own.level && r.own.user === user.id).length,
            username: user.username
          })
        }
      }
      return records
    },
    slicedRecords() {
      return this.records.slice(0, 15)
    },
    slicedTeams() {
      const noTeamUsers = new Set(this.records)
      const teams = CONFIG.teams.map(t => {
        const users = t.users.map(user => this.records.find(u => u.username.match(new RegExp(user, 'i')))).filter(Boolean)
        if (t.default) {
          users.push(...noTeamUsers)
        }
        users.forEach(u => noTeamUsers.delete(u))
        const rooms = users.reduce((l, u) => l + u.rooms, 0)
        const score = users.reduce((l, u) => l + u.score, 0)
        users.sort((a, b) => b.score - a.score)
        return { name: t.name, users, rooms, score }
      })
      teams.sort((a, b) => b.score - a.score)
      return teams
    }
  },
  methods: {
    badgeURL(username) {
      return `${api.opts.url}api/user/badge-svg?username=${username}`
    },
    async update() {
      while (!api) await sleep(1000)
      const { rooms, users } = await getMapRooms(api, CONFIG.shard)
      // const { stats, users } = await api.raw.game.mapStats(roomList, 'owner0')
      // this.stats = stats
      this.rooms = rooms
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
          <div class="badges"><img class="badge" v-for="u of b.participants" :key="u" :src="badgeURL(u)"></div>
          <div class="classification">Class {{ b.classification }}</div>
          <div class="ticks">{{ b.ticks }} ticks ago</div>
        </div>
      </transition-group>
    </div>`,
  computed: {
    battles() {
      console.log('battles')
      return state.battles.map(({ room, ticks, defender, attackers, classification }) => {
        const participants = [defender, ...attackers].filter(Boolean)
        return { room, ticks, classification, participants }
      })
    }
  },
  methods: {
    badgeURL(username) {
      return `${api.opts.url}api/user/badge-svg?username=${username}`
    },
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
    users() {
      return Object.values(this.state.users).filter(u => u._id.length > 1)
    }
  }
})

// Restart occasionally, sometimes the cycle breaks, this helps auto-recover
setTimeout(() => window.close(), 30 * 60 * 1000)
document.addEventListener('DOMContentLoaded', () => {
  // map?.setZoomFactor(0.9)
})
let bias = 0
async function roomSwap() {
  // return setRoom('E7N5')
  while (true) {
    try {
      // const [{ pvp }, battles = {}] = await Promise.all([
        //   api.raw.experimental.pvp(90)
        //   warpath().catch(() => ({})) // Catch handles being ran in non-warpath capable setups
        // ])
      const pvp = api.raw.experimental.pvp(90)
      const [shard = CONFIG.shard] = Object.keys(pvp)
      const battles = state.battles.filter(r => r.lastPvpTime > state.gameTime - 20)
      const now = Date.now()
      let room = ''
      if (chatRoom && chatRoomTimeout > Date.now()) {
        room = chatRoom
      } else if (battles.length) {
        const battle = battles[Math.floor(Math.random() * Math.min(bias, battles.length))]
        room = battle.room
        if (room === currentRoom) {
          bias += 0.75
        } else {
          bias = 0
        }
      } else {
        // const { stats } = await api.raw.game.mapStats(roomList, 'owner0')
        const { rooms: rawRooms } = await getMapRooms(api, CONFIG.shard)
        const rooms = rawRooms.filter(r => r.own && r.own.level && r.own.user !== '2')
        room = rooms[Math.floor(Math.random() * rooms.length)].id
      }
      await setRoom(room)
    } catch (e) { console.error('roomSwap', e) }
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
    await api.socket.unsubscribe(`room:${state.room}`)
    console.log(`sub ${room}`)
    currentRoom = room
    await api.socket.subscribe(`room:${room}`)
  }
}

async function resetState() {
  Object.assign(state, {
    // objects: [],
    users: {
      '2': { _id: '2', username: 'Invader', usernameLower: 'invader', cpu: 100, cpuAvailable: 10000, gcl: 13966610.2, active: 0 },
      '3': { _id: '3', username: 'Source Keeper', usernameLower: 'source keeper', cpu: 100, cpuAvailable: 10000, gcl: 13966610.2, active: 0 },
    },
    room: currentRoom
  })
  cachedObjects = {}
  if (renderer) {
    renderer.erase()
    // renderer.applyState(state, 0)
  }
  // await sleep(100)
}

function processStats(stats) {
  console.log(stats)
  state.stats = stats
}

function processBattles(newBattles) {
  for (const b of newBattles) {
    // b.lastPvpTime += 100
    battles.set(b.room, b)
  }
  const remove = []
  for (const b of battles.values()) {
    if (b.lastPvpTime < state.gameTime - 50) {
      remove.push(b.room)
    }
  }
  remove.forEach(r => battles.delete(r))
  battles.forEach(b => {
    b.ticks = Math.max(0, state.gameTime - b.lastPvpTime)
  })
  state.battles = Array.from(battles.values())
  const rank = ({ classification = 0, ticks }) => (classification * 1000) - ticks
  state.battles.sort((a, b) => rank(b) - rank(a))
}

async function run() {
  api = await ScreepsAPI.fromConfig(CONFIG.server, 'screeps-cap')
  // await api.raw.register.submit(api.opts.username, api.opts.username, api.opts.username, { main: '' })
  console.log("appConfig", api.appConfig)
  const { twitch } = api.appConfig
  if (twitch) {
    console.log('Twitch integration activating')
    const chatTimeout = twitch.chatTimeout ?? 60;
    setTimeout(() => {
      try {
        const Bot = new TwitchBot(twitch)
        Bot.on('connected', () => console.log('Bot connected to twitch'))
        Bot.on('join', channel => {
          console.log(`Joined channel: ${channel}`)
        })
        Bot.on('error', err => {
          console.log('twitch-bot', err.message)
        })
        Bot.on('message', chatter => {
          const [, room] = chatter.message.match(/^!(?:room|goto) ([EW]\d+[NS]\d+)$/) || []
          if (room) {
            setRoom(room)
            chatRoom = room
            chatRoomTimeout = Date.now() + (chatTimeout * 1000)
            Bot.say(`Switching to room ${room} on tick ${state.gameTime}`)
          }
        })
      } catch (e) {
        console.log(`Twitch integration error: ${err.message}`)
      }
    }, 100)
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
    // autoFocus: false,
    resourceMap,
    rescaleResources,
    worldConfigs,
    onGameLoop: () => { },
    countMetrics: false,
    // fitToWorld: {
    //   width: 50,
    //   height: 50
    // },
    useDefaultLogger: false, //true,
    backgroundColor: 0x000000
    // backgroundColor: 0x505050
  })
  await renderer.init(view)
  {
    const t = []
    for (let x = 0; x < 50; x++) {
      for (let y = 0; y < 50; y++) {
        t.push({ type: 'swamp', x, y, room: 'E0N0' })
      }
    }
    renderer.setTerrain(t)
  }
  renderer.resize()
  renderer.zoomLevel = 0.19 //view.offsetHeight / 5000
  console.log(renderer.zoomLevel, view.offsetWidth, view.clientWidth)
  await api.socket.connect()
  api.socket.subscribe('warpath:battles')
  api.socket.subscribe('stats:full')
  api.req('GET', '/api/warpath/battles').then(data => processBattles(data))
  api.req('GET', '/stats').then(data => processStats(data))
  api.socket.on('warpath:battles', ({ data }) => processBattles(data))
  api.socket.on('stats:full', ({ data }) => processStats(data))
  api.socket.on('message', async ({ type, channel, id, data, data: { gameTime = 0, info, objects, users = {}, visual } = {} }) => {
    if (type )
    if (type !== 'room') return
    if (state.reseting) return console.log('racing')
    if (id !== currentRoom) return await api.socket.unsubscribe(`room:${id}`)
    let { tick: tickSpeed = 1 } = await api.req('GET', '/api/game/tick')
    // let tickSpeed = 0.3
    if (state.room !== currentRoom) {
      tickSpeed = 0
      console.log(`reset`)
      await api.socket.unsubscribe(`room:${state.room}`)
      await Promise.all([
        resetState(),
        renderer.setTerrain(currentTerrain)
      ])
      // console.log('setTerrain', currentTerrain)
      state.reseting = true
      const [, controller] = Object.entries(objects).find(([, obj]) => obj && obj.type == 'controller') || []
      worldConfigs.gameData.player = ''
      if (controller) {
        if (controller.user) {
          worldConfigs.gameData.player = controller.user
        }
        if (controller.reservation) {
          worldConfigs.gameData.player = controller.reservation.user
        }
      }
      delete state.reseting
    }
    for (const k in users) {
      state.users[k] = users[k]
    }
    for (const [id, diff] of Object.entries(objects)) {
      const cobj = cachedObjects[id] = cachedObjects[id] || {}
      // if (cobj) {
        if (diff === null) {
          delete cachedObjects[id]
        } else {
          // cachedObjects[id] = Object.assign({}, cobj, diff)
          cachedObjects[id] = _.merge(cobj, diff)
        }
      // } else {
      //   cachedObjects[id] = _.cloneDeep(diff)
      // }
    }
    state.gameTime = gameTime || state.gameTime
    try {
      const objects = _.cloneDeep(Array.from(Object.values(cachedObjects)))
      const ns = Object.assign({ objects }, state)
      await renderer.applyState(ns, tickSpeed / 1000)
    } catch (e) {
      console.error('Error in update', e)
      await api.socket.unsubscribe(`room:${state.room}`)
      await sleep(100)
      const r = currentRoom
      state.room = currentRoom = ''
      setRoom(r) // Reset the view
    }
  })
  console.log('Complete!')
  await api.me()
  await minimap()
  roomSwap()
}


function XYToRoom(x, y) {
  let dx = 'E'
  let dy = 'S'
  if (x < 0) {
    x = -x - 1
    dx = 'W'
  }
  if (y < 0) {
    y = -y - 1
    dy = 'N'
  }
  return `${dx}${x}${dy}${y}`
}

function XYFromRoom(room) {
  let [, dx, x, dy, y] = room.match(/^([WE])(\d+)([NS])(\d+)$/)
  x = parseInt(x)
  y = parseInt(y)
  if (dx === 'W') x = -x - 1
  if (dy === 'N') y = -y - 1
  return { x, y }
}

/**
 * 
 * @param {ScreepsAPI} api 
 * @param {string | undefined} shard 
 * @returns 
 */
async function getMapRooms(api, shard = undefined) {
  if (!mapRoomsCache) {
    console.log('Scanning sectors')
    const sectors = await scanSectors()
    let roomsToScan = []
    console.log('Sectors found:', sectors)
    for (let room of sectors) {
      let { x, y } = XYFromRoom(room)
      for (let xx = 0; xx < 12; xx++) {
        for (let yy = 0; yy < 12; yy++) {
          let room = XYToRoom(x + xx - 6, y + yy - 6)
          roomsToScan.push(room)
        }
      }
    }
    mapRoomsCache = roomsToScan
  }
  const { rooms, users } = await scan(mapRoomsCache)
  console.log(`GetMapRooms found ${rooms.length} rooms`)
  return { rooms, users }

  async function scanSectors() {
    const rooms = []
    for (let yo = -10; yo <= 10; yo++) {
      for (let xo = -10; xo <= 10; xo++) {
        const room = XYToRoom((xo * 10) + 5, (yo * 10) + 5)
        rooms.push(room)
      }
    }
    const result = await scan(rooms)
    return result.rooms.map(r => r.id)
  }

  async function scan(rooms = []) {
    if (!rooms.length) return { rooms: [], users: {} }
    const result = await api.raw.game.mapStats(rooms, 'owner0', shard)
    const ret = []
    for (const k in result.stats) {
      const { status, own } = result.stats[k]
      result.stats[k].id = k
      if (status === 'normal') {
        ret.push(result.stats[k])
      }
    }
    return { rooms: ret, users: result.users }
  }
}

async function minimap() {
  const colors = {
    2: '#FF9600', // invader
    3: '#FF9600', // source keeper
    w: '#000000', // wall
    r: '#3C3C3C', // road
    pb: '#FFFFFF', // powerbank
    p: '#00C8FF', // portal
    s: '#FFF246', // source
    m: '#AAAAAA', // mineral
    c: '#505050', // controller
    k: '#640000' // keeperLair
  }
  class MiniMapRoom {
    constructor(api, id, shard = "", { colors, rotate = 0 }) {
      this.api = api
      this.id = id
      this.colors = colors
      this.api.socket.subscribe(`roomMap2:${id}`, (e) => this.handle(e))
      this.cont = new PIXI.Container()
      const { x, y } = XYFromRoom(id)
      this.cont.x = x * 50
      this.cont.y = y * 50
      this.cont.width = 50
      this.cont.height = 50
      const baseUrl = api.opts.url === "https://screeps.com/" ? "https://d3os7yery2usni.cloudfront.net" : `${api.opts.url}assets`;
      const shardSlug = shard !== "" ? `${shard}/` : "";
      this.img = PIXI.Sprite.from(`${baseUrl}/map/${shardSlug}${id}.png`)
      this.img.width = 50
      this.img.height = 50
      this.cont.addChild(this.img)
      this.overlay = new PIXI.Graphics()
      this.cont.addChild(this.overlay)
      this.badge = new PIXI.Sprite()
      this.badge.anchor.x = 0.5
      this.badge.anchor.y = 0.5
      this.badge.x = 25
      this.badge.y = 25
      this.badge.rotation = -rotate || 0
      this.cont.addChild(this.badge)
    }
    getColor(identifier) {
      if (!this.colors[identifier]) {
        const rng = seedrandom(identifier)
        const seed = rng().toString()
        this.colors[identifier] = randomColor({
          luminosity: 'bright',
          seed
        })
      }
      return parseInt(colors[identifier].slice(1), 16)
    }
    handle({ id, data }) {
      const { overlay } = this
      overlay.clear()
      for (const k in data) {
        const arr = data[k]
        overlay.beginFill(this.getColor(k))
        arr.forEach(([x, y]) => overlay.drawRect(x, y, 1, 1))
        overlay.endFill()
      }
    }
    update(roomInfo, users) {
      this.badge.visible = !!roomInfo.own
      if (roomInfo.own) {
        const user = users[roomInfo.own.user] || state.users[roomInfo.own.user] || state.stats.users.find(u => u.id === roomInfo.own.users)
        const badgeURL = `${this.api.opts.url}api/user/badge-svg?username=${user.username}`
        this.badge.texture = PIXI.Texture.from(badgeURL)
        const size = (roomInfo.own.level * (20 / 8)) + 15
        this.badge.width = size
        this.badge.height = size
        this.badge.alpha = roomInfo.own.level ? 0.5 : 0.4
      }
    }
  }
  const rotateMap = 0 // (Math.PI * 2) * 0.25
  const { rooms, users } = await getMapRooms(api, CONFIG.shard)
  const mapRooms = new Map()
  const miniMap = new PIXI.Container()
  window.miniMap = miniMap
  renderer.app.stage.addChild(miniMap)
  for (const room of rooms) {
    const r = new MiniMapRoom(api, room.id, CONFIG.shard, { colors, rotate: rotateMap })
    r.update(room, users)
    mapRooms.set(room.id, r)
    miniMap.addChild(r.cont)
  }
  let lastRoom = ''
  setInterval(async () => {
    if (currentRoom === lastRoom) return
    if (!currentRoom) return
    lastRoom = currentRoom
    const { rooms, users } = await getMapRooms(api, CONFIG.shard)
    for (const room of rooms) {
      const r = mapRooms.get(room.id)
      r.update(room, users)
    }
  }, 1000)
  const highlight = new PIXI.Graphics()
  // highlight.alpha = 0.5
  miniMap.addChild(highlight)
  setInterval(async () => {
    highlight.clear()
    state.pvp.rooms.forEach(({ _id: room, lastPvpTime }) => {
      const ticks = Math.max(0, state.gameTime - lastPvpTime)
      const { x, y } = XYFromRoom(room)
      highlight
        .lineStyle(1, 0xFF0000, 1 - (ticks / 100))
        .drawRect((x * 50), (y * 50), 50, 50)
    })
    if (currentRoom) {
      const { x, y } = XYFromRoom(currentRoom)
      highlight
        .lineStyle(1, 0x00FF00, 0.6)
        .drawRect((x * 50), (y * 50), 50, 50)
    }
  }, 500)


  const width = 580
  const xOffset = width + 10

  miniMap.rotation = rotateMap

  miniMap.x = -xOffset * (1 / renderer.app.stage.scale.x)
  miniMap.width = width * (1 / renderer.app.stage.scale.x) * 0.95
  miniMap.scale.y = miniMap.scale.x
  miniMap.x += 50 * 10.5 * miniMap.scale.x
  miniMap.y += 50 * 10.5 * miniMap.scale.y
  renderer.app.stage.position.x = xOffset
  renderer.app.stage.mask = undefined
  // const mask = new PIXI.Graphics()
  // const { CELL_SIZE, VIEW_BOX } = worldConfigs
  // mask.drawRect(-CELL_SIZE / 2, -CELL_SIZE / 2, VIEW_BOX, VIEW_BOX)
  // mask.drawRect(miniMap.x, miniMap.y, miniMap.width, miniMap.height)
  // miniMap.addChild(mask)
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms))
}

run().catch(err => {
  console.error(err)
  fs.appendFile('output.log', err.message + "\n", () => { })
})
