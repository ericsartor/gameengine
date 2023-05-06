import type { SpriteFile } from "@/components/SpriteFileExplorer.vue";
import { defineStore } from "pinia";
import { reactive, ref } from "vue";

export const useExplorerStore = defineStore('explorer', () => {

    const spriteFiles = reactive<SpriteFile[]>([]);

    const draggedItem = ref<SpriteFile | null>(null);
    const setDraggedItem = (item: SpriteFile) => {
        draggedItem.value = item;
    }
    const removeDraggedItem = () => {
        draggedItem.value = null;
    }

    return {
        spriteFiles,
        draggedItem,
        setDraggedItem,
        removeDraggedItem,
    };

});
