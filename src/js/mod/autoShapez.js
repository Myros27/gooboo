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

async function init(){
	let level = document.getElementById("app").__vue__.$store.state.system.cheaterSelfMark
	if (level === 0){
		alert("The status is set to 'Honorable.' Change it to 'Automated' for autoplay when the Shapes are visible, or 'Cheater' for background play.")
	}
	await runWithDelay()
}

init()
