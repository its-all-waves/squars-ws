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
        this.el.style.top = "50%";
        this.el.style.left = "50%";
        this.el.style.translate = "-50% -50%";
        this.setPos();
    }

    private setPos() {
        const { x, y } = this.el.getBoundingClientRect();
        this.pos = { x, y };
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

async function main() {
    sprite = new Sprite();

    // set up WS
    console.log("Connecting to websocket...");
    const ws = new WebSocket("ws://" + document.location.host + "/ws");
    ws.onclose = function (e) {
        console.error("Web socket closed!");
    };
    ws.onmessage = function (e: MessageEvent) {
        const msgObj = JSON.parse(e.data);
        console.log("RECEIVED:", msgObj);

        const { playerId } = msgObj;
        playerId && sprite.setPlayerId(playerId);
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

    console.log("yup");
    setInterval(() => {
        if (ws.readyState !== ws.OPEN) return;
        if (!sprite.playerId) return;
        spriteHandleKeydown(); // TODO: will be gone when server takes over
        // sendGameEvents(ws);
        // }, TICK_INTERVAL);
    }, 1000);
    // }
}

function sendGameEvent(ws: WebSocket) {
    // TODO: send a message when the user does something
    // TODO: every 10 seconds, if there's no message to send, ping the server
    const { playerId } = sprite;
    const timestampMs = Date.now();
    ws.send(JSON.stringify({ timestampMs, playerId, inputState }) + "\n");
    console.log("sent at: ", String(timestampMs).slice(9));
}

function spriteHandleKeydown() {
    const { up, down, left, right } = inputState;
    up && sprite.up();
    down && sprite.down();
    left && sprite.left();
    right && sprite.right();
}

window.onload = main;
