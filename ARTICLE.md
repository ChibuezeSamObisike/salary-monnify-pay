# How to Build a Payroll System with Express and Monnify Using Background Jobs

In this article you will building a payroll system that requires handling multiple payments efficiently, managing failures and ensuring transactions complete successfully.

In this tutorial you learn how to build a production-ready payroll system using Express.js, Monnify payment gateway, and background job processing.

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Project Setup](#project-setup)
4. [Understanding Payroll Automation](#understanding-payroll-automation)
5. [Integrating Monnify](#integrating-monnify)
6. [Setting Up Background Jobs](#setting-up-background-jobs)
7. [Building the Payroll API](#building-the-payroll-api)
8. [Creating the Payroll Job Processor](#creating-the-payroll-job-processor)
9. [Webhook Handling](#webhook-handling)
10. [Testing the System End-to-End](#testing-the-system-end-to-end)
11. [Optional Enhancements](#optional-enhancements)
12. [Conclusion](#conclusion)

---

## Introduction

### What We are Building

We're building a complete payroll management system that can:

- Manage employee records with banking details
- Create payroll batches for specific periods
- Process payments asynchronously using background jobs
- Handle payment failures with automatic retries
- Track transaction status and provide real-time updates
- Integrate with Monnify for secure bank transfers

### Why Monnify?

Monnify is a payment gateway in Nigeria that provides:

- **Reliable Disbursement API**: Direct bank transfers to employee accounts
- **Sandbox Environment**: Test your integration without real money
- **Webhook Support**: Real-time payment status updates
- **Comprehensive Documentation**: Well-documented APIs with examples
- **Bank Coverage**: Supports all major Nigerian banks

### Why Use Background Jobs for Payroll?

Processing payroll synchronously would cause several problems:

1. **Timeout Issues**: Processing 100+ employees would exceed HTTP request timeouts
2. **Poor User Experience**: Users would wait minutes for a response
3. **No Retry Logic**: Network failures would require manual intervention
4. **Resource Blocking**: The server would be blocked during processing
5. **No Progress Tracking**: Users can't see which payments completed

Background jobs solve these issues by:

- Processing payments asynchronously
- Providing automatic retries with exponential backoff
- Allowing real-time status updates
- Enabling batch processing to avoid API rate limits
- Improving system reliability and scalability

---

## Prerequisites

### Required Tools

Before starting, ensure you have:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Docker & Docker Compose** - [Install Docker](https://www.docker.com/get-started)
- **PostgreSQL** (via Docker) - We'll use Docker Compose
- **Redis** (via Docker) - For job queue management
- **TypeScript** (optional but recommended) - For type safety
- **Monnify Sandbox Account** - [Sign up here](https://app.monnify.com/)

### Basic Understanding

You should be familiar with:

- **Node.js & Express**: Building REST APIs
- **TypeScript**: Type-safe JavaScript (helpful but not required)
- **PostgreSQL**: Relational database concepts
- **Redis**: In-memory data store (we'll use it for queues)
- **REST APIs**: HTTP methods, request/response patterns
- **Webhooks**: How external services notify your app

---

## Project Setup

### Initializing the Node.js/Express Project

Let's start by creating a new project:

```bash
mkdir monnify-payroll-system
cd monnify-payroll-system
npm init -y
```

### Installing Dependencies

Install the required packages:

```bash
# Core dependencies
npm install express cors helmet dotenv axios

# Database
npm install pg

# Queue management
npm install bull ioredis

# TypeScript (if using)
npm install -D typescript @types/node @types/express @types/cors @types/pg ts-node-dev

# Development tools
npm install -D @types/bull
```

### Project Folder Structure

Create the following structure:

```
monnify-payroll-system/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── monnify.ts
│   ├── models/
│   │   ├── employee.ts
│   │   └── payroll.ts
│   ├── controllers/
│   │   ├── employee.controller.ts
│   │   └── payroll.controller.ts
│   ├── routes/
│   │   ├── employee.routes.ts
│   │   └── payroll.routes.ts
│   ├── jobs/
│   │   └── payroll.processor.ts
│   └── index.ts
├── migrations/
│   ├── 001_create_employees_table.sql
│   ├── 002_create_payrolls_table.sql
│   └── 003_create_payroll_items_table.sql
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── .env
```

### Setting Up Environment Variables

Create a `.env` file:

```env
# Monnify API Credentials
MONNIFY_API_KEY=your_api_key_here
MONNIFY_SECRET_KEY=your_secret_key_here
MONNIFY_CONTRACT_CODE=your_contract_code_here
MONNIFY_BASE_URL=https://api.monnify.com

# Database Configuration
DB_HOST=localhost
DB_PORT=5433
DB_NAME=payroll_db
DB_USER=payroll_user
DB_PASSWORD=payroll_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Server Configuration
PORT=3008
NODE_ENV=development
```

### Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: monnify-payroll-db
    environment:
      POSTGRES_USER: payroll_user
      POSTGRES_PASSWORD: payroll_password
      POSTGRES_DB: payroll_db
    ports:
      - '5433:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U payroll_user']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: monnify-payroll-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

Start the services:

```bash
docker-compose up -d
```

---

## Understanding Payroll Automation

### How Payroll Works

A typical payroll process involves:

1. **Employee Registration**: Store employee details including bank account information
2. **Payroll Creation**: Create a payroll batch for a specific period (e.g., "January 2024")
3. **Payment Processing**: Transfer funds to each employee's bank account
4. **Status Tracking**: Monitor which payments succeeded or failed
5. **Retry Failed Payments**: Automatically retry failed transactions

### Payment Scheduling vs Instant Payout

**Scheduled Payroll**: Process payments at a specific time (e.g., last Friday of the month)

- Requires cron jobs or scheduled tasks
- Better for predictable monthly payrolls

**Instant Payout**: Process immediately when triggered

- Better for on-demand payments
- Requires immediate processing capability

Our system supports instant payout with the option to add scheduling later.

### Batch Processing and Why It Matters

Processing all employees at once can:

- Overwhelm the payment API (rate limiting)
- Cause timeouts
- Make error handling difficult

**Batch Processing** solves this by:

- Processing employees in small groups (e.g., 5 at a time)
- Adding delays between batches
- Allowing better error isolation

### Common Edge Cases

**Network Failures**:

- Solution: Automatic retries with exponential backoff

**Insufficient Funds**:

- Solution: Check balance before processing, handle gracefully

**Invalid Bank Details**:

- Solution: Validate before processing, store error messages

**Duplicate Payments**:

- Solution: Use idempotency keys, check transaction status

**Partial Failures**:

- Solution: Track individual payment status, allow retry of failed items

---

## Integrating Monnify

### Creating API Keys and Contract Code

1. **Sign up for Monnify**: Go to [app.monnify.com](https://app.monnify.com)
2. **Navigate to API Settings**: Go to Settings → API Credentials
3. **Create API Key**: Generate a new API key pair
4. **Get Contract Code**: Found in your account settings
5. **Use Sandbox**: For testing, use the sandbox environment

### Generating Access Tokens

Monnify uses OAuth2-style authentication. Here's how to implement it:

```typescript
// src/config/monnify.ts
import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export class MonnifyClient {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;
  private contractCode: string;
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.apiKey = process.env.MONNIFY_API_KEY || '';
    this.secretKey = process.env.MONNIFY_SECRET_KEY || '';
    this.baseUrl = process.env.MONNIFY_BASE_URL || 'https://api.monnify.com';
    this.contractCode = process.env.MONNIFY_CONTRACT_CODE || '';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Auto-authenticate on each request
    this.client.interceptors.request.use(async (config: any) => {
      if (config.url?.includes('/auth/login')) {
        return config;
      }

      await this.ensureAuthenticated();
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });
  }

  private async authenticate(): Promise<void> {
    try {
      const credentials = Buffer.from(
        `${this.apiKey}:${this.secretKey}`
      ).toString('base64');

      const response = await axios.post(
        `${this.baseUrl}/api/v1/auth/login`,
        {},
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.accessToken = response.data.responseBody.accessToken;
      // Tokens last 24 hours, refresh after 23 hours
      this.tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
    } catch (error: any) {
      console.error(
        'Monnify authentication error:',
        error.response?.data || error.message
      );
      throw new Error('Failed to authenticate with Monnify');
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }
}
```

### Creating a Payout Request

Implement the transfer method:

```typescript
private generateTransactionReference(): string {
  return `PAYROLL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async initiateTransfer(
  amount: number,
  recipientAccountNumber: string,
  recipientBankCode: string,
  recipientName: string,
  narration: string
): Promise<any> {
  await this.ensureAuthenticated();

  const transactionReference = this.generateTransactionReference();
  const requestBody = {
    amount,
    reference: transactionReference,
    narration,
    destinationBankCode: recipientBankCode,
    destinationAccountNumber: recipientAccountNumber,
    currency: 'NGN',
    sourceAccountNumber: this.contractCode,
    destinationAccountName: recipientName,
  };

  try {
    const response = await this.client.post(
      '/api/v2/disbursements/single',
      requestBody
    );
    return response.data;
  } catch (error: any) {
    console.error('Monnify transfer error:', error.response?.data || error.message);
    throw error;
  }
}
```

### Implementing Bulk Transfer

For processing multiple payments at once, use Monnify's batch disbursement API:

```typescript
// src/config/monnify.ts

async initiateBulkTransfer(
  transfers: Array<{
    amount: number;
    recipientAccountNumber: string;
    recipientBankCode: string;
    recipientName: string;
    narration: string;
    reference: string;
  }>
): Promise<any> {
  await this.ensureAuthenticated();

  // Validate inputs
  if (!transfers || transfers.length === 0) {
    throw new Error('No transfers provided');
  }

  if (!this.contractCode) {
    throw new Error('Monnify contract code is not configured');
  }

  // Build request body according to Monnify API specification
  const requestBody = {
    title: 'Bulk Payroll Transfers',
    batchReference: `BATCH_${Date.now()}`,
    narration: 'Payroll batch disbursement',
    sourceAccountNumber: this.contractCode,
    onValidationFailure: 'CONTINUE', // Continue processing even if some transactions fail
    notificationInterval: 10, // Notification interval in seconds
    transactionList: transfers.map((t) => ({
      amount: t.amount,
      reference: t.reference,
      narration: t.narration,
      destinationBankCode: t.recipientBankCode,
      destinationAccountNumber: t.recipientAccountNumber,
      currency: 'NGN',
    })),
  };

  try {
    const response = await this.client.post(
      '/api/v2/disbursements/batch',
      requestBody
    );
    return response.data;
  } catch (error: any) {
    console.error(
      'Monnify bulk transfer error:',
      error.response?.data || error.message
    );

    if (error.response) {
      const errorData = error.response.data;
      const errorMessage =
        errorData?.responseMessage ||
        errorData?.message ||
        `Monnify API error: ${error.response.status}`;
      throw new Error(errorMessage);
    }
    throw error;
  }
}
```

**Key Points about Bulk Transfers:**

1. **API Endpoint**: `/api/v2/disbursements/batch` (not `bulk-transfer`)
2. **Request Structure**:
   - Use `transactionList` (not `transactions`)
   - Include top-level `narration` field
   - Set `onValidationFailure: 'CONTINUE'` to process valid transactions even if some fail
   - Each transaction must include `currency: 'NGN'`
   - Do not include `destinationAccountName` in transaction items
3. **Response Structure**:
   - `requestSuccessful`: boolean indicating if the request was accepted
   - `responseBody.batchReference`: Unique reference for the batch (save this for authorization)
   - `responseBody.transactionList`: Array of transaction results with `transactionReference` for each
4. **Authorization Required**:
   - After initiating a bulk transfer, you MUST authorize it with an OTP
   - Monnify sends an OTP to the merchant's registered email
   - Use the batch reference and OTP to authorize via `/api/v2/disbursements/batch/validate-otp`
5. **Benefits**:
   - Process multiple payments with a single API call
   - Requires only ONE OTP/PIN for the entire batch (if enabled)
   - More efficient than individual transfers
   - Better error handling with `onValidationFailure: 'CONTINUE'`

### Authorizing Bulk Transfers

After initiating a bulk transfer, you must authorize it with an OTP sent to your registered email:

```typescript
// src/config/monnify.ts

async authorizeBulkTransfer(
  reference: string,
  authorizationCode: string
): Promise<any> {
  await this.ensureAuthenticated();

  if (!reference) {
    throw new Error('Batch reference is required');
  }

  if (!authorizationCode) {
    throw new Error('Authorization code (OTP) is required');
  }

  const requestBody = {
    reference,
    authorizationCode,
  };

  try {
    const response = await this.client.post(
      '/api/v2/disbursements/batch/validate-otp',
      requestBody
    );
    return response.data;
  } catch (error: any) {
    console.error(
      'Monnify bulk transfer authorization error:',
      error.response?.data || error.message
    );

    if (error.response) {
      const errorData = error.response.data;
      const errorMessage =
        errorData?.responseMessage ||
        errorData?.message ||
        `Monnify API error: ${error.response.status}`;
      throw new Error(errorMessage);
    }
    throw error;
  }
}
```

**Authorization Flow:**

1. Initiate bulk transfer → Get `batchReference` from response
2. Check your registered email for OTP from Monnify
3. Call authorization endpoint with `batchReference` and `authorizationCode` (OTP)
4. Once authorized, the bulk transfer will be processed
5. **Reconcile** to sync database with actual transaction status

**API Endpoint for Authorization:**

- `POST /api/v2/disbursements/batch/validate-otp`
- Requires: `reference` (batch reference) and `authorizationCode` (OTP)

### Reconciling Payroll Transactions

After authorizing a bulk transfer, you should reconcile your payroll database with Monnify's actual transaction status. This ensures your database reflects the true state of all transactions.

**When to Reconcile:**

1. **After Authorization**: After authorizing a bulk transfer, reconcile to check final status
2. **Periodic Checks**: Run reconciliation periodically to ensure database stays in sync
3. **Stuck Transactions**: If items remain in "processing" status for too long
4. **After Webhook Failures**: If webhook notifications were missed or failed
5. **Manual Verification**: When you need to verify the current state

**Reconciliation Process:**

1. Fetches all payroll items with transaction references
2. Checks each transaction's status with Monnify API
3. Updates item status based on actual Monnify status:
   - `PAID` → Updates to `completed`
   - `FAILED` → Updates to `failed` with error message
   - `PENDING`/`PROCESSING` → Leaves as is (transaction still processing)
4. Updates payroll statistics (completed/failed counts)
5. Updates overall payroll status

**API Endpoint:**

- `POST /api/payrolls/{id}/reconcile`
- Returns: Number of items reconciled, errors encountered, and total checked

**Automatic Reconciliation:**

You can trigger automatic reconciliation during authorization by including `payrollId` in the authorization request:

```json
{
  "reference": "BATCH_1702456789123",
  "authorizationCode": "491763",
  "payrollId": 1
}
```

This will automatically reconcile the payroll after a short delay (2 seconds) to allow Monnify to process the transactions.

### Handling Monnify Webhooks

Create a webhook endpoint to receive payment status updates:

```typescript
// src/routes/payroll.routes.ts
import crypto from 'crypto';

router.post('/webhook/monnify', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['monnify-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    const secretKey = process.env.MONNIFY_SECRET_KEY || '';
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(payload)
      .digest('hex');

    if (hash !== signature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { eventType, eventData } = req.body;

    if (eventType === 'SUCCESSFUL_TRANSACTION') {
      // Update payroll item status
      const transactionRef = eventData.transactionReference;
      await PayrollItemModel.updateStatusByTransactionRef(
        transactionRef,
        PayrollStatus.COMPLETED
      );
    } else if (eventType === 'FAILED_TRANSACTION') {
      // Handle failed transaction
      const transactionRef = eventData.transactionReference;
      await PayrollItemModel.updateStatusByTransactionRef(
        transactionRef,
        PayrollStatus.FAILED,
        eventData.failureReason
      );
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Testing with the Monnify Sandbox

Monnify provides a sandbox environment for testing:

1. Use sandbox API URL: `https://sandbox.monnify.com`
2. Use test API credentials from your dashboard
3. Test with dummy bank accounts provided in documentation
4. Monitor webhook calls using tools like ngrok for local development

---

## Setting Up Background Jobs

### Why We Need Queues in Payroll

Without queues:

- HTTP requests timeout after 30-60 seconds
- Server resources are blocked
- No retry mechanism
- Poor user experience

With queues:

- Payments process asynchronously
- Automatic retries on failure
- Real-time status updates
- Better scalability

### Configuring Redis

Redis stores the job queue. We already set it up with Docker Compose. Let's create the Redis client:

```typescript
// src/config/redis.ts
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (err) => {
  console.error('Redis connection error', err);
});

export default redis;
```

### Implementing Bull Queue

Bull is a Redis-based queue for Node.js. Let's set it up:

```typescript
// src/jobs/payroll.processor.ts
import Queue from 'bull';
import { monnifyClient } from '../config/monnify';
import {
  PayrollItemModel,
  PayrollModel,
  PayrollStatus,
} from '../models/payroll';
import { EmployeeModel } from '../models/employee';

export const payrollQueue = new Queue('payroll processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  defaultJobOptions: {
    attempts: 3, // Retry 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: true,
    removeOnFail: false, // Keep failed jobs for debugging
  },
});
```

### Worker Threads vs Queue Processors

**Worker Threads**:

- Run in separate Node.js threads
- Good for CPU-intensive tasks
- Not ideal for I/O operations

**Queue Processors** (what we're using):

- Process jobs asynchronously
- Perfect for I/O operations (API calls)
- Better error handling and retries
- Can scale horizontally

### Retry Strategies & Backoff Policies

Bull supports several backoff strategies:

```typescript
// Exponential backoff (what we're using)
backoff: {
  type: 'exponential',
  delay: 2000, // 2s, 4s, 8s
}

// Fixed delay
backoff: {
  type: 'fixed',
  delay: 5000, // Always 5 seconds
}

// Custom function
backoff: {
  type: 'custom',
  delay: (attemptsMade) => {
    return attemptsMade * 1000;
  }
}
```

---

## Building the Payroll API

### Creating Staff Model

First, let's create the database schema:

```sql
-- migrations/001_create_employees_table.sql
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  employee_id VARCHAR(100) NOT NULL UNIQUE,
  salary DECIMAL(15, 2) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  bank_code VARCHAR(20) NOT NULL,
  bank_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
```

Now create the Employee model:

```typescript
// src/models/employee.ts
import { query } from '../config/database';

export interface Employee {
  id: number;
  name: string;
  email: string;
  employee_id: string;
  salary: number;
  account_number: string;
  bank_code: string;
  bank_name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  employee_id: string;
  salary: number;
  account_number: string;
  bank_code: string;
  bank_name: string;
}

export class EmployeeModel {
  static async create(data: CreateEmployeeInput): Promise<Employee> {
    const result = await query(
      `INSERT INTO employees (name, email, employee_id, salary, account_number, bank_code, bank_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.name,
        data.email,
        data.employee_id,
        data.salary,
        data.account_number,
        data.bank_code,
        data.bank_name,
      ]
    );
    return result.rows[0];
  }

  static async findAll(): Promise<Employee[]> {
    const result = await query(
      'SELECT * FROM employees WHERE is_active = true ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async findById(id: number): Promise<Employee | null> {
    const result = await query('SELECT * FROM employees WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
}
```

### Creating Payroll Schedule Model

Create the payroll tables:

```sql
-- migrations/002_create_payrolls_table.sql
CREATE TABLE IF NOT EXISTS payrolls (
  id SERIAL PRIMARY KEY,
  payroll_period VARCHAR(100) NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  total_employees INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  processed_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payrolls_status ON payrolls(status);
```

```sql
-- migrations/003_create_payroll_items_table.sql
CREATE TABLE IF NOT EXISTS payroll_items (
  id SERIAL PRIMARY KEY,
  payroll_id INTEGER NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  transaction_reference VARCHAR(255),
  error_message TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payroll_items_payroll_id ON payroll_items(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_status ON payroll_items(status);
```

### API Endpoints

#### Add Staff

```typescript
// src/controllers/employee.controller.ts
export class EmployeeController {
  static async createEmployee(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateEmployeeInput = req.body;

      if (!data.name || !data.email || !data.employee_id || !data.salary) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const employee = await EmployeeModel.create(data);
      res.status(201).json({
        message: 'Employee created successfully',
        data: employee,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

#### Create Payroll Schedule

```typescript
// src/controllers/payroll.controller.ts
export class PayrollController {
  static async createPayroll(req: Request, res: Response): Promise<void> {
    try {
      const { payroll_period, employee_ids } = req.body;

      if (!payroll_period) {
        res.status(400).json({ error: 'payroll_period is required' });
        return;
      }

      const payroll = await PayrollModel.create({
        payroll_period,
        employee_ids,
      });

      res.status(201).json({
        message: 'Payroll created successfully',
        data: payroll,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

#### Trigger Payment

```typescript
static async processPayroll(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { batch_size } = req.body;

    const payroll = await PayrollModel.findById(parseInt(id));
    if (!payroll) {
      res.status(404).json({ error: 'Payroll not found' });
      return;
    }

    if (payroll.status === PayrollStatus.COMPLETED) {
      res.status(400).json({ error: 'Payroll already completed' });
      return;
    }

    // Update status to processing
    await PayrollModel.updateStatus(parseInt(id), PayrollStatus.PROCESSING);

    // Process payroll items in background
    await processPayrollItems(parseInt(id), batch_size || 5);

    res.json({
      message: 'Payroll processing started',
      data: {
        payroll_id: payroll.id,
        status: PayrollStatus.PROCESSING,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
```

#### Fetch Payment Status

```typescript
static async getPayrollStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const payroll = await PayrollModel.findById(parseInt(id));

    if (!payroll) {
      res.status(404).json({ error: 'Payroll not found' });
      return;
    }

    const items = await PayrollItemModel.findByPayrollId(payroll.id);

    res.json({
      data: {
        ...payroll,
        items,
        summary: {
          total: items.length,
          completed: items.filter((i) => i.status === PayrollStatus.COMPLETED).length,
          failed: items.filter((i) => i.status === PayrollStatus.FAILED).length,
          pending: items.filter((i) => i.status === PayrollStatus.PENDING).length,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
```

### Validation & Error Handling

Add input validation:

```typescript
import { body, validationResult } from 'express-validator';

// Validation middleware
export const validateEmployee = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('salary').isFloat({ min: 0 }).withMessage('Salary must be positive'),
  body('account_number').notEmpty().withMessage('Account number is required'),
  body('bank_code').notEmpty().withMessage('Bank code is required'),
];

// Use in routes
router.post('/', validateEmployee, EmployeeController.createEmployee);
```

---

## Creating the Payroll Job Processor

### Queueing Payroll Jobs

Create the job processor:

```typescript
// src/jobs/payroll.processor.ts
interface PayrollJobData {
  payrollItemId: number;
  payrollId: number;
}

payrollQueue.process(async (job) => {
  const { payrollItemId, payrollId } = job.data as PayrollJobData;

  console.log(
    `Processing payroll item ${payrollItemId} for payroll ${payrollId}`
  );

  try {
    // Get payroll item with employee details
    const items = await PayrollItemModel.findByPayrollId(payrollId);
    const item = items.find((i) => i.id === payrollItemId);

    if (!item) {
      throw new Error(`Payroll item ${payrollItemId} not found`);
    }

    if (item.status !== PayrollStatus.PENDING) {
      return { success: true, message: 'Already processed' };
    }

    // Get employee details
    const employee = await EmployeeModel.findById(item.employee_id);
    if (!employee) {
      throw new Error(`Employee ${item.employee_id} not found`);
    }

    // Update status to processing
    await PayrollItemModel.updateStatus(
      payrollItemId,
      PayrollStatus.PROCESSING
    );

    // Initiate transfer via Monnify
    const narration = `Payroll payment for ${employee.name} - ${item.payroll_id}`;
    const transferResponse = await monnifyClient.initiateTransfer(
      item.amount,
      employee.account_number,
      employee.bank_code,
      employee.name,
      narration
    );

    // Check if transfer was successful
    if (transferResponse.requestSuccessful && transferResponse.responseBody) {
      const transactionRef = transferResponse.responseBody.transactionReference;

      // Update payroll item as completed
      await PayrollItemModel.updateStatus(
        payrollItemId,
        PayrollStatus.COMPLETED,
        transactionRef
      );

      // Update payroll statistics
      await updatePayrollStats(payrollId);

      return {
        success: true,
        transactionReference: transactionRef,
        message: 'Payment processed successfully',
      };
    } else {
      throw new Error(transferResponse.responseMessage || 'Transfer failed');
    }
  } catch (error: any) {
    console.error(`Error processing payroll item ${payrollItemId}:`, error);

    // Update payroll item as failed
    await PayrollItemModel.updateStatus(
      payrollItemId,
      PayrollStatus.FAILED,
      undefined,
      error.message || 'Unknown error'
    );

    // Update payroll statistics
    await updatePayrollStats(payrollId);

    throw error; // Re-throw to trigger retry
  }
});
```

### Processing Payment Batches

Process items in batches to avoid overwhelming the API:

```typescript
export async function processPayrollItems(
  payrollId: number,
  batchSize: number = 5
): Promise<void> {
  const items = await PayrollItemModel.findByPayrollId(payrollId);
  const pendingItems = items.filter(
    (item) => item.status === PayrollStatus.PENDING
  );

  // Process items in batches
  for (let i = 0; i < pendingItems.length; i += batchSize) {
    const batch = pendingItems.slice(i, i + batchSize);

    // Add jobs to queue
    const jobs = batch.map((item) => ({
      payrollItemId: item.id,
      payrollId: payrollId,
    }));

    await Promise.all(jobs.map((job) => payrollQueue.add(job)));

    // Small delay between batches
    if (i + batchSize < pendingItems.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
```

### Handling Failed Jobs

Bull automatically retries failed jobs. Monitor them:

```typescript
payrollQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

payrollQueue.on('failed', (job, err) => {
  console.error(
    `Job ${job.id} failed after ${job.attemptsMade} attempts:`,
    err.message
  );
  // Optionally send alert or notification
});

payrollQueue.on('error', (error) => {
  console.error('Queue error:', error);
});
```

### Logging & Monitoring

Add comprehensive logging:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Use in job processor
logger.info('Processing payroll item', { payrollItemId, payrollId });
logger.error('Payment failed', { error: error.message, payrollItemId });
```

### Updating Payroll Status After Payout

Update overall payroll status based on item statuses:

```typescript
async function updatePayrollStats(payrollId: number): Promise<void> {
  const items = await PayrollItemModel.findByPayrollId(payrollId);

  const processedCount = items.filter(
    (i) => i.status === PayrollStatus.COMPLETED
  ).length;
  const failedCount = items.filter(
    (i) => i.status === PayrollStatus.FAILED
  ).length;
  const totalCount = items.length;

  let status: PayrollStatus;
  if (processedCount === totalCount) {
    status = PayrollStatus.COMPLETED;
  } else if (processedCount > 0) {
    status = PayrollStatus.PARTIALLY_COMPLETED;
  } else if (failedCount === totalCount) {
    status = PayrollStatus.FAILED;
  } else {
    status = PayrollStatus.PROCESSING;
  }

  await PayrollModel.updateStatus(
    payrollId,
    status,
    processedCount,
    failedCount
  );
}
```

---

## Webhook Handling

### Setting Up Monnify Webhooks

1. **Configure Webhook URL**: In Monnify dashboard, set webhook URL to `https://yourdomain.com/api/payrolls/webhook/monnify`
2. **For Local Development**: Use ngrok to expose local server:
   ```bash
   ngrok http 3008
   ```
   Use the ngrok URL in Monnify dashboard

### Verifying Webhook Signatures

Always verify webhook signatures to prevent unauthorized requests:

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secretKey = process.env.MONNIFY_SECRET_KEY || '';
  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(payload)
    .digest('hex');

  return hash === signature;
}

router.post(
  '/webhook/monnify',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const signature = req.headers['monnify-signature'] as string;
    const payload = req.body.toString();

    if (!verifyWebhookSignature(payload, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const data = JSON.parse(payload);
    // Process webhook...
  }
);
```

### Updating Transaction Status

Handle different webhook event types:

```typescript
const { eventType, eventData } = req.body;

switch (eventType) {
  case 'SUCCESSFUL_TRANSACTION':
    await PayrollItemModel.updateStatusByTransactionRef(
      eventData.transactionReference,
      PayrollStatus.COMPLETED
    );
    break;

  case 'FAILED_TRANSACTION':
    await PayrollItemModel.updateStatusByTransactionRef(
      eventData.transactionReference,
      PayrollStatus.FAILED,
      eventData.failureReason
    );
    break;

  case 'OVERPAYMENT':
    // Handle overpayment scenario
    break;
}
```

### Avoiding Duplicate Calls with Idempotency

Use idempotency keys to prevent duplicate processing:

```typescript
const processedWebhooks = new Set<string>();

router.post('/webhook/monnify', async (req: Request, res: Response) => {
  const webhookId = req.body.eventData?.transactionReference;

  if (processedWebhooks.has(webhookId)) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  processedWebhooks.add(webhookId);
  // Process webhook...

  res.status(200).json({ received: true });
});
```

For production, use Redis to store processed webhook IDs:

```typescript
const webhookKey = `webhook:${webhookId}`;
const exists = await redis.exists(webhookKey);

if (exists) {
  return res.status(200).json({ received: true, duplicate: true });
}

await redis.setex(webhookKey, 86400, '1'); // Expire after 24 hours
```

---

## Testing the System End-to-End

### Simulating Staff Data

Create test employees:

```bash
curl -X POST http://localhost:3008/api/employees \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "employee_id": "EMP001",
    "salary": 50000,
    "account_number": "1234567890",
    "bank_code": "058",
    "bank_name": "Guaranty Trust Bank"
  }'
```

### Simulating a Payroll Run

1. **Create Payroll**:

```bash
curl -X POST http://localhost:3008/api/payrolls \
  -H "Content-Type: application/json" \
  -d '{
    "payroll_period": "January 2024"
  }'
```

2. **Process Payroll**:

```bash
curl -X POST http://localhost:3008/api/payrolls/1/process \
  -H "Content-Type: application/json" \
  -d '{
    "batch_size": 5
  }'
```

3. **Check Status**:

```bash
curl http://localhost:3008/api/payrolls/1/status
```

### Testing Background Jobs

Monitor the queue:

```typescript
// Check queue stats
const waiting = await payrollQueue.getWaitingCount();
const active = await payrollQueue.getActiveCount();
const completed = await payrollQueue.getCompletedCount();
const failed = await payrollQueue.getFailedCount();

console.log({ waiting, active, completed, failed });
```

### Testing Monnify Sandbox Transactions

1. Use sandbox credentials
2. Test with dummy accounts from Monnify docs
3. Verify webhook calls are received
4. Check transaction status via API

---

## Optional Enhancements

### Add Admin Dashboard

Create a simple dashboard to visualize:

- Payroll statistics
- Payment status charts
- Employee management UI
- Real-time job queue status

### Add Cron Schedules for Automatic Monthly Payroll

Use node-cron to schedule automatic payroll:

```typescript
import cron from 'node-cron';

// Run on last Friday of every month at 9 AM
cron.schedule('0 9 * * 5', async () => {
  const lastFriday = getLastFridayOfMonth();
  const payroll = await PayrollModel.create({
    payroll_period: format(lastFriday, 'MMMM yyyy'),
  });

  await processPayrollItems(payroll.id);
});
```

### Add Email/SMS Notifications

Notify employees when payments are processed:

```typescript
import nodemailer from 'nodemailer';

async function notifyEmployee(employee: Employee, status: string) {
  const transporter = nodemailer.createTransport({
    // Configure email service
  });

  await transporter.sendMail({
    to: employee.email,
    subject: 'Payroll Payment Update',
    html: `Your payroll payment has been ${status}.`,
  });
}
```

### Add Reporting & Audit Logs

Track all payroll operations:

```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  user_id INTEGER,
  payroll_id INTEGER,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Deploy to Render / Railway / AWS

**Render**:

1. Connect GitHub repository
2. Set environment variables
3. Deploy PostgreSQL and Redis add-ons
4. Deploy application

**Railway**:

1. Create new project
2. Add PostgreSQL and Redis services
3. Deploy from GitHub
4. Configure environment variables

**AWS**:

1. Use Elastic Beanstalk or ECS
2. Set up RDS for PostgreSQL
3. Use ElastiCache for Redis
4. Configure load balancer and auto-scaling

---

## Conclusion

### What You Have Built

You've created a production-ready payroll system with:

- ✅ Employee management with banking details
- ✅ Payroll batch creation and processing
- ✅ Asynchronous payment processing with background jobs
- ✅ Automatic retry mechanism for failed payments
- ✅ Real-time status tracking
- ✅ Webhook integration for payment updates
- ✅ Comprehensive error handling

### Why Background Jobs Improve Reliability

Background jobs provide:

1. **Resilience**: Automatic retries handle transient failures
2. **Scalability**: Process thousands of payments without blocking
3. **Monitoring**: Track job progress and failures
4. **User Experience**: Immediate API responses, async processing
5. **Reliability**: Jobs persist in Redis, survive server restarts

### Possible Extensions

- **HR Module**: Employee onboarding, leave management
- **Loans Module**: Salary advances, loan deductions
- **Payslips**: Generate and email payslips
- **Tax Calculations**: Automatic tax deductions
- **Multi-currency**: Support for different currencies
- **Approval Workflow**: Manager approval before processing
- **Analytics Dashboard**: Payment trends, cost analysis

---

## Full Source Code

The complete source code for this project is available on GitHub:

**[Link to GitHub Repository]**

### Key Files

- `src/config/monnify.ts` - Monnify API client
- `src/jobs/payroll.processor.ts` - Background job processor
- `src/models/payroll.ts` - Payroll data models
- `src/controllers/payroll.controller.ts` - API controllers
- `src/routes/payroll.routes.ts` - API routes

### Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start Docker services: `docker-compose up -d`
5. Run migrations
6. Start the server: `npm run dev`

---

## Additional Resources

- [Monnify API Documentation](https://docs.monnify.com/)
- [Bull Queue Documentation](https://github.com/OptimalBits/bull)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Happy Coding! 🚀**

If you found this tutorial helpful, consider sharing it with others who might benefit from it. For questions or contributions, please open an issue on the GitHub repository.
