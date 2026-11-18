<script setup lang="ts">
import { TresCanvas } from '@tresjs/core';
import { ref } from 'vue';

import Scene from './Scene.vue';

const cutscene = ref(false);
const moving = ref(true);
</script>

<template>
  <div class="controls">
    <button @click="cutscene = !cutscene">{{ cutscene ? 'Back to follow' : 'Play cutscene' }}</button>
    <button @click="moving = !moving">{{ moving ? 'Stop target' : 'Move target' }}</button>
  </div>
  <TresCanvas clear-color="#111" window-size>
    <Scene :cutscene="cutscene" :moving="moving" />
  </TresCanvas>
</template>

<style>
html,
body {
  margin: 0;
  background: #111;
  font-family: system-ui, sans-serif;
}

.controls {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 1;
  display: flex;
  gap: 8px;
}

.controls button {
  padding: 8px 12px;
  border: 1px solid #444;
  border-radius: 6px;
  background: #222;
  color: #eee;
  cursor: pointer;
}
</style>
