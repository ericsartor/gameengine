<script setup lang="ts">
import { InvalidAction } from '@/errors';
import { useExplorerStore } from '@/stores/explorer';
import { onBeforeMount, onBeforeUnmount, ref } from 'vue';

export type SpriteFile = {
    name: string;
    url: string;
    el: HTMLImageElement;
};

const explorerStore = useExplorerStore();
const readyForDrop = ref(false);

// Disable default browser drop action
const prevent = (event: Event) => {
    event.preventDefault();
};
onBeforeMount(() => {
   window.addEventListener('drop', prevent);
});
onBeforeUnmount(() => {
   window.removeEventListener('drop', prevent);
});

const onDragEnter = () => {
    readyForDrop.value = true;
};
const onDragLeave = () => {
    readyForDrop.value = false;
};

// Set up file upload
const onDrop = (event: DragEvent) => {
    readyForDrop.value = false;

    if (!event.dataTransfer) return;

    // Validate and track sprite files
    const droppedFiles: SpriteFile[] = [];
    for (let i = 0; i < event.dataTransfer.files.length; i++) {
        const file = event.dataTransfer.files.item(i)!;
        if (file.type !== 'image/png') throw new InvalidAction('Must use PNG images.')
        if (file.size > (1024 * 1024)) throw new InvalidAction('Images must be less than or equal to 1 MB.')
        const url = URL.createObjectURL(file);
        const el = new Image();
        el.src = URL.createObjectURL(file);
        droppedFiles.push({
            name: file.name,
            url,
            el,
        });
    }

    // Store new sprite files and sort list
    explorerStore.spriteFiles.push(...droppedFiles);
    explorerStore.spriteFiles.sort((a, b) => a.name > b.name ? 1 : -1);
};

type Pixel = [number, number, number, number];
function splitIntoSprites(file: SpriteFile) {
    // Make temp canvas to draw spritesheet onto
    const canvas = document.createElement('canvas');
    canvas.width = file.el.naturalWidth;
    canvas.height = file.el.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (ctx === null) throw Error('could not get canvas ctx for sprite split operation');
    ctx.drawImage(file.el, 0, 0);

    // Get image/pixel data for spritesheet
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let i = 0;
    const getColorIndicesForCoord = (x: number, y: number, width: number) => {
        const red = y * (width * 4) + x * 4;
        return [red, red + 1, red + 2, red + 3];
    };
    const pixelStrings: string[][] = [];
    const pixels: Pixel[][] = [];
    for (let x = 0; x < imageData.width; x++) {
        pixels.push([]);
        pixelStrings.push([]);
        for (let y = 0; y < imageData.height; y++) {
            const [redIndex, greenIndex, blueIndex, alphaIndex] = getColorIndicesForCoord(x, y, canvas.width);
            const pixel: Pixel = [
                imageData.data[redIndex],
                imageData.data[greenIndex],
                imageData.data[blueIndex],
                imageData.data[alphaIndex],
            ];
            pixels[pixels.length-1].push(pixel);
            pixelStrings[pixelStrings.length-1].push(pixel.join(','));
        }
    }

    // Discover groups of touching pixels that aren't the background pixel and create sprites for them
    const newSprites: SpriteFile[] = [];
    const backgroundPixelString = pixelStrings[0][0];
    const checkedPixelsCoordStrings = new Set<string>();
    const currentGroupCoordSet = new Set<string>();
    const checkList: [number, number][] = [];
    const offsets = [
        { x: -1, y: -1 },
        { x: 0, y: -1 },
        { x: 1, y: -1 },
        { x: -1, y: 0 },
        // { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: -1, y: 1 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
    ];
    const getNeighborCoords = (x: number, y: number) => {
        const neighboringCoords: [number, number][] = [];
        offsets.forEach((offset) => {
            const checkX = x + offset.x;
            if (checkX < 0 || checkX >= imageData.width) return;
            const checkY = y + offset.y;
            if (checkY < 0 || checkY >= imageData.height) return;
            if (checkedPixelsCoordStrings.has(`${checkX},${checkY}`)) return;
            if (pixelStrings[checkX][checkY] === backgroundPixelString) return;
            neighboringCoords.push([checkX, checkY]);
        });
        return neighboringCoords;
    };
    for (let x = 0; x < imageData.width; x++) {
        for (let y = 0; y < imageData.height; y++) {

            const firstDiscoveredCoordString = `${x},${y}`;

            // If this pixel isn't a background pixel and hasn't already been checked,
            // track it and recursively scan neighboring pixels to form a group
            if (checkedPixelsCoordStrings.has(firstDiscoveredCoordString)) continue;
            if (pixelStrings[x][y] === backgroundPixelString) continue;

            checkedPixelsCoordStrings.add(firstDiscoveredCoordString);
            currentGroupCoordSet.add(firstDiscoveredCoordString);
            checkList.push(...getNeighborCoords(x, y));

            while (checkList.length > 0) {

                const neighborCoords = checkList.shift()!;
                const neighboringCoordString = neighborCoords.join(',');

                // If this pixel isn't a background pixel and hasn't already been checked,
                // track it and recursively scan neighboring pixels to form a group
                if (checkedPixelsCoordStrings.has(neighboringCoordString)) continue;
                if (pixelStrings[neighborCoords[0]][neighborCoords[1]] === backgroundPixelString) continue;

                checkedPixelsCoordStrings.add(neighboringCoordString);
                currentGroupCoordSet.add(neighboringCoordString);
                checkList.push(...getNeighborCoords(neighborCoords[0], neighborCoords[1]));

            }

            // We've discovered a group of pixels, create a new SpriteFile
            const discoveredPixelCoords = Array.from(currentGroupCoordSet).map((str) => str.split(',').map((coord) => Number(coord)));
            currentGroupCoordSet.clear();
            const minX = discoveredPixelCoords.reduce((acc, val) => Math.min(acc, val[0]), Infinity);
            const maxX = discoveredPixelCoords.reduce((acc, val) => Math.max(acc, val[0]), 0);
            const minY = discoveredPixelCoords.reduce((acc, val) => Math.min(acc, val[1]), Infinity);
            const maxY = discoveredPixelCoords.reduce((acc, val) => Math.max(acc, val[1]), 0);
            const spriteWidth = maxX - minX + 1;
            const spriteHeight = maxY - minY + 1;
            const newSpriteData = new ImageData(spriteWidth, spriteHeight);
            for (let spriteX = 0; spriteX < spriteWidth; spriteX++) {
                for (let spriteY = 0; spriteY < spriteHeight; spriteY++) {
                    const imageX = minX + spriteX;
                    const imageY = minY + spriteY;
                    newSpriteData.data[(spriteY * (spriteWidth * 4)) + (spriteX * 4) + 0] = pixels[imageX][imageY][0];
                    newSpriteData.data[(spriteY * (spriteWidth * 4)) + (spriteX * 4) + 1] = pixels[imageX][imageY][1];
                    newSpriteData.data[(spriteY * (spriteWidth * 4)) + (spriteX * 4) + 2] = pixels[imageX][imageY][2];
                    newSpriteData.data[(spriteY * (spriteWidth * 4)) + (spriteX * 4) + 3] = pixels[imageX][imageY][3];
                }
            }
            const newSpriteCanvas = document.createElement('canvas');
            newSpriteCanvas.width = spriteWidth;
            newSpriteCanvas.height = spriteHeight;
            const newSpriteCtx = newSpriteCanvas.getContext('2d')!;
            newSpriteCtx.putImageData(newSpriteData, 0, 0);
            const url = newSpriteCanvas.toDataURL();
            const img = new Image();
            img.src = url;
            newSprites.push({
                url,
                name: `${newSprites.length + 1}.png`,
                el: img,
            });
        }
    }

    // Add the new sprites to the explorer
    explorerStore.spriteFiles.push(...newSprites);
}
</script>

