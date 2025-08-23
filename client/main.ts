const FRAME_RATE = 60; // not true FPS, but num of times we update per second
const FRAME_INTERVAL = 1 / FRAME_RATE;

class Sprite {
    id: string;
    el: HTMLDivElement;
    pos: { x: number; y: number };
    speed: number = 1; // distance per 1 frame
    screenBounds: { xMax: number; yMax: number };

    constructor() {
        const element = document.createElement("div");
        element.className = "sprite";

        // TODO: give unique ID -- is element id and sprite id
        this.id = element.id = "sprite";

        this.el = element;
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

const pressedKeys: Set<string> = new Set();

type PlayerId = string;
type Timestamp = number;
type InputState = { up: boolean; down: boolean; left: boolean; right: boolean };
type GameEventMsg = {
    timestampMs: Timestamp;
    playerId: PlayerId;
    inputState: InputState;
};

const keyPressMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
};

function main() {
    sprite = new Sprite();
    addEventListener("keydown", (e) => pressedKeys.add(keyPressMap[e.key]));
    addEventListener("keyup", (e) => pressedKeys.delete(keyPressMap[e.key]));

    // set up WS
    console.log("Connecting to websocket...");
    const ws = new WebSocket("ws://" + document.location.host + "/ws");
    ws.onclose = function (e) {
        console.error("Web socket closed!");
    };
    ws.onmessage = function (e: MessageEvent) {
        console.log();
        console.log("MSG:", e.data);
    };
    ws.onopen = function (e) {
        console.log("Connected");
    };

    setInterval(() => {
        // convert pressed keys to { up, down, left, right: bool }
        ws.send(
            JSON.stringify({
                timestampMs: Date.now(),
                playerId: "0",
                inputState: {
                    up: pressedKeys.has("up"),
                    down: pressedKeys.has("down"),
                    left: pressedKeys.has("left"),
                    right: pressedKeys.has("right"),
                },
            }) + "\n",
        );
        console.log("sent message");
    }, 1000);
    // }, FRAME_INTERVAL);
}

// function update(ws: WebSocket) {
//     spriteHandleKeydown();
//     // TODO: send a message when the user does something
//     // TODO: every 10 seconds, if there's no message to send, ping the server
//     if (ws.readyState === ws.OPEN) {
//         ws.send("ping\n");
//     }
// }

type GameEvent = {
    msg: "PLAYER_MOVED" | "TODO";
    data: Record<string, string | number>;
};

function dispatch(e: GameEvent) {
    switch (e.msg) {
        case "PLAYER_MOVED":
            break;
        case "TODO":
            break;
    }
}

// function spriteHandleKeydown(ws: WebSocket) {
//     if (pressedKeys.has("ArrowUp") || pressedKeys.has("w")) {
//         sprite.up();
//     }
//     if (pressedKeys.has("ArrowDown") || pressedKeys.has("s")) {
//         sprite.down();
//     }
//     if (pressedKeys.has("ArrowLeft") || pressedKeys.has("a")) {
//         sprite.left();
//     }
//     if (pressedKeys.has("ArrowRight") || pressedKeys.has("d")) {
//         sprite.right();
//     }
// }

window.onload = main;
