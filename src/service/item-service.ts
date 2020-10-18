import log4js from 'log4js';
import { injectable, inject } from "inversify";
import { GoogleSheetApiService } from "./google-drive-api-service";
import { ExcelService } from "./excel-service";
import { requiredItemFieldsDictionary, ItemTypeNotFoundException, ItemParseException, Item, ItemParameter, DamageStatistic, DamageEffect, MovementModifier, ResistanceStatistic, ResistanceDamageType, ResistanceEffect, BombStatistic, BookData, ToolData, ItemFieldsDictionary } from "../type/game-content/item-service-model";
import { assert } from 'console';
import { FieldType } from '../type/game-content/game-content-model';

@injectable()
export class ItemService {

    private googleDriveService: GoogleSheetApiService;
    private excelService: ExcelService;
    private logger: log4js.Logger;

    private itemSpreadsheetId: string = "12tBtTTIza2TpTgAhpFzPzQfC7gqmzZ7xCqwWeHNFqtc";

    constructor(
        @inject(GoogleSheetApiService) googleDriveService: GoogleSheetApiService,
        @inject(ExcelService) excelService: ExcelService) {

        this.googleDriveService = googleDriveService;
        this.excelService = excelService;

        this.logger = log4js.getLogger();
        this.logger.level = "debug";
    }

    public async buildItems(): Promise<Item[]> {
        const googleDriveRows = await this.googleDriveService.getSheet({
            sheetId: this.itemSpreadsheetId,
            sheetName: "item",
            credentialsPath: "secret/credentials.json",
        });

        const items: Item[] = googleDriveRows.rows
            .map((row, index) => {
                if (index === 0) {
                    return undefined;
                }

                let columnIndex = 0;
                try {
                    const id = row[0];
                    columnIndex++;
                    const name = row[1];
                    columnIndex++;
                    const type = row[2];
                    columnIndex++;
                    const texture = row[3];
                    columnIndex++;

                    if (texture.includes("@")) {
                        return undefined;
                    }

                    const isStackable = (row[4] as string).toLowerCase() === "true";
                    columnIndex++;
                    const description = row[5];
                    columnIndex++;
                    const capacity = Number(row[6].replace(",", "."));
                    columnIndex++;
                    const parameters = this.parseItemParametersByType(type, JSON.parse(row[7]));

                    const item: Item = {
                        itemId: id,
                        name: name,
                        type: type,
                        texture: texture,
                        isStackable: isStackable,
                        description: description,
                        capacity: capacity,
                        parameters: parameters,
                    }

                    this.logger.info(`Item "${item.name}" parsed.`);

                    return item;
                } catch (exception) {
                    throw new ItemParseException(`Unable to parse item at excel index ${index + 1}. Column: "${googleDriveRows.rows[0][columnIndex]}". Message: ${exception}`);
                }
            })
            .filter(item => item);

        return items;
    }

    private parseItemParametersByType(type: string, parameters: {}): ItemParameter {
        const requiredFields = this.getRequiredFieldsForType(type);

        let parsedParameters = {}
        requiredFields.forEach(requiredField => {
            if (!Object.keys(parameters).includes(requiredField.name)) {
                throw new ItemParseException(`Field ${requiredField.name} is required`);
            }
            parsedParameters[requiredField.name] = this.parseToType(requiredField.type, parameters[requiredField.name]);
        });

        const goldValue = parameters["goldValue"];
        if (goldValue) {
            parsedParameters["goldValue"] = goldValue;
        }

        const rarity = parameters["goldValue"];
        if (rarity) {
            parsedParameters["rarity"] = rarity;
        }

        return parsedParameters as ItemParameter;
    }

    private parseToType(fieldType: string, data: any): any {
        switch (fieldType) {
            case "string":
                return data as string;
            case "number":
                const value = Number(data);
                if (value === NaN) {
                    throw new ItemParseException(`Cannot parse field to number. Raw data: ${data}`);
                }
                return value;
            case "boolean":
                return (data as boolean);
            case "MovementModifier":
                return (data as MovementModifier);
            case "DamageEffect[]":
                return (data.map(entry => entry as DamageEffect));
            case "DamageStatistic":
                return (data as DamageStatistic);
            case "ResistanceStatistic":
                return (data as ResistanceStatistic);
            case "ResistanceDamageType":
                return (data as ResistanceDamageType);
            case "ResistanceEffect":
                return (data as ResistanceEffect);
            case "BombStatistic":
                return (data as BombStatistic);
            case "BookData":
                return (data as BookData);
            case "ToolData":
                return (data as ToolData);
            default:
                throw new ItemParseException(`Field parser implementation for type "${fieldType}" wasn't found`);
        }
    }

    private getRequiredFieldsForType(type: string): FieldType[] {

        const itemDictionary: ItemFieldsDictionary = requiredItemFieldsDictionary;
        const fields: FieldType[] = itemDictionary[type];

        if (!fields) {
            throw new ItemTypeNotFoundException(`type ${type} wasn't found`);
        }

        return fields;
    }
}