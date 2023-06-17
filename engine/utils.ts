export type Box = {
    x: number;
    y: number;
    width: number;
    height: number;
};
export const doBoxesOverlap = (box1: Box, box2: Box) => {
    // Calculate the coordinates of the corners of each box
    const box1Left = box1.x;
    const box1Right = box1.x + box1.width;
    const box1Top = box1.y;
    const box1Bottom = box1.y + box1.height;
    
    const box2Left = box2.x;
    const box2Right = box2.x + box2.width;
    const box2Top = box2.y;
    const box2Bottom = box2.y + box2.height;
  
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
}  