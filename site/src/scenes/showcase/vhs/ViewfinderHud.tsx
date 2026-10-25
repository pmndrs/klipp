import { useEffect, useState } from 'react';

const pad = (value: number) => String(value).padStart(2, '0');

/** Counts up from `0:00:00` from the moment it mounts, like a tape counter. */
function TapeCounter() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const interval = setInterval(() => setSeconds(Math.floor((performance.now() - start) / 1000)), 250);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="viewfinder-hud-counter">
      {Math.floor(seconds / 3600)}:{pad(Math.floor(seconds / 60) % 60)}:{pad(seconds % 60)}
    </span>
  );
}

/**
 * The camcorder's viewfinder readout over a close-up: a blinking REC, tape speed, battery and a counter that starts
 * over with every `take`. Fades in while `take` is set.
 */
export function ViewfinderHud({ take }: { take: string | null }) {
  const [lastTake, setLastTake] = useState(take);
  if (take && take !== lastTake) setLastTake(take);

  return (
    <div className={`viewfinder-hud${take ? ' is-on' : ''}`} aria-hidden>
      <div className="viewfinder-hud-frame">
        <span className="viewfinder-hud-rec">
          <span className="viewfinder-hud-dot">●</span> REC
        </span>
        <span className="viewfinder-hud-tape">
          SP
          <span className="viewfinder-hud-battery">
            <span />
            <span />
            <span />
          </span>
        </span>
        <TapeCounter key={lastTake} />
      </div>
    </div>
  );
}
