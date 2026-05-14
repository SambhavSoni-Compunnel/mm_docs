# MCMP — Message Harbor Integration

## Overview

Market Minder uses **Message Harbor** (MCMP) as its primary email delivery platform. The application integrates with Message Harbor for both sending emails and receiving delivery event webhooks.

---

## Webhook

### Endpoint
```
POST /api/webhook/mcmp
```

### Webhook Location in Message Harbor
The webhook is configured inside the **Market Minder Subscriber** within the Message Harbor portal:
- **Dev:** `https://messageharbour-dev.compunnel.com`
- The full webhook URL registered there is: `<BASE_URL>/api/webhook/mcmp`

### Production Webhook
The production webhook URL, API key, and secret key are managed entirely by the **MCMP Team**. Contact them for:
- The production webhook URL configuration
- Production API key
- Production secret key

> Do **not** attempt to configure the production subscriber independently — coordinate with the MCMP Team.

---

## Credentials

| Credential | Storage | Notes |
|-----------|---------|-------|
| API Key | Azure Key Vault → `MCMP-API-KEY` | Same across subscribers |
| Secret Key | Azure Key Vault → `MCMP-Secret-Key` (or equivalent) | Subscriber-specific — changes per subscriber |

---

## Creating a New Subscriber

If a new Message Harbor subscriber is needed (e.g., for a new environment or brand):

1. Log in to [https://messageharbour-dev.compunnel.com](https://messageharbour-dev.compunnel.com)
2. Navigate to **Subscribers**
3. Click **Add Subscriber** and fill in the required details
4. After creation, open the subscriber and **fetch its Secret Key**
5. Update the Secret Key in **Azure Key Vault** (`mmai-keyvault`):
   - Secret name: `MCMP-Secret-Key` (confirm exact name with team)
   - The **API Key remains the same** — only the Secret Key changes per subscriber
6. Restart the application (or wait for the next Key Vault fetch cycle) so the new secret is picked up

---

## Notes

- The `use_mailchimp` flag in `configuration/generic_config.py` must be `False` for MCMP to be the active email provider (which is the current default).
- Mailchimp integration exists as a legacy/fallback path but is not actively used.
