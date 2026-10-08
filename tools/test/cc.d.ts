/**
 * LIMITED TEST-ONLY CONTRACT for tools/verify-day1.cjs.
 * This is deliberately not a Cocos SDK, project typing, or proof of engine API compatibility.
 * It describes only the small UI/event surface exercised by the Node mock harness.
 * Use `node tools/verify-day1.cjs --cocos-types` after opening the project in Cocos
 * to check against the editor-generated real engine typings instead.
 */
declare module 'cc' {
    export const _decorator: {
        ccclass(name: string): ClassDecorator;
        property(...configuration: unknown[]): PropertyDecorator;
        requireComponent(type: typeof Component): ClassDecorator;
        disallowMultiple: ClassDecorator;
    };
    export class Component {
        node: Node;
        enabled: boolean;
        readonly enabledInHierarchy: boolean;
        destroy(): boolean;
    }
    export class Vec3 {
        x: number;
        y: number;
        z: number;
        constructor(x?: number, y?: number, z?: number);
        clone(): Vec3;
        set(value: Vec3): this;
        set(x: number, y: number, z?: number): this;
        static add(out: Vec3, a: Vec3, b: Vec3): Vec3;
        static subtract(out: Vec3, a: Vec3, b: Vec3): Vec3;
    }
    export class Node {
        static readonly EventType: {
            readonly TOUCH_START: string;
            readonly TOUCH_MOVE: string;
            readonly TOUCH_END: string;
            readonly TOUCH_CANCEL: string;
        };
        name: string;
        parent: Node | null;
        active: boolean;
        layer: number;
        readonly position: Vec3;
        readonly scale: Vec3;
        readonly worldPosition: Vec3;
        readonly children: readonly Node[];
        readonly activeInHierarchy: boolean;
        constructor(name?: string);
        setPosition(position: Vec3): void;
        setPosition(x: number, y: number, z?: number): void;
        setScale(scale: Vec3): void;
        setScale(x: number, y: number, z?: number): void;
        getComponent<T extends Component>(type: new () => T): T | null;
        getChildByName(name: string): Node | null;
        getComponentInChildren<T extends Component>(type: new () => T): T | null;
        getComponentsInChildren<T extends Component>(type: new () => T): T[];
        addComponent<T extends Component>(type: new () => T): T;
        addChild(child: Node): void;
        removeFromParent(): void;
        setSiblingIndex(index: number): void;
        destroy(): boolean;
        on(type: string, callback: (event: EventTouch) => void, target: Component): void;
        off(type: string, callback: (event: EventTouch) => void, target: Component): void;
    }
    export class EventTouch {
        propagationStopped: boolean;
        getID(): number | null;
        getUILocation(): { x: number; y: number };
    }
    export class UITransform extends Component {
        width: number;
        height: number;
        setContentSize(width: number, height: number): void;
        convertToWorldSpaceAR(local: Vec3, out?: Vec3): Vec3;
        convertToNodeSpaceAR(world: Vec3, out?: Vec3): Vec3;
    }
    export class Label extends Component {
        static readonly HorizontalAlign: { readonly CENTER: number };
        static readonly VerticalAlign: { readonly CENTER: number };
        static readonly Overflow: { readonly SHRINK: number };
        string: string;
        fontSize: number;
        lineHeight: number;
        color: Color;
        horizontalAlign: number;
        verticalAlign: number;
        overflow: number;
        enableWrapText: boolean;
    }
    export class Canvas extends Component {}
    export class Button extends Component {
        static readonly EventType: { readonly CLICK: string };
        interactable: boolean;
    }
    // Deferred tween tests only inspect endpoints/callback ordering, not interpolation/easing.
    export class Tween<T extends object> {
        to(duration: number, properties: Partial<T>, options?: { easing?: string; onUpdate?: (target: T, ratio: number) => void }): this;
        call(callback: () => void): this;
        start(): this;
        stop(): this;
    }
    export function tween<T extends object>(target: T): Tween<T>;
    export class Color {
        constructor(r?: number, g?: number, b?: number, a?: number);
    }
    export class Graphics extends Component {
        fillColor: Color;
        strokeColor: Color;
        lineWidth: number;
        clear(): void;
        moveTo(x: number, y: number): void;
        lineTo(x: number, y: number): void;
        bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
        rect(x: number, y: number, width: number, height: number): void;
        fill(): void;
        stroke(): void;
    }
    export class Prefab { readonly data: Node; }
    export function instantiate(original: Prefab): Node;
    export class Sprite extends Component {
        static readonly Type: { readonly SIMPLE: number; readonly SLICED: number };
        color: Color;
        type: number;
    }
    export class UIOpacity extends Component { opacity: number; }
    export const Layers: { readonly Enum: { readonly UI_2D: number } };
    export const ResolutionPolicy: { readonly SHOW_ALL: number };
    export const view: { setDesignResolutionSize(width: number, height: number, policy: number): void };
    export function isValid(value: unknown): boolean;
    export function warn(message: string): void;
}
