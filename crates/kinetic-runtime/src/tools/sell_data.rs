//! Publish attested operation records to the marketplace.
//!
//! The model supplies the listing text. It asks the owner, through
//! `ask_user`, for any field it is not sure about. The device sends the
//! operations file and a manifest. It does not hold a Pinata key.

use std::path::PathBuf;
use std::time::Duration;

use async_trait::async_trait;
use kinetic_api::tool::{Tool, ToolResult};
use kinetic_chain::{BootReport, DeviceChain};
use kinetic_config::schema::{ChainConfig, Config};
use kinetic_config::secrets::SecretStore;
use serde_json::{Value, json};

use crate::records::{self, ListingRecords, ListingRecordsError};

const LISTING_CHAIN_ID: u64 = 10143;
const MACHINES: &[&str] = &[
    "vending", "arm", "drone", "amr", "sensor", "humanoid", "other",
];
const LICENSES: &[&str] = &["research", "commercial", "audit"];

pub struct SellDataTool {
    chain: ChainConfig,
    key_dir: PathBuf,
    marketplace_url: String,
    marketplace_key: Option<String>,
    records_path: PathBuf,
}

struct ListingFields {
    title: String,
    summary: String,
    description: String,
    machine_type: String,
    license: String,
    price_mon: String,
}

#[derive(Debug)]
enum PublishError {
    Unreachable,
    Refused(String),
}

impl SellDataTool {
    #[must_use]
    pub fn new(config: &Config, key_dir: PathBuf) -> Self {
        Self {
            chain: config.chain.clone(),
            key_dir,
            marketplace_url: config.marketplace.url.clone(),
            marketplace_key: config.marketplace.key.clone(),
            records_path: config.operation_records_path(),
        }
    }

    fn listing_key(&self) -> Option<String> {
        let key = self.marketplace_key.as_deref()?.trim();
        if key.is_empty() || SecretStore::is_encrypted(key) {
            None
        } else {
            Some(key.to_string())
        }
    }
}

kinetic_api::tool_attribution!(SellDataTool, kinetic_api::attribution::ToolKind::Plugin);

#[async_trait]
impl Tool for SellDataTool {
    fn name(&self) -> &str {
        "sell_data"
    }

    fn description(&self) -> &str {
        "Publish this device's attested operation records on the Kinetic marketplace. \
         The host reads the records and their request hashes. Do not read or edit that file. \
         If you are not sure of the title, summary, description, machine type, license, or price, \
         use ask_user before calling this. Do not guess the price. \
         machine_type is vending, arm, drone, amr, sensor, humanoid, or other. \
         license is research, commercial, or audit. \
         price_mon is a MON amount greater than zero, such as 1.5."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Listing title, 80 characters or fewer"},
                "summary": {"type": "string", "description": "One-line summary, 180 characters or fewer"},
                "description": {"type": "string", "description": "What the records contain, at least 20 characters"},
                "machine_type": {"type": "string", "description": "vending, arm, drone, amr, sensor, humanoid, or other"},
                "license": {"type": "string", "description": "research, commercial, or audit"},
                "price_mon": {"type": "string", "description": "Price in MON, greater than zero"}
            },
            "required": ["title", "summary", "description", "machine_type", "license", "price_mon"]
        })
    }

    async fn execute(&self, args: Value) -> anyhow::Result<ToolResult> {
        let Some(key) = self.listing_key() else {
            return Ok(ToolResult::err(text("cli-owner-sell-data-needs-key")));
        };
        if self.chain.chain_id != LISTING_CHAIN_ID {
            return Ok(refused(
                "Listings go on Monad testnet, where the Kinetic attestor is deployed.",
            ));
        }
        let batch = match records::load_listing_records(&self.records_path) {
            Ok(batch) => batch,
            Err(error) => return Ok(ToolResult::err(batch_message(error))),
        };
        let fields = match listing_fields(&args) {
            Ok(fields) => fields,
            Err(reason) => return Ok(refused(&reason)),
        };
        let session = match DeviceChain::open(&self.chain, &self.key_dir).await {
            Ok(session) => session,
            Err(error) => return Ok(ToolResult::err(failed(&error.to_string()))),
        };
        let report = match session.identity().await {
            Ok(report) => report,
            Err(error) => return Ok(ToolResult::err(failed(&error.to_string()))),
        };
        let BootReport::Claimed { agent_id, .. } = report else {
            return Ok(ToolResult::err(text("cli-chain-not-claimed")));
        };
        let agent_id = agent_id.to_string();
        match publish_listing(&self.marketplace_url, &key, &fields, &agent_id, &batch).await {
            Ok(url) => Ok(ToolResult::ok(text_with(
                "cli-sell-data-listed",
                &[("count", &batch.rows.len().to_string()), ("url", &url)],
            ))),
            Err(PublishError::Unreachable) => {
                Ok(ToolResult::err(text("cli-sell-data-unreachable")))
            }
            Err(PublishError::Refused(reason)) => Ok(refused(&scrub(&reason, &key))),
        }
    }
}

