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

type IdMessage = { playerId: s.PlayerId };
type GameStateMessage = { players: Players };
type Players = Record<s.PlayerId, s.Player>;

async function main() {
    let sprite = new s.Sprite();

    // DEBUG
    // window.sprite = sprite;

    // set up WS
    console.log("Connecting to websocket...");
    const ws = new WebSocket("ws://" + document.location.host + "/ws");
    ws.onclose = function (e) {
        console.error("Web socket closed!");
    };
    ws.onmessage = function (e: MessageEvent) {
        const msgObj: IdMessage | GameStateMessage = JSON.parse(e.data);
        // console.log("RECEIVED:", msgObj);

        const { playerId } = msgObj as IdMessage;
        playerId && sprite.setPlayerId(playerId);

        let { players } = msgObj as GameStateMessage;
        if (players) {
            // TODO: update alll player positions
            // FOR NOW: update just my position
            const { x, y } = players[sprite.playerId];
            sprite.setPos(x, y);
        }
    };
    ws.onopen = function (e) {
        console.log("Connected");
    };

    addEventListener("keydown", (e) => {
        if (!(e.key in KEY_PRESS_TO_INPUT)) return;
        sprite.inputState[KEY_PRESS_TO_INPUT[e.key]] = true;
        sendGameEvent(ws, sprite);
    });
    addEventListener("keyup", (e) => {
        if (!(e.key in KEY_PRESS_TO_INPUT)) return;
        sprite.inputState[KEY_PRESS_TO_INPUT[e.key]] = false;
        sendGameEvent(ws, sprite);
    });
}

function sendGameEvent(ws: WebSocket, sprite: s.Sprite) {
    // TODO: every 10 seconds, if there's no message to send, ping the server
    const { playerId, inputState } = sprite;
    const timestampMs = Date.now();
    ws.send(JSON.stringify({ timestampMs, playerId, inputState }) + "\n");
    // console.log("sent at: ", String(timestampMs).slice(9));
}

window.onload = main;
