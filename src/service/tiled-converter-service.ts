import { injectable } from 'inversify';
import { TiledMap, JsonTiledMap, TiledTilesetObject, TiledLayer, TiledTilesetCompressMethod, JsonTiledLayer, JsonTiledLayerType, UndefinedJsonTiledLayerTypeException, JsonTiledObject, JsonTiledLayerProperty, TiledObject, JsonTiledPropertyNotFoundException, JsonTiledTilesOffsetNotFoundException } from '../type/tiled-converter-model';


@injectable()
export class TiledConverterService {

    public readonly name: string = "TiledConverterService";

    /**
     * @throws {JsonTiledParseException}
    */
    public convertTiledJsonToTiledMap(name: string, tiledJson: string): TiledMap {

        const jsonTiledMap = JSON.parse(tiledJson) as JsonTiledMap;

        const tilesetOffsetDictionary: Map<string, number> = this.getTilesetOffsetDictionaryFromJsonTiledMap(jsonTiledMap);
        const objectDictionary: Map<number, TiledTilesetObject> = this.getObjectDictionaryFromJsonTiledMap(jsonTiledMap);
        const compressMethod = TiledTilesetCompressMethod.PER_ROW;

        const tiledLayers: TiledLayer[] = jsonTiledMap.layers
            .map(layer => this.convertJsonTiledLayerToTiledLayers(
                layer, tilesetOffsetDictionary, objectDictionary, compressMethod))
            .filter(layer => layer)
            .flat();

        const tiledMap: TiledMap = {
            name: name,
            width: jsonTiledMap.width,
            height: jsonTiledMap.height,
            layers: tiledLayers,
            tileWidth: jsonTiledMap.tilewidth,
            tileHeight: jsonTiledMap.tileheight,
            compressMethod: compressMethod,
        }

        return tiledMap;
    }

    /**
     * @throws {UndefinedJsonTiledLayerType}
     */
    private convertJsonTiledLayerToTiledLayers(
        jsonTiledLayer: JsonTiledLayer, 
        tilesetOffsetDictionary: Map<string, number>, 
        objectDictionary: Map<number, TiledTilesetObject>,
        compressMethod: TiledTilesetCompressMethod): TiledLayer[] {
            
        const layerType = this.getJsonTiledLayerType(jsonTiledLayer);
        switch (layerType) {
            case JsonTiledLayerType.GROUP:
                const tiledLayer = {
                    id: jsonTiledLayer.id,
                    name: jsonTiledLayer.name,
                    opacity: jsonTiledLayer.opacity,
                    type: JsonTiledLayerType.GROUP,
                    xPos: jsonTiledLayer.x,
                    yPos: jsonTiledLayer.y,
                    layers: jsonTiledLayer.layers
                        .map(layer => this.convertJsonTiledLayerToTiledLayers(
                            layer, tilesetOffsetDictionary, objectDictionary, compressMethod))
                        .flat()
                }
                return [tiledLayer];
            case JsonTiledLayerType.OBJECTS:
                return [this.convertJsonTiledLayerToTiledLayerObject(jsonTiledLayer)];
            case JsonTiledLayerType.TILESET:
                return [this.convertJsonTiledLayerToTiledLayerTileset(jsonTiledLayer, tilesetOffsetDictionary, compressMethod)];
            default:
                throw new UndefinedJsonTiledLayerTypeException(`Found unrecognized layerType "${layerType}". Maybe you forget to implement parser for this type?`);
        }
    }

    /**
     * @throws {UndefinedJsonTiledLayerType}
     */
    private getJsonTiledLayerType(jsonTiledLayer: JsonTiledLayer): JsonTiledLayerType {
        if (jsonTiledLayer.data) {
            return JsonTiledLayerType.TILESET;
        } else if (jsonTiledLayer.objects) {
            return JsonTiledLayerType.OBJECTS;
        } else if (jsonTiledLayer.layers) {
            return JsonTiledLayerType.GROUP;
        } else {
            throw new Error("Found undefined JsonTiledLayerType");
        }
    }

    private convertJsonTiledLayerToTiledLayerObject(jsonTiledLayer: JsonTiledLayer): TiledLayer {
        const tiledLayer: TiledLayer = {
            id: jsonTiledLayer.id,
            name: jsonTiledLayer.name,
            opacity: jsonTiledLayer.opacity,
            type: JsonTiledLayerType.OBJECTS,
            xPos: jsonTiledLayer.x,
            yPos: jsonTiledLayer.y,
            objects: jsonTiledLayer.objects.map((object: JsonTiledObject) => this.convertJsonTiledObjectToTiledObject(object)),
        };

        if (tiledLayer.properties) {
            tiledLayer.properties = new Map(jsonTiledLayer.properties
                .map((property: JsonTiledLayerProperty) => [property.name, property.value]));
        }

        return tiledLayer;
    }

