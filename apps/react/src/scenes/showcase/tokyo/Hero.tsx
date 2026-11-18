import { useState } from 'react';

const command = 'npm i @pmndrs/klipp';

/** The first screen: the name, what it is, how to install it, and where to read on. */
export function Hero() {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <section className="tokyo-section tokyo-hero" data-stop="">
      <h2>Klipp</h2>
      <p>
        Virtual cameras for the web. <br />
        Compose shots, blend between them, and let the user take control.
      </p>
      <button type="button" className="tokyo-install" onClick={copy}>
        <code>{command}</code>
        <span>{copied ? 'copied' : 'copy'}</span>
      </button>
      <nav className="tokyo-hero-links">
        <a href="https://pmndrs.github.io/klipp/docs/" target="_blank" rel="noreferrer">
          Docs
        </a>
        <a href={`${import.meta.env.BASE_URL}examples/`}>Examples</a>
        <a href="https://github.com/pmndrs/klipp" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
      <span className="tokyo-scroll-hint">scroll</span>
    </section>
  );
}
