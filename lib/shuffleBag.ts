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

  /**
   * Draw the next item. With `eligible`, skip past anything that doesn't
   * qualify right now — it stays in the bag for a later draw, so the
   * no-repeats promise still holds for everything else.
   */
  draw(eligible?: (item: T) => boolean): T {
    if (this.bag.length === 0) this.refill();
    if (!eligible) return this.bag.pop()!;

    for (let i = this.bag.length - 1; i >= 0; i--) {
      if (eligible(this.bag[i])) return this.bag.splice(i, 1)[0];
    }
    // Nothing left in the bag qualifies. If the bag is only ineligible
    // leftovers, start a fresh round and try once more.
    if (this.bag.length < this.pool.length) {
      const leftovers = this.bag;
      this.refill();
      // Keep the leftovers' "not yet played" status by moving them to the top.
      this.bag = [...this.bag.filter((x) => !leftovers.includes(x)), ...leftovers];
      for (let i = this.bag.length - 1; i >= 0; i--) {
        if (eligible(this.bag[i])) return this.bag.splice(i, 1)[0];
      }
    }
    // The whole pool is ineligible; play something rather than nothing.
    return this.bag.pop()!;
  }

  getRemaining(): T[] {
    return [...this.bag];
  }
}
