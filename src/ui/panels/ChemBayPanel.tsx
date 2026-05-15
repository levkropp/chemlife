import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ChemBayListing } from '../../types';
import { getSubstance, canSellOnChemBay } from '../../data/substances';
import { formatMoney, formatMass, getPurityPercent, getDisplayName } from '../../utils/chemistry';
import { CHEMBAY_FLAT_FEE, CHEMBAY_PERCENT_FEE, CHEMBAY_SHIPPING_PER_KG } from '../../game/constants';
import { MoleculeCanvas } from '../MoleculeCanvas';

type Tab = 'buy' | 'local' | 'sell' | 'orders';

// ─── Preset quantity chips ────────────────────────────────────────────────────

interface SolidPreset { label: string; massKg: number; mult: number }
interface LiquidPreset { label: string; ml: number; mult: number }

const SOLID_PRESETS: SolidPreset[] = [
  { label: '50 g',  massKg: 0.050, mult: 1.40 },
  { label: '100 g', massKg: 0.100, mult: 1.25 },
  { label: '250 g', massKg: 0.250, mult: 1.10 },
  { label: '500 g', massKg: 0.500, mult: 1.00 },
  { label: '1 kg',  massKg: 1.000, mult: 0.75 },
];

const LIQUID_PRESETS: LiquidPreset[] = [
  { label: '100 mL', ml:  100, mult: 1.40 },
  { label: '250 mL', ml:  250, mult: 1.25 },
  { label: '500 mL', ml:  500, mult: 1.10 },
  { label: '1 L',    ml: 1000, mult: 1.00 },
  { label: '4 L',    ml: 4000, mult: 0.75 },
];

const LOCAL_ML_PRESETS = [100, 250, 500, 1000, 4000];
const LOCAL_ML_LABELS  = ['100 mL', '250 mL', '500 mL', '1 L', '4 L'];

// ─── Main panel ───────────────────────────────────────────────────────────────

