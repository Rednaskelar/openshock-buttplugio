import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path, { join } from "path";
// Removed SerialOperateEnum import

import os from "os";

interface iConfig {
  min: number;
  max: number;
  openShockToken: string;
  openShockUrl: string;
  shockerId: string;
  hubPort: string; // OpenShock Hub Serial
  shockerModel: number;
  rfId: number;
  shockMode: boolean;
}

function getConfigDir(): string {
  if (process.env.DOCKER === "true") {
    return "/data/config.json";
  }
  if (process.platform === "win32") {
    return path.resolve(
      process.env.APPDATA!,
      "PiShock-ButtplugIO",
      "config.json"
    );
  }
  return path.join(
    os.homedir(),
    ".config",
    "PiShock-ButtplugIO",
    "config.json"
  );
}

class Config implements iConfig {
  private path: string = getConfigDir();
  public min: number = 0;
  public max: number = 100;
  public openShockToken: string = "";
  public openShockUrl: string = "https://api.openshock.app";
  public shockerId: string = "";
  public shockerModel: number = 0; // Default to CaiXianlin (0)
  public hubPort: string = ""; 
  public rfId: number = 0;
  public shockMode: boolean = false; // Default: Vibrate

  constructor() {
    this.load();
  }

  toJSON(): iConfig {
    return {
      min: this.min,
      max: this.max,
      openShockToken: this.openShockToken,
      openShockUrl: this.openShockUrl,
      shockerId: this.shockerId,
      hubPort: this.hubPort,
      shockerModel: this.shockerModel,
      rfId: this.rfId,
      shockMode: this.shockMode,
    };
  }

  load() {
    try {
      if (existsSync(this.path)) {
        const read: iConfig = JSON.parse(readFileSync(this.path, "utf-8"));
        if (read.min) this.min = read.min;
        if (read.max) this.max = read.max;
        if (read.openShockToken) this.openShockToken = read.openShockToken;
        if (read.openShockUrl) this.openShockUrl = read.openShockUrl;
        if (read.shockerId) this.shockerId = read.shockerId;
        if (read.hubPort) this.hubPort = read.hubPort;
        if (read.shockerModel !== undefined) this.shockerModel = read.shockerModel;
        if (read.rfId) this.rfId = read.rfId;
        if (read.shockMode !== undefined) this.shockMode = read.shockMode;
      }
    } catch (e) {
      console.error("Error loading config! Using defaults.", e);
    }
  }

  save() {
    if (!existsSync(join(this.path, ".."))) mkdirSync(join(this.path, ".."));
    writeFileSync(this.path, JSON.stringify(this.toJSON()));
  }
}

const config = new Config();
export default config;
