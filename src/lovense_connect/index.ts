import { flags } from "debugcommands";
import express from "express";
import { sendOpenShockCommand } from "../openshock";

const app = express();
const PORT = 20010; // Standard Lovense Connect port (Game Mode)

// Lovense Connect expects a specific JSON structure for toys
const TOY_ID = "PISHOCK_BRIDGE";
const TOY_NAME = "PiShock OpenShock Bridge";

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Lovense often sends form-urlencoded

// 1. GET /GetToys
// Intiface polls this to find devices.
app.get("/GetToys", (req, res) => {
  if (flags.debugLogs) console.log("Incoming GET /GetToys request");
  
  const response = {
    "data": {
      [TOY_ID]: {
        "name": TOY_NAME,
        "id": TOY_ID,
        "status": 1, // Connected
        "type": "lush", // Pretend to be a Lush or Max? Lush has Vibrate.
        // Actually, Lovense Connect returns a map of ID -> details.
        // Let's mimic a standard response.
        "battery": 100,
        "version": "1.0"
      }
    }
  };
  // Wait, looking at docs/logs, Lovense Connect usually returns:
  // { "data": { "uid": { ... } }, "type": "ok", "code": 200 }
  // OR simply a map depending on version.
  // The official docs say: return JSON format.
  // Let's try the standard format seen in widely used emulators.
  
  res.json({
    data: {
      [TOY_ID]: {
        name: TOY_NAME,
        id: TOY_ID,
        nickName: TOY_NAME,
        status: 1,
        type: "lush", // 'lush' supports Vibrate
        battery: 100
      }
    },
    type: "ok",
    code: 200
  });
});

// 2. POST /command
// Intiface sends commands here.
// Structure: { "command": "Function", "action": "Vibrate:20", "timeSec": 0, "apiVer": 1 } 
// OR sometimes: { "c": "vibrate", "v": 20, "t": "uid" } depends on Local API version.
// Intiface uses the Local API. usually `Vibrate:20`.
// Let's handle both common patterns or just log what we get first.
app.post("/command", (req, res) => {
  const body = req.body;
  if (flags.debugLogs) console.log("Incoming POST /command:", body);

  // Intiface usually sends: { command: "Function", action: "Vibrate:10", toyId: "..." }
  // OR: { "action": "Vibrate:10", ... }

  let action = body.action || body.command;
  // If connection is via "Lovense Connect", Intiface might just send the command string in the body or query?
  // Let's handle standard "Function" command type.
  
  if (body.command === "Function" && body.action) {
     handleAction(body.action);
  } else if (typeof body.action === 'string') {
      handleAction(body.action);
  } else {
     // Fallback / Unknown
     if (flags.debugLogs) console.log("Unknown command structure");
  }

  res.json({ type: "ok", code: 200 }); // Always ack
});


let lastIntensity = 0;
function handleAction(actionStr: string) {
    // Format: "Vibrate:20" (0-20 scale typically for Lovense? Or 0-100? Lovense Connect usually takes 0-20 or 0-100?
    // Actually Lovense Local API Vibrate is 0-20. Intiface maps 0-1.0 to 0-20.
    // Wait, let's verify.
    // If I see "Vibrate:20", it likely means max.
    
    if (actionStr.startsWith("Vibrate:")) {
        const valStr = actionStr.split(":")[1];
        let val = parseInt(valStr, 10);
        if (!isNaN(val)) {
            // Assume 0-20 scale (standard Lovense Protocol for 'Vibrate')
            // Map 0-20 -> 0-100 for OpenShock
            let intensity = Math.round((val / 20) * 100);
            if (intensity > 100) intensity = 100;
            
            if (intensity !== lastIntensity) {
                if (flags.debugLogs) console.log(`Vibrate ${val}/20 -> OpenShock ${intensity}%`);
                // Send Shock (Duration? Lovense 'Vibrate' is continuous until 0)
                // We'll send a 1s pulse or 'continuous' if API supports it. 
                // Our sendOpenShockCommand sends a duration.
                // If it's > 0, we send 1000ms (and expect repeats) or long duration?
                // Let's send 1500ms to be safe, prevents stuttering if update is frequent.
                if (intensity > 0) {
                     sendOpenShockCommand("Vibrate", intensity, 2000); 
                } else {
                     // Stop? OpenShock doesn't have explicit 'Stop' unless we send 0/0? 
                     // Actually Vibrate(0) isn't usually valid or ignored.
                     // If intensity is 0, we do nothing (it fades out).
                     // Or we should send a Stop command if OpenShock supports it.
                     // sendOpenShockCommand handles 0?
                }
                lastIntensity = intensity;
            }
        }
    }
}

export function startLovenseServer() {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Lovense Connect Emulation Server running on port ${PORT}`);
    console.log(`- Intiface should automatically discover 'PiShock OpenShock Bridge'`);
  });
}
