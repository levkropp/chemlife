import { useEffect, useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SD: any = null;
async function getSD() {
  if (!SD) SD = await import('smiles-drawer');
  return SD;
}

interface Props {
  smiles: string;
  width?: number;
  height?: number;
}

export function MoleculeCanvas({ smiles, width = 100, height = 80 }: Props) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!divRef.current || !smiles) return;
    let cancelled = false;

    getSD().then((sd: any) => {
      if (cancelled || !divRef.current) return;
      const drawer = new sd.default.SvgDrawer({
        width,
        height,
        bondThickness: 1.2,
        bondLength: 20,
        terminalCarbons: false,
        explicitHydrogens: false,
      });
      sd.default.parse(
        smiles,
        (tree: unknown) => {
          if (cancelled || !divRef.current) return;
          try {
            const svgEl = drawer.draw(tree, null, 'dark', null, false);
            if (svgEl && divRef.current) {
              svgEl.setAttribute('width', String(width));
              svgEl.setAttribute('height', String(height));
              divRef.current.innerHTML = '';
              divRef.current.appendChild(svgEl);
            }
          } catch {
            // Draw error — leave blank
          }
        },
        () => {
          // Parse error — leave blank
        }
      );
    });

    return () => { cancelled = true; };
  }, [smiles, width, height]);

  if (!smiles) return null;

  return (
    <div
      ref={divRef}
      className="molecule-svg"
      style={{ width, height, flexShrink: 0 }}
      title={smiles}
    />
  );
}
