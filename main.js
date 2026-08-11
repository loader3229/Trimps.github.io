//I wrote all of this code by hand with no libraries so I could learn stuff (except LZString for save import/export, string compression is out of my league. Credits in that file). This is my first javascript project, so be nice.
//Feel free to read through the code and use stuff if you want, I don't know how to properly comment code so I just wrote stuff where I felt like it
//I will be continually cleaning up and making this code more readable as my javascript skills improve
//Contact me via reddit, /u/brownprobe, or trimpsgame@gmail.com
"use strict";

// Override Decimal toJSON for proper serialization
Decimal.prototype.toJSON = function () { return { __decimal__: true, v: this.toString() }; };
function decimalReviver(key, value) {
    if (value && typeof value === 'object' && value.__decimal__ === true) {
        return new Decimal(value.v);
    }
    return value;
}
function ensureDecimal(obj, key) {
    if (obj[key] !== null && obj[key] !== undefined && !(obj[key] instanceof Decimal)) {
        obj[key] = new Decimal(obj[key]);
    }
}
function ensureDecimals() {
    // Convert plain numbers/strings to Decimal for backward compat with old saves
    var gFields = ['timeLeftOnCraft','timeLeftOnTrap','soldierHealth','soldierHealthMax','soldierHealthRemaining','soldierCurrentAttack','soldierCurrentBlock','health','attack','block','autoCraftModifier','playerModifier'];
    for (var i=0;i<gFields.length;i++) ensureDecimal(game.global, gFields[i]);
    for (var r in game.resources) { ensureDecimal(game.resources[r],'owned'); ensureDecimal(game.resources[r],'max'); }
    ['working','employed','soldiers','maxSoldiers','potency'].forEach(function(k){ensureDecimal(game.resources.trimps,k);});
    for (var e in game.equipment) { ensureDecimal(game.equipment[e],'modifier'); ensureDecimal(game.equipment[e],'level'); if('health'in game.equipment[e])ensureDecimal(game.equipment[e],'health'); if('attack'in game.equipment[e])ensureDecimal(game.equipment[e],'attack'); }
    for (var b in game.buildings) { ensureDecimal(game.buildings[b],'owned'); ensureDecimal(game.buildings[b],'purchased'); if(game.buildings[b].increase) ensureDecimal(game.buildings[b].increase,'by'); }
    for (var j in game.jobs) { ensureDecimal(game.jobs[j],'owned'); ensureDecimal(game.jobs[j],'modifier'); }
    for (var c in game.global.gridArray) { ensureDecimal(game.global.gridArray[c],'maxHealth'); ensureDecimal(game.global.gridArray[c],'health'); ensureDecimal(game.global.gridArray[c],'attack'); }
    for (var c2 in game.global.mapGridArray) { ensureDecimal(game.global.mapGridArray[c2],'maxHealth'); ensureDecimal(game.global.mapGridArray[c2],'health'); ensureDecimal(game.global.mapGridArray[c2],'attack'); }
    for (var m in game.global.mapsOwnedArray) { ensureDecimal(game.global.mapsOwnedArray[m],'difficulty'); ensureDecimal(game.global.mapsOwnedArray[m],'loot'); }
}

function toggleSave(updateOnly) {
    var elem = document.getElementById("toggleBtn");
    if (updateOnly) game.global.autoSave = (game.global.autoSave) ? false : true;
    if (game.global.autoSave) {
        game.global.autoSave = false;
        elem.innerHTML = "Not Saving";
        elem.className = "";
        elem.className = "btn btn-danger";
    } else {
        game.global.autoSave = true;
        elem.innerHTML = "Auto-Saving";
        elem.className = "";
        elem.className = "btn btn-info";
    }
}

function autoSave() {
    if (game.global.autoSave) save();
    setTimeout(autoSave, 60000);
}

function save(exportThis) {
    var saveString = JSON.stringify(game);
    var saveGame = JSON.parse(saveString, decimalReviver);
    saveGame.worldUnlocks = null;
    saveGame.badGuys = null;
    saveGame.mapConfig = null;
    for (var item in saveGame.equipment) {
        saveGame.equipment[item].tooltip = null;
        saveGame.equipment[item].cost = null;
    }
    for (var itemA in saveGame.buildings) {
        saveGame.buildings[itemA].tooltip = null;
        saveGame.buildings[itemA].cost = null;
    }
    for (var itemB in saveGame.upgrades) {
        saveGame.upgrades[itemB].tooltip = null;
        saveGame.upgrades[itemB].cost = null;
    }
    for (var itemC in saveGame.jobs) {
        saveGame.jobs[itemC].tooltip = null;
        saveGame.jobs[itemC].cost = null;
    }
    for (var itemD in saveGame.triggers) {
        saveGame.triggers[itemD].message = null;
        saveGame.triggers[itemD].cost = null;
    }
    saveString = LZString.compressToBase64(JSON.stringify(saveGame));
    if (exportThis) return saveString;
	try{
		localStorage.setItem("trimpsBESave1",saveString);
		if (localStorage.getItem("trimpsBESave1") == saveString){
			message("Game Saved!", "Notices");
		}
		else {
			message("For some reason, your game is not saving. Make sure you export and back up your save!", "Notices");
		}
	}
	catch(err){ message("For some reason, your game is not saving. Make sure you export and back up your save!", "Notices"); }

}

