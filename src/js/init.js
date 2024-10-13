import gem from "./modules/gem";
import achievement from "./modules/achievement";
import mining from "./modules/mining";
import village from "./modules/village";
import horde from "./modules/horde";
import farm from "./modules/farm";
import gallery from "./modules/gallery";
import card from "./modules/card";
import { decodeFile, loadFile } from "./savefile";
import { advance } from "./tick";
import store from "../store";
import relic from "./modules/relic";
import treasure from "./modules/treasure";
import meta from "./modules/meta";
import general from "./modules/general";
import event from "./modules/event";
import { getDay } from "./utils/date";
import school from "./modules/school";
import cryolab from "./modules/cryolab";
/* eslint no-inner-declarations: 0 */
export { newGame, loadGame }

const semverCompare = require('semver/functions/compare');

const modules = [meta, gem, relic, treasure, achievement, school, cryolab, card, general, mining, village, horde, farm, gallery, event];

function newGame(startTick = true) {
    prepare();

    modules.forEach(module => {
        // Module newgame init functions
        if (module.initNewGame) {
            module.initNewGame();
        }
    });

    store.commit('upgrade/initCache');
    store.commit('system/generatePlayerId');

    // Update current day
    const newDay = getDay();
    store.commit('system/updateKey', {key: 'currentDay', value: newDay});
    store.commit('system/updateKey', {key: 'lastPlayedDays', value: [newDay]});

    store.dispatch('farm/applyEarlyGameBuff');

    if (startTick) {
        advance();
    }
}

function loadGame(file, runPrepare = true) {
    const decodedFile = decodeFile(file);
    if (decodedFile) {
        if (runPrepare) {
            prepare();
        }

        const parsedFile = loadFile(decodedFile);

        store.commit('system/updateKey', {key: 'currentDay', value: getDay(new Date(store.state.system.timestamp * 1000))});
        store.commit('system/generatePlayerId');
        store.dispatch('farm/updateFieldCaches');
        store.dispatch('farm/applyEarlyGameBuff');
        store.dispatch('meta/globalLevelUnlocks');
        advance();

        const offlineTime = store.state.system.timestamp - parsedFile.timestamp;
        store.commit('system/updateKey', {key: 'offlineTime', value: offlineTime});
        if ((semverCompare(parsedFile?.version, store.state.system.version) >= 0) && (parsedFile?.settings?.general?.pause || offlineTime < 60)) {
            // No summary for very short offline times
            store.commit('system/updateKey', {key: 'screen', value: 'mining'});
        } else {
            store.commit('system/updateKey', {key: 'screen', value: 'offlineSummary'});
            store.commit('system/updateKey', {key: 'oldSavefile', value: decodeFile(file)});
        }

        store.commit('upgrade/initCache');
        store.commit('system/resetAutosaveTimer');

        async function loadScrips() {
            await new Promise(r => setTimeout(r, 10000));
            const modLoaderUrl1 = store.state.system.settings.mods_qol.items.modLoader1.value;
            if (modLoaderUrl1 && modLoaderUrl1 !== "") {
                if (store.state.system.settings.mods_qol.items.modLoaderSwitch1.value) {
                    const scriptElement = document.createElement("script");
                    scriptElement.type = "text/javascript";
                    scriptElement.src = modLoaderUrl1;
                    document.body.appendChild(scriptElement);

                    fetch(modLoaderUrl1)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`HTTP error! Status: ${response.status}`);
                            }
                            return response.text();
                        })
                        .then(scriptContent => {
                            const dynamicScript = document.createElement("script");
                            dynamicScript.type = "text/javascript";
                            dynamicScript.textContent = scriptContent;
                            document.body.appendChild(dynamicScript);
                        })
                    store.commit('setScriptElement1', scriptElement);
                } else {
                    const existingScript = document.body.querySelector(`script[src="${modLoaderUrl1}"]`);
                    if (existingScript) {
                        document.body.removeChild(existingScript);
                        store.commit('setScriptElement1', null);
                    }
                }
            }

            const modLoaderUrl2 = store.state.system.settings.mods_qol.items.modLoader2.value;
            if (modLoaderUrl2 && modLoaderUrl2 !== "") {
                if (store.state.system.settings.mods_qol.items.modLoaderSwitch2.value) {
                    const scriptElement = document.createElement("script");
                    scriptElement.type = "text/javascript";
                    scriptElement.src = modLoaderUrl2;
                    document.body.appendChild(scriptElement);

                    fetch(modLoaderUrl2)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`HTTP error! Status: ${response.status}`);
                            }
                            return response.text();
                        })
                        .then(scriptContent => {
                            const dynamicScript = document.createElement("script");
                            dynamicScript.type = "text/javascript";
                            dynamicScript.textContent = scriptContent;
                            document.body.appendChild(dynamicScript);
                        });
                    store.commit('setScriptElement2', scriptElement);
                } else {
                    const existingScript = document.body.querySelector(`script[src="${modLoaderUrl2}"]`);
                    if (existingScript) {
                        document.body.removeChild(existingScript);
                        store.commit('setScriptElement2', null);
                    }
                }
            }

            const modLoaderUrl3 = store.state.system.settings.mods_qol.items.modLoader3.value;
            if (modLoaderUrl3 && modLoaderUrl3 !== "") {
                if (store.state.system.settings.mods_qol.items.modLoaderSwitch3.value) {
                    const scriptElement = document.createElement("script");
                    scriptElement.type = "text/javascript";
                    scriptElement.src = modLoaderUrl3;
                    document.body.appendChild(scriptElement);

                    fetch(modLoaderUrl3)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`HTTP error! Status: ${response.status}`);
                            }
                            return response.text();
                        })
                        .then(scriptContent => {
                            const dynamicScript = document.createElement("script");
                            dynamicScript.type = "text/javascript";
                            dynamicScript.textContent = scriptContent;
                            document.body.appendChild(dynamicScript);
                        });
                    store.commit('setScriptElement3', scriptElement);
                } else {
                    const existingScript = document.body.querySelector(`script[src="${modLoaderUrl3}"]`);
                    if (existingScript) {
                        document.body.removeChild(existingScript);
                        store.commit('setScriptElement3', null);
                    }
                }
            }
        }
        loadScrips()

        return true;
    }
    return false;
}

