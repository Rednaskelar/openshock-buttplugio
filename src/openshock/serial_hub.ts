
// @ts-ignore
const { SerialPort, ReadlineParser } = require("serialport");
import config from "../config";

let hubPort: any = null;
let lastSentCmd: string = "";

export function initHubSerial(): Promise<void> {
    return new Promise((resolve) => {
        if (!config.hubPort) {
            resolve();
            return;
        }

        console.log(`[OpenShock Hub] Opening Serial Hub on ${config.hubPort}...`);
        try {
            hubPort = new SerialPort({
                path: config.hubPort,
                baudRate: 115200, // Standard ESP32 baud
                autoOpen: false
            });

            hubPort.open((err: any) => {
                if (err) {
                    console.error(`[OpenShock Hub] Failed to open ${config.hubPort}:`, err.message);
                    hubPort = null;
                    resolve();
                } else {
                    console.log(`[OpenShock Hub] Connected to Hub on ${config.hubPort}!`);
                    // Send 'help' to discover commands
                    setTimeout(() => {
                        if (hubPort) hubPort.write("help\n");
                        resolve();
                    }, 500); // Shorter wait, just enough to not block too long
                }
            });

        hubPort.on("error", (err: any) => {
             console.error(`[OpenShock Hub] Error:`, err.message);
        });

        const parser = hubPort.pipe(new ReadlineParser({ delimiter: '\n' }));
        parser.on("data", (line: string) => {
             // console.log(`[OpenShock Hub RX]: ${line.trim()}`);
        });

    } catch (e: any) {
        console.error(`[OpenShock Hub] Critical Error:`, e.message);
    }
    }); // Close Promise
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
