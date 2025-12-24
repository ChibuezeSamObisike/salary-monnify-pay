# Setting Up ngrok for Monnify Webhooks

This guide will help you set up ngrok to expose your local server to the internet so Monnify can send webhook notifications.

## Prerequisites

1. Node.js application running on `http://localhost:3008` (or your configured PORT)
2. ngrok installed on your system

## Step 1: Install ngrok

### macOS (using Homebrew)
```bash
brew install ngrok/ngrok/ngrok
```

### Windows (using Chocolatey)
```bash
choco install ngrok
```

### Linux
```bash
# Download from https://ngrok.com/download
# Or use snap
snap install ngrok
```

### Manual Installation
1. Visit [https://ngrok.com/download](https://ngrok.com/download)
2. Download for your platform
3. Extract and add to your PATH

## Step 2: Sign up for ngrok (Free)

1. Go to [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup)
2. Create a free account
3. Get your authtoken from the dashboard

## Step 3: Configure ngrok

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

## Step 4: Start Your Application

Make sure your application is running:

```bash
npm run dev
# or
npm start
```

Your server should be running on `http://localhost:3008` (or your configured PORT).

## Step 5: Start ngrok

In a new terminal window, run:

```bash
ngrok http 3008
```

You'll see output like:

```
Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3008

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Important:** Copy the `Forwarding` URL (e.g., `https://abc123.ngrok-free.app`)

## Step 6: Configure Monnify Webhook URL

1. Log in to your Monnify dashboard
2. Go to **Settings** → **Webhooks** (or **API Settings**)
3. Add a new webhook URL:
   ```
   https://abc123.ngrok-free.app/api/monnify/webhook
   ```
   Replace `abc123.ngrok-free.app` with your ngrok URL

4. **Important:** Set the webhook secret in your `.env` file:
   ```env
   MONNIFY_WEBHOOK_SECRET=your_webhook_secret_from_monnify
   ```

## Step 7: Test the Webhook

### Option 1: Test from Monnify Dashboard
- Monnify usually has a "Test Webhook" button
- Or trigger a transaction and check if webhook is received

### Option 2: Test Manually
You can use curl to test:

```bash
curl -X POST https://abc123.ngrok-free.app/api/monnify/webhook \
  -H "Content-Type: application/json" \
  -H "monnify-signature: test_signature" \
  -d '{
    "eventType": "SUCCESSFUL_TRANSACTION",
    "eventData": {
      "paymentReference": "PAYROLL_24_45",
      "transactionReference": "MNFY123456789",
      "paymentStatus": "PAID",
      "paymentDescription": "Payment successful"
    }
  }'
```

### Option 3: Use ngrok Web Interface
Visit `http://127.0.0.1:4040` to see:
- All incoming requests
- Request/response details
- Replay requests for testing

## Step 8: Monitor Webhook Logs

Watch your application logs for webhook activity:

```bash
# In your application terminal, you should see:
📥 Webhook received: { ... }
✅ Webhook signature verified
📥 Webhook received for payroll 24, item 45, status: PAID
✅ Item 45 marked as COMPLETED
✅ Webhook processed successfully for item 45
```

## Troubleshooting

### Webhook Not Received

1. **Check ngrok is running:**
   ```bash
   # Check if ngrok is forwarding
   curl http://127.0.0.1:4040/api/tunnels
   ```

2. **Check your application is running:**
   ```bash
   curl http://localhost:3008/health
   ```

3. **Check ngrok web interface:**
   - Visit `http://127.0.0.1:4040`
   - See if requests are coming through

4. **Verify webhook URL in Monnify:**
   - Make sure it's exactly: `https://your-ngrok-url.ngrok-free.app/api/monnify/webhook`
   - No trailing slashes

### Signature Verification Failing

1. **Check MONNIFY_WEBHOOK_SECRET is set:**
   ```bash
   echo $MONNIFY_WEBHOOK_SECRET
   ```

2. **Verify secret matches Monnify dashboard:**
   - Go to Monnify dashboard → Webhooks
   - Check the webhook secret matches your `.env` file

3. **For testing, you can temporarily disable signature verification:**
   - Remove `MONNIFY_WEBHOOK_SECRET` from `.env`
   - The webhook will log a warning but still process

### ngrok URL Changes

**Free ngrok accounts get a new URL each time you restart ngrok.**

**Solutions:**

1. **Use ngrok static domain (paid feature):**
   ```bash
   ngrok http 3008 --domain=your-static-domain.ngrok-free.app
   ```

2. **Keep ngrok running:**
   - Don't close the ngrok terminal
   - Use `screen` or `tmux` to keep it running in background

3. **Update Monnify webhook URL:**
   - Each time you restart ngrok, update the webhook URL in Monnify dashboard

## Production Deployment

For production, you should:

1. **Deploy to a server with a public IP/domain**
2. **Use HTTPS** (Monnify requires HTTPS for webhooks)
3. **Set up proper webhook secret** in environment variables
4. **Monitor webhook delivery** and implement retry logic

## Additional Resources

- [ngrok Documentation](https://ngrok.com/docs)
- [Monnify Webhook Documentation](https://docs.monnify.com)
- [ngrok Dashboard](https://dashboard.ngrok.com)

## Quick Start Script

Create a file `start-ngrok.sh`:

```bash
#!/bin/bash

# Start the application in background
npm run dev &

# Wait a bit for app to start
sleep 3

# Start ngrok
ngrok http 3008

# The ngrok URL will be displayed
# Copy it and update Monnify webhook URL
```

Make it executable:
```bash
chmod +x start-ngrok.sh
```

Run it:
```bash
./start-ngrok.sh
```

