const express = require("express");
const app = express();

app.use(express.json());

// ================= MEMORY =================
let store = {
  category: {},
  merchant: {},
  customer: {},
  trigger: {}
};

// ================= HEALTH =================
app.get("/v1/healthz", (req, res) => {
  res.json({
    status: "ok",
    uptime_seconds: Math.floor(process.uptime()),
    contexts_loaded: {
      category: Object.keys(store.category).length,
      merchant: Object.keys(store.merchant).length,
      customer: Object.keys(store.customer).length,
      trigger: Object.keys(store.trigger).length
    }
  });
});

// ================= METADATA =================
app.get("/v1/metadata", (req, res) => {
  res.json({
    team_name: "Top1Percent",
    model: "deterministic-reasoning-engine",
    approach: "signal scoring + category strategy + contextual compose",
    version: "3.0.0"
  });
});

// ================= CONTEXT =================
app.post("/v1/context", (req, res) => {
  const { scope, context_id, payload } = req.body;

  if (!store[scope]) {
    return res.status(400).json({ accepted: false });
  }

  store[scope][context_id] = payload;

  res.json({
    accepted: true,
    ack_id: "ack_" + context_id,
    stored_at: new Date().toISOString()
  });
});

// ================= OFFER PICK =================
function pickOffer(category) {
  const offers = category?.offer_catalog || [];
  if (offers.length === 0) return "Special Offer";

  // deterministic: pick first high-value new_user offer if exists
  const preferred = offers.find(o => o.audience === "new_user");
  return (preferred || offers[0]).title;
}

// ================= SIGNAL SCORING =================
function decideSignal(merchant, trigger) {
  let signals = [];

  if (merchant?.performance?.calls !== undefined) {
    let calls = merchant.performance.calls;
    signals.push({
      type: "calls",
      score: calls < 3 ? 10 : calls < 6 ? 7 : 2,
      value: calls
    });
  }

  if (merchant?.customer_aggregate?.retention_6mo_pct !== undefined) {
    let r = merchant.customer_aggregate.retention_6mo_pct;
    signals.push({
      type: "retention",
      score: r < 0.2 ? 9 : r < 0.35 ? 6 : 2,
      value: r
    });
  }

  if (trigger?.kind === "perf_dip") {
    signals.push({ type: "perf_dip", score: 8 });
  }

  if (trigger?.kind === "festival_upcoming") {
    signals.push({ type: "festival", score: 7 });
  }

  if (trigger?.kind === "recall_due") {
    signals.push({ type: "customer_recall", score: 9 });
  }

  if (signals.length === 0) return { type: "default" };

  signals.sort((a, b) => b.score - a.score);
  return signals[0];
}

// ================= MESSAGE ENGINE =================
function generateMessage(signal, category, merchant, trigger, customer) {
  const offer = pickOffer(category);

  // CUSTOMER FLOW
  if (signal.type === "customer_recall" && customer) {
    const name = customer.identity?.name || "Customer";
    return {
      message: `${name}, your service is due. ${offer} is available now. Book your slot today?`,
      rationale: "customer recall → direct conversion"
    };
  }

  // MERCHANT FLOW
  if (signal.type === "calls") {
    return {
      message: `Only ${signal.value} calls recently — below expected demand. ${offer} can increase footfall quickly. Launch now?`,
      rationale: `low_calls(${signal.value}) → demand boost`
    };
  }

  if (signal.type === "retention") {
    return {
      message: `Only ${(signal.value * 100).toFixed(0)}% customers return. ${offer} can bring them back. Try now?`,
      rationale: `low_retention(${(signal.value * 100).toFixed(0)}%) → reactivation`
    };
  }

  if (signal.type === "perf_dip") {
    return {
      message: `Performance dropped recently. ${offer} can recover demand quickly. Launch now?`,
      rationale: "performance dip → recovery"
    };
  }

  if (signal.type === "festival") {
    return {
      message: `${trigger.payload?.festival || "Festival"} demand is rising. ${offer} can capture more customers now. Launch it?`,
      rationale: "seasonal opportunity"
    };
  }

  return {
    message: `${offer} can help you grow today. Want to try it?`,
    rationale: "default growth"
  };
}

// ================= CORE COMPOSE =================
function compose(category, merchant, trigger, customer) {
  const signal = decideSignal(merchant, trigger);
  const result = generateMessage(signal, category, merchant, trigger, customer);

  return {
    message: result.message,
    cta: "Launch Now",
    send_as: "vera",
    suppression_key: signal.type,
    rationale: result.rationale
  };
}

// ================= TICK =================
app.post("/v1/tick", (req, res) => {
  res.json({ actions: [] });
});

// ================= REPLY =================
app.post("/v1/reply", (req, res) => {
  const input = req.body || {};

  const merchantId = input.merchant?.merchant_id;
  const triggerId = input.trigger?.id;
  const customerId = input.customer?.customer_id;
  const categorySlug =
    input.category?.slug ||
    input.category?.display_name?.toLowerCase();

  const category = store.category[categorySlug] || input.category;
  const merchant = store.merchant[merchantId] || input.merchant;
  const trigger = store.trigger[triggerId] || input.trigger;
  const customer = store.customer[customerId] || input.customer;

  const output = compose(category, merchant, trigger, customer);

  res.json(output);
});

// ================= PORT =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 FINAL AI BOT RUNNING on port " + PORT);
});
