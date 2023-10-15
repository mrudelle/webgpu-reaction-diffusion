import { createNoise2D } from 'simplex-noise';
import shaderString from '../assets/shaders/cellShader.wgsl?raw'
import simulationShaderString from '../assets/shaders/simulationShader.wgsl?raw'

const GRID_SIZE = 512;
const WORKGROUP_SIZE = 8;
const MAX_UPDATE_MS = 100;

interface Uniforms {
    deltaTime: number
    diffuseRateU: number
    diffuseRateV: number
    feedRate: number
    killRate: number
}

export default class ReactionDiffusionModel {
    
    canvas: HTMLCanvasElement
    adapter: GPUAdapter
    device: GPUDevice
    context: GPUCanvasContext
    
    vertexBuffer: GPUBuffer
    cellShaderModule: GPUShaderModule
    simulationShaderModule: GPUShaderModule
    uniformBuffer: GPUBuffer
    chemicalUStorage: GPUBuffer[]
    chemicalVStorage: GPUBuffer[]

    cellPipeline: GPURenderPipeline
    simulationPipeline: GPUComputePipeline
    bindGroups: GPUBindGroup[]

    uniforms: Uniforms

    step = 0
    
    vertices = new Float32Array([
        //   X,    Y,
        -1.0, -1.0, // Triangle 1 (Blue)
        1.0, -1.0,
        1.0,  1.0,
        
        -1.0, -1.0, // Triangle 2 (Red)
        1.0,  1.0,
        -1.0,  1.0,
    ]);
    nextAnimationFrame: number = 0;
    lastRenderMs: number = 0;

    speed = 30
    
    constructor(canvas: HTMLCanvasElement, adapter: GPUAdapter, device: GPUDevice, context: GPUCanvasContext) {
        this.canvas = canvas
        this.adapter = adapter
        this.device = device
        this.context = context

        this.uniforms = {
            deltaTime: 0.3,
            diffuseRateU: 1.0,
            diffuseRateV: 0.2,
            feedRate: 0.07,
            killRate: 0.02,
        }

        this.lastRenderMs = performance.now()
        
        this.vertexBuffer = device.createBuffer({
            label: "Cell vertices",
            size: this.vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        
        this.cellShaderModule = device.createShaderModule({
            label: "Cell shader",
            code: shaderString
        });

        this.simulationShaderModule = device.createShaderModule({
            label: "Game of Life simulation shader",
            code: simulationShaderString.replaceAll('WORKGROUP_SIZE', `${WORKGROUP_SIZE}`)
        });
        this.uniformBuffer = device.createBuffer({
            label: "Uniforms",
            size: this.packUniforms().byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });


        const chemicalBuffers = (chemicalName: string, initialFeed: number) => {
            const initialBufferValues = new Float32Array(GRID_SIZE * GRID_SIZE);

            const chemicalStorage = [
                device.createBuffer({
                    label: `Chemical ${chemicalName} State A`,
                    size: initialBufferValues.byteLength,
                    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
                }),
                device.createBuffer({
                    label: `Chemical ${chemicalName} State B`,
                    size: initialBufferValues.byteLength,
                    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
                })
            ];

            return chemicalStorage
        }

        this.chemicalUStorage = chemicalBuffers('u', 1)
        this.chemicalVStorage = chemicalBuffers('v', .2)

        this.resetChemicals()

        this.device.queue.writeBuffer(this.vertexBuffer, 0, this.vertices);
        this.device.queue.writeBuffer(this.uniformBuffer, 0, this.packUniforms());

        const vertexBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 8,
            attributes: [{
                format: "float32x2",
                offset: 0,
                shaderLocation: 0, // Position, see vertex shader
            }],
        };

        const bindGroupLayout = this.device.createBindGroupLayout({
            label: "Cell Bind Group Layout",
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                buffer: {} // Uniform buffer
            }, {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                buffer: { type: "read-only-storage"} // Chemical u state input buffer
            }, {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage"} // Chemical u state output buffer
            }, {
                binding: 3,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                buffer: { type: "read-only-storage"} // Chemical v state input buffer
            }, {
                binding: 4,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage"} // Chemical v state output buffer
            },]
        });
        
