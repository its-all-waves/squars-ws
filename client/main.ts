const TICK_RATE = 60;
const TICK_INTERVAL = 1 / TICK_RATE;

class Sprite {
    id: string;
    el: HTMLDivElement;
    pos: { x: number; y: number };
    speed: number = 1; // distance per 1 frame

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

let count = 0;

function main() {
    sprite = new Sprite();
    addEventListener("keydown", (e) => {
        inputState[keyPressToInput[e.key]] = true;
    });
    addEventListener("keyup", (e) => {
        inputState[keyPressToInput[e.key]] = false;
    });

    // set up WS
    console.log("Connecting to websocket...");
    const ws = new WebSocket("ws://" + document.location.host + "/ws");
    ws.onclose = function (e) {
        console.error("Web socket closed!");
    };
    ws.onmessage = function (e: MessageEvent) {
        console.log();
        console.log("RECEIVED:", e.data);
    };
    ws.onopen = function (e) {
        console.log("Connected");
    };

    setInterval(() => {
        sendInputState(ws);
        // }, TICK_INTERVAL);
    }, 1000);
}

function sendInputState(ws: WebSocket) {
    spriteHandleKeydown();
    // TODO: send a message when the user does something
    // TODO: every 10 seconds, if there's no message to send, ping the server
    const { up, down, left, right } = inputState;
    const timestampMs = Date.now();
    ws.send(
        JSON.stringify({
            timestampMs,
            playerId: "0",
            inputState: { up, down, left, right },
        }) + "\n",
    );
    console.log("sent at: ", String(timestampMs).slice(9));
    // if (ws.readyState === ws.OPEN) {
    //     ws.send("ping " + count + "\n");
    //     console.log("SENT: 'ping\\n'", "COUNT:", count);
    //     count++;
    // }
}

function spriteHandleKeydown() {
    const { up, down, left, right } = inputState;
    up && sprite.up();
    down && sprite.down();
    left && sprite.left();
    right && sprite.right();
}

window.onload = main;
