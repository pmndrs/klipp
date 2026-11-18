<script setup lang="ts">
import { Aim, Body, Klipp, VirtualCamera } from '@pmndrs/klipp/tres';
import { useLoop } from '@tresjs/core';
import type { Mesh } from 'three';
import { shallowRef } from 'vue';

const props = defineProps<{ cutscene: boolean; moving: boolean }>();

// Array props are constants: a new array on each render would make Tres patch or rebuild the object.
const gridArgs: [number, number] = [40, 40];
const followOffset: [number, number, number] = [0, 3, 8];
const cutsceneOffset: [number, number, number] = [-6, 1, 3];
const capsuleArgs: [number, number, number, number] = [0.4, 1, 8, 16];
const visorArgs: [number, number, number] = [0.5, 0.15, 0.2];
const visorPosition: [number, number, number] = [0, 0.4, 0.35];

const player = shallowRef<Mesh>();

let time = 0;
useLoop().onBeforeRender(({ delta }) => {
  if (!player.value || !props.moving) return;
  time += delta;
  player.value.position.set(Math.sin(time * 0.6) * 6, 0.9, Math.cos(time * 0.4) * 6);
  player.value.rotation.y = Math.atan2(Math.cos(time * 0.6) * 3.6, -Math.sin(time * 0.4) * 2.4);
});
</script>

<template>
  <TresPerspectiveCamera :fov="50" />

  <TresGridHelper :args="gridArgs" />
  <TresMesh ref="player">
    <TresCapsuleGeometry :args="capsuleArgs" />
    <TresMeshNormalMaterial />
    <TresMesh :position="visorPosition">
      <TresBoxGeometry :args="visorArgs" />
      <TresMeshBasicMaterial color="#111" />
    </TresMesh>
  </TresMesh>

  <Klipp>
    <VirtualCamera name="follow" :priority="10">
      <Body.Follow :target="player" :offset="followOffset" :damping="0.5" />
      <Aim.HardLookAt :target="player" />
    </VirtualCamera>

    <VirtualCamera name="cutscene" :priority="20" :active="cutscene">
      <Body.Follow :target="player" :offset="cutsceneOffset" :damping="0.3" />
      <Aim.HardLookAt :target="player" />
    </VirtualCamera>
  </Klipp>
</template>
