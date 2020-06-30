/* Entity builder */
export enum FieldTypes {
    PRIMITIVE = "primitive",
    PRIMITIVE_ARRAY = "primitiveArray",
    PRIMITIVE_LIST = "primitiveList",
    PRIMITIVE_MAP = "primitiveMap",
    PRIMITIVE_STACK = "primitiveStack",
    PRIMITIVE_GRID = "primitiveGrid",
    PRIMITIVE_QUEUE = "primitiveQueue",
    PRIMITIVE_PRIORITY_QUEUE = "primitivePriorityQueue",
    ENTITY = "entity",
    ENTITY_ARRAY = "entityArray",
    ENTITY_LIST = "entityList",
    ENTITY_MAP = "entityMap",
    ENTITY_STACK = "entityStack",
    ENTITY_GRID = "entityGrid",
    ENTITY_QUEUE = "entityQueue",
    ENTITY_PRIORITY_QUEUE = "entityPriorityQueue"
};

export enum CollectionTypes {
    ARRAY = "Array",
    ARRAY_MAP = "ArrayMap",
    LIST = "List",
    MAP = "Map",
    STACK = "Stack",
    GRID = "Grid",
    QUEUE = "Queue",
    PRIORITY_QUEUE = "PriorityQueue",
}

export interface Entity {
    name: string;
    schema: string;
    enums: string;
    primitives: string;
}

export interface ModelEntity {
    name: string;
    schema: Object;
    enums: string[];
    primitives: string[];
}

export class CodeSnippet {
    constructor(
        public name: string,
        public snippets: string[]) { }
}