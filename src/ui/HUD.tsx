import { useGameStore } from '../store/gameStore';
import { formatMoney } from '../utils/chemistry';

export function HUD() {
  const store = useGameStore();
  const { player, gameTime, buildings, tutorial, openWindows } = store;

  const totalKg = player.inventory.reduce((s, i) => s + i.totalMassGrams / 1000, 0);
  const completedBuildings = buildings.filter(b => b.processingJob?.status === 'complete').length;

  const day = Math.floor(gameTime.totalMinutes / 1440) + 1;
  const hour = Math.floor((gameTime.totalMinutes % 1440) / 60);
  const minute = Math.floor(gameTime.totalMinutes % 60);
  const timeStr = `Day ${day} · ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return (
    <div className="hud">
      <div className="hud-inner">
        {/* Left: money + time */}
        <div className="hud-stats">
          <div className="hud-stat">
            <span className="hud-label">Balance</span>
            <span className="hud-value money">{formatMoney(player.money)}</span>
          </div>
          <div className="hud-divider" />
          <div className="hud-stat">
            <span className="hud-label">Time</span>
            <span className="hud-value time">{timeStr}</span>
          </div>
          {completedBuildings > 0 && (
            <>
              <div className="hud-divider" />
              <span className="hud-alert">⚗ {completedBuildings} reaction{completedBuildings > 1 ? 's' : ''} done!</span>
            </>
          )}
        </div>

        {/* Center: panel toggles */}
        <div className="hud-hotkeys">
          <HudBtn
            label="ChemBay" key_="C"
            active={openWindows.includes('chembay')}
            onClick={() => store.toggleWindow('chembay')}
          />
          <HudBtn
            label="Inventory" key_="I"
            active={openWindows.includes('inventory')}
            onClick={() => store.toggleWindow('inventory')}
            extra={totalKg > 0 ? `${totalKg.toFixed(2)} kg` : undefined}
          />
          <HudBtn
            label="Build" key_="B"
            active={openWindows.includes('build')}
            onClick={() => store.toggleWindow('build')}
          />
          <HudBtn
            label="Tutorial" key_="?"
            active={openWindows.includes('tutorial')}
            onClick={() => store.toggleWindow('tutorial')}
            hide={tutorial.dismissed}
          />
        </div>

        {/* Right: speed controls */}
        <div className="hud-controls">
          <button
            className={`speed-btn ${gameTime.isPaused ? 'paused' : ''}`}
            onClick={() => store.togglePause()}
            title="P — pause/unpause"
          >
            {gameTime.isPaused ? '▶' : '⏸'}
          </button>
          {([1, 2, 3] as const).map(s => (
            <button
              key={s}
              className={`speed-btn ${!gameTime.isPaused && gameTime.speed === s ? 'active' : ''}`}
              onClick={() => { store.setSpeed(s); if (gameTime.isPaused) store.togglePause(); }}
              title={`${s}×`}
            >
              {s}×
            </button>
          ))}
          <span className="hud-elec">⚡ {store.totalElectricityKwh.toFixed(2)} kWh</span>
        </div>
      </div>
    </div>
  );
}

function HudBtn({
  label, key_, onClick, active, extra, hide,
}: {
  label: string; key_: string; onClick: () => void;
  active?: boolean; extra?: string; hide?: boolean;
}) {
  if (hide) return null;
  return (
    <button className={`hud-btn ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="hud-btn-key">[{key_}]</span>
      {label}
      {extra && <span className="hud-btn-extra">{extra}</span>}
    </button>
  );
}
