use cosmwasm_std::{Addr, Binary};
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

pub const ADMIN: Item<Addr> = Item::new("admin");
pub const ORACLE_PUBKEY: Item<Binary> = Item::new("oracle_pubkey");
pub const ORACLE_PUBKEY_TYPE: Item<String> = Item::new("oracle_pubkey_type");

// Keep your existing ORACLE_DATA as a simple string
pub const ORACLE_DATA: Item<String> = Item::new("oracle_data");

// NEW: Explicit oracle address for risk scoring
pub const ORACLE_ADDR: Item<Addr> = Item::new("oracle_addr");

pub fn parse_key_type(s: &str) -> Option<&'static str> {
    match s.to_lowercase().as_str() {
        "secp256k1" | "k256" | "ecdsa" => Some("secp256k1"),
        "ed25519" | "ed" => Some("ed25519"),
        _ => None,
    }
}

// Risk store for compliance scoring
pub const RISK_STORE: Map<&Addr, (u8, bool, Option<String>, Option<String>)> =
    Map::new("risk_store");
