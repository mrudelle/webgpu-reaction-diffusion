<script setup lang="ts">
import { ref, onMounted, watch, toRaw, reactive, onUnmounted} from 'vue'
import ReactionDiffusionModel from '../libs/rdmodel';
import { Pane } from 'tweakpane';

const tweakpaneContainer = ref<HTMLElement>()

const PARAMS = reactive({
  speed: 1000,
  diffuseRateU: 1.0,
  diffuseRateV: 0.5,
  feedRate: 0.055,
  killRate: 0.062,
})

const RATE_SETTING = {
  min: 0,
  max: 1
}

let rdmodel: ReactionDiffusionModel | undefined;

onMounted(async () => {
  const canvas = document.querySelector('canvas') as HTMLCanvasElement

  rdmodel = await ReactionDiffusionModel.build(canvas)

  const pane = new Pane({
    container: tweakpaneContainer.value,
    title: 'WebGPU Reaction Diffusion 🧪'
  })

  const chemicalsFolder = pane.addFolder({
    title: 'Chemicals'
  })

  chemicalsFolder.addBinding(PARAMS, 'diffuseRateU', RATE_SETTING);
  chemicalsFolder.addBinding(PARAMS, 'diffuseRateV', RATE_SETTING);
  chemicalsFolder.addBinding(PARAMS, 'feedRate', {min: .002, max: .12});
  chemicalsFolder.addBinding(PARAMS, 'killRate', {min: .045, max: .07});

  const reset = chemicalsFolder.addButton({
    title: 'Reset',
    label: 'Reset chemicals',   // optional
  });

  const animationFolder = pane.addFolder({
    title: 'Animation'
  });

  animationFolder.addBinding(PARAMS, 'speed', {min: 0});

  const pause = animationFolder.addButton({
    title: 'Pause',
  })

  reset.on('click', () => {
    if (!rdmodel) return
    rdmodel.resetChemicals();
  });

  pause.on('click', () => {
    if (!rdmodel) return
    if (rdmodel.playing) {
      rdmodel.stop()
    } else {
      rdmodel.start()
    }
    pause.title = rdmodel.playing ? 'Pause' : 'Play'
  })

  watch(PARAMS, (newSettings) => {
    if (!rdmodel) return
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

onUnmounted(() => {
  if (rdmodel) {
    rdmodel.stop()
  }
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
  width: 20em;
}
</style>