fn listing_fields(args: &Value) -> Result<ListingFields, String> {
    let title = plain(field(args, "title")?, "Title", 80)?;
    let summary = plain(field(args, "summary")?, "Summary", 180)?;
    let description = field(args, "description")?;
    if description.chars().count() < 20 {
        return Err("The description needs at least 20 characters.".to_string());
    }
    if description.chars().count() > 8000 {
        return Err("The description is too long.".to_string());
    }
    if has_control(&description) {
        return Err("The description contains a hidden character.".to_string());
    }
    let machine_type = field(args, "machine_type")?.to_ascii_lowercase();
    if !MACHINES.contains(&machine_type.as_str()) {
        return Err("Choose a machine type.".to_string());
    }
    let license = field(args, "license")?.to_ascii_lowercase();
    if !LICENSES.contains(&license.as_str()) {
        return Err("Choose a license.".to_string());
    }
    let price_mon = field(args, "price_mon")?;
    let price =
        kinetic_chain::parse_mon(&price_mon).map_err(|_| "Enter a price in MON.".to_string())?;
    if price.is_zero() {
        return Err("The price has to be greater than zero.".to_string());
    }
    Ok(ListingFields {
        title,
        summary,
        description,
        machine_type,
        license,
        price_mon,
    })
}

fn field(args: &Value, name: &str) -> Result<String, String> {
    args.get(name)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .ok_or_else(|| match name {
            "title" => "Title is required.".to_string(),
            "summary" => "Summary is required.".to_string(),
            "description" => "The description needs at least 20 characters.".to_string(),
            "machine_type" => "Choose a machine type.".to_string(),
            "license" => "Choose a license.".to_string(),
            _ => "Enter a price in MON.".to_string(),
        })
}

fn plain(value: String, label: &str, max: usize) -> Result<String, String> {
    if value.chars().count() > max {
        return Err(format!("{label} must be {max} characters or fewer."));
    }
    if has_control(&value) {
        return Err(format!("{label} cannot contain a line break."));
    }
    Ok(value)
}

fn has_control(value: &str) -> bool {
    value.chars().any(|char| char.is_ascii_control())
}

fn batch_message(error: ListingRecordsError) -> String {
    text(match error {
        ListingRecordsError::Empty => "cli-sell-data-empty",
        ListingRecordsError::MissingRequests => "cli-sell-data-missing-requests",
        ListingRecordsError::Mismatch => "cli-sell-data-mismatch",
        ListingRecordsError::BlankLine => "cli-sell-data-blank-line",
        ListingRecordsError::BadRequest => "cli-sell-data-bad-request",
        ListingRecordsError::DuplicateRequest => "cli-sell-data-duplicate-request",
        ListingRecordsError::TooMany => "cli-sell-data-too-many",
        ListingRecordsError::TooLarge => "cli-sell-data-too-large",
        ListingRecordsError::Io(_) => "cli-sell-data-unreadable",
    })
}

