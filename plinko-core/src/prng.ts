export class XorShift32 {
  private state: number;
  constructor(seed: number) {
    if (seed === 0) seed = 0x1;
    this.state = seed >>> 0;
  }
  nextU32(): number {
    let x = this.state >>> 0;
    x ^= (x << 13) >>> 0;
    x ^= (x >>> 17) >>> 0;
    x ^= (x << 5) >>> 0;
    this.state = x >>> 0;
    return this.state;
  }
  rand(): number {
    return this.nextU32() / 0x100000000; // [0,1)
  }
}
