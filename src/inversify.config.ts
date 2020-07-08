import "reflect-metadata";
import log4js from 'log4js';
import { Container } from "inversify";
import { TiledConverterService } from "./service/tiled-converter-service";
import { EntityGeneratorService } from "./service/entity-generator-service";
import { GoogleSheetApiService } from "./service/google-drive-api-service";
import { ExcelService } from "./service/excel-service";


const DIContanier = new Container();
DIContanier.bind<TiledConverterService>(TiledConverterService).toSelf();
DIContanier.bind<EntityGeneratorService>(EntityGeneratorService).toSelf();
DIContanier.bind<GoogleSheetApiService>(GoogleSheetApiService).toSelf();
DIContanier.bind<ExcelService>(ExcelService).toSelf();

export default DIContanier;

