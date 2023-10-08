export default class ReactionDiffusionModel {
    
    canvas: HTMLCanvasElement
    adapter: GPUAdapter
    device: GPUDevice
    context: GPUCanvasContext
    
    vertexBuffer: GPUBuffer
    cellShaderModule: GPUShaderModule
    
    vertices = new Float32Array([
        //   X,    Y,
        -0.8, -0.8, // Triangle 1 (Blue)
        0.8, -0.8,
        0.8,  0.8,
        
        -0.8, -0.8, // Triangle 2 (Red)
        0.8,  0.8,
        -0.8,  0.8,
    ]);
    
    constructor(canvas: HTMLCanvasElement, adapter: GPUAdapter, device: GPUDevice, context: GPUCanvasContext) {
        this.canvas = canvas
        this.adapter = adapter
        this.device = device
        this.context = context
        
        this.vertexBuffer = device.createBuffer({
            label: "Cell vertices",
            size: this.vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        
        this.cellShaderModule = device.createShaderModule({
            label: "Cell shader",
            code: `
            @vertex
            fn vertexMain(@location(0) pos: vec2f) ->
            @builtin(position) vec4f {
                return vec4f(pos, 0, 1);
            }
            
            @fragment
            fn fragmentMain() -> @location(0) vec4f {
                return vec4f(1, 0, 0, 1);
            }
            `
        });
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
    
    render(clearColor: GPUColor = { r: 0, g: 0, b: 0.4, a: 1 }) {
        
        this.device.queue.writeBuffer(this.vertexBuffer, 0, this.vertices);
        
        const vertexBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 8,
            attributes: [{
                format: "float32x2",
                offset: 0,
                shaderLocation: 0, // Position, see vertex shader
            }],
        };
        
        const cellPipeline = this.device.createRenderPipeline({
            label: "Cell pipeline",
            layout: "auto",
            vertex: {
                module: this.cellShaderModule,
                entryPoint: "vertexMain",
                buffers: [
                    vertexBufferLayout
                ]
            },
            fragment: {
                module: this.cellShaderModule,
                entryPoint: "fragmentMain",
                targets: [{
                    format: navigator.gpu.getPreferredCanvasFormat()
                }]
            }
        });

        const encoder = this.device.createCommandEncoder();
        
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: clearColor,
                storeOp: "store",
            }]
        });

        pass.setPipeline(cellPipeline);
        pass.setVertexBuffer(0, this.vertexBuffer);
        pass.draw(this.vertices.length / 2); // 6 vertices
        
        pass.end();
        
        this.device.queue.submit([encoder.finish()]);
    }
}