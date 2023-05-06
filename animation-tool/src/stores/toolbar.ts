import { defineStore } from "pinia";
import { ref } from "vue";

export const useToolBarStore = defineStore('toolbar', () => {

    const canvasWidth = ref(64);
    const canvasHeight = ref(64);
    const explorerFillIntervalMs = ref(500);

    return {
        canvasWidth,
        canvasHeight,
        explorerFillIntervalMs,
    };

});
