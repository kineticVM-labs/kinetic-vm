# KineticVM ESP32 Firmware

Peripheral firmware for ESP32 — speaks the same JSON-over-serial protocol as the STM32 firmware. Flash this to your ESP32, then configure KineticVM on the host to connect via serial.

**New to this?** See [SETUP.md](SETUP.md) for step-by-step commands and troubleshooting.

## Protocol


- **Request** (host → ESP32): `{"id":"1","cmd":"gpio_write","args":{"pin":13,"value":1}}\n`
- **Response** (ESP32 → host): `{"id":"1","ok":true,"result":"done"}\n`
- **Event** (ESP32 → host, unsolicited): `{"event":"message","signal":"keypad","text":"1234"}\n`

Commands the host sends: `gpio_read`, `gpio_write`, `ping`, `capabilities`.

To push a keypad code, a button, or any other local reading, edit `take_host_message` in `src/main.rs`. Return `Some` once when a new message is ready. The Pi matches a procedure trigger `board/signal` and passes `text` to that procedure. Returning `Some` on every call repeats the message.

## Prerequisites

1. **RISC-V ESP-IDF** (ESP32-C2/C3): Uses nightly Rust with `build-std`.

   **Python**: ESP-IDF requires Python 3.10–3.13 (not 3.14). If you have Python 3.14:
   ```sh
   brew install python@3.12
   ```

   **virtualenv** (needed by ESP-IDF tools; PEP 668 workaround on macOS):
   ```sh
   /opt/homebrew/opt/python@3.12/bin/python3.12 -m pip install virtualenv --break-system-packages
   ```

   **Rust tools**:
   ```sh
   cargo install espflash ldproxy
   ```

   The project's `rust-toolchain.toml` pins nightly + rust-src. `esp-idf-sys` downloads ESP-IDF automatically on first build. Use Python 3.12 for the build:
   ```sh
   export PATH="/opt/homebrew/opt/python@3.12/libexec/bin:$PATH"
   ```

2. **Xtensa targets** (ESP32, ESP32-S2, ESP32-S3): Use espup instead:
   ```sh
   cargo install espup espflash
   espup install
   source ~/export-esp.sh
   ```
   Then edit `.cargo/config.toml` to change the target (e.g. `xtensa-esp32-espidf`).

## Build & Flash

```sh
cd firmware/esp32
# Use Python 3.12 (required if you have 3.14)
export PATH="/opt/homebrew/opt/python@3.12/libexec/bin:$PATH"
# Optional: pin MCU (esp32c3 or esp32c2)
export MCU=esp32c3
cargo build --release
espflash flash target/riscv32imc-esp-espidf/release/esp32 --monitor
```

## Host Config

The daemon already listens for an ESP32 on `/dev/ttyUSB0`, and for a Pico, Nucleo, or Arduino on `/dev/ttyACM0`. `enabled = false` or `boards = []` under `[peripherals]` turns that off.

A procedure starts from a pushed message when its `SOP.toml` trigger is:

```toml
[[triggers]]
type = "peripheral"
board = "esp32"
signal = "keypad"
```

`kinetic plugin create` writes that trigger commented out in `sop/SOP.toml`. Uncomment it and set `board` to `esp32`, `pico`, `nucleo`, or `arduino`.

## Pin Mapping

Default GPIO 2 and 13 are configured for output. Edit `src/main.rs` to add more pins or change for your board. ESP32-C3 has different pin layout — adjust UART pins (gpio21/gpio20) if needed.

## Edge-Native (Future)

Phase 6 also envisions KineticVM running *on* the ESP32 (WiFi + LLM). This firmware is the host-mediated serial peripheral; edge-native will be a separate crate.
