import zod from 'zod';
import { GameError } from './errors';
import { Game } from './Game';
import { GridCoord } from './types';
import {
	GridBox,
	GridPosition,
	adjustDiagonalDistance,
	closerToNumber,
	createZodErrorMessage,
	doBoxesOverlap,
} from './utils';
import { Animation } from './Animation';

const zPawn = zod.object({
	location: zod.string(),
	animations: zod.array(zod.string()),
});

export type Sprite = {
	source: HTMLCanvasElement;
	gridX: number;
	gridY: number;
	offsetX: number;
	offsetY: number;
	width: number;
	height: number;
};

export type PawnInit = {
	location: string;
	animations: Map<string, Animation>;
};

export class Pawn {
	static nextId = 1;
	static getNextId() {
		return Pawn.nextId++;
	}

	clone() {
		const animationMap = new Map<string, Animation>();
		this.animations.forEach((animation) => {
			animationMap.set(animation.location, animation.copy());
		});
		const pawn = new Pawn({ location: this.location, animations: animationMap }, this.game);
		return pawn;
	}

	game: Game;
	location: string;
	animations: Map<string, Animation>;

	static _inventory = new Map<string, Pawn>();
	constructor(init: PawnInit, game: Game, updateMap = true) {
		this.location = init.location;
		this.animations = init.animations;
		this.game = game;
		if (updateMap) Pawn._inventory.set(this.location, this);
	}

	static async _load(location: string, game: Game): Promise<Pawn> {
		// Download pawn file
		const jsonData = await fetch(`${location}.pawn`).then((r) => r.json());

		// Attempt to validate input
		const pawnInit = zPawn.safeParse(jsonData);
		if (!pawnInit.success) {
			throw new GameError('invalid pawn init: ' + createZodErrorMessage(pawnInit.error));
		}

		// Grab/create properties
		const animations = new Map<string, Animation>();
		pawnInit.data.animations.forEach((animationLocation) => {
			const animation = Animation._inventory.get(animationLocation);
			if (!animation)
				throw new GameError(
					`unknown animation ${animationLocation} during pawn load for ${location}`,
				);
			animations.set(animationLocation, animation.copy());
		});

		return new Pawn(
			{
				location,
				animations,
			},
			game,
		);
	}

	// Animations

	currentAnimation: Animation | null = null;
	setAnimation(name: string) {
		const animation = this.animations.get(name);
		if (animation === undefined)
			throw new GameError(`invalid animation name "${name}" for Pawn "${this.location}"`);
		if (this.currentAnimation === animation) return;
		console.log(animation);
		this.currentAnimation = animation;
		this.currentAnimation.start();
	}
	stopAnimation() {
		this.currentAnimation?.stop();
		this.currentAnimation = null;
	}

	spriteCache = new Map<number, (Sprite | null)[]>();
	_clearSpriteCache() {
		this.spriteCache.clear();
	}
	_getSprite(): (Sprite | null)[] {
		// Use cache if possible
		const cachedSprites = this.spriteCache.get(this.game.timestampMs);
		if (cachedSprites) return cachedSprites;

		// Validate a sprite can be generated
		if (this.currentAnimation !== null) {
			const sprites = this.currentAnimation._getSprite();
			this.spriteCache.set(this.game.timestampMs, sprites);
			return sprites;
		}
		return [null];
	}

	// Hitboxes

	hitBoxCache = new Map<number, GridBox | null>();
	_clearHitBoxCache() {
		this.hitBoxCache.clear();
	}
	_getHitBox(xPosOverride?: number, yPosOverride?: number): GridBox | null {
		// Use cache if possible (and only if we aren't overriding the position of the pawn
		// in order to check a positional new position)
		const avoidCache = xPosOverride !== undefined || yPosOverride !== undefined;
		if (!avoidCache) {
			const cachedHitBox = this.hitBoxCache.get(this.game.timestampMs);
			if (cachedHitBox) return cachedHitBox;
		}

		// Return null if no animation
		if (this.currentAnimation === null) return null;

		return this.currentAnimation._getHitBox(
			xPosOverride ?? this.position.gridX,
			yPosOverride ?? this.position.gridY,
			avoidCache,
		);
	}

	// Movement

