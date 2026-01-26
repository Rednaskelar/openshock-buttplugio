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
      const url = await question(`OpenShock URL [${config.openShockUrl}]: `);
      if(url.trim()) config.openShockUrl = url.trim();

      const token = await question(`OpenShock Token [${config.openShockToken ? "***" : ""}]: `);
      if(token.trim()) config.openShockToken = token.trim();

      const shockerId = await question(`Shocker ID [${config.shockerId}]: `);
      if(shockerId.trim()) config.shockerId = shockerId.trim();

      // Clear Hub Config
      config.hubPort = "";
  } else {
      console.log("\n--- Serial Hub Mode ---");
      const port = await question(`Hub COM Port (e.g. COM30) [${config.hubPort || "COM30"}]: `);
      if(port.trim()) config.hubPort = port.trim();

      const model = await question(`Shocker Model (0=CaiXianlin, 1=Petrainer) [${config.shockerModel}]: `);
      if(model.trim()) config.shockerModel = parseInt(model.trim());

      const rfid = await question(`RF ID (e.g. 50685) [${config.rfId || "0"}]: `);
      if(rfid.trim()) config.rfId = parseInt(rfid.trim());
  }

  console.log("\nConfiguration Saved!");
  config.save();
  
  console.log("Setup complete. The application will now close.");
  console.log("Please RESTART the application to apply your new settings.");
  
  await question("\nPress ENTER to close...");
  rl.close();
  process.exit(0); 
}
