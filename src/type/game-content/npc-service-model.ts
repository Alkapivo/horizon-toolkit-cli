import { FieldType } from "./game-content-model";
import { FactIntent } from "./item-service-model";

export class NPCTypeNotFoundException extends Error {
    constructor(message: string) {
        super(`NPCTypeNotFound: ${message}`);
    }
}

export class NPCParseException extends Error {
    constructor(message: string) {
        super(`NPCParseException: ${message}`);
    }
}

export interface NPC {
    npcId: string,
    name: string,
    mobId: string,
    dialogue: string,
    tradeInventory: TradeEntry[],
    parameters: NPCParameters,
    echoes: NPCEcho[],
    icons: NpcIcon[]
}

export interface TradeEntry {
    itemId: number,
    overridedPrice?: number,
}

export interface SellCategoryModifier {
    itemType: string,
    modifier: number
}

export interface NPCParameters {
    moveRandom: boolean,
    moveRange?: number,
    sellModifiers?: SellCategoryModifier[],
}

export interface NPCParametersFieldDictionary {
    moveRandom: FieldType,
    moveRange: FieldType,
    sellModifiers: FieldType,
}

export interface NPCEcho {
    echo: string,
    duration: number
}

export interface NpcIcon {
    type: string,
    requiredFacts?: FactIntent[]
}

export const npcParametersFieldDictionary = {
    moveRandom: {
        name: "moveRandom",
        type: "boolean",
    },
    moveRange: {
        name: "moveRandom",
        type: "number",
        isRequired: false,
    },
    sellModifiers: {
        name: "sellModifiers",
        type: "SellCategoryModifier[]",
        isRequired: false,
    },
    type: {
        name: "type",
        type: "string",
        isRequired: false,
    }

}