function load(saveString, autoLoad) {
    var savegame;
    if (saveString) {
        savegame = JSON.parse(LZString.decompressFromBase64(document.getElementById("importBox").value), decimalReviver);
        tooltip('hide');
    } else if (localStorage.getItem("trimpsBESave1") !== null) {
        savegame = JSON.parse(LZString.decompressFromBase64(localStorage.getItem("trimpsBESave1")), decimalReviver);
    }
    if (typeof savegame === 'undefined' || savegame === null || typeof savegame.global === 'undefined') return;
    resetGame();
    if (game.global.killSavesBelow > savegame.global.version) {
        message("I'm so terribly sorry, but your previous save game (version " + savegame.global.version + ") does not work in the new version. This game is still in early alpha, and a lot is still changing! Thank you for helping test!", "Notices");
        message("Since you already had a save, and since the game is still alpha, I unlocked a little cheat button for you. It will make you twice as efficient, allowing you to get through the beginning a little faster.", "Notices");
        document.getElementById("cheatTd").style.display = "block";
        return;
    } else savegame.global.version = game.global.version;
    if (typeof savegame.global !== 'undefined') {
        for (var item in game.global) {
            if (item == "time" || item == "start" || item == "lastFightUpdate" || item == "prestigeCostMod" || item == "prestigeValueMod") continue;
            if (typeof savegame.global[item] !== 'undefined') game.global[item] = savegame.global[item];
            if (item == "buildingsQueue") {
                for (var itemA in game.global.buildingsQueue) {
                    addQueueItem(game.global.buildingsQueue[itemA]);
                }
            }
        }
    }

    if (typeof savegame.global.messages.Notices === 'undefined') savegame.global.messages.Notices = true; //compatibility from 0.3 to 0.4, this line can be removed next time saves are wiped

    if (typeof savegame.resources !== 'undefined') {
        for (var itemB in game.resources) {
            if (typeof savegame.resources[itemB] !== 'undefined') game.resources[itemB] = savegame.resources[itemB];
        }
    }
    for (var a in game) { //global, resources, jobs, buildings, upgrades, triggers, equipment, settings
        if (a == "global") continue;
        if (a == "badGuys") continue;
        if (a == "worldUnlocks") continue;
        if (a == "mapConfig") continue;
        var topSave = savegame[a];
        if (typeof topSave === 'undefined' || topSave === null) continue;
        var topGame = game[a];
        for (var b in topGame) { //each item in main category (resource names, job names, etc)
            var midSave = topSave[b];
            if (typeof midSave === 'undefined' || midSave === null) continue;
            var midGame = topGame[b];
            if (typeof midSave !== 'object') midGame = midSave;
            else
                for (var c in midGame) { //purchased, cost, etc
                    if (a == "equipment" && c == "cost") {
                        if (typeof midGame[c].metal !== 'undefined') midGame[c].metal[0] *= (topSave[b].prestige > 1) ? ((topSave[b].prestige - 1) * game.global.prestigeCostMod.toNumber()) : 1;
                        if (typeof midGame[c].wood !== 'undefined') midGame[c].wood[0] *= (topSave[b].prestige > 1) ? ((topSave[b].prestige - 1) * game.global.prestigeCostMod.toNumber()) : 1;
                        continue;
                    }
                    if (c == "cost") continue;
                    if (c == "tooltip") continue;
                    var botSave = midSave[c];
                    if (typeof botSave === 'undefined' || botSave === null) continue;
                    midGame[c] = botSave;
                }
        }
    }
    ensureDecimals();

    if (game.buildings.Gym.locked === 0) document.getElementById("blockDiv").style.visibility = "visible";
    if (game.global.gridArray.length > 0) {
        document.getElementById("battleContainer").style.visibility = "visible";
		fadeIn("EquipmentFilter", 10);
		fadeIn("equipmentTitleDiv", 10);
        drawGrid();
        document.getElementById('metal').style.visibility = "visible";
        for (var x = 0; x <= game.global.lastClearedCell; x++) {
            document.getElementById("cell" + x).style.backgroundColor = "green";
        }
        if (game.global.battleClock > 0) document.getElementById("battleTimer").style.visibility = "visible";
    }
    if (game.global.mapGridArray.length > 0) {
        drawGrid(true);
        for (var y = 0; y <= game.global.lastClearedMapCell; y++) {
            document.getElementById("mapCell" + y).style.backgroundColor = "green";
        }
    } else if (game.global.mapGridArray.length === 0 && game.global.mapsActive) game.global.mapsActive = false;
    if (game.resources.trimps.owned.gt(0) || game.buildings.Trap.owned.gt(0)) game.buildings.Trap.first();
    if (game.global.autoBattle) {
        document.getElementById("pauseFight").style.visibility = "visible";
        pauseFight(true);
    }
    for (var itemC in game.global.mapsOwnedArray) {
        unlockMap(itemC);
    }
	for (var messageBool in game.global.messages){
		if (!game.global.messages[messageBool]){
			filterMessage(messageBool, true);
		}
	}
	for (var tabBool in game.global.buyTabs){
		if (!game.global.buyTabs[tabBool]){
			filterTabs(tabBool, true);
		}
	}
	document.getElementById("worldNumber").innerHTML = game.global.world;
    mapsSwitch(true);
    checkTriggers(true);
    setGather(game.global.playerGathering);
    numTab(1);
    if (game.global.autoCraftModifier.gt(0))
        document.getElementById("foremenCount").innerHTML = (game.global.autoCraftModifier.mul(2)).toNumber() + " Foremen";
    if (game.global.fighting) startFight();
    toggleSave(true);
}

function getCurrentMapObject() {
    return game.global.mapsOwnedArray[getMapIndex(game.global.currentMapId)];
}

function scaleLootLevel(level, mapLevel) {
    var world = game.global.world;
    if (mapLevel > 0) world = mapLevel;
    level += ((world - 1) * 100);
    return level;
}

function rewardResource(what, baseAmt, level, checkMapLootScale) {
    var map;
    if (checkMapLootScale) {
        map = getCurrentMapObject();
        level = scaleLootLevel(level, map.level);
    } else {
        level = scaleLootLevel(level);
    }
    if (what == "gems") level -= 600;
    level += 1122;
    var amt = Decimal.mul(baseAmt, Decimal.pow(1.0046, level)).round();
    //var amt = Math.round(baseAmt * (Math.pow(1.02, level)));
    //var otherAmt = Math.round(baseAmt * level);
    //if (otherAmt > amt) amt = otherAmt;
    if (checkMapLootScale) amt = amt.mul(map.loot).round();
    addResCheckMax(what, amt);
    return amt;
}

function addResCheckMax(what, number) {
    var res = game.resources[what];
    if (res.max.eq(-1) || res.owned.plus(number).lte(res.max)) res.owned = res.owned.plus(number);
    else res.owned = res.max;
}

function fireMode(noChange) {
    if (!noChange) game.global.firing = !game.global.firing;
    var elem = document.getElementById("fireBtn");
    if (game.global.firing) {
        elem.style.background = "rgba(255,0,0,0.5)";
        elem.innerHTML = "Firing";
    } else {
        elem.style.background = "rgba(255,255,255,0.25)";
        elem.innerHTML = "Fire";
    }
    tooltip("Fire Trimps", null, "update");

}

function setGather(what) {
    var toGather = game.resources[what];
    var colorOn = "rgba(255,255,255,0.25)";
    var colorOff = "rgba(0,0,0,1)";
    if (typeof toGather === 'undefined' && what != "buildings") return;
    if (game.global.playerGathering !== "") {
        document.getElementById(game.global.playerGathering + "CollectBtn").innerHTML = setGatherTextAs(game.global.playerGathering, false);
        document.getElementById(game.global.playerGathering + "CollectBtn").style.background = colorOff;
    }
    game.global.playerGathering = what;
    document.getElementById(what + "CollectBtn").innerHTML = setGatherTextAs(what, true);
    document.getElementById(what + "CollectBtn").style.background = colorOn;
}

function setGatherTextAs(what, on) {
    var trimpTrapText = '(<span id="trimpTrapText">1</span>)';
    switch (what) {
    case "food":
        return (on) ? "Gathering" : "Gather";
    case "wood":
        return (on) ? "Chopping" : "Chop";
    case "metal":
        return (on) ? "Mining" : "Mine";
    case "science":
        return (on) ? "Researching" : "Research";
    case "buildings":
        return (on) ? "Building" : "Build";
    case "trimps":
        return (on) ? ("Trapping " + trimpTrapText) : ("Trap " + trimpTrapText);
    }
}

