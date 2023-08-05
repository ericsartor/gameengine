import zod from 'zod';
import { GameError } from './errors';
import { createZodErrorMessage } from './utils';
import { ColorFilterSelections, colorFilter } from './colorFilter';

// Tile data groups tiles together and gives them properties
// { '0,0': { ...data } }
const zTileData = zod.record(
	zod.object({
		gridX: zod.number(),
		gridY: zod.number(),
		gridWidth: zod.number(),
		gridHeight: zod.number(),
		hitBox: zod.boolean(),
	}),
);
type TileData = zod.infer<typeof zTileData>;

// This represents the metadata for a spritesheet image
export const zSheet = zod.object({
	location: zod.string(), // folder path to image/metadata file WITH file name but WITHOUT extension
	gridSize: zod.number(),
	tileData: zTileData,
});

type SheetProps = zod.infer<typeof zSheet> & {
	ctx: CanvasRenderingContext2D;
};
export class Sheet {
	location: string;
	gridSize: number;
	tileData: TileData;
	ctx: CanvasRenderingContext2D;

	static _inventory = new Map<string, Sheet>();
	constructor(props: SheetProps, updateMap = true) {
		this.location = props.location;
		this.gridSize = props.gridSize;
		this.tileData = props.tileData;
		this.ctx = props.ctx;
		if (updateMap) Sheet._inventory.set(this.location, this);
	}

	static _load(location: string): Promise<Sheet> {
		return new Promise<Sheet>(async (resolve, reject) => {
			// Load files
			const [imgBlob, rawMeta] = await Promise.all([
				fetch(`${location}.png`).then((r) => r.blob()),
				fetch(`${location}.sheet`).then((r) => r.json()),
			]);

			// Parse metadata
			const meta = zSheet.safeParse(rawMeta);
			if (!meta.success) throw new GameError(createZodErrorMessage(meta.error));

			// Create canvas from image
			const objUrl = URL.createObjectURL(imgBlob);
			const img = new Image();
			img.src = objUrl;
			img.addEventListener('load', () => {
				const canvas = document.createElement('canvas');
				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;
				const ctx = canvas.getContext('2d');
				if (ctx === null) {
					reject(`could not get context for sheet "${meta.data.location}" during load`);
					return;
				}
				ctx.imageSmoothingEnabled = false;
				ctx.drawImage(img, 0, 0);
				resolve(
					new Sheet({
						...meta.data,
						ctx,
					}),
				);
			});
		});
	}
	copy() {
		const canvas = document.createElement('canvas');
		canvas.width = this.ctx.canvas.width;
		canvas.height = this.ctx.canvas.height;
		const ctx = canvas.getContext('2d');
		if (ctx === null) {
			throw new GameError(`could not get context for sheet "${this.location}" during copy`);
		}
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(this.ctx.canvas, 0, 0);
		return new Sheet(
			{
				ctx,
				gridSize: this.gridSize,
				location: this.location,
				tileData: this.tileData,
			},
			false,
		);
	}

	private _coloredVariants = new Map<string, CanvasRenderingContext2D>();
	withColorFilter(colorSelections: ColorFilterSelections) {
		// Check for existing cached variant
		const key = colorSelections.join('-');
		const variant = this._coloredVariants.get(key);
		if (variant) return variant;

		// Create new variant and cache it
		const copy = this.copy();
		colorFilter(copy.ctx, colorSelections);
		this._coloredVariants.set(key, copy.ctx);
		return copy.ctx;
	}
}
