use core::fmt::Write;
use heapless::String;

/// Write a successful JSON response into `buf`.
/// Format: `{"id":"<id>","ok":true,"result":"<result>"}`
pub fn write_ok<const N: usize>(buf: &mut String<N>, id: &str, result: &str) {
    buf.clear();
    let _ = write!(
        buf,
        "{{\"id\":\"{}\",\"ok\":true,\"result\":\"{}\"}}",
        id, result
    );
}

/// Write an error JSON response into `buf`.
/// Format: `{"id":"<id>","ok":false,"result":"","error":"<error>"}`
pub fn write_err<const N: usize>(buf: &mut String<N>, id: &str, error: &str) {
    buf.clear();
    let _ = write!(
        buf,
        "{{\"id\":\"{}\",\"ok\":false,\"result\":\"\",\"error\":\"{}\"}}",
        id, error
    );
}

/// Write one unsolicited message for the host.
/// Format: `{"event":"message","signal":"<signal>","text":"<text>"}`
///
/// Returns false when `signal` is not a token, `text` is longer than 512
/// bytes, the text contains a control character other than tab or newline,
/// or the line does not fit in `buf`.
pub fn write_host_message<const N: usize>(buf: &mut String<N>, signal: &str, text: &str) -> bool {
    if !host_signal_ok(signal) || text.len() > 512 {
        buf.clear();
        return false;
    }
    buf.clear();
    if buf.push_str(r#"{"event":"message","signal":""#).is_err()
        || !push_json_string_contents(buf, signal)
        || buf.push_str(r#"","text":""#).is_err()
        || !push_json_string_contents(buf, text)
        || buf.push('"').is_err()
        || buf.push('}').is_err()
    {
        buf.clear();
        return false;
    }
    true
}

fn host_signal_ok(signal: &str) -> bool {
    let mut chars = signal.chars();
    match chars.next() {
        Some(first) if first.is_ascii_alphabetic() || first == '_' => {}
        _ => return false,
    }
    signal.len() <= 64 && chars.all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

fn push_json_string_contents<const N: usize>(buf: &mut String<N>, value: &str) -> bool {
    for c in value.chars() {
        let ok = match c {
            '"' => buf.push_str("\\\"").is_ok(),
            '\\' => buf.push_str("\\\\").is_ok(),
            '\n' => buf.push_str("\\n").is_ok(),
            '\r' => buf.push_str("\\r").is_ok(),
            '\t' => buf.push_str("\\t").is_ok(),
            c if c.is_control() => return false,
            c => buf.push(c).is_ok(),
        };
        if !ok {
            return false;
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn write_ok_response() {
        let mut buf = String::<128>::new();
        write_ok(&mut buf, "42", "pong");
        assert_eq!(buf.as_str(), r#"{"id":"42","ok":true,"result":"pong"}"#);
    }

    #[test]
    fn write_ok_done() {
        let mut buf = String::<128>::new();
        write_ok(&mut buf, "1", "done");
        assert_eq!(buf.as_str(), r#"{"id":"1","ok":true,"result":"done"}"#);
    }

    #[test]
    fn write_error_response() {
        let mut buf = String::<128>::new();
        write_err(&mut buf, "42", "Invalid pin -1");
        assert_eq!(
            buf.as_str(),
            r#"{"id":"42","ok":false,"result":"","error":"Invalid pin -1"}"#
        );
    }

    #[test]
    fn write_ok_clears_buffer() {
        let mut buf = String::<128>::new();
        let _ = write!(buf, "garbage");
        write_ok(&mut buf, "1", "pong");
        assert_eq!(buf.as_str(), r#"{"id":"1","ok":true,"result":"pong"}"#);
    }

    #[test]
    fn write_host_message_escapes_and_rejects_a_bad_signal() {
        let mut buf = String::<128>::new();
        assert!(write_host_message(&mut buf, "keypad", r#"12"34"#));
        assert_eq!(
            buf.as_str(),
            r#"{"event":"message","signal":"keypad","text":"12\"34"}"#
        );
        assert!(!write_host_message(&mut buf, "1pin", "x"));
        assert!(buf.is_empty());
    }

    #[test]
    fn write_err_unknown_command() {
        let mut buf = String::<128>::new();
        write_err(&mut buf, "99", "Unknown command");
        assert_eq!(
            buf.as_str(),
            r#"{"id":"99","ok":false,"result":"","error":"Unknown command"}"#
        );
    }
}
