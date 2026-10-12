//! Serial peripheral — STM32 and similar boards over USB CDC/serial.

use crate::host_message::{self, HostEvent};
use crate::peripherals::Peripheral;
#[cfg(unix)]
use crate::util::should_open_serial_nonexclusive;
use crate::util::{is_serial_path_allowed, serial_open_baud, serial_path_allowlist_hint};
use async_trait::async_trait;
use kinetic_api::attribution::ToolKind;
use kinetic_api::tool::{Tool, ToolResult};
use kinetic_api::tool_attribution;
use kinetic_config::schema::PeripheralBoardConfig;
use portable_atomic::{AtomicU64, Ordering};
use serde_json::{Value, json};
use std::collections::HashMap;
use std::sync::{Arc, Mutex as StdMutex};
use std::time::{Duration, Instant};
#[cfg(test)]
use tokio::io::AsyncReadExt;
use tokio::io::{AsyncBufReadExt, AsyncRead, AsyncWrite, AsyncWriteExt, BufReader};
use tokio::sync::{mpsc, oneshot};
use tokio_serial::SerialPortBuilderExt;

tool_attribution!(GpioReadTool, ToolKind::Plugin);
tool_attribution!(GpioWriteTool, ToolKind::Plugin);

/// Timeout for serial request/response (seconds).
const SERIAL_TIMEOUT_SECS: u64 = 5;

/// Maximum malformed or non-matching response frames skipped per request.
const MAX_SKIPPED_RESPONSE_FRAMES: usize = 16;

/// JSON request/response over serial. The live port owner parses replies itself;
/// this helper remains for the duplex tests.
#[cfg(test)]
async fn send_request<S>(port: &mut S, cmd: &str, args: Value) -> anyhow::Result<Value>
where
    S: AsyncRead + AsyncWrite + Unpin,
{
    static ID: AtomicU64 = AtomicU64::new(0);
    let id = ID.fetch_add(1, Ordering::Relaxed);
    let id_str = id.to_string();

    let req = json!({
        "id": id_str,
        "cmd": cmd,
        "args": args
    });
    let line = format!("{}\n", req);

    port.write_all(line.as_bytes()).await?;
    port.flush().await?;

    let mut skipped_frames = 0;
    loop {
        let mut buf = Vec::new();
        let mut byte = [0u8; 1];
        loop {
            port.read_exact(&mut byte).await?;
            if byte[0] == b'\n' {
                break;
            }
            buf.push(byte[0]);
        }

        if let Ok(resp) = serde_json::from_slice::<Value>(&buf)
            && resp.get("id").and_then(Value::as_str) == Some(id_str.as_str())
        {
            return Ok(resp);
        }

        if skipped_frames == MAX_SKIPPED_RESPONSE_FRAMES {
            anyhow::bail!(
                "Serial response skip limit exceeded (maximum {MAX_SKIPPED_RESPONSE_FRAMES} frames)"
            );
        }
        skipped_frames += 1;
    }
}

struct SerialRequest {
    cmd: String,
    args: Value,
    reply: oneshot::Sender<anyhow::Result<Value>>,
}

/// One open serial port. A background task owns the bytes so a message the
/// board sends on its own is not lost between GPIO commands.
pub struct SerialTransport {
    requests: mpsc::Sender<SerialRequest>,
    /// Board names that share this open port. A message is offered under each
    /// name, so a procedure can match `pico`, `nucleo`, or `arduino` on the
    /// same `/dev/ttyACM0`.
    names: Arc<StdMutex<Vec<String>>>,
}

static SERIAL_SESSIONS: StdMutex<Option<HashMap<String, Arc<SerialTransport>>>> =
    StdMutex::new(None);

impl SerialTransport {
    fn start<S>(board: String, stream: S) -> Arc<Self>
    where
        S: AsyncRead + AsyncWrite + Unpin + Send + 'static,
    {
        let (tx, rx) = mpsc::channel(4);
        let names = Arc::new(StdMutex::new(vec![board]));
        let owner_names = Arc::clone(&names);
        ::kinetic_spawn::spawn!(async move {
            run_serial_owner(owner_names, stream, rx).await;
        });
        Arc::new(Self {
            requests: tx,
            names,
        })
    }

