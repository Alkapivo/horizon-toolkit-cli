export class GoogleDriveApiException extends Error {
    constructor(message: string) {
        super(`GoogleDriveApiException: ${message}`);
    }
}

export interface Sheet {
    name: string,
    rows: string[][],
}

export interface SheetRequest {
    sheetId: string, 
    sheetName: string, 
    credentialsPath: string,
}