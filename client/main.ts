import * as s from "./sprite";

const KEY_PRESS_TO_INPUT: Record<
    Partial<KeyboardEvent["key"]>,
    keyof s.InputState
> = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
};

type IdObj = { playerId: s.PlayerId };
type GameStateObj = { players: Players };
type Players = Record<s.PlayerId, s.Player>;

let sprite = new s.Sprite();
const ws = new WebSocket("ws://" + document.location.host + "/ws");
let gameState: GameStateObj;

async function main() {
    // DEBUG
    // window.sprite = sprite;

    // set up WS
    console.log("Connecting to websocket...");
    ws.onclose = function (e) {
        console.error("Web socket closed!");
    };
    ws.onmessage = function (e: MessageEvent) {
        const msgObj: IdObj | GameStateObj = JSON.parse(e.data);
        // console.log("RECEIVED:", msgObj);

        const { playerId } = msgObj as IdObj;
        playerId && sprite.setPlayerId(playerId);

        let { players } = msgObj as GameStateObj;
        if (players) {
            gameState = msgObj as GameStateObj;
        }
    };
    ws.onopen = function (e) {
        console.log("Connected");
    };

    addEventListener("keydown", (e) => {
        if (!(e.key in KEY_PRESS_TO_INPUT)) return;
        sprite.inputState[KEY_PRESS_TO_INPUT[e.key]] = true;
    });
    addEventListener("keyup", (e) => {
        if (!(e.key in KEY_PRESS_TO_INPUT)) return;
        sprite.inputState[KEY_PRESS_TO_INPUT[e.key]] = false;
    });
    gameLoop();
}

function sendGameEvent(ws: WebSocket, sprite: s.Sprite) {
    // TODO: every 10 seconds, if there's no message to send, ping the server
    const { playerId, inputState } = sprite;
    const timestampMs = Date.now();
    ws.send(JSON.stringify({ timestampMs, playerId, inputState }) + "\n");
    // console.log("sent at: ", String(timestampMs).slice(9));
}

function gameLoop() {
    const { up, down, left, right } = sprite.inputState;
    if (up || down || left || right) {
        sendGameEvent(ws, sprite);
    }
    if (gameState) {
        // TODO: update all player positions
        // FOR NOW: update just my position
        const { x, y } = gameState.players[sprite.playerId];
        sprite.setPos(x, y);
    }
    requestAnimationFrame(gameLoop);
}

window.onload = main;
