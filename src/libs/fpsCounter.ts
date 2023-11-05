
const STAT_FREQUENCY = 1000

export class FPSCounter {

    frames: number[] = []

    tick() {
        const t = performance.now()
        this.frames.push(t)
        this.maybeStat(t)
    }

    maybeStat(t: number) {
        if (this.frames.length > 0 && t - this.frames[0] >= STAT_FREQUENCY) {
            const fps = (this.frames.length - 1) / (t - this.frames[0]) * 1000
            console.log(`FPS: ${fps}`)
            
            this.frames = []
        }
    }
}