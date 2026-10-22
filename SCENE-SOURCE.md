# Scene build source

Standalone Web3 and Three.js scenes copied from nasht12/threejs-portfolio GitHub Pages build 39821214608.

Hosted locally for consistent creative-portfolio navigation. Asset base paths point to /creative-portfolio/ and the Web3 return link reads “Back to portfolio”. The upstream repository is unchanged. Future upstream changes require an explicit build refresh here.

Warm-start customization: a clearly labeled recorded block renders immediately; the WebSocket requests the latest full block on connect, replacing the preview before waiting for new block events.

Default composition uses orthographic projection, a centered vertical private-flow marker, aligned block column, and responsive framing. Orbit, pan, and zoom remain enabled.

Restored the original perspective camera and diagonal block trail. Replaced the source marker with a pulsing assembly tray, low public arcs, and direct private entry from the block edge.

Replaced the persistent introduction with a hover/click info panel, including live/replay state and interaction guidance. Removed the optional screen-reader announcement toggle.

Recent-block controls use an even two-column grid with a full-width Follow newest control. Transaction lists are collapsed by default, render when expanded, and open automatically when a transaction is selected in the scene.

Incoming particle animations are restricted to transactions observed in the mempool; transactions without an observed origin appear in place rather than entering from a separate side.

Startup includes five recorded pending transactions alongside the recorded block. Seed transactions are removed on the first live block without clearing real pending arrivals; preview labeling remains until that handoff.

Removed the separate Follow newest control. The newest block is selected automatically while following live; clicking that block resumes live following after inspecting an older block.
