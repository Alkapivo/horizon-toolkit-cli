import { Item } from "./item-service-model";
import { Mob } from "./mob-service-model";
import { NPC } from "./npc-service-model";

export interface FieldType {
    name: string,
    type: string,
    isRequired?: boolean,
}

export interface MeatPackage {
    items: Item[],
    mobs: Mob[],
    npcs: NPC[],
}