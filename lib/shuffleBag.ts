export class ShuffleBag<T> {
  private bag: T[] = [];
  private pool: T[];

  constructor(items: T[], initialBag?: T[]) {
    this.pool = [...items];
    if (initialBag && initialBag.length > 0) {
      this.bag = [...initialBag];
    } else {
      this.refill();
    }
  }

  private refill() {
    this.bag = [...this.pool];
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }

  draw(): T {
    if (this.bag.length === 0) this.refill();
    return this.bag.pop()!;
  }

  getRemaining(): T[] {
    return [...this.bag];
  }
}
