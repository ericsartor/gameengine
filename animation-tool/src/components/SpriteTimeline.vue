<script setup lang="ts">
import { useTimelineStore } from '@/stores/timeline';
import TimelineTrack, { type TrackItem } from './TimelineTrack.vue';
import type { SpriteFile } from './SpriteFileExplorer.vue';
import { useExplorerStore } from '@/stores/explorer';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { usePlayerStore } from '@/stores/player';

const explorerStore = useExplorerStore();
const timelineStore = useTimelineStore();
const playerStore = usePlayerStore();

const readyForDrop = ref(false);
const timelineRef = ref<HTMLDivElement | null>(null);
watch([timelineRef], () => {
    if (timelineRef.value === null) return;
    timelineStore.timelineWidth = timelineRef.value.getBoundingClientRect().width;
});

const handleResize = () => {
    if (timelineRef.value === null) return;
    timelineStore.timelineWidth = timelineRef.value.getBoundingClientRect().width;
};
onMounted(() => {
    window.addEventListener('resize', handleResize);
});
onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
});

const handleAddTrackWithItem = () => {
    readyForDrop.value = false;
    if (explorerStore.draggedItem === null) return;
    timelineStore.tracks.push([
        { spriteFile: explorerStore.draggedItem, start: 0, duration: timelineStore.durationMs / 5 },
    ]);
};
const handleAddItem = (items: TrackItem[], spriteFile: SpriteFile) => {
    items.push({ spriteFile, start: 0, duration: timelineStore.durationMs / 5 });
};
</script>

<template>
    <div
        ref="timelineRef"
        class="timeline"
        :class="{ 'ready-for-drop': readyForDrop }"
        @dragenter.stop.prevent="readyForDrop = true"
        @dragleave.stop.prevent="readyForDrop = false"
        @dragover.stop.prevent
        @drop.stop.prevent="handleAddTrackWithItem"
    >
        <div class="tracks">
            <TimelineTrack
                v-for="(items, i) in timelineStore.tracks"
                :key="i"
                :items="items"
                @add-item="handleAddItem(items, $event)"
            />
            <div
                class="playhead"
                :style="{
                    left: `${playerStore.animationMs / timelineStore.durationMs * 100}%`,
                }"
            ></div>
        </div>
    </div>
</template>

<style scoped>
.timeline {
    background: red;
    height: 50vh;
    width: 100vw;
    border: 2px solid rgba(0, 0, 0, 0);
}
.timeline.ready-for-drop {
    border: 2px solid gold;
}

.tracks {
    position: relative;
}

.playhead {
    width: 2px;
    height: 50vh;
    background: green;
    position: absolute;
    top: 0;
}
</style>