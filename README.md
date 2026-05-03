# vera-dynamic-bot-final
A deterministic message engine for Vera that selects the most relevant signal from merchant performance, trigger events, and category context to generate a single high-compulsion message with a clear next action.  The system uses structured reasoning across category, merchant, trigger to produce grounded, specific, and actionable outputs.
# Vera Message Engine

## Overview

This project implements a deterministic `compose(category, merchant, trigger, customer?)` engine for Vera.
It generates the next best message for a merchant based on real context.

---

## Approach

### Signal Selection

Only the strongest signal is used:

* Performance dip
* Low calls
* Retention drop
* Trigger events (festival, recall, etc.)

---

### Context Usage

The system combines:

* Category → tone and offers
* Merchant → performance + history
* Trigger → reason to send now
* Customer (optional) → personalization

---

### Message Design

Each message:

* Uses real numbers when available
* Includes a category-relevant offer
* Has one clear CTA
* Focuses on one actionable idea

---

## API Endpoints

* `GET /v1/healthz`
* `GET /v1/metadata`
* `POST /v1/context`
* `POST /v1/tick`
* `POST /v1/reply`

---

## Example

```json
{
  "message": "Only 2 calls recently — this is low. Haircut @ ₹99 can increase footfall quickly. Try now?",
  "cta": "Launch Now",
  "send_as": "vera",
  "suppression_key": "low_calls",
  "rationale": "low traffic → boost"
}
```

---

## Key Strength

The system prioritizes **correct decision-making over generic messaging**, ensuring outputs are specific, relevant, and actionable.

---

## Deterministic

Same input → same output
No randomness or external dependencies.