<template>
    <div class="explorer">
        <div
            class="drop-target file-browser"
            :class="{
                'ready-for-drop': readyForDrop,
            }"
            @dragenter.stop.prevent="onDragEnter"
            @dragover.stop.prevent
            @dragleave.stop.prevent="onDragLeave"
            @drop.stop.prevent="onDrop"
        >
            <div
                class="sprite-file"
                :class="{
                    selected: file === explorerStore.selectedFile,
                }"
                v-for="file in explorerStore.spriteFiles"
                :key="file.name"
                @dragstart="explorerStore.setDraggedItem(file)"
                @mousedown="explorerStore.selectFile(file)"
            >
                <img :src="file.url">
                <span class="name">{{ file.name }}</span>
            </div>
        </div>
        <div class="tools">
            <template v-if="explorerStore.selectedFile">
                <button @click="splitIntoSprites(explorerStore.selectedFile)">Split Into Sprites</button>
            </template>
        </div>
    </div>
</template>

<style scoped>
.explorer {
    display: grid;
    grid-template: 1fr 40px / 1fr;
    grid-template-areas: 'files'
        'tools';
}

.drop-target {
    background-image: radial-gradient(#6b6b6b, #494949);
    border: 2px solid rgba(0, 0, 0, 0);
    grid-area: files;
}
.drop-target.ready-for-drop {
    border: 2px solid gold;
}

.file-browser {
    display: flex;
    flex-flow: row wrap;
    width: 100%;
    height: 100%;
    overflow: scroll;
}
.file-browser .sprite-file {
    display: flex;
    flex-flow: column nowrap;
    padding: 6px;
    user-select: none;
    border: 2px solid rgba(0,0,0,0);
}
.file-browser .sprite-file.selected {
    border-color: gold;
}
.file-browser .sprite-file img {
    width: 64px;
    height: 64px;
    object-fit: contain;
    object-position: 50% 50%;
    image-rendering: pixelated;
}
.file-browser .sprite-file span.name {
    font-family: monospace;
}

.tools {
    background-color: yellow;
    grid-area: tools;
}
</style>