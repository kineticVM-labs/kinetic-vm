//! Local operation records.
//!
//! A builder lists the fields they want kept. `monad_attest` checks the
//! caller's JSON against that schema, writes one canonical line, and signs
//! those same bytes. The request hash for that attestation is stored beside
//! the line so a listing can name it. Chat ids, wallets, and access codes
//! are not added.

use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use kinetic_config::schema::{OperationFieldKind, RecordsConfig};
use serde_json::{Map, Value};

static APPEND_LOCK: Mutex<()> = Mutex::new(());

const REQUESTS_FILE: &str = "operation-requests.txt";
const MAX_LISTING_ROWS: usize = 5000;
const MAX_LISTING_BYTES: usize = 20 * 1024 * 1024;

/// One attested line, ready to send with a listing.
#[derive(Debug, PartialEq, Eq)]
pub struct ListingRow {
    pub params_hash: String,
    pub request_hash: String,
}

/// The operations file and one manifest row per line.
#[derive(Debug, PartialEq, Eq)]
pub struct ListingRecords {
    pub data: Vec<u8>,
    pub rows: Vec<ListingRow>,
}

/// Why the local records cannot be listed.
#[derive(Debug, PartialEq, Eq)]
pub enum ListingRecordsError {
    Empty,
    MissingRequests,
    Mismatch,
    BlankLine,
    BadRequest,
    DuplicateRequest,
    TooMany,
    TooLarge,
    Io(String),
}

/// Request-hash file that sits beside an operations file.
#[must_use]
pub fn requests_path_for(records_path: &Path) -> PathBuf {
    records_path.with_file_name(REQUESTS_FILE)
}

/// What `monad_attest` should sign.
#[derive(Debug, PartialEq, Eq)]
pub enum PreparedOperation {
    /// No record schema is configured. Sign the caller's parameters as given.
    Off,
    /// Canonical one-line JSON. Sign these bytes and append this line.
    Line(String),
}

/// Check `params` against the builder's schema.
///
/// An empty schema returns [`PreparedOperation::Off`]. A configured schema
/// returns the exact line that will be stored and signed. Key order in the
/// caller's JSON does not change that line.
pub fn prepare_operation(
    schema: &RecordsConfig,
    params: &str,
) -> Result<PreparedOperation, String> {
    if !schema.recording() {
        return Ok(PreparedOperation::Off);
    }
    schema.check()?;
    let value: Value = serde_json::from_str(params).map_err(|_| {
        "params must be a JSON object when record fields are configured".to_string()
    })?;
    let Some(object) = value.as_object() else {
        return Err("params must be a JSON object when record fields are configured".to_string());
    };
    for key in object.keys() {
        if !schema.fields.iter().any(|field| field.name == *key) {
            return Err(format!(
                "params includes {key}, which is not in the record schema"
            ));
        }
    }
    let mut canonical = Map::new();
    for field in &schema.fields {
        match object.get(&field.name) {
            None if field.required => {
                return Err(format!("params is missing {}", field.name));
            }
            None => {}
            Some(value) if !value_matches(value, field.kind) => {
                return Err(format!("{} must be a {}", field.name, field.kind.as_str()));
            }
            Some(value) => {
                canonical.insert(field.name.clone(), canonicalize(value));
            }
        }
    }
    let line = serde_json::to_string(&Value::Object(sorted_object(canonical)))
        .map_err(|_| "the operation record could not be encoded".to_string())?;
    if line.contains('\n') || line.contains('\r') {
        return Err("the operation record must be one line".to_string());
    }
    Ok(PreparedOperation::Line(line))
}

/// Short field list for the attest tool's description.
#[must_use]
pub fn field_summary(schema: &RecordsConfig) -> String {
    schema
        .fields
        .iter()
        .map(|field| {
            let presence = if field.required {
                "required"
            } else {
                "optional"
            };
            format!("{} ({}, {presence})", field.name, field.kind.as_str())
        })
        .collect::<Vec<_>>()
        .join(", ")
}

