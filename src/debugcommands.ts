// import { GlobalPort, sendCommand } from "serial";
// import { SerialCommandEnum } from "serial/types";
// import { SerialCommandOperate, SerialOperateEnum } from "serial/types/operate";


export const flags = {
  shouldSuppressConsole: false,
  debugLogs: false,
};

export async function runFirstDebugCommands() {
  if (process.argv.includes("-h") || process.argv.includes("--help"))
    sendHelpCommand();
  if (process.argv.includes("--debug")) flags.debugLogs = true;
}

// export default async function runDebugCommands() {
//   if (process.argv.includes("--serial")) await serialDebug(true);
//   if (process.argv.includes("--seriallogs")) await serialDebug(false);
//   if (process.argv.includes("--vibrate")) await vibrateDebug();
//   if (process.argv.includes("--shock")) await shockDebug();
// }
export default async function runDebugCommands() {
    console.log("Debug commands disabled in this version.");
}

function sendHelpCommand() {
  console.log(
    "Normally, this program is run without any arguments. However, there are certian ones for debug usage."
  );
  console.log("--help or -h shows this message!");
  console.log(
    "--serial opens a serial console where you can interface with the pishock hub"
  );
  console.log("--seriallogs just outputs the hub's logs to the console");
  console.log(
    "--vibrate sends a vibrate at 100 for 1 second to test your connection"
  );
  console.log(
    "--shock shocks you at 10 for 0.3 seconds to test your connection"
  );
  console.log("--debug outputs extra debug logs");
  console.log(
    "Your config file is stored at AppData/Roaming/Pishock-Buttplugio/config.json if you would like to edit it or check all the data i store."
  );
  process.exit(0);
}

// function serialDebug... disabled

// vibrateDebug disabled
// shockDebug disabled