    pub(crate) async fn request(&self, cmd: &str, args: Value) -> anyhow::Result<ToolResult> {
        let (reply_tx, reply_rx) = oneshot::channel();
        self.requests
            .send(SerialRequest {
                cmd: cmd.to_string(),
                args,
                reply: reply_tx,
            })
            .await
            .map_err(|_| anyhow::Error::msg("serial peripheral is disconnected"))?;
        let resp = tokio::time::timeout(Duration::from_secs(SERIAL_TIMEOUT_SECS), reply_rx)
            .await
            .map_err(|_| {
                ::kinetic_log::record!(
                    WARN,
                    ::kinetic_log::Event::new(module_path!(), ::kinetic_log::Action::Timeout)
                        .with_outcome(::kinetic_log::EventOutcome::Failure)
                        .with_attrs(::serde_json::json!({
                            "command": cmd,
                            "timeout_secs": SERIAL_TIMEOUT_SECS,
                        })),
                    "serial peripheral request timed out"
                );
                anyhow::Error::msg(format!(
                    "Serial request timed out after {SERIAL_TIMEOUT_SECS}s"
                ))
            })?
            .map_err(|_| anyhow::Error::msg("serial peripheral is disconnected"))??;

        let ok = resp["ok"].as_bool().unwrap_or(false);
        let result = resp["result"]
            .as_str()
            .map(String::from)
            .unwrap_or_else(|| resp["result"].to_string());
        let error = resp["error"].as_str().map(String::from);

        Ok(ToolResult {
            success: ok,
            output: result.into(),
            error,
        })
    }

    /// Phase C: fetch capabilities from device (gpio pins, led_pin).
    pub async fn capabilities(&self) -> anyhow::Result<ToolResult> {
        self.request("capabilities", json!({})).await
    }
}

/// Serial peripheral for STM32, Arduino, etc. over USB CDC.
pub struct SerialPeripheral {
    name: String,
    board_type: String,
    transport: Arc<SerialTransport>,
}

impl SerialPeripheral {
    /// Create and connect to a serial peripheral.
    #[allow(clippy::unused_async)]
    pub async fn connect(config: &PeripheralBoardConfig) -> anyhow::Result<Self> {
        let path = config.path.as_deref().ok_or_else(|| {
            ::kinetic_log::record!(
                WARN,
                ::kinetic_log::Event::new(module_path!(), ::kinetic_log::Action::Reject)
                    .with_outcome(::kinetic_log::EventOutcome::Failure)
                    .with_attrs(::serde_json::json!({"board": config.board})),
                "serial peripheral connect refused: config missing 'path'"
            );
            anyhow::Error::msg("Serial peripheral requires path")
        })?;

        if !is_serial_path_allowed(path) {
            anyhow::bail!(
                "Serial path not allowed: {}. Allowed: {}",
                path,
                serial_path_allowlist_hint()
            );
        }

        let name = format!("{}-{}", config.board, path.replace('/', "_"));
        let transport = open_serial_session(&config.board, path, config.baud)?;

        Ok(Self {
            name: name.clone(),
            board_type: config.board.clone(),
            transport,
        })
    }
}

#[async_trait]
impl Peripheral for SerialPeripheral {
    fn name(&self) -> &str {
        &self.name
    }

    fn board_type(&self) -> &str {
        &self.board_type
    }

    async fn connect(&mut self) -> anyhow::Result<()> {
        Ok(())
    }

    async fn disconnect(&mut self) -> anyhow::Result<()> {
        Ok(())
    }

    async fn health_check(&self) -> bool {
        self.transport
            .request("ping", json!({}))
            .await
            .map(|r| r.success)
            .unwrap_or(false)
    }

