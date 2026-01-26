import config from "config";
import { flags } from "debugcommands";
import WebSocket, { WebSocketServer } from "ws";
import { sendOpenShockCommand } from "../openshock";

export const DEVICE_ADDRESS_PREFIX = "P1SH0CK";

export function getInRange(value: number) {
  return config.min + (value / 100) * (config.max - config.min);
}

let lastSentValue = 0;

function sendShock() {
  const level = getInRange(lastSentValue);
  // Defaulting to "Shock" type for now if config isn't specifying it per command, 
  // but let's assume Vibrate for safety unless specified? 
  // Actually the original code had "config.type". 
  // Let's assume Vibrate for safety as "Vibrate" level is what Intiface sends usually.
  // Wait, Intiface sends "Vibrate" cmd.
  sendOpenShockCommand("Vibrate", Math.round(level), 1000); // 1s default duration for continuous updates
}

export function initPersistTimer() {
  setInterval(sendShock, 5000);
}

export function connectButtplug() {
  const wss = new WebSocketServer({ port: config.lovensePort, host: "127.0.0.1" });
  
  wss.on("listening", () => {
    console.log(`Lovense Emulation Server listening on 127.0.0.1:${config.lovensePort}`);
  });

  wss.on("error", (err) => {
    console.error(`Server Error (Port ${config.lovensePort} busy/blocked?):`, err);
  });

  wss.on("connection", (ws) => {
    console.log("Intiface connected to us (T-Code Bridge)!");
    
    ws.on("message", (data: WebSocket.Data) => {
      const packet = data.toString("utf-8").trim();
      // T-Code v0.3: L<Channel><Value>I<Interval>
      // Example: L0050 (Channel 0, Value 50) or L0999 (Channel 0, Value 999)
      // Intiface's tcode-v03 implementation usually sends L0 + 3-4 digits.
      // We will look for L0 followed by digits.
      
      const commands = packet.split(/\s+/); // TCode can send multiple commands space-separated: "L0000 L1000 L2000"
      
      for (const cmd of commands) {
        if (cmd.startsWith("L0")) {
           // L0 is Linear Axis 0 (Vibration for us)
           const valStr = cmd.substring(2).replace(/I.*$/, ""); // Strip Interval if present
           let rawValue = parseInt(valStr, 10);
           
           if (!isNaN(rawValue)) {
             // Normalize to 0-100.
             // Assume 0-999 range (standard 10-bit-ish TCode often used in OSR) or 0-99.
             // Safe heuristic: If val > 100, assume 999 max.
             let intensity = 0;
             if (rawValue > 100) {
                intensity = Math.round((rawValue / 999) * 100);
             } else {
                 // Even if it's 0-99, rawValue is directly 0-99.
                 // But wait, if it's 0-999, 50 means 5%. If it's 0-100, 50 means 50%.
                 // Intiface LinearCmd usually maps 0.0-1.0 to 0-target_range.
                 // In our config we set step-range [0, 999].
                 // So Intiface SHOULD send 0-999.
                 intensity = Math.round((rawValue / 999) * 100);
             }
             
             // Clamp
             if (intensity > 100) intensity = 100;
             if (intensity < 0) intensity = 0;
             
             if (flags.debugLogs) console.log(`T-Code L0: ${cmd} -> Intensity: ${intensity}`);

             lastSentValue = intensity;
             sendShock();
           }
        }
      }
      
      if (flags.debugLogs && !packet.startsWith("L0")) {
           console.log(`Ignored Unknown T-Code: ${packet}`);
      }
    });

    ws.on("error", (err) => {
      if (flags.debugLogs) console.error("WebSocket Error:", err);
    });
  });
}
