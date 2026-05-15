import { PhaserGame } from './game/PhaserGame';
import { useGameStore } from './store/gameStore';
import { HUD } from './ui/HUD';
import { DraggableWindow } from './ui/DraggableWindow';
import { ChemBayPanel } from './ui/panels/ChemBayPanel';
import { InventoryPanel } from './ui/panels/InventoryPanel';
import { BuildPanel } from './ui/panels/BuildPanel';
import { BuildingPanel } from './ui/panels/BuildingPanel';
import { TutorialWindow } from './ui/TutorialWindow';
import type { PanelId } from './types';

const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;

const PANEL_META: Record<PanelId, { title: string; icon: string; defaultX: number; defaultY: number; width?: number }> = {
  chembay:   { title: 'ChemBay Marketplace', icon: '🏪', defaultX: 60,           defaultY: 60,  width: 480 },
  inventory: { title: 'Inventory',           icon: '🧪', defaultX: 120,          defaultY: 80,  width: 420 },
  build:     { title: 'Build Menu',          icon: '🔧', defaultX: 180,          defaultY: 100, width: 400 },
  tutorial:  { title: 'Tutorial',            icon: '📖', defaultX: vw - 388,     defaultY: 60,  width: 360 },
  building:  { title: 'Building',            icon: '⚗',  defaultX: 80,           defaultY: 120, width: 440 },
};

function PanelContent({ panelId }: { panelId: PanelId }) {
  switch (panelId) {
    case 'chembay':   return <ChemBayPanel />;
    case 'inventory': return <InventoryPanel />;
    case 'build':     return <BuildPanel />;
    case 'tutorial':  return <TutorialWindow />;
    case 'building':  return <BuildingPanel />;
  }
}

export default function App() {
  const store = useGameStore();
  const { openWindows } = store;

  return (
    <div className="app">
      <PhaserGame />
      <HUD />

      {openWindows.map((panelId, i) => {
        const meta = PANEL_META[panelId];
        return (
          <DraggableWindow
            key={panelId}
            panelId={panelId}
            title={meta.title}
            icon={meta.icon}
            defaultX={meta.defaultX}
            defaultY={meta.defaultY}
            width={meta.width}
            zIndex={200 + i}
            onClose={() => store.closeWindow(panelId)}
            onFocus={() => store.bringToFront(panelId)}
          >
            <PanelContent panelId={panelId} />
          </DraggableWindow>
        );
      })}
    </div>
  );
}
