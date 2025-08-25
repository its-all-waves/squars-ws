const TICK_RATE = 60;
const TICK_INTERVAL = 1 / TICK_RATE;

class Sprite {
    playerId: string;
    el: HTMLDivElement;
    pos: { x: number; y: number };
    speed: number = 1; // distance per 1 frame

    constructor() {
        const el = document.createElement("div");
        el.className = "sprite";
        el.id = "sprite";
        this.el = el;
        this.center();
        document.body.append(this.el);
    }

    private center() {
        this.el.style.left = "50%";
        this.el.style.top = "50%";
        const { x, y } = this.el.getBoundingClientRect();
        this.pos = { x, y };
    }

    setPos(x: number, y: number) {
        this.el.style.left = String(x) + "px";
        this.el.style.top = String(y) + "px";
    }

    setPlayerId(val: string) {
        this.el.id = this.playerId = val;
    }

    up() {
        console.log("up");
        const currTop = getComputedStyle(this.el).top;
        const topPos = Number(currTop.replace("px", "")) - this.speed;
        this.el.style.top = topPos + "px";
    }

    down() {
        console.log("down");
        const currTop = getComputedStyle(this.el).top;
        const topPos = Number(currTop.replace("px", "")) + this.speed;
        this.el.style.top = topPos + "px";
    }

    left() {
        console.log("left");
        const currLeft = getComputedStyle(this.el).left;
        const leftPos = Number(currLeft.replace("px", "")) - this.speed;
        this.el.style.left = leftPos + "px";
    }

    right() {
        console.log("right");
        const currLeft = getComputedStyle(this.el).left;
        const leftPos = Number(currLeft.replace("px", "")) + this.speed;
        this.el.style.left = leftPos + "px";
    }
}

let sprite: Sprite;

type InputState = { up: boolean; down: boolean; left: boolean; right: boolean };

const inputState = {
    up: false,
    down: false,
    left: false,
    right: false,
};

const keyPressToInput: Record<
    Partial<KeyboardEvent["key"]>,
    keyof InputState
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

type PlayerId = string;
type Player = { id: string; x: number; y: number };
type Players = Record<PlayerId, Player>;

type IdMessage = { playerId: PlayerId };
type GameStateMessage = { players: Players };

async function main() {
    sprite = new Sprite();

    // DEBUG
    window.sprite = sprite;

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
        if (!(e.key in keyPressToInput)) return;
        inputState[keyPressToInput[e.key]] = true;
        sendGameEvent(ws);
    });
    addEventListener("keyup", (e) => {
        if (!(e.key in keyPressToInput)) return;
        inputState[keyPressToInput[e.key]] = false;
        sendGameEvent(ws);
    });
}

function sendGameEvent(ws: WebSocket) {
    // TODO: send a message when the user does something
    // TODO: every 10 seconds, if there's no message to send, ping the server
    const { playerId } = sprite;
    const timestampMs = Date.now();
    ws.send(JSON.stringify({ timestampMs, playerId, inputState }) + "\n");
    // console.log("sent at: ", String(timestampMs).slice(9));
}

function spriteHandleKeydown() {
    const { up, down, left, right } = inputState;
    up && sprite.up();
    down && sprite.down();
    left && sprite.left();
    right && sprite.right();
}

window.onload = main;