	position: GridPosition = {
		gridX: 0,
		gridY: 0,
	};
	moveTo(
		destinationGridX: number,
		destinationGridY: number,
		allowPartialMovement = false,
	): boolean {
		// Check hitbox before moving, avoid cache with overrides
		const unmovedHitBox = this._getHitBox(this.position.gridX, this.position.gridY);
		if (unmovedHitBox !== null) {
			// Define movement strategies
			const strategies = allowPartialMovement
				? [
						[{ gridX: destinationGridX }, { gridY: destinationGridY }],
						[{ gridY: destinationGridY }, { gridX: destinationGridX }],
				  ]
				: // Just move directly to the location if partial movement isn't allowed
				  [[{ gridX: destinationGridX, gridY: destinationGridY }]];

			// Attempt movement strategies
			let mostSuccessfulMovement: null | {
				successes: number;
				position: {
					gridX: number;
					gridY: number;
				};
			} = null;
			for (const strategy of strategies) {
				// Attempt movement strategy, track how successful it was
				let successes = 0;
				const strategyPosition = { gridX: this.position.gridX, gridY: this.position.gridY };
				for (const strategyMovement of strategy) {
					let minPartialX = Infinity;
					let minPartialY = Infinity;
					const tryPartialMovement = (conflictingHitBox: GridBox): boolean => {
						if (!allowPartialMovement) return false;

						if (strategyMovement.gridX !== undefined) {
							const diff = strategyMovement.gridX - this.position.gridX;
							if (diff > 0) {
								// Moving right
								const otherLeft = conflictingHitBox.gridX;
								const thisRight = unmovedHitBox.gridX + unmovedHitBox.gridWidth;
								if (otherLeft > thisRight) {
									minPartialX = closerToNumber(
										unmovedHitBox.gridX,
										otherLeft - unmovedHitBox.gridWidth,
										minPartialX,
									);
								} else {
									return false;
								}
							} else if (diff < 0) {
								// Moving left
								const otherRight = conflictingHitBox.gridX + conflictingHitBox.gridWidth;
								const thisLeft = unmovedHitBox.gridX;
								if (otherRight < thisLeft) {
									minPartialX = closerToNumber(thisLeft, otherRight, minPartialX);
								} else {
									return false;
								}
							}
						}
						if (strategyMovement.gridY !== undefined) {
							const diff = strategyMovement.gridY - this.position.gridY;
							if (diff > 0) {
								// Moving down
								const otherTop = conflictingHitBox.gridY;
								const thisBottom = unmovedHitBox.gridY + unmovedHitBox.gridHeight;
								if (otherTop > thisBottom) {
									minPartialY = closerToNumber(
										unmovedHitBox.gridY,
										otherTop - unmovedHitBox.gridHeight,
										minPartialY,
									);
								} else {
									return false;
								}
							} else if (diff < 0) {
								// Moving up
								const otherBottom = conflictingHitBox.gridY + conflictingHitBox.gridHeight;
								const thisTop = unmovedHitBox.gridY;
								if (otherBottom < thisTop) {
									minPartialY = closerToNumber(thisTop, otherBottom, minPartialY);
								} else {
									return false;
								}
							}
						}

						return true;
					};

					// Get hitbox after potential movement
					const thisPawnHitBox = this._getHitBox(
						strategyMovement.gridX ?? strategyPosition.gridX,
						strategyMovement.gridY ?? strategyPosition.gridY,
					);
					if (thisPawnHitBox) {
						let conflict = false;

						// Check stage hitboxes
						if (this.game.stage) {
							for (const stageHitBox of this.game.stage.hitBoxes) {
								if (
									doBoxesOverlap(stageHitBox, thisPawnHitBox) &&
									!tryPartialMovement(stageHitBox)
								) {
									conflict = true;
									break;
								}
							}
							if (conflict) break;
						}

						// Check other pawn hitboxes
						for (const pawn of this.game._currentPawns) {
							if (pawn === this) continue; // Skip self
							const pawnHitBox = pawn._getHitBox();
							if (
								pawnHitBox !== null &&
								doBoxesOverlap(pawnHitBox, thisPawnHitBox) &&
								!tryPartialMovement(pawnHitBox)
							) {
								conflict = true;
								break;
							}
						}
						if (conflict) break;
					}

					// Track the succesful movement
					successes++;
					if (minPartialX !== Infinity) strategyPosition.gridX = minPartialX;
					else if (strategyMovement.gridX !== undefined)
						strategyPosition.gridX = strategyMovement.gridX;
					if (minPartialY !== Infinity) strategyPosition.gridY = minPartialY;
					else if (strategyMovement.gridY !== undefined)
						strategyPosition.gridY = strategyMovement.gridY;
				}

				// If we had more success in this strategy than the current most successful strategy, track that
				if (
					(mostSuccessfulMovement === null && successes > 0) ||
					(mostSuccessfulMovement !== null && successes > mostSuccessfulMovement.successes)
				) {
					mostSuccessfulMovement = {
						successes,
						position: strategyPosition,
					};

					// If this strategy was entirely successful, use it
					if (successes === strategy.length) break;
				}
			}

			// No movements had any succcess, so the move was not possible
			if (mostSuccessfulMovement === null) return false;

			// Actually move pawn
			this.position.gridX = mostSuccessfulMovement.position.gridX;
			this.position.gridY = mostSuccessfulMovement.position.gridY;

			// Must clear this if we move because the cache becomes invalidated after a movement
			this._clearHitBoxCache();

			return true;
		}

		// Actually move pawn
		this.position.gridX = destinationGridX;
		this.position.gridY = destinationGridY;

		// Must clear this if we move because the cache becomes invalidated after a movement
		this._clearHitBoxCache();

		return true;
	}
	moveRelative(changeX: number, changeY: number): boolean {
		return this.moveTo(this.position.gridX + changeX, this.position.gridY + changeY, true);
	}
	moveTowards(destinationX: number, destinationY: number, gridUnitsPerSecond: number) {
		const maxDistance = gridUnitsPerSecond * this.game.deltaSeconds;

		// Calculate required X movement
		const xDistance =
			this.position.gridX === destinationX
				? 0
				: this.position.gridX > destinationX
				? -maxDistance
				: maxDistance;
		const yDistance =
			this.position.gridY === destinationY
				? 0
				: this.position.gridY > destinationY
				? -maxDistance
				: maxDistance;
		const [xMovement, yMovement] = adjustDiagonalDistance(xDistance, yDistance, maxDistance);
		const newX = this.position.gridX + xMovement;
		const newY = this.position.gridY + yMovement;

		// Move
		this.moveTo(
			xDistance === 0
				? this.position.gridX
				: xDistance < 0
				? Math.max(newX, destinationX)
				: Math.min(newX, destinationX),
			yDistance === 0
				? this.position.gridY
				: yDistance < 0
				? Math.max(newY, destinationY)
				: Math.min(newY, destinationY),
			true,
		);
	}

