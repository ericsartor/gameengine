import { defineStore } from "pinia";
import { ref } from "vue";
import { useTimelineStore } from "./timeline";

export const usePlayerStore = defineStore('player', () => {

    const playing = ref(true);
    const ctx = ref<CanvasRenderingContext2D | null>(null);
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const animationMs = ref(0);

    const draw = (timestamp: number) => {
        if (playing.value === true && ctx.value !== null && canvasRef.value !== null) {
            ctx.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.width)
            const timelineStore = useTimelineStore();
            animationMs.value = timestamp % timelineStore.durationMs;
            for (let i = timelineStore.tracks.length - 1; i >= 0; i--) {
                const track = timelineStore.tracks[i];
                const item = track.find(
                    (item) => item.start <= animationMs.value && item.start + item.duration > animationMs.value,
                );
                if (!item) continue;
                ctx.value!.drawImage(item.spriteFile.el, 0, 0);
            }
        }
        window.requestAnimationFrame(draw);
    };
    window.requestAnimationFrame(draw);

    return {
        ctx,
        canvasRef,
        animationMs
    };

});