function gather() {
    var what = game.global.playerGathering;
    var whatPs = new Decimal(0);
    var amount;
    for (var job in game.jobs) {
        if (game.jobs[job].owned.lt(1)) continue;
        var perSec = game.jobs[job].owned.mul(game.jobs[job].modifier);
        var increase = game.jobs[job].increase;
        if (increase == "custom") continue;
        amount = perSec.div(game.settings.speed);
        if (!game.resources[increase].max.eq(-1) && game.resources[increase].owned.plus(amount).gt(game.resources[increase].max)) game.resources[increase].owned = game.resources[increase].max;
        else game.resources[increase].owned = game.resources[increase].owned.plus(amount);
        if (what == increase) {
            whatPs = perSec;
            perSec = perSec.plus(game.global.playerModifier);
        }
    }
    if (what === "" || what == "buildings") return;
    if (what == "trimps") {
        trapThings();
        return;
    }
    var toGather = game.resources[what];
    if (typeof toGather === 'undefined') return;
    amount = game.global.playerModifier.div(game.settings.speed);
    if (!toGather.max.eq(-1) && toGather.owned.plus(amount).gt(toGather.max)) toGather.owned = toGather.max;
    else toGather.owned = toGather.owned.plus(amount);
}

function checkTriggers(force) {
    for (var item in game.triggers) {
        var trigger = game.triggers[item];
        if (force) {
            if ((trigger.done == 1) && (typeof trigger.once === 'undefined')) trigger.fire();
            else if (typeof trigger.once == 'function' && trigger.done == 1) {
                trigger.once();
            }
            continue;
        }
        if (trigger.done === 0 && canAffordTwoLevel(game.triggers[item])) {
            trigger.fire();
            trigger.done = 1;
            if (typeof trigger.message !== 'undefined') message(trigger.message, "Story");
        }
    }
}

function canAffordTwoLevel(whatObj, takeEm) {
    for (var costGroup in whatObj.cost) {
        if (costGroup == "special") {
            var toReturn = whatObj.cost.special();
            return toReturn;
        }
        var group = game[costGroup];
        var whatObjCost = whatObj.cost[costGroup];
        for (var res in whatObjCost) {
			if (typeof group === 'undefined') console.log(costGroup);
            var realItem = group[res];
            var cost = whatObjCost[res];
            if (typeof cost === 'function') cost = cost();
            if (typeof cost[1] !== 'undefined') cost = resolvePow(cost, whatObj);
            if (group[res].owned.lt(cost)) return false;
            if (takeEm) group[res].owned = group[res].owned.minus(cost);
        }
    }
    return true;
}

function resolvePow(cost, whatObj, addOwned) {
	if (!addOwned) addOwned = 0;
    var compare;
    if (typeof whatObj.done !== 'undefined') compare = 'done';
    if (typeof whatObj.level !== 'undefined') compare = 'level';
    if (typeof whatObj.owned !== 'undefined') compare = 'owned';
	if (typeof whatObj.purchased !== 'undefined') compare = 'purchased';
    var baseValue = (whatObj[compare] instanceof Decimal) ? whatObj[compare] : new Decimal(whatObj[compare]);
    return Decimal.mul(cost[0], Decimal.pow(cost[1], baseValue.plus(addOwned))).floor();
}

function canAffordBuilding(what, take, buildCostString){
	var costString = "";
	var toBuy = game.buildings[what];
	if (typeof toBuy === 'undefined') console.log(what);
	for (var costItem in toBuy.cost) {
		var color = "green";
		var price = new Decimal(0);
		price = getBuildingItemPrice(toBuy, costItem)
		if (price.gt(game.resources[costItem].owned)) {
			if (buildCostString) color = "red";
			else return false;
		}
		if (buildCostString) costString += '<span class="' + color + '">' + costItem + ':&nbsp;' + prettify(price) + '</span>, ';
		if (take) game.resources[costItem].owned = game.resources[costItem].owned.minus(price);
	}
	if (buildCostString) return costString;
	return true;
}

function getBuildingItemPrice(toBuy, costItem){
	var price = new Decimal(0);
	var thisCost = toBuy.cost[costItem];
		if (typeof thisCost[1] !== 'undefined'){
			if (thisCost.lastCheckCount != game.global.buyAmt || thisCost.lastCheckOwned != toBuy.purchased){
				for (var x = 0; x < game.global.buyAmt; x++){
						price = price.plus(resolvePow(thisCost, toBuy, x));
				}
				thisCost.lastCheckCount = game.global.buyAmt;
				thisCost.lastCheckAmount = price;
				thisCost.lastCheckOwned = toBuy.purchased;
			}
			else price = thisCost.lastCheckAmount;
		}
		else if (typeof thisCost === 'function') {
			price = thisCost();
		}
		else {
			price = Decimal.mul(thisCost, game.global.buyAmt);
		}
	return price;
}

function buyBuilding(what) {
    var toBuy = game.buildings[what];
    if (typeof toBuy === 'undefined') return;
    var canAfford = canAffordBuilding(what);
	if (canAfford){
		canAffordBuilding(what, true);
		for (var x = 0; x < game.global.buyAmt; x++){
			game.buildings[what].purchased = game.buildings[what].purchased.plus(1);
			startQueue(what);
			if (game.buildings[what].percent) break;
		}
		tooltip(what, "buildings", "update");	
	}
}

function cancelQueueItem(what) {
    var queue = game.global.buildingsQueue;
    var index = queue.indexOf(what);
    removeQueueItem(what);
    what = what.split('.')[0];
    game.buildings[what].purchased = game.buildings[what].purchased.minus(1);
    refundQueueItem(what);
    queue.splice(index, 1);
    if (index === 0) {
        game.global.crafting = "";
        game.global.timeLeftOnCraft = new Decimal(0);
        document.getElementById("buildingsBar").style.width = "0%";
    }
}

function refundQueueItem(what) {
    var struct = game.buildings[what];
    for (var costItem in struct.cost) {
        var refundAmt = (typeof struct.cost[costItem] === 'function') ? struct.cost[costItem]() : struct.cost[costItem];
        game.resources[costItem].owned = game.resources[costItem].owned.plus(refundAmt);
    }
}

function startQueue(what) {
    var alreadyIn = false;
    var count = 0;
    for (var queueItem in game.global.buildingsQueue) {
        if (game.global.buildingsQueue[queueItem].split('.')[0] == what) {
            count++;
            alreadyIn = true;
            break;
        }
    }
    if (!alreadyIn) count = 0;
    game.global.buildingsQueue.push(what + "." + (count));
    addQueueItem(what + "." + count);
}