    fn tools(&self) -> Vec<Box<dyn Tool>> {
        vec![
            Box::new(GpioReadTool {
                transport: self.transport.clone(),
            }),
            Box::new(GpioWriteTool {
                transport: self.transport.clone(),
            }),
        ]
    }
}

impl SerialPeripheral {
    /// Expose transport for capabilities tool (Phase C).
    pub fn transport(&self) -> Arc<SerialTransport> {
        self.transport.clone()
    }
}

/// Tool: read GPIO pin value.
struct GpioReadTool {
    transport: Arc<SerialTransport>,
}

#[async_trait]
impl Tool for GpioReadTool {
    fn name(&self) -> &str {
        "gpio_read"
    }

    fn description(&self) -> &str {
        "Read the value (0 or 1) of a GPIO pin on a connected peripheral (e.g. STM32 Nucleo)"
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "pin": {
                    "type": "integer",
                    "description": "GPIO pin number (e.g. 13 for LED on Nucleo)"
                }
            },
            "required": ["pin"]
        })
    }

    async fn execute(&self, args: Value) -> anyhow::Result<ToolResult> {
        let pin = args.get("pin").and_then(|v| v.as_u64()).ok_or_else(|| {
            ::kinetic_log::record!(
                WARN,
                ::kinetic_log::Event::new(module_path!(), ::kinetic_log::Action::Reject)
                    .with_outcome(::kinetic_log::EventOutcome::Failure)
                    .with_attrs(::serde_json::json!({"tool": "gpio_read", "param": "pin"})),
                "tool argument validation failed: missing parameter"
            );
            anyhow::Error::msg("Missing 'pin' parameter")
        })?;
        self.transport
            .request("gpio_read", json!({ "pin": pin }))
            .await
    }
}

/// Tool: write GPIO pin value.
struct GpioWriteTool {
    transport: Arc<SerialTransport>,
}

#[async_trait]
impl Tool for GpioWriteTool {
    fn name(&self) -> &str {
        "gpio_write"
    }

    fn description(&self) -> &str {
        "Set a GPIO pin high (1) or low (0) on a connected peripheral (e.g. turn on/off LED)"
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "pin": {
                    "type": "integer",
                    "description": "GPIO pin number"
                },
                "value": {
                    "type": "integer",
                    "description": "0 for low, 1 for high"
                }
            },
            "required": ["pin", "value"]
        })
    }

    async fn execute(&self, args: Value) -> anyhow::Result<ToolResult> {
        let pin = args.get("pin").and_then(|v| v.as_u64()).ok_or_else(|| {
            ::kinetic_log::record!(
                WARN,
                ::kinetic_log::Event::new(module_path!(), ::kinetic_log::Action::Reject)
                    .with_outcome(::kinetic_log::EventOutcome::Failure)
                    .with_attrs(::serde_json::json!({"tool": "gpio_write", "param": "pin"})),
                "tool argument validation failed: missing parameter"
            );
            anyhow::Error::msg("Missing 'pin' parameter")
        })?;
        let value = args.get("value").and_then(|v| v.as_u64()).ok_or_else(|| {
            ::kinetic_log::record!(
                WARN,
                ::kinetic_log::Event::new(module_path!(), ::kinetic_log::Action::Reject)
                    .with_outcome(::kinetic_log::EventOutcome::Failure)
                    .with_attrs(::serde_json::json!({"tool": "gpio_write", "param": "value"})),
                "tool argument validation failed: missing parameter"
            );
            anyhow::Error::msg("Missing 'value' parameter")
        })?;
        self.transport
            .request("gpio_write", json!({ "pin": pin, "value": value }))
            .await
    }
}

