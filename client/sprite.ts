export type PlayerId = string;

export type Player = {
    id: PlayerId;
    color1: number;
    color2: number;
    color3: number;
    x: number;
    y: number;
};

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

export type Size = { w: number; h: number };

type Params = {
    field: HTMLDivElement;
    x?: number;
    y?: number;
    player?: Player;
};

type CssHexColor24 = string; // not type-safe

export class Sprite {
    static size = null; // size of all sprites -- is set when this sprite is created
    playerId: PlayerId;
    inputState: InputState;
    x: number;
    y: number;
    private el: HTMLDivElement;
    private colorBg: CssHexColor24;
    private colorBorder: CssHexColor24;
    private colorShadow: CssHexColor24;

    /** @throws */
    constructor(params: Params) {
        if (!Sprite.size) {
            throw new Error();
        }
        const { field, x, y, player } = params;
        this.inputState = {
            up: false,
            down: false,
            left: false,
            right: false,
        };
        const el = document.createElement("div");
        el.className = "sprite";
        this.el = el;
        this.el.style.width = String(Sprite.size.w) + "px";
        this.el.style.height = String(Sprite.size.h) + "px";
        x && y ? this.setPos(x, y) : this.setPos(0, 0);
        player && this.inheritPlayer(player);
        field.append(el);
    }

    destroyHTML() {
        this.el.remove();
    }

    setPos(x: number, y: number) {
        this.el.style.left = String(x) + "px";
        this.el.style.top = String(y) + "px";
    }

    inheritPlayer(p: Player) {
        const { id, color1, color2, color3, x, y } = p;
        this.el.id = this.playerId = p.id;
        this.el.style.backgroundColor = "#" + color1.toString(16);
        this.el.style.borderColor = "#" + color2.toString(16);
        this.el.style.boxShadow = spriteCssShadow("#" + color3.toString(16));
        this.setPos(x, y);
        this.playerId = id;
    }

    input(key: KeyboardEvent["key"], keyState: boolean) {
        if (!(key in KEY_PRESS_TO_INPUT)) return;
        this.inputState[KEY_PRESS_TO_INPUT[key]] = keyState;
    }
}

function spriteCssShadow(hexColor: string) {
    // 0.6 * 255 to hex = 0x99
    // 0.8 * 255 to hex = 0xCC
    return `0px 0px 18px ${hexColor}CC`;
}