	// Pathing

	currentPath: GridCoord[] | null = null;
	shouldLoopPath = false;
	pathSpeed = 0;
	pathDirection = 1; // 1 / -1
	nextPathIndex = 0;
	setPath(speed: number, loop: boolean, path: GridCoord[]) {
		this.pathSpeed = speed;
		this.currentPath = path;
		this.nextPathIndex = 0;
		this.shouldLoopPath = loop;
		this.pathDirection = 1;
	}
	removePath() {
		if (this.currentPath === null)
			throw new GameError(
				`tried to remove path from pawn ${this.location} but there was no active path`,
			);
		this.currentPath = null;
		this.pathSpeed = 0;
		this.nextPathIndex = 0;
		this.shouldLoopPath = false;
		this.pathDirection = 1;
	}
	moveAlongPath() {
		if (this.currentPath === null) return;

		// Move along path
		const nextDestination = this.currentPath[this.nextPathIndex];
		this.moveTowards(nextDestination.gridX, nextDestination.gridY, this.pathSpeed);

		// If we arrive at a path point, handle updating to the next path point
		if (
			this.position.gridX === nextDestination.gridX &&
			this.position.gridY === nextDestination.gridY
		) {
			this.nextPathIndex += this.pathDirection;
			if (this.nextPathIndex === this.currentPath.length || this.nextPathIndex < 0) {
				if (this.shouldLoopPath) {
					// Go to the previous path point and update direction
					this.pathDirection *= -1;
					this.nextPathIndex += this.pathDirection * 2;
				} else {
					// Not looping so end path
					this.removePath();
				}
			}
		}
	}

	// Distances

	distanceMap = new Map<Pawn, { timestampMs: number; gridDistance: number }>();
	getDistanceToPawn(otherPawn: Pawn) {
		// Used previous distance value if it was calculated during this logic loop
		const distanceEntry = this.distanceMap.get(otherPawn);
		if (distanceEntry && distanceEntry.timestampMs === this.game.timestampMs)
			return distanceEntry.gridDistance;

		// Make a new distance entry for these pawns
		const xDistance = Math.abs(this.position.gridX - otherPawn.position.gridX);
		const yDistance = Math.abs(this.position.gridY - otherPawn.position.gridY);
		const distance = Math.sqrt(xDistance ** 2 + yDistance ** 2);
		const newDistanceEntry = {
			timestampMs: this.game.timestampMs,
			gridDistance: distance,
		};
		this.distanceMap.set(otherPawn, newDistanceEntry);
		otherPawn.distanceMap.set(this, newDistanceEntry);

		return newDistanceEntry.gridDistance;
	}
}
