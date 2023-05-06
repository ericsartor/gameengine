import type { TrackItem } from "@/components/TimelineTrack.vue";
import { defineStore } from "pinia";
import { onMounted, onUnmounted, reactive, ref } from "vue";
import { useExplorerStore } from "./explorer";

export const useTimelineStore = defineStore('timeline', () => {

    // Track duration and content
    const durationMs = ref<number>(5000);
    const tracks = reactive<TrackItem[][]>([]);

    // Item selection
    const selectedItem = ref<TrackItem | null>(null);
    const selectItem = (item: TrackItem) => {
        selectedItem.value = item;
    };

    // Dragged track item
    let dragStartX = 0; // Where the drag started for calculations
    let dragOriginalStart = 0; // Where the item started originally before the drag began
    let dragStart = 0; // Where the drag currently is, without snapping
    const draggedItem = ref<TrackItem | null>(null);
    const setDraggedItem = (item: TrackItem, event: MouseEvent) => {
        draggedItem.value = item;
        dragStartX = event.clientX;
        dragOriginalStart = item.start;
        dragStart = dragOriginalStart;
    }
    const removeDraggedItem = () => {
        if (draggedItem.value) draggedItem.value.start = dragStart;
        draggedItem.value = null;
    }

    // Resize item
    let resizeStartX = 0;
    let resizeOriginalDuration = 0;
    let resizeDuration = 0;
    const itemBeingResized = ref<TrackItem | null>(null);
    const setResizeItem = (item: TrackItem, event: MouseEvent) => {
        itemBeingResized.value = item;
        resizeStartX = event.clientX;
        resizeOriginalDuration = item.duration;
        resizeDuration = resizeOriginalDuration;
    }
    const removeResizeItem = () => {
        if (itemBeingResized.value) itemBeingResized.value.duration = resizeDuration;
        itemBeingResized.value = null;
    }

    // Handlers for dragging/resizing
    const snapDistanceMs = 50;
    const timelineWidth = ref(1);
    const handleMouseMove = (event: MouseEvent) => {
        if (draggedItem.value !== null) {
            const dItem = draggedItem.value;
            const track = tracks.find((track) => track.includes(dItem));
            if (track === undefined) throw Error('Could not find track for item');
            const changeX = event.clientX - dragStartX;
            const targetStart = ((changeX / timelineWidth.value) * durationMs.value) + dragOriginalStart;
            let snapStart: number | null = null;
            let closestEdgeDifference = Infinity;
            track.forEach((item) => {
                const itemEnd = item.start + item.duration;
                const startDistance = Math.abs(itemEnd - dragStart);
                if (startDistance <= snapDistanceMs && startDistance < closestEdgeDifference) {
                    closestEdgeDifference = startDistance;
                    snapStart = itemEnd;
                }
                const itemStart = item.start;
                const dItemEnd = dragStart + dItem.duration;
                const endDistance = Math.abs(itemStart - dItemEnd);
                if (endDistance <= snapDistanceMs && endDistance < closestEdgeDifference) {
                    closestEdgeDifference = endDistance;
                    snapStart = itemStart - dItem.duration;
                }
            });
            dragStart = targetStart;
            draggedItem.value.start = snapStart ?? targetStart;
        }
        if (itemBeingResized.value !== null) {
            const rItem = itemBeingResized.value;
            const track = tracks.find((track) => track.includes(rItem));
            if (track === undefined) throw Error('Could not find track for item');
            const changeX = event.clientX - resizeStartX;
            const targetDuration = ((changeX / timelineWidth.value) * durationMs.value) + resizeOriginalDuration;
            let snapDuration: number | null = null;
            let closestEdgeDifference = Infinity;
            track.forEach((item) => {
                const rItemEnd = rItem.start + resizeDuration
                const startDistance = Math.abs(item.start - rItemEnd);
                if (startDistance <= snapDistanceMs && startDistance < closestEdgeDifference) {
                    closestEdgeDifference = startDistance;
                    snapDuration = item.start - rItem.start;
                }
            });
            resizeDuration = targetDuration;
            itemBeingResized.value.duration = snapDuration ?? targetDuration;
        }
    };
    const handleMouseUp = () => {
        if (draggedItem.value !== null) removeDraggedItem();
        if (itemBeingResized.value !== null) removeResizeItem();
    };
    onMounted(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    });
    onUnmounted(() => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    });

    // Fill track helper
    const fillTrackFromExplorer = (intervalMs: number) => {
        if (tracks.some((track) => track.length > 0) && !window.confirm('Your timeline is not empty.  Proceed?')) {
            return;
        }
        const track: TrackItem[] = [];
        let start = 0;
        const { spriteFiles } = useExplorerStore();
        spriteFiles.forEach((spriteFile) => {
            track.push({
                spriteFile,
                start,
                duration: intervalMs,
            });
            start += intervalMs;
        });
        tracks.push(track);
        durationMs.value = intervalMs * spriteFiles.length;
    };

    return {
        durationMs,
        tracks,
        draggedItem,
        dragStart,
        setDraggedItem,
        removeDraggedItem,
        itemBeingResized,
        setResizeItem,
        removeResizeItem,
        timelineWidth,
        fillTrackFromExplorer,
        selectedItem,
        selectItem,
    };

});
