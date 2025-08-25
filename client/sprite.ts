export type PlayerId = string;
export type Player = { id: PlayerId; x: number; y: number };

export type InputState = {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
};

export class Sprite {
    playerId: PlayerId;
    el: HTMLDivElement;
    inputState: InputState;
    pos: { x: number; y: number };
    speed: number = 1; // distance per 1 frame

    constructor() {
        const el = document.createElement("div");
        el.className = "sprite";
        el.id = "sprite";
        this.el = el;
        this.center();
        document.body.append(this.el);
        this.inputState = {
            up: false,
            down: false,
            left: false,
            right: false,
        };
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
        // console.log("up");
        const currTop = getComputedStyle(this.el).top;
        const topPos = Number(currTop.replace("px", "")) - this.speed;
        this.el.style.top = topPos + "px";
    }

    down() {
        // console.log("down");
        const currTop = getComputedStyle(this.el).top;
        const topPos = Number(currTop.replace("px", "")) + this.speed;
        this.el.style.top = topPos + "px";
    }

    left() {
        // console.log("left");
        const currLeft = getComputedStyle(this.el).left;
        const leftPos = Number(currLeft.replace("px", "")) - this.speed;
        this.el.style.left = leftPos + "px";
    }

    right() {
        // console.log("right");
        const currLeft = getComputedStyle(this.el).left;
        const leftPos = Number(currLeft.replace("px", "")) + this.speed;
        this.el.style.left = leftPos + "px";
    }

    handleInput() {
        const { up, down, left, right } = this.inputState;
        up && this.up();
        down && this.down();
        left && this.left();
        right && this.right();
    }
}
