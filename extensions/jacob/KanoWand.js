// Name: Kano Wand
// ID: kanowand
// Description: Connect to a Kano Harry Potter Coding Wand over Web Bluetooth.
// License: MPL-2.0
// By: Jacob
// Original: GammaGames

(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) {
    throw new Error("Kano Wand must run unsandboxed");
  }

  const runtime = Scratch.vm.runtime;

  const EXTENSION_ID = "kanowand";

  const INFO_SERVICE_UUID = "64a70010-f691-4b93-a6f4-0968f5b648f8";
  const HARDWARE_UUID = "64a70001-f691-4b93-a6f4-0968f5b648f8";
  const SOFTWARE_UUID = "64a70013-f691-4b93-a6f4-0968f5b648f8";

  const IO_SERVICE_UUID = "64a70012-f691-4b93-a6f4-0968f5b648f8";
  const BUTTON_UUID = "64a7000d-f691-4b93-a6f4-0968f5b648f8";
  const BATTERY_UUID = "64a70007-f691-4b93-a6f4-0968f5b648f8";
  const VIBRATOR_UUID = "64a70008-f691-4b93-a6f4-0968f5b648f8";
  const LED_UUID = "64a70009-f691-4b93-a6f4-0968f5b648f8";
  const KEEP_ALIVE_UUID = "64a7000f-f691-4b93-a6f4-0968f5b648f8";

  const SENSOR_SERVICE_UUID = "64a70011-f691-4b93-a6f4-0968f5b648f8";
  const POSITION_UUID = "64a70002-f691-4b93-a6f4-0968f5b648f8";
  const POSITION_RESET_UUID = "64a70004-f691-4b93-a6f4-0968f5b648f8";
  const TEMPERATURE_UUID = "64a70014-f691-4b93-a6f4-0968f5b648f8";

  const SPELLS = [
    { id: 0, name: "NONE" },
    { id: 1, name: "STUPEFY" },
    { id: 2, name: "WINGARDIUM_LEVIOSA" },
    { id: 3, name: "REDUCIO" },
    { id: 4, name: "FLIPENDO" },
    { id: 5, name: "EXPELLIARMUS" },
    { id: 6, name: "INCENDIO" },
    { id: 7, name: "LUMOS" },
    { id: 8, name: "LOCOMOTOR" },
    { id: 9, name: "ENGORGIO" },
    { id: 10, name: "AGUAMENTI" },
    { id: 11, name: "AVIS" },
    { id: 12, name: "REDUCTO" },
  ];

  const VIBRATION_PATTERNS = {
    REGULAR: [0x01],
    SHORT: [0x02],
    BURST: [0x03],
    LONG: [0x04],
    SHORT_LONG: [0x05],
    SHORT_SHORT: [0x06],
    MEDIUM_LONG: [0x07],
    RAMP_UP: [0x02, 0x03, 0x04],
    RAMP_DOWN: [0x04, 0x03, 0x02],
  };

  const SPELL_GESTURES = {
    STUPEFY: ["DL", "R", "DL"],
    WINGARDIUM_LEVIOSA: ["DR", "R", "UR", "D"],
    REDUCIO: ["UL", "UR"],
    FLIPENDO: ["DR", "U", "UR", "DR", "UR"],
    EXPELLIARMUS: ["R", "D"],
    INCENDIO: ["UR", "U", "D", "UL", "L", "DL"],
    LUMOS: ["UR", "U", "DR"],
    LOCOMOTOR: ["U", "D", "DR", "R", "L"],
    ENGORGIO: ["DR", "DL"],
    AGUAMENTI: ["UR", "R", "DR"],
    AVIS: ["UR", "R", "DR", "UR", "R", "DR"],
    REDUCTO: ["D", "R", "U"],
  };

  const WAND_SENSOR_TO_TIP_MM = 280;
  const WAND_ROLL_TO_TIP_SCALE = 1.45;

  const iconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="#7B3F00" d="M6 25.5 23.5 8 25 9.5 7.5 27z"/><path fill="#C7923E" d="m22.4 6.9 2.7 2.7 1.7-1.7-2.7-2.7z"/><path fill="#FFD66E" d="m8 5 1 2 2 1-2 1-1 2-1-2-2-1 2-1zm17 11 .8 1.6 1.7.9-1.7.9L25 22l-.8-1.6-1.7-.9 1.7-.9zM17 3l.7 1.3L19 5l-1.3.7L17 7l-.7-1.3L15 5l1.3-.7z"/></svg>';
  const blockIconURI = `data:image/svg+xml,${encodeURIComponent(iconSvg)}`;

  const round = (value) => Math.round(Number(value || 0) * 100) / 100;
  const clampByte = (value) =>
    Math.max(0, Math.min(255, Math.round(Number(value) || 0)));

  const parseHexColor = (color) => {
    const normalized = String(color || "#000000").trim();
    const match = /^#?([0-9a-f]{6})$/i.exec(normalized);
    let hex = "000000";
    if (match) {
      hex = match[1];
    }
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  };

  /**
   * TurboWarp extension for the Kano Harry Potter Coding Wand.
   *
   * BLE packet layout and UUIDs are based on the community Python library at
   * https://github.com/GammaGames/kano_wand and preservation notes from the
   * Kano wand community.
   */
  class KanoWand {
    constructor() {
      this.device = null;
      this.server = null;
      this.wandName = "";
      this.keepAliveTimer = null;
      this.connected = false;
      this.connecting = false;
      this.bleOperationQueue = Promise.resolve();
      this.buttonPressed = false;
      this.batteryPercentageValue = 0;
      this.lastSpellId = 0;
      this.lastSpellNameValue = "NONE";
      this.lastGestureValue = "";

      this.characteristics = {
        hardware: null,
        software: null,
        positionReset: null,
        button: null,
        battery: null,
        vibrator: null,
        led: null,
        keepAlive: null,
        position: null,
        temperature: null,
      };

      this.position = { x: 0, y: 0, z: 0 };
      this.smoothedPosition = { x: 0, y: 0, z: 0 };
      this.tipPosition = { x: 0, y: 0 };
      this.smoothedTipPosition = { x: 0, y: 0 };
      this.lastStableTipPosition = { x: 0, y: 0 };
      this.euler = { pitch: 0, roll: 0, yaw: 0 };
      this.accelerometer = { x: 0, y: 0, z: 0 };
      this.gyroscope = { x: 0, y: 0, z: 0 };
      this.quaternion = { w: 1, x: 0, y: 0, z: 0 };
      this.positionHistory = [];
      this.tipHistory = [];
      this.gesturePoints = [];
      this.gestureSmoothedPoint = null;
      this.gestureOrigin = null;
      this.gestureStartTime = 0;
      this.gestureDirectionAnchor = null;
      this.pendingGestureDirection = null;
      this.pendingGestureDirectionCount = 0;
      this.committedGestureDirections = [];
      this.gestureVelocityHistory = [];
      this.lastMovementDirection = "STILL";
    }

    getInfo() {
      return {
        id: EXTENSION_ID,
        name: Scratch.translate("Kano Wand"),
        color1: "#7B3F00",
        color2: "#5C2E00",
        color3: "#3D1F00",
        docsURI: "https://extensions.turbowarp.org/jacob/KanoWand",
        blockIconURI,
        menuIconURI: blockIconURI,
        blocks: [
          {
            blockType: Scratch.BlockType.LABEL,
            text: Scratch.translate("Connection"),
          },
          {
            opcode: "isWebBluetoothAvailable",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("Web Bluetooth available?"),
          },
          {
            opcode: "connect",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("connect to Kano Wand"),
          },
          {
            opcode: "disconnect",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("disconnect Kano Wand"),
          },
          {
            opcode: "whenConnected",
            blockType: Scratch.BlockType.HAT,
            text: Scratch.translate("when Kano Wand connected"),
            isEdgeActivated: false,
          },
          {
            opcode: "whenDisconnected",
            blockType: Scratch.BlockType.HAT,
            text: Scratch.translate("when Kano Wand disconnected"),
            isEdgeActivated: false,
          },
          {
            opcode: "isConnected",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("Kano Wand connected?"),
          },
          {
            opcode: "getWandName",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("wand name"),
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: Scratch.translate("Motion"),
          },
          {
            opcode: "getPosition",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("position [AXIS]"),
            arguments: {
              AXIS: {
                type: Scratch.ArgumentType.STRING,
                menu: "axisMenu",
                defaultValue: "x",
              },
            },
          },
          {
            opcode: "getRawPosition",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("raw position [AXIS]"),
            arguments: {
              AXIS: {
                type: Scratch.ArgumentType.STRING,
                menu: "axisMenu",
                defaultValue: "x",
              },
            },
          },
          {
            opcode: "getRawX",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("raw x"),
          },
          {
            opcode: "getRawY",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("raw y"),
          },
          {
            opcode: "getRawZ",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("raw z"),
          },
          {
            opcode: "getTipPosition",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("tip position [AXIS]"),
            arguments: {
              AXIS: {
                type: Scratch.ArgumentType.STRING,
                menu: "tipAxisMenu",
                defaultValue: "x",
              },
            },
          },
          {
            opcode: "getTipX",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("tip x"),
          },
          {
            opcode: "getTipY",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("tip y"),
          },
          {
            opcode: "getPitch",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("pitch"),
          },
          {
            opcode: "getRoll",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("roll"),
          },
          {
            opcode: "getYaw",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("yaw"),
          },
          {
            opcode: "getMovementSpeed",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("movement speed"),
          },
          {
            opcode: "getMovementDirection",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("movement direction"),
          },
          {
            opcode: "whenWandMoves",
            blockType: Scratch.BlockType.HAT,
            text: Scratch.translate("when wand moves"),
            isEdgeActivated: false,
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: Scratch.translate("Advanced sensors"),
          },
          {
            opcode: "getAccelerometer",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("accelerometer [AXIS]"),
            arguments: {
              AXIS: {
                type: Scratch.ArgumentType.STRING,
                menu: "axisMenu",
                defaultValue: "x",
              },
            },
          },
          {
            opcode: "getGyroscope",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("gyroscope [AXIS]"),
            arguments: {
              AXIS: {
                type: Scratch.ArgumentType.STRING,
                menu: "axisMenu",
                defaultValue: "x",
              },
            },
          },
          {
            opcode: "getQuaternion",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("quaternion [COMPONENT]"),
            arguments: {
              COMPONENT: {
                type: Scratch.ArgumentType.STRING,
                menu: "quaternionMenu",
                defaultValue: "w",
              },
            },
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: Scratch.translate("Button"),
          },
          {
            opcode: "whenPressed",
            blockType: Scratch.BlockType.HAT,
            text: Scratch.translate("when wand button pressed"),
            isEdgeActivated: false,
          },
          {
            opcode: "whenReleased",
            blockType: Scratch.BlockType.HAT,
            text: Scratch.translate("when wand button released"),
            isEdgeActivated: false,
          },
          {
            opcode: "isPressed",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("wand button pressed?"),
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: Scratch.translate("Spells"),
          },
          {
            opcode: "whenAnySpellCast",
            blockType: Scratch.BlockType.HAT,
            text: Scratch.translate("when any spell cast"),
            isEdgeActivated: false,
          },
          {
            opcode: "whenSpecificSpellCast",
            blockType: Scratch.BlockType.HAT,
            text: Scratch.translate("when spell [SPELL] cast"),
            isEdgeActivated: false,
            arguments: {
              SPELL: {
                type: Scratch.ArgumentType.STRING,
                menu: "spellMenu",
                defaultValue: "STUPEFY",
              },
            },
          },
          {
            opcode: "getLastSpellName",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("last spell name"),
          },
          {
            opcode: "getLastSpellId",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("last spell id"),
          },
          {
            opcode: "getLastGesture",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("last gesture"),
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: Scratch.translate("LED"),
          },
          {
            opcode: "setColor",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("set wand color [COLOR]"),
            arguments: {
              COLOR: {
                type: Scratch.ArgumentType.COLOR,
                defaultValue: "#ffcc00",
              },
            },
          },
          {
            opcode: "setRGB",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("set wand RGB r [R] g [G] b [B]"),
            arguments: {
              R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 255 },
              G: { type: Scratch.ArgumentType.NUMBER, defaultValue: 204 },
              B: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "turnOffLed",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("turn wand light off"),
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: Scratch.translate("Vibration"),
          },
          {
            opcode: "vibrate",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("vibrate wand [PATTERN]"),
            arguments: {
              PATTERN: {
                type: Scratch.ArgumentType.STRING,
                menu: "vibrationMenu",
                defaultValue: "SHORT",
              },
            },
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: Scratch.translate("Battery"),
          },
          {
            opcode: "getBatteryPercentage",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("battery percentage"),
          },
        ],
        menus: {
          axisMenu: { acceptReporters: true, items: ["x", "y", "z"] },
          tipAxisMenu: { acceptReporters: true, items: ["x", "y"] },
          quaternionMenu: {
            acceptReporters: true,
            items: ["w", "x", "y", "z"],
          },
          spellMenu: {
            acceptReporters: true,
            items: SPELLS.filter((spell) => spell.id !== 0).map(
              (spell) => spell.name
            ),
          },
          vibrationMenu: {
            acceptReporters: true,
            items: Object.keys(VIBRATION_PATTERNS),
          },
        },
      };
    }

    /**
     * Prompt the user for a wand and connect to its BLE services.
     * @returns {Promise<void>}
     */
    async connect() {
      if (!this.isWebBluetoothAvailable()) {
        console.warn(
          "Kano Wand: Web Bluetooth is not available in this browser."
        );
        return;
      }
      if (this.connecting) {
        console.warn("Kano Wand: connection already in progress.");
        return;
      }

      this.connecting = true;
      await this.cleanup(false);

      try {
        this.device = await navigator.bluetooth.requestDevice({
          // Some Kano wands do not advertise the primary service UUID, so a
          // service filter can hide them from the browser chooser. Filter by
          // the advertised device name instead; community tools commonly see
          // names like "Kano-Wand-xx-yy-zz".
          filters: [
            { namePrefix: "Kano" },
            { namePrefix: "KANO" },
            { namePrefix: "Kano-Wand" },
            { namePrefix: "Coding Wand" },
            { namePrefix: "Harry Potter" },
          ],
          optionalServices: [
            INFO_SERVICE_UUID,
            IO_SERVICE_UUID,
            SENSOR_SERVICE_UUID,
          ],
        });

        this.wandName = this.device.name || "Kano Wand";
        this.device.addEventListener(
          "gattserverdisconnected",
          this.handleGattDisconnected
        );
        this.server = await this.device.gatt.connect();

        const ioService = await this.server.getPrimaryService(IO_SERVICE_UUID);
        const sensorService =
          await this.server.getPrimaryService(SENSOR_SERVICE_UUID);
        const infoService = await this.getOptionalService(INFO_SERVICE_UUID);

        this.characteristics.hardware = await this.getOptionalCharacteristic(
          infoService,
          HARDWARE_UUID
        );
        this.characteristics.software = await this.getOptionalCharacteristic(
          infoService,
          SOFTWARE_UUID
        );
        this.characteristics.button =
          await ioService.getCharacteristic(BUTTON_UUID);
        this.characteristics.battery =
          await ioService.getCharacteristic(BATTERY_UUID);
        this.characteristics.vibrator =
          await ioService.getCharacteristic(VIBRATOR_UUID);
        this.characteristics.led = await ioService.getCharacteristic(LED_UUID);
        this.characteristics.keepAlive =
          await ioService.getCharacteristic(KEEP_ALIVE_UUID);
        this.characteristics.position =
          await sensorService.getCharacteristic(POSITION_UUID);
        this.characteristics.positionReset =
          await this.getOptionalCharacteristic(
            sensorService,
            POSITION_RESET_UUID
          );
        this.characteristics.temperature = await this.getOptionalCharacteristic(
          sensorService,
          TEMPERATURE_UUID
        );

        await this.startNotifications();
        await this.resetPosition();
        await this.readBattery();
        await this.writeCharacteristic(
          this.characteristics.keepAlive,
          [0x01],
          true
        );

        this.connected = true;
        this.startKeepAlive();

        runtime.startHats(`${EXTENSION_ID}_whenConnected`);
      } catch (error) {
        console.warn("Kano Wand: connection failed.", error);
        await this.cleanup(false);
      } finally {
        this.connecting = false;
      }
    }

    /**
     * Disconnect the current wand and reset live BLE state.
     * @returns {Promise<void>}
     */
    async disconnect() {
      await this.cleanup(true);
    }

    async startNotifications() {
      await this.startNotification(
        this.characteristics.button,
        this.handleButtonNotification
      );
      await this.startNotification(
        this.characteristics.position,
        this.handlePositionNotification
      );
    }

    async getOptionalService(uuid) {
      try {
        return await this.server.getPrimaryService(uuid);
      } catch (error) {
        console.warn(`Kano Wand: optional service ${uuid} unavailable.`, error);
        return null;
      }
    }

    async getOptionalCharacteristic(service, uuid) {
      if (!service) return null;
      try {
        return await service.getCharacteristic(uuid);
      } catch (error) {
        console.warn(
          `Kano Wand: optional characteristic ${uuid} unavailable.`,
          error
        );
        return null;
      }
    }

    async startNotification(characteristic, handler) {
      if (!characteristic) {
        throw new Error("Required notification characteristic is unavailable.");
      }
      await this.runBleOperation(async () => {
        await characteristic.startNotifications();
        characteristic.addEventListener("characteristicvaluechanged", handler);
      });
    }

    async safeStopNotification(characteristic, handler) {
      if (!characteristic) return;
      try {
        characteristic.removeEventListener(
          "characteristicvaluechanged",
          handler
        );
        if (this.isGattConnected()) {
          await this.runBleOperation(() => characteristic.stopNotifications());
        }
      } catch (error) {
        console.warn("Kano Wand: could not stop notifications.", error);
      }
    }

    async resetPosition() {
      try {
        if (!this.characteristics.positionReset) return;
        await this.writeCharacteristic(
          this.characteristics.positionReset,
          [0x01],
          true
        );
      } catch (error) {
        console.warn("Kano Wand: could not reset position.", error);
      }
    }

    startKeepAlive() {
      this.stopKeepAlive();
      this.keepAliveTimer = setInterval(() => {
        this.writeKeepAlive();
      }, 2000);
    }

    stopKeepAlive() {
      if (this.keepAliveTimer) {
        clearInterval(this.keepAliveTimer);
        this.keepAliveTimer = null;
      }
    }

    async writeKeepAlive() {
      try {
        await this.writeCharacteristic(
          this.characteristics.keepAlive,
          [0x01],
          true
        );
      } catch (error) {
        console.warn("Kano Wand: keep-alive write failed.", error);
      }
    }

    async readBattery() {
      try {
        if (!this.characteristics.battery) return;
        const value = await this.runBleOperation(() =>
          this.characteristics.battery.readValue()
        );
        this.batteryPercentageValue = value.getUint8(0);
      } catch (error) {
        console.warn("Kano Wand: battery read failed.", error);
      }
    }

    async writeCharacteristic(characteristic, bytes, preferResponse) {
      if (!characteristic) return;
      const data = new Uint8Array(bytes);
      await this.runBleOperation(async () => {
        if (
          !preferResponse &&
          typeof characteristic.writeValueWithoutResponse === "function"
        ) {
          await characteristic.writeValueWithoutResponse(data);
        } else {
          await characteristic.writeValue(data);
        }
      });
    }

    runBleOperation(operation) {
      const queuedOperation = this.bleOperationQueue
        .catch(() => {})
        .then(() => {
          if (!this.isGattConnected()) {
            throw new Error("Kano Wand is not GATT connected.");
          }
          return operation();
        });
      this.bleOperationQueue = queuedOperation.catch(() => {});
      return queuedOperation;
    }

    isGattConnected() {
      if (!this.device) return false;
      if (!this.device.gatt) return false;
      return Boolean(this.device.gatt.connected);
    }

    async cleanup(emitDisconnectedHat) {
      const wasConnected = this.connected;
      this.stopKeepAlive();

      await this.safeStopNotification(
        this.characteristics.button,
        this.handleButtonNotification
      );
      await this.safeStopNotification(
        this.characteristics.position,
        this.handlePositionNotification
      );

      if (this.device) {
        try {
          this.device.removeEventListener(
            "gattserverdisconnected",
            this.handleGattDisconnected
          );
        } catch (error) {
          console.warn(
            "Kano Wand: could not remove disconnect listener.",
            error
          );
        }
      }

      if (this.device && this.device.gatt && this.device.gatt.connected) {
        try {
          this.device.gatt.disconnect();
        } catch (error) {
          console.warn("Kano Wand: disconnect failed.", error);
        }
      }

      this.server = null;
      this.device = null;
      this.connected = false;
      this.buttonPressed = false;
      this.gesturePoints = [];
      this.gestureSmoothedPoint = null;
      this.gestureOrigin = null;
      this.gestureStartTime = 0;
      this.gestureDirectionAnchor = null;
      this.pendingGestureDirection = null;
      this.pendingGestureDirectionCount = 0;
      this.committedGestureDirections = [];
      this.gestureVelocityHistory = [];
      this.tipHistory = [];
      this.characteristics = {
        hardware: null,
        software: null,
        positionReset: null,
        button: null,
        battery: null,
        vibrator: null,
        led: null,
        keepAlive: null,
        position: null,
        temperature: null,
      };

      if (emitDisconnectedHat && wasConnected) {
        runtime.startHats(`${EXTENSION_ID}_whenDisconnected`);
      }
    }

    handleGattDisconnected = () => {
      this.cleanup(true);
    };

    handleButtonNotification = (event) => {
      try {
        const pressed = event.target.value.getUint8(0) === 1;
        if (pressed !== this.buttonPressed) {
          this.buttonPressed = pressed;
          let hatOpcode = "whenReleased";
          if (pressed) {
            hatOpcode = "whenPressed";
          }
          runtime.startHats(`${EXTENSION_ID}_${hatOpcode}`);
          if (pressed) {
            this.gesturePoints = [];
            this.gestureSmoothedPoint = null;
            this.gestureOrigin = { ...this.smoothedTipPosition };
            this.gestureStartTime = Date.now();
            this.gestureDirectionAnchor = null;
            this.pendingGestureDirection = null;
            this.pendingGestureDirectionCount = 0;
            this.committedGestureDirections = [];
            this.gestureVelocityHistory = [];
            this.lastSpellId = 0;
            this.lastSpellNameValue = "NONE";
            this.positionHistory = [];
          } else {
            this.detectSpellFromGesture();
          }
        }
      } catch (error) {
        console.warn("Kano Wand: button packet parse failed.", error);
      }
    };

    handlePositionNotification = (event) => {
      try {
        const value = event.target.value;
        const quaternion = this.parseQuaternionPacket(value);
        const orientation = this.quaternionToOrientation(quaternion);
        const x = orientation.yaw;
        const y = orientation.pitch;
        const roll = orientation.roll;
        const pitch = orientation.pitch;

        this.euler = {
          pitch,
          roll,
          yaw: orientation.yaw,
        };
        this.quaternion = quaternion;

        const nextPosition = { x, y, z: roll };
        this.updateTipPosition(nextPosition, pitch, roll);
        this.updatePosition(nextPosition);

        if (this.buttonPressed) {
          if (Date.now() - this.gestureStartTime < 40) {
            return;
          }
          if (!this.gestureOrigin) {
            this.gestureOrigin = { ...this.smoothedTipPosition };
            this.gestureSmoothedPoint = null;
            return;
          }
          const relativePoint = {
            x: this.smoothedTipPosition.x - this.gestureOrigin.x,
            y: -(this.smoothedTipPosition.y - this.gestureOrigin.y),
          };
          this.addGesturePoint(relativePoint);
          this.updateGestureMovementDirection(relativePoint);
          if (this.gesturePoints.length > 180) {
            this.gesturePoints.shift();
          }
        }
      } catch (error) {
        console.warn("Kano Wand: position packet parse failed.", error);
      }
    };

    parseQuaternionPacket(value) {
      const quaternion = {
        w: value.getInt16(0, true) / 1024,
        x: value.getInt16(2, true) / 1024,
        y: value.getInt16(4, true) / 1024,
        z: value.getInt16(6, true) / 1024,
      };
      const length = Math.hypot(
        quaternion.w,
        quaternion.x,
        quaternion.y,
        quaternion.z
      );
      if (length === 0) return { w: 1, x: 0, y: 0, z: 0 };
      return {
        w: quaternion.w / length,
        x: quaternion.x / length,
        y: quaternion.y / length,
        z: quaternion.z / length,
      };
    }

    quaternionToOrientation(quaternion) {
      const x = quaternion.x;
      const y = quaternion.y;
      const z = quaternion.z;
      const w = quaternion.w;

      const xx = x * (x + x);
      const xy = x * (y + y);
      const xz = x * (z + z);
      const yy = y * (y + y);
      const yz = y * (z + z);
      const zz = z * (z + z);
      const wx = w * (x + x);
      const wy = w * (y + y);
      const wz = w * (z + z);

      const matrix11 = 1 - (yy + zz);
      const matrix12 = xy - wz;
      const matrix13 = xz + wy;
      const matrix22 = 1 - (xx + zz);
      const matrix23 = yz - wx;
      const matrix32 = yz + wx;
      const matrix33 = 1 - (xx + yy);

      const yawRadians = Math.asin(Math.max(-1, Math.min(1, matrix13)));
      let pitchRadians;
      let rollRadians;
      if (Math.abs(matrix13) < 0.99999) {
        pitchRadians = Math.atan2(-matrix23, matrix33);
        rollRadians = Math.atan2(-matrix12, matrix11);
      } else {
        pitchRadians = Math.atan2(matrix32, matrix22);
        rollRadians = 0;
      }

      return {
        pitch: (pitchRadians * 180) / Math.PI,
        roll: -((rollRadians * 180) / Math.PI),
        yaw: (yawRadians * 180) / Math.PI,
      };
    }

    updatePosition(nextPosition) {
      const smoothing = 0.35;
      this.position = nextPosition;
      this.smoothedPosition = {
        x:
          this.smoothedPosition.x +
          (nextPosition.x - this.smoothedPosition.x) * smoothing,
        y:
          this.smoothedPosition.y +
          (nextPosition.y - this.smoothedPosition.y) * smoothing,
        z:
          this.smoothedPosition.z +
          (nextPosition.z - this.smoothedPosition.z) * smoothing,
      };

      const now = Date.now();
      this.positionHistory.push({ time: now, ...this.smoothedPosition });
      while (this.positionHistory.length > 50) {
        this.positionHistory.shift();
      }
    }

    updateTipPosition(position, pitch, roll) {
      const pitchRadians = (pitch * Math.PI) / 180;
      const rollRadians = (roll * Math.PI) / 180;
      const tipPosition = {
        x:
          position.x +
          Math.sin(rollRadians) *
            WAND_SENSOR_TO_TIP_MM *
            WAND_ROLL_TO_TIP_SCALE,
        y: position.y + Math.sin(pitchRadians) * WAND_SENSOR_TO_TIP_MM,
      };
      const smoothing = 0.12;
      const tipDeadband = 16;

      this.tipPosition = tipPosition;
      const candidateTipPosition = {
        x:
          this.smoothedTipPosition.x +
          (tipPosition.x - this.smoothedTipPosition.x) * smoothing,
        y:
          this.smoothedTipPosition.y +
          (tipPosition.y - this.smoothedTipPosition.y) * smoothing,
      };

      if (
        Math.hypot(
          candidateTipPosition.x - this.lastStableTipPosition.x,
          candidateTipPosition.y - this.lastStableTipPosition.y
        ) >= tipDeadband
      ) {
        this.lastStableTipPosition = candidateTipPosition;
      }

      this.smoothedTipPosition = { ...this.lastStableTipPosition };

      const now = Date.now();
      this.tipHistory.push({ time: now, ...this.smoothedTipPosition });
      while (this.tipHistory.length > 50) {
        this.tipHistory.shift();
      }

      if (!this.buttonPressed) {
        const speed = this.calculateMovementSpeed();
        const direction = this.calculateMovementDirection();
        this.lastMovementDirection = direction;

        if (speed > 80 && direction !== "STILL") {
          runtime.startHats(`${EXTENSION_ID}_whenWandMoves`);
        }
      }
    }

    updateGestureMovementDirection(relativePoint) {
      const now = Date.now();
      this.gestureVelocityHistory.push({ time: now, ...relativePoint });
      while (this.gestureVelocityHistory.length > 8) {
        this.gestureVelocityHistory.shift();
      }

      const originDeadzone = 180;
      if (!this.gestureDirectionAnchor) {
        this.gestureDirectionAnchor = { ...relativePoint };
      }

      if (Math.hypot(relativePoint.x, relativePoint.y) < originDeadzone) {
        this.lastMovementDirection = "STILL";
        return;
      }

      const dx = relativePoint.x - this.gestureDirectionAnchor.x;
      const dy = relativePoint.y - this.gestureDirectionAnchor.y;
      if (Math.hypot(dx, dy) < 240) return;
      if (this.calculateGestureVelocity() < 260) return;

      const gestureDirection = this.vectorToCardinalDirection(dx, dy);
      if (gestureDirection === this.pendingGestureDirection) {
        this.pendingGestureDirectionCount++;
      } else {
        this.pendingGestureDirection = gestureDirection;
        this.pendingGestureDirectionCount = 1;
      }

      if (this.pendingGestureDirectionCount < 3) return;

      this.commitGestureDirection(gestureDirection);
      this.gestureDirectionAnchor = { ...relativePoint };
      this.pendingGestureDirection = null;
      this.pendingGestureDirectionCount = 0;
    }

    calculateGestureVelocity() {
      const history = this.gestureVelocityHistory;
      if (history.length < 2) return 0;
      const latest = history[history.length - 1];
      const previous = history[0];
      const elapsedSeconds = Math.max(
        (latest.time - previous.time) / 1000,
        0.001
      );
      return (
        Math.hypot(latest.x - previous.x, latest.y - previous.y) /
        elapsedSeconds
      );
    }

    commitGestureDirection(direction) {
      const lastDirection =
        this.committedGestureDirections[
          this.committedGestureDirections.length - 1
        ];
      if (lastDirection !== direction) {
        this.committedGestureDirections.push(direction);
      }
      this.lastMovementDirection =
        this.gestureDirectionToMovementDirection(direction);
      this.lastGestureValue = this.committedGestureDirections.join(" ");
    }

    gestureDirectionToMovementDirection(direction) {
      const map = {
        U: "UP",
        D: "DOWN",
        L: "LEFT",
        R: "RIGHT",
        UL: "UP_LEFT",
        UR: "UP_RIGHT",
        DL: "DOWN_LEFT",
        DR: "DOWN_RIGHT",
      };
      if (Object.prototype.hasOwnProperty.call(map, direction)) {
        return map[direction];
      }
      return "STILL";
    }

    addGesturePoint(point) {
      const smoothing = 0.14;
      if (!this.gestureSmoothedPoint) {
        this.gestureSmoothedPoint = { ...point };
      } else {
        this.gestureSmoothedPoint = {
          x:
            this.gestureSmoothedPoint.x +
            (point.x - this.gestureSmoothedPoint.x) * smoothing,
          y:
            this.gestureSmoothedPoint.y +
            (point.y - this.gestureSmoothedPoint.y) * smoothing,
        };
      }

      const latest = this.gesturePoints[this.gesturePoints.length - 1];
      if (!latest) {
        this.gesturePoints.push({ ...this.gestureSmoothedPoint });
        return;
      }

      const distanceFromLatest = Math.hypot(
        this.gestureSmoothedPoint.x - latest.x,
        this.gestureSmoothedPoint.y - latest.y
      );
      if (distanceFromLatest >= 140) {
        this.gesturePoints.push({ ...this.gestureSmoothedPoint });
      }
    }

    calculateMovementSpeed() {
      const history = this.tipHistory;
      if (history.length < 2) return 0;
      const latest = history[history.length - 1];
      let previous = history[0];
      for (let i = history.length - 2; i >= 0; i--) {
        if (latest.time - history[i].time >= 100) {
          previous = history[i];
          break;
        }
      }
      const elapsedSeconds = Math.max(
        (latest.time - previous.time) / 1000,
        0.001
      );
      const dx = latest.x - previous.x;
      const dy = latest.y - previous.y;
      return Math.sqrt(dx * dx + dy * dy) / elapsedSeconds;
    }

    calculateMovementDirection() {
      const history = this.tipHistory;
      if (history.length < 2) return "STILL";
      const latest = history[history.length - 1];
      const previous = history[Math.max(0, history.length - 8)];
      const dx = latest.x - previous.x;
      const dy = -(latest.y - previous.y);
      const threshold = 60;

      if (Math.hypot(dx, dy) < threshold) return "STILL";
      return this.gestureDirectionToMovementDirection(
        this.vectorToCardinalDirection(dx, dy)
      );
    }

    vectorToGestureDirection(dx, dy, preferCardinal) {
      if (preferCardinal) {
        return this.vectorToCardinalDirection(dx, dy);
      }

      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle >= -22.5 && angle < 22.5) return "R";
      if (angle >= 22.5 && angle < 67.5) return "UR";
      if (angle >= 67.5 && angle < 112.5) return "U";
      if (angle >= 112.5 && angle < 157.5) return "UL";
      if (angle >= 157.5 || angle < -157.5) return "L";
      if (angle >= -157.5 && angle < -112.5) return "DL";
      if (angle >= -112.5 && angle < -67.5) return "D";
      return "DR";
    }

    vectorToCardinalDirection(dx, dy) {
      const verticalMotionIsLarger = Math.abs(dy) >= Math.abs(dx);
      if (verticalMotionIsLarger) {
        if (dy > 0) return "U";
        return "D";
      }

      if (dx > 0) return "R";
      return "L";
    }

    detectSpellFromGesture() {
      const gesture = [...this.committedGestureDirections];
      this.lastGestureValue = gesture.join(" ");
      const spellName = this.findClosestSpell(gesture);
      this.gesturePoints = [];
      this.gestureSmoothedPoint = null;
      this.gestureOrigin = null;
      this.gestureStartTime = 0;
      this.gestureDirectionAnchor = null;
      this.pendingGestureDirection = null;
      this.pendingGestureDirectionCount = 0;
      this.committedGestureDirections = [];
      this.gestureVelocityHistory = [];
      if (!spellName) return;

      const spell = SPELLS.find((item) => item.name === spellName);
      this.lastSpellId = 0;
      if (spell) {
        this.lastSpellId = spell.id;
      }
      this.lastSpellNameValue = spellName;
      runtime.startHats(`${EXTENSION_ID}_whenAnySpellCast`);
      runtime.startHats(`${EXTENSION_ID}_whenSpecificSpellCast`, {
        SPELL: spellName,
      });
    }

    findClosestSpell(gesture) {
      let bestSpell = null;
      let bestScore = Infinity;
      for (const [spellName, expectedGesture] of Object.entries(
        SPELL_GESTURES
      )) {
        const distance = this.gestureDistance(gesture, expectedGesture);
        const missingPenalty =
          Math.max(0, expectedGesture.length - gesture.length) * 1.25;
        const extraPenalty =
          Math.max(0, gesture.length - expectedGesture.length) * 0.2;
        const score = distance + missingPenalty + extraPenalty;
        if (score < bestScore) {
          bestScore = score;
          bestSpell = spellName;
        }
      }
      if (bestScore <= 2) {
        return bestSpell;
      }
      return null;
    }

    gestureDistance(actual, expected) {
      const rows = actual.length + 1;
      const columns = expected.length + 1;
      const table = Array.from({ length: rows }, () => Array(columns).fill(0));

      for (let row = 0; row < rows; row++) table[row][0] = row;
      for (let column = 0; column < columns; column++)
        table[0][column] = column;

      for (let row = 1; row < rows; row++) {
        for (let column = 1; column < columns; column++) {
          let substitutionCost = 1;
          if (actual[row - 1] === expected[column - 1]) {
            substitutionCost = 0;
          }

          const deleteDirectionScore = table[row - 1][column] + 1;
          const insertDirectionScore = table[row][column - 1] + 1;
          const substituteDirectionScore =
            table[row - 1][column - 1] + substitutionCost;

          table[row][column] = Math.min(
            deleteDirectionScore,
            insertDirectionScore,
            substituteDirectionScore
          );
        }
      }

      return table[actual.length][expected.length];
    }

    isWebBluetoothAvailable() {
      return typeof navigator !== "undefined" && Boolean(navigator.bluetooth);
    }

    isConnected() {
      return Boolean(this.connected);
    }

    whenConnected() {
      return false;
    }

    whenDisconnected() {
      return false;
    }

    whenWandMoves() {
      return false;
    }

    whenPressed() {
      return false;
    }

    whenReleased() {
      return false;
    }

    whenAnySpellCast() {
      return false;
    }

    whenSpecificSpellCast() {
      return false;
    }

    getWandName() {
      return this.wandName || "";
    }

    getPosition(args) {
      const axis = String(args.AXIS || "x").toLowerCase();
      return round(this.smoothedPosition[axis]);
    }

    getRawPosition(args) {
      const axis = String(args.AXIS || "x").toLowerCase();
      return round(this.position[axis]);
    }

    getRawX() {
      return round(this.position.x);
    }

    getRawY() {
      return round(this.position.y);
    }

    getRawZ() {
      return round(this.position.z);
    }

    getTipPosition(args) {
      const axis = String(args.AXIS || "x").toLowerCase();
      return round(this.smoothedTipPosition[axis]);
    }

    getTipX() {
      return round(this.smoothedTipPosition.x);
    }

    getTipY() {
      return round(this.smoothedTipPosition.y);
    }

    getPitch() {
      return round(this.euler.pitch);
    }

    getRoll() {
      return round(this.euler.roll);
    }

    getYaw() {
      return round(this.euler.yaw);
    }

    getMovementSpeed() {
      return round(this.calculateMovementSpeed());
    }

    getMovementDirection() {
      return this.lastMovementDirection;
    }

    getAccelerometer(args) {
      const axis = String(args.AXIS || "x").toLowerCase();
      return round(this.accelerometer[axis]);
    }

    getGyroscope(args) {
      const axis = String(args.AXIS || "x").toLowerCase();
      return round(this.gyroscope[axis]);
    }

    getQuaternion(args) {
      const component = String(args.COMPONENT || "w").toLowerCase();
      return round(this.quaternion[component]);
    }

    isPressed() {
      return Boolean(this.buttonPressed);
    }

    getLastSpellName() {
      return this.lastSpellNameValue;
    }

    getLastSpellId() {
      return this.lastSpellId;
    }

    getLastGesture() {
      return this.lastGestureValue;
    }

    async setColor(args) {
      const [r, g, b] = parseHexColor(args.COLOR);
      await this.setRgbBytes(r, g, b);
    }

    async setRGB(args) {
      await this.setRgbBytes(
        clampByte(args.R),
        clampByte(args.G),
        clampByte(args.B)
      );
    }

    async setRgbBytes(r, g, b) {
      try {
        const rgb565 =
          ((r & 0xf8) << 8) + ((g & 0xfc) << 3) + ((b & 0xf8) >> 3);
        let on = 0;
        if (r > 0 || g > 0 || b > 0) {
          on = 1;
        }
        await this.writeCharacteristic(
          this.characteristics.led,
          [on, rgb565 >> 8, rgb565 & 0xff],
          true
        );
      } catch (error) {
        console.warn("Kano Wand: LED write failed.", error);
      }
    }

    async turnOffLed() {
      await this.setRgbBytes(0, 0, 0);
    }

    async vibrate(args) {
      const patternName = String(args.PATTERN || "SHORT");
      const pattern =
        VIBRATION_PATTERNS[patternName] || VIBRATION_PATTERNS.SHORT;
      try {
        for (const byte of pattern) {
          await this.writeCharacteristic(
            this.characteristics.vibrator,
            [byte],
            true
          );
          if (pattern.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 120));
          }
        }
      } catch (error) {
        console.warn("Kano Wand: vibration write failed.", error);
      }
    }

    async getBatteryPercentage() {
      if (this.connected) {
        await this.readBattery();
      }
      return Math.round(this.batteryPercentageValue);
    }
  }

  Scratch.extensions.register(new KanoWand());
})(Scratch);
