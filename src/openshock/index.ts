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

import { sendToHub } from "./serial_hub";

export async function sendOpenShockCommand(
  type: "Shock" | "Vibrate" | "Sound",
  intensity: number,
  duration: number
) {
  // If Hub Port is configured, use Serial (Bypass API)
  if (config.hubPort) {
      sendToHub(type, intensity, duration);
      return; 
  }

  // Fallback to Web API
  if (!config.openShockToken || !config.shockerId) {
    console.warn("OpenShock Token or Shocker ID not configured.");
    return;
  }
// ...

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
    customName: "PiShock-ButtplugIO Bridge",
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
