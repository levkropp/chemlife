import { useGameStore } from '../store/gameStore';

export function TutorialWindow() {
  const store = useGameStore();
  const { tutorial } = store;

  if (tutorial.dismissed) {
    return (
      <div className="panel-content">
        <p className="muted small">Tutorial dismissed. Open the tutorial again from the menu if needed.</p>
        <div className="btn-row" style={{ marginTop: 8 }}>
          <button className="btn-secondary small" onClick={() => store.resetGame()}>
            Reset Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-content">
        {tutorial.steps.map((step, i) => (
          <div
            key={step.id}
            className={`tutorial-step-row ${i === tutorial.currentStep ? 'current' : ''} ${step.completed ? 'done' : ''}`}
          >
            <div className="step-number">{i + 1}</div>
            <div className="step-content">
              <div className="step-title">{step.title}</div>
              {i === tutorial.currentStep && (
                <div className="step-body">{step.body}</div>
              )}
            </div>
            {step.completed && <span className="step-check">✓</span>}
          </div>
        ))}

        <div className="tutorial-dots" style={{ margin: '12px 0 4px' }}>
          {tutorial.steps.map((s, i) => (
            <div key={s.id} className={`dot ${i === tutorial.currentStep ? 'active' : i < tutorial.currentStep ? 'done' : ''}`} />
          ))}
        </div>

        <div className="btn-row">
          {tutorial.currentStep < tutorial.steps.length - 1 ? (
            <button className="btn-primary" onClick={() => store.advanceTutorial()}>
              Next →
            </button>
          ) : (
            <button className="btn-primary" onClick={() => store.dismissTutorial()}>
              Got it!
            </button>
          )}
          <button className="btn-secondary" onClick={() => store.dismissTutorial()}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
