import { injectable, inject } from "inversify";
import { GoogleSheetApiService } from "./google-drive-api-service";
import { ExcelService } from "./excel-service";
import { requiredItemFieldsDictionary, ItemTypeNotFoundException, ItemParseException, FieldType, Item, ItemParameter, ItemFieldsDictionary, MovementModifier, DamageEffect } from "../type/item-service-model";

@injectable()
export class ItemService {
    
    private googleDriveService: GoogleSheetApiService;
    private excelService: ExcelService;

    private itemSpreadsheetId: string = "12tBtTTIza2TpTgAhpFzPzQfC7gqmzZ7xCqwWeHNFqtc";

    constructor(
        @inject(GoogleSheetApiService) googleDriveService: GoogleSheetApiService,
		@inject(ExcelService) excelService: ExcelService) {

        this.googleDriveService = googleDriveService;
        this.excelService = excelService;
    }

    public async buildItems() {
        const googleDriveRows = await this.googleDriveService.getSheet({
            sheetId: this.itemSpreadsheetId,
            sheetName: "item",
            credentialsPath: "secret/credentials.json",
        });

        const items: Item[] = googleDriveRows.rows
            .map((row, index) => {
                if (index == 0) {
                    return undefined;
                }

                try {
                    const id = Number(row[0]);
                    const name = row[1];
                    const type = row[2];
                    const texture = row[3];
                    const isStackable = (row[4] as string).toLowerCase() === "true";
                    const description = row[5];
                    const capacity = Number(row[6]);
                    const parameters = this.parseItemParametersByType(type, JSON.parse(row[7]));

                    const item = {
                        id: id,
                        name: name,
                        type: type,
                        texture: texture,
                        isStackable: isStackable,
                        description: description,
                        capacity: capacity,
                        parameters: parameters,
                    }
                    return item;
                } catch (exception) {
                    throw new ItemParseException(`Unable to parse item at excel index ${index + 1}. Message: ${exception}`);
                }
            })
            .filter(item => item);

        console.log(items);
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

        return parsedParameters;
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
                return data as boolean;
            case "MovementModifier":
                return (data as MovementModifier);
            case "DamageEffect[]":
                return data.map(entry => entry as DamageEffect);
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