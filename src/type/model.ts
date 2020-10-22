export interface YYPPackage {
    name: string,
    horizonToolkitSettings?: {
        cli?: {
            displayName: string,
            font: string,
        }
        paths: {
            modelPath: string,
            tiledExportedPath: string,
            tiledConvertedPath: string,
            yypPath: string,
        }
    },
    googleDriveApiSettings?: {
        credentialsPath: string,
    },
    meatSettings?: {
        mpkgPath: string,
        dialoguePath: string,
        chestsPath: string,
        groundDictionaryPath: string
        textureStripDictionaryPath: string
        skillPrototypesPath: string
    }
}




