import WebSocket from "ws";
import config from "../config";

interface BaseRequest {
  requestType: "Frame" | "BulkFrame" | "Pong";
  data: any;
}

interface ClientLiveFrame {
  shocker: string;
  type: "Stop" | "Shock" | "Vibrate" | "Sound";
  intensity: number;
}

export class OpenShockLiveClient {
  private ws: WebSocket | null = null;
  private pingTimeout: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;

  constructor() {}

  public connect() {
    if (this.isConnected || this.isConnecting) return;
    
    if (!config.openShockLiveUrl || !config.hubId || !config.openShockToken) {
        console.warn("[Live] Missing Config (LiveURL, HubID, or Token). Skipping Live Connect.");
        return;
    }

    this.isConnecting = true;
    const url = `${config.openShockLiveUrl}/ws/live/${config.hubId}?tps=10`;
    console.log(`[Live] Connecting to ${url}...`);

    this.ws = new WebSocket(url, {
      headers: {
        "Open-Shock-Token": config.openShockToken,
        "Origin": "https://openshock.app", // Try to spoof origin just in case
        "User-Agent": "OpenShock-ButtplugIO/1.0"
      },
    });

    this.ws.on("open", () => {
      console.log("[Live] Connected!");
      this.isConnected = true;
      this.isConnecting = false;
    });

    this.ws.on("message", (data) => {
      this.handleMessage(data.toString());
    });

    this.ws.on("close", (code, reason) => {
      console.log(`[Live] Disconnected: ${code} ${reason}`);
      this.cleanup();
      // Auto-reconnect after 5s
      this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
    });

    this.ws.on("error", (err) => {
      console.error("[Live] Error:", err.message);
      this.ws?.close();
    });
  }

  private handleMessage(json: string) {
    try {
      const msg = JSON.parse(json); // Message Structure is loosely defined as envelope
      
      // Check for Pings (The prompt says ResponseType: "Ping")
      // But the doc says: "Server Ping: The server sends a message with ResponseType: 'Ping'"
      // However, the JSON example for Pong says "requestType": "Pong". 
      // It's likely the server sends { requestType: "Ping", data: ... } or similar?
      // Wait, "ResponseType" is mentioned for Ping. 
      // Let's assume the server sends { requestType: "Ping" } or { type: "Ping" } or similar.
      // Actually, standard usually implies looking at the structure.
      // If the field is `requestType` for client->server, it might be different for server->client.
      // But let's check for "Ping" in whatever type field exists.
      
      // Let's inspect the message. 
      // If it has ResponseType "Ping"
      if (msg.responseType === "Ping" || msg.requestType === "Ping" || msg.type === "Ping") {
         this.sendPong(msg.data);
      }

    } catch (e) {
      // Ignore parse errors (maybe empty or binary?)
    }
  }

  private sendPong(data: any) {
    if (!this.isConnected || !this.ws) return;
    const pong: BaseRequest = {
        requestType: "Pong",
        data: data || {}
    };
    this.ws.send(JSON.stringify(pong));
  }

  public sendFrame(shockerId: string, type: "Stop" | "Shock" | "Vibrate" | "Sound", intensity: number) {
      if (!this.isConnected || !this.ws) return false;

      const frame: BaseRequest = {
          requestType: "Frame",
          data: {
              shocker: shockerId,
              type: type,
              intensity: intensity
          } as ClientLiveFrame
      };

      try {
        this.ws.send(JSON.stringify(frame));
        return true;
      } catch (e) {
          console.error("[Live] Send Error:", e);
          return false;
      }
  }

  private cleanup() {
      this.isConnected = false;
      this.isConnecting = false;
      if (this.pingTimeout) clearTimeout(this.pingTimeout);
  }
}

export const liveClient = new OpenShockLiveClient();
