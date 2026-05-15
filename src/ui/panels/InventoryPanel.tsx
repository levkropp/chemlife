import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { InventoryItem } from '../../types';
import { getSubstance } from '../../data/substances';
import { formatMass, formatMoney, getDisplayName, getPurityPercent } from '../../utils/chemistry';

export function InventoryPanel() {
  const { player } = useGameStore();
  const [selected, setSelected] = useState<string | null>(null);

  const totalKg = player.inventory.reduce((s, i) => s + i.totalMassGrams / 1000, 0);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">🧪 Inventory</span>
        <span className="muted">{totalKg.toFixed(3)} / {player.maxInventoryKg} kg</span>
      </div>

      <div className="panel-content">
        <div className="capacity-bar">
          <div
            className="capacity-fill"
            style={{ width: `${Math.min(100, (totalKg / player.maxInventoryKg) * 100)}%` }}
          />
        </div>

        {player.inventory.length === 0 && (
          <p className="muted">Your inventory is empty. Buy chemicals from ChemBay to get started.</p>
        )}

        {player.inventory.map(item => (
          <InventoryCard
            key={item.id}
            item={item}
            expanded={selected === item.id}
            onToggle={() => setSelected(selected === item.id ? null : item.id)}
          />
        ))}
      </div>
    </div>
  );
}

function InventoryCard({
  item,
  expanded,
  onToggle,
}: {
  item: InventoryItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const purity = getPurityPercent(item.compound);
  const primaryId = item.compound.components.reduce((m, c) => (c.massGrams > m.massGrams ? c : m)).substanceId;
  const primarySub = getSubstance(primaryId);
  const totalMass = item.compound.components.reduce((s, c) => s + c.massGrams, 0);

  return (
    <div className={`inventory-card ${expanded ? 'expanded' : ''}`} onClick={onToggle}>
      <div className="inv-card-header">
        <div className="inv-dot" style={{ background: primarySub?.color ?? '#839496' }} />
        <div className="inv-name">{getDisplayName(item.compound)}</div>
        <div className="inv-mass">{formatMass(item.totalMassGrams)}</div>
        <div className="inv-purity">{purity.toFixed(1)}%</div>
      </div>

      {expanded && (
        <div className="inv-card-detail">
          <div className="detail-row">
            <span className="muted">Formula:</span>
            <span>{primarySub?.formula ?? '—'}</span>
          </div>
          <div className="detail-row">
            <span className="muted">State:</span>
            <span>{primarySub?.state ?? '—'}</span>
          </div>
          <div className="detail-section-label">Composition:</div>
          {item.compound.components.map(c => {
            const sub = getSubstance(c.substanceId);
            const pct = ((c.massGrams / totalMass) * 100).toFixed(1);
            return (
              <div key={c.substanceId} className="comp-row">
                <div
                  className="comp-color"
                  style={{ background: sub?.color ?? '#839496' }}
                />
                <span className="comp-name">{sub?.name ?? c.substanceId}</span>
                <span className="comp-pct">{pct}%</span>
                <span className="comp-mass muted">{formatMass(c.massGrams)}</span>
              </div>
            );
          })}
          {primarySub?.description && (
            <p className="item-desc muted">{primarySub.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
