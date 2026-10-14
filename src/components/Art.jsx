import React from "react";
import { Leaf } from "lucide-react";
function Avatar({ name = "M", index = 0 }) {
  return (
    <span className={"avatar av" + index} aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
function WorldArt() {
  const plots = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) plots.push([c, r]);
  const claimed = new Set(["1,0", "4,1", "2,2", "0,3", "5,3"]);
  return (
    <svg
      className="world-art"
      viewBox="0 0 400 270"
      fill="none"
      aria-hidden="true"
    >
      <g transform="translate(40 30)">
        {plots.map(([c, r]) => (
          <rect
            key={c + "," + r}
            x={c * 54}
            y={r * 54}
            width="54"
            height="54"
            stroke="currentColor"
            strokeWidth="2"
            fill={claimed.has(c + "," + r) ? "var(--paper-2)" : "none"}
          />
        ))}
        <rect x="73" y="19" width="16" height="16" fill="var(--clay)" />
        <rect x="235" y="73" width="16" height="16" fill="var(--moss)" />
        <rect x="127" y="127" width="16" height="16" fill="var(--ochre)" />
        <rect x="19" y="181" width="16" height="16" fill="var(--clay)" />
        <rect x="289" y="181" width="16" height="16" fill="var(--slate)" />
        <path
          d="M81 27h162v54m0 0v54h-108v54"
          stroke="var(--clay)"
          strokeWidth="2"
          strokeDasharray="5 6"
        />
      </g>
    </svg>
  );
}
function ProjectArt({ type }) {
  return (
    <div className={"project-art " + type} aria-hidden="true">
      {type === "photo" ? (
        <>
          <div className="photo-window">
            <div className="window-top">
              <i />
              <i />
              <i />
              <span>PhotoCraft</span>
            </div>
            <div className="photo-tools">
              ↖<br />▧<br />⌁<br />◉<br />▱
            </div>
            <div className="landscape">
              <div className="sun" />
              <div className="mountain back" />
              <div className="mountain front" />
              <div className="mountain near" />
            </div>
            <div className="photo-panel">
              <span>Layers</span>
              <i />
              <i />
              <i />
            </div>
          </div>
          <span className="art-label">A fresh perspective.</span>
        </>
      ) : type === "cad" ? (
        <>
          <div className="cad-grid" />
          <div className="cad-object">
            <div className="cube-top" />
            <div className="cube-left" />
            <div className="cube-right" />
          </div>
          <div className="cad-axis">
            Y <span>↗</span> X
          </div>
          <span className="cad-caption">MAKE SOMETHING REAL</span>
        </>
      ) : type === "audio" ? (
        <>
          <div className="audio-window">
            <div className="audio-heading">
              <span>WAVEFORM</span>
              <span>▶ &nbsp; 120.00</span>
            </div>
            <div className="audio-tracks">
              {[0, 1, 2, 3].map((n) => (
                <div className={"track track" + n} key={n}>
                  <span>{["DRUMS", "BASS", "SYNTH", "VOCALS"][n]}</span>
                  <div>
                    {Array.from({ length: 30 }, (_, i) => (
                      <i
                        key={i}
                        style={{ height: `${8 + ((i * 17 + n * 13) % 30)}px` }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : type === "canvas" ? (
        <>
          <div className="canvas-board">
            <small>Canvas / Playground</small>
            <div className="canvas-circle" />
            <div className="canvas-block">
              Make
              <br />
              room.
            </div>
            <div className="canvas-sticky">a little idea ↗</div>
            <span className="cursor-label">↖ Builder</span>
          </div>
        </>
      ) : type === "notes" ? (
        <>
          <div className="notes-window">
            <aside>
              atlas
              <br />
              <br />
              <small>
                ⌕ Search
                <br />
                <br />▤ All notes
                <br />
                <br />☆ Favorites
              </small>
            </aside>
            <section>
              <small>MY DIGITAL GARDEN</small>
              <h3>Things connect.</h3>
              <p>A place for thoughts to take root.</p>
              <div className="note-lines" />
            </section>
          </div>
          <div className="notes-leaf">
            <Leaf size={38} />
          </div>
        </>
      ) : (
        <>
          <div className="video-window">
            <div className="video-image">
              <div className="video-sun" />
              <span>THE SLOW DAYS</span>
            </div>
            <div className="video-timeline">
              {[1, 2, 3].map((n) => (
                <i key={n} />
              ))}
            </div>
          </div>
          <span className="frame-label">Every frame is a possibility.</span>
        </>
      )}
    </div>
  );
}

export { Avatar, WorldArt, ProjectArt };
