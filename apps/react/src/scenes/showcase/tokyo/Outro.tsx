import { Links } from './GetStarted';
import { Pieces } from './Story';

/** The last screen: an invitation to take the camera right here, or read on. */
export function Outro({ onTakeControl }: { onTakeControl: () => void }) {
  return (
    <section className="tokyo-section tokyo-outro" data-stop="">
      <div className="tokyo-outro-panel">
        <h2>Your turn</h2>
        <p>Every shot on this page is a few lines of code, on a core that works with any renderer.</p>
        <button type="button" className="tokyo-take-control" onClick={onTakeControl}>
          Take control
        </button>
        <Links />
        <Pieces pieces={['Body.OrbitFollow', 'Aim.HardLookAt', 'KlippControls']} />
      </div>
    </section>
  );
}
