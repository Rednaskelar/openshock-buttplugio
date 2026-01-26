import runDebugCommands, { flags, runFirstDebugCommands } from "debugcommands";
import runConsole from "./console";
import { startLovenseServer } from "./lovense_connect/index";
import { initHubSerial } from "./openshock/serial_hub";
import { initSerialPersist, startSerialServer } from "./serial/serial_server";

(async () => {
  runFirstDebugCommands();
  console.log("App Started! Hosting:\n 1. Serial Port Emulation (T-Code v0.3) [Default: CNCA0]\n 2. Lovense Connect Discovery (HTTP 20010)");

  runDebugCommands();

  if (!flags.shouldSuppressConsole) runConsole();

  // editIntifaceConfig(); // DISABLED
  
  startLovenseServer();
  startSerialServer();
  initSerialPersist();
  initHubSerial();
})();
