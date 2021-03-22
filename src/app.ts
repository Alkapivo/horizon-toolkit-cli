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
import { MobService } from "./service/mob-service";
import { NPCService } from "./service/npc-service";
import { DialogueService } from "./service/dialogue-service";
import { ChestPrototype } from "./type/game-content/game-content-model";

@injectable()
export class Application {

	private tiledConverterService: TiledConverterService;
	private entityGeneratorService: EntityGeneratorService;
	private itemService: ItemService;
	private mobService: MobService;
	private npcService: NPCService;
	private dialogueService: DialogueService;
	private logger: log4js.Logger;

	constructor(
		@inject(TiledConverterService) tiledConverter: TiledConverterService,
		@inject(EntityGeneratorService) entityGenerator: EntityGeneratorService,
		@inject(ItemService) itemService: ItemService,
		@inject(MobService) mobService: MobService,
		@inject(NPCService) npcService: NPCService,
		@inject(DialogueService) dialogueService: DialogueService) {

		this.tiledConverterService = tiledConverter;
		this.entityGeneratorService = entityGenerator;
		this.itemService = itemService;
		this.mobService = mobService;
		this.npcService = npcService;
		this.dialogueService = dialogueService;

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
			.command("map <map_name> [types...]")
			.alias("mm")
			.description("Compile exported map to .mm format")
			.action((mapName: string, types) => {
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
					.convertTiledJsonToTiledMap(mapName, tiledJson, types);

				writeFileSync(
					`${convertedMapDirectoryPath}/${mapName}.mm`,
					JSON.stringify(tiledMap)
				);
			})

		program
			.command("test [type]")
			.alias("tst")
			.description("Run YYPTestEngine on project")
			.action((type?) => {
				const yypPackage = this.getYYPPackage();
			});

		program
			.command("entity")
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
			.command("meat-package-builder [options...]")
			.alias("mpkg")
			.description("@Meat: Compile meat-asset into meat_package.")
			.action(async (options?) => {
				const yypPackage = this.getYYPPackage();

				try {
					const items = await this.itemService.buildItems();
					const mobs = await this.mobService.buildMobs();
					const npcs = await this.npcService.buildNPCs();

					const dialogueModelPath = path.posix
						.normalize(yypPackage.meatSettings.dialoguePath);
					const dialoguePrototypes: any[] = JSON.parse(readFileSync(dialogueModelPath + "/model.json").toString())
						.map(entry => {
							const dialoguePrototypeEntry = {
								name: entry.name,
								dialoguesLangPack: Object
									.keys(entry.path)
									.map(langCode => {
										const dialogueLangPackPath = path.posix
											.normalize(dialogueModelPath + "/" + entry.path[langCode])
										const dialogue = JSON
											.parse(readFileSync(dialogueLangPackPath)
											.toString()
										)
										
										return {
											key: langCode,
											value: this.dialogueService.buildDialogue(entry.name, dialogue, langCode)
										}
									})
									.reduce((_map, _obj) => {
										_map[_obj.key] = _obj.value
										return _map;
									}, {})
							}

							//this.logger.info(`DialoguePrototype ${dialoguePrototypeEntry.name} parsed.`)
							return dialoguePrototypeEntry;
					});

					const chestModelPath = path.posix
						.normalize(yypPackage.meatSettings.chestsPath);
					const chestsJson = JSON.parse(readFileSync(chestModelPath).toString()) as ChestPrototype[];
					chestsJson.forEach(chest => this.logger.info(`Chest ${chest.chestId} parsed.`));
					const chests = chestsJson

					const groundDictionaryEntriesPath = path.posix
						.normalize(yypPackage.meatSettings.groundDictionaryPath);
					const groundDictionaryEntriesJson: any[] = JSON.parse(readFileSync(groundDictionaryEntriesPath).toString());
					groundDictionaryEntriesJson.forEach(entry => this.logger.info(`Ground dictionary entry ${entry.name} parsed.`))
					const groundDictionaryEntries = groundDictionaryEntriesJson;

					const textureStripDictionaryPath = path.posix
						.normalize(yypPackage.meatSettings.textureStripDictionaryPath);
					const textureStripDictionaryJson: any[] = JSON.parse(readFileSync(textureStripDictionaryPath).toString());
					textureStripDictionaryJson.forEach(entry => this.logger.info(`TextureStrip entry ${entry.name} parsed.`))
					const textureStrips = textureStripDictionaryJson;

					const skillPrototypesPath = path.posix
						.normalize(yypPackage.meatSettings.skillPrototypesPath);
					const skillPrototypesJson: any[] = JSON.parse(readFileSync(skillPrototypesPath).toString());
					skillPrototypesJson.forEach(entry => this.logger.info(`SkillPrototype entry ${entry.name} parsed.`))
					const skillPrototypes = skillPrototypesJson;

					const questPrototypesPath = path.posix
						.normalize(yypPackage.meatSettings.questPrototypesPath);
					const questPrototypesJson: any[] = JSON.parse(readFileSync(questPrototypesPath).toString());
					questPrototypesJson.forEach(entry => this.logger.info(`QuestPrototype entry ${entry.name} parsed.`))
					const questPrototypes = questPrototypesJson
						.map(questPrototype => { 
							return {
								name: questPrototype.name,
								displayName: questPrototype.displayName,
								log: null,
								schema: JSON.stringify(questPrototype.schema),
							}
						});
					
					
					const labelDictionaryPath = path.posix
						.normalize(yypPackage.meatSettings.labelDictionaryPath);
					const labelDictionaryJson: any[] = JSON.parse(readFileSync(labelDictionaryPath).toString());
					const labelsPackages = [
						{
							langCode: "en_EN",
							dictionary: {}
						},
						{
							langCode: "pl_PL",
							dictionary: {}
						}
					];
					labelDictionaryJson
						.forEach(labelsPackage => {

							const langCode = labelsPackage.langCode;
							const packageName = labelsPackage.packageName;
							const dictionary = labelsPackage.dictionary;
							const finalDictionary = labelsPackages.find(labelPackage => labelPackage.langCode === langCode);
							if (dictionary) {

								Object.keys(dictionary).forEach(key => finalDictionary.dictionary[key] = dictionary[key]);

								this.logger.info(`LabelsPackage ${packageName} for langCode ${langCode} parsed.`);
							} else {
								
								throw new Error("");
							}
						});
					
					const difficultyDictionaryPath = path.posix
						.normalize(yypPackage.meatSettings.difficultyDictionaryPath)
					const difficultyDictionary: any[] = JSON.parse(readFileSync(difficultyDictionaryPath).toString());
					difficultyDictionary.forEach(difficulty => this.logger.info(`Difficulty ${difficulty.name} parsed.`));

					const worldRegionDictionaryPath = path.posix
						.normalize(yypPackage.meatSettings.worldRegionDictionaryPath)
					const worldRegionDictionary: any[] = JSON.parse(readFileSync(worldRegionDictionaryPath).toString());
					worldRegionDictionary.forEach(worldRegion => this.logger.info(`WorldRegion ${worldRegion.worldName} parsed.`));

					const mobSfxPackPath = path.posix
						.normalize(yypPackage.meatSettings.mobSfxPackPath)
					const mobSfxDictionary: any[] = JSON.parse(readFileSync(mobSfxPackPath).toString());
					mobSfxDictionary.forEach(mobSfx => this.logger.info(`worldMobSfxPack ${mobSfx.name} (${mobSfx.actions.map(action => "@" + action.type).join()}) parsed.`));
					
					const mpkgPath: string = path.posix
						.normalize(yypPackage.meatSettings.mpkgPath);
	
					const meatPackage = {
						textureStrips: textureStrips,
						chestPrototypes: chests,
						groundDictionaryEntries: groundDictionaryEntries,
						skillPrototypes: skillPrototypes,
						questPrototypes:  questPrototypes,
						labelPackages: labelsPackages,
						difficultyEntries: difficultyDictionary,
						worldRegionDictionary: worldRegionDictionary,
						mobSfxDictionary: mobSfxDictionary
					}

					writeFileSync(
						`${mpkgPath}/mpkg/meat_package.json`,
						JSON.stringify(meatPackage, null, "\t")
					);


					const itemPackage = {
						itemPrototypes: items,
					}

					writeFileSync(
						`${mpkgPath}/mpkg/item.json`,
						JSON.stringify(itemPackage, null, "\t")
					);
					

					const mobPackage = {
						mobPrototypes: mobs
					}

					writeFileSync(
						`${mpkgPath}/mpkg/mob.json`,
						JSON.stringify(mobPackage, null, "\t")
					);


					const npcPackage = {
						npcPrototypes: npcs
					}

					writeFileSync(
						`${mpkgPath}/mpkg/npc.json`,
						JSON.stringify(npcPackage, null, "\t")
					);

					
					const dialoguesPackage = {
						dialoguePrototypes: dialoguePrototypes
					}

					writeFileSync(
						`${mpkgPath}/mpkg/dialogue.json`,
						JSON.stringify(dialoguesPackage, null, "\t")
					);

				} catch (exception) {
					console.error(exception);
				}
			});
		
		program.parse(process.argv);
	}

	public getYYPPackage(): YYPPackage {
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
