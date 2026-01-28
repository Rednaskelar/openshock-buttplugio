// @ts-ignore
const { SerialPort, ReadlineParser } = require("serialport");
import config from "../config";

let hubPort: any = null;
let lastSentCmd: string = "";

// Helper to look for Hub
async function findHubPort(): Promise<string | null> {
    console.log("[OpenShock Hub] Auto-discovering Hub...");
    let ports: any[] = [];
    try {
        ports = await SerialPort.list();
    } catch (e: any) {
        console.error("[OpenShock Hub] Failed to list ports:", e.message);
        return null;
    }

    // Filter for likely candidates (CH340, CP210x, standard USB-Serial stuff)
    // Common vendor IDs:
    // 10C4 (Silicon Labs), 1A86 (QinHeng), 2341 (Arduino), 0403 (FTDI)
    const candidates = ports.filter(p => {
        if (!p.vendorId) return false;
        const vid = p.vendorId.toUpperCase();
        return ["10C4", "1A86", "2341", "0403", "303A"].includes(vid);
    });

    if (candidates.length === 0) {
        console.log("[OpenShock Hub] No likely candidate ports found.");
        return null;
    }

    for (const portInfo of candidates) {
        console.log(`[OpenShock Hub] Probing ${portInfo.path}...`);
        const path = portInfo.path;
        
        try {
            const isHub = await probePort(path);
            if (isHub) {
                console.log(`[OpenShock Hub] FOUND Hub at ${path}!`);
                return path;
            }
        } catch (e) {
            console.log(`[OpenShock Hub] Probe failed for ${path}.`);
        }
    }

    return null;
}

function probePort(path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const port = new SerialPort({
            path: path,
            baudRate: 115200,
            autoOpen: false
        });

        const timeout = setTimeout(() => {
            if (port.isOpen) port.close();
            resolve(false);
        }, 3000); // 3 sec timeout

        port.open((err: any) => {
            if (err) {
                clearTimeout(timeout);
                resolve(false); // Can't open, not it
                return;
            }

            // Listen for data
            const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
            parser.on("data", (line: string) => {
                const trimmed = line.trim();
                // Check for expected signature
                if (trimmed.includes("OpenShock") || trimmed.includes("rftransmit") || trimmed.includes("help") || trimmed.includes("Unknown command")) {
                    clearTimeout(timeout);
                    port.close((err:any) => {
                        resolve(true);
                    });
                }
            });

            // Send probe
            // Wait a tiny bit for connection to settle
            setTimeout(() => {
               if(port.isOpen) port.write("\nhelp\n");
            }, 500);
        });
        
        port.on("error", () => {
             clearTimeout(timeout);
             resolve(false);
        });
    });
}


export async function initHubSerial(): Promise<void> {
    // 0. Check if disabled (API Mode)
    if (!config.hubPort) {
        return;
    }

    // 1. Try Configured Port first
    if (config.hubPort && config.hubPort !== "auto") {
        console.log(`[OpenShock Hub] Attempting saved port: ${config.hubPort}`);
        const success = await attemptConnection(config.hubPort);
        if (success) return;
        
        console.warn(`[OpenShock Hub] Saved port ${config.hubPort} failed. Starting auto-discovery...`);
    }

    // 2. Auto-Discovery
    const foundPath = await findHubPort();
    if (foundPath) {
        console.log(`[OpenShock Hub] Auto-discovery successful! Saving config.`);
        
        // Update Config
        config.hubPort = foundPath;
        config.save();

        // Connect
        await attemptConnection(foundPath);
    } else {
        console.warn("[OpenShock Hub] Auto-discovery failed. Hub not found.");
    }
}

function attemptConnection(path: string): Promise<boolean> {
     return new Promise((resolve) => {
        const port = new SerialPort({
            path: path,
            baudRate: 115200,
            autoOpen: false
        });

        port.open((err: any) => {
            if (err) {
                console.error(`[OpenShock Hub] Failed to open ${path}:`, err.message);
                resolve(false);
            } else {
                console.log(`[OpenShock Hub] Connected to Hub on ${path}!`);
                hubPort = port;
                
                hubPort.on("error", (err: any) => {
                    console.error(`[OpenShock Hub] Error:`, err.message);
                });

                const parser = hubPort.pipe(new ReadlineParser({ delimiter: '\n' }));
                parser.on("data", (line: string) => {
                     // console.log(`[OpenShock Hub RX]: ${line.trim()}`);
                });

                resolve(true);
            }
        });
     });
}

export function sendRawToHub(cmd: string) {
    if (hubPort && hubPort.isOpen) {
        hubPort.write(cmd + "\n");
        console.log(`[OpenShock Hub] TX Raw: ${cmd}`);
    } else {
        console.log("[OpenShock Hub] Port closed.");
    }
}

export function sendToHub(type: string, intensity: number, duration: number) {
    if (!hubPort || !hubPort.isOpen) {
         if (config.hubPort) console.warn("[OpenShock Hub] Port not open, cannot send.");
         return false; 
    }

    // Map numeric model to string name expected by Hub firmware
    const modelMap: Record<number, string> = {
        0: "CaiXianlin",
        1: "Petrainer",
        2: "Petrainer998DR" 
    };
    const modelNum = config.shockerModel ?? 1;
    const modelName = modelMap[modelNum] || "Petrainer";

    // Use explicit RF ID if set, otherwise try to parse the string ID (fallback)
    const targetId = config.rfId || parseInt(config.shockerId || "0");

    const payload = {
         id: targetId,
         model: modelName, 
         type: type, // "Shock", "Vibrate", "Sound"
         intensity: intensity,
         durationMs: duration,
    };

    const json = JSON.stringify(payload);
    const commandLine = `rftransmit ${json}\n`;

    // Deduplicate logs
    if (commandLine === lastSentCmd) {
        // Send but don't log
        hubPort.write(commandLine, (err: any) => {
             if (err) console.error("[OpenShock Hub] Write Error:", err);
        });
        return true;
    }
    lastSentCmd = commandLine;

    hubPort.write(commandLine, (err: any) => {
        if (err) console.error("[OpenShock Hub] Write Error:", err);
        else console.log(`[OpenShock Hub] TX: ${commandLine.trim()}`);
    });
    return true;
}
