//! Short lines for the operator watching `kinetic daemon`.
//!
//! The trace file still receives the full record. These lines are the few
//! events that also belong on the terminal after the daemon is listening.

use std::io::Write;

const ERROR_CHARS: usize = 160;

/// Print one Fluent status line.
pub fn say(key: &str) {
    show(&crate::i18n::get_required_cli_string(key));
}

/// Print one Fluent status line with arguments.
pub fn say_with(key: &str, args: &[(&str, &str)]) {
    show(&crate::i18n::get_required_cli_string_with_args(key, args));
}

/// A recorded attestation. `tx` is the transaction hash to open in an explorer.
pub fn attested(action: &str, tx: &str) {
    say_with("cli-console-attested", &[("action", action), ("tx", tx)]);
}

/// A tool that returned a failure. The detail is scrubbed and kept to one line.
pub fn tool_failed(tool: &str, error: &str) {
    let error = shorten(&crate::security::scrub(error));
    say_with(
        "cli-console-tool-error",
        &[("tool", tool), ("error", error.as_str())],
    );
}

fn show(line: &str) {
    println!("{line}");
    let _ = std::io::stdout().flush();
    ::kinetic_log::record!(
        INFO,
        ::kinetic_log::Event::new(module_path!(), ::kinetic_log::Action::Note)
            .with_attrs(::serde_json::json!({"line": line})),
        "operator status"
    );
}

fn shorten(text: &str) -> String {
    let mut out = String::new();
    for ch in text.chars() {
        if out.chars().count() >= ERROR_CHARS {
            break;
        }
        let ch = if ch.is_control() { ' ' } else { ch };
        if ch == ' ' && out.ends_with(' ') {
            continue;
        }
        out.push(ch);
    }
    let out = out.trim().to_string();
    if out.is_empty() {
        "failed".to_string()
    } else {
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn attested_line_ends_with_the_transaction_hash() {
        let line = crate::i18n::get_english_cli_string_with_args(
            "cli-console-attested",
            &[("action", "dispense"), ("tx", "0xabc")],
        );
        assert_eq!(line, "⛓️ Attestation recorded onchain for dispense 0xabc");
    }

    #[test]
    fn an_error_detail_is_one_short_line() {
        let detail = format!("no gas\n{}", "x".repeat(400));
        let short = shorten(&detail);
        assert!(!short.contains('\n'));
        assert!(short.starts_with("no gas "));
        assert!(short.chars().count() <= ERROR_CHARS);
        assert_eq!(shorten(" \n\t "), "failed");
    }
}
