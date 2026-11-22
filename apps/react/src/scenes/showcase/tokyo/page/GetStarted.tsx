import { useState } from 'react';

const command = 'npm i @pmndrs/klipp';

/** The install command, copied on click. */
export function InstallCommand() {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button type="button" className="tokyo-install" onClick={copy}>
      <code>{command}</code>
      <span>{copied ? 'copied' : 'copy'}</span>
    </button>
  );
}

/** Where to read on: the docs, the examples and the code. */
export function Links() {
  return (
    <nav className="tokyo-links">
      <a href="https://pmndrs.github.io/klipp/docs/" target="_blank" rel="noreferrer">
        Docs
      </a>
      <a href={`${import.meta.env.BASE_URL}examples/`}>Examples</a>
      <a href="https://github.com/pmndrs/klipp" target="_blank" rel="noreferrer">
        GitHub
      </a>
    </nav>
  );
}
