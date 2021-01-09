import { FieldType } from "./game-content-model";

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