async fn publish_listing(
    marketplace_url: &str,
    key: &str,
    fields: &ListingFields,
    agent_id: &str,
    batch: &ListingRecords,
) -> Result<String, PublishError> {
    if agent_id.is_empty()
        || agent_id.len() > 78
        || !agent_id.chars().all(|char| char.is_ascii_digit())
    {
        return Err(PublishError::Refused(
            "The manifest needs an agent id.".to_string(),
        ));
    }
    let (endpoint, origin) = site_origin(marketplace_url).map_err(PublishError::Refused)?;
    let manifest = serde_json::to_vec(&json!({
        "version": 1,
        "chainId": LISTING_CHAIN_ID,
        "agentId": agent_id,
        "rows": batch.rows.iter().map(|row| json!({
            "paramsHash": row.params_hash,
            "requestHash": row.request_hash,
        })).collect::<Vec<_>>(),
    }))
    .map_err(|_| PublishError::Refused("the listing manifest could not be encoded".to_string()))?;
    let manifest_part = reqwest::multipart::Part::bytes(manifest)
        .file_name("manifest.json")
        .mime_str("application/json")
        .map_err(|_| PublishError::Unreachable)?;
    let data_part = reqwest::multipart::Part::bytes(batch.data.clone())
        .file_name("operations.jsonl")
        .mime_str("application/x-ndjson")
        .map_err(|_| PublishError::Unreachable)?;
    let form = reqwest::multipart::Form::new()
        .text("title", fields.title.clone())
        .text("summary", fields.summary.clone())
        .text("description", fields.description.clone())
        .text("machineType", fields.machine_type.clone())
        .text("license", fields.license.clone())
        .text("priceMon", fields.price_mon.clone())
        .part("manifest", manifest_part)
        .part("data", data_part);
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|_| PublishError::Unreachable)?;
    let response = client
        .post(&endpoint)
        .header(reqwest::header::AUTHORIZATION, format!("Bearer {key}"))
        .multipart(form)
        .send()
        .await
        .map_err(|_| PublishError::Unreachable)?;
    let status = response.status();
    let bytes = response
        .bytes()
        .await
        .map_err(|_| PublishError::Unreachable)?;
    if bytes.len() > 8 * 1024 {
        return Err(PublishError::Refused(
            "The marketplace returned an unreadable response.".to_string(),
        ));
    }
    let body: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    if status.is_success() {
        return listed_url(&origin, &body).map_err(PublishError::Refused);
    }
    let reason = body
        .get("error")
        .and_then(Value::as_str)
        .unwrap_or("The marketplace refused the listing.");
    ::kinetic_log::record!(
        WARN,
        ::kinetic_log::Event::new(module_path!(), ::kinetic_log::Action::Note)
            .with_outcome(::kinetic_log::EventOutcome::Failure)
            .with_attrs(json!({"status": status.as_u16()})),
        "marketplace listing was refused"
    );
    Err(PublishError::Refused(scrub(reason, key)))
}

fn site_origin(base: &str) -> Result<(String, String), String> {
    let mut raw = base.trim().trim_end_matches('/').to_string();
    if let Some(stripped) = raw.strip_suffix("/api/agent/listings") {
        raw = stripped.trim_end_matches('/').to_string();
    }
    let url =
        reqwest::Url::parse(&raw).map_err(|_| "The marketplace URL is not a URL.".to_string())?;
    let host = url
        .host_str()
        .ok_or_else(|| "The marketplace URL is not a URL.".to_string())?;
    let loopback = host == "localhost" || host == "127.0.0.1" || host == "::1";
    match url.scheme() {
        "https" => {}
        "http" if loopback => {}
        _ => return Err("The marketplace URL must be https.".to_string()),
    }
    if url.path() != "/" && !url.path().is_empty() {
        return Err("The marketplace URL must be the site address.".to_string());
    }
    let origin = url.origin().ascii_serialization();
    if origin == "null" {
        return Err("The marketplace URL is not a URL.".to_string());
    }
    Ok((format!("{origin}/api/agent/listings"), origin))
}

fn listed_url(origin: &str, body: &Value) -> Result<String, String> {
    let slug = body.get("slug").and_then(Value::as_str).unwrap_or("");
    let slug_ok = !slug.is_empty()
        && slug.len() <= 80
        && !slug.starts_with('-')
        && !slug.ends_with('-')
        && slug
            .chars()
            .all(|char| char.is_ascii_lowercase() || char.is_ascii_digit() || char == '-');
    if !slug_ok {
        return Err("The marketplace response did not include a listing.".to_string());
    }
    Ok(format!("{origin}/marketplace/{slug}"))
}

fn scrub(text: &str, key: &str) -> String {
    let cleaned = if key.is_empty() {
        text.to_string()
    } else {
        text.replace(key, "[redacted]")
    };
    let out: String = cleaned
        .chars()
        .filter(|char| !char.is_ascii_control())
        .take(300)
        .collect();
    if out.is_empty() {
        "The marketplace refused the listing.".to_string()
    } else {
        out
    }
}

fn text(key: &str) -> String {
    crate::i18n::get_required_cli_string(key)
}

fn text_with(key: &str, args: &[(&str, &str)]) -> String {
    crate::i18n::get_required_cli_string_with_args(key, args)
}

fn failed(error: &str) -> String {
    text_with("cli-chain-failed", &[("error", error)])
}

