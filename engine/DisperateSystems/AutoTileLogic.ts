// Check surrounding Cells to determine what tileset coordinate the given particular cell requires.
// To Use, only currently checking 1 particular cell. To use properly, you must call determineTilesetCoordinate() for
// every cell in level with that particular tileset (only autotile sets)
// No need to call on cells without an autotile set

/* Parameters:
	tilesetId: number
		- Every tileset has an identifier number, this references the specific set.
		- It is unique to every set, both autotiles and non-autotiles
	tileCoord: [number, number]
		- The specific cell, that has the tileset with the given tilesetId
		- It is assumed that this cell contains the auto tileset and is not checked; as this shouldn't be called on cells without the tileset on it
	levelData: any (Currently, should update when type is determined)
		- The information regarding the specific levels cell information (may be separate to other level Data)
		- This parameter is pseudo-temporary. Once specific level information schema is determined, this should be replaced with the appropriate name 
*/

/* Assumptions:
	Due to not knowing the final schema for level/cell information, we make the following assumptions about "levelData":
	- levelData contains an array of arrays.
	- The first index of the array represents the x-coordinate of the level
	- The second index of the array represents the y-coordinate on the x-coordinates row
	- levelData[x][y] has method "hasTileset(tilesetId: number): boolean" to determine if that cell (levelData[x][y]) has the specific tileset active
	- This can be changed to reflect the scheme that becomes implemented, all that is required is a way to access specific cells through indexing ([x][y]),
		- and that each cell has information about the tilesets it holds (with a way to access that information)
*/

// Check if the tile exists within the level (returns false for either X or Y outside of levelData bounds) without exception
const tileIsValid = (tileCoord: [number, number], levelData: any): boolean => {
	return levelData?.[tileCoord[0]] && levelData[tileCoord[0]]?.[tileCoord[1]];
};

// Check metadata of level, return if checked cell is marked to contain the specific tilesetId
const levelHasAutoTile = (
	tilesetId: number,
	tileCoord: [number, number],
	levelData: any
): boolean => {
	return levelData[tileCoord[0]][tileCoord[1]].hasTileset(tilesetId);
};

// Loop through 8 possible surrounding cells to check if they contain the current tileset within
const checkSurroundingTiles = (tilesetId: number, tileCoord: [number, number], levelData: any) => {
	const surroundingTiles: boolean[] = [false, false, false, false, false, false, false, false];
	for (let i = 0; i < 8; ++i) {
		const tileCoordToCheck: [number, number] = [...tileCoord];

		// Set X-Coordinate for the tile to check. If it's left of this cell, x-1. If Right of cell, x+1. else don't change.
		if (i === 0 || i === 3 || i === 5) --tileCoordToCheck[0];
		else if (i === 2 || i === 4 || i === 7) ++tileCoordToCheck[0];

		// Set Y-Coordinate for the tile to check. If it's above this cell, y-1. If below the cell, y+1. else don't change.
		if (i >= 0 && i <= 2) --tileCoordToCheck[1];
		else if (i >= 5 && i <= 7) ++tileCoordToCheck[1];

		// If tile Coordinate exists in the levelData, and that cell is marked to have this tileset, update surroundingTiles array.
		// If the tile does not exist, or doesn't contain the tileset, it is left to it's default false value in surroundingTiles array.
		if (tileIsValid(tileCoordToCheck, levelData)) {
			if (levelHasAutoTile(tilesetId, tileCoordToCheck, levelData)) {
				surroundingTiles[i] = true;
			}
		}
	}
	return surroundingTiles;
};

// Object containing all possible cell combinations (47 unique cells)
// Is accessed through a String constructed through checking each connecting cell
// Prettier.ignore
const coordinateMap: { [coord: string]: [number, number] } = {
	// All Cardinal Cells
	NWSE: [4, 3],
	// All Diagonal Cells
	nwneswse: [2, 3],
	// No Cells
	none: [3, 3],
	// Singular Cardinal Cells
	N: [1, 0],
	W: [0, 5],
	E: [6, 1],
	S: [5, 6],
	// Singular Diagonal Cells
	nw: [0, 0],
	ne: [6, 0],
	sw: [0, 6],
	se: [6, 6],
	// Double Cardinal Cells
	NW: [0, 1],
	NE: [5, 0],
	NS: [4, 2],
	WE: [2, 4],
	WS: [1, 6],
	ES: [6, 5],
	// Triple Cardinal Cells
	NWE: [1, 2],
	NWS: [2, 5],
	NES: [4, 1],
	WES: [5, 4],
	// Double Diagonal Cells
	nwne: [1, 1],
	nwsw: [1, 5],
	nwse: [2, 2],
	nesw: [4, 4],
	nese: [5, 1],
	sesw: [5, 5],
	// Triple Diagonal Cells
	nwnesw: [1, 4],
	nwnese: [2, 1],
	nwswse: [4, 5],
	neswse: [5, 2],
	// 1 Cardinal Cell + 1 Diagonal Cell
	Nsw: [3, 0],
	Nse: [2, 0],
	Wne: [0, 4],
	Wse: [0, 3],
	Enw: [6, 3],
	Esw: [6, 2],
	Snw: [4, 6],
	Sne: [3, 6],
	// 2 Cardinal Cells + Opposite Corner Cell
	NWse: [1, 3],
	NEsw: [3, 1],
	WSne: [3, 5],
	ESnw: [5, 3],
	// 1 Cardinal Cell + 2 Diagonal Cells
	Nswse: [4, 0],
	Wnese: [0, 2],
	Enwsw: [6, 4],
	Snwne: [2, 6],
};

// Find if the surrounding tiles contain the tileset, find the correct coordinate for specific tile in tileset
const determineTilesetCoordinate = (
	tilesetId: number,
	tileCoord: [number, number],
	levelData: any
): [number, number] => {
	const surroundingTiles = [...checkSurroundingTiles(tilesetId, tileCoord, levelData)];
	let checkNW = true;
	let checkNE = true;
	let checkSW = true;
	let checkSE = true;
	let coordinateString = "";
	// North Cell
	if (surroundingTiles[1]) {
		checkNW = false;
		checkNE = false;
		coordinateString += "N";
	}
	// West Cell
	if (surroundingTiles[3]) {
		checkNW = false;
		checkSW = false;
		coordinateString += "W";
	}
	// East Cell
	if (surroundingTiles[4]) {
		checkNE = false;
		checkSE = false;
		coordinateString += "E";
	}
	// South Cell
	if (surroundingTiles[6]) {
		checkSW = false;
		checkSE = false;
		coordinateString += "S";
	}
	// North-West Cell
	if (surroundingTiles[0] && checkNW) coordinateString += "nw";
	// North-East Cell
	if (surroundingTiles[2] && checkNE) coordinateString += "ne";
	// South-West Cell
	if (surroundingTiles[5] && checkSW) coordinateString += "sw";
	// South-East Cell
	if (surroundingTiles[7] && checkSE) coordinateString += "se";
	// Default / No Cells Around are active
	if (coordinateString === "") coordinateString = "none";

	// Returns location on given Tileset of proper tile to use in levelData
	return coordinateMap[coordinateString];
};

export default determineTilesetCoordinate;
