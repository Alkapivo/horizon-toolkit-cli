/* JsonTiled */
export enum JsonTiledLayerType {
    GROUP = "group",
    OBJECTS = "objectgroup",
    TILESET = "tilelayer",
}

export class UndefinedJsonTiledLayerTypeException extends Error {
    constructor(message: string) {
        super(`UndefinedJsonTiledLayerType: ${message}`);
    }
}

export class JsonTiledParseException extends Error {
    constructor(message: string) {
        super(`JsonTiledParseException: ${message}`);
    }
}

export class JsonTiledPropertyNotFoundException extends Error {
    constructor(message: string) {
        super(`JsonTiledPropertyNotFoundException: ${message}`);
    }   
}

export class JsonTiledTilesOffsetNotFoundException extends Error {
    constructor(message: string) {
        super(`JsonTiledTilesOffsetNotFoundException: ${message}`);
    }
}

/* JsonTiledMap */
export interface JsonTiledMap {
    width: number,
    height: number,
    layers: JsonTiledLayer[],
    tilesets: JsonTiledTileset[],
    tilewidth: number,
    tileheight: number,

    nextlayerid?: number,
    nextobjectid?: number,
    renderorder?: string,
    type?: string,
    version?: number,
    tiledversion?: string,
    infinite?: Boolean,
}

export interface JsonTiledLayer {
    
    id?: number,
    name?: string,
    opacity?: number,
    properties?: JsonTiledLayerProperty[],
    type?: string,
    visible?: Boolean,
    x?: number,
    y?: number,

    //tileset layer
    data?: number[],
    height?: number,
    width?: number,

    //objectlayer
    draworder?: string,
    objects?: JsonTiledObject[],

    // group
    layers?: JsonTiledLayer[],
}

export interface JsonTiledLayerProperty {
    name: string,
    type: string,
    value: string,
}

export interface JsonTiledTileset {
    columns: number,
    firstgid: number,
    image: string,
    imageheight: number,
    imagewidth: number,
    margin: number,
    name: string,
    spacing: number,
    tilecount: number,
    tileheight: number,
    tilewidth: number,
    tiles: JsonTiledTilesetObject[],
    transparentcolor: string,
}

export interface JsonTiledTilesetObject {
    id: number,
    image: string,
    type: string,
}

export interface JsonTiledObject {
    gid: number,
    height: number,
    id: number,
    name: string,
    rotation: number,
    type: string,
    visible: Boolean,
    width: number,
    x: number,
    y: number,
    properties?: JsonTiledLayerProperty[],
}

export interface TiledTilesetObject {
    texture: string,
    type: string,
}

/* TiledMap */
export enum TiledTilesetCompressMethod {
    NONE = "none",
    PER_ROW = "perRow",
}

export interface TiledMap {
    name: string,
    width: number,
    height: number,
    layers: TiledLayer[],
    tileWidth: number,
    tileHeight: number,
    compressMethod?: string,
}

export interface TiledLayer {
    id: number,
    name: string,
    opacity: number,
    type: string,
    x: number,
    y: number,
    properties?: Map<string, string>,
    data?: string,
    compressMethod?: TiledTilesetCompressMethod,
    height?: number,
    width?: number,
    draworder?: string,
    objects?: TiledObject[],
    layers?: TiledLayer[],
}

export interface TiledTileset {
    name: string,
    data: string[][],
}

export interface TiledObject {
    type: string,
    name: string,
    x: number,
    y: number,
    xScale: number,
    yScale: number,
    properties?: Map<string, string>,
}