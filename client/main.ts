import * as s from "./sprite";

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

    ws.onclose = () => console.error("Web socket closed!");

    ws.onmessage = (e: MessageEvent) => {
        const msgObj: IdObj | GameStateObj = JSON.parse(e.data);
        // console.log("RECEIVED:", msgObj);

        const { playerId } = msgObj as IdObj;
        playerId && sprite.setPlayerId(playerId);

        const { players } = msgObj as GameStateObj;
        if (players) {
            gameState = msgObj as GameStateObj;
        }
    };

    ws.onopen = () => console.log("Connected");

    addEventListener("keydown", (e) => sprite.input(e.key, true));
    addEventListener("keyup", (e) => sprite.input(e.key, false));

    await waitFor(200, () => sprite.playerId && !!gameState);

    gameLoop();
}

function waitFor(durationMs: number, have: () => boolean) {
    return new Promise((resolve) => {
        function check() {
            // @ts-ignore
            have() && resolve();
            setTimeout(check, durationMs);
        }
        check();
    });
}

function sendGameEvent(ws: WebSocket, sprite: s.Sprite) {
    // TODO: every 10 seconds, if there's no message to send, ping the server
    const { playerId, inputState } = sprite;
    const timestampMs = Date.now();
    ws.send(JSON.stringify({ timestampMs, playerId, inputState }) + "\n");
    // console.log("sent at: ", String(timestampMs).slice(9));
}

async function gameLoop() {
    // // TODO: will this work? can i call an async function from re
    // if (ws.readyState !== ws.OPEN) {
    //     await waitForPlayerId(() => !!sprite.playerId);
    // }

    // NOTE: This appears incorrect, because we're not ackowledging key ups,
    // but the server adjusts player position per event. If everything was
    // false, the server wouldn't move the player anyway.
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
