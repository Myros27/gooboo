import store from "../../store"
import { buildArray } from "../utils/array";
import { buildNum } from "../utils/format";

export default {
    name: 'achievement',
    tickspeed: 1,
    unlockNeeded: 'achievementFeature',
    tick() {
        store.dispatch('achievement/check');
        if (store.state.system.settings.mods_qol.items.progressNiterMiningActiveSound.value){
            if (store.state.system.settings.mods_qol.items.progressNiterMiningSound.value !== null ){
                if (store.state.mining.breaks[store.state.mining.depth - 1] > Number(store.state.system.settings.mods_qol.items.progressNiterMiningSound.value)){
                    if (store.state.system.settings.mods_qol.items.progressNiterMiningSoundCache.value !== store.state.mining.depth){
                        let audio = new Audio('https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3');
                        audio.play();
                        //store.commit('system/registerCheat', {modid: 'autoNiterz', feature: 'mining', name: 'notify:playSound', severity: 0}); severity 0 = cheated?
                        store.state.system.settings.mods_qol.items.progressNiterMiningSoundCache.value = store.state.mining.depth
                    }
                }
            }
        }
        if (store.state.system.settings.mods_qol.items.showMaxEnemiesBeforeDeath.value){
            if (store.state.horde.zone !== store.state.system.settings.mods_qol.items.showMaxEnemiesBeforeDeathZoneCache.value){
                store.state.system.settings.mods_qol.items.showMaxEnemiesBeforeDeathZoneCache.value = store.state.horde.zone
                store.state.system.settings.mods_qol.items.showMaxEnemiesBeforeDeathNumberCache.value = 0
                //store.commit('system/registerCheat', {modid: 'showez', feature: 'horde', name: 'notify:showMaxEnemy', severity: 0}); severity 0 = cheated?
            } else {
                store.state.system.settings.mods_qol.items.showMaxEnemiesBeforeDeathNumberCache.value = Math.max(store.state.horde.combo, store.state.system.settings.mods_qol.items.showMaxEnemiesBeforeDeathNumberCache.value)
            }
        }
        if (store.state.system.settings.mods_automation.items.progressNiterMiningActive.value){
            if (store.state.system.settings.mods_automation.items.progressNiterMining.value !== null ){
                if (store.state.mining.breaks[store.state.mining.depth - 1] > Number(store.state.system.settings.mods_automation.items.progressNiterMining.value)){
                    store.state.mining.depth++
                    store.commit('system/registerCheat', {modid: 'autoNiterz', feature: 'mining', name: 'autoClick:advance', severity: 100});
                }
            }
        }
        if (store.state.system.settings.mods_cheats.items.autoShapezCheatActive.value){
            store.commit('system/registerCheat', {modid: 'autoShapez', feature: 'gallery', name: 'fullyAutomation:enableAutoShapezCompletly', severity: 200});
        }
    },
    unlock: ['achievementFeature', 'never', 'myros_automation', 'myros_cheats'],
    relic: {
        excavator: {icon: 'mdi-excavator', feature: ['achievement', 'mining'], color: 'orange', effect: [
            {name: 'currencyMiningScrapGain', type: 'mult', value: 2},
            {name: 'currencyMiningScrapCap', type: 'mult', value: 2}
        ]},
        redCard: {icon: 'mdi-cards', feature: ['achievement', 'horde'], color: 'red', effect: [
            {name: 'currencyHordeMonsterPartCap', type: 'bonus', value: buildNum(10, 'K')},
            {name: 'hordeCardCap', type: 'base', value: 1}
        ]},
        briefcase: {icon: 'mdi-briefcase', feature: ['achievement', 'treasure'], color: 'pale-blue', effect: [
            {name: 'treasureSlots', type: 'base', value: 8}
        ]},
        strangePlant: {icon: 'mdi-sprout', feature: ['achievement', 'village', 'farm'], color: 'pale-purple', effect: [
            {name: 'villageMaterialGain', type: 'mult', value: 2},
            {name: 'farmCropGain', type: 'mult', value: 2}
        ]},
        beneficialVirus: {icon: 'mdi-virus', feature: ['achievement', 'mining', 'horde'], color: 'pale-green', effect: [
            {name: 'miningToughness', type: 'mult', value: 0.5},
            {name: 'hordeCorruption', type: 'bonus', value: -0.5}
        ]}
    },
    note: buildArray(1).map(() => 'g'),
    saveGame() {
        let obj = {};

        for (const [key, elem] of Object.entries(store.state.achievement)) {
            if (elem.level > 0) {
                obj[key] = elem.level;
            }
        }

        return obj;
    },
    loadGame(data) {
        for (const [key, elem] of Object.entries(data)) {
            if (store.state.achievement[key] !== undefined) {
                store.commit('achievement/updateKey', {name: key, key: 'cacheHideNotification', value: elem});
            }
        }
        store.dispatch('achievement/check');
    }
}
