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
// Swap Mode
let shockMode = config.shockMode;

export function toggleShockMode() {
    shockMode = !shockMode;
    config.shockMode = shockMode;
    config.save();
    console.log(`[Mode Switch] Slider 1 is now: ${shockMode ? "SHOCK" : "VIBRATE"}`);
}

export function startSerialServer(): Promise<void> {
  return new Promise((resolve) => {
      console.log(`Attempting to open Serial Port: CNCA0 (Baud 115200)...`);

      try {
        port = new SerialPort({
          path: "CNCA0",
          baudRate: 115200,
          autoOpen: false, 
        });

        // Lovense commands end with ';'
        const parser = port.pipe(new ReadlineParser({ delimiter: ';' }));

        port.open((err: any) => {
          if (err) {
            console.error(`FAILED to open Serial Port CNCA0:`, err.message);
            console.error("Make sure com0com is installed and the port name matches config (default CNCA0).");
            // Resolve anyway to let app continue
            resolve();
          } else {
            console.log(`Serial Port CNCA0 OPEN! Emulating Lovense Lush 2 (Single Slider Mode).`);
            resolve();
          }
        });

    // Handle generic errors
    port.on("error", function (err: any) {
      console.error(`Error opening CNCA0: `, err.message);
    });

    port.on("open", function () {
      console.log(`Serial Port CNCA0 Open! Ready for Intiface at CNCB0.`);
    });

    parser.on("data", (data: Buffer) => {
      const line = data.toString("utf-8").trim(); 
      if (line) console.log(`RX: ${line}`); // Force log
      
      handleLovenseCommand(line);
    });

  } catch (e: any) {
    console.error("Critical Error creating SerialPort:", e.message);
  }
  }); 
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

let previousShock = -1;
// let lastSendTime = 0; // Not needed for continuous mode

function sendLoop(duration: number) {
  // Loop duration is passed in.

  // Vibrate
  if (lastVibrate > 0) {
       // Continuous send
       const level = getInRange(lastVibrate);
       if (Math.round(level) > 0) {
           sendOpenShockCommand("Vibrate", Math.round(level), duration); 
       }
  } 
  
  // Shock
  // User requested continuity here too.
  if (lastShock > 0) {
        const level = getInRange(lastShock);
        if (Math.round(level) > 0) {
            sendOpenShockCommand("Shock", Math.round(level), duration);
        }
  }
}

export function initSerialPersist() {
   // Check if we are using Serial Hub or API
   const useSerial = !!config.hubPort; // If hubPort is set, we are using serial.
   
   const interval = useSerial ? 100 : 1000;
   const duration = useSerial ? 110 : 1100;
   
   console.log(`[Persist] Starting Control Loop: Interval ${interval}ms, Duration ${duration}ms (${useSerial ? "Serial Mode" : "API Mode"})`);

   setInterval(() => sendLoop(duration), interval); 
}
