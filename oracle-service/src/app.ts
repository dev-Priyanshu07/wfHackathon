// oracle-service/src/app.ts
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { getRiskForWallet } from "./services/riskService";

dotenv.config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

/**
 * GET /risk/:wallet
 * Return risk for wallet address (calls riskService)
 */
app.get("/risk/:wallet", async (req, res) => {
  const wallet = String(req.params.wallet || "").trim();
  if (!wallet) return res.status(400).json({ error: "wallet address required" });
  try {
    const result = await getRiskForWallet(wallet);
    return res.json(result);
  } catch (err) {
    console.error("GET /risk error:", err);
    return res.status(500).json({ error: "internal error", detail: String(err) });
  }
});

/**
 * POST /risk
 * JSON body: { wallet: "..." }
 */
app.post("/risk", async (req, res) => {
  const wallet: string = (req.body?.wallet || "").trim();
  if (!wallet) return res.status(400).json({ error: "wallet address required in body" });
  try {
    const result = await getRiskForWallet(wallet);
    return res.json(result);
  } catch (err) {
    console.error("POST /risk error:", err);
    return res.status(500).json({ error: "internal error", detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Oracle service listening on port ${PORT}`);
  console.log(`Risk threshold (non-compliant if >=): ${process.env.RISK_THRESHOLD || "7"}`);
});