function craftBuildings(makeUp) {
    var buildingsBar = document.getElementById("buildingsBar");
    var speedElem = document.getElementById("buildSpeed");
    if (game.global.crafting === "" && game.global.buildingsQueue.length > 0) {
        setNewCraftItem();
    }
    if ((game.global.autoCraftModifier.lte(0) && game.global.playerGathering != "buildings") || game.global.crafting === "") {
        speedElem.innerHTML = "";
        return;
    }
    var modifier = (game.global.autoCraftModifier.gt(0)) ? game.global.autoCraftModifier : new Decimal(0);
    if (game.global.playerGathering == "buildings") modifier = modifier.plus(game.global.playerModifier);
    if (!makeUp) {
        speedElem.innerHTML = modifier.mul(100).floor().toNumber() + "%";
        game.global.timeLeftOnCraft = game.global.timeLeftOnCraft.minus(Decimal.div(1, game.settings.speed).mul(modifier));
        buildingsBar.style.width = (100 - game.global.timeLeftOnCraft.div(game.buildings[game.global.crafting].craftTime).mul(100).toNumber()) + "%";
        buildingsBar.innerHTML = game.global.timeLeftOnCraft.div(modifier).toFixed(1) + " Seconds";
        if (game.global.timeLeftOnCraft.gt(0)) return;
        buildingsBar.innerHTML = "";
        buildingsBar.style.width = "0%";
    }
    buildBuilding(game.global.crafting);
    removeQueueItem(game.global.buildingsQueue[0]);
    game.global.buildingsQueue.splice(0, 1);
    if (game.global.buildingsQueue.length <= 0) {
        game.global.crafting = "";
        document.getElementById("noQueue").style.display = "block";
        return;
    }
    var nextCraft = game.global.buildingsQueue[0].split('.')[0];
    game.global.crafting = nextCraft;
    game.global.timeLeftOnCraft = new Decimal(game.buildings[nextCraft].craftTime);
}

function buildBuilding(what) {
    var building = game.buildings[what];
    var toIncrease;
    building.owned = building.owned.plus(1);
    if (building.owned.eq(1) && typeof building.first !== 'undefined') building.first();
    if (document.getElementById(what + "Owned") === null) return;
    document.getElementById(what + "Owned").innerHTML = building.owned.toNumber();
    if (typeof building.increase === 'undefined') return;
    var buildingSplit = building.increase.what.split('.');
    if (buildingSplit[0] == "global") toIncrease = game.global;
    else
        toIncrease = game.resources[buildingSplit[0]];
    if (buildingSplit[2] == "mult") toIncrease[buildingSplit[1]] = toIncrease[buildingSplit[1]].mul(building.increase.by).floor();
    else
        toIncrease[buildingSplit[1]] = toIncrease[buildingSplit[1]].plus(building.increase.by);
    numTab();
}

function setNewCraftItem() {
    var queueItem = game.global.buildingsQueue[0].split('.')[0];
    game.global.crafting = queueItem;
    game.global.timeLeftOnCraft = new Decimal(game.buildings[queueItem].craftTime);
    document.getElementById("buildingsBar").style.width = "0%";
}

function calculatePercentageBuildingCost(what, resourceToCheck, costModifier){
	var struct = game.buildings[what];
	var res = game.resources[resourceToCheck];
	var resSim = res.max;
	var dif = struct.purchased.minus(struct.owned).toNumber();
	for (var x = 0; x < dif; x++){
		resSim = resSim.mul(struct.increase.by).floor();
	}
	return resSim.mul(costModifier).floor();
}

function trapThings() {
    var trap = game.buildings.Trap;
    var trimps = game.resources.trimps;
    if (game.global.timeLeftOnTrap.eq(-1)) {
        if (trimps.owned.lt(trimps.max) && trap.owned.gte(1))
            game.global.timeLeftOnTrap = new Decimal(trimps.speed);
        else {
            document.getElementById("trappingBar").style.width = "0%";
            document.getElementById("TrapOwned").innerHTML = trap.owned.toNumber();
            return;
        }
    }
    game.global.timeLeftOnTrap = game.global.timeLeftOnTrap.minus(Decimal.div(1, game.settings.speed).mul(game.global.playerModifier));
    if (game.global.timeLeftOnTrap.lte(0) && trimps.owned.lt(trimps.max) && trap.owned.gte(1)) {
        trap.owned = trap.owned.minus(1);
        trimps.owned = trimps.owned.plus(1);
        game.global.timeLeftOnTrap = new Decimal(-1);
        document.getElementById("TrapOwned").innerHTML = trap.owned.toNumber();
    }
    document.getElementById("trappingBar").style.width = (100 - game.global.timeLeftOnTrap.div(trimps.speed).mul(100).toNumber()) + "%";
}

function buyJob(what) {
	if (game.global.firing){
		if (game.jobs[what].owned.lt(1)) return;
		game.resources.trimps.employed = game.resources.trimps.employed.minus((game.jobs[what].owned.lt(game.global.buyAmt)) ? game.jobs[what].owned : game.global.buyAmt);
		game.jobs[what].owned = game.jobs[what].owned.minus(game.global.buyAmt);
		if (game.jobs[what].owned.lt(0)) game.jobs[what].owned = new Decimal(0);
		if (game.resources.trimps.employed.lt(0)) game.resources.trimps.employed = new Decimal(0);
		return;
	}
	if (!canAffordJob(what)) return;
	canAffordJob(what, true);
	game.jobs[what].owned = game.jobs[what].owned.plus(game.global.buyAmt);
	game.resources.trimps.employed = game.resources.trimps.employed.plus(game.global.buyAmt);
	tooltip(what, "jobs", "update");
}

function getTooltipJobText(what) {
    var job = game.jobs[what];
    var fullText = "";
    for (var item in job.cost) {
        var color = (checkJobItem(what, false, item)) ? "green" : "red";
        fullText += '<span class="' + color + '">' + item + ':&nbsp;' + prettify(checkJobItem(what, false, item, true)) + '</span>, ';
    }
    fullText = fullText.slice(0, -2);
    return fullText;
}

function canAffordJob(what, take) {
    var trimps = game.resources.trimps;
    if (trimps.max.div(2).ceil().lt(trimps.employed.plus(game.global.buyAmt))) return false;
    if (trimps.owned.minus(trimps.employed).minus(game.global.buyAmt).lt(0)) return false;
    var job = game.jobs[what];
    for (var costItem in job.cost) {
        if (!checkJobItem(what, take, costItem)) return false;
    }
    return true;
}

function checkJobItem(what, take, costItem, amtOnly) {
    var job = game.jobs[what];
    var cost = job.cost[costItem];
    var price = new Decimal(0);
	if (cost.lastCheckCount != game.global.buyAmt || cost.lastCheckOwned != job.owned){
		for (var x = 0; x < game.global.buyAmt; x++) {
			price = price.plus(Decimal.mul(cost[0], Decimal.pow(cost[1], job.owned.plus(x))).floor());
		}
		cost.lastCheckCount = game.global.buyAmt;
		cost.lastCheckAmount = price;
		cost.lastCheckOwned = job.owned;
	}
	else {
		price = cost.lastCheckAmount;
	}
    if (amtOnly) return price;
    if (take) {
        game.resources[costItem].owned = game.resources[costItem].owned.minus(price);
        return true;
    }
    if (game.resources[costItem].owned.lt(price)) {
        return false;
    }
    return true;
}

