# Kano Wand

The Kano Wand extension connects TurboWarp projects to the Kano Harry Potter Coding Wand using Web Bluetooth. It is a community preservation project for people who still own the wand after Kano discontinued the original product and services.

This extension is based on public BLE research from GammaGames, Kano's JavaScript device SDK, Hackaday's Kano Wand Hack notes, and community projects that use the wand as a gesture controller.

## Requirements

Web Bluetooth is required. Use Chrome or Microsoft Edge on a computer with Bluetooth Low Energy support.

Firefox and Safari do not currently support the Web Bluetooth API needed by this extension. Projects can use the `Web Bluetooth available?` block to check compatibility before trying to connect.

## Connecting

1. Turn on the wand and make sure it has battery.
2. Open the project in TurboWarp.
3. Run the `connect to Kano Wand` block from a user action, such as clicking the green flag or pressing a sprite.
4. Choose the wand in the browser Bluetooth prompt.
5. Wait for `when Kano Wand connected` to run.

Browsers may require the connect block to be triggered by a user gesture before showing the Bluetooth chooser.

## Blocks

### Connection

`connect to Kano Wand` opens the browser Bluetooth chooser and connects to the selected wand.

`disconnect Kano Wand` disconnects and stops keep-alive packets and notifications.

`when Kano Wand connected` starts scripts after a successful connection.

`when Kano Wand disconnected` starts scripts when the wand disconnects or the project disconnects it.

`Kano Wand connected?` reports whether the extension currently has an active wand connection.

`wand name` reports the Bluetooth device name for the connected wand.

### Motion

`position x/y/z` reports the smoothed position value from the wand.

`pitch`, `roll`, and `yaw` report Euler angles in degrees.

`movement speed` estimates recent movement speed from the last position readings.

`movement direction` reports one of `UP`, `DOWN`, `LEFT`, `RIGHT`, `UP_LEFT`, `UP_RIGHT`, `DOWN_LEFT`, `DOWN_RIGHT`, or `STILL`.

`when wand moves` starts scripts when the wand movement passes a small threshold.

### Advanced Sensors

`accelerometer x/y/z` is reserved for raw sensor values. The GammaGames Python library exposes the wand's position/orientation stream, so these reporters currently return 0 unless a future firmware variant exposes raw accelerometer data.

`gyroscope x/y/z` is reserved for raw sensor values. These reporters currently return 0 unless a future firmware variant exposes raw gyroscope data.

`quaternion w/x/y/z` reports the raw four-value position/orientation packet components from the wand stream.

### Button

`when wand button pressed` starts scripts when the wand button is pressed.

`when wand button released` starts scripts when the wand button is released.

`wand button pressed?` reports the current button state.

### Spells

`when any spell cast` starts scripts when the extension recognizes a button-held movement gesture. Public reverse-engineering projects recognize spells in software from the button and quaternion stream; they do not document a final spell ID sent by the wand firmware.

`when spell [spell] cast` starts scripts only for the selected spell.

`last spell name` reports the most recent software-recognized spell.

`last spell id` reports this extension's numeric ID for the most recent software-recognized spell.

Supported spells are STUPEFY, WINGARDIUM_LEVIOSA, REDUCIO, FLIPENDO, EXPELLIARMUS, INCENDIO, LUMOS, LOCOMOTOR, ENGORGIO, AGUAMENTI, AVIS, and REDUCTO.

### LED

`set wand color [color]` sets the wand LED using a color picker.

`set wand RGB r [r] g [g] b [b]` sets the wand LED from numeric red, green, and blue values from 0 to 255.

`turn wand light off` sets the LED to black.

### Vibration

`vibrate wand [pattern]` plays a built-in vibration pattern. Patterns include REGULAR, SHORT, BURST, LONG, SHORT_LONG, SHORT_SHORT, MEDIUM_LONG, RAMP_UP, and RAMP_DOWN.

### Battery

`battery percentage` reads and reports the wand battery percentage.

### Utility

`Web Bluetooth available?` reports whether the current browser exposes the Web Bluetooth API.

## Example Ideas

Make a spell practice game that awards points when the wand recognizes the requested spell.

Control a character by mapping roll to x movement and pitch to y movement.

Use the button as a cast trigger, then change sprite effects based on the detected spell.

Create a classroom demo where the wand LED and vibration provide feedback after each challenge.

## Troubleshooting

If the wand is not found, make sure it is charged, turned on, near the computer, and not already connected to another device. Do not connect it from Windows Bluetooth Settings first; let the browser Bluetooth chooser connect to it. The chooser may show several nearby Bluetooth Low Energy devices because some Kano wands do not advertise their service UUID.

If the browser says Bluetooth is unavailable, use Chrome or Edge and check that Bluetooth is enabled in the operating system.

If the wand disconnects, check the battery level. The extension sends keep-alive packets every two seconds while connected, but weak batteries and radio interference can still cause disconnects.

If motion values are noisy, use small thresholds in your project. The extension smooths position values slightly, but hand motion and sensor drift are still normal.

## Credits

Implementation references:

<https://github.com/GammaGames/kano_wand>

<https://github.com/GammaGames/kano-wand-demos>

<https://www.gammagames.net/posts/programming/kano-wand>

<https://github.com/sabas1080/kano-devices-sdk>

<https://hackaday.io/project/161832-kano-wand-hack>

<https://github.com/Thats-so-Mo/Hogwarts-Legacy-Wand>
