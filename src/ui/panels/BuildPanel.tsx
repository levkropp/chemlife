import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getAllBuildingDefs } from '../../data/buildings';
import { TILE_MAP, MAP_COLS, MAP_ROWS } from '../../game/constants';
import { BuildingTypeId } from '../../types';
import { formatMoney } from '../../utils/chemistry';

const base = import.meta.env.BASE_URL;
const BUILDING_TEXTURES: Partial<Record<BuildingTypeId, string>> = {
  hot_plate:        `${base}textures/machines/electric_oven.png`,
  reaction_vessel:  `${base}textures/machines/chemical_reactor.png`,
  distillation_kit: `${base}textures/machines/distillery.png`,
  storage_cabinet:  `${base}textures/machines/storage_cabinet.png`,
  fume_hood:        `${base}textures/machines/mixer.png`,
};

export function BuildPanel() {
  const store = useGameStore();
  const { player, buildings, gameTime } = store;
  const [selectedType, setSelectedType] = useState<BuildingTypeId | null>(null);
  const [tileX, setTileX] = useState('');
  const [tileY, setTileY] = useState('');
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  const allDefs = getAllBuildingDefs();

  function msg(text: string, ok: boolean) {
    setFeedback({ msg: text, ok });
    setTimeout(() => setFeedback(null), 3000);
  }

  // Suggest a tile near the player
  const playerTileX = Math.floor(store.player.pixelX / 48);
  const playerTileY = Math.floor(store.player.pixelY / 48);

  function handlePlace() {
    if (!selectedType) return msg('Select a building type', false);
    const x = parseInt(tileX);
    const y = parseInt(tileY);
    if (isNaN(x) || isNaN(y)) return msg('Enter valid tile coordinates', false);

    const id = store.placeBuilding(selectedType, x, y);
    if (id) {
      msg(`Placed! Building ID: ${id.slice(0, 8)}`, true);
      setSelectedType(null);
      setTileX('');
      setTileY('');
    } else {
      msg('Cannot place here. Check: tile is walkable, not occupied, correct indoor/outdoor rule, and you have enough funds.', false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">🏗 Build</span>
      </div>

      <div className="panel-content">
        {feedback && (
          <div className={`feedback-bar ${feedback.ok ? 'ok' : 'err'}`}>{feedback.msg}</div>
        )}

        <p className="muted small">
          Select a building, enter tile coordinates, and click Place.
          Your player is at tile ({playerTileX}, {playerTileY}).
          Buildings bought from ChemBay are placed instantly.
        </p>

        <div className="building-grid">
          {allDefs.map(def => {
            const canAfford = player.money >= def.priceUsd;
            return (
              <div
                key={def.id}
                className={`building-card ${selectedType === def.id ? 'selected' : ''} ${!canAfford ? 'unaffordable' : ''}`}
                onClick={() => canAfford && setSelectedType(def.id as BuildingTypeId)}
              >
                <div
                  className="building-icon-tex"
                  style={{ backgroundImage: `url(${BUILDING_TEXTURES[def.id as BuildingTypeId] ?? ''})`, background: BUILDING_TEXTURES[def.id as BuildingTypeId] ? undefined : def.accentColor }}
                  title={def.shortLabel}
                />
                <div className="building-info">
                  <div className="building-name">{def.name}</div>
                  <div className="building-price">{formatMoney(def.priceUsd)}</div>
                  <div className="building-size muted">
                    {def.tileWidth}×{def.tileHeight} tile{def.tileWidth * def.tileHeight > 1 ? 's' : ''}
                    {' · '}
                    {[
                      def.canPlaceIndoor ? 'indoor' : null,
                      def.canPlaceOutdoor ? 'outdoor' : null,
                    ]
                      .filter(Boolean)
                      .join(' / ')}
                  </div>
                  <div className="building-desc muted small">{def.description}</div>
                </div>
              </div>
            );
          })}
        </div>

        {selectedType && (
          <div className="place-form">
            <h4 className="section-label">
              Place: {allDefs.find(d => d.id === selectedType)?.name}
            </h4>
            <div className="form-row">
              <label>Tile X (col)</label>
              <input
                className="input"
                type="number"
                min="1"
                max={MAP_COLS - 2}
                placeholder={String(playerTileX)}
                value={tileX}
                onChange={e => setTileX(e.target.value)}
              />
            </div>
            <div className="form-row">
              <label>Tile Y (row)</label>
              <input
                className="input"
                type="number"
                min="1"
                max={MAP_ROWS - 2}
                placeholder={String(playerTileY + 1)}
                value={tileY}
                onChange={e => setTileY(e.target.value)}
              />
            </div>
            <p className="muted small">
              Tip: outdoor tiles are rows 1–3, 9–12 and cols 1–3, 9–12 (outside the house). Indoor: cols 5–7, rows 5–7.
            </p>
            <div className="btn-row">
              <button className="btn-primary" onClick={handlePlace}>
                Place ({formatMoney(allDefs.find(d => d.id === selectedType)?.priceUsd ?? 0)})
              </button>
              <button className="btn-secondary" onClick={() => setSelectedType(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {buildings.length > 0 && (
          <>
            <h4 className="section-label">Placed Buildings</h4>
            {buildings.map(b => {
              const def = allDefs.find(d => d.id === b.typeId)!;
              return (
                <div key={b.id} className="placed-building-row">
                  <div className="building-dot" style={{ background: def.accentColor }} />
                  <span>{def.name}</span>
                  <span className="muted">@ ({b.tileX}, {b.tileY})</span>
                  <button
                    className="btn-danger-sm"
                    onClick={() => store.removeBuilding(b.id)}
                    title="Remove building (no refund)"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
