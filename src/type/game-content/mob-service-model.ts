import { FieldType } from "./game-content-model";

export class MobTypeNotFoundException extends Error {
    constructor(message: string) {
        super(`MobTypeNotFound: ${message}`);
    }
}

export class MobParseException extends Error {
    constructor(message: string) {
        super(`MobParseException: ${message}`);
    }
}

export interface Mob {
    mobId: string,
    name: string,
    type: string,
    texture: string,
    hp: number,
    experience: number,
    statistic: MobStatistic,
    behaviours: MobBehaviour[],
    loot: Loot[],
    eq: number[],
}

export interface MobStatistic {
    fighting: number,
    defence: number,
    accuracy: number,
    level: number,
}

export interface MobBehaviour {
    name: string,
    parameters?: {}
}

export interface Loot {
    itemId: string,
    probability: number,
    amountFrom: number,
    amountTo: number,
}

export interface MobBehaviourFieldsDictionary {
    attack_on_hit: FieldType[],
    always_attack: FieldType[],
    attack_mele: FieldType[],
    attack_distance: FieldType[],
    runaway: FieldType[],
}

export const requiredMobBehaviourFieldsDictionary: MobBehaviourFieldsDictionary = {
    attack_on_hit: [],
    always_attack: [
        {
            name: "followRange",
            type: "number",
        }
    ],
    attack_mele: [
        {
            name: "followRange",
            type: "number",
        }
    ],
    attack_distance: [
        {
            name: "followRange",
            type: "number",
        },
        {
            name: "keepDistance",
            type: "number",
        },
        {
            name: "useBellowHP",
            type: "number",
            isRequired: false,
        }
    ],
    runaway: [
        {
            name: "runAwayAtHp",
            type: "number",
        }
    ],
}