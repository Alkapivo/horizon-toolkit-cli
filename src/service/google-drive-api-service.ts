import { injectable } from "inversify";
import { google } from 'googleapis'
import { Sheet, SheetRequest, GoogleDriveApiException } from "../type/google-drive-api-mode";

@injectable()
export class GoogleSheetApiService {

    public async getSheet(sheetRequest: SheetRequest): Promise<Sheet> {
        try {
            const rows = await this.getSheetFromDrive(
                sheetRequest.credentialsPath,
                sheetRequest.sheetId,
                sheetRequest.sheetName,
            )
            
            return {
                name: sheetRequest.sheetName,
                rows: rows as string[][],
            };
        } catch (exception) {
            throw new GoogleDriveApiException(exception.message);
        }
    }

    private async getSheetFromDrive(credentialsPath: string, sheetId: string, query: string): Promise<string[][]> {
        const auth = await google.auth.getClient({
            keyFile: credentialsPath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        })

        const sheets = google.sheets('v4')
        const values: any = await new Promise((resolve, reject) => {
            sheets.spreadsheets.values.get(
                {
                    auth,
                    spreadsheetId: sheetId,
                    range: query
                },
                (err, data) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(data)
                    }
                }
            )
        })

        return values.data.values
    }
}