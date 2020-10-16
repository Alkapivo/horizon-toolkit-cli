import log4js from 'log4js';
import { injectable, inject } from "inversify";
import { GoogleSheetApiService } from "./google-drive-api-service";
import { ExcelService } from "./excel-service";
import { Mob, MobParseException, MobStatisticPrototype, MobBehaviour, Loot, MobBehaviourFieldsDictionary, requiredMobBehaviourFieldsDictionary, MobTypeNotFoundException, MobBehaviourGroup } from "../type/game-content/mob-service-model";
import { FieldType } from '../type/game-content/game-content-model';
import { assert } from 'console';
import { DamageStatistic, ResistanceStatistic, ResistanceDamageType, ResistanceEffect } from '../type/game-content/item-service-model';

@injectable()
export class MobService {

    private googleDriveService: GoogleSheetApiService;
    private excelService: ExcelService;
    private logger: log4js.Logger;

    private mobSpreadsheetId: string = "1K4Fcx8lsaKd9N4MDKnPmBfHAtf17NUyA3u5VYPBFTCk";

    constructor(
        @inject(GoogleSheetApiService) googleDriveService: GoogleSheetApiService,
        @inject(ExcelService) excelService: ExcelService) {

        this.googleDriveService = googleDriveService;
        this.excelService = excelService;

        this.logger = log4js.getLogger();
        this.logger.level = "debug";
    }

    public async buildMobs(): Promise<Mob[]> {
        const googleDriveRows = await this.googleDriveService.getSheet({
            sheetId: this.mobSpreadsheetId,
            sheetName: "mob_data",
            credentialsPath: "secret/credentials.json",
        });

        const mobs: Mob[] = googleDriveRows.rows
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
                    const exp = Number(row[4].replace(",", "."));
                    columnIndex++;
                    const statistic = (JSON.parse(row[5]) as MobStatisticPrototype);
                    columnIndex++;
                    const behaviourGroup = (JSON.parse(row[6]) as MobBehaviourGroup);
                    columnIndex++;
                    const loot = (JSON.parse(row[7]) as Loot[]);
                    columnIndex++;
                    const eq = (JSON.parse(row[8]) as string[]);

                    const mob: Mob = {
                        mobId: id,
                        name: name,
                        type: type,
                        texture: texture,
                        experience: exp,
                        statistic: statistic,
                        behaviourGroup: behaviourGroup,
                        loot: loot,
                        eq: eq,
                    }

                    this.logger.info(`Mob "${mob.name}" parsed.`);

                    return mob;
                } catch (exception) {
                    throw new MobParseException(`Unable to parse mob at excel index ${index + 1}. Column: "${googleDriveRows.rows[0][columnIndex]}". Message: ${exception}.`);
                }
            })
            .filter(mob => mob);

        return mobs;
    }

    private parseToType(fieldType: string, data: any): any {
        switch (fieldType) {
            case "string":
                return data as string;
            case "number":
                const value = Number(data);
                if (value === NaN) {
                    throw new MobParseException(`Cannot parse field to number. Raw data: ${data}`);
                }
                return value;
            case "boolean":
                return data as boolean;
            case "DamageStatistic":
                return (data as DamageStatistic);
            case "ResistanceStatistic":
                return (data as ResistanceStatistic);
            case "ResistanceDamageType":
                return (data as ResistanceDamageType);
            case "ResistanceEffect":
                return (data as ResistanceEffect);
            default:
                throw new MobParseException(`Field parser implementation for type "${fieldType}" wasn't found`);
        }
    }
}
