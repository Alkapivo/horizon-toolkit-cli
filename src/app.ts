#!/usr/bin/env node
import "reflect-metadata";
import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';
import log4js from 'log4js';
import path from 'path';
import program, { version, CommanderStatic } from 'commander';
import DIContanier from "./inversify.config";
import { TiledConverterService } from "./service/tiled-converter-service";
import { inject, injectable } from "inversify";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { EntityGeneratorService } from "./service/entity-generator-service";
import { YYPPackage } from "./type/model";
import { TiledMap } from "./type/tiled-converter-model";
import { ItemService } from "./service/item-service";

@injectable()
export class Application {

	private tiledConverterService: TiledConverterService;
	private entityGeneratorService: EntityGeneratorService;
	private itemService: ItemService;
	private logger: log4js.Logger;

	constructor(
		@inject(TiledConverterService) tiledConverter: TiledConverterService,
		@inject(EntityGeneratorService) entityGenerator: EntityGeneratorService,
		@inject(ItemService) itemService: ItemService) {

		this.tiledConverterService = tiledConverter;
		this.entityGeneratorService = entityGenerator;
		this.itemService = itemService;

		// TODO wrap
		this.logger = log4js.getLogger();
		this.logger.level = "debug";
	}

	public run() {

		// Empty command
		if (process.argv.length === 2) {
			process.argv.push('-h')
		}

		this.printLogo();

		// Configure CLI
		program
			.version(require('./../package.json'))
			.description("CLI Toolkit. Run in root folder of horizon-engine project.");

		program
			.command("map <map_name>")
			.alias("mm")
			.description("Compile exported map to .mm format")
			.action((mapName: string) => {
				this.logger.info(`Start building map ${mapName}`);

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
			.command("package")
			.alias("pkg")
			.description("Create resourcePackage")
			.action(async () => {

				//const yypPackage = this.getYYPPackage();
				/*
				const googleDriveRows = await this.googleDriveService.getSheet({
					sheetId: "12tBtTTIza2TpTgAhpFzPzQfC7gqmzZ7xCqwWeHNFqtc",
					sheetName: "item",
					credentialsPath: "secret/credentials.json",
				});
				console.log("Google drive rows:", googleDriveRows);

				const xlsxRows = this.excelService.getSheet({
					sheetName: "item",
					sheetPath: "item_data.xlsx",
				})
				console.log(xlsxRows);
				*/
				this.itemService.buildItems();

			});

		program
			.command("build")
			.alias("b")
			.description("Build project")
			.action(() => {
				const yypPackage = this.getYYPPackage();
			});

		program
			.command("test [type]")
			.alias("tst")
			.description("Run YYPTestEngine on project")
			.action((type?) => {
				const yypPackage = this.getYYPPackage();
			});

		program
			.command("entity [classses...]")
			.alias("e")
			.description("Generate entity code and inject it to yyp project. All entites will be build if you don't pass any [classes...]")
			.action((classes) => {
				const yypPackage = this.getYYPPackage();
				this.entityGeneratorService.buildEntities(
					classes,
					yypPackage.horizonToolkitSettings.paths.yypPath,
					yypPackage.horizonToolkitSettings.paths.modelPath,
					yypPackage.name
				);
			})

		program
			.command("meat-builder [options...]")
			.alias("pkg")
			.description("@Meat: Compiler for: [ npc, mob, item, quest, dialogue, langPack, calendarEvent, timeline ]")
			.action((options?) => {
				const yypPackage = this.getYYPPackage();
			});
		
		program
			.command("meat-builder")
			.alias("pkg")
			.description("@Meat: Compiler for: [ npc, mob, item, quest, dialogue, langPack, calendarEvent, timeline ]")
			.action(() => {
				const yypPackage = this.getYYPPackage();
			});

		this.logger.debug(`Parsing arguments: ${process.argv.toString().split(",").filter(arg => !(arg.includes("node.exe") || arg.includes("app.js"))).join(" ")}`)
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

		const drawLogo = () => {
			const logo =  "     _         _                _                                      _            \n" +
			"    /_\\____   | |              (_)                                    (_)           \n" +
			"   _\\_____/   | |__   ___  _ __ _ _______  _ __ ______ ___ _ __   __ _ _ _ __   ___ \n" +
			"  /__\\__\\     | '_ \\ / _ \\| '__| |_  / _ \\| '_ \\______/ _ \\ '_ \\ / _` | | '_ \\ / _ \\\n" +
			" _____\\_/_    | | | | (_) | |  | |/ / (_) | | | |    |  __/ | | | (_| | | | | |  __/\n" +
			"/_________\\   |_| |_|\\___/|_|  |_/___\\___/|_| |_|     \\___|_| |_|\\__, |_|_| |_|\\___|\n" +
			"                                                                  __/ |             \n" +
			"                                                                 |___/              ";
	
			console.log(
				chalk.magenta(
					logo
					/*
					figlet.textSync('HE CLI', {
						font: "The Edge", //Small Poison, Small, Straight, The Edge, S Blood, Stick Letters
						horizontalLayout: "full"
					})
					*/
				),
			);
		}
		console.log(chalk.red("v", require("../package.json").version));
		try {
			const yypPackage: YYPPackage = this.getYYPPackage();
			this.logger.info("Found yyp-package. ")
			if (yypPackage.horizonToolkitSettings.cli) {
				this.logger.info("Found yyp-package cli settings. ")
				console.log(
					chalk.red(
						figlet.textSync(yypPackage.horizonToolkitSettings.cli.displayName, {
							font: yypPackage.horizonToolkitSettings.cli.font,
							horizontalLayout: "full"
						})
					)
				);
			} else {
				drawLogo();
			}
		} catch (exception) {
			drawLogo();
		}

		/*
		const fonts = [ "1Row","3-D","3D Diagonal","3D-ASCII","3x5","4Max","5 Line Oblique","Acrobatic","Alligator","Alligator2","Alpha","Alphabet","AMC 3 Line","AMC 3 Liv1","AMC AAA01","AMC Neko","AMC Razor","AMC Razor2","AMC Slash","AMC Slider","AMC Thin","AMC Tubes","AMC Untitled","ANSI Regular","ANSI Shadow","Arrows","ASCII New Roman","Avatar","B1FF","Banner","Banner3-D","Banner3","Banner4","Barbwire","Basic","Bear","Bell","Benjamin","Big Chief","Big Money-ne","Big Money-nw","Big Money-se","Big Money-sw","Big","Bigfig","Binary","Block","Blocks","Bloody","Bolger","Braced","Bright","Broadway KB","Broadway","Bubble","Bulbhead","Caligraphy","Caligraphy2","Calvin S","Cards","Catwalk","Chiseled","Chunky","Coinstak","Cola","Colossal","Computer","Contessa","Contrast","Cosmike","Crawford","Crawford2","Crazy","Cricket","Cursive","Cyberlarge","Cybermedium","Cybersmall","Cygnet","DANC4","Dancing Font","Decimal","Def Leppard","Delta Corps Priest 1","Diamond","Diet Cola","Digital","Doh","Doom","DOS Rebel","Dot Matrix","Double Shorts","Double","Dr Pepper","DWhistled","Efti Chess","Efti Font","Efti Italic","Efti Piti","Efti Robot","Efti Wall","Efti Water","Electronic","Elite","Epic","Fender","Filter","Fire Font-k","Fire Font-s","Flipped","Flower Power","Four Tops","Fraktur","Fun Face","Fun Faces","Fuzzy","Georgi16","Georgia11","Ghost","Ghoulish","Glenyn","Goofy","Gothic","Graceful","Gradient","Graffiti","Greek","Heart Left","Heart Right","Henry 3D","Hex","Hieroglyphs","Hollywood","Horizontal Left","Horizontal Right","ICL-1900","Impossible","Invita","Isometric1","Isometric2","Isometric3","Isometric4","Italic","Ivrit","Jacky","Jazmine","Jerusalem","JS Block Letters","JS Bracket Letters","JS Capital Curves","JS Cursive","JS Stick Letters","Katakana","Kban","Keyboard","Knob","Konto Slant","Konto","Larry 3D 2","Larry 3D","LCD","Lean","Letters","Lil Devil","Line Blocks","Linux","Lockergnome","Madrid","Marquee","Maxfour","Merlin1","Merlin2","Mike","Mini","Mirror","Mnemonic","Modular","Morse","Morse2","Moscow","Mshebrew210","Muzzle","Nancyj-Fancy","Nancyj-Improved","Nancyj-Underlined","Nancyj","Nipples","NScript","NT Greek","NV Script","O8","Octal","Ogre","Old Banner","OS2","Patorjk's Cheese","Patorjk-HeX","Pawp","Peaks Slant","Peaks","Pebbles","Pepper","Poison","Puffy","Puzzle","Pyramid","Rammstein","Rectangles","Red Phoenix","Relief","Relief2","Reverse","Roman","Rot13","Rotated","Rounded","Rowan Cap","Rozzo","Runic","Runyc","S Blood","Santa Clara","Script","Serifcap","Shadow","Shimrod","Short","SL Script","Slant Relief","Slant","Slide","Small Caps","Small Isometric1","Small Keyboard","Small Poison","Small Script","Small Shadow","Small Slant","Small Tengwar","Small","Soft","Speed","Spliff","Stacey","Stampate","Stampatello","Standard","Star Strips","Star Wars","Stellar","Stforek","Stick Letters","Stop","Straight","Stronger Than All","Sub-Zero","Swamp Land","Swan","Sweet","Tanja","Tengwar","Term","Test1","The Edge","Thick","Thin","THIS","Thorned","Three Point","Ticks Slant","Ticks","Tiles","Tinker-Toy","Tombstone","Train","Trek","Tsalagi","Tubular","Twisted","Two Point","Univers","USA Flag","Varsity","Wavy","Weird","Wet Letter","Whimsy","Wow" ];
		fonts.forEach(font => console.log(
			chalk.red(
				figlet.textSync("HORIZON-ENGINE-TOOLKIT", {
					font: font,
					horizontalLayout: "full"
				})
			),
			"\n" + font
		))
		*/
		
	}
}

const application: Application = DIContanier.resolve<Application>(Application);
application.run();




