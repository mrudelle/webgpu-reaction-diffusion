@group(0) @binding(0) var<uniform> grid: vec2f;

@group(0) @binding(1) var<storage> chemUIn: array<f32>;
@group(0) @binding(2) var<storage, read_write> chemUOut: array<f32>;
@group(0) @binding(3) var<storage> chemVIn: array<f32>;
@group(0) @binding(4) var<storage, read_write> chemVOut: array<f32>;

struct Uniforms {
    delta_time: f32,
    diffuse_rate_u: f32,
    diffuse_rate_v: f32,
    feed_rate: f32,
    kill_rate: f32,
}

@group(0) @binding(5) var<uniform> params: Uniforms;

fn cellIndex(cell: vec2u) -> u32 {
    return (cell.y % u32(grid.y)) * u32(grid.x) +
           (cell.x % u32(grid.x));
}

fn laplaceU(cell: vec2u) -> f32 {
    return 
        chemUIn[cellIndex(vec2u(cell.x - 1, cell.y + 1))] * 0.05 +
        chemUIn[cellIndex(vec2u(cell.x    , cell.y + 1))] * 0.20 +
        chemUIn[cellIndex(vec2u(cell.x + 1, cell.y + 1))] * 0.05 +
        chemUIn[cellIndex(vec2u(cell.x - 1, cell.y    ))] * 0.20 -
        chemUIn[cellIndex(vec2u(cell.x    , cell.y    ))] * 1.0 +
        chemUIn[cellIndex(vec2u(cell.x + 1, cell.y    ))] * 0.20 +
        chemUIn[cellIndex(vec2u(cell.x - 1, cell.y - 1))] * 0.05 +
        chemUIn[cellIndex(vec2u(cell.x    , cell.y - 1))] * 0.20 +
        chemUIn[cellIndex(vec2u(cell.x + 1, cell.y - 1))] * 0.05;
}

fn laplaceV(cell: vec2u) -> f32 {
    return 
        chemVIn[cellIndex(vec2u(cell.x - 1, cell.y + 1))] * 0.05 +
        chemVIn[cellIndex(vec2u(cell.x    , cell.y + 1))] * 0.20 +
        chemVIn[cellIndex(vec2u(cell.x + 1, cell.y + 1))] * 0.05 +
        chemVIn[cellIndex(vec2u(cell.x - 1, cell.y    ))] * 0.20 -
        chemVIn[cellIndex(vec2u(cell.x    , cell.y    ))] * 1.0 +
        chemVIn[cellIndex(vec2u(cell.x + 1, cell.y    ))] * 0.20 +
        chemVIn[cellIndex(vec2u(cell.x - 1, cell.y - 1))] * 0.05 +
        chemVIn[cellIndex(vec2u(cell.x    , cell.y - 1))] * 0.20 +
        chemVIn[cellIndex(vec2u(cell.x + 1, cell.y - 1))] * 0.05;
}

@compute
@workgroup_size(WORKGROUP_SIZE, WORKGROUP_SIZE)
fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
    let dt = params.delta_time;
    let ru = params.diffuse_rate_u;
    let rv = params.diffuse_rate_v;
    let f = params.feed_rate;
    let k = params.kill_rate;

    let i = cellIndex(cell.xy);

    let u = chemUIn[i];
    let v = chemVIn[i];

    // Gray Scott Model iteration
    chemUOut[i] = u + dt * (ru * laplaceU(cell.xy) - u * v * v + f * (1 - u));
    chemVOut[i] = v + dt * (rv * laplaceV(cell.xy) + u * v * v - (f + k) * v);

}