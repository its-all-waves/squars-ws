import * as s from "./sprite";

type Players = Record<s.PlayerId, s.Player>; // part of gameState received from server

let field: HTMLDivElement; // the field on which the game is played
let sprite: s.Sprite; // represents this player
const sprites: Record<s.PlayerId, s.Sprite> = {}; // local representation of gameState.players
let gameState: GameState;

const ws = new WebSocket("ws://" + document.location.host + "/ws");

async function main() {
    field = document.getElementById("field") as HTMLDivElement;
    sprite = new s.Sprite({ field });

    console.log("Connecting to websocket...");

    ws.onopen = () => console.log("Connected");
    ws.onclose = () => console.error("Web socket closed!");
    ws.onmessage = onMessage;

    addEventListener("keydown", (e) => sprite.input(e.key, true));
    addEventListener("keyup", (e) => sprite.input(e.key, false));

    await waitFor(200, () => sprite.playerId && !!gameState);

    gameLoop();
}

type PlayerId = { playerId: s.PlayerId };
type GameState = { players: Players };
type Message = {
    msgType: string;
    payload: PlayerId | GameState;
};

function onMessage(e: MessageEvent) {
    const messages = e.data.split("\n");

    for (let i = 0; i < messages.length; i++) {
        const msg: Message = JSON.parse(messages[i]);
        // console.log("RECEIVED:", msg);

        const { msgType, payload } = msg;
        switch (msgType) {
            case "playerId": {
                const { playerId } = payload as PlayerId;
                sprite.setPlayerId(playerId);
                sprites[playerId] = sprite;
                break;
            }
            case "gState": {
                gameState = payload as GameState;
                break;
            }
        }
    }
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
    // DEBUG
    // console.log("sent at: ", String(timestampMs).slice(9));
}

async function gameLoop() {
    // NOTE: This appears incorrect, because we're not ackowledging key ups,
    // but the server adjusts player position per event. If everything was
    // false, the server wouldn't move the player anyway.
    const { up, down, left, right } = sprite.inputState;
    if (up || down || left || right) {
        sendGameEvent(ws, sprite);
    }

    const { players } = gameState;

    // remove sprites tied to players that no longer exist
    for (const playerId in sprites) {
        if (!(playerId in players)) {
            sprites[playerId].destroyHTML();
            delete sprites[playerId];
        }
    }

    // add a sprite for every new player
    for (const playerId in players) {
        const { id, x, y } = players[playerId];
        if (!(playerId in sprites)) {
            sprites[playerId] = new s.Sprite({ field, playerId: id, x, y });
            continue;
        }
        sprites[playerId].setPos(x, y);
    }

    requestAnimationFrame(gameLoop);
}

window.onload = main;
