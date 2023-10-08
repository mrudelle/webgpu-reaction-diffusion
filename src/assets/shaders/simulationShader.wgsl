@group(0) @binding(0) var<uniform> grid: vec2f;

@group(0) @binding(1) var<storage> cellStateIn: array<u32>;
@group(0) @binding(2) var<storage, read_write> cellStateOut: array<u32>;

fn cellIndex(cell: vec2u) -> u32 {
  return cell.y * u32(grid.x) + cell.x;
}

@compute
@workgroup_size(WORKGROUP_SIZE, WORKGROUP_SIZE)
fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
    if (cellStateIn[cellIndex(cell.xy)] == 1) {
        cellStateOut[cellIndex(cell.xy)] = 0;
    } else {
        cellStateOut[cellIndex(cell.xy)] = 1;
    }
}