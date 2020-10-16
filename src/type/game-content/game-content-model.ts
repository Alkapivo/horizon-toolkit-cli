import { Item } from "./item-service-model";
import { MobPrototype } from "./mob-service-model";
import { NPC } from "./npc-service-model";

export interface FieldType {
    name: string,
    type: string,
    isRequired?: boolean,
}

export interface MeatPackage {
    items: Item[],
    mobs: MobPrototype[],
    npcs: NPC[],
}

export interface Tuple<T, S> {
    key: T,
    value: S
}

export interface ChestPrototype {
    chestId: String,
    items: Tuple<string, number>,
}