        this.bindGroups = [
            this.device.createBindGroup({
                label: "Cell renderer bind group A",
                layout: bindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: this.uniformBuffer }
                }, {
                    binding: 1,
                    resource: { buffer: this.chemicalUStorage[0] }
                }, {
                    binding: 2,
                    resource: { buffer: this.chemicalUStorage[1] }
                }, {
                    binding: 3,
                    resource: { buffer: this.chemicalVStorage[0] }
                }, {
                    binding: 4,
                    resource: { buffer: this.chemicalVStorage[1] }
                }],
            }),
            this.device.createBindGroup({
                label: "Cell renderer bind group B",
                layout: bindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: this.uniformBuffer }
                }, {
                    binding: 1,
                    resource: { buffer: this.chemicalUStorage[1] }
                }, {
                    binding: 2,
                    resource: { buffer: this.chemicalUStorage[0] }
                }, {
                    binding: 3,
                    resource: { buffer: this.chemicalVStorage[1] }
                }, {
                    binding: 4,
                    resource: { buffer: this.chemicalVStorage[0] }
                }],
            })
        ];

        const pipelineLayout = device.createPipelineLayout({
            label: "Cell Pipeline Layout",
            bindGroupLayouts: [ bindGroupLayout ],
        });

        this.cellPipeline = this.device.createRenderPipeline({
            label: "Cell pipeline",
            layout: pipelineLayout,
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

        this.simulationPipeline = device.createComputePipeline({
            label: "Simulation pipeline",
            layout: pipelineLayout,
            compute: {
              module: this.simulationShaderModule,
              entryPoint: "computeMain",
            }
        });
    }

    packUniforms() {
        return new Float32Array([
            this.uniforms.deltaTime,
            this.uniforms.diffuseRateU,
            this.uniforms.diffuseRateV,
            this.uniforms.feedRate,
            this.uniforms.killRate,
            0, // vec2f needs to be padded at the 64 bits mark
            ...[GRID_SIZE, GRID_SIZE],
        ])
    }

    resetChemicals() {

        const U_START_RATIO = 1
        const V_START_RATIO = 1
        const NOISE_SCALE = 2^16

        const noise2D = createNoise2D();
        const noiseFn = (x: number, y: number) => 
            noise2D(x / NOISE_SCALE, y / NOISE_SCALE) / 2 + .5

        const stats = (temp1: Float32Array) => {
            const avg = temp1.reduce((a, b) => a + b, 0) / temp1.length;
            const min = temp1.reduce((a, b) => Math.min(a,b), 0);
            const max = temp1.reduce((a, b) => Math.max(a,b), 0);
            console.log(`Avg: ${avg}, [${min}, ${max}]`)
        }
        
        const gridIndex = (i: number): [number, number] => [
            i % GRID_SIZE,
            Math.floor(i / GRID_SIZE),
        ]
        
        const initialBufferValues = new Float32Array(GRID_SIZE * GRID_SIZE);


        for (let i = 0; i < initialBufferValues.length; i++) {
            initialBufferValues[i] = noiseFn(...gridIndex(i)) * U_START_RATIO;
        }
        stats(initialBufferValues)

        this.device.queue.writeBuffer(this.chemicalUStorage[0], 0, initialBufferValues);

        for (let i = 0; i < initialBufferValues.length; i++) {
            initialBufferValues[i] = noiseFn(...gridIndex(i)) * V_START_RATIO;
        }
        stats(initialBufferValues)

        this.device.queue.writeBuffer(this.chemicalVStorage[0], 0, initialBufferValues);

        this.step += this.step % 2
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

    start() {
        this.lastRenderMs = performance.now() - MAX_UPDATE_MS / 2
        this.nextFrame(performance.now());
    }

    nextFrame(renderMs: number) {
        this.render(Math.min(MAX_UPDATE_MS, renderMs - this.lastRenderMs));
        this.lastRenderMs = renderMs
        this.nextAnimationFrame = requestAnimationFrame(this.nextFrame.bind(this));
    }

    stop() {
        cancelAnimationFrame(this.nextAnimationFrame)
    }
    
    render(deltaTimeMs: number, clearColor: GPUColor = { r: 0, g: 0, b: 0.4, a: 1 }) {
        this.uniforms.deltaTime = deltaTimeMs / 1000 * this.speed;

        this.device.queue.writeBuffer(this.uniformBuffer, 0, this.packUniforms());

        const encoder = this.device.createCommandEncoder();

        const computePass = encoder.beginComputePass();

        computePass.setPipeline(this.simulationPipeline);
        computePass.setBindGroup(0, this.bindGroups[this.step % 2]);
        const workgroupCount = Math.ceil(GRID_SIZE / WORKGROUP_SIZE);
        computePass.dispatchWorkgroups(workgroupCount, workgroupCount);

        computePass.end();

        this.step++;
        
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: clearColor,
                storeOp: "store",
            }]
        });
        
        pass.setPipeline(this.cellPipeline);
        pass.setVertexBuffer(0, this.vertexBuffer);
        pass.setBindGroup(0, this.bindGroups[this.step % 2]); 
        pass.draw(this.vertices.length / 2); // 6 vertices
        
        pass.end();

        this.device.queue.submit([encoder.finish()]);
    }
}