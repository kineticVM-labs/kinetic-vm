//! A line the microcontroller sends without being asked.
//!
//! The firmware writes `{"event":"message","signal":"...","text":"..."}`.
//! The serial owner forwards a parsed line to the daemon, which starts a
//! procedure whose peripheral trigger is `board/signal`. The text is the
//! procedure's payload.

use serde_json::Value;
use std::sync::Mutex;
use tokio::sync::mpsc;

/// One message a board pushed up the serial line.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HostEvent {
    /// Configured board name, such as `esp32`.
    pub board: String,
    /// Signal name the procedure matches, such as `keypad`.
    pub signal: String,
    /// Message body. Empty when the event has no text.
    pub text: String,
}

const MAX_TEXT_BYTES: usize = 512;

static HOST_EVENT_SINK: Mutex<Option<mpsc::Sender<HostEvent>>> = Mutex::new(None);

/// Receive board messages in this process. A later call replaces the previous
/// sender, so the next daemon generation owns the events.
pub fn set_host_event_sink(sender: mpsc::Sender<HostEvent>) {
    if let Ok(mut guard) = HOST_EVENT_SINK.lock() {
        *guard = Some(sender);
    }
}

/// Drop the current receiver target. Events that arrive with no sink are logged
/// and not delivered.
pub fn clear_host_event_sink() {
    if let Ok(mut guard) = HOST_EVENT_SINK.lock() {
        *guard = None;
    }
}

pub(crate) fn emit_host_event(event: HostEvent) {
    let sender = HOST_EVENT_SINK.lock().ok().and_then(|guard| guard.clone());
    let Some(sender) = sender else {
        ::kinetic_log::record!(
            INFO,
            ::kinetic_log::Event::new(module_path!(), ::kinetic_log::Action::Skip).with_attrs(
                ::serde_json::json!({
                    "board": event.board,
                    "signal": event.signal,
                })
            ),
            "serial host message arrived with no procedure listener"
        );
        return;
    };
    if sender.try_send(event.clone()).is_err() {
        ::kinetic_log::record!(
            WARN,
            ::kinetic_log::Event::new(module_path!(), ::kinetic_log::Action::Note)
                .with_outcome(::kinetic_log::EventOutcome::Unknown)
                .with_attrs(::serde_json::json!({
                    "board": event.board,
                    "signal": event.signal,
                })),
            "serial host message dropped because the procedure listener is busy"
        );
    }
}

/// Parse a firmware event line. A command response returns `None`.
pub fn parse_host_message(line: &str) -> Option<(String, String)> {
    let value: Value = serde_json::from_str(line.trim()).ok()?;
    if value.get("event").and_then(Value::as_str) != Some("message") {
        return None;
    }
    let signal = value.get("signal").and_then(Value::as_str)?;
    if !host_signal_ok(signal) {
        return None;
    }
    let text = value.get("text").and_then(Value::as_str).unwrap_or("");
    if text.len() > MAX_TEXT_BYTES {
        return None;
    }
    Some((signal.to_string(), text.to_string()))
}

fn host_signal_ok(signal: &str) -> bool {
    let mut chars = signal.chars();
    match chars.next() {
        Some(first) if first.is_ascii_alphabetic() || first == '_' => {}
        _ => return false,
    }
    signal.len() <= 64 && chars.all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_host_message_reads_signal_and_text() {
        let parsed = parse_host_message(r#"{"event":"message","signal":"keypad","text":"1234"}"#)
            .expect("event");
        assert_eq!(parsed, ("keypad".to_string(), "1234".to_string()));
    }

    #[test]
    fn parse_host_message_ignores_a_command_response() {
        assert!(parse_host_message(r#"{"id":"1","ok":true,"result":"done"}"#).is_none());
    }

    #[test]
    fn parse_host_message_rejects_a_signal_that_starts_with_a_digit() {
        assert!(parse_host_message(r#"{"event":"message","signal":"1pin","text":"x"}"#).is_none());
    }
}
