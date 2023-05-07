<script setup lang="ts">
import PreviewPlayer from './components/PreviewPlayer.vue';
import SpriteFileExplorer from './components/SpriteFileExplorer.vue';
import SpriteTimelineVue from './components/SpriteTimeline.vue';
import ToolBarVue from './components/ToolBar.vue';

</script>

<template>
  <div class="root">
    <SpriteFileExplorer style="grid-area: explorer;" />
    <PreviewPlayer style="grid-area: preview;"/>
    <ToolBarVue style="grid-area: toolbar;"></ToolBarVue>
    <SpriteTimelineVue style="grid-area: timeline;" />
  </div>
</template>

<style scoped>
.root {
  display: grid;
  grid-template: 1fr 40px 1fr / 1fr 1fr;
  grid-template-areas: 'explorer preview'
    'toolbar toolbar'
    'timeline timeline';
  width: 100vw;
  height: 100vh;
}
</style>
