export type PlayerId = string;
export type Player = { id: PlayerId; x: number; y: number };

export type InputState = {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
};

const KEY_PRESS_TO_INPUT: Record<
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

type Params = {
    field: HTMLDivElement;
    x?: number;
    y?: number;
    playerId?: PlayerId;
};

export class Sprite {
    playerId: PlayerId;
    el: HTMLDivElement;
    inputState: InputState;
    x: number;
    y: number;
    speed: number = 1; // distance per 1 frame

    constructor(params: Params) {
        const { field, x, y, playerId } = params;
        this.inputState = {
            up: false,
            down: false,
            left: false,
            right: false,
        };
        const el = document.createElement("div");
        el.className = "sprite";
        this.el = el;
        x && y ? this.setPos(x, y) : this.center();
        playerId && this.setPlayerId(playerId);
        field.append(el);
    }

    destroyHTML() {
        this.el.remove();
    }

    private center() {
        this.el.style.left = "50%";
        this.el.style.top = "50%";
        const { x, y } = this.el.getBoundingClientRect();
        this.x = x;
        this.y = y;
    }

    setPos(x: number, y: number) {
        this.el.style.left = String(x) + "px";
        this.el.style.top = String(y) + "px";
    }

    setPlayerId(val: string) {
        this.el.id = this.playerId = val;
    }

    input(key: KeyboardEvent["key"], keyState: boolean) {
        if (!(key in KEY_PRESS_TO_INPUT)) return;
        this.inputState[KEY_PRESS_TO_INPUT[key]] = keyState;
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

    // TODO: may be used when we do optimistic updates
    // handleInput() {
    //     const { up, down, left, right } = this.inputState;
    //     up && this.up();
    //     down && this.down();
    //     left && this.left();
    //     right && this.right();
    // }
}
