import { InstallCommand, Links } from './GetStarted';

/** The first screen: the name, what it is, a tour of the scene, how to install it, and where to read on. */
export function Hero({ onPlay }: { onPlay: () => void }) {
  return (
    <section className="tokyo-section tokyo-hero" data-stop="">
      <h2>Klipp</h2>
      <p>
        Virtual cameras for the web. <br />
        Compose shots, blend between them, and let the user take control.
      </p>
      <InstallCommand />
      <Links />
      <div className="tokyo-hero-start">
        <button type="button" className="tokyo-cta" onClick={onPlay}>
          Play the tour
        </button>
        <span className="tokyo-scroll-hint">or scroll</span>
      </div>
    </section>
  );
}
