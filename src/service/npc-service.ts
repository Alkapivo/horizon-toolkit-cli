import log4js from 'log4js';
import { injectable, inject } from "inversify";
import { GoogleSheetApiService } from "./google-drive-api-service";
import { ExcelService } from "./excel-service";
import { FieldType } from '../type/game-content/game-content-model';
import { assert } from 'console';
import { NPC, NPCParseException, TradeEntry, NPCParameters, NPCEcho, npcParametersFieldDictionary, NPCTypeNotFoundException, SellCategoryModifier, NpcIcon } from '../type/game-content/npc-service-model';

@injectable()
export class NPCService {

    private googleDriveService: GoogleSheetApiService;
    private excelService: ExcelService;
    private logger: log4js.Logger;

    private npcSpreadsheetId: string = "1C2SDmYenTjcMWSUr6O4rvBPxidqpoB722O2bzhuuKoU";

    constructor(
        @inject(GoogleSheetApiService) googleDriveService: GoogleSheetApiService,
        @inject(ExcelService) excelService: ExcelService) {

        this.googleDriveService = googleDriveService;
        this.excelService = excelService;

        this.logger = log4js.getLogger();
        this.logger.level = "debug";
    }

    public async buildNPCs(): Promise<NPC[]> {
        const googleDriveRows = await this.googleDriveService.getSheet({
            sheetId: this.npcSpreadsheetId,
            sheetName: "npc_data",
            credentialsPath: "secret/credentials.json",
        });

        const npcs: NPC[] = googleDriveRows.rows
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
                    const mobId = row[2];
                    columnIndex++;
                    const dialogue = row[3];
                    columnIndex++;
                    const tradeInventory = (JSON.parse(row[4]) as TradeEntry[]);
                    columnIndex++;
                    const npcParameters = (JSON.parse(row[5]) as NPCParameters);
                    columnIndex++;
                    const echoes = (JSON.parse(row[6]) as NPCEcho[]);
                    columnIndex++;
                    const icons = (JSON.parse(row[7]) as NpcIcon[]);
                    
                    const npc: NPC = {
                        npcId: id,
                        name: name,
                        mobId: mobId,
                        dialogue: dialogue,
                        tradeInventory: tradeInventory,
                        parameters: npcParameters,
                        echoes: echoes,
                        icons: icons
                    }

                    this.logger.info(`NPC "${npc.name}" parsed.`);

                    return npc;

                } catch (exception) {
                    throw new NPCParseException(`Unable to parse npc at excel index ${index + 1}. Column: "${googleDriveRows.rows[0][columnIndex]}". Message: ${exception}.`);
                }
            })
            .filter(npc => npc);
        
        return npcs;
    }

    private parseNPCParameters(npcParameters): NPCParameters {
        const fields: FieldType[] = this.getFieldsForNPCParameters();

        let parsedParameters = {};
        fields.forEach(field => {
            if (field.isRequired && !Object.keys(npcParameters).includes(field.name)) {
                throw new NPCParseException(`Field ${field.name} is required`);
            }

            if (!field.isRequired) {
                const value = npcParameters[field.name];
                if (value) {
                    parsedParameters[field.name] = this.parseToType(field.type, value)
                }
            } else {
                parsedParameters[field.name] = this.parseToType(field.type, npcParameters[field.name]);
            }
        });

        return parsedParameters as NPCParameters;
    }

    private parseToType(fieldType: string, data: any) {
        switch (fieldType) {
            case "string":
                return data as string;
            case "number":
                const value = Number(data);
                if (value === NaN) {
                    throw new NPCParseException(`Cannot parse field to number. Raw data: ${data}`);
                }
                return value;
            case "boolean":
                return data as boolean;
            case "SellCategoryModifier[]":
                return data as SellCategoryModifier[];
            default:
                throw new NPCParseException(`Field parser implementation for type "${fieldType}" wasn't found`);
        }
    }

    private getFieldsForNPCParameters(): FieldType[] {
        const npcParametersDictionary = npcParametersFieldDictionary;
        const fields: FieldType[] = Object.keys(npcParametersDictionary)
            .map(parameter => npcParametersDictionary[parameter]);

        return fields;
    }
}
