import { createInterface } from "readline";
import config from "./config";
import { fetchHubId, getShockers } from "./openshock";

export async function runSetup() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

  console.log("\n=== PiShock OpenShock Bridge Setup ===");
  console.log("Welcome! Let's configure your connection.");
  
  let mode = await question("Do you want to use Serial via OpenShock Hub (S) or OpenShock Cloud API (A)? [S/A]: ");
  while (!["S", "A"].includes(mode.trim().toUpperCase())) {
      mode = await question("Please enter 'S' for Serial or 'A' for API: ");
  }
  
  // Helper for API Setup
  const setupApiConfig = async () => {
       console.log("\n--- API Configuration ---");
       const defaultUrl = config.openShockUrl || "https://api.openshock.app";
       const url = await question(`OpenShock URL [${defaultUrl}]: `);
       config.openShockUrl = url.trim() || defaultUrl;

       // Live URL
       const defaultLive = config.openShockLiveUrl || "wss://de1-gateway.openshock.app/1";
       const liveUrl = await question(`Live Control URL [${defaultLive}]: `);
       config.openShockLiveUrl = liveUrl.trim() || defaultLive;

       const defaultToken = config.openShockToken;
       const token = await question(`OpenShock Token [${defaultToken ? "***" : "Empty"}]: `);
       if (token.trim()) config.openShockToken = token.trim(); 

       const defaultShockerId = config.shockerId;
      
       console.log("\nFetching available shockers...");
       const shockers = await getShockers();
      
       let selectedShocker: { id: string, hubId: string } | null = null;

       if (shockers.length > 0) {
           console.log("\nFound Shockers:");
           shockers.forEach((s, idx) => {
               console.log(`[${idx + 1}] ${s.name} (Model: ${s.model}) - ID: ${s.id}`);
           });
           console.log(`[0] Manual Entry`);
           
           while (true) {
             const selection = await question(`\nSelect Shocker [1]: `);
             const choice = selection.trim() || "1";
             const idx = parseInt(choice);
             
             if (choice === "0") {
                 break; // Manual
             }
             
             if (!isNaN(idx) && idx >= 1 && idx <= shockers.length) {
                 const s = shockers[idx - 1];
                 console.log(`Selected: ${s.name}`);
                 config.shockerId = s.id;
                 config.hubId = s.hubId;
                 selectedShocker = { id: s.id, hubId: s.hubId };
                 break;
             }
             console.log("Invalid selection. Please try again.");
           }
       } else {
           console.log("No shockers found automatically.");
       }

       if (!selectedShocker) {
           const shockerId = await question(`Shocker ID [${defaultShockerId}]: `);
           config.shockerId = shockerId.trim() || defaultShockerId;

           // Only search for Hub ID if manual entry
           console.log("\nAttempting to find Hub ID for Live Control...");
           let hubId = await fetchHubId(config.shockerId);
           if (hubId) {
              console.log(`Found Hub ID: ${hubId}`);
              config.hubId = hubId;
           } else {
              console.log("Could not find Hub ID automatically.");
              const defaultHubId = config.hubId;
              const userHubId = await question(`Hub ID (Required for Live Control) [${defaultHubId}]: `);
              config.hubId = userHubId.trim() || defaultHubId;
           }
       } else {
           if (!config.hubId) {
              console.log("Warning: Selected shocker has no Hub ID.");
              const defaultHubId = config.hubId;
              const userHubId = await question(`Hub ID (Required for Live Control) [${defaultHubId}]: `);
              config.hubId = userHubId.trim() || defaultHubId;
           }
       }
       // Clear Hub Config (Only if Pure API Mode? No, keep it just in case fallback is mixed)
       // But usually logic sets hubPort="" in API mode.
       // In Fallback mode, we WANT hubPort.
  };

  if (mode.trim().toUpperCase() === "A") {
      console.log("\n--- API Mode ---");
      await setupApiConfig();
      config.hubPort = "";
      config.apiFallback = false; 
  } else {
      console.log("\n--- Serial Hub Mode ---");
      const defaultPort = config.hubPort || "auto";
      const port = await question(`Hub COM Port (e.g. COM30) [${defaultPort}]: `);
      config.hubPort = port.trim() || defaultPort;

      const defaultModel = config.shockerModel; // number
      const model = await question(`Shocker Model (0=CaiXianlin, 1=Petrainer) [${defaultModel}]: `);
      const modelInput = model.trim();
      if (modelInput) {
          config.shockerModel = parseInt(modelInput);
      } else {
          config.shockerModel = defaultModel;
      }

      const defaultRfId = config.rfId || 50685;
      const rfid = await question(`RF ID (e.g. 50685) [${defaultRfId}]: `);
      const rfidInput = rfid.trim();
        if (rfidInput) {
            config.rfId = parseInt(rfidInput);
        } else {
            config.rfId = defaultRfId;
        }

      // Fallback Question
      const fallback = await question("Enable API Fallback if Serial fails? (Y/N) [N]: ");
      if (fallback.trim().toUpperCase() === "Y") {
          config.apiFallback = true;
          await setupApiConfig();
      } else {
          config.apiFallback = false;
      }
  }

  console.log("\nConfiguration Saved!");
  config.save();
  
  console.log("Setup complete. The application will now close.");
  console.log("Please RESTART the application to apply your new settings.");
  
  await question("\nPress ENTER to close...");
  rl.close();
  process.exit(0); 
}
