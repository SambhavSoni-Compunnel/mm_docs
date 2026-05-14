# Checking Dev / Production Logs (Azure App Service)

## Important: Timezone Note

> **Logs are recorded in UTC time.**  
> If you know the approximate time a bug occurred, convert it to UTC before searching the logs.  
> Example: IST 3:30 PM = UTC 10:00 AM

---

## Prerequisites

- You must have an **Azure account with permissions** to view App Service logs.
- If you don't have access, contact the **Cloud Team** to add your account with the appropriate role.

---

## App Service Names

| Environment | App Service Name |
|-------------|-----------------|
| Dev | `mmprodbackend` |
| Prod | `MarketMinder-API` |

---

## Steps to Access Logs

1. Go to [https://portal.azure.com/#home](https://portal.azure.com/#home)
2. Log in with your **Microsoft account**
3. Navigate to **App Service**
4. Select the appropriate App Service (`mmprodbackend` for dev, `MarketMinder-API` for prod)

---

## Two Ways to View Logs

### 1. Live Log Stream (Current Logs)

- In the **upper-left search bar** within the App Service, search for **Log stream**
- This shows logs in real time as requests come in
- Best for: active debugging of an issue happening right now

### 2. Stored Logs — Last 7 Days (Including Live)

- In the **upper-left search bar** within the App Service, search for **Advanced Tools**
- Click **Go**
- Click **Browse logs directory** (in the Kudu interface)
- Navigate the directory to find logs from the past 7 days
- Best for: investigating a past issue when you know the approximate UTC time
