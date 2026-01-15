const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 1 = Wall, 0 = Empty Tunnel
const MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,1,1,1,1,1,1,0,1,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,1,0,0,1],
    [1,0,0,0,1,1,1,0,1,1,1,0,1,1,0,1],
    [1,0,1,0,1,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,1,0,1,0,1,1,1,0,1,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const TILE_SIZE = 64;
const FOV = Math.PI / 3;

let player = {
    x: 96, y: 96, dir: 0,
    hp: 100, speed: 2.2, rotSpeed: 0.06
};

let enemies = [{ x: 400, y: 200, type: 'app' }];
let items = [{ x: 200, y: 300, type: 'chips' }];
let keys = {};

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
canvas.addEventListener('mousedown', shoot);

function shoot() {
    if (player.hp <= 0) return;
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        let dx = e.x - player.x;
        let dy = e.y - player.y;
        let angleToEnemy = Math.atan2(dy, dx);
        let angleDiff = angleToEnemy - player.dir;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        if (Math.abs(angleDiff) < 0.2 && dist < 500) {
            const spawnX = e.x;
            const spawnY = e.y;
            enemies.splice(i, 1);
            for(let j=0; j<2; j++) {
                enemies.push({
                    x: spawnX + (Math.random() * 60 - 30),
                    y: spawnY + (Math.random() * 60 - 30),
                    type: 'app'
                });
            }
            break;
        }
    }
}

function update() {
    if (player.hp <= 0) return;

    let moveX = 0;
    let moveY = 0;
    if (keys['w']) {
        moveX += Math.cos(player.dir) * player.speed;
        moveY += Math.sin(player.dir) * player.speed;
    }
    if (keys['s']) {
        moveX -= Math.cos(player.dir) * player.speed;
        moveY -= Math.sin(player.dir) * player.speed;
    }
    if (keys['a']) player.dir -= player.rotSpeed;
    if (keys['d']) player.dir += player.rotSpeed;

    if (MAP[Math.floor(player.y / TILE_SIZE)][Math.floor((player.x + moveX) / TILE_SIZE)] === 0) player.x += moveX;
    if (MAP[Math.floor((player.y + moveY) / TILE_SIZE)][Math.floor(player.x / TILE_SIZE)] === 0) player.y += moveY;

    enemies.forEach(e => {
        let dx = player.x - e.x;
        let dy = player.y - e.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        e.x += (dx/dist) * 1.2;
        e.y += (dy/dist) * 1.2;
        if (dist < 25) {
            player.hp -= 0.3;
            if (player.hp <= 0) document.getElementById('death-screen').style.display = 'flex';
        }
    });

    items.forEach((item, index) => {
        let dist = Math.sqrt((player.x-item.x)**2 + (player.y-item.y)**2);
        if (dist < 30) {
            player.hp = Math.min(100, player.hp + 25);
            items.splice(index, 1);
            setTimeout(() => {
                items.push({ x: Math.random() * 800 + 100, y: Math.random() * 400 + 100, type: 'chips'});
            }, 4000);
        }
    });

    document.getElementById('hp').innerText = Math.ceil(player.hp);
    document.getElementById('count').innerText = enemies.length;
}

function draw() {
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, canvas.width, canvas.height/2);
    ctx.fillStyle = '#111'; ctx.fillRect(0, canvas.height/2, canvas.width, canvas.height/2);

    const numRays = 120;
    for (let i = 0; i < numRays; i++) {
        let rayAngle = (player.dir - FOV/2) + (i / numRays) * FOV;
        let dist = 0;
        let hit = false;
        while (!hit && dist < 1000) {
            dist += 2;
            let tx = Math.floor((player.x + Math.cos(rayAngle) * dist) / TILE_SIZE);
            let ty = Math.floor((player.y + Math.sin(rayAngle) * dist) / TILE_SIZE);
            if (MAP[ty][tx] === 1) hit = true;
        }
        let correctedDist = dist * Math.cos(rayAngle - player.dir);
        let h = (TILE_SIZE * canvas.height) / correctedDist;
        let shade = Math.min(180, 200 - correctedDist/4);
        ctx.fillStyle = `rgb(0, ${shade}, 50)`;
        ctx.fillRect(i * (canvas.width/numRays), (canvas.height - h)/2, (canvas.width/numRays) + 1, h);
    }

    let sprites = [...enemies, ...items].sort((a,b) => {
        let d1 = Math.sqrt((player.x-a.x)**2 + (player.y-a.y)**2);
        let d2 = Math.sqrt((player.x-b.x)**2 + (player.y-b.y)**2);
        return d2 - d1;
    });

    sprites.forEach(s => {
        let dx = s.x - player.x;
        let dy = s.y - player.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        let angle = Math.atan2(dy, dx) - player.dir;
        while (angle < -Math.PI) angle += Math.PI * 2;
        while (angle > Math.PI) angle -= Math.PI * 2;

        if (Math.abs(angle) < FOV) {
            let screenX = (0.5 * (angle / (FOV/2)) + 0.5) * canvas.width;
            let size = (TILE_SIZE * canvas.height) / dist;
            
            if (s.type === 'app') {
                let appW = size * 0.6;
                let appH = size * 0.8;
                let topY = canvas.height/2 - appH/2;
                let leftX = screenX - appW/2;
                ctx.fillStyle = 'white';
                ctx.fillRect(leftX, topY, appW, appH);
                ctx.fillStyle = 'black';
                ctx.font = `bold ${size/18}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText("JOB APPLICATION", screenX, topY + size/12);


                ctx.fillStyle = '#dae8fc';
                ctx.fillRect(leftX + 2, topY + size/6, appW - 4, size/25);
                ctx.fillRect(leftX + 2, topY + size/2.3, appW - 4, size/25);
                ctx.fillRect(leftX + 2, topY + size/1.4, appW - 4, size/25);
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 1;
                for(let i=0; i<10; i++) {
                    let lineY = topY + size/4 + (i * size/18);
                    if (lineY > topY + size/2.4 && lineY < topY + size/2.1) continue;
                    if (lineY > topY + size/1.45 && lineY < topY + size/1.3) continue;

                    ctx.beginPath();
                    ctx.moveTo(leftX + 5, lineY);
                    ctx.lineTo(leftX + appW - 5, lineY);
                    ctx.stroke();
                }
                ctx.textAlign = 'left';

            } else {
                let bagW = size / 3;
                let bagH = size / 2.2;
                let bagY = canvas.height/2 + size/10;
                ctx.fillStyle = '#FF4500'; 
                ctx.fillRect(screenX - bagW/2, bagY, bagW, bagH);
                ctx.fillStyle = '#D22B2B';
                ctx.fillRect(screenX - bagW/2 - 2, bagY, bagW + 4, bagH/6);
                ctx.fillRect(screenX - bagW/2 - 2, bagY + bagH - bagH/8, bagW + 4, bagH/8);
                ctx.fillStyle = 'yellow';
                ctx.font = `bold ${size/15}px Arial`;
                ctx.fillText("CHIPS", screenX - bagW/3, bagY + bagH/1.8);
            }
        }
    });
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}
gameLoop();
