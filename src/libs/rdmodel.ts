export default class ReactionDiffusionModel {

    canvas: HTMLCanvasElement
    adapter: GPUAdapter
    device: GPUDevice
    context: GPUCanvasContext
    
    constructor(canvas: HTMLCanvasElement, adapter: GPUAdapter, device: GPUDevice, context: GPUCanvasContext) {
        this.canvas = canvas
        this.adapter = adapter
        this.device = device
        this.context = context
    }

    static async build(canvas: HTMLCanvasElement) {
        if (!navigator.gpu) {
            throw new Error('Your browser does not support WebGPU yet. Try Chrome on Mac or Windows. Or on Linux with a flag.')
        }

        const adapter = await navigator.gpu.requestAdapter()

        if (!adapter) {
            throw new Error("No appropriate GPUAdapter found.");
        }

        const device = await adapter.requestDevice();

        const context = canvas.getContext("webgpu") as GPUCanvasContext;
        const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
            device: device,
            format: canvasFormat,
        });

        return new ReactionDiffusionModel(canvas, adapter, device, context)
    }

    clear(color: GPUColor = { r: 0, g: 0, b: 0.4, a: 1 }) {
        const encoder = this.device.createCommandEncoder();

        const pass = encoder.beginRenderPass({
            colorAttachments: [{
               view: this.context.getCurrentTexture().createView(),
               loadOp: "clear",
               clearValue: color,
               storeOp: "store",
            }]
          });

        pass.end();

        this.device.queue.submit([encoder.finish()]);
    }
}