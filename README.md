# OpenShock-ButtplugIO

A bridge between **Intiface Central (Buttplug.io)** and **OpenShock**.  
This application allows you to control OpenShock shockers using any software that supports Intiface (games, script players, etc.).

## Features

- **Two Operation Modes**:
    - **OpenShock Hub Serial**: Connects *directly* to your OpenShock Hub via USB. Zero latency, bypasses API rate limits.
    - **OpenShock API**: Connects via the cloud API (requires Token & Shocker ID).
- **Serial Emulation**: Emulates a **Lovense Lush 2** on `CNCA0`. Intiface connects to the paired `CNCB0` port.
- **Mode Persistence**: Toggle between **Vibrate** (linear) and **Shock** modes using the `switch` command. Your preference is saved!
- **Setup Wizard**: Interactive setup on first run to get you started quickly.

## Prerequisites

1.  **Node.js**: If building from source.
2.  **com0com**: **REQUIRED**. This software creates virtual serial port pairs (`CNCA0` <-> `CNCB0`).
    -   Download signed version for Windows from [SourceForge](https://sourceforge.net/projects/com0com/files/com0com/3.0.0.0/).
    -   Create a pair named `CNCA0` and `CNCB0`.

## Installation & Setup

1.  Download the latest release (`OpenShock-ButtplugIO.exe`).
2.  **First Run**: Run the executable. It will launch the **Setup Wizard**.
    -   Choose **Serial (S)** if you have the Hub plugged in via USB (Recommended).
    -   Choose **API (A)** if you want to control it over the internet.
3.  **Intiface Central Configuration**:
    -   Go to **Settings** -> **App Modes** -> **Show Advanced/Experimental Settings (ON)**.
    -   Go to **Device Managers** -> **Serial Port (ON)**.
    -   Go to the **Devices** tab -> **Add Serial Device**:
        -   **Protocol**: `Lovense`
        -   **Port**: `CNCB0`
        -   **Baud**: `115200`, Data: `8`, Parity: `None`, Stop: `1`.
    -   Click **Start Scanning**. It should detect a device named `Lovense Lush 2`.

## Usage

Once connected, any Vibrate command sent to the "Lovense Lush 2" in Intiface will be forwarded to your shocker.

### Console Commands

Type these in the application window:

-   `help`: Show all available commands.
-   `setup`: **Re-run the setup wizard.**
-   `switch`: Toggle the slider mode between **Vibrate** and **Shock**.
-   `hubport COMx`: Set the OpenShock Hub Serial Port (e.g., `hubport COM30`).
-   `model <0-2>`: Set Shocker Model (0=CaiXianlin, 1=Petrainer).
-   `rfid <id>`: Set the internal RF ID / Shocker ID.
-   `dumpconfig`: Show current settings.

## Troubleshooting

-   **"Port Busy" / Access Denied**: Make sure you aren't trying to connect Intiface to `CNCA0` (the app uses that). Connect Intiface to `CNCB0`.
-   **No Response**: Check the app console. If you don't see "RX:" logs when you start the toy in Intiface, Intiface isn't sending data properly.
