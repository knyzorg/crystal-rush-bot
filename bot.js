/**
 * Deliver more ore to hq (left side of the map) than your opponent. Use radars to find ore but beware of traps!
 **/

var inputs = readline().split(' ');
const width = parseInt(inputs[0]);
const height = parseInt(inputs[1]); // size of the map

const DUMMY_POSITION = {
    x: Infinity,
    y: Infinity
}


const allPositions = [];
for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
        allPositions.push({
            x, y
        });
    }
}

const radarSpots = [];
for (let x of [7, 11, 15, 19, 23, 28]) {
    for (let y of [3, 7, 11]) {
        radarSpots.push({ x, y })
    }
}

const getNeighbours = (x,y) => [
                    { x, y },
                    { x: x + 1, y },
                    { x: x - 1, y },
                    { x, y: y + 1 },
                    { x, y: y - 1 }
                ]
                    .filter(({ x, y }) => {
                        if (x < 0) return false;
                        if (x >= 30) return false;
                        if (y < 0) return false;
                        if (y >= 15) return false;
                        return true;
                    });

const oreGrid = Array(30).fill(0).map(() => Array(15).fill('?'));
const riskFactor = Array(30).fill(0).map(() => Array(15).fill(1));
const holeGrid = Array(30).fill(0).map(() => Array(15).fill(false));
const radarGrid = Array(30).fill(0).map(() => Array(15).fill(false));
const trapCache = new Map();
const dangerBot = new Set();
const waitBot = new Set();
let previousEnemyPositions = new Map();

let exploration = -1;

function getDistance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function findNearest(start, coords) {
    let target = DUMMY_POSITION;
    let currentRisk = Infinity;

    for (let end of coords) {
        const newDistance = getDistance(start, end);
        const newRisk = riskFactor[end.x][end.y];
        const oldRisk = currentRisk;
        const oldDistance = getDistance(start, target);

        // Priority 1: lower risk
        if (newRisk == Infinity) continue;
        if (newRisk < oldRisk) {
            target = end;
            currentRisk = newRisk;
            continue;
        };
        // Priority 2: not a hole, but previous one is but only if late game
        if (newRisk == oldRisk && !holeGrid[end.x][end.y] && holeGrid[target.x][target.y] && exploration < 15) {
            target = end;
            currentRisk = newRisk;
            continue;
        }
        // Priority 3: lowest distance
        if (newRisk == oldRisk && newDistance < oldDistance) {
            target = end;
            currentRisk = newRisk;
            continue;
        }
    }
    console.error("Picking", [...coords].length, "Chose", target, "with risk", currentRisk);
    return target;
}


