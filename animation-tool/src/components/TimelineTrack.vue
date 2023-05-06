<script setup lang="ts">
import { useTimelineStore } from '@/stores/timeline';
import { useExplorerStore } from '@/stores/explorer';
import type { SpriteFile } from './SpriteFileExplorer.vue';

export type TrackItem = {
    spriteFile: SpriteFile;
    start: number; // milliseconds
    duration: number; // milliseconds
};

const props = defineProps<{
    items: TrackItem[];
}>();
const emit = defineEmits<{
    (e: 'add-item', spriteFile: SpriteFile): void;
}>();

const explorerStore = useExplorerStore();
const timelineStore = useTimelineStore();

const handleItemDragStart = (item: TrackItem, event: MouseEvent) => {
    timelineStore.setDraggedItem(item, event);
};
const handleItemResizeStart = (item: TrackItem, event: MouseEvent) => {
    timelineStore.setResizeItem(item, event);
};
const handleItemAdd = () => {
    if (explorerStore.draggedItem === null) return;
    emit('add-item', explorerStore.draggedItem);
};
</script>

<template>
    <div class="track" @drop.stop.prevent="handleItemAdd">
        <div
            :style="{
                width: `${item.duration / timelineStore.durationMs * 100}%`,
                left: `${(item.start) / timelineStore.durationMs * 100}%`,
                zIndex: timelineStore.selectedItem === item ? 1 : 0
            }"
            class="item"
            :class="{
                selected: timelineStore.selectedItem === item
            }"
            v-for="(item, i) in props.items"
            :key="i"
            @click="timelineStore.selectItem(item)"
            @mousedown.stop="handleItemDragStart(item, $event)"
            @dragstart.prevent.stop
        >
            <img :src="item.spriteFile.url">
            <div class="resize" @mousedown.stop="handleItemResizeStart(item, $event)"></div>
        </div>
    </div>
</template>

<style scoped>
.track {
    position: relative;
    height: 64px;
    width: 100%;
}
.item {
    top: 0;
    width: 64px;
    height: 64px;
    position: absolute;
    display: flex;
    justify-content: center;
    background: gray;
    border: 1px solid black;
}
.item.selected {
    border-color: gold;
}

.item img {
    width: 64px;
    height: 64px;
    object-fit: contain;
    object-position: 50% 50%;
}

.item .resize {
    height: 64px;
    width: 10px;
    position: absolute;
    right: 0;
    top: 0;
}
</style>