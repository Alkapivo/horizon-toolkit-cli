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
    fighting?: number,
    defence?: number,
    accuracy?: number,
    movementModifier?: MovementModifier,
    damageEffects?: DamageEffect[],

    ammoType?: string,
    weaponType?: string,

    bookContent?: string,
    doorId?: string,
    goldValue?: number,
    hpRegenerationDuration?: number,
    hpRegeneration?: number,
    isQuestItem?: boolean,
    specialType?: string,
}

export interface DamageEffect {
    name: string,
    duration: number,
}

export interface MovementModifier {
    ground?: string[],
    value: number,
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
    item_type_skill: FieldType[],
    item_type_rope: FieldType[],
    item_type_shield: FieldType[],
    item_type_trousers: FieldType[],
    item_type_weapon: FieldType[],
    item_type_ring: FieldType[],
    item_type_bomb: FieldType[],
}

export const requiredItemFieldsDictionary: ItemFieldsDictionary = {
    item_type_ammo: [
        {
            name: "ammoType",
            type: "string",
        }
    ],
    item_type_armor: [
        {
            name: "fighting",
            type: "number",
        },
        {
            name: "defence",
            type: "number",
        },
        {
            name: "accuracy",
            type: "number",
        },
        {
            name: "movementModifier",
            type: "MovementModifier",
        }
    ],
    item_type_book: [
        {
            name: "bookContent",
            type: "string",
        }
    ],
    item_type_boots: [
        {
            name: "fighting",
            type: "number",
        },
        {
            name: "defence",
            type: "number"
        },
        {
            name: "accuracy",
            type: "number",
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
            name: "fighting",
            type: "number",
        },
        {
            name: "defence",
            type: "number",
        },
        {
            name: "accuracy",
            type: "number",
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
    item_type_skill: [
        {
            name: "skillName",
            type: "string",
        },
        {
            name: "skillCooldown",
            type: "number",
        }
    ],
    item_type_rope: [],
    item_type_shield: [
        {
            name: "fighting",
            type: "number"
        },
        {
            name: "defence",
            type: "number"
        },
        {
            name: "accuracy",
            type: "number",
        },
        {
            name: "movementModifier",
            type: "MovementModifier",
        }
    ],
    item_type_trousers: [
        {
            name: "fighting",
            type: "number"
        },
        {
            name: "defence",
            type: "number"
        },
        {
            name: "accuracy",
            type: "number"
        },
        {
            name: "movementModifier",
            type: "MovementModifier",
        }
    ],
    item_type_weapon: [
        {
            name: "weaponType",
            type: "string",
        },
        {
            name: "fighting",
            type: "number",
        },
        {
            name: "defence",
            type: "number",
        },
        {
            name: "accuracy",
            type: "number",
        },
        {
            name: "movementModifier",
            type: "MovementModifier",
        },
        {
            name: "damageEffects",
            type: "DamageEffect[]",
        }

    ],
    item_type_ring: [
        {
            name: "fighting",
            type: "number",
        },
        {
            name: "defence",
            type: "number",
        },
        {
            name: "accuracy",
            type: "number",
        },
        {
            name: "movementModifier",
            type: "MovementModifier",
        }
    ],
    item_type_bomb: [
        {
            name: "bombDistance",
            type: "number",
        },
        {
            name: "bombShape",
            type: "number",
        },
        {
            name: "bombSize",
            type: "number",
        },
        {
            name: "bombDamage",
            type: "number",
        }
    ]
}





