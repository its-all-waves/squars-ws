addEventListener("DOMContentLoaded", main);

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

const pressedKeys = new Set();

function main() {
    sprite = new Sprite();
    addEventListener("keydown", (e) => pressedKeys.add(e.key));
    addEventListener("keyup", (e) => pressedKeys.delete(e.key));
    setInterval(spriteHandleKeydown, FRAME_INTERVAL);
}

function spriteHandleKeydown(e) {
    if (pressedKeys.has("ArrowUp") || pressedKeys.has("w")) {
        sprite.up();
    }
    if (pressedKeys.has("ArrowDown") || pressedKeys.has("s")) {
        sprite.down();
    }
    if (pressedKeys.has("ArrowLeft") || pressedKeys.has("a")) {
        sprite.left();
    }
    if (pressedKeys.has("ArrowRight") || pressedKeys.has("d")) {
        sprite.right();
    }
}