/// Append one canonical line to the operations file.
///
/// The directory is mode `0700` and the file is mode `0600` on Unix.
pub fn append_operation_line(path: &Path, line: &str) -> Result<(), String> {
    let _guard = APPEND_LOCK.lock().unwrap_or_else(|err| err.into_inner());
    append_line_locked(path, line)
}

/// Store one signed line and the attestation request hash that names it.
///
/// The line file stays the exact signed text. The hash is one line in the
/// sibling request file, in the same order.
pub fn append_attested_operation(
    records_path: &Path,
    line: &str,
    request_hash: &str,
) -> Result<(), String> {
    let request_hash = canonical_request_hash(request_hash)?;
    let _guard = APPEND_LOCK.lock().unwrap_or_else(|err| err.into_inner());
    append_line_locked(records_path, line)?;
    let requests_path = requests_path_for(records_path);
    append_line_locked(&requests_path, &request_hash).map_err(|error| {
        format!("the operation line was stored but its request hash was not: {error}")
    })
}

/// Read the operations file and pair each line with its request hash.
pub fn load_listing_records(records_path: &Path) -> Result<ListingRecords, ListingRecordsError> {
    let _guard = APPEND_LOCK.lock().unwrap_or_else(|err| err.into_inner());
    let data = match std::fs::read(records_path) {
        Ok(data) => data,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Err(ListingRecordsError::Empty);
        }
        Err(error) => return Err(ListingRecordsError::Io(error.to_string())),
    };
    if data.len() > MAX_LISTING_BYTES {
        return Err(ListingRecordsError::TooLarge);
    }
    let lines = split_record_lines(&data)?;
    if lines.is_empty() {
        return Err(ListingRecordsError::Empty);
    }
    if lines.len() > MAX_LISTING_ROWS {
        return Err(ListingRecordsError::TooMany);
    }
    let requests_path = requests_path_for(records_path);
    let requests = match std::fs::read(&requests_path) {
        Ok(requests) => requests,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Err(ListingRecordsError::MissingRequests);
        }
        Err(error) => return Err(ListingRecordsError::Io(error.to_string())),
    };
    let request_lines = split_record_lines(&requests)?;
    if request_lines.len() != lines.len() {
        return Err(ListingRecordsError::Mismatch);
    }
    let mut seen = std::collections::HashSet::new();
    let mut rows = Vec::with_capacity(lines.len());
    for (line, request_hash) in lines.iter().zip(request_lines) {
        let Ok(request_hash) = canonical_request_hash(&request_hash) else {
            return Err(ListingRecordsError::BadRequest);
        };
        if !seen.insert(request_hash.clone()) {
            return Err(ListingRecordsError::DuplicateRequest);
        }
        let params_hash = kinetic_chain::attested_params_hash(line).to_string();
        rows.push(ListingRow {
            params_hash,
            request_hash,
        });
    }
    Ok(ListingRecords { data, rows })
}

fn canonical_request_hash(value: &str) -> Result<String, String> {
    let hex = value.trim().strip_prefix("0x").unwrap_or(value.trim());
    if hex.len() != 64 || !hex.chars().all(|char| char.is_ascii_hexdigit()) {
        return Err("the attestation request hash is not a 32-byte hash".to_string());
    }
    Ok(format!("0x{}", hex.to_ascii_lowercase()))
}

fn split_record_lines(bytes: &[u8]) -> Result<Vec<String>, ListingRecordsError> {
    let text = std::str::from_utf8(bytes)
        .map_err(|_| ListingRecordsError::Io("the operation records are not UTF-8".to_string()))?;
    let mut body = text;
    if let Some(stripped) = body.strip_prefix('\u{feff}') {
        body = stripped;
    }
    if let Some(stripped) = body.strip_suffix('\n') {
        body = stripped;
    }
    if let Some(stripped) = body.strip_suffix('\r') {
        body = stripped;
    }
    if body.is_empty() {
        return Ok(Vec::new());
    }
    let mut lines = Vec::new();
    for line in body.split('\n') {
        let line = line.strip_suffix('\r').unwrap_or(line);
        if line.is_empty() {
            return Err(ListingRecordsError::BlankLine);
        }
        lines.push(line.to_string());
    }
    Ok(lines)
}

