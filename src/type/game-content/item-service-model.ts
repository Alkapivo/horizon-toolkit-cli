import { FieldType } from "./game-content-model";

export class ItemTypeNotFoundException extends Error {
    constructor(message: string) {
        super(`ItemTypeNotFound: ${message}`);
    }
}

export class ItemParseException extends Error {
    constructor(message: string) {
        super(`ItemParseException: ${message}`);
    }
}

export interface Item {
    itemId: string,
    name: string,
    type: string,
    texture: string,
    isStackable: boolean,
    description: string,
    capacity: number,
    parameters: ItemParameter,
}

export interface ItemParameter {
    damageStatistic: DamageStatistic,
    resistanceStatistic: ResistanceStatistic,
    damageEffects: DamageEffect[],
    movementModifier: MovementModifier,
    ammoType: String,
    weaponType: String,
    bookData: BookData,
    doorId: String,
    goldValue: Number,
    hpRegenerationDuration: Number,
    hpRegeneration: Number,
    isQuestItem: Boolean,
    rarity: Number
    toolData: ToolData
}

export interface DamageStatistic {
    fighting: number,
    defence: number,
    accuracy: number,
    intelligence: number
}

export interface DamageEffect {
    type: string,
    probability: number,
    value: number,
    duration: number
}

export interface MovementModifier {
    ground?: string[],
    groundExclude?: string[],
    value: number,
}

export interface ResistanceStatistic {
    damageType?: ResistanceDamageType,
    effect?: ResistanceEffect
}

export interface ResistanceDamageType {
    physicialMele: number,
    physicialDistance: number,
    explosion: number,
    telestarion: number
}

export interface ResistanceEffect {
    physicialBleeding: number,
    fireBleeding: number,
    poisonBleeding: number,
    telestarionBleeding: number,
    slow: number,
    critical: number,
    lifeSteal: number
}

export interface BombStatistic {
    damageFrom: number
    damageTo: number
    radius: number
    range: number
}

export interface BookData {
    bookContent?: string,
    bookImage?: string,
    setFacts?: string[],
    isMap?: boolean
}

export interface ToolData {
    type: string
    parameters: any
}

export interface ItemFieldsDictionary {
    item_type_ammo: FieldType[],
    item_type_armor: FieldType[],
    item_type_book: FieldType[],
    item_type_boots: FieldType[],
    item_type_container: FieldType[],
    item_type_currency: FieldType[],
    item_type_food: FieldType[],
    item_type_hat: FieldType[],
    item_type_key: FieldType[],
    item_type_other: FieldType[],
    item_type_tool: FieldType[],
    item_type_shield: FieldType[],
    item_type_trousers: FieldType[],
    item_type_weapon: FieldType[],
    item_type_ring: FieldType[],
    item_type_bomb: FieldType[],
    item_type_talisman: FieldType[]
}

export const requiredItemFieldsDictionary: ItemFieldsDictionary = {
    item_type_weapon: [
        {
            name: "weaponType",
            type: "string",
        },
        {
            name: "weaponRange",
            type: "number",
        },
        {
            name: "ammoType",
            type: "string",
        },
        {
            name: "damageStatistic",
            type: "DamageStatistic",
        },
        {
            name: "resistanceStatistic",
            type: "ResistanceStatistic",
        },
        {
            name: "damageEffects",
            type: "DamageEffect[]",
        },
        {
            name: "movementModifier",
            type: "MovementModifier",
        }
    ],
    item_type_ammo: [
        {
            name: "ammoType",
            type: "string",
        },
        {
            name: "damageEffects",
            type: "DamageEffect[]",
        }
    ],
    item_type_armor: [
        {
            name: "damageStatistic",
            type: "DamageStatistic",
        },
        {
            name: "resistanceStatistic",
            type: "ResistanceStatistic",
        },
        {
            name: "movementModifier",
            type: "MovementModifier",
        }
    ],
    item_type_book: [
        {
            name: "bookData",
            type: "BookData",
        }
    ],
    item_type_boots: [
        {
            name: "damageStatistic",
            type: "DamageStatistic",
        },
        {
            name: "resistanceStatistic",
            type: "ResistanceStatistic",
        },
        {
            name: "movementModifier",
            type: "MovementModifier",
        }
    ],
    item_type_container: [],
    item_type_currency: [
        {
            name: "goldValue",
            type: "number",
        }
    ],
    item_type_food: [
        {
            name: "hpRegeneration",
            type: "number",
        },
        {
            name: "hpRegenerationDuration",
            type: "number",
        }
    ],
    item_type_hat: [
        {
            name: "damageStatistic",
            type: "DamageStatistic",
        },
        {
            name: "resistanceStatistic",
            type: "ResistanceStatistic",
        },
        {
            name: "movementModifier",
            type: "MovementModifier",
        }
    ],
    item_type_key: [
        {
            name: "doorId",
            type: "string",
        },
    ],
    item_type_other: [
        {
            name: "isQuestItem",
            type: "boolean",
        }
    ],
    item_type_tool: [
        {
            name: "toolData",
            type: "ToolData"
        }
    ],
    item_type_shield: [
        {
            name: "damageStatistic",
            type: "DamageStatistic",
        },
        {
            name: "resistanceStatistic",
            type: "ResistanceStatistic",
        },
        {
            name: "movementModifier",
            type: "MovementModifier",
        }
    ],
    item_type_trousers: [
        {
            name: "damageStatistic",
            type: "DamageStatistic",
        },
        {
            name: "resistanceStatistic",
            type: "ResistanceStatistic",
        },
        {
            name: "movementModifier",
            type: "MovementModifier",
        }
    ],
    item_type_ring: [
        {
            name: "damageStatistic",
            type: "DamageStatistic",
        },
        {
            name: "resistanceStatistic",
            type: "ResistanceStatistic",
        },
        {
            name: "movementModifier",
            type: "MovementModifier",
        }
    ],
    item_type_bomb: [
        {
            name: "bombStatistic",
            type: "BombStatistic",
        }
    ],
    item_type_talisman: []
}





