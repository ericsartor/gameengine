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
</script>

<template>
    <div
        class="drop-target"
        :class="{
            'ready-for-drop': readyForDrop,
        }"
        @dragenter.stop.prevent="onDragEnter"
        @dragover.stop.prevent
        @dragleave.stop.prevent="onDragLeave"
        @drop.stop.prevent="onDrop"
    >
        <div class="file-browser">
            <div
                class="sprite-file"
                v-for="file in explorerStore.spriteFiles"
                :key="file.name"
                @dragstart="explorerStore.setDraggedItem(file)"
            >
                <img :src="file.url">
                <span class="name">{{ file.name }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.drop-target {
    width: 50vw;
    height: 50vh;
    background-image: radial-gradient(#6b6b6b, #494949);
    border: 2px solid rgba(0, 0, 0, 0);
}
.drop-target.ready-for-drop {
    border: 2px solid gold;
}

.file-browser {
    display: flex;
}
.file-browser .sprite-file {
    display: flex;
    flex-flow: column nowrap;
    padding: 6px;
    user-select: none;
}
.file-browser .sprite-file img {
    width: 64px;
    height: 64px;
    object-fit: contain;
    object-position: 50% 50%;
}
.file-browser .sprite-file span.name {
    font-family: monospace;
}
</style>