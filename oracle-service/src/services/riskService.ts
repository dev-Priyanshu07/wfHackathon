// oracle-service/src/services/riskService.ts
import { fetchLastTransactions } from "./txDbService";

export type TxRecord = {
  tx_hash: string;
  from?: string;
  to?: string;
  value?: number; // numeric value in normalized units (see notes)
  timestamp?: string;
  chain?: string;
};

export type RiskResult = {
  wallet: string;
  risk_score: number; // 1 - 10
  compliant: boolean;
  reason?: string[];
  sample_tx_count: number;
};

const DEFAULT_SAMPLE_SIZE = Number(process.env.TX_SAMPLE_SIZE || 20);
const RISK_THRESHOLD = Number(process.env.RISK_THRESHOLD || 7); // >= => non-compliant

export async function getRiskForWallet(wallet: string): Promise<RiskResult> {
  const w = wallet.trim();
  if (!w) throw new Error("invalid wallet");

  const txs: TxRecord[] = await fetchLastTransactions(w, DEFAULT_SAMPLE_SIZE);

  const txCount = txs.length;
  let totalValue = 0;
  let maxTx = 0;
  const counterparties = new Set<string>();
  const timestamps: number[] = [];

  for (const t of txs) {
   const v = Number(t.value || 0) / 1e18; // if Ethereum

    totalValue += v;
    // if Ethereum

    if (v > maxTx) maxTx = v;
    if (t.from) counterparties.add(t.from.toLowerCase());
    if (t.to) counterparties.add(t.to.toLowerCase());
    if (t.timestamp) {
      const tms = Date.parse(t.timestamp);
      if (!isNaN(tms)) timestamps.push(tms);
    }
  }

  const avgTx = txCount ? totalValue / txCount : 0;
  const uniqueCounterpartyCount = Math.max(0, counterparties.size - 1);

  let score = 1;
  const reasons: string[] = [];

  // Heuristics (tune to your data / units)
  if (txCount >= 20) { score += 2; reasons.push("high number of recent transactions"); }
  else if (txCount >= 10) { score += 1; }

  if (maxTx > 1e6) { score += 3; reasons.push("very large single transaction"); }
  else if (maxTx > 1e5) { score += 2; reasons.push("large single transaction"); }
  else if (maxTx > 1e4) { score += 1; }

  if (avgTx > 5e5) { score += 2; reasons.push("high average transaction value"); }
  else if (avgTx > 5e4) { score += 1; }

  if (uniqueCounterpartyCount >= 10) { score += 2; reasons.push("many unique counterparties"); }
  else if (uniqueCounterpartyCount >= 4) { score += 1; }

  if (timestamps.length >= 3) {
    timestamps.sort();
    const windowMs = timestamps[timestamps.length - 1] - timestamps[0];
    const daysSpan = Math.max(1, windowMs / (1000 * 60 * 60 * 24));
    const txPerDay = txCount / daysSpan;
    if (txPerDay > 100) { score += 3; reasons.push("very high transaction velocity"); }
    else if (txPerDay > 20) { score += 2; reasons.push("high transaction velocity"); }
    else if (txPerDay > 5) { score += 1; }
  }

  // Placeholder for flagged-counterparty check: integrate blacklist or ML here

  if (score < 1) score = 1;
  if (score > 10) score = 10;

  const compliant = score < RISK_THRESHOLD;

  return {
    wallet: w,
    risk_score: Math.round(score),
    compliant,
    reason: reasons,
    sample_tx_count: txCount,
  };
}
