import DIContanier from "../../src/inversify.config";
import { CodeSnippet } from "../../src/type/entity-builder-model";
import { EntityGeneratorService } from "../../src/service/entity-generator-service";
import { expect } from "chai";
import { injectable, inject } from "inversify";

@injectable()
export class Dependencies {

	private entityGeneratorService: EntityGeneratorService;

	constructor(@inject(EntityGeneratorService) entityGeneratorService: EntityGeneratorService) {
		this.entityGeneratorService = entityGeneratorService;
	}

    public getEntityGeneratorService(): EntityGeneratorService {
        return this.entityGeneratorService;
    }
}

const dependencies = DIContanier.resolve<Dependencies>(Dependencies);

describe('entity builder', () => {
    it('build entities', () => {

        const entityGeneratorService = dependencies.getEntityGeneratorService();
        const codeSnippets: CodeSnippet[] = entityGeneratorService.generateEntityCode({
            name: "TestEntity",
            schema: `{
                "primitiveField": "String"
            }`,
            enums: `[]`,
            primitives: `[
                "String"
            ]`,
        })

        expect(7).equal(codeSnippets.length);
    })
})