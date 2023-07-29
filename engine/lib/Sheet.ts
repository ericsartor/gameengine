import zod from 'zod';
import { GameError } from './errors';
import { createZodErrorMessage } from './utils';
import { ColorFilterSelections, colorFilter } from './colorFilter';

// Groups are used in the tooling UI to use multiple tiles in unison, and are not actually used in the engine
const zTileGroup = zod.array(zod.object({ x: zod.number(), y: zod.number() }));

// This represents the metadata for a spritesheet image
const zSheet = zod.object({
	location: zod.string(), // folder path to image/metadata file WITH file name but WITHOUT extension
	gridSize: zod.number(), // this should be the same as the game
	groups: zod.array(zTileGroup),
});

type SheetProps = {
	location: string;
	gridSize: number;
	ctx: CanvasRenderingContext2D;
};
export class Sheet {
	location: string;
	gridSize: number;
	ctx: CanvasRenderingContext2D;

	static _inventory = new Map<string, Sheet>();
	constructor(props: SheetProps, updateMap = true) {
		this.location = props.location;
		this.gridSize = props.gridSize;
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
						ctx,
						gridSize: meta.data.gridSize,
						location: location,
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