fn open_serial_session(board: &str, path: &str, baud: u32) -> anyhow::Result<Arc<SerialTransport>> {
    let mut sessions = SERIAL_SESSIONS
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    let sessions = sessions.get_or_insert_with(HashMap::new);
    if let Some(existing) = sessions.get(path)
        && !existing.requests.is_closed()
    {
        remember_board_name(&existing.names, board);
        return Ok(Arc::clone(existing));
    }
    let builder = tokio_serial::new(path, serial_open_baud(path, baud));
    #[cfg(unix)]
    let builder = if should_open_serial_nonexclusive(path) {
        builder.exclusive(false)
    } else {
        builder
    };
    let port = builder.open_native_async().map_err(|e| {
        ::kinetic_log::record!(
            ERROR,
            ::kinetic_log::Event::new(module_path!(), ::kinetic_log::Action::Fail)
                .with_outcome(::kinetic_log::EventOutcome::Failure)
                .with_attrs(::serde_json::json!({
                    "path": path,
                    "baud": baud,
                    "error": format!("{}", e),
                })),
            "serial peripheral open failed"
        );
        anyhow::Error::msg(format!("Failed to open {path}: {e}"))
    })?;
    let transport = SerialTransport::start(board.to_string(), port);
    sessions.insert(path.to_string(), Arc::clone(&transport));
    Ok(transport)
}

fn remember_board_name(names: &StdMutex<Vec<String>>, board: &str) {
    let mut names = names
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    if !names.iter().any(|name| name == board) {
        names.push(board.to_string());
    }
}

fn emit_host_message(names: &StdMutex<Vec<String>>, signal: String, text: String) {
    let boards = names
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .clone();
    for board in boards {
        host_message::emit_host_event(HostEvent {
            board,
            signal: signal.clone(),
            text: text.clone(),
        });
    }
}

async fn run_serial_owner<S>(
    names: Arc<StdMutex<Vec<String>>>,
    stream: S,
    mut requests: mpsc::Receiver<SerialRequest>,
) where
    S: AsyncRead + AsyncWrite + Unpin,
{
    let (reader, mut writer) = tokio::io::split(stream);
    let mut reader = BufReader::new(reader);
    let mut line = String::new();
    loop {
        line.clear();
        tokio::select! {
            biased;
            request = requests.recv() => {
                let Some(request) = request else { break };
                let result = serve_serial_request(
                    &names,
                    &mut reader,
                    &mut writer,
                    &mut line,
                    &request.cmd,
                    request.args,
                )
                .await;
                let _ = request.reply.send(result);
            }
            read = reader.read_line(&mut line) => {
                match read {
                    Ok(0) => break,
                    Ok(_) => deliver_idle_line(&names, &line),
                    Err(error) => {
                        ::kinetic_log::record!(
                            WARN,
                            ::kinetic_log::Event::new(module_path!(), ::kinetic_log::Action::Disconnect)
                                .with_outcome(::kinetic_log::EventOutcome::Failure)
                                .with_attrs(::serde_json::json!({
                                    "error": error.to_string(),
                                })),
                            "serial peripheral listener stopped"
                        );
                        break;
                    }
                }
            }
        }
    }
}

async fn serve_serial_request<R, W>(
    names: &StdMutex<Vec<String>>,
    reader: &mut R,
    writer: &mut W,
    line: &mut String,
    cmd: &str,
    args: Value,
) -> anyhow::Result<Value>
where
    R: AsyncBufReadExt + Unpin,
    W: AsyncWrite + Unpin,
{
    static ID: AtomicU64 = AtomicU64::new(1_000_000);
    let id = ID.fetch_add(1, Ordering::Relaxed).to_string();
    let req = json!({ "id": id, "cmd": cmd, "args": args });
    let bytes = format!("{req}\n");
    writer.write_all(bytes.as_bytes()).await?;
    writer.flush().await?;

    let deadline = Instant::now() + Duration::from_secs(SERIAL_TIMEOUT_SECS);
    let mut skipped = 0usize;
    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            anyhow::bail!("Serial request timed out after {SERIAL_TIMEOUT_SECS}s");
        }
        line.clear();
        let read = tokio::time::timeout(remaining, reader.read_line(line)).await;
        let count = read
            .map_err(|_| {
                anyhow::Error::msg(format!(
                    "Serial request timed out after {SERIAL_TIMEOUT_SECS}s"
                ))
            })?
            .map_err(|error| anyhow::Error::msg(error.to_string()))?;
        if count == 0 {
            anyhow::bail!("serial peripheral disconnected");
        }
        let trimmed = line.trim();
        if let Some((signal, text)) = host_message::parse_host_message(trimmed) {
            emit_host_message(names, signal, text);
            continue;
        }
        if let Ok(resp) = serde_json::from_str::<Value>(trimmed)
            && resp.get("id").and_then(Value::as_str) == Some(id.as_str())
        {
            return Ok(resp);
        }
        if skipped == MAX_SKIPPED_RESPONSE_FRAMES {
            anyhow::bail!(
                "Serial response skip limit exceeded (maximum {MAX_SKIPPED_RESPONSE_FRAMES} frames)"
            );
        }
        skipped += 1;
    }
}

