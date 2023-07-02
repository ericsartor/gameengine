export type PixelBox = {
    pixelX: number;
    pixelY: number;
    width: number;
    height: number;
};
export type GridBox = {
    gridX: number;
    gridY: number;
    gridWidth: number;
    gridHeight: number;
};
export type GridPosition = {
    gridX: number;
    gridY: number;
};

export const doBoxesOverlap = (box1: GridBox, box2: GridBox) => {
    // Calculate the coordinates of the corners of each box
    const box1Left = box1.gridX;
    const box1Right = box1.gridX + box1.gridWidth;
    const box1Top = box1.gridY;
    const box1Bottom = box1.gridY + box1.gridHeight;
    
    const box2Left = box2.gridX;
    const box2Right = box2.gridX + box2.gridWidth;
    const box2Top = box2.gridY;
    const box2Bottom = box2.gridY + box2.gridHeight;
  
    // Check for overlap
    if (
        box1Left < box2Right &&
        box1Right > box2Left &&
        box1Top < box2Bottom &&
        box1Bottom > box2Top
    ) {
        // Boxes overlap
        return true;
    } else {
        // Boxes don't overlap
        return false;
    }
};

export const closerToNumber = (target: number, a: number, b: number) => {
    const aDiff = Math.abs(a - target);
    const bDiff = Math.abs(b - target);
    return aDiff < bDiff ? a : b;
};

export const closerToZero = (a: number, b: number) => {
    return Math.abs(a) < Math.abs(b) ? a : b;
};