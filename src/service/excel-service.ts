import excelToJson from "convert-excel-to-json";
import path from "path";
import { injectable } from "inversify";
import { ExcelRequest, ExcelServiceSheetNotFoundException } from "../type/excel-model";
import { Sheet } from "../type/google-drive-api-mode";


@injectable()
export class ExcelService {

    public getSheet(excelRequest: ExcelRequest): Sheet {

        const xlsxPath = path.posix.normalize(process.cwd()) + `/${excelRequest.sheetPath}`;
        const result = excelToJson({
            sourceFile: xlsxPath,
        })

        if (!Object.keys(result).find(sheetName => sheetName === excelRequest.sheetName)) {
            throw new ExcelServiceSheetNotFoundException(`Cannot find sheet ${excelRequest.sheetName}`);
        }
        
        const sheet = {
            name: excelRequest.sheetName,
            rows: (result[excelRequest.sheetName] as Object[])
                .map(row => Object.values(row)
                    .map(element => `${element}`)),
        }

        return sheet;
    }
}