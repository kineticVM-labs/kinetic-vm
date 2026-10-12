//! KineticVM ESP32 firmware — JSON-over-serial peripheral.

use esp_idf_svc::hal::gpio::PinDriver;
use esp_idf_svc::hal::peripherals::Peripherals;
use esp_idf_svc::hal::uart::{UartConfig, UartDriver};
use esp_idf_svc::hal::units::Hertz;
use heapless::{String, Vec};
use log::info;
use kinetic_fw_protocol::{Command, copy_id, write_err, write_host_message, write_ok};

// Pre-escaped because `write_ok` embeds this value as a JSON string without escaping.
const CAPABILITIES_RESULT: &str =
    r#"{\"gpio\":[0,1,2,3,4,5,12,13,14,15,16,17,18,19],\"led_pin\":2}"#;

macro_rules! send_idle_message {
    ($uart:expr, $outbound:expr) => {{
        if let Some(message) = take_host_message() {
            if write_host_message(&mut $outbound, &message.signal, &message.text) {
                let _ = $uart.write($outbound.as_bytes());
                let _ = $uart.write(b"\n");
            } else {
                log::warn!("host message was not sent");
            }
        }
    }};
}

fn main() -> anyhow::Result<()> {
    esp_idf_svc::sys::link_patches();
    esp_idf_svc::log::EspLogger::initialize_default();

    let peripherals = Peripherals::take()?;
    let pins = peripherals.pins;

    // Create GPIO output drivers first (they take ownership of pins)
    let mut gpio2 = PinDriver::output(pins.gpio2)?;
    let mut gpio13 = PinDriver::output(pins.gpio13)?;

    // UART0: TX=21, RX=20 (ESP32) — ESP32-C3 may use different pins; adjust for your board
    let config = UartConfig::new().baudrate(Hertz(115_200));
    let uart = UartDriver::new(
        peripherals.uart0,
        pins.gpio21,
        pins.gpio20,
        Option::<esp_idf_svc::hal::gpio::Gpio0>::None,
        Option::<esp_idf_svc::hal::gpio::Gpio1>::None,
        &config,
    )?;

    info!("KineticVM ESP32 firmware ready on UART0 (115200)");

    let mut buf = [0u8; 512];
    let mut line: Vec<u8, 400> = Vec::new();
    let mut resp_buf: String<256> = String::new();

    let mut outbound: String<384> = String::new();
    loop {
        match uart.read(&mut buf, 100) {
            Ok(0) => send_idle_message!(uart, outbound),
            Ok(n) => {
                for &b in &buf[..n] {
                    if b == b'\n' {
                        if !line.is_empty() {
                            handle_request(&line, &mut gpio2, &mut gpio13, &mut resp_buf);
                            let _ = uart.write(resp_buf.as_bytes());
                            let _ = uart.write(b"\n");
                            line.clear();
                        }
                    } else if line.push(b).is_err() {
                        line.clear();
                    }
                }
                if line.is_empty() {
                    send_idle_message!(uart, outbound);
                }
            }
            Err(_) => send_idle_message!(uart, outbound),
        }
    }
}

/// One message this board sends to the Pi without being asked.
struct HostMessage {
    signal: String<32>,
    text: String<200>,
}

/// Return the next message for the Pi, or `None` when nothing new happened.
///
/// The main loop calls this whenever the serial line is idle. Replace the
/// body to scan a keypad, a button, a sensor, or any other local input.
/// Return `Some` once for each new message, then `None` until the next one.
/// Returning `Some` on every call sends that message again on every idle poll.
///
/// `signal` is the name a procedure matches (`keypad`, `button`, `scale`).
/// `text` is the message, such as the digits typed before enter. A signal is
/// a letter or `_`, then letters, digits, `_`, or `-`, at most 32 characters.
fn take_host_message() -> Option<HostMessage> {
    None
}

fn handle_request<G2, G13>(
    line: &[u8],
    gpio2: &mut PinDriver<'_, G2>,
    gpio13: &mut PinDriver<'_, G13>,
    resp_buf: &mut String<256>,
) where
    G2: esp_idf_svc::hal::gpio::OutputMode,
    G13: esp_idf_svc::hal::gpio::OutputMode,
{
    let mut id_buf = [0u8; 32];
    let id_len = copy_id(line, &mut id_buf);
    let id_str = core::str::from_utf8(&id_buf[..id_len]).unwrap_or("0");

    match Command::from_line(line) {
        Some(Command::Capabilities) => {
            write_ok(resp_buf, id_str, CAPABILITIES_RESULT);
        }
        Some(Command::GpioRead { pin }) => match gpio_read(pin) {
            Ok(value) => {
                let mut value_buf: String<8> = String::new();
                let _ = core::fmt::Write::write_fmt(&mut value_buf, format_args!("{value}"));
                write_ok(resp_buf, id_str, &value_buf);
            }
            Err(e) => write_err(resp_buf, id_str, &e.to_string()),
        },
        Some(Command::GpioWrite { pin, value }) => match gpio_write(gpio2, gpio13, pin, value) {
            Ok(()) => write_ok(resp_buf, id_str, "done"),
            Err(e) => write_err(resp_buf, id_str, &e.to_string()),
        },
        Some(Command::Ping) => {
            write_ok(resp_buf, id_str, "pong");
        }
        None => {
            write_err(resp_buf, id_str, "Unknown command");
        }
    }
}

fn gpio_read(_pin: i32) -> anyhow::Result<u8> {
    // TODO: implement input pin read — requires storing InputPin drivers per pin
    Ok(0)
}

fn gpio_write<G2, G13>(
    gpio2: &mut PinDriver<'_, G2>,
    gpio13: &mut PinDriver<'_, G13>,
    pin: i32,
    value: i32,
) -> anyhow::Result<()>
where
    G2: esp_idf_svc::hal::gpio::OutputMode,
    G13: esp_idf_svc::hal::gpio::OutputMode,
{
    let level = esp_idf_svc::hal::gpio::Level::from(value != 0);

    match pin {
        2 => gpio2.set_level(level)?,
        13 => gpio13.set_level(level)?,
        _ => anyhow::bail!("Pin {} not configured (add to gpio_write)", pin),
    }
    Ok(())
}
