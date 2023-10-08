<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ReactionDiffusionModel from '../libs/rdmodel';

defineProps<{ msg: string }>()

const count = ref(0)

onMounted(async () => {
  const canvas = document.querySelector('canvas') as HTMLCanvasElement

  const rdmodel = await ReactionDiffusionModel.build(canvas)
  rdmodel.render()
})

</script>

<template>
  <h1>{{ msg }}</h1>

  <canvas width="512" height="512"></canvas>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