    private convertJsonTiledObjectToTiledObject(object: JsonTiledObject): TiledObject {
        const parsedObject: TiledObject = {
            type: object.type,
            name: object.name,
            xPos: object.x,
            yPos: object.y,
            xScale: object.width,
            yScale: object.height,
        }

        if (object.properties) {
            parsedObject.properties = new Map(object.properties
                .map((property: JsonTiledLayerProperty) => [property.name, property.value]));
        }

        return parsedObject;
    }

    /**
     * @throws {JsonTiledPropertyNotFoundException}
     */
    private convertJsonTiledLayerToTiledLayerTileset(jsonTiledLayer: JsonTiledLayer, 
        tilesetOffsetDictionary: Map<string, number>, compressMethod: TiledTilesetCompressMethod): TiledLayer {

        const tiledLayer: TiledLayer = {
            id: jsonTiledLayer.id,
            name: jsonTiledLayer.name,
            opacity: jsonTiledLayer.opacity,
            type: JsonTiledLayerType.TILESET,
            xPos: jsonTiledLayer.x,
            yPos: jsonTiledLayer.y,
            height: jsonTiledLayer.width,
            width: jsonTiledLayer.height,
            properties: new Map<string, string>(),
        }

        if (jsonTiledLayer.properties) {
            tiledLayer.properties = new Map(jsonTiledLayer.properties
                .map((property: JsonTiledLayerProperty) => [property.name, property.value]));
        }

        const requiredFields: string[] = [
            "tilesetName",
            "layerCategory"
        ];

        requiredFields.forEach(property => {
            if (!tiledLayer.properties.has(property)) {
                throw new JsonTiledPropertyNotFoundException(
                    `"${property}" wasn't found in layer ${tiledLayer.name} properties`);
            }
        });

        const tilesetName: string = tiledLayer.properties.get("tilesetName");
        const tilesOffset: number = tilesetOffsetDictionary.get(tilesetName);

        console.log(tilesOffset);
        console.log(tilesetOffsetDictionary);

        if (!tilesOffset) {
            throw new JsonTiledTilesOffsetNotFoundException(
                `offset for tilesetName "${tilesetName}" in layer "${tiledLayer.name}" wasn't found`
            )
        }

        const tilesData: number[][] = this.convertJsonTiledLayerTileDataTo2DArray(
            tiledLayer.width, tiledLayer.height, 
            this.removeJsonTiledTilesDataOffset(jsonTiledLayer.data, tilesOffset));

        switch (compressMethod) {
            case TiledTilesetCompressMethod.PER_ROW:
                tiledLayer.data = this.compressTilesDataPerRow(tilesData);
                break;
            default:
                tiledLayer.data = JSON.stringify(tilesData);
                break;
        }

        return tiledLayer;
    }

    private getTilesetOffsetDictionaryFromJsonTiledMap(jsonTiledMap: JsonTiledMap): Map<string, number> {
        // Key is tileset name, value is tileset tiled offset
        return new Map<string, number>(
            jsonTiledMap.tilesets
                .filter(tileset => tileset.image)
                .map(tileset => [ tileset.name, tileset.firstgid ])
        );
    }

    private getObjectDictionaryFromJsonTiledMap(jsonTiledMap: JsonTiledMap): Map<number, TiledTilesetObject> {
        // Key is tiled id
        return new Map<number, TiledTilesetObject>(
            jsonTiledMap.tilesets
                .filter(tileset => tileset.image === undefined)
                .filter(tileset => tileset.tiles !== undefined)
                .map(tileset => {
                    return tileset.tiles.map(tile => {
                        const id = tileset.firstgid;
                        const type = tile.type;
                        const texture = tile.image
                        return [id, { type: type, texture: texture }] as [number, TiledTilesetObject];
                    })
                })
                .flat()
        )
    }

    private convertJsonTiledLayerTileDataTo2DArray(width: number, height: number, tiles: number[]): number[][] {
        return Array(height).map((row, yTile) => Array(width).map((column, xTile) => tiles[(yTile * width) + xTile]));
    }

    private removeJsonTiledTilesDataOffset(tileData: number[], offset: number): number[] {
        return tileData.map(tile => tile > 0 ? tile - offset : tile)
    }

    private compressTilesDataPerRow(tilesData: number[][]): string {
        const compressedTilesData = tilesData.map(row => {
            const compressedRow: number[] = [];
            let isZeroRow = true;
            let zeroCounter = 0;
            for (let rowIndex = 0; rowIndex < row.length; rowIndex++) {
                if (row[rowIndex] !== 0) {
                    isZeroRow = true;
                    if (zeroCounter !== 0) {
                        compressedRow.push(-1 * zeroCounter)
                    }
                    compressedRow.push(row[rowIndex]);
                    zeroCounter = 0;
                } else {
                    zeroCounter++;
                    if (rowIndex === row.length - 1) {
                        compressedRow.push(-zeroCounter);
                    }
                }
                return isZeroRow ? NaN : compressedRow
            }
            return null;
        });

        return JSON.stringify(compressedTilesData);
    }
}