import { initBotId } from "botid/client/core";

// Local generation keeps its existing loopback workflow. This only avoids the
// client challenge on loopback; hosted server verification never has a bypass.
if (!["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname))
  initBotId({
    protect: [
      { path: "/api/plans/generate", method: "POST" },
      { path: "/api/access/redeem", method: "POST" },
    ],
  });
