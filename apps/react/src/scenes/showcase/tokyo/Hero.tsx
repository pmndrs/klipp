import { InstallCommand, Links } from './GetStarted';

/** The first screen: the name, what it is, how to install it, and where to read on. */
export function Hero() {
  return (
    <section className="tokyo-section tokyo-hero" data-stop="">
      <h2>Klipp</h2>
      <p>
        Virtual cameras for the web. <br />
        Compose shots, blend between them, and let the user take control.
      </p>
      <InstallCommand />
      <Links />
      <span className="tokyo-scroll-hint">scroll</span>
    </section>
  );
}
