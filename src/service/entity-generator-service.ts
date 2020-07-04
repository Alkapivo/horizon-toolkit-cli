import { injectable } from "inversify";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { ModelEntity, CodeSnippet, Entity, FieldTypes, CollectionTypes } from "../type/entity-builder-model";

export interface InitializeEntitiesScript {
	className: string,
	prototype: number,
}

@injectable()
export class EntityGeneratorService {
    
    public readonly name: string = "EntityGeneratorService";

	public buildEntities(classes: string[], yypPath: string, modelPath: string, projectName: string): void {
		if (existsSync(modelPath)) {
			const model: ModelEntity[] = JSON.parse(readFileSync(modelPath).toString());

			this.codeSnippetParser(model, classes, yypPath, projectName);
			this.entityDefinitionWriter(yypPath, projectName, model);

		} else {
			throw new Error("model.json file wasn't found. modelPath: " + modelPath);
		}
	}

	private codeSnippetParser(model: ModelEntity[], classes: string[], yypPath: string, projectName: string) {
		const entities = model
			.filter(entity => {
				if (classes.length > 0) {
					const includes = classes.includes(entity.name)
					if (!includes) {
						throw new Error(`Entity ${entity.name} wasn't found`);
					}
					return includes;
				} else {
					return true;
				}
			})
			.map(entity => {
				return {
					name: entity.name,
					schema: JSON.stringify(entity.schema),
					enums: JSON.stringify(entity.enums),
					primitives: JSON.stringify(entity.primitives)
				}
			});
		entities.forEach(entity => {
			const codeSnippets = this.generateEntityCode(entity);
			console.info("Save", entity.name);
			codeSnippets.forEach(snippet => {
				this.codeSnippetsWriter(snippet, yypPath, projectName);
			});
		});
	}

