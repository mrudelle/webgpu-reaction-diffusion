@group(0) @binding(0) var<uniform> grid: vec2f;

@group(0) @binding(1) var<storage> chemUIn: array<f32>;
@group(0) @binding(2) var<storage, read_write> chemUOut: array<f32>;
@group(0) @binding(3) var<storage> chemVIn: array<f32>;
@group(0) @binding(4) var<storage, read_write> chemVOut: array<f32>;

fn cellIndex(cell: vec2u) -> u32 {
  return (cell.y % u32(grid.y)) * u32(grid.x) +
         (cell.x % u32(grid.x));
}

fn cellActive(x: u32, y: u32) -> f32 {
  return chemUIn[cellIndex(vec2(x, y))];
}

@compute
@workgroup_size(WORKGROUP_SIZE, WORKGROUP_SIZE)
fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
    let activeNeighbors = cellActive(cell.x+1, cell.y+1) +
                        cellActive(cell.x+1, cell.y) +
                        cellActive(cell.x+1, cell.y-1) +
                        cellActive(cell.x, cell.y-1) +
                        cellActive(cell.x-1, cell.y-1) +
                        cellActive(cell.x-1, cell.y) +
                        cellActive(cell.x-1, cell.y+1) +
                        cellActive(cell.x, cell.y+1);

    let i = cellIndex(cell.xy);

    // Conway's game of life rules:
    if (abs(activeNeighbors - 3) < 0.1) {
        // Cells with 3 neighbors become or stay active.
        chemUOut[i] = 1;
    } else if (abs(activeNeighbors - 2) < 0.1) {
        // Active cells with 2 neighbors stay active.
        chemUOut[i] = chemUIn[i];
    } else {
        // Cells with < 2 or > 3 neighbors become inactive.
        chemUOut[i] = 0;
    }

}