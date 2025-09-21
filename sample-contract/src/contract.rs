// sample-contract/src/contract.rs
use cosmwasm_std::{
    entry_point, to_json_binary, Addr, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdError,
    StdResult,
};

use crate::msg::{ExecuteMsg, InstantiateMsg, QueryMsg, RiskResponse};
use crate::state::{ORACLE_ADDR, RISK_STORE};

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    _msg: InstantiateMsg,
) -> StdResult<Response> {
    // Save the sender as the initial oracle address
    ORACLE_ADDR.save(deps.storage, &info.sender)?;

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("sender", info.sender.to_string()))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> StdResult<Response> {
    match msg {
        ExecuteMsg::UpdateRisk {
            wallet,
            risk,
            compliant,
            timestamp,
        } => try_update_risk(deps, info, wallet, risk, compliant, timestamp),

        // handle your other ExecuteMsg variants (Send, OracleDataUpdate, UpdateOracle)
        _ => Err(StdError::generic_err("unsupported execute message")),
    }
}

pub fn try_update_risk(
    deps: DepsMut,
    info: MessageInfo,
    wallet: String,
    risk: u8,
    compliant: bool,
    timestamp: Option<String>,
) -> StdResult<Response> {
    if risk < 1 || risk > 10 {
        return Err(StdError::generic_err("risk must be in range 1..10"));
    }

    // Enforce that only the oracle address can push risk data
    let oracle_addr = ORACLE_ADDR.load(deps.storage)?;
    if info.sender != oracle_addr {
        return Err(StdError::generic_err("unauthorized: only oracle may push risk"));
    }

    let wallet_addr = deps.api.addr_validate(&wallet)?;
    RISK_STORE.save(
        deps.storage,
        &wallet_addr,
        &(risk, compliant, timestamp.clone(), Some(info.sender.to_string())),
    )?;

    Ok(Response::new()
        .add_attribute("action", "update_risk")
        .add_attribute("wallet", wallet)
        .add_attribute("risk", risk.to_string())
        .add_attribute("compliant", compliant.to_string()))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetRisk { wallet } => to_json_binary(&query_risk(deps, wallet)?),
        QueryMsg::GetOracle {} => {
            let oracle_addr = ORACLE_ADDR.may_load(deps.storage)?;
            let oracle_str = oracle_addr.map(|a| a.to_string()).unwrap_or_default();
            to_json_binary(&oracle_str)
        }
        _ => Err(StdError::generic_err("unsupported query message")),
    }
}

fn query_risk(deps: Deps, wallet: String) -> StdResult<RiskResponse> {
    let addr = deps.api.addr_validate(&wallet)?;
    match RISK_STORE.may_load(deps.storage, &addr)? {
        Some((risk, compliant, timestamp_opt, source_opt)) => Ok(RiskResponse {
            wallet,
            risk: Some(risk),
            compliant: Some(compliant),
            timestamp: timestamp_opt,
            source: source_opt,
            reason: None,
        }),
        None => Ok(RiskResponse {
            wallet,
            risk: Some(1),
            compliant: Some(true),
            timestamp: None,
            source: None,
            reason: Some(vec!["no record found".to_string()]),
        }),
    }
}
