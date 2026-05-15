declare module 'smiles-drawer' {
  interface DrawerOptions {
    width?: number;
    height?: number;
    bondThickness?: number;
    bondLength?: number;
    terminalCarbons?: boolean;
    explicitHydrogens?: boolean;
    [key: string]: unknown;
  }

  export class SvgDrawer {
    constructor(options?: DrawerOptions);
    draw(tree: unknown, target: SVGElement | null, theme?: string, weights?: null, infoOnly?: boolean): SVGElement;
  }

  export class Drawer {
    constructor(options?: DrawerOptions);
    draw(tree: unknown, target: HTMLCanvasElement | string, theme?: string, infoOnly?: boolean): void;
  }

  export function parse(
    smiles: string,
    successCallback: (tree: unknown) => void,
    errorCallback?: (err: unknown) => void
  ): void;

  interface SmilesDrawerNS {
    SvgDrawer: typeof SvgDrawer;
    Drawer: typeof Drawer;
    parse: typeof parse;
  }

  const ns: SmilesDrawerNS;
  export default ns;
}
