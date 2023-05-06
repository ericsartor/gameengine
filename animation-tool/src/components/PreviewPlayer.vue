<script setup lang="ts">
import { usePlayerStore } from '@/stores/player';
import { useToolBarStore } from '@/stores/toolbar';
import { storeToRefs } from 'pinia';
import { watch } from 'vue';

const { canvasRef, ctx } = storeToRefs(usePlayerStore());
watch([canvasRef], () => {
    if (canvasRef.value === null) return;
    ctx.value = canvasRef.value.getContext('2d');
});

const toolBarStore = useToolBarStore();


</script>

<template>
    <div class="preview-player">
        <canvas ref="canvasRef" :width="toolBarStore.canvasWidth" :height="toolBarStore.canvasHeight"></canvas>
    </div>
</template>

<style scoped>
.preview-player {
    display: flex;
    justify-content: center;
    align-items: center;
}

.preview-player canvas {
    border: 2px solid black;
    background-image: linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}
</style>