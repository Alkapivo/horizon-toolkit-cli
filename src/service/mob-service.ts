import log4js from 'log4js';
import { injectable, inject } from "inversify";
import { GoogleSheetApiService } from "./google-drive-api-service";
import { ExcelService } from "./excel-service";
import { Mob, MobParseException, MobStatistic, MobBehaviour, Loot, MobBehaviourFieldsDictionary, requiredMobBehaviourFieldsDictionary, MobTypeNotFoundException } from "../type/game-content/mob-service-model";
import { FieldType } from '../type/game-content/game-content-model';
import { assert } from 'console';

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
                    const id = Number(row[0].replace(",", "."));
                    assert(id !== NaN && id, "mobId is NaN");
                    columnIndex++;
                    const name = row[1];
                    columnIndex++;
                    const type = row[2];
                    columnIndex++;
                    const texture = row[3];
                    columnIndex++;
                    const hp = Number(row[4].replace(",", "."));
                    assert(hp !== NaN && hp, "hp is NaN");
                    columnIndex++;
                    const exp = Number(row[5].replace(",", "."));
                    assert(exp !== NaN && exp, "exp is NaN");
                    columnIndex++;
                    const statistic = (JSON.parse(row[6]) as MobStatistic);
                    columnIndex++;
                    const behaviours = (JSON.parse(row[7]) as MobBehaviour[])
                        .map(behaviour => this.parseMobBehaviour(behaviour));
                    columnIndex++;
                    const loot = (JSON.parse(row[8]) as Loot[]);
                    columnIndex++;
                    const eq = (JSON.parse(row[9]) as number[]);

                    const mob: Mob = {
                        mobId: id,
                        name: name,
                        type: type,
                        texture: texture,
                        hp: hp,
                        experience: exp,
                        statistic: statistic,
                        behaviours: behaviours,
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

    private parseMobBehaviour(behaviour): MobBehaviour {

        const requiredFields = this.getRequiredFieldsForBehaviour(behaviour);

        let parsedParameters = {};
        requiredFields.forEach(requiredField => {
            if (requiredField.isRequired && !Object.keys(behaviour.parameters).includes(requiredField.name)) {
                throw new MobParseException(`Field ${requiredField.name} is required`);
            }

            if (!requiredField.isRequired) {
                const value = behaviour.parameters[requiredField.name];
                if (value) {
                    parsedParameters[requiredField.name] = this.parseToType(requiredField.type, value);
                }
            } else {
                parsedParameters[requiredField.name] = this.parseToType(requiredField.type,
                    behaviour.parameters[requiredField.name]);
            }
        });

        const mobBehaviour: MobBehaviour =
            Object.keys(parsedParameters).length > 0 ?
                {
                    name: behaviour.name,
                    parameters: parsedParameters,
                } :
                {
                    name: behaviour.name,
                }

        return mobBehaviour as MobBehaviour;
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
            default:
                throw new MobParseException(`Field parser implementation for type "${fieldType}" wasn't found`);
        }
    }

    private getRequiredFieldsForBehaviour(behaviour): FieldType[] {

        const behaviourDictionary: MobBehaviourFieldsDictionary = requiredMobBehaviourFieldsDictionary;
        const fields: FieldType[] = behaviourDictionary[behaviour.name];

        if (!fields) {
            throw new MobTypeNotFoundException(`type ${behaviour.name} wasn't found`);
        }

        return fields;
    }
}
