import { createInterface } from "readline";
import config from "./config";

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
  
  if (mode.trim().toUpperCase() === "A") {
      console.log("\n--- API Mode ---");
      const defaultUrl = config.openShockUrl || "https://api.openshock.app";
      const url = await question(`OpenShock URL [${defaultUrl}]: `);
      config.openShockUrl = url.trim() || defaultUrl;

      const defaultToken = config.openShockToken;
      const token = await question(`OpenShock Token [${defaultToken ? "***" : "Empty"}]: `);
      if (token.trim()) config.openShockToken = token.trim(); // Don't overwrite with empty if it was hidden/masked, unless explicit? Actually, for token, if they press enter, keep existing.

      const defaultShockerId = config.shockerId;
      const shockerId = await question(`Shocker ID [${defaultShockerId}]: `);
      config.shockerId = shockerId.trim() || defaultShockerId;

      // Clear Hub Config
      config.hubPort = "";
  } else {
      console.log("\n--- Serial Hub Mode ---");
      const defaultPort = config.hubPort || "COM30";
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

      const defaultRfId = config.rfId; // number
      const rfid = await question(`RF ID (e.g. 50685) [${defaultRfId}]: `);
      const rfidInput = rfid.trim();
        if (rfidInput) {
            config.rfId = parseInt(rfidInput);
        } else {
            config.rfId = defaultRfId;
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
