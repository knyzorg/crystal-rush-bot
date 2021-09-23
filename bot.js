/**
 * Deliver more ore to hq (left side of the map) than your opponent. Use radars to find ore but beware of traps!
 **/

var inputs = readline().split(' ');
const width = parseInt(inputs[0]);
const height = parseInt(inputs[1]); // size of the map
const oreCache = Array(15).fill(0).map(() => Array(30));

const FAKE_ORE = {
    x: Infinity,
    y: Infinity
}

function getDistance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function findNearest(start, coords) {
    let target = FAKE_ORE;
    for (let end of coords) {
        const newDistance = getDistance(start, end);
        const oldDistance = getDistance(start, target);
        if (newDistance < oldDistance) target = end;
    }

    return target;
}
const radarSpots = [];
for (let x = 4; x < width; x += 6) {
    for (let y = 3; y < height; y += 6) {
        radarSpots.push({
            x, y
        })
    }
}

// game loop
while (true) {
    var inputs = readline().split(' ');
    const myScore = parseInt(inputs[0]); // Amount of ore delivered
    const opponentScore = parseInt(inputs[1]);
    const bots = [];
    const entities = [];


    const ores = []
    let holes = [];
    for (let y = 0; y < height; y++) {
        var inputs = readline().split(' ');
        for (let x = 0; x < width; x++) {
            const ore = inputs[2 * x];// amount of ore or "?" if unknown
            const hole = parseInt(inputs[2 * x + 1]);// 1 if cell has a hole


            if (hole) holes.push({
                x: x,
                y: y
            });

            if (ore != '?')
                oreCache[y][x] = ore;

            if (ore != '?' && ore != 0) {
                ores.push({
                    x: x,
                    y: y,
                    ore
                })
            }
        }
    }
    console.error(ores);
    //console.error(oreCache);
    var inputs = readline().split(' ');
    const entityCount = parseInt(inputs[0]); // number of entities visible to you
    const radarCooldown = parseInt(inputs[1]); // turns left until a new radar can be requested
    const trapCooldown = parseInt(inputs[2]); // turns left until a new trap can be requested
    // console.error("cooldowns", radarCooldown, trapCooldown);
    for (let i = 0; i < entityCount; i++) {
        var inputs = readline().split(' ');
        const entityId = parseInt(inputs[0]); // unique id of the entity
        const entityType = parseInt(inputs[1]); // 0 for your robot, 1 for other robot, 2 for radar, 3 for trap
        const x = parseInt(inputs[2]);
        const y = parseInt(inputs[3]); // position of the entity
        const item = parseInt(inputs[4]); // if this entity is a robot, the item it is carrying (-1 for NONE, 2 for RADAR, 3 for TRAP, 4 for ORE)


        entities.push({ entityId, entityType, x, y, item })
        if (entityType == 0)
            bots.push({
                x, y, item, entityId
            })
    }

    const remainingOres = new Set(ores);
    const emptyRadars = new Set(radarSpots.filter(s => !holes.find(h => h.x == s.x && h.y == s.y)));
    let radarAvailable = radarCooldown == 0;
    for (let { x, y, item, entityId } of bots) {
        // if (entityId != 0) { console.log("WAIT"); continue; }

        if (x == 0 && radarAvailable) {
            console.log("REQUEST RADAR");
            radarAvailable = false;
            continue;
        }

        // nowhere to place radar
        if (!emptyRadars.size && item == 2) {
            console.error("Nowhere to place radar, going to dig")
            item = -1
        };
        switch (item) {
            case -1:
                console.error("Empty-handed, go do work");
                let target = findNearest({x,y}, remainingOres);
                console.error("Selected orr", target);
                if (target == FAKE_ORE) {
                    console.error("Get a radar");
                    console.log(`MOVE 0 ${y}`);
                } else {
                    console.error("Go dig");
                    if (--target.ore == 0)
                        remainingOres.delete(target);
                    console.log(`DIG ${target.x} ${target.y}`);
                }
                break;
            case 2:
                console.error("Has Radar, go bury it");
                const { value: spot } = emptyRadars.values().next();
                console.log(`DIG ${spot.x} ${spot.y}`);
                emptyRadars.delete(spot);
                break;
            case 3:
                console.error("Has trap, go bury it");
                break;
            case 4:
                console.error("has crystal, bring it home");
                console.log(`MOVE 0 ${y}`);
                break;
        }
    }
}
