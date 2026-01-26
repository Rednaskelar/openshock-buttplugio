import runDebugCommands, { flags, runFirstDebugCommands } from "debugcommands";
import runConsole from "./console";
import { initHubSerial } from "./openshock/serial_hub";
import { initSerialPersist, startSerialServer } from "./serial/serial_server";

(async () => {
  runFirstDebugCommands();
  console.log("App Started! Hosting:\n 1. Serial Port Emulation (Lovense Protocol) [Connect Intiface to: CNCB0]");

  runDebugCommands();

  if (!flags.shouldSuppressConsole) runConsole();

  // editIntifaceConfig(); // DISABLED
  
  startSerialServer();
  initSerialPersist();
  initHubSerial();
})();
