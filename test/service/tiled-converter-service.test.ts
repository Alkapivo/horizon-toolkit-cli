
import DIContanier from "../../src/inversify.config";
import path from "path";
import { expect } from "chai";
import { inject, injectable } from "inversify";
import { readFileSync, writeFileSync } from "fs";
import { TiledConverterService } from "../../src/service/tiled-converter-service";
import { TiledMap } from "../../src/type/tiled-converter-model";

@injectable()
export class Dependencies {

	private tiledConverterService: TiledConverterService;

	constructor(@inject(TiledConverterService) tiledConverter: TiledConverterService) {
		this.tiledConverterService = tiledConverter;
	}

    public getTiledConverterService(): TiledConverterService {
        return this.tiledConverterService;
    }
}
const dependencies = DIContanier.resolve<Dependencies>(Dependencies);

describe('map converter', () => {
    it('convert to mm', () => {
        
        const tiledConverterService = dependencies.getTiledConverterService();
        const rootPath = path.posix.normalize(process.cwd());

        const mapName = "example_map"
        const exportedMapPath: string = `${rootPath}/test/resource/tiled/${mapName}.json`;

        const tiledJson: string = readFileSync(exportedMapPath).toString();
        const tiledMap: TiledMap = tiledConverterService
            .convertTiledJsonToTiledMap(mapName, tiledJson);

        expect(tiledMap.name).equal(mapName);
    })
})