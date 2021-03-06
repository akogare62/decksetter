/** @format */

"use strict"

module.exports = function CardSetter(mod) {
  const NotCP = typeof mod.compileProto !== "undefined"
  const defs = { cChangeCardEffectCheck: 1, cChangeCardEffectUncheck: 1, cChangeCardPreset: 1, sChangeCardPreset: 1, sChangeCardEffectCheck: 1, sChangeCardEffectUncheck: 1 }
  const { command, game, settings } = mod
  const fs = require("fs"),
    path = require("path"),
    dungeon = JSON.parse(fs.readFileSync(path.join(__dirname, "./data/dungeons.json"), "utf8"))
  function filepath(arg) {
    return `${__dirname}\\data\\${arg}.json`
  }
  function saveFilePath() {
    return `${__dirname}\\saves\\${game.me.name}-${game.me.serverId}.json`
  }

  if (NotCP) {
    defs.cChangeCardEffectCheck = mod.compileProto("uint32 id")
    defs.cChangeCardEffectUncheck = mod.compileProto("uint32 id")
    defs.cChangeCardPreset = mod.compileProto("uint32 preset")
    defs.sChangeCardPreset = mod.compileProto("uint32 preset")
    defs.sChangeCardEffectCheck = mod.compileProto("uint32 id")
    defs.sChangeCardEffectUncheck = mod.compileProto("uint32 id")
  }

  let gameCardData, raceData, effectData, zoneData, effect1, effect2, preset1, intParsed, zoneNameTmp, presetNameTmp, effectOneNameTmp, effectTwoNameTmp
  let playerSaveData = []
  let aZone = 0
  const reg = new RegExp("^[0-9]+$")

  game.on("enter_game", () => {
    playerSaveData = []
    readFile("race")
    readFile("effect")
    readSavedFile()
  })

  game.me.on("change_zone", (zone, quick) => {
    if (playerSaveData) {
      zoneData = playerSaveData.find((p) => p.zone === zone)
    }
    if (zoneData) {
      translateZoneDataToMessage(zoneData)
      mod.send("C_CHANGE_CARD_PRESET", 1, { preset: zoneData.preset })
      unsetEffect()
      mod.send("C_CHANGE_CARD_EFFECT_CHECK", 1, { id: zoneData.effect1 })
      mod.send("C_CHANGE_CARD_EFFECT_CHECK", 1, { id: zoneData.effect2 })
    }
  })

  command.add(["decksetter", "ds"], (arg0, arg1, arg2) => {
    if (!arg0) {
      settings.enabled = !settings.enabled
      command.message(settings.enabled ? "enabled" : "disabled")
    }
    if (!settings.enabled && arg0) {
      command.message("use !decksetter or !ds to enable the mod")
    }
    mod.hook("S_CARD_DATA", 1, (event) => {
      gameCardData = event.presets
    })
    mod.hook("S_LOAD_TOPO", 3, (e) => {
      aZone = e.zone
    })

    if (arg0 && settings.enabled) {
      switch (arg0) {
        case "remove":
          removePlayerSaveDataWithCurrentZone()
          break
        case "list":
          effectData.forEach((effect) => {
            command.message(effect.name)
            command.message(`id: ${effect.id} - acronyme: ${effect.acronyme}`)
          })
          break
        case "help":
          command.message("use !decksetter or !ds list to list card effect id and acronyme")
          command.message("use !decksetter or !ds remove to delete zone save setings")
          command.message("use !decksetter or !ds preset1 (id or racetype) effect1(acronyme or id) effect_2(acronyme or id)")
          break
        case "loc":
          try {
            zoneNameTmp = dungeon[aZone]["en"]
          } catch {
            zoneNameTmp = "notdefined"
          }
          command.message(`Current Loc: ${aZone} /s ${zoneNameTmp}`)
          break
        default:
          arg0 = arg0.toLowerCase()
          if (reg.test(arg0)) {
            mod.send("C_CHANGE_CARD_PRESET", 1, { preset: arg0 - 1 })
            preset1 = arg0 - 1
          } else {
            checkPresetByRace(arg0, raceData)
          }
      }
    }

    if (settings.enabled && arg0 && arg1 && arg2) {
      effectSetter(arg1, true)
      effectSetter(arg2, false)
      updatePlayerSaveDataWithCurrentZone()
    }
  })

  mod.hook("S_CARD_DATA", 1, (event) => {
    gameCardData = event.presets
  })

  mod.hook("S_LOAD_TOPO", 3, (e) => {
    aZone = e.zone
  })

  function checkPresetByRace(race, raceData) {
    var count = 0
    var presetRaceSelected = null
    gameCardData.forEach((presets) => {
      for (const key in presets) {
        presets.presetCards.forEach((presetCard) => {
          if (raceData[race].includes(presetCard.cardId)) {
            presetRaceSelected = count
            mod.send("C_CHANGE_CARD_PRESET", 1, { preset: count })
            preset1 = count
          }
        })
      }
      count++
    })
    if (presetRaceSelected == null) command.message("Aucun page ne contient de bonus contre cette race")
  }

  function effectSetter(arg, boobool) {
    arg = arg.toLowerCase()
    intParsed = parseInt(arg)
    if (boobool == true) {
      unsetEffect()
    }
    if (reg.test(arg)) {
      mod.send("C_CHANGE_CARD_EFFECT_CHECK", 1, { id: arg })
      if (boobool == true) {
        effect1 = intParsed
      } else effect2 = intParsed
    } else {
      loopArg(arg, boobool)
    }
  }

  function loopArg(arg, boobool) {
    effectData.forEach((effect) => {
      if (arg == effect.acronyme) setEffect(arg, boobool)
    })
  }

  function unsetEffect() {
    effectData.forEach((effect) => {
      mod.send("C_CHANGE_CARD_EFFECT_UNCHECK", 1, { id: effect.id })
    })
  }

  function setEffect(arg, boobool) {
    effectData.forEach((effect) => {
      if (arg == effect.acronyme) {
        mod.send("C_CHANGE_CARD_EFFECT_CHECK", 1, { id: effect.id })
        if (boobool) effect1 = effect.id
        if (!boobool) effect2 = effect.id
      }
    })
  }

  function updatePlayerSaveDataWithCurrentZone() {
    zoneData = playerSaveData.find((z) => z.zone == game.me.zone)
    if (!zoneData) {
      try {
        zoneNameTmp = dungeon[aZone]["en"]
      } catch {
        zoneNameTmp = "notdefined"
      }
      playerSaveData.push({
        zone: game.me.zone,
        name: zoneNameTmp,
        preset: preset1,
        effect1: effect1,
        effect2: effect2,
      })
    } else {
      command.message("zone already saved plz use !decksetter remove then")
      command.message("use !decksetter preset1 (id or racetype) effect1(acronyme or id) effect_2(acronyme or id)")
    }
    writeFile()
  }

  function removePlayerSaveDataWithCurrentZone() {
    zoneData = playerSaveData.find((z) => z.zone == game.me.zone)
    if (zoneData) {
      let counter = 0
      playerSaveData.forEach((save) => {
        if (zoneData.zone == save.zone) {
          playerSaveData.splice(counter, 1)
        }
        counter++
      })
      writeFile()
    }
  }

  function readFile(arg) {
    fs.readFile(filepath(arg), (err, data) => {
      if (err) throw err
      switch (arg) {
        case "race":
          raceData = JSON.parse(data)
          break
        case "effect":
          effectData = JSON.parse(data)
      }
    })
  }

  function readSavedFile() {
    if (!fs.existsSync(saveFilePath())) return
    fs.readFile(saveFilePath(), (err, data) => {
      if (err) mod.log(err)
      playerSaveData = JSON.parse(data)
    })
  }

  function writeFile() {
    playerSaveData.sort((a, b) => {
      return a.zone - b.zone
    })

    if (!fs.existsSync(`${__dirname}\\saves`)) {
      fs.mkdir(`${__dirname}\\saves`, function(err) {
        if (err) {
          console.log(err)
        } 
        else {
          console.log("New directory successfully created.")
        }
      })
    }
    
    fs.writeFile(saveFilePath(), JSON.stringify(playerSaveData, null, 2), (err) => {
      if (err) mod.log(err)
    })
  }

  function translateZoneDataToMessage(zoneData) {
    presetNameTmp = zoneData.preset + 1
    effectOneNameTmp = effectData.find((p) => p.id == zoneData.effect1)
    effectTwoNameTmp = effectData.find((p) => p.id == zoneData.effect2)
    command.message(`Entering in ${zoneData.name} / ${zoneData.zone} your preset page number is ${presetNameTmp} `)
    command.message(`with collection Effect ${effectOneNameTmp.name} and ${effectTwoNameTmp.name}`)
  }

  this.destructor = () => {
    command.remove(["decksetter", "ds"])
  }
}
