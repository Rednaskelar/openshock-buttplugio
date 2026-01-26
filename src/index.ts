import runDebugCommands, { flags, runFirstDebugCommands } from "debugcommands";
import config from "./config";
import runConsole from "./console"; // Assumes I'll export closeConsole or handle RL
import { initHubSerial } from "./openshock/serial_hub";
import { initSerialPersist, startSerialServer } from "./serial/serial_server";
import { runSetup } from "./setup";

(async () => {
    // Check Config
    if (!config.hubPort && (!config.openShockToken && !config.shockerId)) {
        await runSetup();
        return;
    }
  runFirstDebugCommands();
  console.log("=================================================================================");
  console.log("                                  OpenShock Bridge                               ");
  console.log("=================================================================================");
  console.log("1. Install com0com (Virtual Serial Port Driver) if you haven't already.");
  console.log("2. Open Intiface Central");
  console.log("   -> Settings -> App Modes -> Show Advanced/Experimental Settings (ON)");
  console.log("   -> Device Managers -> Serial Port (ON)");
  console.log("3. Go to 'Devices' tab -> 'Add Serial Device'");
  console.log("   -> Protocol: Lovense");
  console.log("   -> Port: CNCB0 (The pair of this app's CNCA0)");
  console.log("   -> Baud: 115200, Data: 8, Parity: None, Stop: 1");
  console.log("4. Click 'Start Scanning' in Intiface.");
  console.log("=================================================================================");
  console.log("App Started!");
  console.log(" ");
  console.log("Type 'help' for a list of commands.");
  runDebugCommands();

  if (!flags.shouldSuppressConsole) runConsole();

  // editIntifaceConfig(); // DISABLED
  
  await startSerialServer();
  await initHubSerial();
  initSerialPersist();
})();
