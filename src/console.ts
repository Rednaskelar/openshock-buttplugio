import config from "config";
import { createInterface } from "readline";
import { sendOpenShockCommand } from "./openshock";
import { getInRange, toggleShockMode } from "./serial/serial_server";

const commands: Record<string, (args: string[]) => void> = {
  help: () => {
    console.log("\n# Available Commands:");
    console.log("- setup         : Run the interactive configuration wizard.");
    console.log("- switch        : Toggle the slider mode between VIBRATE (Linear) and SHOCK.");
    console.log("- model <0-2>   : Set Hub Shocker Model (0=CaiXianlin, 1=Petrainer).");
    console.log("- rfid <id>     : Set the internal RF ID for the Hub.");
    console.log("- hubport <COM> : Set the OpenShock Hub Serial Port (e.g. COM30).");
    console.log("- token <str>   : Set OpenShock API Token (API Mode).");
    console.log("- shocker <id>  : Set OpenShock Shocker ID (API Mode).");
    console.log("- min <0-100>   : Set minimum intensity output.");
    console.log("- max <0-100>   : Set maximum intensity output.");
    console.log("- dumpconfig    : Display current configuration.");
    console.log("- testshock     : Send a test shock (10% for 300ms).");
    console.log("- testvibrate   : Send a test vibration (100% for 2s).");
  },
  dumpconfig: () => {
    console.log(JSON.stringify(config.toJSON()));
  },
  min: (args) => {
    if (!args[0]) console.error("Please put a number after the command!");
    config.min = Number(args[0]);
    config.save();
    console.log("Minimum set to " + args[0]);
  },
  minimum: (args) => commands.min(args),
  max: (args) => {
    if (!args[0]) console.error("Please put a number after the command!");
    config.max = Number(args[0]);
    config.save();
    console.log("Maximum set to " + args[0]);
  },
  maximum: (args) => commands.max(args),

  testrange: (args) => {
    const val = Number(args[0]);
    const inRange = getInRange(val);
    console.log("Input: " + val + ". Output: " + inRange);
  },

  token: (args) => {
    if (!args[0]) console.error("Please provide your OpenShock Token!");
    config.openShockToken = args[0];
    config.save();
    console.log("Token saved.");
  },
  shocker: (args) => {
    if (!args[0]) console.error("Please provide your OpenShock Shocker ID!");
    config.shockerId = args[0];
    config.save();
    console.log("Shocker ID saved: " + args[0]);
    console.log("Shocker ID saved: " + args[0]);
  },
  
  model: (args) => {
    if (!args[0]) return console.error("Usage: model <0|1|2> (0=CaiXianlin, 1=Petrainer, 2=Petrainer998DR)");
    const m = parseInt(args[0]);
    if (isNaN(m)) return console.error("Model must be a number!");
    config.shockerModel = m;
    config.save();
    console.log(`Shocker Model set to ${m}`);
  },

  rfid: (args) => {
      if (!args[0]) return console.error("Usage: rfid <number> (e.g. 50685)");
      const id = parseInt(args[0]);
      if (isNaN(id)) return console.error("ID must be a number!");
      config.rfId = id;
      config.save();
      console.log(`RF ID set to ${id}`);
  },

// Removed wifi, restart commands
// Removed wifi, restart, lovenseport commands
  
  hubport: (args) => {
    if (!args[0]) return console.error("Usage: hubport COM30 (or set to 'off' to disable)");
    if (args[0] === "off") {
        config.hubPort = "";
        console.log("OpenShock Hub Serial Disabled. Using Web API.");
    } else {
        config.hubPort = args[0];
        console.log("OpenShock Hub Serial set to " + args[0] + ". Restart to apply.");
    }
    config.save();
  },
  
  hubcmd: (args) => {
      const { sendRawToHub } = require("./openshock/serial_hub");
      const cmd = args.join(" ");
      sendRawToHub(cmd);
  },

  testshock: () => {
    console.log("Sending test shock (10%, 300ms)...");
    sendOpenShockCommand("Shock", 10, 300);
  },
  testvibrate: () => {
    console.log("Sending test vibrate (100%, 2000ms)...");
    sendOpenShockCommand("Vibrate", 100, 2000);
  },
  
  switch: () => {
    toggleShockMode();
  },
  
  setup: () => {
      console.log("Starting Setup...");
      if (rl) rl.close();
      const { runSetup } = require("./setup");
      runSetup();
  }
} as const;

let rl: any;

export default function runConsole() {
  rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("line", (line: string) => {
    const commandName = line.split(" ")[0];
    const command = commands[commandName.toLowerCase()];
    if (!command) console.error("Command Not Found!");
    else command(line.split(" ").slice(1));
  });

  commands.help([]);
}
