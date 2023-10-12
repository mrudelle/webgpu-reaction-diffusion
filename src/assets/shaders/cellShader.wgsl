
struct Uniforms {
    delta_time: f32,
    diffuse_rate_u: f32,
    diffuse_rate_v: f32,
    feed_rate: f32,
    kill_rate: f32,
    grid: vec2f,
}

@group(0) @binding(0) var<uniform> params: Uniforms;
@group(0) @binding(1) var<storage> chemUState: array<f32>;
@group(0) @binding(3) var<storage> chemVState: array<f32>;


struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(0) fragUV : vec2<f32>,
};

fn cellIndex(cell: vec2u) -> u32 {
  return (cell.y % u32(params.grid.y)) * u32(params.grid.x) +
         (cell.x % u32(params.grid.x));
}

fn cellActive(x: u32, y: u32) -> f32 {
  return chemVState[cellIndex(vec2(x, y))];
}


@vertex
fn vertexMain(
    @location(0) pos: vec2f
) -> VertexOutput {
    var output: VertexOutput;
    output.pos = vec4f(pos, 0, 1);
    output.fragUV = (pos.xy + 1) / 2;
    return output;
}

@fragment
fn fragmentMain(
    input: VertexOutput
) -> @location(0) vec4f {
    let cell = input.fragUV * params.grid;
    let ca = cellActive(u32(cell.x), u32(cell.y));
    return vec4f(vec3f(input.fragUV, 1-input.fragUV.x) * ca, 1);
}