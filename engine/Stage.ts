type Hitbox = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type StageInit = {
    hitboxes: Hitbox[];
};

export class Stage {

    hitboxes: Hitbox[] = [];

    constructor(init: StageInit) {
        this.hitboxes = init.hitboxes;
    }

}