fn refused(reason: &str) -> ToolResult {
    ToolResult::err(text_with("cli-sell-data-refused", &[("reason", reason)]))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;

    fn tool(dir: &std::path::Path, key: Option<&str>) -> SellDataTool {
        let mut config = Config::default();
        config.config_path = dir.join("config.toml");
        config.marketplace.key = key.map(str::to_string);
        SellDataTool::new(&config, dir.to_path_buf())
    }

    fn fields() -> Value {
        json!({
            "title": "Cola vend log",
            "summary": "Completed cola vends from the lobby machine.",
            "description": "Each line is one completed vend, with the item and the result.",
            "machine_type": "Vending",
            "license": "Research",
            "price_mon": "1.5"
        })
    }

    #[tokio::test]
    async fn a_missing_key_tells_the_owner_where_to_get_one() {
        let dir = tempfile::tempdir().expect("temp");
        let result = tool(dir.path(), None)
            .execute(fields())
            .await
            .expect("result");
        assert!(!result.success);
        let error = result.error.expect("error");
        assert!(
            error.contains("https://marketplace.kineticvm.xyz"),
            "{error}"
        );
        assert!(
            error.contains("kinetic config set marketplace.key"),
            "{error}"
        );
        assert!(!dir.path().join("device.key").exists());
    }

    #[tokio::test]
    async fn an_empty_record_file_does_not_open_the_chain() {
        let dir = tempfile::tempdir().expect("temp");
        let result = tool(dir.path(), Some("kvm_test_listing_key"))
            .execute(fields())
            .await
            .expect("result");
        assert!(!result.success);
        assert_eq!(
            result.error.as_deref(),
            Some(text("cli-sell-data-empty").as_str())
        );
        assert!(!dir.path().join("device.key").exists());
    }

    #[tokio::test]
    async fn a_listing_posts_the_signed_line_and_its_request_hash() {
        let dir = tempfile::tempdir().expect("temp");
        let records = dir.path().join("records").join("operations.jsonl");
        let line = r#"{"item":"cola"}"#;
        let request = format!("0x{}", "ab".repeat(32));
        records::append_attested_operation(&records, line, &request).expect("stored");
        let mut config = Config::default();
        config.config_path = dir.path().join("config.toml");
        config.marketplace.key = Some("kvm_test_listing_key".to_string());
        let batch = records::load_listing_records(&records).expect("batch");
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind");
        let address = listener.local_addr().expect("addr");
        let server = std::thread::spawn(move || {
            listener.set_nonblocking(false).expect("blocking");
            let (mut stream, _) = listener.accept().expect("accept");
            stream
                .set_read_timeout(Some(Duration::from_secs(5)))
                .expect("timeout");
            let mut received = Vec::new();
            let mut chunk = [0_u8; 2048];
            loop {
                match stream.read(&mut chunk) {
                    Ok(0) => break,
                    Ok(count) => {
                        received.extend_from_slice(&chunk[..count]);
                        if let Some(total) = complete_request(&received) {
                            if received.len() >= total {
                                break;
                            }
                        }
                    }
                    Err(_) => break,
                }
            }
            let body =
                br#"{"slug":"cola-vend-log","url":"/marketplace/cola-vend-log","status":"listed"}"#;
            let header = format!(
                "HTTP/1.1 201 Created\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                body.len()
            );
            stream.write_all(header.as_bytes()).expect("header");
            stream.write_all(body).expect("body");
            received
        });
        config.marketplace.url = format!("http://{address}");
        let listing = listing_fields(&fields()).expect("fields");
        let url = publish_listing(
            &config.marketplace.url,
            "kvm_test_listing_key",
            &listing,
            "7",
            &batch,
        )
        .await
        .expect("published");
        assert_eq!(url, format!("http://{address}/marketplace/cola-vend-log"));
        let received = String::from_utf8(server.join().expect("server")).expect("utf8");
        let lower = received.to_ascii_lowercase();
        assert!(
            lower.contains("authorization: bearer kvm_test_listing_key"),
            "listing request did not carry the key, {} bytes",
            received.len()
        );
        assert!(received.contains("Cola vend log"));
        assert!(received.contains("machineType"));
        assert!(received.contains("vending"));
        assert!(received.contains("research"));
        assert!(received.contains("1.5"));
        assert!(received.contains(line));
        assert!(received.contains(&request));
        assert!(
            received.contains("0x7ce00475877b309340833ecdea42ffc4413dacfa150d3fe80ce807ddb43b9301")
        );
        assert!(received.contains("\"agentId\":\"7\""));
        assert!(received.contains("\"chainId\":10143"));
    }

    fn complete_request(bytes: &[u8]) -> Option<usize> {
        let header_end = bytes.windows(4).position(|window| window == b"\r\n\r\n")?;
        let headers = std::str::from_utf8(&bytes[..header_end]).ok()?;
        let length = headers.lines().find_map(|line| {
            let (name, value) = line.split_once(':')?;
            if name.eq_ignore_ascii_case("content-length") {
                value.trim().parse::<usize>().ok()
            } else {
                None
            }
        })?;
        Some(header_end + 4 + length)
    }
}
