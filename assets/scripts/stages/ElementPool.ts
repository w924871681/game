import { instantiate, Node, Prefab } from 'cc';

/** Owned by one stage: grow on demand, retain identities until the stage is destroyed. */
export class ElementPool {
    private readonly nodes: Node[] = [];

    public get count(): number {
        return this.nodes.length;
    }

    public get snapshot(): readonly Node[] {
        return Object.freeze(this.nodes.slice());
    }

    public prepare(prefab: Prefab, parent: Node, count: number): readonly Node[] {
        while (this.nodes.length < count) {
            const node = instantiate(prefab);
            node.active = false;
            node.parent = parent;
            this.nodes.push(node);
        }
        for (const node of this.nodes) {
            node.active = false;
        }
        return this.nodes.slice(0, count);
    }

    public deactivate(): void {
        for (const node of this.nodes) {
            node.active = false;
        }
    }

    public release(): void {
        for (const node of this.nodes) {
            node.destroy();
        }
        this.nodes.length = 0;
    }
}
