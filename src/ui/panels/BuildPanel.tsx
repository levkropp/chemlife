import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getAllBuildingDefs } from '../../data/buildings';
import { BuildingTypeId } from '../../types';
import { formatMoney } from '../../utils/chemistry';

const base = import.meta.env.BASE_URL;

// Machine overlay textures (drawn on top of the steel casing)
const MACHINE_OVERLAY: Partial<Record<BuildingTypeId, string>> = {
  hot_plate:        `${base}textures/machines/electric_oven.png`,
  reaction_vessel:  `${base}textures/machines/chemical_reactor.png`,
  distillation_kit: `${base}textures/machines/distillery.png`,
  storage_cabinet:  `${base}textures/machines/storage_cabinet.png`,
  fume_hood:        `${base}textures/machines/mixer.png`,
};

const CASING_URL = `${base}textures/machines/casing_steel.png`;

function BuildingIcon({ typeId, accentColor }: { typeId: BuildingTypeId; accentColor: string }) {
  const overlay = MACHINE_OVERLAY[typeId];
  return (
    <div className="build-icon-wrap">
      {/* Casing base */}
      <div className="build-icon-layer" style={{ backgroundImage: `url(${CASING_URL})` }} />
      {/* Machine overlay */}
      {overlay
        ? <div className="build-icon-layer" style={{ backgroundImage: `url(${overlay})` }} />
        : <div className="build-icon-layer" style={{ background: accentColor, opacity: 0.6 }} />
      }
    </div>
  );
}

export function BuildPanel() {
  const store = useGameStore();
  const { player, buildings, pendingPlacement } = store;
  const [selectedType, setSelectedType] = useState<BuildingTypeId | null>(null);

  const allDefs = getAllBuildingDefs();

  function handlePlace() {
    if (!selectedType) return;
    store.setPendingPlacement(selectedType);
  }

  function handleCancel() {
    store.setPendingPlacement(null);
    setSelectedType(null);
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">🏗 Build</span>
      </div>

      <div className="panel-content">
        {pendingPlacement ? (
          <div className="placement-mode-bar">
            <span>
              Hover over the map and click to place{' '}
              <strong>{allDefs.find(d => d.id === pendingPlacement)?.name}</strong>
            </span>
            <button className="btn-secondary" onClick={handleCancel}>Cancel [Esc]</button>
          </div>
        ) : (
          <p className="muted small">Select a building below, then click Place to drop it on the map.</p>
        )}

        <div className="building-grid">
          {allDefs.map(def => {
            const canAfford = player.money >= def.priceUsd;
            const isSelected = selectedType === def.id;
            const isPending  = pendingPlacement === def.id;
            return (
              <div
                key={def.id}
                className={`building-card ${isSelected || isPending ? 'selected' : ''} ${!canAfford ? 'unaffordable' : ''}`}
                onClick={() => canAfford && !pendingPlacement && setSelectedType(def.id as BuildingTypeId)}
              >
                <BuildingIcon typeId={def.id as BuildingTypeId} accentColor={def.accentColor} />
                <div className="building-info">
                  <div className="building-name">{def.name}</div>
                  <div className="building-price">{formatMoney(def.priceUsd)}</div>
                  <div className="building-size muted">
                    {def.tileWidth}×{def.tileHeight}
                    {' · '}
                    {[def.canPlaceIndoor && 'indoor', def.canPlaceOutdoor && 'outdoor']
                      .filter(Boolean).join(' / ')}
                  </div>
                  <div className="building-desc muted small">{def.description}</div>
                </div>
              </div>
            );
          })}
        </div>

        {selectedType && !pendingPlacement && (
          <div className="btn-row" style={{ marginTop: 8 }}>
            <button
              className="btn-primary"
              onClick={handlePlace}
              disabled={!allDefs.find(d => d.id === selectedType) || player.money < (allDefs.find(d => d.id === selectedType)?.priceUsd ?? 0)}
            >
              Place on map ({formatMoney(allDefs.find(d => d.id === selectedType)?.priceUsd ?? 0)})
            </button>
            <button className="btn-secondary" onClick={() => setSelectedType(null)}>
              Deselect
            </button>
          </div>
        )}

        {buildings.length > 0 && (
          <>
            <h4 className="section-label" style={{ marginTop: 12 }}>Placed Buildings</h4>
            {buildings.map(b => {
              const def = allDefs.find(d => d.id === b.typeId)!;
              return (
                <div key={b.id} className="placed-building-row">
                  <div className="building-dot" style={{ background: def?.accentColor }} />
                  <span>{def?.name}</span>
                  <span className="muted">({b.tileX}, {b.tileY})</span>
                  <button
                    className="btn-danger-sm"
                    onClick={() => store.removeBuilding(b.id)}
                    title="Remove (no refund)"
                  >✕</button>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