export function ChemBayPanel() {
  const [tab, setTab] = useState<Tab>('buy');
  const [filterText, setFilterText] = useState('');
  const [selectedPresets, setSelectedPresets] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  const store = useGameStore();
  const { chemBayListings, player, orders, gameTime } = store;

  const hardwareListings = useMemo(
    () => chemBayListings.filter(l => (l as any).isHardwareStore || (l as any).isLocalStore),
    [chemBayListings]
  );
  const chemBayOnlyListings = useMemo(
    () => chemBayListings.filter(l => !(l as any).isHardwareStore && !(l as any).isLocalStore),
    [chemBayListings]
  );

  const filtered = useMemo(() => {
    const q = filterText.toLowerCase();
    return chemBayOnlyListings.filter(l => {
      const sub = getSubstance(l.substanceId);
      return (sub?.name ?? l.substanceId).toLowerCase().includes(q) ||
             l.sellerName.toLowerCase().includes(q);
    });
  }, [chemBayOnlyListings, filterText]);

  const commodityListings = filtered.filter(l => l.isCommodity);
  const reagentListings   = filtered.filter(l => !l.isCommodity);

  function msg(text: string, ok: boolean) {
    setFeedback({ msg: text, ok });
    setTimeout(() => setFeedback(null), 4000);
  }

  function handleBuy(listing: ChemBayListing) {
    const idx = selectedPresets[listing.id];
    if (idx === undefined) { msg('Select a quantity first', false); return; }
    const sub = getSubstance(listing.substanceId);
    const isLiquid = sub?.state === 'liquid';
    let massKg: number;
    let mult: number;
    if (isLiquid) {
      const p = LIQUID_PRESETS[idx];
      massKg = (p.ml / 1000) * (sub?.density ?? 1.0);
      mult = p.mult;
    } else {
      const p = SOLID_PRESETS[idx];
      massKg = p.massKg;
      mult = p.mult;
    }
    const result = store.buyFromChemBay(listing.id, massKg, listing.pricePerKg * mult);
    msg(result.message, result.success);
    if (result.success) setSelectedPresets(p => { const n = { ...p }; delete n[listing.id]; return n; });
  }

  function formatExpiry(expiresAt: number | undefined): string {
    if (!expiresAt) return '—';
    const rem = expiresAt - gameTime.totalMinutes;
    if (rem <= 0) return 'Expired';
    const h = Math.floor(rem / 60);
    const m = Math.floor(rem % 60);
    return `${h}h ${m}m`;
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'buy',    label: 'Buy' },
    { key: 'local',  label: '🔧 Local' },
    { key: 'sell',   label: 'Sell' },
    { key: 'orders', label: 'Orders' },
  ];

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">⚗ ChemBay Marketplace</span>
        <div className="tab-bar">
          {TABS.map(t => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div className={`feedback-bar ${feedback.ok ? 'ok' : 'err'}`}>{feedback.msg}</div>
      )}

      {/* ── Buy tab ──────────────────────────────────────────────────────────── */}
      {tab === 'buy' && (
        <div className="panel-content">
          <div className="search-row">
            <input className="input" placeholder="Search chemicals…"
              value={filterText} onChange={e => setFilterText(e.target.value)} />
          </div>
          <div className="fee-note">
            Shipping: $10/kg · Bulk discounts apply · Acids &amp; solvents → Local tab
          </div>

          {commodityListings.length > 0 && (
            <section>
              <h4 className="section-label">Commodities — always available</h4>
              {commodityListings.map(l => (
                <ListingRow key={l.id} listing={l}
                  selectedIdx={selectedPresets[l.id]}
                  onSelectIdx={idx => setSelectedPresets(p => ({ ...p, [l.id]: idx }))}
                  onBuy={() => handleBuy(l)}
                  expiresLabel={null}
                  playerMoney={player.money} />
              ))}
            </section>
          )}

          {reagentListings.length > 0 && (
            <section>
              <h4 className="section-label">Reagent listings — buy while available!</h4>
              {reagentListings.map(l => (
                <ListingRow key={l.id} listing={l}
                  selectedIdx={selectedPresets[l.id]}
                  onSelectIdx={idx => setSelectedPresets(p => ({ ...p, [l.id]: idx }))}
                  onBuy={() => handleBuy(l)}
                  expiresLabel={`Expires: ${formatExpiry(l.expiresAtMinutes)}`}
                  playerMoney={player.money} />
              ))}
            </section>
          )}

          {filtered.length === 0 && <p className="muted">No listings match your search.</p>}
        </div>
      )}

      {/* ── Local suppliers tab ───────────────────────────────────────────────── */}
      {tab === 'local' && <LocalSuppliersTab listings={hardwareListings} />}

      {/* ── Sell tab ────────────────────────────────────────────────────────── */}
      {tab === 'sell' && <SellTab />}

      {/* ── Orders tab ──────────────────────────────────────────────────────── */}
      {tab === 'orders' && (
        <div className="panel-content">
          {orders.length === 0 && <p className="muted">No orders yet.</p>}
          {orders.slice(0, 60).map(o => (
            <div key={o.id} className={`order-row ${o.type}`}>
              <div className="order-name">{o.substanceName}</div>
              <div className="order-meta">
                {o.type === 'buy' ? '↓ Bought' : '↑ Sold'} · {o.massKg.toFixed(3)} kg
                @ {formatMoney(o.pricePerKg)}/kg
                {o.chemBayFee > 0 && <span className="muted"> · fee {formatMoney(o.chemBayFee)}</span>}
              </div>
              <div className={`order-net ${o.net >= 0 ? 'positive' : 'negative'}`}>
                {o.net >= 0 ? '+' : ''}{formatMoney(o.net)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Local suppliers tab ──────────────────────────────────────────────────────

function LocalSuppliersTab({ listings }: { listings: ChemBayListing[] }) {
  const store = useGameStore();
  const { player } = store;
  const [selectedPresets, setSelectedPresets] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  function msg(text: string, ok: boolean) {
    setFeedback({ msg: text, ok });
    setTimeout(() => setFeedback(null), 4000);
  }

  function handleBuy(listing: ChemBayListing) {
    const idx = selectedPresets[listing.id];
    if (idx === undefined) { msg('Select a quantity first', false); return; }
    const liters = LOCAL_ML_PRESETS[idx] / 1000;
    const result = store.buyFromHardwareStore(listing.id, liters);
    msg(result.message, result.success);
    if (result.success) setSelectedPresets(p => { const n = { ...p }; delete n[listing.id]; return n; });
  }

  return (
    <div className="panel-content">
      <div className="fee-note" style={{ borderColor: 'var(--cyan)', color: 'var(--cyan)' }}>
        Local hardware / grocery / pool stores. No fees — pickup only. Resets daily.
        Acids <strong>cannot</strong> be bought or sold on ChemBay.
      </div>

      {listings.length === 0 && <p className="muted">No local supplier items available.</p>}

      {listings.map(listing => {
        const sub = getSubstance(listing.substanceId);
        const hw = sub?.hardwareStore ?? sub?.localStore;
        if (!hw) return null;

        const kgPerL = hw.density;
        const purchasedKg = listing.purchasedKg ?? 0;
        const dailyKg = listing.dailyLimitKg ?? 0;
        const remainingL = Math.max(0, (dailyKg - purchasedKg) / kgPerL);

        const selectedIdx = selectedPresets[listing.id];
        const selectedMl = selectedIdx !== undefined ? LOCAL_ML_PRESETS[selectedIdx] : 0;
        const selectedL  = selectedMl / 1000;
        const cost = selectedL * hw.pricePerLiter;
        const canAfford = player.money >= cost && selectedIdx !== undefined && selectedL > 0;

        const storeName = hw.storeName ?? (sub?.marketAvailability === 'hardware_store' ? 'Hardware / Pool Store' : 'Local Store');

        return (
          <div key={listing.id} className="listing-card" style={{ borderColor: 'var(--cyan)' }}>
            <div className="listing-top">
              <div className="listing-name">
                {hw.label ?? sub?.name}
                {sub?.formula && <span className="formula"> {sub.formula}</span>}
                <span className="purity-badge" style={{ borderColor: 'var(--cyan)', color: 'var(--cyan)' }}>
                  {(hw.concentration * 100).toFixed(0)}%
                </span>
              </div>
              <div className="listing-price">{formatMoney(hw.pricePerLiter)}/L</div>
            </div>

            <div className="listing-meta">
              <span className="seller">{storeName}</span>
              <span className="available">{remainingL.toFixed(1)} L remaining today</span>
              <span className="muted">({kgPerL.toFixed(3)} kg/L)</span>
            </div>

            {sub?.regulatoryNote && (
              <div className="reg-note">{sub.regulatoryNote}</div>
            )}

            <div className="preset-chips" style={{ marginTop: 8 }}>
              {LOCAL_ML_PRESETS.map((ml, i) => {
                const liters = ml / 1000;
                const avail  = liters <= remainingL + 0.001;
                return (
                  <button
                    key={i}
                    className={`preset-chip ${selectedIdx === i ? 'active' : ''}`}
                    onClick={() => avail && setSelectedPresets(p => ({ ...p, [listing.id]: i }))}
                    disabled={!avail}
                    title={avail ? formatMoney(liters * hw.pricePerLiter) : 'Not enough remaining'}
                  >
                    {LOCAL_ML_LABELS[i]}
                  </button>
                );
              })}
            </div>

            {selectedIdx !== undefined && selectedL > 0 && (
              <div className="cost-preview" style={{ marginTop: 6 }}>
                <span className="muted">{(selectedL * kgPerL).toFixed(3)} kg</span>
                <span className="total"> = {formatMoney(cost)}</span>
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <button className="btn-primary" onClick={() => handleBuy(listing)} disabled={!canAfford}>
                Buy {selectedIdx !== undefined ? LOCAL_ML_LABELS[selectedIdx] : '—'}
              </button>
            </div>
          </div>
        );
      })}

      {feedback && (
        <div className={`feedback-bar ${feedback.ok ? 'ok' : 'err'}`}>{feedback.msg}</div>
      )}
    </div>
  );
}

// ─── Listing row (ChemBay buy tab) ────────────────────────────────────────────

interface ListingRowProps {
  listing: ChemBayListing;
  selectedIdx: number | undefined;
  onSelectIdx: (idx: number) => void;
  onBuy: () => void;
  expiresLabel: string | null;
  playerMoney: number;
}

function ListingRow({ listing, selectedIdx, onSelectIdx, onBuy, expiresLabel, playerMoney }: ListingRowProps) {
  const sub = getSubstance(listing.substanceId);
  const isLiquid = sub?.state === 'liquid';
  const density  = sub?.density ?? 1.0;

  const availableKg = listing.isCommodity
    ? (listing.dailyLimitKg ?? 0) - (listing.purchasedKg ?? 0)
    : listing.totalMassKg;
  const purity = listing.analyzed ? getPurityPercent(listing.compound) : null;

  const presets = isLiquid ? LIQUID_PRESETS : SOLID_PRESETS;
  const selected = selectedIdx !== undefined ? presets[selectedIdx] : null;

  let selectedMassKg = 0;
  let selectedTotalCost = 0;
  let effectivePrice = 0;
  if (selected) {
    selectedMassKg = isLiquid
      ? ((selected as LiquidPreset).ml / 1000) * density
      : (selected as SolidPreset).massKg;
    effectivePrice = listing.pricePerKg * selected.mult;
    selectedTotalCost = effectivePrice * selectedMassKg + CHEMBAY_SHIPPING_PER_KG * selectedMassKg;
  }
  const canAfford = selectedIdx !== undefined && playerMoney >= selectedTotalCost;

  return (
    <div className={`listing-card ${expiresLabel ? 'reagent' : ''}`}>
      <div className="listing-main">
        {sub?.smiles && <MoleculeCanvas smiles={sub.smiles} width={88} height={72} />}
        <div className="listing-details">
          <div className="listing-top">
            <div className="listing-name">
              {sub?.name ?? listing.substanceId}
              {sub?.formula && <span className="formula"> {sub.formula}</span>}
              {purity !== null && <span className="purity-badge">{purity.toFixed(1)}% pure</span>}
              {!listing.analyzed && !listing.isCommodity && <span className="unanalyzed-badge">?</span>}
            </div>
            <div className="listing-price">{formatMoney(listing.pricePerKg)}/kg</div>
          </div>

          <div className="listing-meta">
            <span className="seller">{listing.sellerName}</span>
            <span className="available">{availableKg.toFixed(2)} kg avail.</span>
            {expiresLabel && <span className="expires">{expiresLabel}</span>}
          </div>

          {listing.analyzed && listing.compound.components.length > 1 && (
            <div className="composition">
              {listing.compound.components.map(c => {
                const s = getSubstance(c.substanceId);
                const totalMass = listing.compound.components.reduce((acc, x) => acc + x.massGrams, 0);
                return (
                  <span key={c.substanceId} className="comp-tag">
                    {s?.name ?? c.substanceId} {((c.massGrams / totalMass) * 100).toFixed(1)}%
                  </span>
                );
              })}
            </div>
          )}

          <div className="preset-chips">
            {presets.map((p, i) => {
              const massKg = isLiquid
                ? ((p as LiquidPreset).ml / 1000) * density
                : (p as SolidPreset).massKg;
              const avail = massKg <= availableKg + 0.001;
              const isSelected = selectedIdx === i;
              const price = listing.pricePerKg * p.mult;
              const total = price * massKg + CHEMBAY_SHIPPING_PER_KG * massKg;
              const multLabel = p.mult < 1.0 ? '▾' : p.mult > 1.0 ? '▴' : '';
              return (
                <button
                  key={i}
                  className={`preset-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => avail && onSelectIdx(i)}
                  disabled={!avail}
                  title={avail
                    ? `${formatMoney(price)}/kg · Total: ${formatMoney(total)}`
                    : 'Not enough available'}
                >
                  {p.label}{multLabel && <span className="chip-mult">{multLabel}</span>}
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="listing-buy-row">
              <div className="cost-preview">
                <span className="muted">{selectedMassKg.toFixed(3)} kg</span>
                <span> @ {formatMoney(effectivePrice)}/kg</span>
                {selected.mult !== 1.0 && (
                  <span className="muted"> ({selected.mult < 1.0 ? '-' : '+'}{Math.abs((1 - selected.mult) * 100).toFixed(0)}%)</span>
                )}
                <span className="muted"> +ship.</span>
                <span className="total"> = {formatMoney(selectedTotalCost)}</span>
              </div>
              <button className="btn-primary" onClick={onBuy} disabled={!canAfford}>
                Buy
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sell tab ─────────────────────────────────────────────────────────────────

function SellTab() {
  const store = useGameStore();
  const { player } = store;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pricePerKg, setPricePerKg] = useState('');
  const [massKg, setMassKg] = useState('');
  const [doAnalysis, setDoAnalysis] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  function msg(text: string, ok: boolean) {
    setFeedback({ msg: text, ok });
    setTimeout(() => setFeedback(null), 4000);
  }

  const selectedItem = player.inventory.find(i => i.id === selectedId);
  const price = parseFloat(pricePerKg) || 0;
  const qty   = parseFloat(massKg)   || 0;
  const subtotal    = price * qty;
  const fee         = CHEMBAY_FLAT_FEE + subtotal * CHEMBAY_PERCENT_FEE;
  const analysisCost = doAnalysis ? 500 * qty : 0;
  const net = subtotal - fee - analysisCost;

  const sellBlockReason = (() => {
    if (!selectedItem) return null;
    const primary = selectedItem.compound.components.reduce((m, c) => c.massGrams > m.massGrams ? c : m);
    const sub = getSubstance(primary.substanceId);
    if (!sub) return null;
    if (!canSellOnChemBay(sub)) return sub.regulatoryNote ?? `${sub.name} cannot be sold on ChemBay.`;
    return null;
  })();

  function handleSell() {
    if (!selectedItem) return msg('Select an item', false);
    if (sellBlockReason) return msg(sellBlockReason, false);
    if (price <= 0) return msg('Enter a price', false);
    if (qty <= 0) return msg('Enter a quantity', false);
    if (qty > selectedItem.totalMassGrams / 1000) return msg('Quantity exceeds available mass', false);
    const result = store.sellOnChemBay(selectedItem, qty, price, doAnalysis);
    msg(result.message, result.success);
    if (result.success) setSelectedId(null);
  }

  return (
    <div className="panel-content">
      {feedback && <div className={`feedback-bar ${feedback.ok ? 'ok' : 'err'}`}>{feedback.msg}</div>}

      <div className="fee-note">
        Fees: ${CHEMBAY_FLAT_FEE} flat + {(CHEMBAY_PERCENT_FEE * 100).toFixed(0)}% · Analysis: $500/kg · Regulated substances cannot be listed
      </div>

      <h4 className="section-label">Select item to sell</h4>
      {player.inventory.length === 0 && <p className="muted">Inventory empty.</p>}

      {player.inventory.map(item => {
        const primary = item.compound.components.reduce((m, c) => c.massGrams > m.massGrams ? c : m);
        const sub = getSubstance(primary.substanceId);
        const blocked = sub && !canSellOnChemBay(sub);
        return (
          <div key={item.id}
            className={`inventory-row selectable ${selectedId === item.id ? 'selected' : ''} ${blocked ? 'unaffordable' : ''}`}
            onClick={() => !blocked && setSelectedId(item.id)}
            title={blocked ? (sub?.regulatoryNote ?? 'Cannot sell on ChemBay') : undefined}>
            <span className="item-name">{getDisplayName(item.compound)}</span>
            <span className="item-mass">{formatMass(item.totalMassGrams)}</span>
            <span className="item-purity">{getPurityPercent(item.compound).toFixed(1)}%</span>
            {blocked && <span className="muted small">🚫 ChemBay</span>}
          </div>
        );
      })}

      {selectedItem && (
        <div className="sell-form">
          {sellBlockReason ? (
            <div className="feedback-bar err">{sellBlockReason}</div>
          ) : (
            <>
              <h4 className="section-label">List: {getDisplayName(selectedItem.compound)}</h4>
              <div className="form-row">
                <label>Price / kg ($)</label>
                <input className="input" type="number" min="0" step="1" placeholder="e.g. 15"
                  value={pricePerKg} onChange={e => setPricePerKg(e.target.value)} />
              </div>
              <div className="form-row">
                <label>Quantity (kg)</label>
                <input className="input" type="number" min="0.001" step="0.01"
                  max={selectedItem.totalMassGrams / 1000} placeholder="kg"
                  value={massKg} onChange={e => setMassKg(e.target.value)} />
              </div>
              <div className="form-row">
                <label>
                  <input type="checkbox" checked={doAnalysis} onChange={e => setDoAnalysis(e.target.checked)} />{' '}
                  Request analysis ($500/kg) — reveals composition to buyers
                </label>
              </div>
              {qty > 0 && price > 0 && (
                <div className="fee-breakdown">
                  <div>Subtotal: {formatMoney(subtotal)}</div>
                  <div>ChemBay fee: −{formatMoney(fee)}</div>
                  {doAnalysis && <div>Analysis: −{formatMoney(analysisCost)}</div>}
                  <div className={`net-amount ${net >= 0 ? 'positive' : 'negative'}`}>
                    Net: {formatMoney(net)}
                  </div>
                </div>
              )}
              <button className="btn-primary" onClick={handleSell} disabled={net <= 0 || qty <= 0}>
                List on ChemBay
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
