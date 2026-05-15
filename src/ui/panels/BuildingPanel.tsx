import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getBuildingDef } from '../../data/buildings';
import { getRecipesByBuilding, RECIPES } from '../../data/recipes';
import { getSubstance } from '../../data/substances';
import { formatMass, formatMoney, getDisplayName, getPurityPercent } from '../../utils/chemistry';
import { InventoryItem } from '../../types';

export function BuildingPanel() {
  const store = useGameStore();
  const { selectedBuildingId, buildings, player, gameTime } = store;

  const building = buildings.find(b => b.id === selectedBuildingId);
  if (!building) return <div className="panel"><p className="muted">No building selected.</p></div>;

  const def = getBuildingDef(building.typeId);
  if (!def) return null;

  const job = building.processingJob;

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="building-header-icon" style={{ background: def.accentColor }}>
          {def.shortLabel}
        </div>
        <span className="panel-title">{def.name}</span>
      </div>

      <div className="panel-content">
        <p className="muted small">{def.description}</p>

        {def.storageKg && (
          <div className="info-box">
            Storage: +{def.storageKg} kg
          </div>
        )}

        {/* Processing job status */}
        {job && (
          <div className="job-status">
            {job.status === 'running' && (
              <>
                <div className="job-title">⏳ Processing: {RECIPES[job.recipeId]?.name}</div>
                <JobProgress
                  start={job.startTimeMinutes}
                  end={job.endTimeMinutes}
                  now={gameTime.totalMinutes}
                />
                <p className="muted small">
                  Completes in {Math.max(0, job.endTimeMinutes - gameTime.totalMinutes).toFixed(1)} in-game minutes
                </p>
              </>
            )}
            {job.status === 'complete' && (
              <div className="job-complete">
                <div className="job-title">✅ Complete: {RECIPES[job.recipeId]?.name}</div>
                <div className="outputs-preview">
                  {job.outputs?.map(o => (
                    <div key={o.id} className="output-tag">
                      {getDisplayName(o.compound)} — {formatMass(o.totalMassGrams)}
                    </div>
                  ))}
                </div>
                <button
                  className="btn-primary"
                  onClick={() => store.collectOutput(building.id)}
                >
                  Collect Output
                </button>
              </div>
            )}
            {job.status === 'failed' && (
              <div className="job-failed">
                ❌ Processing failed. Power outage or input issue.
              </div>
            )}
          </div>
        )}

        {/* Recipe selector (only if no active job) */}
        {!job && <RecipeSelector buildingId={building.id} buildingTypeId={building.typeId} />}
      </div>
    </div>
  );
}

function JobProgress({
  start,
  end,
  now,
}: {
  start: number;
  end: number;
  now: number;
}) {
  const progress = Math.min(1, Math.max(0, (now - start) / (end - start)));
  return (
    <div className="progress-bar-wrap">
      <div className="progress-bar-fill" style={{ width: `${progress * 100}%` }} />
      <span className="progress-pct">{(progress * 100).toFixed(0)}%</span>
    </div>
  );
}

function RecipeSelector({
  buildingId,
  buildingTypeId,
}: {
  buildingId: string;
  buildingTypeId: string;
}) {
  const store = useGameStore();
  const { player } = store;
  const recipes = getRecipesByBuilding(buildingTypeId);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedInputs, setSelectedInputs] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  function msg(text: string, ok: boolean) {
    setFeedback({ msg: text, ok });
    setTimeout(() => setFeedback(null), 4000);
  }

  const recipe = selectedRecipeId ? RECIPES[selectedRecipeId] : null;

  function handleStart() {
    if (!recipe) return msg('Select a recipe', false);

    // Collect selected input items
    const inputs: InventoryItem[] = [];
    for (const [substanceId, itemId] of Object.entries(selectedInputs)) {
      if (!itemId) continue;
      const item = player.inventory.find(i => i.id === itemId);
      if (item) inputs.push(item);
    }

    if (inputs.length === 0) return msg('Add inputs from your inventory', false);

    const result = store.startProcessing(buildingId, recipe.id, inputs);
    msg(result.message, result.success);
    if (result.success) {
      setSelectedRecipeId(null);
      setSelectedInputs({});
    }
  }

  if (recipes.length === 0) {
    return <p className="muted">No recipes available for this building.</p>;
  }

  return (
    <div className="recipe-selector">
      <h4 className="section-label">Available Recipes</h4>

      {feedback && (
        <div className={`feedback-bar ${feedback.ok ? 'ok' : 'err'}`}>{feedback.msg}</div>
      )}

      <div className="recipe-list">
        {recipes.map(r => (
          <div
            key={r.id}
            className={`recipe-card ${selectedRecipeId === r.id ? 'selected' : ''}`}
            onClick={() => setSelectedRecipeId(r.id)}
          >
            <div className="recipe-name">{r.name}</div>
            <div className="recipe-meta muted small">
              ⏱ {r.durationMinutes} min · ⚡ {r.electricityKwhPerRun} kWh
            </div>
            <div className="recipe-desc muted small">{r.description}</div>

            {r.tutorial && selectedRecipeId === r.id && (
              <div className="recipe-tutorial">{r.tutorial}</div>
            )}
          </div>
        ))}
      </div>

      {recipe && (
        <div className="input-form">
          <h4 className="section-label">Assign Inputs — {recipe.name}</h4>
          <p className="muted small">
            Select inventory items for each required substance. The reaction will use
            the limiting reagent to determine scale.
          </p>

          {recipe.inputs.map(input => {
            const sub = getSubstance(input.substanceId);
            const compatible = player.inventory.filter(item =>
              item.compound.components.some(c => c.substanceId === input.substanceId)
            );
            return (
              <div key={input.substanceId} className="input-row">
                <div className="input-label">
                  {sub?.name ?? input.substanceId}
                  <span className="muted small"> ({input.moles} mol ratio)</span>
                </div>
                {compatible.length === 0 ? (
                  <span className="muted small">Not in inventory</span>
                ) : (
                  <select
                    className="select"
                    value={selectedInputs[input.substanceId] ?? ''}
                    onChange={e =>
                      setSelectedInputs(prev => ({
                        ...prev,
                        [input.substanceId]: e.target.value,
                      }))
                    }
                  >
                    <option value="">— select item —</option>
                    {compatible.map(item => (
                      <option key={item.id} value={item.id}>
                        {getDisplayName(item.compound)} —{' '}
                        {formatMass(item.totalMassGrams)} (
                        {getPurityPercent(item.compound).toFixed(1)}% pure)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}

          <div className="btn-row">
            <button className="btn-primary" onClick={handleStart}>
              Start Processing
            </button>
            <button
              className="btn-secondary"
              onClick={() => { setSelectedRecipeId(null); setSelectedInputs({}); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
