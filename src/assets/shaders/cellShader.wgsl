@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<storage> cellState: array<u32>;


struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(0) fragUV : vec2<f32>,
};

fn cellIndex(cell: vec2u) -> u32 {
  return (cell.y % u32(grid.y)) * u32(grid.x) +
         (cell.x % u32(grid.x));
}

fn cellActive(x: u32, y: u32) -> u32 {
  return cellState[cellIndex(vec2(x, y))];
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
    let cell = input.fragUV * grid;
    let ca = cellActive(u32(cell.x), u32(cell.y));
    return vec4f(vec3f(input.fragUV, 1-input.fragUV.x) * f32(ca), 1);
}