fn append_line_locked(path: &Path, line: &str) -> Result<(), String> {
    if line.is_empty() || line.contains('\n') || line.contains('\r') {
        return Err("the operation record must be one line".to_string());
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|err| format!("could not create the records directory: {err}"))?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(parent, std::fs::Permissions::from_mode(0o700))
                .map_err(|err| format!("could not protect the records directory: {err}"))?;
        }
    }
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|err| format!("could not open the operations file: {err}"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        file.set_permissions(std::fs::Permissions::from_mode(0o600))
            .map_err(|err| format!("could not protect the operations file: {err}"))?;
    }
    writeln!(file, "{line}")
        .map_err(|err| format!("could not write the operation record: {err}"))?;
    file.sync_all()
        .map_err(|err| format!("could not store the operation record: {err}"))?;
    Ok(())
}

fn value_matches(value: &Value, kind: OperationFieldKind) -> bool {
    match kind {
        OperationFieldKind::String => value.is_string(),
        OperationFieldKind::Number => value.is_number(),
        OperationFieldKind::Boolean => value.is_boolean(),
        OperationFieldKind::Object => value.is_object(),
        OperationFieldKind::Array => value.is_array(),
    }
}

fn canonicalize(value: &Value) -> Value {
    match value {
        Value::Object(object) => Value::Object(sorted_object(
            object
                .iter()
                .map(|(key, child)| (key.clone(), canonicalize(child)))
                .collect(),
        )),
        Value::Array(items) => Value::Array(items.iter().map(canonicalize).collect()),
        other => other.clone(),
    }
}

fn sorted_object(object: Map<String, Value>) -> Map<String, Value> {
    let mut keys: Vec<String> = object.keys().cloned().collect();
    keys.sort();
    let mut sorted = Map::new();
    for key in keys {
        if let Some(value) = object.get(&key) {
            sorted.insert(key, value.clone());
        }
    }
    sorted
}

#[cfg(test)]
mod tests {
    use super::*;
    use kinetic_config::schema::OperationRecordField;

    fn schema(fields: Vec<OperationRecordField>) -> RecordsConfig {
        RecordsConfig { fields }
    }

    fn field(name: &str, kind: OperationFieldKind, required: bool) -> OperationRecordField {
        OperationRecordField {
            name: name.to_string(),
            kind,
            required,
        }
    }

    #[test]
    fn an_empty_schema_leaves_recording_off() {
        let prepared = prepare_operation(&RecordsConfig::default(), "slot-1").expect("prepared");
        assert_eq!(prepared, PreparedOperation::Off);
    }

    #[test]
    fn the_canonical_line_sorts_keys_and_drops_nothing_required() {
        let records = schema(vec![
            field("subject", OperationFieldKind::String, true),
            field("count", OperationFieldKind::Number, true),
            field("note", OperationFieldKind::String, false),
            field("detail", OperationFieldKind::Object, false),
        ]);
        let first = prepare_operation(
            &records,
            r#"{"count":2,"subject":"soil","detail":{"z":1,"a":true}}"#,
        )
        .expect("first");
        let second = prepare_operation(
            &records,
            "{\n  \"subject\" : \"soil\",\n  \"count\" : 2,\n  \"detail\" : { \"a\" : true, \"z\" : 1 }\n}",
        )
        .expect("second");
        assert_eq!(
            first,
            PreparedOperation::Line(
                r#"{"count":2,"detail":{"a":true,"z":1},"subject":"soil"}"#.to_string()
            )
        );
        assert_eq!(first, second);
    }

