@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<storage> cellState: array<u32>;

@vertex
fn vertexMain(
    @location(0) pos: vec2f,
    @builtin(instance_index) instance: u32
) -> @builtin(position) vec4f {

    let i = f32(instance);

    let cell = vec2f(i % grid.x, floor(i / grid.y)); // Cell(1,1) in the image above
    let cellOffset = cell / grid * 2; // Compute the offset to cell

    let state = f32(cellState[instance]);
    let gridPos = (state * pos + 1) / grid - 1 + cellOffset;

    return vec4f(gridPos, 0, 1);
}

@fragment
fn fragmentMain() -> @location(0) vec4f {
    return vec4f(.4, .7, .1, 1);
}