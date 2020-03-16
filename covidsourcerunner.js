const CovidSources = require('./covidsource').CovidSources
const sources = new CovidSources()
const sourceRefreshSeconds = 60
const jsonfile = require('jsonfile')
const file = './data.json'

// Discord stuff
const Discord = require('discord.js')
const client = new Discord.Client()
const config = require('./config')

// Cache and persistence stuff
let latestCachedData = []
let data = {
  notify: {},
  lastCounts: {}
}

// Load persisted guild and subscribed channels
try {
  data = jsonfile.readFileSync(file)
  console.log(`Loaded ${Object.keys(data).length} guilds from memory`)
} catch (e) {
  jsonfile.writeFile(file, data, function (err) {
    if (err) console.error(err)

    console.log('Data saved!')
    console.log(JSON.stringify(data))
  })
}

// NOTE!!!!
// This method of persistence is horrible if the bot ever gets large as we
// will be saving all data every time the sourcedata count changes as well
// as when a channel subscribes and unsubscribes from notifications
// but i am lazy and this will work for now lol
function saveData () {
  jsonfile.writeFile(file, data, function (err) {
    if (err) console.error(err)

    console.log('Data saved!')
    console.log(JSON.stringify(data))
  })
}

function notifySubscribers(name, lastCount, newCount){
  let guilds = Object.keys(data.notify)

  guilds.forEach(gid => {
    let channels = Object.keys(data.notify[gid])

    channels.forEach(cid => {
      client.channels.fetch(cid).then(channel => channel.send(`ALERT! # of cases in ${name} have increased from ${lastCount} to ${newCount}. Type !dcases for detailed case information`))
    })
  })
}

async function loadSourceData () {
  latestCachedData = await sources.loadAll()

  latestCachedData.forEach(location => {
    let name = location.name
    let total = location.total

    if(data.lastCounts.hasOwnProperty(name)){
      console.log("Location exists in memory, checking count status...")
      let lastCountForName = data.lastCounts[name]

      if(total === lastCountForName){
        // Count has not changed, do not do anything for now
        console.log(`${name} | no change ${total}`)
      }else{
        // Count has changed, save new data and trigger notification events
        console.log(`${name} | count updated ${lastCountForName} -> ${total}`)
        data.lastCounts[name] = total
        notifySubscribers(name, lastCountForName, total)
        saveData()
      }

    }else{
      // location not yet in lastcount memory, init and save
      console.log("Location does not exist in memory, adding location and count values")
      data.lastCounts[name] = total
      saveData()
    }
  })
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
  // Initial load
  loadSourceData()
})

client.on('message', msg => {
  // cases command, show only total
  if (msg.content === config.prefix + 'cases') {
    latestCachedData.forEach(location => {
      msg.reply('There are ' + location.total + ' cases in ' + location.name + ' as of ' + location.lastUpdated)
    })
  }

  // detailedcases (dcases) command, shows counties also
  if (msg.content === config.prefix + 'dcases') {
    latestCachedData.forEach(location => {
      let locationText = ""
      location.locations.forEach(county => {
        let countyName = county.county
        let countyCases = county.cases

        locationText += `${countyName} | ${countyCases}\n`
      })

      let finalMessage = `\`\`\`${locationText}\nTotal: ${location.total}\nLast Update: ${location.lastUpdated}\`\`\``;

      msg.reply(finalMessage)
    })


  }

  // notify command
  // notify channel when a new case is found, toggleable
  if (msg.content === config.prefix + 'notify') {

    let channelID = msg.channel.id
    let guildID = msg.channel.guild.id

    if (data.notify.hasOwnProperty(guildID)) {
      // guild exists, check if channel exists in guild
      if (data.notify[guildID].hasOwnProperty(channelID)) {
        // Channel exists, remove channel
        delete data.notify[guildID][channelID]
        msg.reply('New case notifications disabled for current channel')
      } else {
        // Channel does not exist, add channel
        data.notify[guildID][channelID] = true
        msg.reply('New case notifications enabled for current channel')
      }
    } else {
      // guild does not exist yet, go ahead and add it as well as the channel
      data.notify[guildID] = {}
      data.notify[guildID][channelID] = true
      msg.reply('New case notifications enabled for current channel')
    }

    saveData()
    // latestCachedData.forEach(location => {
    //   msg.reply('There are '+location.total+' cases in '+location.name+' as of '+location.lastUpdated);
    // })
  }

})

client.login(config.bot_token)

// 1 minute event loop for covidsource refresh
setTimeout(function doSomething () {
  console.log('Refreshing COVID source data')
  loadSourceData()
  setTimeout(doSomething, sourceRefreshSeconds * 1000)
}, sourceRefreshSeconds * 1000)

module.exports = { latestCachedData }





