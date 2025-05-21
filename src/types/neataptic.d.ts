/**
 * Type declaration for neataptic library
 */
declare module 'neataptic' {
  export class Neat {
    constructor(inputs: number, outputs: number, fitness: Function | null, options: any);
    population: any[];
    sort(): void;
    evolve(): void;
  }

  export namespace methods {
    export namespace mutation {
      export const ADD_NODE: string;
      export const SUB_NODE: string;
      export const ADD_CONN: string;
      export const SUB_CONN: string;
      export const MOD_WEIGHT: string;
      export const MOD_BIAS: string;
      export const MOD_ACTIVATION: string;
    }
  }
} 