fn deliver_idle_line(names: &StdMutex<Vec<String>>, line: &str) {
    let Some((signal, text)) = host_message::parse_host_message(line) else {
        return;
    };
    let boards = names
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .clone();
    ::kinetic_log::record!(
        INFO,
        ::kinetic_log::Event::new(module_path!(), ::kinetic_log::Action::Receive).with_attrs(
            ::serde_json::json!({
                "boards": boards,
                "signal": signal,
            })
        ),
        "serial peripheral received a host message"
    );
    emit_host_message(names, signal, text);
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::io::DuplexStream;
    use tokio::time::{Duration, sleep, timeout};

    async fn read_frame(port: &mut DuplexStream) -> Vec<u8> {
        let mut frame = Vec::new();
        let mut byte = [0u8; 1];
        loop {
            port.read_exact(&mut byte)
                .await
                .expect("device should receive a complete frame");
            if byte[0] == b'\n' {
                return frame;
            }
            frame.push(byte[0]);
        }
    }

    async fn read_request_id(port: &mut DuplexStream) -> String {
        let frame = read_frame(port).await;
        let request: Value =
            serde_json::from_slice(&frame).expect("host request should be valid JSON");
        request
            .get("id")
            .and_then(Value::as_str)
            .expect("host request should contain a string id")
            .to_owned()
    }

    async fn write_frame(port: &mut DuplexStream, frame: &[u8]) {
        port.write_all(frame)
            .await
            .expect("device should write response frame");
        port.write_all(b"\n")
            .await
            .expect("device should terminate response frame");
        port.flush()
            .await
            .expect("device should flush response frame");
    }

    async fn write_json_frame(port: &mut DuplexStream, frame: Value) {
        let frame = serde_json::to_vec(&frame).expect("response should serialize");
        write_frame(port, &frame).await;
    }

    #[tokio::test]
    async fn wrong_id_then_matching_response_succeeds() {
        let (mut host, mut device) = tokio::io::duplex(4096);

        let host_request = send_request(&mut host, "ping", json!({}));
        let device_response = async {
            let request_id = read_request_id(&mut device).await;
            write_json_frame(
                &mut device,
                json!({"id": "unexpected", "ok": true, "result": "stale"}),
            )
            .await;
            write_json_frame(
                &mut device,
                json!({"id": request_id, "ok": true, "result": "current"}),
            )
            .await;
        };

        let (response, ()) = tokio::join!(host_request, device_response);
        let response = response.expect("matching response should succeed");
        assert_eq!(response["result"], "current");
    }

    #[tokio::test]
    async fn malformed_frame_then_matching_response_succeeds() {
        let (mut host, mut device) = tokio::io::duplex(4096);

        let host_request = send_request(&mut host, "ping", json!({}));
        let device_response = async {
            let request_id = read_request_id(&mut device).await;
            write_frame(&mut device, b"not-json").await;
            write_json_frame(
                &mut device,
                json!({"id": request_id, "ok": true, "result": "current"}),
            )
            .await;
        };

        let (response, ()) = tokio::join!(host_request, device_response);
        let response = response.expect("matching response should succeed");
        assert_eq!(response["result"], "current");
    }

    #[tokio::test]
    async fn unsolicited_frame_flood_does_not_extend_deadline_and_stream_recovers() {
        let (mut host, mut device) = tokio::io::duplex(4096);

        let host_requests = async {
            let first = timeout(
                Duration::from_millis(200),
                send_request(&mut host, "first", json!({})),
            )
            .await;
            assert!(
                first.is_err(),
                "unsolicited frames must not extend the original request deadline"
            );

            let second = timeout(
                Duration::from_secs(2),
                send_request(&mut host, "second", json!({})),
            )
            .await
            .expect("subsequent request should finish")
            .expect("subsequent request should recover on the same stream");
            assert_eq!(second["result"], "recovered");
        };

        let device_responses = async {
            let _first_request_id = read_request_id(&mut device).await;
            for sequence in 0..5 {
                write_json_frame(
                    &mut device,
                    json!({
                        "id": format!("unsolicited-{sequence}"),
                        "ok": true,
                        "result": "stale"
                    }),
                )
                .await;
                sleep(Duration::from_millis(60)).await;
            }

            let second_request_id = read_request_id(&mut device).await;
            write_json_frame(
                &mut device,
                json!({"id": second_request_id, "ok": true, "result": "recovered"}),
            )
            .await;
        };

        tokio::join!(host_requests, device_responses);
    }

    #[tokio::test]
    async fn unsolicited_frame_skip_limit_is_bounded() {
        let (mut host, mut device) = tokio::io::duplex(4096);

        let host_request = send_request(&mut host, "ping", json!({}));
        let device_response = async {
            let _request_id = read_request_id(&mut device).await;
            for sequence in 0..=MAX_SKIPPED_RESPONSE_FRAMES {
                write_json_frame(
                    &mut device,
                    json!({"id": format!("unsolicited-{sequence}"), "ok": true}),
                )
                .await;
            }
        };

        let (response, ()) = tokio::join!(host_request, device_response);
        let error = response.expect_err("skip limit should reject an unsolicited-frame flood");
        assert!(
            error.to_string().contains("skip limit exceeded"),
            "unexpected error: {error:#}"
        );
    }

    static SINK_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

    #[tokio::test]
    async fn idle_host_message_reaches_the_listener_and_ping_still_works() {
        let _guard = SINK_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let (tx, mut rx) = tokio::sync::mpsc::channel(4);
        crate::host_message::set_host_event_sink(tx);
        struct ClearSink;
        impl Drop for ClearSink {
            fn drop(&mut self) {
                crate::host_message::clear_host_event_sink();
            }
        }
        let _clear = ClearSink;

        let (host, mut device) = tokio::io::duplex(4096);
        let transport = SerialTransport::start("esp32".into(), host);
        remember_board_name(&transport.names, "nucleo");
        write_frame(
            &mut device,
            br#"{"event":"message","signal":"keypad","text":"1234"}"#,
        )
        .await;
        let mut boards = Vec::new();
        for _ in 0..2 {
            let event = timeout(Duration::from_secs(2), rx.recv())
                .await
                .expect("event wait")
                .expect("event");
            assert_eq!(event.signal, "keypad");
            assert_eq!(event.text, "1234");
            boards.push(event.board);
        }
        assert_eq!(boards, ["esp32".to_string(), "nucleo".to_string()]);

        let ping = transport.request("ping", json!({}));
        let device_response = async {
            let request_id = read_request_id(&mut device).await;
            write_frame(
                &mut device,
                br#"{"event":"message","signal":"button","text":""}"#,
            )
            .await;
            write_json_frame(
                &mut device,
                json!({"id": request_id, "ok": true, "result": "pong"}),
            )
            .await;
        };
        let (result, ()) = tokio::join!(ping, device_response);
        let result = result.expect("ping");
        assert!(result.success);
        assert_eq!(result.output.as_str(), "pong");
        let button = timeout(Duration::from_secs(2), rx.recv())
            .await
            .expect("button wait")
            .expect("button");
        assert_eq!(button.signal, "button");
        assert!(button.text.is_empty());
    }
}
