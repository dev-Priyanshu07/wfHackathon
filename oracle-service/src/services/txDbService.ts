// oracle-service/src/services/txDbService.ts
import fs from "fs";
import path from "path";
import {parse as csvParse} from "csv-parse/sync";
import { TxRecord } from "./riskService";

const SAMPLE_DATA_DIR = path.resolve(__dirname, "../../data");

/**
 * Fetch last N transactions for a wallet.
 * For local testing, this uses CSVs under /data with the schema you pasted.
 */
export async function fetchLastTransactions(wallet: string, limit = 20): Promise<TxRecord[]> {
  return fetchFromCsvSample(wallet, limit);
}

async function fetchFromCsvSample(wallet: string, limit: number): Promise<TxRecord[]> {
  const files = fs.readdirSync(SAMPLE_DATA_DIR).filter((f) => f.toLowerCase().endsWith(".csv"));
  const matches: TxRecord[] = [];

  for (const f of files) {
    const content = fs.readFileSync(path.join(SAMPLE_DATA_DIR, f), "utf8");
    const records = csvParse(content, { columns: true, skip_empty_lines: true }) as Record<string, any>[];

    for (const r of records) {
      const from = (r.from_address || "").toString().toLowerCase();
      const to = (r.to_address || "").toString().toLowerCase();

      if (from === wallet.toLowerCase() || to === wallet.toLowerCase()) {
        matches.push({
          tx_hash: r.transaction_hash,
          from: r.from_address,
          to: r.to_address,
          value: Number(r.value || 0),
          timestamp: r.block_timestamp,
          chain: path.basename(f, ".csv"), // filename as chain label
        });

        if (matches.length >= limit) break;
      }
    }
    if (matches.length >= limit) break;
  }

  matches.sort((a, b) => {
    const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
    const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
    return tb - ta;
  });

  return matches.slice(0, limit);
}
