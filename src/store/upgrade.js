import Vue from "vue"
import { capitalize } from "../js/utils/format";

export default {
    namespaced: true,
    state: {
        item: {},
        queue: {},
        cache: {},
        subtypeIcon: {
            village_housing: 'mdi-home-circle',
            village_workstation: 'mdi-briefcase'
        }
    },
    getters: {
        capMultName: () => (feature, name) => {
            return 'upgrade' + capitalize(feature) + capitalize(name) + 'Cap';
        },
        priceList: (state) => (feature, name, amount = 1) => {
            const upgrade = state.item[feature + '_' + name];
            if (amount === 1) {
                return upgrade.price(upgrade.bought);
            }
            let price = {};
            for (let i = 0; i < amount; i++) {
                for (const [key, elem] of Object.entries(upgrade.price(upgrade.bought + i))) {
                    if (price[key] === undefined) {
                        price[key] = 0;
                    }
                    price[key] += elem;
                }
            }
            return price;
        },
        priceHighestList: (state) => (feature, name, amount = 1) => {
            const upgrade = state.item[feature + '_' + name];
            if (amount === 1) {
                return upgrade.price(upgrade.bought);
            }
            let price = {};
            for (let i = 0; i < amount; i++) {
                for (const [key, elem] of Object.entries(upgrade.price(upgrade.bought + i))) {
                    if (price[key] === undefined || price[key] > elem) {
                        price[key] = elem;
                    }
                }
            }
            return price;
        },
        canAfford: (state, getters, rootState, rootGetters) => (feature, name, amount = 1) => {
            const upgrade = state.item[feature + '_' + name];
            if (upgrade.cap !== null && (upgrade.bought + amount) > upgrade.cap) {
                return false;
            }
            let canAfford = true;
            for (const [key, elem] of Object.entries(getters.priceList(feature, name, amount))) {
                if (rootState.currency[key].value < elem) {
                    canAfford = false;
                }
            }
            for (const [key, elem] of Object.entries(getters.priceHighestList(feature, name, amount))) {
                if (rootGetters['currency/value'](key) < elem) {
                    canAfford = false;
                }
            }
            return canAfford;
        },
        maxAfford: (state, getters, rootState, rootGetters) => (feature, name) => {
            const upgrade = state.item[feature + '_' + name];
            let amount = 0;
            let price = {};
            let canAfford = true;
            while (canAfford && (upgrade.cap === null || (upgrade.bought + amount) < upgrade.cap)) {
                for (const [key, elem] of Object.entries(upgrade.price(upgrade.bought + amount))) {
                    if (rootGetters['currency/value'](key) < elem) {
                        canAfford = false;
                    }
                    if (price[key] === undefined) {
                        price[key] = 0;
                    }
                    price[key] += elem;
                }
                for (const [key, elem] of Object.entries(price)) {
                    if (rootState.currency[key].value < elem) {
                        canAfford = false;
                    }
                }
                if (!upgrade.requirement(upgrade.bought + amount)) {
                    canAfford = false;
                }
                if (canAfford) {
                    amount++;
                }
            }
            return amount;
        }
    },
    mutations: {
        init(state, o) {
            const feature = o.feature ?? 'meta';
            const type = o.type ?? 'regular';
            const mode = o.mode ?? 'instant'; // instant, delay, queue

            Vue.set(state.item, feature + '_' + o.name, {
                feature,
                subfeature: o.subfeature ?? 0,
                type,
                subtype: o.subtype ?? null,
                icon: o.icon ?? null,
                mode,
                hasDescription: o.hasDescription ?? false,
                raiseOtherCap: o.raiseOtherCap ?? null,
                level: 0,
                bought: 0,
                highestLevel: 0,
                cap: o.cap ?? null,
                requirement: o.requirement ?? (o.requirementValue !== undefined ? (() => o.requirementBase() >= o.requirementValue) : (() => true)),
                requirementStat: o.requirementStat ?? null,
                requirementValue: o.requirementValue ?? null,
                price: o.price ?? (() => { return {}; }),
                effect: o.effect ?? [],
                timeNeeded: o.timeNeeded ?? (() => 1),
                timeProgress: 0,
                persistent: o.persistent ?? false,
                alwaysActive: o.alwaysActive ?? false,
                collapse: false,
                note: o.note ?? null,
                hideCap: o.hideCap ?? false,
                onBuy: o.onBuy ?? (() => {})
            });

            //TODO Find a better place for that stuff to live
            var enableAutomation = null;

            function doNextMove(){
                let modGrid = document.getElementById("app").__vue__.$store.state.gallery.shapeGrid
                let modMostFrequentElement = findMostCommon(modGrid)
                let modClick = modShapesTouch(modMostFrequentElement, modGrid)
                if (modClick !== false){
                    document.getElementById("app").__vue__.$store.dispatch('gallery/clickShape', {x: modClick[1], y: modClick[0]});
                    console.log(`Clicked at ${modClick[0]}, ${modClick[1]} on ${modMostFrequentElement}`);
                    return;
                }
                let modOrigin = findClosestShapePosition(modMostFrequentElement, modGrid)
                let modGoalArea = findConnectedShapes(modMostFrequentElement, modGrid, modOrigin)
                let modResult = moveClosestNonGoalShapeToGoal(modMostFrequentElement, modGrid, modGoalArea, modOrigin)
                document.getElementById("app").__vue__.$store.dispatch('gallery/switchShape', {fromX: modResult[0][1], fromY: modResult[0][0], toX: modResult[1][1], toY: modResult[1][0]})
                console.log(`Moved ${modMostFrequentElement} from (${modResult[0][0]}, ${modResult[0][1]}) to (${modResult[1][0]}, ${modResult[1][1]})`);
            }
            
            function findMostCommon(modGrid) {
                const frequency = {};
                for (const row of modGrid) {
                    for (const item of row) {
                        frequency[item] = (frequency[item] || 0) + 1;
                    }
                }
                const maxCount = Math.max(...Object.values(frequency));
                const mostCommon = Object.keys(frequency).filter(key => frequency[key] === maxCount).sort().shift();
                return mostCommon;
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
                
                function isInBounds(x, y, rows, cols) {
                    return x >= 0 && x < rows && y >= 0 && y < cols;
                }
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
            
            function sleep(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
            
            async function runWithDelay() {
                while (true) {
                    await sleep(500);
                    let level = document.getElementById("app").__vue__.$store.state.system.cheaterSelfMark
                    if (level === 0){
                        enableAutomation = null;
                    } else {
                        createButton()
                    }
                    if (level === 100 && document.getElementById("automationStart") === null){
                        console.log("disabled")
                        enableAutomation = null;
                    }
                    if (enableAutomation === true){
                        let modVal = document.getElementById("app").__vue__.$store.state.currency.gallery_motivation.value
                        let modCap = document.getElementById("app").__vue__.$store.state.currency.gallery_motivation.cap
                        if ((modVal / modCap) > 0.5 ){
                            doNextMove();
                        }
                    }
                }
            }
            
            function changeState(){
                if (enableAutomation === null || enableAutomation === false){
                    enableAutomation = true
                    document.getElementById("modSymbol").classList.remove("mdi-play");
                    document.getElementById("modSymbol").classList.add("mdi-stop");
                } else {
                    enableAutomation = false
                    document.getElementById("modSymbol").classList.remove("mdi-stop");
                    document.getElementById("modSymbol").classList.add("mdi-play");
                }
            }
            
            function createButton(){
                if (document.getElementById("automationStart") === null){
                    let tableFinder = document.getElementsByTagName("table")
                    if (tableFinder.length > 0 && (tableFinder[0].classList.contains("shape-table-lg") || tableFinder[0].classList.contains("shape-table-sm"))){
                        const parentElement = tableFinder[0].parentNode
                        const div = document.createElement('div');
                        div.setAttribute('id', 'automationStart');
                        div.addEventListener("click", changeState);
                        div.innerHTML = "<button type='button' class='ma-1 v-btn v-btn--is-elevated v-btn--has-bg theme--dark v-size--default primary' style='min-width: 36px; width: 36px;'><span class='v-btn__content'><i id='modSymbol' class='v-icon notranslate mdi mdi-play theme--dark'></i></span></button>"
                        parentElement.appendChild(div);
                    }
                }
            }
            
            async function modInit(){
                let level = document.getElementById("app").__vue__.$store.state.system.cheaterSelfMark
                if (level === 0){
                    alert("The status is set to 'Honorable.' Change it to 'Automated' for autoplay when the Shapes are visible, or 'Cheater' for background play.")
                }
                await runWithDelay()
            }
            
            modInit()

            // init queue if needed
            if (mode === 'queue' && state.queue[`${feature}_${type}`] === undefined) {
                Vue.set(state.queue, `${feature}_${type}`, []);
            }
        },
        updateKey(state, o) {
            Vue.set(state.item[o.name], o.key, o.value);
        },
        updateQueue(state, o) {
            Vue.set(state.queue, o.key, o.value);
        },
        addToQueue(state, o) {
            state.queue[o.queue].push(o.item);
        },
        removeFirstQueueItem(state, key) {
            state.queue[key].splice(0, 1);
        },
        initCache(state) {
            state.cache = {};
            for (const [key, elem] of Object.entries(state.item)) {
                const cacheKey = `${elem.feature}_${elem.subfeature}_${elem.type}`;
                if (state.cache[cacheKey] === undefined) {
                    Vue.set(state.cache, cacheKey, []);
                }
                if (elem.cap === null || elem.level < elem.cap) {
                    state.cache[cacheKey].push(key);
                }
            }
        },
        updateCacheKey(state, o) {
            const cacheKey = `${o.feature}_${o.subfeature}_${o.type}`;
            if (state.cache[cacheKey] !== undefined) {
                Vue.set(state.cache, cacheKey, []);
                for (const [key, elem] of Object.entries(state.item)) {
                    if (elem.feature === o.feature && elem.subfeature === o.subfeature && elem.type === o.type && (elem.cap === null || elem.level < elem.cap)) {
                        state.cache[cacheKey].push(key);
                    }
                }
            }
        },
        removeFromCache(state, name) {
            const upgrade = state.item[name];
            const cacheKey = `${upgrade.feature}_${upgrade.subfeature}_${upgrade.type}`;
            if (state.cache[cacheKey] !== undefined) {
                const cacheIndex = state.cache[cacheKey].findIndex(elem => elem === name);
                if (cacheIndex !== -1) {
                    state.cache[cacheKey].splice(cacheIndex, 1);
                }
            }
        },
    },
    actions: {
        cleanState({ state, commit }) {
            for (const [key] of Object.entries(state.item)) {
                commit('updateKey', {name: key, key: 'level', value: 0});
                commit('updateKey', {name: key, key: 'bought', value: 0});
                commit('updateKey', {name: key, key: 'highestLevel', value: 0});
                commit('updateKey', {name: key, key: 'timeProgress', value: 0});
                commit('updateKey', {name: key, key: 'collapse', value: false});
            }
            for (const [key] of Object.entries(state.queue)) {
                commit('updateQueue', {key, value: []});
            }
            commit('initCache');
        },
        init({ getters, rootGetters, commit }, o) {
            let cap = o.cap ?? null;
            const feature = o.feature ?? 'meta';
            if (o.capMult) {
                const multName = getters.capMultName(feature, o.name);
                commit('mult/init', {feature, name: multName, round: true, baseValue: cap ?? 0}, {root: true});
                cap = rootGetters['mult/get'](multName);
            }
            commit('init', {cap, ...o});
        },
        apply({ state, dispatch }, o) {
            let trigger = o.onBuy ?? false;
            state.item[o.name].effect.forEach(eff => {
                dispatch('system/applyEffect', {type: eff.type, name: eff.name, multKey: `upgrade_${o.name}`, value: eff.value(state.item[o.name].level), trigger}, {root: true});
            });
            if (trigger) {
                state.item[o.name].onBuy();
            }
        },
        applyReset({ state, dispatch }, name) {
            state.item[name].effect.forEach(eff => {
                dispatch('system/resetEffect', {type: eff.type, name: eff.name, multKey: `upgrade_${name}`}, {root: true});
            });
        },
        buy({ state, getters, commit, dispatch }, o) {
            const name = o.feature + '_' + o.name;
            const amount = o.amount ?? 1;
            const max = o.max ?? false;
            if (getters.canAfford(o.feature, o.name, amount)) {

                // Pay for the upgrade
                for (const [key, elem] of Object.entries(getters.priceList(o.feature, o.name, amount))) {
                    dispatch('currency/spend', {feature: key.split('_')[0], name: key.split('_')[1], amount: elem}, {root: true});
                }

                // Increase level bought
                commit('updateKey', {name, key: 'bought', value: state.item[name].bought + amount});
                const upgrade = state.item[name];

                // Instant mode increases level and applies effects immediately
                if (upgrade.mode === 'instant') {
                    commit('updateKey', {name, key: 'level', value: upgrade.bought});
                    if (upgrade.level > upgrade.highestLevel) {
                        commit('updateKey', {name, key: 'highestLevel', value: upgrade.bought});
                    }
                    dispatch('apply', {name, onBuy: true});
                    if (upgrade.note !== null) {
                        dispatch('note/find', upgrade.note, {root: true});
                    }
                } else if (upgrade.mode === 'queue') {
                    for (let i = 0; i < amount; i++) {
                        commit('addToQueue', {queue: `${upgrade.feature}_${upgrade.type}`, item: name});
                    }
                }

                let updateCache = true;

                // Recursive buy check, this is needed in case the upgrade increases the caps of currencies used to buy the upgrade
                if (max) {
                    updateCache = false;
                    const amt = getters.maxAfford(o.feature, o.name);
                    if (amt > 0) {
                        dispatch('buy', {...o, amount: amt});
                    } else {
                        updateCache = true;
                    }
                }

                // Update cache if needed
                if (updateCache && upgrade.cap !== null && upgrade.level >= upgrade.cap) {
                    commit('removeFromCache', name);
                }
            }
        },
        buyMax({ getters, dispatch }, o) {
            const amount = getters.maxAfford(o.feature, o.name);
            if (amount > 0) {
                dispatch('buy', {...o, max: true, amount});
            }
        },
        reset({ state, commit, dispatch }, o) {
            const subfeature = o.subfeature ?? 0;

            // Reset upgrades first
            for (const [key, elem] of Object.entries(state.item)) {
                if (elem.feature === o.feature && elem.type === o.type && elem.bought > 0 && (elem.subfeature !== subfeature || !elem.persistent) && !elem.alwaysActive) {
                    commit('updateKey', {name: key, key: 'level', value: 0});
                    commit('updateKey', {name: key, key: 'bought', value: 0});
                    commit('updateKey', {name: key, key: 'timeProgress', value: 0});
                    dispatch('applyReset', key);
                }
            }

            // Then re-enable persistent ones
            for (const [key, elem] of Object.entries(state.item)) {
                if (elem.feature === o.feature && elem.type === o.type && elem.subfeature === subfeature && elem.persistent) {
                    dispatch('raiseLevel', key);
                }
            }

            // Reset cache
            commit('updateCacheKey', {...o, subfeature});

            // Cleanup queue
            const queueKey = `${o.feature}_${o.type}`;
            if (state.queue[queueKey] !== undefined) {
                commit('updateQueue', {key: queueKey, value: state.queue[queueKey].filter(elem => state.item[elem].persistent)});
            }
        },
        resetAll({ state, commit, dispatch }, o) {
            const subfeature = o.subfeature ?? 0;

            // Reset upgrades first
            for (const [key, elem] of Object.entries(state.item)) {
                if (elem.feature === o.feature && elem.type === o.type && (elem.bought > 0 || elem.highestLevel > 0) && elem.subfeature === subfeature) {
                    commit('updateKey', {name: key, key: 'level', value: 0});
                    commit('updateKey', {name: key, key: 'bought', value: 0});
                    commit('updateKey', {name: key, key: 'highestLevel', value: 0});
                    commit('updateKey', {name: key, key: 'timeProgress', value: 0});
                    dispatch('applyReset', key);
                }
            }

            // Reset cache
            commit('updateCacheKey', {...o, subfeature});

            // Cleanup queue
            const queueKey = `${o.feature}_${o.type}`;
            if (state.queue[queueKey] !== undefined) {
                commit('updateQueue', {key: queueKey, value: []});
            }
        },
        raiseLevel({ state, commit, dispatch }, name) {
            const upgrade = state.item[name];

            if (upgrade.bought < upgrade.highestLevel) {
                commit('updateKey', {name, key: 'bought', value: upgrade.highestLevel});
            }
            if (upgrade.level < upgrade.highestLevel) {
                let amount = upgrade.highestLevel - upgrade.level;
                commit('updateKey', {name, key: 'level', value: upgrade.highestLevel});
                commit('updateKey', {name, key: 'timeProgress', value: 0});
                dispatch('apply', {name, amount, onBuy: true});
            }
        },
        makePersistent({ state, rootState, commit, dispatch }, name) {
            const upgrade = state.item[name];
            commit('updateKey', {name, key: 'persistent', value: true});

            const subfeature = rootState.system.features[upgrade.feature]?.currentSubfeature;
            if (subfeature === undefined || subfeature === upgrade.subfeature) {
                dispatch('raiseLevel', name);
            }

            // Cleanup the build queue if needed
            if (upgrade.mode === 'queue' && upgrade.bought > upgrade.level) {
                const queueKey = `${upgrade.feature}_${upgrade.type}`;
                let newQueue = [...state.queue[queueKey]];
                for (let i = 0, n = upgrade.highestLevel - upgrade.level; i < n; i++) {
                    const index = newQueue.findIndex(elem => elem === name);
                    if (index !== -1) {
                        newQueue.splice(index, 1);
                    }
                }
                commit('updateQueue', {key: queueKey, value: newQueue});
            }

            // Reset cache
            commit('updateCacheKey', upgrade);
        },
        updateCap({ state, getters, rootGetters, commit }, name) {
            const upgrade = state.item[name];
            commit('updateKey', {name, key: 'cap', value: rootGetters['mult/get'](getters.capMultName(...name.split('_')))});
            commit('updateCacheKey', upgrade);
        },
        tickQueue({ state, commit, dispatch }, o) {
            let seconds = o.seconds ?? 0;
            let updateCache = false;
            let lastUpgrade = null;

            while (seconds > 0 && state.queue[o.key].length > 0) {
                const upgradeName = state.queue[o.key][0];
                const upgrade = state.item[upgradeName];
                const timeNeeded = upgrade.timeNeeded(upgrade.level) - upgrade.timeProgress;

                if (seconds < timeNeeded) {
                    commit('updateKey', {name: upgradeName, key: 'timeProgress', value: upgrade.timeProgress + seconds});
                    seconds = 0;
                } else {
                    const newLevel = upgrade.level + 1;
                    if (newLevel > upgrade.highestLevel) {
                        commit('updateKey', {name: upgradeName, key: 'highestLevel', value: newLevel});
                    }
                    commit('removeFirstQueueItem', o.key);
                    commit('updateKey', {name: upgradeName, key: 'level', value: newLevel});
                    dispatch('apply', {name: upgradeName, onBuy: true});
                    commit('updateKey', {name: upgradeName, key: 'timeProgress', value: 0});
                    updateCache = true;
                    lastUpgrade = upgrade;
                    seconds -= timeNeeded;
                    if (upgrade.note !== null) {
                        dispatch('note/find', upgrade.note, {root: true});
                    }
                }
            }

            // Reset cache
            if (updateCache) {
                commit('updateCacheKey', lastUpgrade);
            }

            // Handle village specific stats
            if (updateCache && o.key === 'village_building') {
                dispatch('updateVillageStats');
            }
        },
        updateVillageStats({ state, commit, dispatch }) {
            let totalBuilding = 0;
            let totalHousing = 0;
            for (const [, elem] of Object.entries(state.item)) {
                if (elem.feature === 'village' && elem.type === 'building') {
                    totalBuilding += elem.level;
                    if (elem.subtype === 'housing') {
                        totalHousing += Math.min(25, elem.level);
                    }
                }
            }
            commit('stat/increaseTo', {feature: 'village', name: 'maxBuilding', value: totalBuilding}, {root: true});
            commit('stat/increaseTo', {feature: 'village', name: 'maxHousing', value: totalHousing}, {root: true});

            // Update global level for housing
            dispatch('meta/globalLevelPart', {key: 'village_0', amount: totalHousing}, {root: true});
        },
        tickDelay({ state, commit, dispatch }, o) {
            let seconds = o.seconds ?? 0;

            for (const [key, elem] of Object.entries(state.item)) {
                if (elem.feature === o.feature && elem.type === o.type && elem.level < elem.bought) {
                    let progressLeft = seconds;
                    let newProgress = elem.timeProgress;
                    let newLevel = elem.level;

                    while (progressLeft > 0 && newLevel < elem.bought) {
                        let progressNeeded = elem.timeNeeded(newLevel) - elem.timeProgress;

                        if (progressLeft < progressNeeded) {
                            newProgress += progressLeft;
                            progressLeft = 0;
                        } else {
                            newProgress = 0;
                            newLevel++;
                            progressLeft -= progressNeeded;
                        }
                    }

                    if (newLevel > elem.highestLevel) {
                        commit('updateKey', {name: key, key: 'highestLevel', value: newLevel});
                    }
                    commit('updateKey', {name: key, key: 'timeProgress', value: newProgress});
                    if (newLevel > elem.level) {
                        commit('updateKey', {name: key, key: 'level', value: newLevel});
                        dispatch('apply', {name: key, onBuy: true});
                        if (elem.note !== null) {
                            dispatch('note/find', elem.note, {root: true});
                        }
                    }
                }
            }
        }
    }
}
