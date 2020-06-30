#!/usr/bin/env node
import "reflect-metadata";
import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';
import path from 'path';
import program from 'commander';
import DIContanier from "./inversify.config";
import { TiledConverterService } from "./service/tiled-converter-service";
import { inject, injectable } from "inversify";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { EntityGeneratorService } from "./service/entity-generator-service";
import { YYPPackage } from "./type/model";
import { TiledMap } from "./type/tiled-converter-model";

@injectable()
export class Application {

	private tiledConverterService: TiledConverterService;
	private entityGeneratorService: EntityGeneratorService;

	constructor(
		@inject(TiledConverterService) tiledConverter: TiledConverterService,
		@inject(EntityGeneratorService) entityGenerator: EntityGeneratorService) {

		this.tiledConverterService = tiledConverter;
		this.entityGeneratorService = entityGenerator;
	}

	public run(): void {

		// Empty command
		if (process.argv.length === 2) {
			process.argv.push('-h')
		}

		this.printLogo();

		// Configure CLI
		program
			.version(require('./../package.json'))
			.description("CLI Toolkit. Use in root folder of horizon-engine project.");

		program
			.command("map <map_name>")
			.alias("mm")
			.description("Compile exported map to .mm format")
			.action((mapName: string) => {
				const yypPackage = this.getYYPPackage();
				const exportedMapDirectoryPath: string = path.posix
					.normalize(yypPackage.horizonToolkitSettings.paths.tiledExportedPath);
				const convertedMapDirectoryPath: string = path.posix
					.normalize(yypPackage.horizonToolkitSettings.paths.tiledConvertedPath);
					
				mkdirSync(exportedMapDirectoryPath, { recursive: true });
				mkdirSync(convertedMapDirectoryPath, { recursive: true });

				const tiledJson: string = readFileSync(`${exportedMapDirectoryPath}/${mapName}.json`)
					.toString();
				const tiledMap: TiledMap = this.tiledConverterService
					.convertTiledJsonToTiledMap(mapName, tiledJson);

				writeFileSync(
					`${convertedMapDirectoryPath}/${mapName}.mm`,
					JSON.stringify(tiledMap)
				);
			})

		program
			.command("entity [classses...]")
			.alias("e")
			.description("Generate entity code and inject it to horizon-engine project. All entites will be build if you don't pass [classes]")
			.action((classes) => {
				const yypPackage = this.getYYPPackage();
				this.entityGeneratorService.buildEntities(
					classes,
					yypPackage.horizonToolkitSettings.paths.yypPath,
					yypPackage.horizonToolkitSettings.paths.modelPath
				);
			})

		program.parse(process.argv);
	}

	public getYYPPackage() {
		const rootPath = path.posix.normalize(process.cwd());
		const yypPackagePath = `${rootPath}/yyp-package.json`;

		if (existsSync(yypPackagePath)) {
			return JSON.parse(readFileSync(yypPackagePath).toString()) as YYPPackage;
		} else {
			throw new Error("yyp-package.json wasn't found");
		}
	}

	private printLogo(): void {
		console.log(
			chalk.green(
				figlet.textSync('horizon-engine-toolkit', {
					font: "Stick Letters",
					horizontalLayout: "full"
				})
			),
		)
	}
}

const application: Application = DIContanier.resolve<Application>(Application);
application.run();




