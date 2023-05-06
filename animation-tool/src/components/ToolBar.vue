<script setup lang="ts">
import { useTimelineStore } from '@/stores/timeline';
import { useToolBarStore } from '@/stores/toolbar';
import { storeToRefs } from 'pinia';

const timelineStore = useTimelineStore();
const toolBarStore = useToolBarStore();
const {
    canvasWidth,
    canvasHeight,
    explorerFillIntervalMs,
} = storeToRefs(toolBarStore);
</script>


<template>
    <div class="toolbar">
        <div class="group">
            <label>Width</label>
            <input type="number" v-model.number="canvasWidth">
        </div>
        <div class="group">
            <label>Height</label>
            <input type="number" v-model.number="canvasHeight">
        </div>
        <div class="group">
            <label>Fill From Explorer</label>
            <input type="number" v-model.number="explorerFillIntervalMs">
            <button @click="timelineStore.fillTrackFromExplorer(explorerFillIntervalMs)">Fill</button>
        </div>
    </div>
</template>

<style scoped>
.toolbar {
    background-color: purple;
    display: flex;
    gap: 12px;
    align-items: center;
}

.toolbar .group {
    display: flex;
    gap: 6px;
}
</style>