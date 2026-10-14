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
  return (
    <svg
      className="world-art"
      viewBox="0 0 400 270"
      fill="none"
      aria-hidden="true"
    >
      <g transform="translate(202 133) rotate(-20)">
        <circle r="95" stroke="#5f8d76" strokeWidth="1.2" />
        <ellipse rx="48" ry="95" stroke="#5f8d76" />
        <ellipse rx="78" ry="95" stroke="#5f8d76" />
        <path
          d="M-94 0H94M-86-40H86M-86 40H86M-63-72H63M-63 72H63"
          stroke="#5f8d76"
        />
        <path d="M0-95V95" stroke="#5f8d76" />
        <ellipse
          rx="154"
          ry="38"
          transform="rotate(-15)"
          stroke="#87a78c"
          strokeDasharray="4 6"
        />
        <circle cx="-133" cy="51" r="9" fill="#285a48" />
        <circle cx="124" cy="-44" r="5" fill="#285a48" />
      </g>
      <g transform="translate(299 46) rotate(9)">
        <rect width="42" height="42" rx="11" fill="#fcfaf2" stroke="#ccd8c7" />
        <path
          d="m17 14-6 7 6 7m8-14 6 7-6 7"
          stroke="#426957"
          strokeWidth="2"
        />
      </g>
      <g transform="translate(59 167) rotate(-9)">
        <rect width="42" height="42" rx="11" fill="#fcfaf2" stroke="#ccd8c7" />
        <path d="m12 22 8-9 9 9-9 9-8-9Z" stroke="#426957" strokeWidth="2" />
      </g>
      <path d="M75 64v12m-6-6h12M320 192v12m-6-6h12" stroke="#7d9c7f" />
      <circle cx="115" cy="36" r="3" fill="#a4b895" />
      <circle cx="352" cy="137" r="3" fill="#a4b895" />
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