function buyUpgrade(what) {
    if (what == "Coordination" && (game.resources.trimps.max.div(2).ceil().lt(game.resources.trimps.maxSoldiers.mul(2)))) {
        message("You should probably expand your territory a bit first.", "Notices");
        return;
    }
    var upgrade = game.upgrades[what];
    var canAfford = canAffordTwoLevel(upgrade);
    if (!canAfford) return;
    canAfford = canAffordTwoLevel(upgrade, true);
    upgrade.fire();
    upgrade.locked = 1;
    upgrade.done++;
    var dif = upgrade.allowed - upgrade.done;
    if (dif > 1) {
        document.getElementById(what + "Owned").innerHTML = upgrade.done + "( +" + dif + ")";
        return;
    } else if (dif == 1) {
        document.getElementById(what + "Owned").innerHTML = upgrade.done;
        return;
    }
    document.getElementById("upgradesHere").removeChild(document.getElementById(what));
    tooltip("hide");
}

function breed() {
    var trimps = game.resources.trimps;
    var breeding = trimps.owned.minus(trimps.employed);
    if (breeding.lt(2)) {
        updatePs(0, true);
        return;
    }
    if (trimps.owned.gte(trimps.max)) {
        trimps.owned = trimps.max;
        return;
    }
    breeding = breeding.mul(trimps.potency);
    updatePs(breeding, true);
    trimps.owned = trimps.owned.plus(breeding.div(game.settings.speed));
}

function prestigeEquipment(what) {
    var equipment = game.equipment[what];
    if (typeof equipment.cost.wood !== 'undefined') {
        equipment.cost.wood[0] *= game.global.prestigeCostMod.toNumber();
    } else
        equipment.cost.metal[0] *= game.global.prestigeCostMod.toNumber();
    if (typeof equipment.health !== 'undefined') {
        game.global.health = game.global.health.minus(equipment.health.mul(equipment.level));
        equipment.health = equipment.health.mul(game.global.prestigeValueMod);

    } else {
        game.global.attack = game.global.attack.minus(equipment.attack.mul(equipment.level));
        equipment.attack = equipment.attack.mul(game.global.prestigeValueMod);

    }
    equipment.level = new Decimal(0);
    equipment.prestige++;
    if (document.getElementById(what + "Numeral") !== null) document.getElementById(what + "Numeral").innerHTML = romanNumeral(equipment.prestige);
}

function createMap() {
    game.global.mapsOwned++;
    game.global.totalMapsEarned++;
    var world = game.global.world;
    var mapName = getRandomMapName();
	mapName = mapName.split('.');
	if (typeof mapName[1] === 'undefined') mapName[1] = "All";
    game.global.mapsOwnedArray.push({
        id: "map" + game.global.totalMapsEarned,
        name: mapName[0],
		location: mapName[1],
        clears: 0,
        level: world,
        difficulty: new Decimal(getRandomMapValue("difficulty")),
        size: getRandomMapValue("size"),
        loot: new Decimal(getRandomMapValue("loot"))
    });
    message("You just made " + mapName[0] + "!", "Notices");
    unlockMap(game.global.mapsOwnedArray.length - 1);
}

function getRandomMapValue(what) { //what can be size, difficulty, or loot for now
    var amt = game.mapConfig[what + "Base"];
    var range = game.mapConfig[what + "Range"];
    var min = amt - range;
    var x = ((Math.random() * ((amt + range) - min)) + min);
    x = x.toFixed(3);
    return x;
}

function getRandomMapName() {
    var namesObj = game.mapConfig.names;
    var roll = Math.floor(Math.random() * (namesObj.prefix.length - 1));
    var name = namesObj.prefix[roll];
    roll = Math.floor(Math.random() * (namesObj.suffix.length - 1));
    return name + " " + namesObj.suffix[roll];
}

function buildMapGrid(mapId) {
    var map = game.global.mapsOwnedArray[getMapIndex(mapId)];
    var array = [];
    for (var i = 0; i < map.size; i++) {
        array.push({
            level: i + 1,
            maxHealth: new Decimal(-1),
            health: new Decimal(-1),
            attack: new Decimal(-1),
            special: "",
            text: "",
            name: getRandomBadGuy(map.location)
        });
    }
    game.global.mapGridArray = array;
    addSpecials(true);
}

function getMapIndex(mapId) {
        for (var x = 0; x < game.global.mapsOwnedArray.length; x++) {
            if (game.global.mapsOwnedArray[x].id == mapId) return x;
        }
    }
    
function buildGrid() {
    var world = game.global.world;
    var array = [];
    for (var i = 0; i < 100; i++) {
        array.push({
            level: i + 1,
            maxHealth: new Decimal(-1),
            health: new Decimal(-1),
            attack: new Decimal(-1),
            special: "",
            text: "",
            name: getRandomBadGuy()
        });
    }
    game.global.gridArray = array;
    addSpecials();
}

function getRandomBadGuy(mapSuffix) {
    var badGuysArray = [];
    for (var item in game.badGuys) {
        if (game.badGuys[item].location == "All" || game.badGuys[item].location == mapSuffix) badGuysArray.push(item);
    }
    return badGuysArray[Math.floor(Math.random() * badGuysArray.length)];
}

function addSpecialToLast(special, array, item) {
    array[array.length - 1].text = '<span class="glyphicon glyphicon-' + special.icon + '"></span>';
    array[array.length - 1].special = item;
    return array;
}

function addSpecials(maps, countOnly, map) { //countOnly must include map. Only counts upgrades set to spawn on "last".
	var specialCount = 0;
	var array;
	var unlocksObj;
	var world;
	var max;
    if (maps) {
        array = game.global.mapGridArray;
        unlocksObj = game.mapUnlocks;
        if (!countOnly) map = game.global.mapsOwnedArray[getMapIndex(game.global.currentMapId)];
		world = map.level;	
        max = map.size;
    } else {
        array = game.global.gridArray;
        unlocksObj = game.worldUnlocks;
        world = game.global.world;
        max = 100;
    }
    var canLast = true;
    for (var item in unlocksObj) {
        var special = unlocksObj[item];
        if ((special.level == "last" && canLast && special.world <= world && special.canRunOnce)) {
            if (countOnly){
				specialCount++;
				continue;
			}
			array = addSpecialToLast(special, array, item);
            canLast = false;
            continue;
        }
        if (typeof special.canRunOnce !== 'undefined' && !special.canRunOnce) continue;
        if ((special.world != world && special.world > 0)) continue;
        if ((special.world == -2) && ((world % 2) !== 0)) continue;
        if ((special.world == -3) && ((world % 2) != 1)) continue;
        if ((special.world == -5) && ((world % 5) !== 0)) continue;
        if ((special.world == -33) && ((world % 3) !== 0)) continue;
        if ((typeof special.startAt !== 'undefined') && (special.startAt > world)) continue;
        if (typeof special.canRunOnce === 'undefined' && (special.level == "last") && canLast && (special.last <= (world - 5))) {
			if (countOnly){
				specialCount++;
				continue;
			}
            array = addSpecialToLast(special, array, item);
            canLast = false;
            continue;
        }
		if (special.level == "last") continue;
        if (!countOnly)  findHomeForSpecial(special, item, array, max);
    }
	if (countOnly) return specialCount;
}

