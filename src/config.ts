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
  lovensePort: number;
  shockerNames: Record<number, string>;
  serialPort: string;
  hubPort: string; // OpenShock Hub Serial
  shockerModel: number;
  rfId: number;
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
  public shockerModel: number = 1;
  public lovensePort: number = 54817;
  public serialPort: string = "CNCA0";
  public shockerNames: Record<number, string> = {};
  public hubPort: string = ""; 
  public rfId: number = 0;

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
      lovensePort: this.lovensePort,
      serialPort: this.serialPort,
      shockerNames: this.shockerNames,
      hubPort: this.hubPort,
      shockerModel: this.shockerModel,
      rfId: this.rfId,
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
        if (read.lovensePort) this.lovensePort = read.lovensePort;
        if (read.serialPort) this.serialPort = read.serialPort;
        if (read.shockerNames) this.shockerNames = read.shockerNames;
        if (read.hubPort) this.hubPort = read.hubPort;
        if (read.shockerModel !== undefined) this.shockerModel = read.shockerModel;
        if (read.rfId) this.rfId = read.rfId;
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
