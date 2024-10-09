import store from "../../store"
import { buildArray } from "../utils/array";
import { capitalize } from "../utils/format";
import { getSequence, logBase } from "../utils/math";
import achievement from "./gallery/achievement";
import idea from "./gallery/idea";
import relic from "./gallery/relic";
import shape from "./gallery/shape";
import upgrade from "./gallery/upgrade";
import upgradeShape from "./gallery/upgradeShape";
import upgradePremium from "./gallery/upgradePremium";
import upgradePrestige from "./gallery/upgradePrestige";
import bookGallery from "./school/bookGallery";
/* eslint no-inner-declarations: 0 */
export default {
    name: 'gallery',
    tickspeed: 1,
    unlockNeeded: 'galleryFeature',
    tick(seconds) {
        store.commit('stat/add', {feature: 'gallery', name: 'timeSpent', value: seconds});

        const segments = Math.ceil(Math.pow(seconds, 0.5) / 8);
        let secondsSpent = 0;
        for (let i = 0; i < segments; i++) {
            const secondsSegment = Math.round(seconds * (i + 1) / segments) - secondsSpent;
            secondsSpent += secondsSegment;

            const colors = ['beauty', ...store.state.gallery.color].reverse();
            const baseGain = colors.map(color => store.getters['mult/get'](`currencyGallery${ capitalize(color) }Gain`));

            colors.forEach((color, index) => {
                const gain = (baseGain[index] + store.getters['mult/get'](`currencyGallery${ capitalize(color) }Gain`)) / 2;
                if (gain > 0) {
                    store.dispatch('currency/gain', {feature: 'gallery', name: color, amount: secondsSegment * gain});
                }
            });
        }

        const globalLevelGallery = Math.floor(logBase(store.state.stat.gallery_beauty.total, 4));
        if (globalLevelGallery > 0) {
            store.dispatch('meta/globalLevelPart', {key: 'gallery_0', amount: globalLevelGallery});
        }

        store.dispatch('gallery/packageAndConverterTick', seconds);
        if (store.state.unlock.galleryShape.use) {
            store.dispatch('currency/gain', {feature: 'gallery', name: 'motivation', amount: seconds * store.getters['mult/get']('currencyGalleryMotivationGain')});
        }

        if (store.state.unlock.galleryInspiration.use) {
            let newTime = store.state.gallery.inspirationTime + seconds;
            let newAmount = store.state.gallery.inspirationAmount;

            while (newTime >= store.getters['gallery/inspirationTimeNeeded'](newAmount)) {
                newTime -= store.getters['gallery/inspirationTimeNeeded'](newAmount);
                newAmount++;
            }

            store.commit('gallery/updateKey', {key: 'inspirationTime', value: newTime});
            if (newAmount > store.state.gallery.inspirationAmount) {
                store.dispatch('currency/gain', {feature: 'gallery', name: 'inspiration', amount: newAmount - store.state.gallery.inspirationAmount});
                store.commit('gallery/updateKey', {key: 'inspirationAmount', value: newAmount});
            }
        }
        if (store.state.unlock.galleryCanvas.use) {
            let totalLevel = 0;
            for (const [key, elem] of Object.entries(store.state.gallery.colorData)) {
                if (elem.cacheSpace > 0) {
                    const speed = store.getters['mult/get']('galleryCanvasSpeed', getSequence(10, elem.cacheSpace) * 0.1, 1 + store.getters['currency/value'](`gallery_${ key }Drum`) * 0.1);
                    const oldProgress = elem.progress;
                    let progress = elem.progress;
                    let secondsLeft = seconds;
                    while (secondsLeft > 0) {
                        const difficulty = store.getters['gallery/canvasDifficulty'](key, Math.floor(progress));
                        const timeUsed = Math.min((Math.floor(progress + 1) - progress) * difficulty / speed, secondsLeft);
                        progress += timeUsed * speed / difficulty;
                        secondsLeft -= timeUsed;
                    }
                    store.commit('gallery/updateColorDataKey', {name: key, key: 'progress', value: progress});
                    if (Math.floor(progress) > Math.floor(oldProgress)) {
                        store.dispatch('gallery/applyCanvasLevel', {name: key, onLevel: true});
                    }
                }
                totalLevel += elem.progress;
            }
            store.commit('stat/increaseTo', {feature: 'gallery', name: 'canvasLevelTotal', value: totalLevel});
        }
        if (store.state.system.settings.mods_automation.items.autoShapezActiveEnabled.value || store.state.system.settings.mods_cheats.items.autoShapezCheatActive.value){
            if (store.state.system.settings.mods_cheats.items.autoShapezCheatActive.value){
                store.state.currency.gallery_motivation.value = store.state.currency.gallery_motivation.cap
            }
            if (store.state.system.settings.mods_automation.items.autoShapezActiveEnabled.value && store.state.currency.gallery_motivation.value*2 < store.state.currency.gallery_motivation.cap){
                return;
            }

            function findMostCommon(modGrid) {
                const frequency = {};
                for (const row of modGrid) {
                    for (const item of row) {
                        frequency[item] = (frequency[item] || 0) + 1;
                    }
                }
                const maxCount = Math.max(...Object.values(frequency));
                return Object.keys(frequency).filter(key => frequency[key] === maxCount).sort().shift();
            }

            function modShapesTouch(modShape, modGrid) {
                const rows = modGrid.length;
                const cols = modGrid[0].length;
                const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
                const shapes = modShape.split(',').map(shape => shape.trim());

                function isInBounds(x, y) {
                    return x >= 0 && x < rows && y >= 0 && y < cols;
                }

                function dfs(x, y, shape) {
                    if (!isInBounds(x, y) || visited[x][y] || modGrid[x][y] !== shape) {
                        return;
                    }
                    visited[x][y] = true;
                    dfs(x - 1, y, shape);
                    dfs(x + 1, y, shape);
                    dfs(x, y - 1, shape);
                    dfs(x, y + 1, shape);
                }

                let coX;
                let coY;
                for (const shape of shapes) {
                    let found = false;

                    for (let i = 0; i < rows; i++) {
                        for (let j = 0; j < cols; j++) {
                            if (modGrid[i][j] === shape && !visited[i][j]) {
                                if (found) {
                                    return false;
                                } else {
                                    coX = i;
                                    coY = j;
                                }
                                found = true;
                                dfs(i, j, shape);
                            }
                        }
                    }
                    for (let x = 0; x < rows; x++) {
                        for (let y = 0; y < cols; y++) {
                            if (modGrid[x][y] === shape && !visited[x][y]) {
                                return false;
                            }
                        }
                    }
                }

                return [coX,coY];
            }

            function findClosestShapePosition(modShape, modGrid) {
                const rows = modGrid.length;
                const cols = modGrid[0].length;
                const shapes = modShape.split(',').map(shape => shape.trim());
                const shapePositions = [];
                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        if (shapes.includes(modGrid[i][j])) {
                            shapePositions.push([i, j]);
                        }
                    }
                }
                if (shapePositions.length === 0) {
                    return null;
                }
                let closestPosition = null;
                let minDistanceSum = Infinity;

                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        let distanceSum = 0;
                        for (const [shapeX, shapeY] of shapePositions) {
                            const distance = Math.abs(i - shapeX) + Math.abs(j - shapeY);
                            distanceSum += distance;
                        }

                        if (distanceSum < minDistanceSum) {
                            minDistanceSum = distanceSum;
                            closestPosition = [i, j];
                        }
                    }
                }

                return closestPosition;
            }

            function findConnectedShapes(modShape, modGrid, modOrigin) {
                const rows = modGrid.length;
                const cols = modGrid[0].length;
                const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
                const positions = [];

                const [startX, startY] = modOrigin;


                if (modGrid[startX][startY] !== modShape) {
                    return [];
                }

                function isInBounds(x, y) {
                    return x >= 0 && x < rows && y >= 0 && y < cols;
                }

                function dfs(x, y) {
                    if (!isInBounds(x, y) || visited[x][y] || modGrid[x][y] !== modShape) {
                        return;
                    }
                    visited[x][y] = true;
                    positions.push([x, y]);

                    dfs(x - 1, y);
                    dfs(x + 1, y);
                    dfs(x, y - 1);
                    dfs(x, y + 1);
                }
                dfs(startX, startY);
                return positions;
            }

            function moveClosestNonGoalShapeToGoal(modShape, modGrid, modGoalArea, modOrigin) {
                const rows = modGrid.length;
                const cols = modGrid[0].length;
                const shapePositions = [];

                if (!modGoalArea || modGoalArea.length === 0) {
                    modGoalArea = [modOrigin];
                }
                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        if (modGrid[i][j] === modShape) {
                            const isInGoalArea = modGoalArea.some(([goalX, goalY]) => goalX === i && goalY === j);
                            if (!isInGoalArea) {
                                shapePositions.push([i, j]);
                            }
                        }
                    }
                }

                if (shapePositions.length === 0) {
                    return null;
                }

                let closestShape = null;
                let closestGoal = null;
                let minDistance = Infinity;

                for (const [shapeX, shapeY] of shapePositions) {
                    for (const [goalX, goalY] of modGoalArea) {
                        const distance = Math.abs(shapeX - goalX) + Math.abs(shapeY - goalY);

                        if (distance < minDistance) {
                            minDistance = distance;
                            closestShape = [shapeX, shapeY];
                            closestGoal = [goalX, goalY];
                        } else if (distance === minDistance) {
                            if (Math.random() < 0.5) {
                                closestShape = [shapeX, shapeY];
                                closestGoal = [goalX, goalY];
                            }
                        }
                    }
                }

                const [fromX, fromY] = closestShape;
                const [goalX, goalY] = closestGoal;
                let toX = fromX;
                let toY = fromY;

                if (Math.abs(goalX - fromX) > Math.abs(goalY - fromY)) {
                    toX += (goalX > fromX) ? 1 : -1;
                } else {
                    toY += (goalY > fromY) ? 1 : -1;
                }

                return [[fromX, fromY], [toX, toY]];
            }

            function doNextMove(){
                let modGrid = store.state.gallery.shapeGrid
                let modMostFrequentElement = findMostCommon(modGrid)
                let modClick = modShapesTouch(modMostFrequentElement, modGrid)
                if (modClick !== false){
                    store.dispatch('gallery/clickShape', {x: modClick[1], y: modClick[0]});
                    console.log(`Clicked at ${modClick[0]}, ${modClick[1]} on ${modMostFrequentElement}`);
                    return;
                }
                let modOrigin = findClosestShapePosition(modMostFrequentElement, modGrid)
                let modGoalArea = findConnectedShapes(modMostFrequentElement, modGrid, modOrigin)
                let modResult = moveClosestNonGoalShapeToGoal(modMostFrequentElement, modGrid, modGoalArea, modOrigin)
                store.dispatch('gallery/switchShape', {fromX: modResult[0][1], fromY: modResult[0][0], toX: modResult[1][1], toY: modResult[1][0]})
            }

            let difference = store.state.currency.gallery_motivation.cap - store.state.system.settings.mods_automation.items.autoShapezActiveEnabled.value && store.state.currency.gallery_motivation.value*2

            difference = Math.min(10, difference);

            for (let i = 0; i < difference; i++) {
                doNextMove()
            }


        }
    },
    unlock: ['galleryFeature', 'galleryConversion', 'galleryInspiration', 'galleryAuction', 'galleryDrums', 'galleryShape', 'galleryCanvas'],
    stat: {
        timeSpent: {display: 'time'},
        bestPrestige: {showInStatistics: true},
        highestTierIdea: {},
        shapeComboHighest: {},
        shapeComboTotal: {showInStatistics: true},
        canvasLevelTotal: {showInStatistics: true},
        hourglassHighest: {},
        prestigeCount: {showInStatistics: true}
    },
    mult: {
        galleryInspirationBase: {unlock: 'galleryInspiration', baseValue: 300, display: 'timeMs'},
        galleryInspirationIncrement: {unlock: 'galleryInspiration', baseValue: 1, min: 0, display: 'percent'},
        galleryInspirationStart: {unlock: 'galleryInspiration'},
        galleryShapeGain: {unlock: 'galleryShape'},
        gallerySpecialShapeChance: {unlock: 'galleryShape', baseValue: 0.005, display: 'percent'},
        gallerySpecialShapeMult: {unlock: 'galleryShape', baseValue: 15, display: 'mult'},
        galleryCanvasSize: {unlock: 'galleryCanvas', baseValue: 1, round: true},
        galleryCanvasSpeed: {unlock: 'galleryCanvas', display: 'perSecond'}
    },
    currency: {
        beauty: {color: 'deep-purple', icon: 'mdi-image-filter-vintage', gainMult: {baseValue: 1, display: 'perSecond'}, showGainMult: true, showGainTimer: true, timerIsEstimate: true},
        converter: {multUnlock: 'galleryConversion', color: 'pale-green', icon: 'mdi-recycle', overcapMult: 0.75, overcapScaling: 0.95, gainMult: {baseValue: 0.2, display: 'perSecond'}, showGainMult: true, capMult: {baseValue: 1000}},
        inspiration: {multUnlock: 'galleryInspiration', color: 'yellow', icon: 'mdi-lightbulb-on'},
        package: {multUnlock: 'galleryDrums', color: 'beige', icon: 'mdi-package-variant', overcapMult: 0.8, overcapScaling: 0.8, gainMult: {baseValue: 0.0125, display: 'perSecond'}, showGainMult: true, showGainTimer: true, capMult: {baseValue: 10}},
        motivation: {multUnlock: 'galleryShape', type: 'shape', color: 'pink-purple', icon: 'mdi-emoticon-excited', overcapMult: 0.5, gainMult: {baseValue: 0.2, display: 'perSecond'}, showGainMult: true, showGainTimer: true, capMult: {baseValue: 100}},
        mysteryShape: {multUnlock: 'galleryShape', type: 'shape', color: 'pale-purple', icon: 'mdi-octahedron', overcapMult: 0, gainMult: {baseValue: 1}, capMult: {baseValue: 1337}},
        cash: {multUnlock: 'galleryAuction', type: 'prestige', alwaysVisible: true, color: 'green', icon: 'mdi-cash', gainMult: {}}
    },
    note: buildArray(10).map(() => 'g'),
    upgrade: {
        ...upgrade,
        ...upgradeShape,
        ...upgradePrestige,
        ...upgradePremium,
        ...bookGallery
    },
    multGroup: [
        {mult: 'galleryShapeGain', name: 'currencyGain', type: 'shape', blacklist: ['gallery_motivation', 'gallery_mysteryShape']}
    ],
    relic,
    achievement,
    init() {
        // Add each color as a mult and currency
        store.state.gallery.color.forEach((elem, index) => {
            const colorMult = ['beauty', ...store.state.gallery.color][index];

            store.dispatch('currency/init', {feature: 'gallery', multUnlock: 'galleryFeature', name: elem, color: elem, icon: 'mdi-liquid-spot', currencyMult: {
                [`currencyGallery${ capitalize(colorMult) }Gain`]: {type: 'base', value: val => val > 100 ? Math.pow(val * 100, 0.5) : val}
            }, gainMult: {display: 'perSecond'}, showGainMult: true, showGainTimer: true, timerIsEstimate: true});
            store.dispatch('currency/init', {feature: 'gallery', multUnlock: 'galleryDrums', name: elem + 'Drum', color: elem, icon: 'mdi-barrel', currencyMult: elem === 'red' ? {
                currencyGalleryBeautyGain: {type: 'mult', value: val => Math.pow(val * 0.1 + 1, 2)}
            } : {
                currencyGalleryBeautyGain: {type: 'mult', value: val => val * 0.1 + 1},
                [`currencyGallery${ capitalize(colorMult) }Gain`]: {type: 'mult', value: val => val * 0.1 + 1},
                [`currencyGallery${ capitalize(colorMult) }DrumCap`]: {type: 'bonus', value: val => val}
            }, overcapMult: 0, capMult: {baseValue: 10, round: true}});

            store.commit('gallery/initColorData', {name: elem});
            store.commit('mult/init', {feature: 'gallery', name: `gallery${ capitalize(elem) }Conversion`, unlock: 'galleryFeature', baseValue: 1}, {root: true});
            store.commit('mult/init', {feature: 'gallery', name: `gallery${ capitalize(elem) }DrumChance`, unlock: 'galleryDrums', display: 'percent', min: 0, max: 1}, {root: true});
        });

        store.commit('mult/init', {feature: 'gallery', name: 'galleryColorGain', unlock: 'galleryFeature', group: store.state.gallery.color.map(elem => `currencyGallery${ capitalize(elem) }Gain`)}, {root: true});
        store.commit('mult/init', {feature: 'gallery', name: 'galleryColorDrumChance', unlock: 'galleryDrums', group: store.state.gallery.color.map(elem => `gallery${ capitalize(elem) }DrumChance`)}, {root: true});
        store.commit('mult/init', {feature: 'gallery', name: 'galleryColorDrumCap', unlock: 'galleryDrums', group: store.state.gallery.color.map(elem => `currencyGallery${ capitalize(elem) }DrumCap`)}, {root: true});

        for (const [key, elem] of Object.entries(idea)) {
            store.commit('gallery/initIdea', {name: key, ...elem});
        }
        for (const [key, elem] of Object.entries(shape)) {
            store.commit('gallery/initShape', {name: key, ...elem});
            if (!elem.isSpecial) {
                store.dispatch('currency/init', {feature: 'gallery', type: 'shape', multUnlock: 'galleryFeature', name: key, color: elem.color, icon: elem.icon, gainMult: {}, showGainMult: true});
            }
        }

        store.commit('gallery/initShapeGrid');
    },
    saveGame() {
        let obj = {
            shapeGrid: store.state.gallery.shapeGrid
        };

        if (store.state.gallery.inspirationTime > 0) {
            obj.inspirationTime = store.state.gallery.inspirationTime;
        }
        if (store.state.gallery.inspirationAmount > 0) {
            obj.inspirationAmount = store.state.gallery.inspirationAmount;
        }
        if (store.state.gallery.hourglassCombo > 0) {
            obj.hourglassCombo = store.state.gallery.hourglassCombo;
        }
        if (store.state.gallery.canvasSpace.length > 0) {
            obj.canvasSpace = store.state.gallery.canvasSpace;
        }
        if (store.state.unlock.galleryInspiration.see) {
            let ideas = {};
            for (const [key, elem] of Object.entries(store.state.gallery.idea)) {
                if (elem.owned) {
                    ideas[key] = elem.level;
                }
            }
            obj.idea = ideas;
        }
        if (store.state.unlock.galleryCanvas.see) {
            let colorData = {};
            for (const [key, elem] of Object.entries(store.state.gallery.colorData)) {
                if (elem.progress > 0) {
                    colorData[key] = elem.progress;
                }
            }
            obj.colorData = colorData;
        }

        return obj;
    },
    loadGame(data) {
        if (data.shapeGrid) {
            store.commit('gallery/updateKey', {key: 'shapeGrid', value: data.shapeGrid});
        }
        if (data.inspirationTime) {
            store.commit('gallery/updateKey', {key: 'inspirationTime', value: data.inspirationTime});
        }
        if (data.inspirationAmount) {
            store.commit('gallery/updateKey', {key: 'inspirationAmount', value: data.inspirationAmount});
        }
        if (data.hourglassCombo) {
            store.commit('gallery/updateKey', {key: 'hourglassCombo', value: data.hourglassCombo});
        }
        if (data.canvasSpace) {
            store.commit('gallery/updateKey', {key: 'canvasSpace', value: data.canvasSpace});
            let colors = {};
            data.canvasSpace.forEach(elem => {
                if (colors[elem] === undefined) {
                    colors[elem] = 0;
                }
                colors[elem]++;
            });
            for (const [key, elem] of Object.entries(colors)) {
                if (store.state.gallery.colorData[key] !== undefined) {
                    store.commit('gallery/updateColorDataKey', {name: key, key: 'cacheSpace', value: elem});
                }
            }
        }
        if (data.idea !== undefined) {
            for (const [key, elem] of Object.entries(data.idea)) {
                if (store.state.gallery.idea[key] !== undefined) {
                    store.commit('gallery/updateIdeaKey', {name: key, key: 'owned', value: true});
                    if (elem > 0) {
                        store.commit('gallery/updateIdeaKey', {name: key, key: 'level', value: elem});
                        store.dispatch('gallery/applyIdea', {name: key});
                    }
                }
            }
        }
        if (data.colorData !== undefined) {
            for (const [key, elem] of Object.entries(data.colorData)) {
                if (store.state.gallery.colorData[key] !== undefined) {
                    if (elem > 0) {
                        store.commit('gallery/updateColorDataKey', {name: key, key: 'progress', value: elem});
                        if (elem >= 1) {
                            store.dispatch('gallery/applyCanvasLevel', {name: key});
                        }
                    }
                }
            }
        }
    }
}