    #[test]
    fn a_record_outside_the_schema_is_refused() {
        let records = schema(vec![field("subject", OperationFieldKind::String, true)]);
        let missing = prepare_operation(&records, r#"{}"#).expect_err("missing");
        assert!(missing.contains("subject"));
        let extra =
            prepare_operation(&records, r#"{"subject":"a","chat_id":"1"}"#).expect_err("extra");
        assert!(extra.contains("chat_id"));
        let wrong = prepare_operation(&records, r#"{"subject":1}"#).expect_err("type");
        assert!(wrong.contains("string"));
        let not_object = prepare_operation(&records, r#""soil""#).expect_err("object");
        assert!(not_object.contains("JSON object"));
    }

    #[test]
    fn a_bad_schema_is_refused_before_a_line_is_made() {
        let records = schema(vec![
            field("subject", OperationFieldKind::String, true),
            field("subject", OperationFieldKind::String, true),
        ]);
        let error = prepare_operation(&records, r#"{"subject":"a"}"#).expect_err("duplicate");
        assert!(error.contains("more than once"));
        assert!(
            schema(vec![field("1slot", OperationFieldKind::String, true)])
                .check()
                .is_err()
        );
    }

    #[test]
    fn lines_append_in_order_and_the_file_stays_private() {
        let dir = tempfile::tempdir().expect("temp");
        let path = dir.path().join("records").join("operations.jsonl");
        append_operation_line(&path, r#"{"subject":"a"}"#).expect("first");
        append_operation_line(&path, r#"{"subject":"b"}"#).expect("second");
        let stored = std::fs::read_to_string(&path).expect("read");
        assert_eq!(stored, "{\"subject\":\"a\"}\n{\"subject\":\"b\"}\n");
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let file_mode = std::fs::metadata(&path).expect("file").permissions().mode() & 0o777;
            let dir_mode = std::fs::metadata(path.parent().expect("parent"))
                .expect("dir")
                .permissions()
                .mode()
                & 0o777;
            assert_eq!(file_mode, 0o600);
            assert_eq!(dir_mode, 0o700);
        }
    }

    #[test]
    fn an_attested_line_keeps_its_request_hash_beside_the_signed_text() {
        let dir = tempfile::tempdir().expect("temp");
        let path = dir.path().join("records").join("operations.jsonl");
        let line = r#"{"item":"cola"}"#;
        let request = format!("0x{}", "AB".repeat(32));
        append_attested_operation(&path, line, &request).expect("stored");
        let stored = std::fs::read_to_string(&path).expect("line");
        assert_eq!(stored, "{\"item\":\"cola\"}\n");
        let requests = std::fs::read_to_string(requests_path_for(&path)).expect("requests");
        assert_eq!(requests, format!("0x{}\n", "ab".repeat(32)));
        let listing = load_listing_records(&path).expect("listing");
        assert_eq!(listing.data, stored.into_bytes());
        assert_eq!(
            listing.rows,
            vec![ListingRow {
                params_hash: "0x7ce00475877b309340833ecdea42ffc4413dacfa150d3fe80ce807ddb43b9301"
                    .to_string(),
                request_hash: format!("0x{}", "ab".repeat(32)),
            }]
        );
    }

    #[test]
    fn a_bad_request_hash_does_not_write_the_line() {
        let dir = tempfile::tempdir().expect("temp");
        let path = dir.path().join("operations.jsonl");
        let error =
            append_attested_operation(&path, r#"{"item":"cola"}"#, "0x1234").expect_err("hash");
        assert!(error.contains("32-byte"));
        assert!(!path.exists());
        assert!(!requests_path_for(&path).exists());
    }

    #[test]
    fn a_line_without_a_request_hash_cannot_be_listed() {
        let dir = tempfile::tempdir().expect("temp");
        let path = dir.path().join("operations.jsonl");
        append_operation_line(&path, r#"{"item":"cola"}"#).expect("line");
        assert_eq!(
            load_listing_records(&path).expect_err("missing"),
            ListingRecordsError::MissingRequests
        );
    }
}
