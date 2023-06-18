import { GridBox } from "./utils";

export type StageInit = {
    hitboxes: GridBox[];
};

export class Stage {

    hitboxes: GridBox[] = [];

    constructor(init: StageInit) {
        this.hitboxes = init.hitboxes;
    }

}