function findHomeForSpecial(special, item, array, max){
	var level;
	var repeat = (typeof special.repeat !== 'undefined');
	var repeatFreq = (repeat) ? special.repeat : 0;
	var x = 0;
	var done = false;
	while (done === false) {
		if (typeof special.level === 'object') level = ((Math.floor(Math.random() * (special.level[1] - special.level[0])) + special.level[0]) + (x * repeatFreq));
		else level = special.level + (x * repeatFreq);
		if (level >= max) break;
		//Resolve resource conflicts. Try +5, reverse, -5, then bail out.
		var hax = 5;
		while (array[level].special !== "") {
			if (hax >= 5) {
				hax++;
				level++;
			}
			if (hax <= 4) {
				hax--;
				level--;
			}
			if (hax == 10 || level >= max) {
				hax = 4;
				level -= 6;
			}
			if (hax === 0 || level <= 0) {
				break;
			}

		}
		if (hax !== 0 && level < max) {
			 if (typeof special.title !== 'undefined') 
			array[level].text = '<span title="' + special.title + '" class="glyphicon glyphicon-' + special.icon + '"></span>';
			else{
			array[level].text = '<span class="glyphicon glyphicon-' + special.icon + '"></span>';
			}
			array[level].special = item;
		}
		if (!repeat) done = true;
		x++;
		if (x == max) {
			done = true;
			break;
		}
	}
}

function drawGrid(maps) { //maps t or f. This function overwrites the current grid, be carefulz
    var grid = (maps) ? document.getElementById("mapGrid") : document.getElementById("grid");
    grid.innerHTML = "";
    var cols = (maps) ? (game.global.mapGridArray.length / 10) : 10;
    var counter = 0;
    var idText = (maps) ? "mapCell" : "cell";
    var size = 0;
    if (maps) size = game.global.mapGridArray.length;
    for (var i = 0; i < 10; i++) {
        if (maps && counter >= size) return;
        var row = grid.insertRow(0);
        row.id = "row" + i;
        for (var x = 0; x < cols; x++) {
            if (maps && counter >= size) return;
            var cell = row.insertCell(x);
            cell.id = idText + counter;
            cell.className = "battleCell";
            cell.innerHTML = (maps) ? game.global.mapGridArray[counter].text : game.global.gridArray[counter].text;
            counter++;
        }
    }
}

function fightManual() {
    battle(true);
}

function pauseFight(setup) {
    if (setup) game.global.pauseFight = (game.global.pauseFight) ? false : true;
    if (game.global.pauseFight) {
        game.global.pauseFight = false;
        document.getElementById("pauseFight").innerHTML = "Pause";
    } else {
        game.global.pauseFight = true;
        document.getElementById("pauseFight").innerHTML = "AutoBattle";
    }
}

function recycleMap() {
    if (game.global.lookingAtMap === "") return;
    var map = getMapIndex(game.global.lookingAtMap);
    if (map === null) return;
    game.global.mapsOwnedArray.splice(map, 1);
    document.getElementById("mapsHere").removeChild(document.getElementById(game.global.lookingAtMap));
    game.global.lookingAtMap = "";
    game.global.currentMapId = "";
    game.global.mapsOwned--;
    game.global.lastClearedMapCell = -1;
    game.resources.fragments.owned = game.resources.fragments.owned.plus(1);
    document.getElementById("selectedMapName").innerHTML = "Select a Map!";
    document.getElementById("selectedMapStats").innerHTML = "";
    document.getElementById("selectMapBtn").style.visibility = "hidden";
    document.getElementById("recycleMapBtn").style.visibility = "hidden";

}

function buyMap() {
	if (game.resources.fragments.owned.gte(3)){
		game.resources.fragments.owned = game.resources.fragments.owned.minus(3);
		createMap();
	}
}

function mapsClicked() {
    if (game.global.fighting && !game.global.preMapsActive) message("Waiting to travel until your soldiers are finished.", "Notices");
    if (game.global.preMapsActive) {
        mapsSwitch();
        return;
    }
    if (game.global.switchToMaps || game.global.switchToWorld) {
        message("Already waiting to switch.", "Notices");
        return;
    }
    if (game.global.mapsActive) game.global.switchToWorld = true;
    else game.global.switchToMaps = true;
}

function mapsSwitch(updateOnly) {
    if (!updateOnly) {
        game.global.switchToMaps = false;
        game.global.switchToWorld = false;
        if (game.global.mapsActive || game.global.preMapsActive) {
            game.global.mapsActive = false;
            game.global.preMapsActive = false;
        } else game.global.preMapsActive = true;
    }
    if (game.global.preMapsActive) {
        document.getElementById("grid").style.display = "none";
        document.getElementById("preMaps").style.display = "block";
        document.getElementById("mapGrid").style.display = "none";
        document.getElementById("mapsBtn").innerHTML = "World";
        if (game.global.currentMapId === "") {
            document.getElementById("selectMapBtn").style.visibility = "hidden";
            document.getElementById("recycleMapBtn").style.visibility = "hidden";
            document.getElementById("selectedMapName").innerHTML = "Select a Map!";
            document.getElementById("selectedMapStats").innerHTML = "";
        } else {
            selectMap(game.global.currentMapId, true);
            document.getElementById("selectMapBtn").innerHTML = "Continue";
            document.getElementById("selectMapBtn").style.visibility = "visible";
            document.getElementById("recycleMapBtn").style.visibility = "visible";
        }
    } else if (game.global.mapsActive) {
        var currentMapObj = getCurrentMapObject();
        document.getElementById("grid").style.display = "none";
        document.getElementById("preMaps").style.display = "none";
        document.getElementById("mapGrid").style.display = "block";
        document.getElementById("mapsBtn").innerHTML = "World";
        document.getElementById("worldNumber").innerHTML = "Lv: " + currentMapObj.level;
        document.getElementById("worldName").innerHTML = currentMapObj.name;
    } else {
        document.getElementById("grid").style.display = "block";
        document.getElementById("preMaps").style.display = "none";
        document.getElementById("mapGrid").style.display = "none";
        document.getElementById("mapsBtn").innerHTML = "Maps";
        document.getElementById("worldNumber").innerHTML = game.global.world;
        document.getElementById("worldName").innerHTML = "World";
    }
}

function selectMap(mapId, force) {
    if (!force && game.global.currentMapId !== "") {
        message("You must finish or recycle your current map before moving on.", "Notices");
        return;
    }
    var map = getMapIndex(mapId);
    map = game.global.mapsOwnedArray[map];
    document.getElementById("selectedMapName").innerHTML = map.name;
    document.getElementById("selectedMapStats").innerHTML = "Size: " + Math.floor(map.size) + ". Difficulty: " + map.difficulty.mul(100).floor().toNumber() + "%. Loot Bonus: " + map.loot.mul(100).floor().toNumber() + "%.<br/>There are " + addSpecials(true, true, map) + " items to be earned from level " + map.level + "+ maps.";
    if (typeof game.global.mapsOwnedArray[getMapIndex(game.global.lookingAtMap)] !== 'undefined') document.getElementById(game.global.lookingAtMap).style.border = "1px solid white";
    document.getElementById(mapId).style.border = "1px solid red";
    game.global.lookingAtMap = mapId;
    document.getElementById("selectMapBtn").innerHTML = "Run Map";
    document.getElementById("selectMapBtn").style.visibility = "visible";
    document.getElementById("recycleMapBtn").style.visibility = "visible";
}

