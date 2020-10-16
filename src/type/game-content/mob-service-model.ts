import { FieldType } from "./game-content-model";
import { DamageStatistic, ResistanceStatistic } from "./item-service-model";

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

export interface MobPrototype {
    mobId: string,
    name: string,
    type: string,
    texture: string,
    experience: number,
    statistic: MobStatisticPrototype,
    behaviourGroup: MobBehaviourGroup,
    loot: Loot[],
    eq: string[],
}

export interface MobStatisticPrototype {
    level: number,
    healthPoints: number,
    movementSpeed: number,
    scanner: Scanner,
    damageStatistic: MobDamageStatistic,
    resistance: MobResistance,
}

export interface Scanner {
    mobRange: number,
    mobCloseRange: number,
    mobViewAngleRange: number
}

export interface MobDamageStatistic {
    fighting: number,
    defence: number,
    accuracy: number,
    Intelligence: number
}

export interface MobResistance {
    damageType: MobTypeResistance,
    effect: MobEffectResistance
}

export interface MobTypeResistance {
    physicialMele: number,
    physicialDistance: number,
    explosion: number,
    telestarion: number
}

export interface MobEffectResistance {
    physicialBleeding: number,
    fireBleeding: number,
    poisonBleeding: number,
    telestarionBleeding: number,
    slow: number,
    critical: number,
    lifeSteal: number
},

export interface MobBehaviourGroup {
    idle: MobBehaviour[],
    action: MobBehaviour[]
}

export interface MobBehaviour {
    name: string,
    parameters: {}
}

export interface Loot {
    itemId: string,
    probability: number,
    amountFrom: number,
    amountTo: number,
}
