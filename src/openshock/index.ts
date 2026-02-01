import config from "config";

interface OpenShockControlRequest {
  shocks: {
    id: string;
    type: "Shock" | "Vibrate" | "Sound";
    intensity: number;
    duration: number;
    exclusive: boolean;
  }[];
  customName?: string;
}

import { liveClient } from "./live_client";
import { sendToHub } from "./serial_hub";
export { liveClient };

export interface OpenShockShocker {
    id: string;
    name: string;
    model: string;
    hubId: string;
}

export async function getShockers(): Promise<OpenShockShocker[]> {
    try {
         // 1. Try /2/shockers/own (Likely correct for V2)
         let response = await fetch(`${config.openShockUrl}/2/shockers/own`, {
            headers: { 
                "Open-Shock-Token": config.openShockToken,
                "Content-Type": "application/json"
            }
         });
         
         if (!response.ok) {
             response = await fetch(`${config.openShockUrl}/1/shockers/own`, {
                 headers: { "Open-Shock-Token": config.openShockToken }
             });
         }

         if (!response.ok) {
             response = await fetch(`${config.openShockUrl}/1/shockers`, {
                 method: "POST",
                 headers: { "Open-Shock-Token": config.openShockToken }
             });
         }

         if (!response.ok) {
             return [];
         }

         const data = await response.json();
         // Check if data is array (List) or object (Result)
         const list = Array.isArray(data) ? data : (data.data || []);
         
         const results: OpenShockShocker[] = [];
         
         // Search for Shocker directly or inside Hubs
         for (const item of list) {
             // 1. Direct Match (Flat list?)
             if (item.id && !item.shockers) {
                 results.push({
                     id: item.id,
                     name: item.name || "Unknown Device",
                     model: item.model || "Unknown",
                     hubId: item.hubId || item.deviceId || ""
                 });
             }
             // 2. Nested Match (Hub List)
             if (item.shockers && Array.isArray(item.shockers)) {
                 for (const s of item.shockers) {
                     results.push({
                         id: s.id,
                         name: s.name || "Unknown Shocker",
                         model: s.model || "Unknown",
                         hubId: item.id
                     });
                 }
             }
         }
         
         return results;
    } catch (e) {
        console.error("Error fetching shockers:", e);
        return [];
    }
}

export async function fetchHubId(shockerId: string): Promise<string | null> {
    const list = await getShockers();
    const found = list.find(s => s.id === shockerId);
    return found ? found.hubId : null;
}

export async function sendOpenShockCommand(
  type: "Shock" | "Vibrate" | "Sound",
  intensity: number,
  duration: number
) {
  // If Hub Port is configured, use Serial (Bypass API)
  // If Hub Port is configured, use Serial (Bypass API)
  if (config.hubPort) {
      const serialSuccess = sendToHub(type, intensity, duration);
      if (serialSuccess) return; 

      if (!config.apiFallback) {
         // Serial failed, but fallback disabled.
         return;
      }
      // Fallback enabled: proceed to API
  }

  // Fallback to Web API
  if (!config.openShockToken || !config.shockerId) {
    console.warn("OpenShock Token or Shocker ID not configured.");
    return;
  }

  // Live Control (WebSocket) Priority
  if (liveClient.sendFrame(config.shockerId, type, intensity)) {
     // Success via Live API - Logging suppressed to prevent spam
     // console.log(`[Live] ${type} ${intensity}%`);
     return;
  }
  // Fallback if not connected or failed

  const payload: OpenShockControlRequest = {
    shocks: [
      {
        id: config.shockerId,
        type: type,
        intensity: intensity,
        duration: duration,
        exclusive: true,
      },
    ],
    customName: "OpenShock-ButtplugIO Bridge",
  };

  try {
    const response = await fetch(`${config.openShockUrl}/2/shockers/control`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Open-Shock-Token": config.openShockToken,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `OpenShock API Error: ${response.status} ${response.statusText}`,
        await response.text()
      );
    } else {
        console.log(`[OpenShock] OK: ${type} ${intensity}% (${duration}ms)`);
    }
  } catch (error) {
    console.error("Failed to send OpenShock command:", error);
  }
}
