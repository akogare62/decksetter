'use strict';

module.exports = function CardSetter(mod) {
    const { command, game } = mod; 
    const fs = require('fs'); 
    function filepath(arg) { return `${__dirname}\\${arg}.json`;} 
    function filepath2() { return `${__dirname}\\saves\\${game.me.name}-${game.me.serverId}.json`;}
      
    let gameCardData, raceData, effectData, zoneData; 
    let effect1, effect2, preset1;  
    let playerSaveData = [];
    const reg = new RegExp('^[0-9]+$');

    game.on('enter_game', () => {  
        playerSaveData = [];
        readFile("race");
        readFile("effect");
        readFile2();        
    });      

    game.me.on('change_zone', (zone, quick) => {
        if (playerSaveData){
            zoneData = playerSaveData.find(p => p.zone === zone);
        }
        if (zoneData) {
            mod.send('C_CHANGE_CARD_PRESET', 1 , {preset: zoneData.preset});
            unsetEffect();
            mod.send('C_CHANGE_CARD_EFFECT_CHECK', 1 , {id: zoneData.effect1});
            mod.send('C_CHANGE_CARD_EFFECT_CHECK', 1 , {id: zoneData.effect2});
        }
    });

    command.add('decksetter', (arg0, arg1, arg2) => { 
        if (arg0 && arg0.length > 0){
            arg0 = arg0.toLowerCase()
            if (reg.test(arg0)){
                mod.send('C_CHANGE_CARD_PRESET', 1 , {preset: arg0-1});
                preset1 = arg0-1;
            }
            else{                
                checkPresetByRace(arg0, raceData);
            }                
        }
        if (arg1 && arg1.length > 0){    
            arg1 = arg1.toLowerCase()
            if (reg.test(arg1)){
                unsetEffect();
                mod.send('C_CHANGE_CARD_EFFECT_CHECK', 1 , {id: arg1});
                effect1 = arg1;
            }
            else{                
                loopArg(arg1, true);
            }
            
        }
        if (arg2 && arg2.length > 0){
            arg2 = arg2.toLowerCase()
            if (reg.test(arg2)){
                mod.send('C_CHANGE_CARD_EFFECT_CHECK', 1 , {id: arg2});
                effect2 = arg2;
            }
            else{                
                loopArg(arg2, false);
            }           
        }
        if (arg0 && arg1 && arg2) { 
            updatePlayerSaveDataWithCurrentZone()
        }
        if (!arg0 && !arg1 && !arg2) {            
            effectData.forEach(effect => {
                command.message(effect.name);
                command.message(effect.id + "  " + effect.acronyme);
            });    
            command.message("use !decksetter preset1 (id or racetype) effect1(acronyme or id) effect_2(acronyme or id)");     
        }
	});    

    mod.hook('S_CARD_DATA', 1, (event) => {
        gameCardData = event.presets;
    });

    function loopArg(arg, boobool){
        if (boobool == true)
            unsetEffect()
        effectData.forEach(effect => {
            if (arg == effect.acronyme)
                setEffect(arg, boobool);                           
        })
    }

    function checkPresetByRace(race, raceData){       
        var count = 0
        var presetRaceSelected = null
        gameCardData.forEach(presets => {            
            for (const key in presets) {  
                 presets.presetCards.forEach(presetCard => {
                    if (raceData[race].includes(presetCard.cardId)){
                        presetRaceSelected = count;
                        mod.send('C_CHANGE_CARD_PRESET', 1 , {preset: count});
                        preset1 = count;
                    }
                })
            }
            count++;
        });
        if (presetRaceSelected == null)
            command.message("Aucun page ne contient de bonus contre cette race");
            
    };
    
    function unsetEffect() {
        effectData.forEach(effect => {
            mod.send('C_CHANGE_CARD_EFFECT_UNCHECK', 1 , {id: effect.id });
        });      
    }

    function setEffect(arg, boobool) {
        effectData.forEach(effect => {
            if (arg == effect.acronyme){
                mod.send('C_CHANGE_CARD_EFFECT_CHECK', 1 , {id: effect.id});
                if (boobool)
                    effect1 = effect.id;
                if (!boobool)
                    effect2 = effect.id;
            }
        });     
    }

    function updatePlayerSaveDataWithCurrentZone() {
        zoneData = playerSaveData.find(z => z.zone == game.me.zone);
        if (!zoneData) {              
            playerSaveData.push({
                zone: game.me.zone,
                preset: preset1,
                effect1: effect1,
                effect2: effect2
            });
        }
        writeFile();
    }

    function readFile(arg) {
        fs.readFile(filepath(arg), (err, data) => {
            if (err) throw err;
            switch(arg){
                case "race" : raceData = JSON.parse(data);
                    break;
                case "effect" : effectData = JSON.parse(data);
            }
        });            
    }

    function readFile2(){
        if (!fs.existsSync(filepath())) return;
        fs.readFile(filepath2(), (err, data) => {
            if (err) 
                mod.log(err);
            playerSaveData = JSON.parse(data);
        });
    }

    function writeFile() {
        playerSaveData.sort((a,b)=>{return (a.zone - b.zone)});
            
        fs.writeFile(filepath2(), JSON.stringify(playerSaveData, null, 2), (err) => {
            if (err) mod.log(err);
        });
    }
};