radarSpots.sort((a, b) => Math.abs(15 - b.x) - Math.abs(15 - a.x))
// game loop
while (true) {
    var inputs = readline().split(' ');
    const myScore = parseInt(inputs[0]); // Amount of ore delivered
    const opponentScore = parseInt(inputs[1]);
    const bots = [];
    const enemies = [];
    const entities = [];

    const ores = []
    const changeGrid = Array(30).fill(0).map(() => Array(15).fill(false));

    for (let y = 0; y < height; y++) {
        var inputs = readline().split(' ');
        for (let x = 0; x < width; x++) {
            const ore = inputs[2 * x];// amount of ore or "?" if unknown
            const hole = parseInt(inputs[2 * x + 1]);// 1 if cell has a hole


            if (hole) {
                if (!holeGrid[x][y])
                    changeGrid[x][y] = true;
                holeGrid[x][y] = true
            }

            if (ore != '?') {
                if (oreGrid[x][y] != ore && oreGrid[x][y] != '?')
                    changeGrid[x][y] = true;
            } else {
                //console.error(`Unknown ore ${x} ${y}`)
            }
            oreGrid[x][y] = ore;
            if (ore == 0) {
                // Empty ore, probably no bomb
                riskFactor[x][y] = 1.5;
            }
            if (ore != '?' && ore != 0) {
                ores.push({
                    x: x,
                    y: y,
                    ore
                })
            }
        }
    }
    //console.error(oreCache);
    var inputs = readline().split(' ');
    const entityCount = parseInt(inputs[0]); // number of entities visible to you
    const radarCooldown = parseInt(inputs[1]); // turns left until a new radar can be requested
    const trapCooldown = parseInt(inputs[2]); // turns left until a new trap can be requested
    // console.error("cooldowns", radarCooldown, trapCooldown);
    const trapCurrentSet = new Set();
    for (let i = 0; i < entityCount; i++) {
        var inputs = readline().split(' ');
        const entityId = parseInt(inputs[0]); // unique id of the entity
        const entityType = parseInt(inputs[1]); // 0 for your robot, 1 for other robot, 2 for radar, 3 for trap
        const x = parseInt(inputs[2]);
        const y = parseInt(inputs[3]); // position of the entity
        const item = parseInt(inputs[4]); // if this entity is a robot, the item it is carrying (-1 for NONE, 2 for RADAR, 3 for TRAP, 4 for ORE)


        entities.push({ entityId, entityType, x, y, item })

        if (entityType == 3) {
            trapCache.set(entityId, { x, y })
            trapCurrentSet.add(entityId);
            riskFactor[x][y] = Infinity;
        }
        if (entityType == 2) {
            radarGrid[x][y] = true;
        }

        if (entityType == 0) {
            exploration = Math.max(exploration, x);
            bots.push({
                x, y, item, entityId
            })
        }

        // Enemy
        if (entityType == 1) {
            const { x: oldX, y: oldY } = previousEnemyPositions.get(entityId) || DUMMY_POSITION;
            previousEnemyPositions.set(entityId, { x, y });
            enemies.push({ x, y, entityId, deltaX: x - oldX, deltaY: y - oldY })
            // enemy down
            if (x == -1 && y == -1) continue;
            // has not moved
            if (oldX == x && oldY == y) {
                // Home-based, requested an item
                if (x == 0) {
                    console.error(entityId, "requested a trap?");
                    dangerBot.add(entityId);
                    continue;
                }
                if (!dangerBot.has(entityId)) {
                    console.error(entityId, "dug, but had no trap");
                    continue;
                }
                dangerBot.delete(entityId);
                console.error(entityId, "dug with a trap at", { x, y });

                const isRisky = (x, y) => holeGrid[x][y] && (changeGrid[x][y] || oreGrid[x][y] == '?')
                // taint the holes
                
                for (let {x: kx, y:ky} of getNeighbours(x,y)) {    
                    if (isRisky(kx, ky))
                        riskFactor[kx][ky]++;
                }
            }
        }
    }

    // Unmark broken EMPs
    for (let [entityId, { x, y }] of trapCache) {
        if (!trapCurrentSet.has(entityId)) {
            trapCache.delete(entityId);
            for (let { x: kx, y: ky } of getNeighbours(x,y)) {
                console.error("Detonated", { kx, ky }, "reset risk");
                riskFactor[kx][ky] = 1;
            }
        }
    }

    // KAMIKAZE MODULE
    const bombs = [];
    const markedBombs = new Set();

    for (let [x, line] of Object.entries(riskFactor)) {
        for (let [y, riskFactor] of Object.entries(line)) {
            if (riskFactor >= 2 && oreGrid[x][y] != 0 && oreGrid[x][y] != '?') {
                bombs.push({
                    x,
                    y,
                    wins: new Set(),
                    losses: new Set(),
                    certainty: riskFactor
                })
            }
        }
    }

    while (markedBombs.size != bombs.length)
        for (let bomb of bombs.filter(b => !markedBombs.has(b))) {
            if (markedBombs.has(bomb)) {
                continue;
            }
            markedBombs.add(bomb);
            const neighbours = bombs.filter(b => getDistance(bomb, b) == 1);
            const losses = bots.filter(bot => getDistance(bomb, bot) == 1);
            const wins = enemies.filter(bot => getDistance(bomb, bot) == 1);

            for (let win of wins)
                bomb.wins.add(win)

            for (let loss of losses)
                bomb.losses.add(loss)

            for (let neighbour of neighbours) {
                for (let win of bomb.wins) {
                    if (!neighbour.wins.has(win)) {
                        neighbour.wins.add(win)
                        markedBombs.delete(neighbour);
                    }
                }
                for (let loss of bomb.losses) {
                    if (!neighbour.losses.has(loss)) {
                        neighbour.losses.add(loss)
                        markedBombs.delete(neighbour);
                    }
                }
            }
        }

    const priorityBombs = bombs.filter(b => b.wins.size > b.losses.size && b.losses.size != 0)
    const priorityBotDetonations = new Map();
    for (let bomb of priorityBombs) {
        priorityBotDetonations.set(bomb.losses.values().next().value.entityId, bomb);
    }

    // Set of bombs bots not busy
    const optionalBombs = bombs.filter(b => b.wins.size == b.losses.size && b.losses.size != 0);
    for (let bomb of optionalBombs) {
        if ([...bomb.losses].every(bot => bot.item == -1) && [...bomb.wins].every(bot => bot.deltaX < 0))
            priorityBotDetonations.set(bomb.losses.values().next().value.entityId, bomb);
    }
    // console.error(JSON.stringify(priorityBombs, (key, value) => value instanceof Set ? [...value] : value));
    // console.error(JSON.stringify(bombs, (key, value) => value instanceof Set ? [...value] : value));
    // for (let bomb of bombs) {
    //     console.error("Printing bomb", { x: bomb.x, y: bomb.y });
    //     for (let win of bomb.wins) {
    //         console.error("WIN", win);
    //     }
    //     for (let loss of bomb.losses) {
    //         console.error("LOSS", loss);
    //     }
    // }
    // KAMIKAZE MODULE

    // Do not mine risky ore until exploration program doing well.
    const remainingOres = new Set(ores.filter(ore => riskFactor[ore.x][ore.y] == 1 || exploration >= 25));
    const emptyRadars = new Set(radarSpots.filter(s => !holeGrid[s.x][s.y]));
    let radarAvailable = radarCooldown == 0;
    let trapAvailable = trapCooldown == 0;

    const burnedEarlyDigs = new Set();
    // console.error("Remaining ores", remainingOres)
    // console.error(riskFactor);
    console.error("Risk factor of 16,11", riskFactor[16][11])
    for (let bot of bots) {
        const { x, y, item, entityId } = bot;
        // if (entityId != 0) { console.log("WAIT"); continue; }
        console.error("BOT: ", bot);
        if (x == -1 && y == -1) { console.log("WAIT"); continue; }

        const kamikaze = priorityBotDetonations.get(entityId);
        if (kamikaze) {
            let { x, y, wins, losses, certainty } = kamikaze;
            console.error("Kamikaze", { x: x, y: y });
            for (let win of wins) {
                console.error("WIN", win);
            }
            for (let loss of losses) {
                console.error("LOSS", loss);
            }
            console.log(`DIG ${x} ${y}`)

            // Only unmark if bomb certainly went off.
            if (certainty == Infinity)
                for (let { x: kx, y: ky } of getNeighbours(x,y)) {
                    console.error("Detonated", { kx, ky }, "reset risk");
                    riskFactor[kx][ky] = 1;
                }
            continue;
        }
        const earlyDigs = allPositions
            // Don't dig where it's pointless
            .filter(({ x, y }) => !holeGrid[x][y])
            .filter(({ x, y }) => riskFactor[x][y] == 1)
            // Don't dig empty ores
            .filter(({ x, y }) => oreGrid[x][y] == '?')
            // Dig closer to the middle
            .filter(({ x, y }) => x > 5)
            .filter(pos => !burnedEarlyDigs.has(pos));

        const backupDig = findNearest({ x, y }, earlyDigs);
        console.error("Selected backup", backupDig);

        if (backupDig == DUMMY_POSITION && remainingOres.size == 0 && item != 2) {
            console.error("No more digging available");
            console.log("WAIT");
            continue;
        }

        const undugOre = [...remainingOres].filter(({ x, y }) => !holeGrid[x][y]);
        // Home, pick up item
        if (x == 0 && item == -1) {

            if (radarAvailable) {
                console.log("REQUEST RADAR");
                radarAvailable = false;
                continue;
            }

            if (trapAvailable) { //&& undugOre.length && exploration > 15 /*&& myScore > opponentScore*/) {
                console.log("REQUEST TRAP");
                trapAvailable = false;
                continue;
            }

            // if (!waitBot.has(bot)) {
            //     waitBot.add(bot);
            //     console.log("WAIT");
            //     continue;
            // } else {
            //     waitBot.delete(bot);
            // }
        }


        switch (item) {
            case -1:
                {
                    console.error("Empty-handed, go do work");
                    let target = findNearest({ x, y }, undugOre.filter(({ ore, x, y }) => ore > 1 || !holeGrid[x][y]));
                    if (target == DUMMY_POSITION)
                        target = findNearest({ x, y }, remainingOres);
                    console.error("Selected orr", target);
                    if (target == DUMMY_POSITION) {
                        // Go get a radar if available, and nobody is on their way home
                        // AND is the clost one to home
                        const closestToHome = Math.min(...bots.map(b => b.x).filter(x => x != -1)) == x;
                        if (radarAvailable && !bots.find(b => b.item == 4) && closestToHome) {
                            console.error("No available digs, using but radar available");
                            console.log(`MOVE 0 ${y}`);
                            radarAvailable = false;
                            continue;
                        } else {
                            console.error("No available digs, using backup");
                            target = backupDig;
                            burnedEarlyDigs.add(backupDig);
                        }
                    }

                    if (target == DUMMY_POSITION) {
                        console.error("Backup failed. Waiting.")
                        console.log("WAIT");
                        continue;
                    }
                    console.error("Go dig");
                    // Uncomment if multiple digs desirable
                    if (--target.ore == 0)
                        remainingOres.delete(target);
                    console.log(`DIG ${target.x} ${target.y}`);
                    break;
                }
            case 2: {
                console.error("Has Radar, go bury it");
                let target = remainingOres.size < 10 ? findNearest({ x, y }, emptyRadars) : DUMMY_POSITION;
                if (target == DUMMY_POSITION) {
                    console.error("No available digs, using backup");
                    target = backupDig;
                    burnedEarlyDigs.add(backupDig);
                }
                if (target == DUMMY_POSITION) {
                    console.error("Backup failed -- go mine ore")
                    target = findNearest({ x, y }, remainingOres);
                }
                if (target == DUMMY_POSITION) {
                    console.error("Nowhere to put radar, give up");
                    console.log("WAIT");
                    continue;
                }
                console.log(`DIG ${target.x} ${target.y}`);
                emptyRadars.delete(target);
                break;
            }
            case 3: {
                console.error("Has trap, go bury it");
                let target = findNearest({ x, y }, undugOre.filter(({ ore }) => ore > 1));
                const fallback = findNearest({ x, y }, remainingOres);
                if (target == DUMMY_POSITION || riskFactor[target.x][target.y] > riskFactor[fallback.x][fallback.y]) target = fallback
                if (target == DUMMY_POSITION) {
                    console.error("No available digs, using backup");
                    target = backupDig;
                    burnedEarlyDigs.add(backupDig);
                }

                if (target == DUMMY_POSITION) {
                    console.error("Nowhere to put radar, give up");
                    console.log("WAIT");
                    continue;
                }
                console.error("Selected orr", target);
                console.error("Go dig");
                // Uncomment if multiple digs desirable
                // if (--target.ore == 0)
                remainingOres.delete(target);
                console.log(`DIG ${target.x} ${target.y}`);
                break;
            }
            case 4:
                {
                    console.error("has crystal, bring it home");
                    console.log(`MOVE 0 ${y}`);
                    break;
                }
        }
    }
}