function runMap() {
    if (game.global.lookingAtMap === "") return;
    var mapId = game.global.lookingAtMap;
    game.global.preMapsActive = false;
    game.global.mapsActive = true;
    game.global.currentMapId = mapId;
    mapsSwitch(true);
    if (game.global.lastClearedMapCell == -1) {
        buildMapGrid(mapId);
        drawGrid(true);
    }
}

function battleCoordinator(makeUp) {

    if (!game.global.fighting) {
        battle(null, makeUp);
        return;
    }
    game.global.battleCounter += (1000 / game.settings.speed);
    if (game.global.battleCounter >= 1000) {
        game.global.battleCounter = 0;
        fight(makeUp);
    }
}

function battle(force) {
    if (game.global.fighting) return;
    if ((game.global.switchToMaps || game.global.switchToWorld) && game.resources.trimps.soldiers.eq(0)) {
        mapsSwitch();
        return;
    }
    if (game.global.preMapsActive) return;
    var pause = (force) ? false : game.global.pauseFight;
    if (!game.global.autoBattle && !force) return;
    if (pause) return;
    var trimps = game.resources.trimps;
    if (trimps.soldiers.gte(trimps.maxSoldiers)) {
        startFight();
        return;
    }
    var breeding = (trimps.owned.minus(trimps.employed));
    if (breeding.lt(trimps.maxSoldiers)) return;
    if (force) {
        trimps.soldiers = trimps.maxSoldiers;
        trimps.owned = trimps.owned.minus(trimps.maxSoldiers);
    } else {
        var max = trimps.max.minus(trimps.employed).mul(0.05).ceil().toNumber();
        if ((trimps.owned).gte(trimps.max.minus(max))) {
            trimps.soldiers = trimps.maxSoldiers;
            trimps.owned = trimps.owned.minus(trimps.maxSoldiers);
        }
    }
    if (game.resources.trimps.soldiers.lt(trimps.maxSoldiers)) {
        return;
    }
    startFight();
}

function startFight() {
    game.global.battleCounter = 0;
    document.getElementById("badGuyCol").style.visibility = "visible";
    var cellNum;
    var cell;
    var cellElem;
    if (game.global.mapsActive) {
        cellNum = game.global.lastClearedMapCell + 1;
        cell = game.global.mapGridArray[cellNum];
        cellElem = document.getElementById("mapCell" + cellNum);
    } else {
        cellNum = game.global.lastClearedCell + 1;
        cell = game.global.gridArray[cellNum];
        cellElem = document.getElementById("cell" + cellNum);
    }
    cellElem.style.backgroundColor = "yellow";
    if (cell.maxHealth.eq(-1)) {
        cell.attack = game.global.getEnemyAttack(cell.level, cell.name);
        cell.health = game.global.getEnemyHealth(cell.level, cell.name);
        if (game.global.mapsActive) {
            var difficulty = game.global.mapsOwnedArray[getMapIndex(game.global.currentMapId)].difficulty;
            cell.attack = cell.attack.mul(difficulty);
            cell.health = cell.health.mul(difficulty);
        }
        cell.maxHealth = cell.health;
        document.getElementById("badGuyBar").style.width = "100%";
        document.getElementById("badGuyName").innerHTML = cell.name;
        document.getElementById("badGuyBar").style.backgroundColor = "blue";
        document.getElementById("badGuyAttack").innerHTML = calculateDamage(cell.attack, true);
    }
    if (game.global.soldierHealth.eq(0)) {
        var trimpsFighting = game.resources.trimps.maxSoldiers;
        game.global.soldierHealthMax = game.global.health.mul(trimpsFighting);
        game.global.soldierHealth = game.global.soldierHealthMax;
        game.global.soldierCurrentAttack = game.global.attack.mul(trimpsFighting);
        game.global.soldierCurrentBlock = game.global.block.mul(game.jobs.Trainer.owned.mul(game.jobs.Trainer.modifier.div(100)).plus(game.global.block)).mul(trimpsFighting).floor();
        document.getElementById("trimpsFighting").innerHTML = prettify(trimpsFighting, 0);
        document.getElementById("goodGuyBar").style.width = "100%";
        document.getElementById("goodGuyBlock").innerHTML = prettify(game.global.soldierCurrentBlock);
        document.getElementById("goodGuyAttack").innerHTML = calculateDamage(game.global.soldierCurrentAttack, true);
    }
    game.global.fighting = true;
    game.global.lastFightUpdate = new Date();
    document.getElementById("goodGuyHealth").innerHTML = prettify(game.global.soldierHealth, 0);
    document.getElementById("goodGuyHealthMax").innerHTML = prettify(game.global.soldierHealthMax, 0);
    document.getElementById("goodGuyBar").style.backgroundColor = "blue";
    document.getElementById("badGuyHealth").innerHTML = prettify(cell.health, 0);
    document.getElementById("badGuyHealthMax").innerHTML = prettify(cell.maxHealth, 0);

}

function calculateDamage(number, buildString) { //number = base attack
    var fluctuation = 20; //%fluctuation
    var multiplier = (fluctuation / 100);
    if (!(number instanceof Decimal)) number = new Decimal(number);
    var min = number.mul(1 - multiplier).floor();
    var max = number.plus(number.mul(multiplier)).ceil();
    if (buildString) return prettify(min, 0) + "-" + prettify(max, 0);
    number = Decimal.mul(Math.random(), max.plus(1).minus(min)).plus(min).floor();
    return number;
}

function nextWorld() {
    game.global.world++;
    //ga('send', 'event', 'Next World', 'World: ' + game.global.world);
    document.getElementById("worldNumber").innerHTML = game.global.world;
    game.global.lastClearedCell = -1;
    game.global.gridArray = [];
    document.getElementById("grid").innerHTML = "";
    buildGrid();
    drawGrid();
}

