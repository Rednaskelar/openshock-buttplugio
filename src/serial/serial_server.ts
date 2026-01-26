import config from "../config";
import { sendOpenShockCommand } from "../openshock";

// Force CJS require to bypass ESBuild analysis issues with native modules
// @ts-ignore
// ...
// Force CJS require to bypass ESBuild analysis issues with native modules
// @ts-ignore
const { SerialPort, ReadlineParser } = require("serialport");

let port: any = null;
// State tracking
// State tracking
let lastVibrate = 0;
let lastShock = 0;
let lastBeep = 0;
// Swap Mode
let shockMode = false;

export function toggleShockMode() {
    shockMode = !shockMode;
    console.log(`[Mode Switch] Slider 1 is now: ${shockMode ? "SHOCK" : "VIBRATE"}`);
}

export function startSerialServer() {
  if (!config.serialPort) {
    console.log("No Serial Port configured. Skipping Serial Emulation.");
    return;
  }

  console.log(`Attempting to open Serial Port: ${config.serialPort} (Baud 115200)...`);

  try {
    port = new SerialPort({
      path: config.serialPort,
      baudRate: 115200,
      autoOpen: false, 
    });

    // Lovense commands end with ';'
    const parser = port.pipe(new ReadlineParser({ delimiter: ';' }));

    port.open((err: any) => {
      if (err) {
        console.error(`FAILED to open Serial Port ${config.serialPort}:`, err.message);
        console.error("Make sure com0com is installed and the port name matches config (default CNCA0).");
      } else {
        console.log(`Serial Port ${config.serialPort} OPEN! Emulating Lovense Lush 2 (Single Slider Mode).`);
      }
    });

    // Handle generic errors
    port.on("error", (err: any) => {
      console.error("Serial Port Error:", err.message);
    });

    parser.on("data", (data: Buffer) => {
      const line = data.toString("utf-8").trim(); 
      if (line) console.log(`RX: ${line}`); // Force log
      
      handleLovenseCommand(line);
    });

  } catch (e: any) {
    console.error("Critical Error creating SerialPort:", e.message);
  }
}

function handleLovenseCommand(line: string) {
    // Lovense commands: "DeviceType;", "Vibrate:20;", "Vibrate1:20;", "Vibrate2:20;"
    
    // Handshake
    if (line.startsWith("DeviceType")) {
        if (port && port.isOpen) {
             // Emulate Lovense Lush 2 (Z) with FW 13
             // Format: Type:Version:MAC:MAC:MAC:MAC
             port.write("Z:13:00:00:00:00;");
             console.log("TX: Z:13:00:00:00:00; (Handshake - Lush 2)");
        }
        return;
    }
    
    if (line.startsWith("Battery")) {
        if (port && port.isOpen) port.write("100;");
        return;
    }

    // Parsing Helper
    const parseVal = (str: string, prefix: string) => {
        // Remove prefix, remove semicolon, parse
        const clean = str.replace(prefix, "").replace(";", "");
        return parseInt(clean, 10);
    };

    // Vibrate (Any motor or Motor 1)
    if (line.startsWith("Vibrate:") || line.startsWith("Vibrate1:")) {
        const val = parseVal(line, line.startsWith("Vibrate:") ? "Vibrate:" : "Vibrate1:");
        if (!isNaN(val)) {
            const intensity = (val / 20) * 100;
            
            if (shockMode) {
                // Mapped to SHOCK
                lastShock = intensity;
                console.log(`[Shock] (Slider 1) Level ${val}/20 -> ${Math.round(lastShock)}%`);
                // Clear the other mapping to avoid sticky values? 
                // No, just update target. But we should zero out Vibrate if we just switched?
                lastVibrate = 0; // Safety: Stop vibrating if we switch to shock
            } else {
                // Mapped to VIBRATE (Default)
                lastVibrate = intensity; 
                console.log(`[Vibrate] (Slider 1) Level ${val}/20 -> ${Math.round(lastVibrate)}%`);
                lastShock = 0; // Safety
            }
        }
    }
    
    // Vibrate2 (Secondary)
    if (line.startsWith("Vibrate2:")) {
        const val = parseVal(line, "Vibrate2:");
        if (!isNaN(val)) {
             const intensity = (val / 20) * 100;
             
             if (shockMode) {
                 // Mapped to VIBRATE (Swapped)
                 lastVibrate = intensity;
                 console.log(`[Vibrate] (Slider 2) Level ${val}/20 -> ${Math.round(lastVibrate)}%`);
             } else {
                 // Mapped to SHOCK (Default)
                 lastShock = intensity;
                 console.log(`[Shock] (Slider 2) Level ${val}/20 -> ${Math.round(lastShock)}%`);
             }
        }
    }
}

export function getInRange(value: number) {
  return config.min + (value / 100) * (config.max - config.min);
}

// Main State Loop
let previousVibrate = -1;
let previousShock = -1;
// let lastSendTime = 0; // Not needed for continuous mode

function sendLoop() {
  // Loop runs every 100ms (10Hz) to avoid Rate Limits.
  // Duration is 110ms to ensure overlap/continuity.

  // Vibrate
  if (lastVibrate > 0) {
       // Continuous send
       const level = getInRange(lastVibrate);
       if (Math.round(level) > 0) {
           sendOpenShockCommand("Vibrate", Math.round(level), 110); 
       }
  } 
  
  // Shock
  // User requested continuity here too.
  if (lastShock > 0) {
        const level = getInRange(lastShock);
        if (Math.round(level) > 0) {
            sendOpenShockCommand("Shock", Math.round(level), 110);
        }
  }
}

export function initSerialPersist() {
   // 10Hz loop which is safe for serial
   setInterval(sendLoop, 100); 
}
