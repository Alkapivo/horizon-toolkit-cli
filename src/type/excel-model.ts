export class ExcelServiceSheetNotFoundException extends Error {
    constructor(message: string) {
        super(`ExcelServiceSheetNotFoundException: ${message}`);
    }
}

export interface ExcelRequest {
    sheetPath: string, 
    sheetName: string, 
}