function fight(makeUp) {
    if (game.global.soldierHealth.lte(0)) {
        var s = (game.resources.trimps.maxSoldiers.gt(1)) ? "s" : "";
        message(game.resources.trimps.maxSoldiers.toNumber() + " Trimp" + s + " just bit the dust.", "Combat");
        game.global.fighting = false;
        game.resources.trimps.soldiers = new Decimal(0);
        return;
    }
    var cellNum;
    var cell;
    var cellElem;
    if (game.global.mapsActive) {
        cellNum = game.global.lastClearedMapCell + 1;
        cell = game.global.mapGridArray[cellNum];
        cellElem = document.getElementById("mapCell" + cellNum);
    } else {
        cellNum = game.global.lastClearedCell + 1;
        cell = game.global.gridArray[cellNum];
        cellElem = document.getElementById("cell" + cellNum);
    }
    if (cell.health.lte(0)) {
        message("You killed a " + cell.name + "!", "Combat");
        //if (cell.level % 2 === 0) ga('send', 'event', 'Killed Bad Guy', 'W: ' + game.global.world + ' L:' + cell.level);
        cellElem.style.backgroundColor = "green";
        if (game.global.mapsActive) game.global.lastClearedMapCell = cellNum;
        else game.global.lastClearedCell = cellNum;
        game.global.fighting = false;
        document.getElementById("badGuyCol").style.visibility = "hidden";
        var unlock;
        if (game.global.mapsActive) unlock = game.mapUnlocks[cell.special];
        else unlock = game.worldUnlocks[cell.special];
        if (typeof unlock !== 'undefined' && typeof unlock.message !== 'undefined') message(cell.text + unlock.message, "Unlocks");
        if (typeof unlock !== 'undefined' && typeof unlock.fire !== 'undefined') {
            unlock.fire(cell.level);
            if (game.global.mapsActive) {
                if (typeof game.mapUnlocks[cell.special].last !== 'undefined') game.mapUnlocks[cell.special].last += 5;
                if (typeof game.mapUnlocks[cell.special].canRunOnce !== 'undefined') game.mapUnlocks[cell.special].canRunOnce = false;
            }
        } else if (cell.special !== "") {
            unlockEquipment(cell.special);
        }
        if (game.global.mapsActive && cellNum == (game.global.mapGridArray.length - 1)) {
            game.global.preMapsActive = true;
            game.global.mapsActive = false;
            game.global.lastClearedMapCell = -1;
            game.global.currentMapId = "";
            game.global.mapGridArray = [];
            game.global.fighting = false;
            mapsSwitch(true);
            return;
        }
        if (cellNum == 99) nextWorld();
        battle(true);
        return;
    }
    var attackAndBlock = calculateDamage(cell.attack).minus(game.global.soldierCurrentBlock);
    if (game.badGuys[cell.name].fast) {
        game.global.soldierHealth = game.global.soldierHealth.minus(attackAndBlock.gt(0) ? attackAndBlock : 0);
        if (game.global.soldierHealth.gt(0)) cell.health = cell.health.minus(calculateDamage(game.global.soldierCurrentAttack));
        else
            game.global.soldierHealth = new Decimal(0);
        if (cell.health.lt(0)) cell.health = new Decimal(0);
    } else {
        cell.health = cell.health.minus(calculateDamage(game.global.soldierCurrentAttack));
        if (cell.health.gt(0)) game.global.soldierHealth = game.global.soldierHealth.minus(attackAndBlock.gt(0) ? attackAndBlock : 0);
        else
            cell.health = new Decimal(0);
        if (game.global.soldierHealth.lt(0)) game.global.soldierHealth = new Decimal(0);
    }
    game.global.lastFightUpdate = new Date();
    if (makeUp) return;
    document.getElementById("badGuyHealth").innerHTML = prettify(cell.health, 0);
    updateGoodBar();
    var percent = (cell.health.div(cell.maxHealth).mul(100)).toNumber();
    document.getElementById("badGuyBar").style.width = percent + "%";
    document.getElementById("badGuyBar").style.backgroundColor = getBarColor(percent);
    /*	if (game.jobs.Medic.owned >= 1) setTimeout(heal, 500); */
}

/* function heal() {
	var medics = game.jobs.Medic;
	if (game.global.soldierHealth > 0)
	game.global.soldierHealth += (medics.owned * medics.modifier);
	if (game.global.soldierHealth > game.global.soldierHealthMax) game.global.soldierHealth = game.global.soldierHealthMax;
	updateGoodBar();
} */

function updateGoodBar() {
    document.getElementById("goodGuyHealth").innerHTML = prettify(game.global.soldierHealth, 0);
    var percent = (game.global.soldierHealth.div(game.global.soldierHealthMax).mul(100)).toNumber();
    document.getElementById("goodGuyBar").style.width = percent + "%";
    document.getElementById("goodGuyBar").style.backgroundColor = getBarColor(percent);
}

function buyEquipment(what) {
    var canAfford = affordOneTier(what, "resources");
    if (!canAfford) return;
    if (canAfford) affordOneTier(what, "resources", true);
    var obj = game.equipment[what];
    if (typeof obj.attack !== 'undefined') game.global.attack = game.global.attack.plus(obj.attack);
    if (typeof obj.health !== 'undefined') game.global.health = game.global.health.plus(obj.health);
    obj.level = obj.level.plus(1);
    document.getElementById(what + "Owned").innerHTML = obj.level.toNumber();
    tooltip(what, "equipment", "update");
}

function affordOneTier(what, whereFrom, take) {
    //take, true/false to take resources or not or something like that probably
    //don't send shit in here to take without checking first though
    var buyFrom = game[whereFrom];
    var toBuy = game.equipment[what];
    for (var item in toBuy.cost) {
        var cost;
        if (typeof toBuy.cost[item] === 'function') cost = toBuy.cost[item]();
        if (typeof toBuy.cost[item][1] !== 'undefined') cost = resolvePow(toBuy.cost[item], toBuy);
        if (cost.gt(buyFrom[item].owned)) return false;
        if (take) buyFrom[item].owned = buyFrom[item].owned.minus(cost);
    }
    return true;
}

function fadeIn(elem, speed) {
    var opacity = 0;
    elem = document.getElementById(elem);
    elem.style.opacity = 0;
    if (elem.style.display == "none") elem.style.display = "block";
    if (elem.style.visibility == "hidden") elem.style.visibility = "visible";

    var fadeInt = setInterval(function () {
        opacity = opacity + 0.01;
        elem.style.opacity = opacity;
        if (opacity >= 1) {
            clearInterval(fadeInt);
        }
    }, speed);

}

function cheatALittle() {
    if (game.global.playerModifier.lt(2)) {
        game.global.playerModifier = new Decimal(2);
        document.getElementById("cheatTd").style.display = "none";
        message("Your player modifier has been boosted to 200%!", "Notices");
        return;
    }
    message("You already cheated, save some for the other kids.", "Notices");
}
setTimeout(autoSave, 60000);

function gameLoop(makeUp) {
    gather(makeUp);
    craftBuildings();
    breed(makeUp);
    battleCoordinator(makeUp);
}

function costUpdatesTimeout() {
	checkButtons("buildings");
    checkButtons("jobs");
    checkButtons("equipment");
    checkButtons("upgrades");
    checkTriggers();
	setTimeout(costUpdatesTimeout, 500);
}

costUpdatesTimeout();

function gameTimeout() {
    var tick = 1000 / game.settings.speed;
    game.global.time += tick;
    var dif = (new Date().getTime() - game.global.start) - game.global.time;
    while (dif >= tick) {
        gameLoop(true);
        dif -= tick;
        game.global.time += tick;
    }
    gameLoop();
    updateLabels();
    setTimeout(gameTimeout, (tick - dif));
}

setTimeout(gameTimeout(), (1000 / game.settings.speed));


load();
document.getElementById("versionNumber").innerHTML = game.global.version;