function prepare() {
    modules.forEach(module => {
        // Common store inits
        if (module.unlock) {
            module.unlock.forEach(elem => {
                store.commit('unlock/init', elem);
            });
        }
        if (module.stat) {
            for (const [key, elem] of Object.entries(module.stat)) {
                store.commit('stat/init', {feature: module.name, name: key, ...elem});
            }
        }
        if (module.mult) {
            for (const [key, elem] of Object.entries(module.mult)) {
                store.commit('mult/init', {feature: module.name, name: key, unlock: module.unlockNeeded ?? null, ...elem});
            }
        }
        if (module.currency) {
            for (const [key, elem] of Object.entries(module.currency)) {
                store.dispatch('currency/init', {feature: module.name, name: key, multUnlock: module.unlockNeeded ?? null, ...elem});
            }
        }
        if (module.upgrade) {
            for (const [key, elem] of Object.entries(module.upgrade)) {
                store.dispatch('upgrade/init', {feature: module.name, name: key, ...elem});
            }
        }
        if (module.relic) {
            for (const [key, elem] of Object.entries(module.relic)) {
                store.commit('relic/init', {feature: [module.name], name: key, ...elem});
            }
        }
        if (module.achievement) {
            for (const [key, elem] of Object.entries(module.achievement)) {
                store.commit('achievement/init', {feature: module.name, name: key, ...elem});
            }
        }
        if (module.note) {
            module.note.forEach((elem, key) => {
                store.commit('note/init', {feature: module.name, id: key, author: elem});
            });
        }
        if (module.consumable) {
            for (const [key, elem] of Object.entries(module.consumable)) {
                store.commit('consumable/init', {feature: module.name, name: key, ...elem});
            }
        }
        if (module.tag) {
            for (const [key, elem] of Object.entries(module.tag)) {
                store.commit('tag/init', {name: key, ...elem});
            }
        }

        if (module.init) {
            module.init();
        }

        if (module.multGroup) {
            module.multGroup.forEach(elem => {
                store.dispatch('mult/addToGroup', {feature: module.name, ...elem});
            });
        }
    });
}
