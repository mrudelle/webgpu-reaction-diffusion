import shaderString from '../assets/shaders/cellShader.wgsl?raw'

const GRID_SIZE = 32;

export default class ReactionDiffusionModel {
    
    canvas: HTMLCanvasElement
    adapter: GPUAdapter
    device: GPUDevice
    context: GPUCanvasContext
    
    vertexBuffer: GPUBuffer
    cellShaderModule: GPUShaderModule
    uniformArray: Float32Array
    uniformBuffer: GPUBuffer
    
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
            code: shaderString
        });

        this.uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
        this.uniformBuffer = device.createBuffer({
            label: "Grid Uniforms",
            size: this.uniformArray.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
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
        this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformArray);
        
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

        const bindGroup = this.device.createBindGroup({
            label: "Cell renderer bind group",
            layout: cellPipeline.getBindGroupLayout(0),
            entries: [{
              binding: 0,
              resource: { buffer: this.uniformBuffer }
            }],
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
        pass.setBindGroup(0, bindGroup); 
        pass.draw(this.vertices.length / 2, GRID_SIZE * GRID_SIZE); // 6 vertices
        
        pass.end();
        
        this.device.queue.submit([encoder.finish()]);
    }
}