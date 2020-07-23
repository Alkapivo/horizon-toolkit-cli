import "reflect-metadata";
import log4js from 'log4js';
import { Container } from "inversify";
import { TiledConverterService } from "./service/tiled-converter-service";
import { EntityGeneratorService } from "./service/entity-generator-service";
import { GoogleSheetApiService } from "./service/google-drive-api-service";
import { ExcelService } from "./service/excel-service";
import { ItemService } from "./service/item-service";
import { MobService } from "./service/mob-service";
import { NPCService } from "./service/npc-service";


const DIContanier = new Container();
DIContanier.bind<TiledConverterService>(TiledConverterService).toSelf();
DIContanier.bind<EntityGeneratorService>(EntityGeneratorService).toSelf();
DIContanier.bind<GoogleSheetApiService>(GoogleSheetApiService).toSelf();
DIContanier.bind<ExcelService>(ExcelService).toSelf();
DIContanier.bind<ItemService>(ItemService).toSelf();
DIContanier.bind<MobService>(MobService).toSelf();
DIContanier.bind<NPCService>(NPCService).toSelf();

export default DIContanier;