	private codeSnippetsWriter(codeSnippet: CodeSnippet, yypPath: string, projectName: string): void {
		const projectPath = `${yypPath}/scripts`;
		const regex = /(?<=\/\/\/@function)(.*)(?=\()/
		const gmlSnippets = codeSnippet.snippets.map(snippet => {
			const found: RegExpMatchArray | null = snippet.match(regex);
			let scriptName: string = "";
			if (found) {
				scriptName = found[0].trim();
			}
			return {
				scriptName: scriptName,
				gml: snippet,
			}
		}).filter(snippet => snippet.scriptName != "");
	
		gmlSnippets.forEach(gmlSnippet => {
			if (existsSync(`${projectPath}/${gmlSnippet.scriptName}`)) {
				const assetScriptPathGML = `${projectPath}/${gmlSnippet.scriptName}/${gmlSnippet.scriptName}.gml`;
				const assetScriptPathYY = `${projectPath}/${gmlSnippet.scriptName}/${gmlSnippet.scriptName}.yy`;
				if (existsSync(assetScriptPathYY)) {
					try {
						if (existsSync(assetScriptPathGML) && (readFileSync(assetScriptPathGML).toString().includes("///@override"))) {
							console.warn("File", gmlSnippet.scriptName + ".gml", "couldn't be saved - @override exists");
						} else {
							writeFileSync(assetScriptPathGML, gmlSnippet.gml);
							//console.info("> Saved file", gmlSnippet.scriptName + ".gml");
						}
					} catch (ex) {
						console.error("ReadFileException", ex);
					}
				} else {
					throw new Error(`File ${assetScriptPathYY} wasn't found`);
				}
			} else {
				throw new Error(`AssetScript ${gmlSnippet.scriptName} wasn't found in yyp`);
			}
		});
	}

	private entityDefinitionWriter(yypPath: string, projectName: string, model: ModelEntity[]) {
		const initializeEntitiesScript = `initialize${this.initialToUpper(projectName)}Entities`;
			const initializeEntiteisPathGML = `${yypPath}/scripts/${initializeEntitiesScript}/${initializeEntitiesScript}.gml`;
			const entitiesDefinition = readFileSync(initializeEntiteisPathGML).toString();
			const entityPrototypeRegex = /(?<=global.entityPrototypes\[\?)(.*?)(?=;)/g;
			let parsedEntities: InitializeEntitiesScript[] = [
				...entitiesDefinition
					.match(entityPrototypeRegex)
					.map(match => {
						const tuple = match.split("]");
						if (tuple.length >= 2) {
							const className = tuple[0].trim();
							const prototype: number = Number(tuple[1].replace("=", "").trim());
							return {
								className: className,
								prototype: prototype,
							}
						}
						return undefined;
					})
					.filter(entity => entity),
			];

			parsedEntities = [
				...parsedEntities,
				...model
					.filter(entry => parsedEntities.filter(entity => entity.className === entry.name).length === 0)
					.map(entry => {
						return {
							className: entry.name,
							prototype: Object.keys(entry.schema).length,
						}
					}),
			];
			

			const beginId = 200200;
			const newEntityDefinition = `///@function initialize${this.initialToUpper(projectName)}Entities()\r\n` +
				`\r\n` +
				parsedEntities.map((entity, index) => {
					const modelEntry = model.filter(entry => entry.name === entity.className);
					if (modelEntry.length > 0) {
						const prototype = Object.keys(modelEntry[0].schema).length;
						return `` + 
							`\t#macro ${entity.className} ${beginId + (index + 1)}\r\n` +
							`\tglobal.entityPrototypes[? ${entity.className}] = ${prototype};\r\n` +
							`\tglobal.entityClassNames[? ${entity.className}] = "${entity.className}";\r\n` +
							`\t\r\n`;
					}
					return ``;

				}).join("\n")

			writeFileSync(initializeEntiteisPathGML, newEntityDefinition);
			console.log(`Save initialize${this.initialToUpper(projectName)}Entities`)
	}

	public generateEntityCode(state: Entity): CodeSnippet[] {
		const codeSnippets = [];
		codeSnippets.push(new CodeSnippet("Create", [this.generateCreateEntityCode(state)]));
		codeSnippets.push(new CodeSnippet("Serialize", [this.generateSerializeEntityCode(state)]));
		codeSnippets.push(new CodeSnippet("Deserialize", [this.generateDeserializeEntityCode(state)]));
		codeSnippets.push(new CodeSnippet("Destroy", [this.generateDestroyEntityCode(state)]));
		codeSnippets.push(new CodeSnippet("Getters", this.generateGettersEntityCodes(state)));
		codeSnippets.push(new CodeSnippet("Setters", this.generateSettersEntityCodes(state)));
		codeSnippets.push(new CodeSnippet("Entity labels", [this.generateEntityLabelJSON(state)]));
		return codeSnippets;
	}

	public generateCreateEntityCode(entity: Entity) {

		const functionName = `create${this.initialToUpper(entity.name)}`;
		const description = `Constructor for ${this.initialToUpper(entity.name)} entity.`
		const parameters = this.convertSchemaToParameters(entity.schema);
		const entityObjectName = this.initialToLower(entity.name);
		const entityClassName = this.initialToUpper(entity.name);

		const functionDescription = this.generateFunctionDescription(functionName, description, parameters, entityClassName, entityObjectName);

		let functionBody = `${Object
			.entries(parameters)
			.map((field, index) => {
				return `\tvar ${field[0]} = argument${index};`
			})
			.join(`\n`)}\n\t\n`;
		functionBody += 
			`\tvar ${entityObjectName} = createEntity(${entityClassName});\n\n` +
			`${Object
				.entries(parameters)
				.map((field, index) => {
					const setterName = `set${entityClassName}${this.initialToUpper(field[0])}`;
					const type = field[1] as string;
					const isParameterOptional = type.includes("Optional<");
					const body = isParameterOptional ?
						`\t${setterName}(${entityObjectName}, ${field[0]});` :
						`\t${setterName}(${entityObjectName}, assertNoOptional(${field[0]}));`
					return body;
				})
				.join('\n')}\n\n`;
		const returnStatement = `\treturn ${entityObjectName};\n\t\n`;

		return functionDescription + functionBody + returnStatement;
	}

	public generateSerializeEntityCode(entity: Entity): string {

		const entityObjectName = this.initialToLower(entity.name);
		const entityClassName = this.initialToUpper(entity.name);
		const functionName = `serialize${entityClassName}`;
		const description = `Serialize ${entityClassName} to JSON string.`
		const parameters = this.convertSchemaToParameters(entity.schema);
		
		const functionDescription = this.generateFunctionDescription(functionName, description, { [entityObjectName.toString()]:  entityClassName.toString() }, "String", `${entityObjectName}JsonString`);

		let functionBody = 
			`\tvar ${entityObjectName} = argument0;\n\t\n` +
			`\tvar jsonObject = createJsonObject();\n\n`;
		for (const key of Object.keys(parameters)) {
			const parameterName = this.initialToLower(key);
			const parameterType = parameters[key];
			const isParameterOptional = parameterType.includes("Optional<");
			const fieldType = this.getFieldTypeFromParameterType(parameterType, JSON.parse(entity.primitives), JSON.parse(entity.enums));

			const entityLabel = `"${parameterName}"`;
			const fieldGetter = `get${entityClassName}${this.initialToUpper(parameterName)}(${entityObjectName})`;
			const escapedParameterType = this.getEscapedParameterType(parameterType);

			if (fieldType.toLowerCase().includes("primitive")) {

				switch (fieldType) {
					case FieldTypes.PRIMITIVE:
						if (isParameterOptional) {
							functionBody += `\tif (isOptionalPresent(${fieldGetter})) {\n` +
								`\t\tappendFieldToJsonObject(\n` + 
								`\t\t\tjsonObject,\n` + 
								`\t\t\t${entityLabel},\n` + 
								`\t\t\t${fieldGetter});\n` +
								`\t}\n\t\n`
						} else {
							functionBody += `\tappendFieldToJsonObject(\n` + 
							`\t\tjsonObject,\n` + 
							`\t\t${entityLabel},\n` + 
							`\t\t${fieldGetter});` +
							`\t\n`
						}
						break;
					case FieldTypes.PRIMITIVE_ARRAY:
						if (isParameterOptional) {
							functionBody += `\tif (isOptionalPresent(${fieldGetter})) {\n` +
								`\t\tappendFieldToJsonObject(\n` + 
								`\t\t\tjsonObject,\n` + 
								`\t\t\t${entityLabel},\n` + 
								`\t\t\t${fieldGetter},\n` +
								`\t\t\tArray);\n` +
								`\t}\n\t\n`
						} else {
							functionBody += `\tappendFieldToJsonObject(\n` + 
							`\t\tjsonObject,\n` + 
							`\t\t${entityLabel},\n` + 
							`\t\t${fieldGetter},\n` +
							`\t\tArray);\n` +
							`\t\n`
						}
						break;
					case FieldTypes.PRIMITIVE_LIST:
						if (isParameterOptional) {
							functionBody += `\tif (isOptionalPresent(${fieldGetter})) {\n` +
								`\t\tappendFieldToJsonObject(\n` + 
								`\t\t\tjsonObject,\n` + 
								`\t\t\t${entityLabel},\n` + 
								`\t\t\t${fieldGetter},\n` +
								`\t\t\tList);\n` +
								`\t}\n\t\n`
						} else {
							functionBody += `\tappendFieldToJsonObject(\n` + 
							`\t\tjsonObject,\n` + 
							`\t\t${entityLabel},\n` + 
							`\t\t${fieldGetter},\n` +
							`\t\tList);\n` +
							`\t\n`
						}
						break;
					case FieldTypes.PRIMITIVE_MAP:
						if (isParameterOptional) {
							functionBody += `\tif (isOptionalPresent(${fieldGetter})) {\n` +
								`\t\tappendFieldToJsonObject(\n` + 
								`\t\t\tjsonObject,\n` + 
								`\t\t\t${entityLabel},\n` + 
								`\t\t\t${fieldGetter},\n` +
								`\t\t\tMap);\n` +
								`\t}\n\t\n`
						} else {
							functionBody += `\tappendFieldToJsonObject(\n` + 
							`\t\tjsonObject,\n` + 
							`\t\t${entityLabel},\n` + 
							`\t\t${fieldGetter},\n` +
							`\t\tMap);\n` +
							`\t\n`
						}
						break;
					case FieldTypes.PRIMITIVE_STACK:
						if (isParameterOptional) {
							functionBody += `\tif (isOptionalPresent(${fieldGetter})) {\n` +
								`\t\tappendFieldToJsonObject(\n` + 
								`\t\t\tjsonObject,\n` + 
								`\t\t\t${entityLabel},\n` + 
								`\t\t\t${fieldGetter},\n` +
								`\t\t\tStack);\n` +
								`\t}\n\t\n`
						} else {
							functionBody += `\tappendFieldToJsonObject(\n` + 
							`\t\tjsonObject,\n` + 
							`\t\t${entityLabel},\n` + 
							`\t\t${fieldGetter},\n` +
							`\t\tStack);\n` +
							`\t\n`
						}
						break;
					case FieldTypes.PRIMITIVE_GRID:
						if (isParameterOptional) {
							functionBody += `\tif (isOptionalPresent(${fieldGetter})) {\n` +
								`\t\tappendFieldToJsonObject(\n` + 
								`\t\t\tjsonObject,\n` + 
								`\t\t\t${entityLabel},\n` + 
								`\t\t\t${fieldGetter},\n` +
								`\t\t\tGrid);\n` +
								`\t}\n\t\n`
						} else {
							functionBody += `\tappendFieldToJsonObject(\n` + 
							`\t\tjsonObject,\n` + 
							`\t\t${entityLabel},\n` + 
							`\t\t${fieldGetter},\n` +
							`\t\tGrid);\n` +
							`\t\n`
						}
						break;
					case FieldTypes.PRIMITIVE_QUEUE:
						if (isParameterOptional) {
							functionBody += `\tif (isOptionalPresent(${fieldGetter})) {\n` +
								`\t\tappendFieldToJsonObject(\n` + 
								`\t\t\tjsonObject,\n` + 
								`\t\t\t${entityLabel},\n` + 
								`\t\t\t${fieldGetter},\n` +
								`\t\t\tQueue);\n` +
								`\t}\n\t\n`
						} else {
							functionBody += `\tappendFieldToJsonObject(\n` + 
							`\t\tjsonObject,\n` + 
							`\t\t${entityLabel},\n` + 
							`\t\t${fieldGetter},\n` +
							`\t\tQueue);\n` +
							`\t\n`
						}
						break;
					case FieldTypes.PRIMITIVE_PRIORITY_QUEUE:
						if (isParameterOptional) {
							functionBody += `\tif (isOptionalPresent(${fieldGetter})) {\n` +
								`\t\tappendFieldToJsonObject(\n` + 
								`\t\t\tjsonObject,\n` + 
								`\t\t\t${entityLabel},\n` + 
								`\t\t\t${fieldGetter},\n` +
								`\t\t\tPriorityQueue);\n` +
								`\t}\n\t\n`
						} else {
							functionBody += `\tappendFieldToJsonObject(\n` + 
							`\t\tjsonObject,\n` + 
							`\t\t${entityLabel},\n` + 
							`\t\t${fieldGetter},\n` +
							`\t\tPriorityQueue);\n` +
							`\t\n`
						}
						break;
				}
			}

			if (fieldType.toLowerCase().includes("entity")) {
				let fieldEntityClass = "";
				switch (fieldType) {
					case FieldTypes.ENTITY:
						if (isParameterOptional) {
							functionBody += `\tif (isOptionalPresent(${fieldGetter})) {\n` +
								`\t\tappendEntityToJsonObject(\n` + 
								`\t\t\tjsonObject,\n` + 
								`\t\t\t${entityLabel},\n` + 
								`\t\t\t${fieldGetter},\n` +
								`\t\t\t"${escapedParameterType}");\n` +
								`\t}\n\t\n`
						} else {
							functionBody += `\tappendEntityToJsonObject(\n` + 
							`\t\tjsonObject,\n` + 
							`\t\t${entityLabel},\n` + 
							`\t\t${fieldGetter},\n` +
							`\t\t"${escapedParameterType}");\n` +
							`\t\n`
						}
						break;
					case FieldTypes.ENTITY_ARRAY:
						if (isParameterOptional) {
							functionBody += `\tif (isOptionalPresent(${fieldGetter})) {\n` +
								`\t\tappendEntityToJsonObject(\n` + 
								`\t\t\tjsonObject,\n` + 
								`\t\t\t${entityLabel},\n` + 
								`\t\t\t${fieldGetter},\n` +
								`\t\t\t"${escapedParameterType}",\n` +
								`\t\t\tArray);\n` +
								`\t}\n\t\n`
						} else {
							functionBody += `\tappendEntityToJsonObject(\n` + 
							`\t\tjsonObject,\n` + 
							`\t\t${entityLabel},\n` + 
							`\t\t${fieldGetter},\n` +
							`\t\t"${escapedParameterType}",\n` +
							`\t\tArray);\n` +
							`\t\n`
						}
						break;
					case FieldTypes.ENTITY_LIST:
						if (isParameterOptional) {
							functionBody += `\tif (isOptionalPresent(${fieldGetter})) {\n` +
								`\t\tappendEntityToJsonObject(\n` + 
								`\t\t\tjsonObject,\n` + 
								`\t\t\t${entityLabel},\n` + 
								`\t\t\t${fieldGetter},\n` +
								`\t\t\t"${escapedParameterType}",\n` +
								`\t\t\tList);\n` +
								`\t}\n\t\n`
						} else {
							functionBody += `\tappendEntityToJsonObject(\n` + 
							`\t\tjsonObject,\n` + 
							`\t\t${entityLabel},\n` + 
							`\t\t${fieldGetter},\n` +
							`\t\t"${escapedParameterType}",\n` +
							`\t\tList);\n` +
							`\t\n`
						}
						break;
					case FieldTypes.ENTITY_MAP:
						if (isParameterOptional) {
							functionBody += `\tif (isOptionalPresent(${fieldGetter})) {\n` +
								`\t\tappendEntityToJsonObject(\n` + 
								`\t\t\tjsonObject,\n` + 
								`\t\t\t${entityLabel},\n` + 
								`\t\t\t${fieldGetter},\n` +
								`\t\t\t"${escapedParameterType}",\n` +
								`\t\t\tMap);\n` +
								`\t}\n\t\n`
						} else {
							functionBody += `\tappendEntityToJsonObject(\n` + 
							`\t\tjsonObject,\n` + 
							`\t\t${entityLabel},\n` + 
							`\t\t${fieldGetter},\n` +
							`\t\t"${escapedParameterType}",\n` +
							`\t\tMap);\n` +
							`\t\n`
						}
						break;
					case FieldTypes.ENTITY_STACK:
						if (isParameterOptional) {
							functionBody += `\tif (isOptionalPresent(${fieldGetter})) {\n` +
								`\t\tappendEntityToJsonObject(\n` + 
								`\t\t\tjsonObject,\n` + 
								`\t\t\t${entityLabel},\n` + 
								`\t\t\t${fieldGetter},\n` +
								`\t\t\t"${escapedParameterType}",\n` +
								`\t\t\tStack);\n` +
								`\t}\n\t\n`
						} else {
							functionBody += `\tappendEntityToJsonObject(\n` + 
							`\t\tjsonObject,\n` + 
							`\t\t${entityLabel},\n` + 
							`\t\t${fieldGetter},\n` +
							`\t\t"${escapedParameterType}",\n` +
							`\t\tStack);\n` +
							`\t\n`
						}
						break;
						break;
					case FieldTypes.ENTITY_GRID:
						if (isParameterOptional) {
							functionBody += `\tif (isOptionalPresent(${fieldGetter})) {\n` +
								`\t\tappendEntityToJsonObject(\n` + 
								`\t\t\tjsonObject,\n` + 
								`\t\t\t${entityLabel},\n` + 
								`\t\t\t${fieldGetter},\n` +
								`\t\t\t"${escapedParameterType}",\n` +
								`\t\t\tGrid);\n` +
								`\t}\n\t\n`
						} else {
							functionBody += `\tappendEntityToJsonObject(\n` + 
							`\t\tjsonObject,\n` + 
							`\t\t${entityLabel},\n` + 
							`\t\t${fieldGetter},\n` +
							`\t\t"${escapedParameterType}",\n` +
							`\t\tGrid);\n` +
							`\t\n`
						}
						break;
					case FieldTypes.ENTITY_QUEUE:
						if (isParameterOptional) {
							functionBody += `\tif (isOptionalPresent(${fieldGetter})) {\n` +
								`\t\tappendEntityToJsonObject(\n` + 
								`\t\t\tjsonObject,\n` + 
								`\t\t\t${entityLabel},\n` + 
								`\t\t\t${fieldGetter},\n` +
								`\t\t\t"${escapedParameterType}",\n` +
								`\t\t\tQueue);\n` +
								`\t}\n\t\n`
						} else {
							functionBody += `\tappendEntityToJsonObject(\n` + 
							`\t\tjsonObject,\n` + 
							`\t\t${entityLabel},\n` + 
							`\t\t${fieldGetter},\n` +
							`\t\t"${escapedParameterType}",\n` +
							`\t\tQueue);\n` +
							`\t\n`
						}
						break;
					case FieldTypes.ENTITY_PRIORITY_QUEUE:
						if (isParameterOptional) {
							functionBody += `\tif (isOptionalPresent(${fieldGetter})) {\n` +
								`\t\tappendEntityToJsonObject(\n` + 
								`\t\t\tjsonObject,\n` + 
								`\t\t\t${entityLabel},\n` + 
								`\t\t\t${fieldGetter},\n` +
								`\t\t\t"${escapedParameterType}",\n` +
								`\t\t\tPriorityQueue);\n` +
								`\t}\n\t\n`
						} else {
							functionBody += `\tappendEntityToJsonObject(\n` + 
							`\t\tjsonObject,\n` + 
							`\t\t${entityLabel},\n` + 
							`\t\t${fieldGetter},\n` +
							`\t\t"${escapedParameterType}",\n` +
							`\t\tPriorityQueue);\n` +
							`\t\n`
						}
						break;
				}
			}
		}
		
		functionBody += `\n\tvar ${entityObjectName}JsonString = encodeJson(jsonObject);\n`;
		const returnStatement = `\n\treturn ${entityObjectName}JsonString;\n\t\n`;

		return functionDescription + functionBody + returnStatement;
	}

	public generateDeserializeEntityCode(entity: Entity): string {

		const entityObjectName = this.initialToLower(entity.name);
		const entityClassName = this.initialToUpper(entity.name);
		const functionName = `deserialize${entityClassName}`;
		const description = `Deserialize ${entityClassName} from JSON String to ${entityClassName} entity.`;
		const parameters = this.convertSchemaToParameters(entity.schema);

		const functionDescription = this.generateFunctionDescription(functionName, description, { "jsonString":  "String" }, `${entityClassName}`, `${entityObjectName}`);

		let functionBody = 
			`\tvar jsonString = argument0;\n\t\n` + 
			`\tvar jsonObject = decodeJson(jsonString);\n\n`;
		for (const key of Object.keys(parameters)) {
			const parameterName = this.initialToLower(key);
			const parameterType = parameters[key];
			const isParameterOptional = parameterType.includes("Optional<");
			const fieldType = this.getFieldTypeFromParameterType(parameterType, JSON.parse(entity.primitives), JSON.parse(entity.enums));

			const entityLabel = `"${parameterName}"`;
			const fieldGetter = `get${entityClassName}${this.initialToUpper(parameterName)}(${entityObjectName})`;

			if (fieldType.toLowerCase().includes("primitive")) {
				switch (fieldType) {
					case FieldTypes.PRIMITIVE:
						if (isParameterOptional) {
							functionBody += `\tvar ${parameterName} = getJsonObjectFieldValue(jsonObject, ${entityLabel});\n`
						} else {
							functionBody += `\tvar ${parameterName} = assertNoOptional(getJsonObjectFieldValue(jsonObject, ${entityLabel}));\n`
						}
						break;
					case FieldTypes.PRIMITIVE_ARRAY:
						if (isParameterOptional) {
							functionBody += `\tvar ${parameterName} = getJsonObjectFieldValue(jsonObject, ${entityLabel});` +
								`\tif (isOptionalPresent(${parameterName})) {\n` +
								`\t\tif (isJsonArray(${parameterName})) {\n` +
								`\t\t\t${parameterName} = cloneArray(getJsonArrayData(${parameterName}));\n` +
								`\t\t} else {\n` +
								`\t\t\t${parameterName} = [];\n` +
								`\t\t\tvar exceptionMessage = "[${functionName}] Field \"${parameterName}\" isn't an JsonArray";\n` +
								`\t\t\tthrowException(createException(RuntimeException, exceptionMessage, null));\n` +
								`\t\t}\n` +
								`\t}\n` +
								`\t\n`;
						} else {
							functionBody += `\tvar ${parameterName} = getJsonObjectFieldValue(jsonObject, ${entityLabel});` +
								`\tif (isOptionalPresent(${parameterName})) {\n` +
								`\t\tif (isJsonArray(${parameterName})) {\n` +
								`\t\t\t${parameterName} = cloneArray(getJsonArrayData(${parameterName}));\n` +
								`\t\t} else {\n` +
								`\t\t\t${parameterName} = [];\n` +
								`\t\t\tvar exceptionMessage = "[${functionName}] Field \"${parameterName}\" isn't an JsonArray";\n` +
								`\t\t\tthrowException(createException(RuntimeException, exceptionMessage, null));\n` +
								`\t\t}\n` +
								`\t}\n` +
								`\t${parameterName} = assertNoOptional(${parameterName});\n` + 
								`\t\n`;
						}
						break;
					case FieldTypes.PRIMITIVE_LIST:
						if (isParameterOptional) {
							functionBody += `\tvar ${parameterName} = getJsonObjectFieldValue(jsonObject, ${entityLabel}, List);\n`;
						} else {
							functionBody += `\tvar ${parameterName} = assertNoOptional(getJsonObjectFieldValue(jsonObject, ${entityLabel}, List));\n`;
						}
						break;
					case FieldTypes.PRIMITIVE_MAP:
						if (isParameterOptional) {
							functionBody += `\tvar ${parameterName} = getJsonObjectFieldValue(jsonObject, ${entityLabel}, Map);\n`;
						} else {
							functionBody += `\tvar ${parameterName} = assertNoOptional(getJsonObjectFieldValue(jsonObject, ${entityLabel}, Map));\n`;
						}
						break;
					case FieldTypes.PRIMITIVE_STACK:
						if (isParameterOptional) {
							functionBody += `\tvar ${parameterName} = getJsonObjectFieldValue(jsonObject, ${entityLabel}, Stack);\n`;
						} else {
							functionBody += `\tvar ${parameterName} = assertNoOptional(getJsonObjectFieldValue(jsonObject, ${entityLabel}, Stack));\n`;
						}
						break;
					case FieldTypes.PRIMITIVE_GRID:
						if (isParameterOptional) {
							functionBody += `\tvar ${parameterName} = getJsonObjectFieldValue(jsonObject, ${entityLabel}, Grid);\n`;
						} else {
							functionBody += `\tvar ${parameterName} = assertNoOptional(getJsonObjectFieldValue(jsonObject, ${entityLabel}, Grid));\n`;
						}
						break;
					case FieldTypes.PRIMITIVE_QUEUE:
						if (isParameterOptional) {
							functionBody += `\tvar ${parameterName} = getJsonObjectFieldValue(jsonObject, ${entityLabel}, Queue);\n`;
						} else {
							functionBody += `\tvar ${parameterName} = assertNoOptional(getJsonObjectFieldValue(jsonObject, ${entityLabel}, Queue));\n`;
						}
						break;
					case FieldTypes.PRIMITIVE_PRIORITY_QUEUE:
						if (isParameterOptional) {
							functionBody += `\tvar ${parameterName} = getJsonObjectFieldValue(jsonObject, ${entityLabel}, PriorityQueue);\n`;
						} else {
							functionBody += `\tvar ${parameterName} = assertNoOptional(getJsonObjectFieldValue(jsonObject, ${entityLabel}, PriorityQueue));\n`;
						}
						break;
				}
			}

			if (fieldType.toLowerCase().includes("entity")) {
				const escapedParameterType = this.getEscapedParameterType(parameterType);
				switch (fieldType) {
					case FieldTypes.ENTITY:
						if (isParameterOptional) {
							functionBody += `\tvar ${parameterName} = getJsonObjectFieldValue(jsonObject, ${entityLabel}, Entity, "${escapedParameterType}");\n`;
						} else {
							functionBody += `\tvar ${parameterName} = assertNoOptional(getJsonObjectFieldValue(jsonObject, ${entityLabel}, Entity, "${escapedParameterType}"));\n`;
						}
						break;
					case FieldTypes.ENTITY_ARRAY:
						if (isParameterOptional) {
							functionBody += `\tvar ${parameterName} = getJsonObjectFieldValue(jsonObject, ${entityLabel}, Array, "${escapedParameterType}");\n`
						} else {
							functionBody += `\tvar ${parameterName} = assertNoOptional(getJsonObjectFieldValue(jsonObject, ${entityLabel}, Array, "${escapedParameterType}"));\n`;
						}
						break;
					case FieldTypes.ENTITY_LIST:
						if (isParameterOptional) {
							functionBody += `\tvar ${parameterName} = getJsonObjectFieldValue(jsonObject, ${entityLabel}, List, "${escapedParameterType}");\n`
						} else {
							functionBody += `\tvar ${parameterName} = assertNoOptional(getJsonObjectFieldValue(jsonObject, ${entityLabel}, List, "${escapedParameterType}"));\n`;
						}
						break;
					case FieldTypes.ENTITY_MAP: 
						if (isParameterOptional) {
							functionBody += `\tvar ${parameterName} = getJsonObjectFieldValue(jsonObject, ${entityLabel}, Map, "${escapedParameterType}");\n`;
						} else {
							functionBody += `\tvar ${parameterName} = assertNoOptional(getJsonObjectFieldValue(jsonObject, ${entityLabel}, Map, "${escapedParameterType}"));\n`;
						}
						break;
					case FieldTypes.ENTITY_STACK:
						if (isParameterOptional) {
							functionBody += `\tvar ${parameterName} = getJsonObjectFieldValue(jsonObject, ${entityLabel}, Stack, "${escapedParameterType}");\n`;
						} else {
							functionBody += `\tvar ${parameterName} = assertNoOptional(getJsonObjectFieldValue(jsonObject, ${entityLabel}, Stack, "${escapedParameterType}"));\n`;
						}
						break;
					case FieldTypes.ENTITY_GRID:
						if (isParameterOptional) {
							functionBody += `\tvar ${parameterName} = getJsonObjectFieldValue(jsonObject, ${entityLabel}, Grid, "${escapedParameterType}");\n`;
						} else {
							functionBody += `\tvar ${parameterName} = assertNoOptional(getJsonObjectFieldValue(jsonObject, ${entityLabel}, Grid, "${escapedParameterType}"));\n`;
						}
						break;
					case FieldTypes.ENTITY_QUEUE:
						if (isParameterOptional) {
							functionBody += `\tvar ${parameterName} = getJsonObjectFieldValue(jsonObject, ${entityLabel}, Queue, "${escapedParameterType}");\n`;
						} else {
							functionBody += `\tvar ${parameterName} = assertNoOptional(getJsonObjectFieldValue(jsonObject, ${entityLabel}, Queue, "${escapedParameterType}"));\n`;
						}
						break;
					case FieldTypes.ENTITY_PRIORITY_QUEUE:
						if (isParameterOptional) {
							functionBody += `\tvar ${parameterName} = getJsonObjectFieldValue(jsonObject, ${entityLabel}, PriorityQueue, "${escapedParameterType}");\n`;
						} else {
							functionBody += `\tvar ${parameterName} = assertNoOptional(getJsonObjectFieldValue(jsonObject, ${entityLabel}, PriorityQueue, "${escapedParameterType}"));\n`;
						}
						break;
				}
			}
		}

		const returnStatement = `\n\treturn create${entityClassName}(${this.generateFieldsAsCommaSeparatedString(parameters)});\n\t\n`;

		return functionDescription + functionBody + returnStatement;
	}

	public generateDestroyEntityCode(entity: Entity): string {

		const entityObjectName = this.initialToLower(entity.name);
		const entityClassName = this.initialToUpper(entity.name);
		const functionName = `destroy${entityClassName}`;
		const description = `Destroy ${entityClassName} entity.`;
		const parameters = this.convertSchemaToParameters(entity.schema);

		const functionDescription = this.generateFunctionDescription(functionName, description, { [entityObjectName.toString()]:  entityClassName.toString() }, "void");

		const primitives = JSON.parse(entity.primitives);
		const enums = JSON.parse(entity.enums);
		let functionBody = `\tvar ${entityObjectName} = argument0;`
		let hasFields = false;
		const entries = 
			`${Object.entries(parameters).map((field: any) => {
				const parameterName = field[0];
				const parameterType = field[1];
				const fieldType = this.getFieldTypeFromParameterType(parameterType, primitives, enums);
				if ((fieldType === FieldTypes.PRIMITIVE_LIST) ||
					(fieldType === FieldTypes.PRIMITIVE_MAP) ||
					(fieldType.includes("entity"))) {
					const fieldGetter = `get${entityClassName}${this.initialToUpper(parameterName)}(${entityObjectName})`;
					hasFields = true;
					return `\n\tvar ${parameterName} = ${fieldGetter};`
				}
			}).join("")}`;

		functionBody += hasFields ? `\n\t${entries}` : "";

		let isFirst = true;
		for (const key of Object.keys(parameters)) {
			const parameterName = this.initialToLower(key);
			const parameterType = parameters[key];
			const fieldType = this.getFieldTypeFromParameterType(parameterType, JSON.parse(entity.primitives), JSON.parse(entity.enums));

			const fieldSetter = function(value) {
				return `set${entityClassName}${this.initialToUpper(parameterName)}(${entityObjectName}, ${value})`;
			}.bind(this);
			const dataStructureDestroyer = function(name, type) {
				return `destroyDataStructure(${name}, ${type}, "Unable to destroy ${type} ${name} in ${entityClassName}")`;
			}

			if (fieldType.toLowerCase().includes("primitive")) {
				switch (fieldType) {
					case FieldTypes.PRIMITIVE_ARRAY:
						functionBody += 
							(isFirst ? "\n\t" : "") + 
							`\n\t${fieldSetter("null")};`
						isFirst = false;
						break;
					case FieldTypes.PRIMITIVE_LIST:
						functionBody += 
							(isFirst ? "\n\t" : "") + 
							`\n\t${dataStructureDestroyer(parameterName, CollectionTypes.LIST)};` +
							`\n\t${fieldSetter("null")};`;
						isFirst = false;
						break;
					case FieldTypes.PRIMITIVE_MAP:
						functionBody += 
							(isFirst ? "\n\t" : "") + 
							`\n\t${dataStructureDestroyer(parameterName, CollectionTypes.MAP)};` +
							`\n\t${fieldSetter("null")};`;
						isFirst = false;
						break;
					case FieldTypes.PRIMITIVE_STACK:
						functionBody +=
							(isFirst ? "\n\t" : "") + 
							`\n\t${dataStructureDestroyer(parameterName, CollectionTypes.STACK)};` +
							`\n\t${fieldSetter("null")};`;
						isFirst = false;
						break;
					case FieldTypes.PRIMITIVE_GRID:
						functionBody +=
							(isFirst ? "\n\t" : "") + 
							`\n\t${dataStructureDestroyer(parameterName, CollectionTypes.GRID)};` +
							`\n\t${fieldSetter("null")};`;
						isFirst = false;
						break;
					case FieldTypes.PRIMITIVE_QUEUE:
						functionBody +=
							(isFirst ? "\n\t" : "") + 
							`\n\t${dataStructureDestroyer(parameterName, CollectionTypes.QUEUE)};` +
							`\n\t${fieldSetter("null")};`;
						isFirst = false;
						break;
					case FieldTypes.PRIMITIVE_PRIORITY_QUEUE:
						functionBody +=
							(isFirst ? "\n\t" : "") + 
							`\n\t${dataStructureDestroyer(parameterName, CollectionTypes.PRIORITY_QUEUE)};` +
							`\n\t${fieldSetter("null")};`;
						isFirst = false;
						break;
				}
			}

			if (fieldType.toLowerCase().includes("entity")) {
				let fieldEntityClass = "";

				const entityDestroyer = function(fieldEntityClass, entity) {
					const escapedFieldEntityClass = fieldEntityClass.includes("Optional<") ?
					fieldEntityClass.replace("Optional<", "").slice(0, -1) :
					fieldEntityClass;
					return `destroy${this.initialToUpper(escapedFieldEntityClass)}(${entity})`;
				}.bind(this);
				debugger;

				switch (fieldType) {
					case FieldTypes.ENTITY:
						fieldEntityClass = parameterType;
						functionBody += 
							(isFirst ? "\n\t" : "") + 
							`\n\t${entityDestroyer(fieldEntityClass, parameterName)};\n`
						isFirst = false;
						break;
					case FieldTypes.ENTITY_ARRAY:
						fieldEntityClass = parameterType.replace("[]", "");
						functionBody += 
							(isFirst ? "\n\t" : "") + 
							`\n\t\n` +
							`\tfor (var index = 0; index < getArrayLength(${parameterName}); index++) {\n`+
							`\t\tvar entity = ${parameterName}[@ index];\n` +
							`\t\t${entityDestroyer(fieldEntityClass, "entity")};\n` +
							`\t}\n` +
							`\t${fieldSetter("null")};`;
						isFirst = false;
						break;
					case FieldTypes.ENTITY_LIST:
						fieldEntityClass = parameterType.replace("List<", "").replace(">", "");
						functionBody += 
							(isFirst ? "\n\t" : "") + 
							`\n\t\n` +
							`\tfor (var index = 0; index < ds_list_size(${parameterName}); index++) {\n`+
							`\t\tvar entity = ${parameterName}[| index];\n` +
							`\t\t${entityDestroyer(fieldEntityClass, "entity")};\n` +
							`\t}\n` +
							`\t${dataStructureDestroyer(parameterName, CollectionTypes.LIST)};\n` +
							`\t${fieldSetter("null")};`;
						isFirst = false;
						break;
					case FieldTypes.ENTITY_MAP:
						fieldEntityClass = parameterType.replace("Map<", "").replace(">", "").split("::")[1].replace(" ", "");
						functionBody += 
							(isFirst ? "\n\t" : "") + 
							`\n\t\n` +
							`\tfor (var key = mapFirst(${parameterName}); iteratorFinish(key); key = mapNext(${parameterName}, key)) {\n`+
							`\t\tvar entity = ${parameterName}[? key];\n` +
							`\t\t${entityDestroyer(fieldEntityClass, "entity")};\n` +
							`\t}\n` +
							`\t${dataStructureDestroyer(parameterName, CollectionTypes.MAP)};\n` +
							`\t${fieldSetter("null")};`;
						isFirst = false;
						break;
					case FieldTypes.ENTITY_STACK:
						fieldEntityClass = parameterType.replace("Stack<", "").replace(">", "");
						functionBody +=
							(isFirst ? "\n\t" : "") + 
							`\n\t\n` +
							`\tfor (var index = 0; index < getStackLength(${parameterName}); index++) {\n` +
							`\t\tvar entity = popStack(${parameterName});\n` + 
							`\t\t${entityDestroyer(fieldEntityClass, "entity")};\n` +
							`\t}\n` +
							`\t${dataStructureDestroyer(parameterName, CollectionTypes.STACK)};\n` +
							`\t${fieldSetter("null")};`;
						isFirst = false;
						break;
					case FieldTypes.ENTITY_GRID:
						fieldEntityClass = parameterType.replace("Grid<", "").replace(">", "");
						functionBody +=
							(isFirst ? "\n\t" : "") + 
							`\n\t\n` +
							`\tfor (var yIndex = 0; yIndex < getGridHeight(${parameterName}); yIndex++) {\n` +
							`\t\tfor (var xIndex = 0; xIndex < getGridWidth(${parameterName}); xIndex++) {\n` +
							`\t\t\tvar entity = ${parameterName}[# xIndex, yIndex];\n` +
							`\t\t\t${entityDestroyer(fieldEntityClass, "entity")};\n` +
							`\t\t}\n` +
							`\t}\n` +
							`\t${dataStructureDestroyer(parameterName, CollectionTypes.GRID)};\n` +
							`\t${fieldSetter("null")};`;
						isFirst = false;
						break;
					case FieldTypes.ENTITY_QUEUE:
						fieldEntityClass = parameterType.replace("Queue<", "").replace(">", "");
						functionBody +=
							(isFirst ? "\n\t" : "") + 
							`\n\t\n` +
							`\tfor (var index = 0; index < getQueueLength(${parameterName}); index++) {\n` +
							`\t\tvar entity = popQueue(${parameterName});\n` + 
							`\t\t${entityDestroyer(fieldEntityClass, "entity")};\n` +
							`\t}\n` +
							`\t${dataStructureDestroyer(parameterName, CollectionTypes.QUEUE)};\n` +
							`\t${fieldSetter("null")};`;
						isFirst = false;
						break;
					case FieldTypes.ENTITY_PRIORITY_QUEUE:
						fieldEntityClass = parameterType.replace("PriorityQueue<", "").replace(">", "");
						functionBody +=
							(isFirst ? "\n\t" : "") + 
							`\n\t\n` +
							`\tfor (var index = 0; index < getPriorityQueueLength(${parameterName}); index++) {\n` +
							`\t\tvar entity = popMinPriorityQueue(${parameterName});\n` + 
							`\t\t${entityDestroyer(fieldEntityClass, "entity")};\n` +
							`\t}\n` +
							`\t${dataStructureDestroyer(parameterName, CollectionTypes.PRIORITY_QUEUE)};\n` +
							`\t${fieldSetter("null")};`;
						isFirst = false;
						break;
				}
			}
		}

		return functionDescription + functionBody + `\n\t\n`;
	}

	public generateGettersEntityCodes(entity: Entity): string[] {

		const _this = this;
		const generateGetterEntityCode = function(entity, parameterName, parameterType, parameterIndex) {
			const entityObjectName = _this.initialToLower(entity.name);
			const entityClassName = _this.initialToUpper(entity.name);
			const functionName = `get${entityClassName}${_this.initialToUpper(parameterName)}`;
			const description = `Getter.`;
			const parameters = { [entityObjectName.toString()]:  entityClassName.toString() };

			const functionDescription = _this.generateFunctionDescription(functionName, description, parameters, parameterType, parameterName);
			const functionBody = `\treturn argument0[@ ${parameterIndex}];\n\t\n`;

			return functionDescription + functionBody;
		}

		const parameters = this.convertSchemaToParameters(entity.schema);
        return Object
            .entries(parameters)
            .map((fields, index) => generateGetterEntityCode(entity, fields[0], fields[1], index));
	}

	public generateSettersEntityCodes(entity: Entity): string[] {

		const _this = this;
		const generateSetterEntityCode = function(entity, parameterName, parameterType, parameterIndex) {
			const entityObjectName = _this.initialToLower(entity.name);
			const entityClassName = _this.initialToUpper(entity.name);
			const functionName = `set${entityClassName}${_this.initialToUpper(parameterName)}`;
			const description = `Setter.`;
			const parameters = { 
				[entityObjectName.toString()]:  entityClassName.toString(),
				[parameterName.toString()]: parameterType.toString()
			};

			const functionDescription = _this.generateFunctionDescription(functionName, description, parameters, "void");
			const functionBody = `\targument0[@ ${parameterIndex}] = argument1;\n\t\n`;

			return functionDescription + functionBody;
		}

		const parameters = this.convertSchemaToParameters(entity.schema);
        return Object
            .entries(parameters)
            .map((fields, index) => generateSetterEntityCode(entity, fields[0], fields[1], index));
	}

	public generateEntityLabelJSON(entity: Entity): string {
		const entityObjectName = this.initialToLower(entity.name);
		const parameters = this.convertSchemaToParameters(entity.schema);
		const entityLabels = {};
		Object.entries(parameters).forEach((entry) => {
			const key = entityObjectName + "." + entry[0];
			const value = entry[0];
			entityLabels[key] = value;
		});

		return JSON.stringify(entityLabels, null, "\t");
	}

	/**
	 *  UTILS
	 */
	private initialToLower(string: string) {
		return string.charAt(0).toLowerCase() + string.slice(1);
	}

	private initialToUpper(string: string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}

	public notEmptyString(string) {
        return ((Object.prototype.toString.call(string) === "[object String]") &&
                (string.length > 0));
    }

	private convertSchemaToParameters(schemaString) {
		const schema = JSON.parse(schemaString);
		let validated = true;
		Object
			.entries(schema)
			.forEach((fields, index) => {
				if (!this.notEmptyString(fields[0])) {
					validated = false;
				}
				if (!this.notEmptyString(fields[1])) {
					validated = false;
				}
			});
		return validated ? schema : "";
	}

	private generateFieldsAsCommaSeparatedString(parameters) {
		return Object.keys(parameters).join(", ")
	}

	private generateParametersDescription(parameters) {
		return Object.entries(parameters).map((field) => {
			let type: string = field[1].toString();
			if (type.includes("Map")) {
				type = type.replace(", ", "::");
			}
			return `///@param {${type}} ${field[0]}`
		}).join('\n')
	}

	private generateFunctionDescription(functionName, description, parameters, 
		returnType, returnName = "", returnDescription = "") {

			const returnTemplate = returnType.toLowerCase() === "void" ?
				`` : `///@return {${returnType}} ${returnName} ${returnDescription}\n`;

			const timestamp = new Date().toISOString();
			const template = 
				`///@function ${functionName}(${this.generateFieldsAsCommaSeparatedString(parameters)})\n` + 
				`///@description ${description}\n` +
				`${this.generateParametersDescription(parameters)}\n` +
				`${returnTemplate}` +
				`///@throws {Exception}\n` +
				`///@generated {${timestamp}}\n\n`;

			return template;
	}

	private getFieldTypeFromParameterType(parameterType: string, primitives: string[], enums: string[]) {
	
		if (parameterType.includes("Optional<")) {
			parameterType = parameterType.replace("Optional<", "");
			parameterType = parameterType.slice(0, -1);
		}

		const isParameterPrimitiveOrEnum = function(parameterType) {
			return (primitives.includes(parameterType) || enums.includes(parameterType));
		}

		if ((parameterType.includes("<")) &&
			(parameterType.includes(">"))) {

			if (parameterType.includes("Map")) {
				const mapValueType = parameterType.replace("Map<", "").replace(">", "").split("::")[1].replace(" ", "");
				return isParameterPrimitiveOrEnum(mapValueType) ? 
					FieldTypes.PRIMITIVE_MAP :
					FieldTypes.ENTITY_MAP;
			}

			if (parameterType.includes("List")) {
				const listType = parameterType.replace("List<", "").replace(">", "");
				return isParameterPrimitiveOrEnum(listType) ? 
					FieldTypes.PRIMITIVE_LIST :
					FieldTypes.ENTITY_LIST;
			}

			if (parameterType.includes("Stack")) {
				const stackType = parameterType.replace("Stack<", "").replace(">", "");
				return isParameterPrimitiveOrEnum(stackType) ? 
					FieldTypes.PRIMITIVE_STACK :
					FieldTypes.ENTITY_STACK;
			}

			if (parameterType.includes("Grid")) {
				const gridType = parameterType.replace("Grid<", "").replace(">", "");
				return isParameterPrimitiveOrEnum(gridType) ? 
					FieldTypes.PRIMITIVE_GRID :
					FieldTypes.ENTITY_GRID;
			}

			if (parameterType.includes("PriorityQueue")) {
				const arrayType = parameterType.replace("PriorityQueue<", "").replace(">", "");
				return isParameterPrimitiveOrEnum(arrayType) ? 
					FieldTypes.PRIMITIVE_PRIORITY_QUEUE :
					FieldTypes.ENTITY_PRIORITY_QUEUE;
			}

			if (parameterType.includes("Queue")) {
				const queueType = parameterType.replace("Queue<", "").replace(">", "");
				return isParameterPrimitiveOrEnum(queueType) ? 
					FieldTypes.PRIMITIVE_QUEUE :
					FieldTypes.ENTITY_QUEUE;
			}
		}

		if (parameterType.includes("[]")) {
			const arrayType = parameterType.replace("[]", "");
			return isParameterPrimitiveOrEnum(arrayType) ? 
				FieldTypes.PRIMITIVE_ARRAY :
				FieldTypes.ENTITY_ARRAY;
		}

		return isParameterPrimitiveOrEnum(parameterType) ? 
			FieldTypes.PRIMITIVE :
			FieldTypes.ENTITY;
	}

	private getEscapedParameterType(parameterType: string): string {
		let escapedParameterType = parameterType
			.replace("Optional<", "").replace(">", "")
			.replace("[]", "")
			.replace("List<", "").replace(">", "")
			.replace("Stack<", "").replace(">", "")
			.replace("Grid<", "").replace(">", "")
			.replace("Queue<", "").replace(">", "")
			.replace("PriorityQueue<", "").replace(">", "");
			
		return escapedParameterType.includes("Map<") ?
			escapedParameterType.replace("Map<", "").replace(">", "").split("::")[1].replace(" ", "") :
			escapedParameterType;
	}
}
