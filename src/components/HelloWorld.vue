<script setup lang="ts">
import { ref, onMounted, watch, toRaw, reactive} from 'vue'
import ReactionDiffusionModel from '../libs/rdmodel';
import { Pane } from 'tweakpane';

const tweakpaneContainer = ref<HTMLElement>()

const PARAMS = reactive({
  speed: 20,
  diffuseRateU: 1.0,
  diffuseRateV: 0.5,
  feedRate: 0.055,
  killRate: 0.062,
})

const RATE_SETTING = {
  min: 0,
  max: 1
}

onMounted(async () => {
  const canvas = document.querySelector('canvas') as HTMLCanvasElement

  const rdmodel = await ReactionDiffusionModel.build(canvas)

  const pane = new Pane({
    container: tweakpaneContainer.value,
    title: 'WebGPU Reaction Diffusion'
  })

  pane.addBinding(PARAMS, 'speed', {min: 0});
  pane.addBinding(PARAMS, 'diffuseRateU', RATE_SETTING);
  pane.addBinding(PARAMS, 'diffuseRateV', RATE_SETTING);
  pane.addBinding(PARAMS, 'feedRate', {min: .01, max: .1});
  pane.addBinding(PARAMS, 'killRate', {min: .045, max: .07});

  const reset = pane.addButton({
    title: 'Reset',
    label: 'Reset chemicals',   // optional
  });
  reset.on('click', () => {
    rdmodel.resetChemicals();
  });

  watch(PARAMS, (newSettings) => {
    const input = toRaw(newSettings)
    rdmodel.speed = input.speed
    rdmodel.uniforms.diffuseRateU = input.diffuseRateU
    rdmodel.uniforms.diffuseRateV = input.diffuseRateV
    rdmodel.uniforms.feedRate = input.feedRate
    rdmodel.uniforms.killRate = input.killRate

    console.log('new settings:', rdmodel.uniforms)
  }, { immediate: true })

  rdmodel.start()
})



</script>

<template>
  <div id="tweakpane-holder" ref="tweakpaneContainer"></div>
  <div id="canvas-holder">
    <canvas width="512" height="512"></canvas>
  </div>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}

#tweakpane-holder {
  position: absolute;
  left: .8em;
  top: .8em;
  width: 30em;
}
</style>
