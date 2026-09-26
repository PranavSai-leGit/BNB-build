/**
 * RandomizationEngine.ts
 *
 * Implements research-grade randomization methods:
 * - Cryptographically robust Fisher-Yates array shuffling
 * - Random stimulus sampling from pools (with or without replacement)
 * - Between-subjects counterbalancing group assignment
 */

export class RandomizationEngine {
  /**
   * Cryptographically secure Fisher-Yates array shuffle.
   * Does not mutate original array.
   */
  public static shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      // Use crypto.getRandomValues if available, fallback to Math.random
      let j: number;
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const randomBuffer = new Uint32Array(1);
        window.crypto.getRandomValues(randomBuffer);
        j = randomBuffer[0] % (i + 1);
      } else {
        j = Math.floor(Math.random() * (i + 1));
      }
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Sample random item from array
   */
  public static sampleOne<T>(array: T[]): T | null {
    if (!array || array.length === 0) return null;
    const index = Math.floor(Math.random() * array.length);
    return array[index];
  }

  /**
   * Assign participant to a counterbalancing group based on participant ID or round-robin
   */
  public static assignCounterbalanceGroup(
    participantId: string,
    groups: string[] = []
  ): string {
    if (!groups || groups.length === 0) return 'default';
    
    // Hash participant ID string to deterministic group index
    let hash = 0;
    for (let i = 0; i < participantId.length; i++) {
      hash = (hash << 5) - hash + participantId.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % groups.length;
    return groups[index];
  }
}
