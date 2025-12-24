# How to Build a Payroll System with Express and Monnify Using Background Jobs

![Learn How to Deploy Web Apps to Digital Ocean [Full Course]](https://cdn.freecodecamp.org/platform/universal/fcc_meta_1920X1080-indigo.png)

Processing payroll payments is an important operation for any business. When you need to pay employees simultaneously, you can't afford to have your server hang, get blocking errors, or timeout while waiting for each payment to complete.

In this tutorial, you’ll learn how to build a production-grade payroll engine using Express.js, TypeScript, and Monnify's payment API. You'll implement background job processing with `Bull` and `Redis` to handle bulk disbursements efficiently.

By the end, you will have a fully functional payroll system that can:

- Manage employee records with bank account details
- Create and process payroll batches
- Process bulk payments using Monnify's disbursement API
- Handle payment status updates via webhooks
- Reconcile transactions to ensure data consistency

## Why This Tutorial Matters

Building a payroll system is an excellent way to practice real-world backend development skills. Unlike simple CRUD applications, payroll systems require you to think about:

**Asynchronous Processing**: When you need to pay hundreds of employees, processing payments synchronously would cause your server to timeout. Background jobs with Bull and Redis allow you to handle long-running operations without blocking your API.

**Payment Gateway Integration**: Working with payment APIs like Monnify teaches you how to handle external service integrations, authentication flows, webhook verification, and error handling in production systems.

**Data Consistency**: Payroll systems need to maintain accurate records. You'll learn about transaction reconciliation, idempotency, and how to handle partial failures gracefully.

**Production-Ready Patterns**: This tutorial covers patterns you'll use in real applications: job queues, webhook handlers, database migrations, and proper error handling.

Whether you're building a fintech application, an HR system, or just want to understand how payment processing works, the concepts in this tutorial will serve you well. The combination of Express, TypeScript, background jobs, and payment APIs represents a common stack in modern backend development.

## Table of Contents

1.  [Prerequisites](#heading-prerequisites)
2.  [Project Architecture Overview](#heading-project-architecture-overview)
3.  [Setting Up the Project](#heading-setting-up-the-project)
4.  [Configuring Docker for PostgreSQL and Redis](#heading-configuring-docker-for-postgresql-and-redis)
5.  [Setting Up the Database](#heading-setting-up-the-database)
6.  [Creating Database Models](#heading-creating-database-models)

    - [Employee Model](#heading-employee-model)
    - [Employee Data Structure (Employee Interface)](#heading-employee-data-structure-employee-interface)
    - [Employee Creation Input (CreateEmployeeInput)](#heading-employee-creation-input-createemployeeinput)
    - [Auto-Generating Employee IDs (generateEmployeeId)](#heading-auto-generating-employee-ids-generateemployeeid)
    - [Creating an Employee (create)](#heading-creating-an-employee-create)
    - [Retrieving All Employees (findAll)](#heading-retrieving-all-employees-findall)
    - [Retrieving an Employee by Database ID (findById)](#heading-retrieving-an-employee-by-database-id-findbyid)
    - [Retrieving an Employee by Employee Identifier (findByEmployeeId)](#heading-retrieving-an-employee-by-employee-identifier-findbyemployeeid)
    - [Updating an Employee (update)](#heading-updating-an-employee-update)
    - [Soft-Deleting an Employee (delete)](#heading-soft-deleting-an-employee-delete)
    - [Role in the Payroll System](#heading-role-in-the-payroll-system)
    - [Payroll Model](#heading-payroll-model)
    - [Payroll Status Lifecycle](#heading-payroll-status-lifecycle)
    - [Payroll Entity](#heading-payroll-entity)
    - [Payroll Item Entity](#heading-payroll-item-entity)
    - [Creating a Payroll (PayrollModel.create)](#heading-creating-a-payroll-payrollmodelcreate)
    - [Fetching Payroll Records](#heading-fetching-payroll-records)
    - [Updating Payroll Status (PayrollModel.updateStatus)](#heading-updating-payroll-status-payrollmodelupdatestatus)
    - [Fetching Payroll Items (PayrollItemModel.findByPayrollId)](#heading-fetching-payroll-items-payrollitemmodelfindbypayrollid)
    - [Fetching a Single Payroll Item (PayrollItemModel.findById)](#heading-fetching-a-single-payroll-item-payrollitemmodelfindbyid)
    - [Updating Payroll Item Status (PayrollItemModel.updateStatus)](#heading-updating-payroll-item-status-payrollitemmodelupdatestatus)
    - [Overall System Flow](#heading-overall-system-flow)

7.  [Building the Monnify Client](#heading-building-the-monnify-client)

    - [Configuration and Environment Setup](#heading-configuration-and-environment-setup)
    - [MonnifyClient Class Overview](#heading-monnifyclient-class-overview)
    - [Axios Client and Request Interceptor](#heading-axios-client-and-request-interceptor)
    - [Authentication Flow](#heading-authentication-flow)
    - [Automatic Token Refresh (ensureAuthenticated)](#heading-automatic-token-refresh-ensureauthenticated)
    - [Initiating Bulk Transfers](#heading-initiating-bulk-transfers)
    - [Authorizing Bulk Transfers (OTP Validation)](#heading-authorizing-bulk-transfers-otp-validation)
    - [Transaction Status Lookup](#heading-transaction-status-lookup)
    - [Batch Details Retrieval](#heading-batch-details-retrieval)
    - [Wallet Balance Check](#heading-wallet-balance-check)

8.  [Implementing Background Job Processing](#heading-implementing-background-job-processing)

    - [Queue Processor Registration](#heading-queue-processor-registration)
    - [Bulk Payroll Processing Flow (processBulkPayroll)](#heading-bulk-payroll-processing-flow-processbulkpayroll)
    - [Building the Bulk Transfer Payload](#heading-building-the-bulk-transfer-payload)
    - [Initiating Bulk Disbursement via Monnify](#heading-initiating-bulk-disbursement-via-monnify)
    - [Storing Transaction References](#heading-storing-transaction-references)
    - [Payroll Statistics Reconciliation (updatePayrollStats)](#heading-payroll-statistics-reconciliation-updatepayrollstats)
    - [Queue Entry Point (processPayrollItems)](#heading-queue-entry-point-processpayrollitems)
    - [Overall Role in the Payroll Architecture](#heading-overall-role-in-the-payroll-architecture)

9.  [Creating the API Controllers](#heading-creating-the-api-controllers)

    - [Controller Responsibilities](#heading-controller-responsibilities)
    - [Creating an Employee (createEmployee)](#heading-creating-an-employee-createemployee)
    - [Fetching All Employees (getAllEmployees)](#heading-fetching-all-employees-getallemployees)
    - [Fetching a Single Employee (getEmployeeById)](#heading-fetching-a-single-employee-getemployeebyid)
    - [Updating an Employee (updateEmployee)](#heading-updating-an-employee-updateemployee)
    - [Deleting an Employee (deleteEmployee)](#heading-deleting-an-employee-deleteemployee)
    - [Error Handling Strategy](#heading-error-handling-strategy)
    - [Role in the Overall Payroll System](#heading-role-in-the-overall-payroll-system)
    - [Payroll Controller](#heading-payroll-controller)
    - [Controller Responsibilities](#heading-controller-responsibilities-1)
    - [Creating a Payroll (createPayroll)](#heading-creating-a-payroll-createpayroll)
    - [Fetching All Payrolls (getAllPayrolls)](#heading-fetching-all-payrolls-getallpayrolls)
    - [Fetching a Payroll with Items (getPayrollById)](#heading-fetching-a-payroll-with-items-getpayrollbyid)
    - [Processing a Payroll (processPayroll)](#heading-processing-a-payroll-processpayroll)
    - [Reconciling Payroll Payments (reconcilePayroll)](#heading-reconciling-payroll-payments-reconcilepayroll)
    - [Payroll Statistics Update (Internal Helper)](#heading-payroll-statistics-update-internal-helper)
    - [Fetching Payroll Status Summary (getPayrollStatus)](#heading-fetching-payroll-status-summary-getpayrollstatus)
    - [Authorizing Bulk Transfers (authorizeBulkTransfer)](#heading-authorizing-bulk-transfers-authorizebulktransfer)
    - [Checking Transaction Status (checkTransactionStatus)](#heading-checking-transaction-status-checktransactionstatus)
    - [Checking Wallet Balance (getAccountBalance)](#heading-checking-wallet-balance-getaccountbalance)
    - [Error Handling and Resilience](#heading-error-handling-and-resilience)
    - [Role in the Overall Payroll Architecture](#heading-role-in-the-overall-payroll-architecture)

10. [Setting Up Webhook Handlers](#heading-setting-up-webhook-handlers)
11. [Wiring Up Routes](#heading-wiring-up-routes)

    - [Employee Routes](#heading-employee-routes)
    - [Payroll Routes](#heading-payroll-routes)
    - [Main Application Entry Point](#heading-main-application-entry-point)

12. [Testing the System](#heading-testing-the-system)

    - [Start the Application](#heading-start-the-application)
    - [Create Employees](#heading-create-employees)
    - [Create a Payroll](#heading-create-a-payroll)
    - [Process the Payroll](#heading-process-the-payroll)
    - [Authorize the Bulk Transfer (if OTP is required)](#heading-authorize-the-bulk-transfer-if-otp-is-required)
    - [Check Payroll Status](#heading-check-payroll-status)
    - [Reconcile if Needed](#heading-reconcile-if-needed)

13. [Setting Up Webhooks for Production](#heading-setting-up-webhooks-for-production)
14. [Conclusion](#heading-conclusion)

    - [Key Takeaways](#heading-key-takeaways)
    - [References:](#heading-references)

## Prerequisites

Before you begin, make sure you have the following:

- **Node.js** (v18 or higher)
- **Docker** and **Docker Compose** installed
- A **Monnify merchant account** with API credentials
- Basic knowledge of TypeScript and Express.js
- Familiarity with REST APIs

You'll also need to obtain these credentials from your Monnify dashboard:

- API Key
- Secret Key
- Contract Code (Monnify account details)
- Webhook Secret (for verifying webhook signatures)

## Project Architecture Overview

Here's how the payroll system works:

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1766393228193/8626c139-776c-491b-b060-2f95a760f32b.png)

**Key Components:**

1.  **Express API**: A minimal and flexible Node.js web framework that handles HTTP requests for managing employees and payrolls. Express provides routing, middleware support, and makes it easy to build RESTful APIs.

2.  **Bull Queue**: A Redis-based queue library for Node.js that processes payroll jobs asynchronously in the background. Bull handles job retries, scheduling, and provides a reliable way to process long-running tasks without blocking your main application thread.

3.  **Redis**: An in-memory data structure store that serves as the backend for Bull queues. Redis stores job data, manages job states (pending, active, completed, failed), and enables distributed job processing across multiple workers.

4.  **PostgreSQL**: A relational database that persists employee records, payrolls, and payment items. PostgreSQL's ACID compliance ensures data integrity, and its support for complex queries makes it ideal for financial applications.

5.  **Monnify API**: A payment gateway service that handles actual money transfers to employee bank accounts. Monnify provides bulk disbursement capabilities, allowing you to process multiple payments in a single API call, which is essential for payroll systems.

6.  **Webhooks**: HTTP callbacks that receive real-time payment status updates from Monnify. When a payment completes or fails, Monnify sends a webhook to your server, allowing you to update your database immediately without polling.

## Setting Up the Project

In this section, we'll initialize a new Node.js project with TypeScript and install all the necessary dependencies. We'll configure TypeScript for type safety and set up the project structure that will support our payroll system.

First, create a new directory and initialize your project:

```
mkdir monnify-payroll-system
cd monnify-payroll-system
npm init -y

```

Install the required dependencies:

```
npm install express cors helmet dotenv axios bull ioredis pg swagger-jsdoc swagger-ui-express express-validator

```

Install the development dependencies:

```
npm install -D typescript ts-node-dev @types/node @types/express @types/cors @types/pg @types/bull

```

Create a `tsconfig.json` file:

```
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*", "scripts/**/*"],
  "exclude": ["node_modules", "dist"]
}

```

Update your `package.json` scripts:

```
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "migrate": "ts-node scripts/run-migrations.ts"
  }
}

```

Create a `.env` file for your environment variables:

All the monnify env details can be gotten in this [route](https://app.monnify.com/developer):

```
# Server
PORT=3008
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5433
DB_NAME=payroll_db
DB_USER=payroll_user
DB_PASSWORD=payroll_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Monnify
MONNIFY_API_KEY=your_api_key
MONNIFY_SECRET_KEY=your_secret_key
MONNIFY_BASE_URL=https://sandbox.monnify.com
MONNIFY_CONTRACT_CODE=your_contract_code
MONNIFY_WEBHOOK_SECRET=your_webhook_secret

```

## Configuring Docker for PostgreSQL and Redis

Before we can start building our application, we need to set up the infrastructure services: PostgreSQL for data persistence and Redis for job queue management. Using Docker Compose makes it easy to run these services locally with a single command. This approach ensures consistency across development environments and simplifies deployment.

Create a `docker-compose.yml` file to set up PostgreSQL and Redis:

```
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

```
docker-compose up -d

```

Verify both services are running:

```
docker-compose ps

```

## Setting Up the Database

Now we'll configure the database connection and create the necessary tables. We'll use a connection pool for efficient database access and create migration files to set up our schema. This approach ensures our database structure is version-controlled and can be easily reproduced.

Create the `src/config/database.ts` file to configure the PostgreSQL connection:

```
import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbName = (process.env.DB_NAME || 'payroll_db').trim();
if (!dbName) {
  throw new Error('Database name (DB_NAME) must be set and cannot be empty');
}

const config: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: dbName,
  user: process.env.DB_USER || 'payroll_user',
  password: process.env.DB_PASSWORD || 'payroll_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(config);

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error('Database query error', error);
    throw error;
  }
};

```

Now create the migration files. First, create a `migrations` folder:

```
mkdir migrations

```

Create `migrations/001_create_employees_table.sql`:

```
-- Create employees table
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

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

```

Create `migrations/002_create_payrolls_table.sql`:

```
-- Create payrolls table
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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payrolls_status ON payrolls(status);
CREATE INDEX IF NOT EXISTS idx_payrolls_period ON payrolls(payroll_period);

```

Create `migrations/003_create_payroll_items_table.sql`:

```
-- Create payroll_items table
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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payroll_items_payroll_id ON payroll_items(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee_id ON payroll_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_status ON payroll_items(status);
CREATE INDEX IF NOT EXISTS idx_payroll_items_transaction_ref ON payroll_items(transaction_reference);

```

Create a migration runner script at `scripts/run-migrations.ts`:

```
import fs from 'fs';
import path from 'path';
import { pool } from '../src/config/database';

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (file.endsWith('.sql')) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await pool.query(sql);
      console.log(`Completed: ${file}`);
    }
  }

  console.log('All migrations completed');
  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

```

Run the migrations:

```
npm run migrate

```

## Creating Database Models

In this section, we'll create the data access layer for our payroll system. Models encapsulate all database operations, providing a clean interface for the rest of the application. We'll build two main models: one for managing employees and another for handling payrolls and payroll items.

For each model, we'll first explain its purpose and key methods, then show you the complete code implementation. This approach helps you understand what each model does before you implement it.

### Employee Model

The `EmployeeModel` serves as the data-access layer for employee records. It handles creating, reading, updating, and soft-deleting employees. The model includes automatic employee ID generation (format: `EMP001`, `EMP002`, etc.) and ensures each employee has the banking details required for payroll disbursement.

**Key Features:**

- Auto-generates sequential employee IDs if not provided
- Validates employee ID uniqueness
- Supports soft deletion to preserve historical payroll records
- Provides methods for finding employees by database ID or employee identifier

Let's implement the Employee Model. Create `src/models/employee.ts`:

```
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
  employee_id?: string; // Optional - will be auto-generated if not provided
  salary: number;
  account_number: string;
  bank_code: string;
  bank_name: string;
}

export class EmployeeModel {
  /**
   * Generate a unique employee ID in format EMP001, EMP002, etc.
   * This method queries the database to find the highest existing ID
   * and increments it, ensuring sequential numbering.
   */
  private static async generateEmployeeId(): Promise<string> {
    // Get the highest existing employee_id number that matches EMP### pattern
    const result = await query(
      `SELECT employee_id FROM employees
       WHERE employee_id LIKE 'EMP%'
       AND LENGTH(employee_id) >= 4
       AND SUBSTRING(employee_id FROM 4) ~ '^[0-9]+$'
       ORDER BY CAST(SUBSTRING(employee_id FROM 4) AS INTEGER) DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return 'EMP001';
    }

    const lastId = result.rows[0].employee_id;
    const numberPart = lastId.substring(3);
    const lastNumber = parseInt(numberPart, 10);

    if (isNaN(lastNumber)) {
      return 'EMP001';
    }

    const nextNumber = lastNumber + 1;
    // Format as EMP001, EMP002, etc. (3 digits minimum)
    return `EMP${nextNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Creates a new employee record. If employee_id is not provided,
   * it auto-generates one. Validates uniqueness if employee_id is manually provided.
   */
  static async create(data: CreateEmployeeInput): Promise<Employee> {
    // Auto-generate employee_id if not provided
    let employeeId = data.employee_id;
    if (!employeeId) {
      employeeId = await this.generateEmployeeId();
    }

    // Check if employee_id already exists (if manually provided)
    if (data.employee_id) {
      const existing = await this.findByEmployeeId(data.employee_id);
      if (existing) {
        throw new Error('Employee ID already exists');
      }
    }

    const result = await query(
      `INSERT INTO employees (name, email, employee_id, salary, account_number, bank_code, bank_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.name,
        data.email,
        employeeId,
        data.salary,
        data.account_number,
        data.bank_code,
        data.bank_name,
      ]
    );
    return result.rows[0];
  }

  /**
   * Returns all active employees, ordered by creation date (newest first).
   * Only active employees are returned to support HR dashboards and payroll selection.
   */
  static async findAll(): Promise<Employee[]> {
    const result = await query(
      'SELECT * FROM employees WHERE is_active = true ORDER BY created_at DESC'
    );
    return result.rows;
  }

  /**
   * Finds an employee by their database primary key (id).
   * Returns null if not found.
   */
  static async findById(id: number): Promise<Employee | null> {
    const result = await query('SELECT * FROM employees WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Finds an active employee by their business identifier (e.g., EMP014).
   * Only returns active employees to prevent selecting deactivated ones.
   */
  static async findByEmployeeId(employeeId: string): Promise<Employee | null> {
    const result = await query(
      'SELECT * FROM employees WHERE employee_id = $1 AND is_active = true',
      [employeeId]
    );
    return result.rows[0] || null;
  }

  /**
   * Updates an employee record with partial data.
   * Dynamically builds the SQL SET clause based on provided fields.
   * Automatically updates the updated_at timestamp.
   */
  static async update(
    id: number,
    data: Partial<CreateEmployeeInput>
  ): Promise<Employee> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic update query based on provided fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Always update the updated_at timestamp
    fields.push(`updated_at = $${paramCount}`);
    values.push(new Date());
    values.push(id);

    const result = await query(
      `UPDATE employees SET ${fields.join(', ')} WHERE id = $${
        paramCount + 1
      } RETURNING *`,
      values
    );
    return result.rows[0];
  }

  /**
   * Soft deletes an employee by setting is_active = false.
   * This preserves historical payroll records while excluding
   * the employee from standard queries.
   */
  static async delete(id: number): Promise<void> {
    await query(
      'UPDATE employees SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );
  }
}
```

### Payroll Model

The `PayrollModel` manages payroll batches and individual payroll items. A payroll represents a single payment cycle (e.g., "December 2024"), while payroll items represent individual employee payments within that cycle. This separation allows us to track the status of each payment independently.

**Key Features:**

- Creates payroll batches with automatic calculation of totals
- Supports filtering employees for selective payroll runs
- Tracks status at both batch and item levels
- Provides methods for reconciliation and status updates

Let's implement the Payroll Model. Create `src/models/payroll.ts`:

The `PayrollStatus` enum defines all possible states for both payroll batches and individual payroll items:

- **PENDING** – Created but not yet processed
- **PROCESSING** – Currently being processed by background workers
- **COMPLETED** – Successfully processed
- **FAILED** – Processing failed
- **PARTIALLY_COMPLETED** – Some items succeeded while others failed

The `Payroll` interface represents a single payroll run (e.g., "December 2024"). It stores aggregate information including total amount, employee count, and processing status. The `PayrollItem` interface represents individual employee payments within a payroll, tracking transaction references and error messages for each payment.

Here's the complete implementation:

```

import { query } from '../config/database';

export enum PayrollStatus {
PENDING = 'pending',
PROCESSING = 'processing',
COMPLETED = 'completed',
FAILED = 'failed',
PARTIALLY_COMPLETED = 'partially_completed',
}

export interface Payroll {
id: number;
payroll_period: string;
total_amount: number;
total_employees: number;
status: PayrollStatus;
processed_count: number;
failed_count: number;
created_at: Date;
updated_at: Date;
processed_at?: Date;
}

export interface PayrollItem {
id: number;
payroll_id: number;
employee_id: number;
amount: number;
status: PayrollStatus;
transaction_reference?: string;
error_message?: string;
processed_at?: Date;
created_at: Date;
updated_at: Date;
}

export interface CreatePayrollInput {
payroll_period: string;
employee_ids?: number[];
}

export class PayrollModel {
  /**
   * Creates a new payroll batch. If employee_ids are provided, only those employees
   * are included. Otherwise, all active employees are included.
   *
   * The method:
   * 1. Calculates total amount and employee count from the employees table
   * 2. Creates a payroll record with PENDING status
   * 3. Creates a payroll item for each eligible employee
   */
  static async create(data: CreatePayrollInput): Promise<Payroll> {
    let employeeFilter = '';
    let queryParams: any[] = [];

    // Build filter for selective employee payrolls
    if (data.employee_ids && data.employee_ids.length > 0) {
      employeeFilter = `AND id = ANY($1::int[])`;
      queryParams = [data.employee_ids];
    }

    // Calculate aggregate statistics from employees table
    const employeeStats = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(salary), 0) as total
       FROM employees
       WHERE is_active = true ${employeeFilter}`,
      queryParams
    );

    const totalEmployees = parseInt(employeeStats.rows[0].count);
    const totalAmount = parseFloat(employeeStats.rows[0].total);

    // Create the payroll record
    const result = await query(
      `INSERT INTO payrolls (payroll_period, total_amount, total_employees, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.payroll_period, totalAmount, totalEmployees, PayrollStatus.PENDING]
    );

    const payroll = result.rows[0];

    // Create payroll items for each employee
    // Each item starts with PENDING status and will be processed asynchronously
    const employees = await query(
      `SELECT id, salary FROM employees WHERE is_active = true ${employeeFilter}`,
      queryParams
    );

    for (const employee of employees.rows) {
      await query(
        `INSERT INTO payroll_items (payroll_id, employee_id, amount, status)
         VALUES ($1, $2, $3, $4)`,
        [payroll.id, employee.id, employee.salary, PayrollStatus.PENDING]
      );
    }

    return payroll;
  }

  /**
   * Retrieves a single payroll by its ID.
   */
  static async findById(id: number): Promise<Payroll | null> {
    const result = await query('SELECT * FROM payrolls WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Retrieves all payrolls, ordered by creation date (newest first).
   * Used for administrative dashboards and reporting.
   */
  static async findAll(): Promise<Payroll[]> {
    const result = await query(
      'SELECT * FROM payrolls ORDER BY created_at DESC'
    );
    return result.rows;
  }

  /**
   * Updates the payroll status and optional statistics.
   * Automatically sets processed_at timestamp when payroll reaches
   * a terminal state (COMPLETED or PARTIALLY_COMPLETED).
   */
  static async updateStatus(
    id: number,
    status: PayrollStatus,
    processedCount?: number,
    failedCount?: number
  ): Promise<Payroll> {
    const updates: string[] = ['status = $2', 'updated_at = NOW()'];
    const values: any[] = [id, status];

    // Dynamically add processed_count if provided
    if (processedCount !== undefined) {
      updates.push(`processed_count = $${values.length + 1}`);
      values.push(processedCount);
    }

    // Dynamically add failed_count if provided
    if (failedCount !== undefined) {
      updates.push(`failed_count = $${values.length + 1}`);
      values.push(failedCount);
    }

    // Set processed_at timestamp for terminal states
    if (
      status === PayrollStatus.COMPLETED ||
      status === PayrollStatus.PARTIALLY_COMPLETED
    ) {
      updates.push(`processed_at = NOW()`);
    }

    const result = await query(
      `UPDATE payrolls SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }
}

export class PayrollItemModel {
  /**
   * Retrieves all payroll items for a specific payroll, enriched with employee details.
   * Uses a JOIN to include employee name, account number, and bank information.
   * Converts numeric fields from strings to numbers for proper TypeScript typing.
   */
  static async findByPayrollId(payrollId: number): Promise<PayrollItem[]> {
    const result = await query(
      `SELECT
         pi.id, pi.payroll_id, pi.employee_id, pi.amount, pi.status,
         pi.transaction_reference, pi.error_message, pi.processed_at,
         pi.created_at, pi.updated_at,
         e.name as employee_name, e.employee_id as employee_identifier,
         e.account_number, e.bank_code, e.bank_name
       FROM payroll_items pi
       JOIN employees e ON pi.employee_id = e.id
       WHERE pi.payroll_id = $1
       ORDER BY pi.created_at`,
      [payrollId]
    );
    // Normalize numeric fields from PostgreSQL (which returns them as strings)
    return result.rows.map((row) => ({
      ...row,
      employee_id: parseInt(row.employee_id, 10),
      id: parseInt(row.id, 10),
      payroll_id: parseInt(row.payroll_id, 10),
      amount: parseFloat(row.amount),
    }));
  }

  /**
   * Retrieves a single payroll item by its ID, enriched with employee details.
   * Used for retrying failed payments or investigating specific payment issues.
   */
  static async findById(id: number): Promise<PayrollItem | null> {
    const result = await query(
      `SELECT
         pi.id, pi.payroll_id, pi.employee_id, pi.amount, pi.status,
         pi.transaction_reference, pi.error_message, pi.processed_at,
         pi.created_at, pi.updated_at,
         e.name as employee_name, e.employee_id as employee_identifier,
         e.account_number, e.bank_code, e.bank_name
       FROM payroll_items pi
       JOIN employees e ON pi.employee_id = e.id
       WHERE pi.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    // Normalize numeric fields
    return {
      ...row,
      employee_id: parseInt(row.employee_id, 10),
      id: parseInt(row.id, 10),
      payroll_id: parseInt(row.payroll_id, 10),
      amount: parseFloat(row.amount),
    };
  }

  /**
   * Updates a payroll item's status, optionally storing transaction reference
   * and error message. Automatically sets processed_at timestamp for terminal states.
   * This method is called by webhooks and reconciliation processes.
   */
  static async updateStatus(
    id: number,
    status: PayrollStatus,
    transactionReference?: string,
    errorMessage?: string
  ): Promise<PayrollItem> {
    const updates: string[] = ['status = $2', 'updated_at = NOW()'];
    const values: any[] = [id, status];

    // Add transaction reference if provided (from Monnify API response)
    if (transactionReference) {
      updates.push(`transaction_reference = $${values.length + 1}`);
      values.push(transactionReference);
    }

    // Add error message if provided (from failed payment)
    if (errorMessage) {
      updates.push(`error_message = $${values.length + 1}`);
      values.push(errorMessage);
    }

    // Set processed_at timestamp for terminal states
    if (status === PayrollStatus.COMPLETED || status === PayrollStatus.FAILED) {
      updates.push(`processed_at = NOW()`);
    }

    const result = await query(
      `UPDATE payroll_items SET ${updates.join(
        ', '
      )} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }
}

```

## Building the Monnify Client

The Monnify client is the bridge between our application and Monnify's payment API. In this section, we'll build a reusable client that handles authentication, bulk transfers, and transaction tracking. The client automatically manages API tokens, retries failed requests, and provides a clean interface for the rest of our application.

This module implements a reusable Monnify API client responsible for handling authentication, bulk payroll disbursements, authorization, transaction tracking, and balance checks in a secure and production-ready manner. It abstracts all Monnify-specific logic behind a single class, making it easy to integrate into background jobs, payroll processors, or service layers.

### Configuration and Environment Setup

The client loads its configuration from environment variables using `dotenv`, ensuring sensitive credentials are never hardcoded. These include the Monnify API key, secret key, base URL, and contract code (wallet account number). This setup allows the same client to be safely used across development, staging, and production environments.

### MonnifyClient Class Overview

The `MonnifyClient` class encapsulates all communication with the Monnify API. It internally manages API credentials, an Axios HTTP client, an access token, and token expiry tracking. This design ensures authentication is handled transparently and automatically for every request.

### Axios Client and Request Interceptor

An Axios instance is created with the Monnify base URL and JSON headers. A request interceptor is attached to this client to automatically inject a valid Bearer token into every outgoing request except the authentication endpoint. Before each request, the interceptor ensures the client is authenticated, preventing unauthorized requests and eliminating token-related boilerplate across the codebase.

### Authentication Flow

Authentication is handled using Monnify’s Basic Auth mechanism, where the API key and secret key are base64-encoded and sent to the `/auth/login` endpoint. Upon successful authentication, the client stores the returned access token and sets an internal expiry timestamp slightly below the official token lifetime to avoid edge-case expirations. Any authentication failure is logged and surfaced as a controlled error to prevent silent failures.

### Automatic Token Refresh (`ensureAuthenticated`)

Before any API call, the client verifies whether a valid access token exists or if the token has expired. If necessary, it transparently re-authenticates. This ensures long-running processes such as payroll queues or background workers can safely make Monnify requests without manual token handling.

### Initiating Bulk Transfers

The `initiateBulkTransfer` method handles the creation of a bulk disbursement batch, typically used for payroll payments. It validates input transfers to ensure each payment has a valid amount, destination account number, and bank code. A structured batch request is then constructed, including a unique batch reference, source account (contract code), narration, and a list of transactions. The request is logged for traceability and sent to Monnify’s batch disbursement endpoint. Any API error is normalized and returned with meaningful messaging to aid debugging and retries.

### Authorizing Bulk Transfers (OTP Validation)

Some bulk transfers require OTP authorization. The `authorizeBulkTransfer` method validates the presence of a batch reference and authorization code before submitting them to Monnify’s OTP validation endpoint. This step finalizes the batch disbursement and allows processing to continue. Errors are logged and surfaced clearly for operational visibility.

### Transaction Status Lookup

The `getTransactionStatus` method retrieves the real-time status of an individual transaction using its reference. This is useful for reconciliation, webhook fallbacks, or manual verification of disbursement outcomes.

### Batch Details Retrieval

The `getBatchDetails` method fetches detailed information about an entire disbursement batch, including the state of individual transactions. This is particularly useful when reconciling payroll runs or recovering from partial failures.

### Wallet Balance Check

The `getAccountBalance` method retrieves the available balance of the configured Monnify wallet (contract account).

Create `src/config/monnify.ts`:

```

import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface MonnifyConfig {
apiKey: string;
secretKey: string;
baseUrl: string;
contractCode: string;
}

export class MonnifyClient {
  private readonly apiKey: string;
  private readonly secretKey: string;
  private baseUrl: string;
  private contractCode: string;
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  /**
   * Initializes the Monnify client with credentials from environment variables.
   * Sets up an Axios instance with a request interceptor that automatically
   * adds authentication tokens to all requests (except the login endpoint).
   */
  constructor() {
    this.apiKey = process.env.MONNIFY_API_KEY || '';
    this.secretKey = process.env.MONNIFY_SECRET_KEY || '';
    this.baseUrl = process.env.MONNIFY_BASE_URL || 'https://api.monnify.com';
    this.contractCode = process.env.MONNIFY_CONTRACT_CODE || '';

    // Create Axios instance with base configuration
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor: automatically adds Bearer token to all requests
    // Skips authentication for the login endpoint itself
    this.client.interceptors.request.use(async (config: any) => {
      if (config.url?.includes('/auth/login')) {
        return config;
      }

      // Ensure we have a valid token before making the request
      await this.ensureAuthenticated();
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });
  }

  /**
   * Authenticates with Monnify using Basic Auth (API key + secret key).
   * Stores the access token and sets expiry to 23 hours (slightly less than
   * the 24-hour token lifetime to avoid edge-case expirations).
   */
  private async authenticate(): Promise<void> {
    try {
      // Encode credentials as Base64 for Basic Auth
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
      // Set expiry to 23 hours (Monnify tokens typically last 24 hours)
      // This prevents edge cases where token expires mid-request
      this.tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
    } catch (error: any) {
      console.error(
        'Monnify authentication error:',
        error.response?.data || error.message
      );
      throw new Error('Failed to authenticate with Monnify');
    }
  }

  /**
   * Ensures we have a valid access token before making API calls.
   * Automatically re-authenticates if token is missing or expired.
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  /**
   * Initiates a bulk transfer (batch disbursement) to multiple recipients.
   * This is the core method for processing payroll payments efficiently.
   *
   * The method:
   * 1. Validates all transfer data
   * 2. Constructs a batch request with unique reference
   * 3. Uses 'CONTINUE' mode to process valid transfers even if some fail
   * 4. Returns the batch response with transaction references
   */
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

    // Validate each transfer to catch errors early
    for (const transfer of transfers) {
      if (!transfer.amount || transfer.amount <= 0) {
        throw new Error(`Invalid amount for transfer: ${transfer.reference}`);
      }
      if (!transfer.recipientAccountNumber) {
        throw new Error(
          `Missing account number for transfer: ${transfer.reference}`
        );
      }
      if (!transfer.recipientBankCode) {
        throw new Error(
          `Missing bank code for transfer: ${transfer.reference}`
        );
      }
    }

    // Build batch request payload
    const requestBody = {
      title: 'Bulk Payroll Transfers',
      batchReference: `BATCH_${Date.now()}`, // Unique batch identifier
      narration: 'Payroll batch disbursement',
      sourceAccountNumber: this.contractCode, // Our Monnify wallet
      onValidationFailure: 'CONTINUE', // Process valid transfers even if some fail
      notificationInterval: 50, // Send webhook updates every 50 transactions
      transactionList: transfers.map((t) => ({
        amount: t.amount,
        reference: t.reference, // Our internal reference (PAYROLL_{id}_{itemId})
        narration: t.narration,
        destinationBankCode: t.recipientBankCode,
        destinationAccountNumber: t.recipientAccountNumber,
        currency: 'NGN', // Nigerian Naira
      })),
    };

    console.log(
      '📤 Monnify bulk transfer request:',
      JSON.stringify(requestBody, null, 2)
    );

    try {
      const response = await this.client.post(
        '/api/v2/disbursements/batch',
        requestBody
      );

      console.log(
        '📥 Monnify bulk transfer response:',
        JSON.stringify(response.data, null, 2)
      );
      return response.data;
    } catch (error: any) {
      const errorDetails = error.response?.data || error.message;
      console.error(
        '❌ Monnify bulk transfer error:',
        JSON.stringify(errorDetails, null, 2)
      );

      // Extract meaningful error message from Monnify response
      if (error.response) {
        const errorData = error.response.data;
        const errorMessage =
          errorData?.responseMessage ||
          errorData?.message ||
          errorData?.error ||
          `Monnify API error (${error.response.status})`;
        throw new Error(errorMessage);
      }
      throw error;
    }
  }

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
      const errorDetails = error.response?.data || error.message;
      console.error(
        'Monnify authorization error:',
        JSON.stringify(errorDetails, null, 2)
      );

      if (error.response) {
        const errorData = error.response.data;
        const errorMessage =
          errorData?.responseMessage ||
          errorData?.message ||
          `Monnify API error (${error.response.status})`;
        throw new Error(errorMessage);
      }
      throw error;
    }

}

async getTransactionStatus(transactionReference: string): Promise<any> {
await this.ensureAuthenticated();

    try {
      const response = await this.client.get(
        `/api/v2/disbursements/${transactionReference}/status`
      );
      return response.data;
    } catch (error: any) {
      console.error(
        'Monnify status check error:',
        error.response?.data || error.message
      );
      throw error;
    }

}

async getBatchDetails(batchReference: string): Promise<any> {
await this.ensureAuthenticated();

    if (!batchReference) {
      throw new Error('Batch reference is required');
    }

    try {
      const response = await this.client.get(
        `/api/v2/disbursements/batch/${batchReference}`
      );
      return response.data;
    } catch (error: any) {
      console.error(
        'Monnify batch details error:',
        error.response?.data || error.message
      );
      throw error;
    }

}

async getAccountBalance(): Promise<any> {
await this.ensureAuthenticated();

    try {
      const response = await this.client.get(
        `/api/v2/disbursements/wallet-balance?accountNumber=${this.contractCode}`
      );
      return response.data;
    } catch (error: any) {
      console.error(
        'Monnify balance check error:',
        error.response?.data || error.message
      );
      throw error;
    }

}
}

export const monnifyClient = new MonnifyClient();

```

**Key features of this client:**

1.  **Automatic Token Management**: The client automatically handles authentication and refreshes tokens before they expire.

2.  **Request Interceptor**: Every API request automatically includes the authentication token.

3.  **Bulk Transfers**: Uses Monnify's batch disbursement API for efficient payroll processing.

4.  **Error Handling**: Comprehensive error handling with meaningful error messages.

## Implementing Background Job Processing

Background jobs are crucial for processing payroll without blocking the main thread. We'll use Bull, a Redis-based queue library.

This module implements the **background processing layer** for payroll execution using **Bull (Redis-based queues)**. It is responsible for orchestrating bulk payroll disbursements, coordinating with the Monnify payment gateway, updating payroll and payroll item statuses, and ensuring fault tolerance through retries and backoff strategies.

#### Queue Initialization and Configuration

A Bull queue named `payroll-processing` is created and backed by Redis. Redis connection details are loaded from environment variables, allowing flexibility across environments. Default job options are configured to retry failed jobs up to three times using an exponential backoff strategy, ensuring resilience against transient failures such as network issues or temporary payment gateway downtime. Completed jobs are automatically removed from the queue to keep Redis storage clean.

### Queue Processor Registration

The queue registers a processor function using `payrollQueue.process`, which receives jobs containing a `payrollId`. Each job triggers the `processBulkPayroll` function, making the queue responsible for executing one payroll batch at a time. This design decouples payroll execution from HTTP requests and allows processing to happen asynchronously in background workers.

### Bulk Payroll Processing Flow (`processBulkPayroll`)

When a payroll job is picked up, the system first fetches all payroll items associated with the given payroll ID. It filters out only items that are eligible for processing—those still in a `PENDING` state or previously marked as `PROCESSING` but missing a transaction reference. This filtering ensures idempotency and prevents duplicate payments when jobs are retried.

If no payable items remain, the function exits early, avoiding unnecessary API calls. Otherwise, the overall payroll status is updated to `PROCESSING` to reflect that disbursement is underway.

### Building the Bulk Transfer Payload

For each payable payroll item, the corresponding employee record is fetched to retrieve bank and account details. A unique payment reference is generated using the payroll ID and payroll item ID, ensuring traceability across systems. Each payroll item is immediately marked as `PROCESSING` before initiating payment to prevent concurrent workers from attempting to process the same item.

A transfer object is then constructed containing the payment amount, recipient bank details, narration, and unique reference. These transfer objects are accumulated into a single batch request.

### Initiating Bulk Disbursement via Monnify

Once all transfers are prepared, the system initiates a bulk transfer through the Monnify client. If Monnify does not confirm successful initiation, the job throws an error, allowing Bull’s retry mechanism to take over. This ensures failed initiation attempts are retried safely without manual intervention.

### Storing Transaction References

After a successful bulk transfer initiation, Monnify returns a list of transactions containing unique transaction references. The system matches each response entry to its corresponding payroll item using the generated reference and updates the payroll item record with the Monnify transaction reference while keeping its status as `PROCESSING`. This step is critical for later reconciliation through webhooks or status polling.

### Payroll Statistics Reconciliation (`updatePayrollStats`)

After initiating payments, the system recalculates payroll-level statistics by refetching all payroll items. It counts completed and failed items and derives the overall payroll status based on these counts. If all items are completed, the payroll is marked as `COMPLETED`; if all failed, it is marked as `FAILED`; if some succeeded and some failed, it is marked as `PARTIALLY_COMPLETED`; otherwise, it remains in `PROCESSING`. The payroll record is then updated with the new status and aggregate counts, providing an accurate real-time snapshot of payroll execution.

### Queue Entry Point (`processPayrollItems`)

The `processPayrollItems` function serves as the public entry point for triggering payroll execution. It simply enqueues a payroll job with the relevant payroll ID, allowing controllers or services to initiate payroll processing without coupling themselves to queue logic or payment execution details.

### Overall Role in the Payroll Architecture

This queue worker acts as the **execution engine** of the payroll system. It bridges payroll domain models with the Monnify payment gateway, ensures safe retries through Bull’s job management, maintains idempotency, and continuously synchronizes payroll and payroll item states. By offloading payment execution to background workers, the system achieves scalability, reliability, and operational resilience required for real-world payroll processing.

Create `src/jobs/payroll.processor.ts`:

```

import Queue from 'bull';
import { monnifyClient } from '../config/monnify';
import {
PayrollItemModel,
PayrollModel,
PayrollStatus,
} from '../models/payroll';
import { EmployeeModel } from '../models/employee';

export const payrollQueue = new Queue('payroll-processing', {
redis: {
host: process.env.REDIS_HOST || 'localhost',
port: Number(process.env.REDIS_PORT || 6379),
},
defaultJobOptions: {
attempts: 3,
backoff: { type: 'exponential', delay: 2000 },
removeOnComplete: true,
},
});

payrollQueue.process(async (job) => {
return processBulkPayroll(job.data.payrollId);
});

async function processBulkPayroll(payrollId: number) {
console.log(`Processing payroll ${payrollId}`);

const items = await PayrollItemModel.findByPayrollId(payrollId);

// Filter items that need to be processed
const payable = items.filter(
(i) =>
i.status === PayrollStatus.PENDING ||
(i.status === PayrollStatus.PROCESSING && !i.transaction_reference)
);

if (payable.length === 0) return;

// Update payroll status to processing
await PayrollModel.updateStatus(payrollId, PayrollStatus.PROCESSING);

const transfers = [];

// Build transfer list
for (const item of payable) {
const employee = await EmployeeModel.findById(item.employee_id);
if (!employee) throw new Error('Employee not found');

    const reference = `PAYROLL_${payrollId}_${item.id}`;

    await PayrollItemModel.updateStatus(item.id, PayrollStatus.PROCESSING);

    transfers.push({
      amount: Number(item.amount),
      reference,
      recipientAccountNumber: employee.account_number,
      recipientBankCode: employee.bank_code,
      recipientName: employee.name,
      narration: `Payroll payment`,
    });

}

// Initiate bulk transfer with Monnify
const response = await monnifyClient.initiateBulkTransfer(transfers);

if (!response?.requestSuccessful) {
throw new Error('Bulk transfer initiation failed');
}

// Update items with transaction references
const results = response.responseBody?.transactionList || [];

for (const item of payable) {
const ref = `PAYROLL_${payrollId}_${item.id}`;
const match = results.find((r: any) => r.reference === ref);

    if (match?.transactionReference) {
      await PayrollItemModel.updateStatus(
        item.id,
        PayrollStatus.PROCESSING,
        match.transactionReference
      );
    }

}

await updatePayrollStats(payrollId);
}

async function updatePayrollStats(payrollId: number) {
const items = await PayrollItemModel.findByPayrollId(payrollId);

const completed = items.filter(
(i) => i.status === PayrollStatus.COMPLETED
).length;

const failed = items.filter((i) => i.status === PayrollStatus.FAILED).length;

let status = PayrollStatus.PROCESSING;

if (completed === items.length) {
status = PayrollStatus.COMPLETED;
} else if (failed === items.length) {
status = PayrollStatus.FAILED;
} else if (completed > 0) {
status = PayrollStatus.PARTIALLY_COMPLETED;
}

await PayrollModel.updateStatus(payrollId, status, completed, failed);
}

export async function processPayrollItems(payrollId: number) {
await payrollQueue.add({ payrollId, type: 'bulk' });
}

```

Key features of the job processor:

1.  **Exponential Backoff**: Failed jobs are retried with increasing delays (2s, 4s, 8s).

2.  **Bulk Processing**: All payroll items are processed as a single batch transfer.

3.  **Status Tracking**: Each item's status is updated throughout the process.

4.  **Automatic Cleanup**: Completed jobs are automatically removed from the queue.

## Creating the API Controllers

This module defines the **HTTP controller layer** for managing employees in the payroll system using **Express.js**. It exposes RESTful API endpoints that handle incoming requests, perform validation, interact with the employee data model, and return appropriate HTTP responses. The controller acts as the bridge between client-facing APIs and the underlying business logic encapsulated in the `EmployeeModel`.

### Controller Responsibilities

The `EmployeeController` is responsible for:

- Validating incoming request data

- Calling the appropriate model methods

- Handling errors gracefully

- Returning meaningful HTTP status codes and JSON responses

Each method follows a consistent structure using `try–catch` blocks to ensure reliability and debuggability.

### Creating an Employee (`createEmployee`)

This endpoint handles the creation of a new employee record. It extracts the request body and validates the presence of required fields such as name, email, salary, bank account number, and bank code. If any required field is missing, the request is rejected with a `400 Bad Request` response. Upon successful validation, the controller delegates employee creation to the `EmployeeModel.create` method and returns a `201 Created` response containing the newly created employee. Any unexpected error during the process results in a `500 Internal Server Error`.

### Fetching All Employees (`getAllEmployees`)

This endpoint retrieves all employee records from the system. It simply calls `EmployeeModel.findAll` and returns the result as a JSON response. This API is typically used for administrative dashboards, payroll preparation, or reporting purposes. Errors during retrieval are logged and returned as server errors.

### Fetching a Single Employee (`getEmployeeById`)

This endpoint retrieves a specific employee by ID, which is parsed from the URL parameters. If the employee does not exist, the controller responds with a `404 Not Found`. Otherwise, the employee data is returned in a successful response. This endpoint is useful for viewing or editing individual employee details.

### Updating an Employee (`updateEmployee`)

This endpoint allows partial updates to an existing employee record. It first checks whether the employee exists before attempting an update. If the employee is not found, a `404 Not Found` response is returned. If the employee exists, the controller forwards the update payload to `EmployeeModel.update` and returns the updated employee record. This approach ensures data integrity and prevents silent failures.

### Deleting an Employee (`deleteEmployee`)

This endpoint handles employee deletion. Before deleting, it verifies the employee exists to avoid invalid delete operations. If found, the employee record is removed using `EmployeeModel.delete`, and a success message is returned. If the employee does not exist, the controller responds with a `404 Not Found`.

### Error Handling Strategy

All controller methods use structured error handling to log errors internally while returning clean and user-friendly error messages to API consumers. This separation ensures sensitive implementation details are not leaked while still providing useful feedback for debugging and client-side handling.

### Role in the Overall Payroll System

The `EmployeeController` provides the foundational APIs required for managing employee records, which are essential inputs for payroll processing. By cleanly separating HTTP concerns from business logic and persistence layers, this controller supports maintainability, scalability, and clear system boundaries within the payroll architecture.

Create `src/controllers/employee.controller.ts`:

```

import { Request, Response } from 'express';
import { EmployeeModel, CreateEmployeeInput } from '../models/employee';

export class EmployeeController {
static async createEmployee(req: Request, res: Response): Promise<void> {
try {
const data: CreateEmployeeInput = req.body;

      if (
        !data.name ||
        !data.email ||
        !data.salary ||
        !data.account_number ||
        !data.bank_code
      ) {
        res.status(400).json({
          error:
            'Missing required fields: name, email, salary, account_number, bank_code',
        });
        return;
      }

      const employee = await EmployeeModel.create(data);
      res.status(201).json({
        message: 'Employee created successfully',
        data: employee,
      });
    } catch (error: any) {
      console.error('Error creating employee:', error);
      res
        .status(500)
        .json({ error: error.message || 'Failed to create employee' });
    }

}

static async getAllEmployees(req: Request, res: Response): Promise<void> {
try {
const employees = await EmployeeModel.findAll();
res.json({ data: employees });
} catch (error: any) {
console.error('Error fetching employees:', error);
res
.status(500)
.json({ error: error.message || 'Failed to fetch employees' });
}
}

static async getEmployeeById(req: Request, res: Response): Promise<void> {
try {
const { id } = req.params;
const employee = await EmployeeModel.findById(parseInt(id));

      if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      res.json({ data: employee });
    } catch (error: any) {
      console.error('Error fetching employee:', error);
      res
        .status(500)
        .json({ error: error.message || 'Failed to fetch employee' });
    }

}

static async updateEmployee(req: Request, res: Response): Promise<void> {
try {
const { id } = req.params;
const data: Partial<CreateEmployeeInput> = req.body;

      const employee = await EmployeeModel.findById(parseInt(id));
      if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      const updated = await EmployeeModel.update(parseInt(id), data);
      res.json({
        message: 'Employee updated successfully',
        data: updated,
      });
    } catch (error: any) {
      console.error('Error updating employee:', error);
      res
        .status(500)
        .json({ error: error.message || 'Failed to update employee' });
    }

}

static async deleteEmployee(req: Request, res: Response): Promise<void> {
try {
const { id } = req.params;

      const employee = await EmployeeModel.findById(parseInt(id));
      if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      await EmployeeModel.delete(parseInt(id));
      res.json({ message: 'Employee deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      res
        .status(500)
        .json({ error: error.message || 'Failed to delete employee' });
    }

}
}

```

### Payroll Controller

This module defines the **PayrollController**, which serves as the primary HTTP-facing orchestration layer for payroll operations in the system. It exposes RESTful APIs that allow clients to create payrolls, retrieve payroll data, trigger payroll processing, reconcile payment results, authorize bulk transfers, and monitor transaction and account statuses.

### Controller Responsibilities

The `PayrollController` is responsible for:

- Accepting and validating client requests related to payrolls

- Managing payroll lifecycle transitions (creation → processing → completion)

- Triggering background job execution for bulk payroll disbursement

- Reconciling payment results with Monnify

- Providing real-time payroll and transaction status visibility

- Acting as a safe boundary between external clients and internal services

### Creating a Payroll (`createPayroll`)

This endpoint initializes a new payroll batch. It requires a `payroll_period` and optionally accepts a list of employee IDs to support partial payroll runs. Incoming employee IDs are normalized and validated to ensure they are valid integers before being passed to the payroll model. The controller delegates the actual creation logic to `PayrollModel.create`, which computes totals and creates payroll items. On success, the API responds with a `201 Created` status and the newly created payroll record.

### Fetching All Payrolls (`getAllPayrolls`)

This endpoint retrieves all payroll batches in the system. It is typically used for administrative dashboards and payroll history views. The controller simply delegates to `PayrollModel.findAll` and returns the results in a structured JSON response.

### Fetching a Payroll with Items (`getPayrollById`)

This endpoint retrieves a single payroll by its ID along with all associated payroll items. If the payroll does not exist, a `404 Not Found` response is returned. When found, the controller aggregates payroll metadata and its child payroll items into a single response object, making it convenient for detailed payroll inspection and UI rendering.

### Processing a Payroll (`processPayroll`)

This endpoint initiates payroll execution. Before queuing the payroll for processing, the controller enforces important state checks to prevent duplicate or invalid execution, ensuring payrolls that are already `PROCESSING` or `COMPLETED` cannot be reprocessed. Once validated, the payroll is queued for background execution using `processPayrollItems`, which hands off processing to Bull workers. The response confirms that the payroll has been successfully queued for bulk processing.

### Reconciling Payroll Payments (`reconcilePayroll`)

This endpoint is responsible for **post-processing reconciliation**, ensuring the system’s payroll item statuses accurately reflect Monnify’s payment outcomes. It retrieves all payroll items with transaction references and queries Monnify for each transaction’s status. Based on the response, payroll items are updated to either `COMPLETED` or `FAILED`, with failure reasons captured where applicable. Errors during reconciliation are tracked and logged without aborting the entire reconciliation process. After reconciliation, payroll-level statistics are recalculated to ensure consistency between item-level and batch-level states.

### Payroll Statistics Update (Internal Helper)

The private `updatePayrollStats` method recalculates payroll status based on the aggregate states of its payroll items. It determines whether a payroll is fully completed, fully failed, partially completed, or still processing, and updates the payroll record accordingly. This logic guarantees that the payroll’s summary status always reflects the true execution state of its underlying payments.

### Fetching Payroll Status Summary (`getPayrollStatus`)

This endpoint provides a comprehensive status snapshot of a payroll. In addition to returning payroll metadata and items, it computes a summary breakdown of completed, failed, pending, and processing items. This endpoint is particularly useful for real-time dashboards, monitoring tools, and operational visibility.

### Authorizing Bulk Transfers (`authorizeBulkTransfer`)

Some bulk disbursements require OTP authorization from Monnify. This endpoint accepts a batch reference and authorization code, validates their presence, and forwards them to the Monnify client for verification. Successful authorization allows the bulk transfer to proceed, while failures are clearly reported to the client.

### Checking Transaction Status (`checkTransactionStatus`)

This endpoint allows clients or administrators to query the status of an individual transaction using its reference. It delegates the lookup to the Monnify client and returns the raw response, making it useful for debugging, audits, or manual verification workflows.

### Checking Wallet Balance (`getAccountBalance`)

This endpoint retrieves the current balance of the Monnify wallet associated with the payroll contract code. It is typically used for pre-disbursement checks, monitoring available funds, or administrative reporting.

### Error Handling and Resilience

All controller methods use structured `try–catch` blocks to ensure unexpected failures are logged and surfaced as controlled HTTP error responses. This approach prevents sensitive internal errors from leaking while maintaining clarity and debuggability for API consumers.

### Role in the Overall Payroll Architecture

The `PayrollController` acts as the **central coordinator** of the payroll system. It bridges client requests, domain models, background job processing, and external payment services into a cohesive workflow. By enforcing state transitions, delegating heavy processing to background workers, and providing reconciliation and monitoring capabilities, this controller ensures payroll execution remains reliable, auditable, and scalable in real-world production environments.

Create `src/controllers/payroll.controller.ts`:

```

import { Request, Response } from 'express';
import {
PayrollModel,
PayrollItemModel,
PayrollStatus,
} from '../models/payroll';
import { processPayrollItems } from '../jobs/payroll.processor';
import { monnifyClient } from '../config/monnify';

export class PayrollController {
static async createPayroll(req: Request, res: Response): Promise<void> {
try {
const { payroll_period, employee_ids } = req.body;

      if (!payroll_period) {
        res.status(400).json({ error: 'payroll_period is required' });
        return;
      }

      const processedEmployeeIds = employee_ids
        ? employee_ids
            .map((id: any) => parseInt(id, 10))
            .filter((id: number) => !isNaN(id))
        : undefined;

      const payroll = await PayrollModel.create({
        payroll_period,
        employee_ids: processedEmployeeIds,
      });

      res.status(201).json({
        message: 'Payroll created successfully',
        data: payroll,
      });
    } catch (error: any) {
      console.error('Error creating payroll:', error);
      res
        .status(500)
        .json({ error: error.message || 'Failed to create payroll' });
    }

}

static async getAllPayrolls(req: Request, res: Response): Promise<void> {
try {
const payrolls = await PayrollModel.findAll();
res.json({ data: payrolls });
} catch (error: any) {
console.error('Error fetching payrolls:', error);
res
.status(500)
.json({ error: error.message || 'Failed to fetch payrolls' });
}
}

static async getPayrollById(req: Request, res: Response): Promise<void> {
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
        },
      });
    } catch (error: any) {
      console.error('Error fetching payroll:', error);
      res
        .status(500)
        .json({ error: error.message || 'Failed to fetch payroll' });
    }

}

static async processPayroll(req: Request, res: Response): Promise<void> {
try {
const { id } = req.params;

      const payroll = await PayrollModel.findById(Number(id));

      if (!payroll) {
        res.status(404).json({ error: 'Payroll not found' });
        return;
      }

      if (
        payroll.status === PayrollStatus.COMPLETED ||
        payroll.status === PayrollStatus.PROCESSING
      ) {
        res.status(400).json({
          error: `Payroll already ${payroll.status}`,
        });
        return;
      }

      // Queue the payroll for processing
      await processPayrollItems(payroll.id);

      res.json({
        message: 'Payroll queued for bulk processing',
        data: {
          payroll_id: payroll.id,
          processing_mode: 'bulk',
        },
      });
    } catch (error: any) {
      console.error('Error processing payroll:', error);
      res.status(500).json({
        error: error.message || 'Failed to process payroll',
      });
    }

}

static async reconcilePayroll(req: Request, res: Response): Promise<void> {
try {
const { id } = req.params;

      const payroll = await PayrollModel.findById(Number(id));
      if (!payroll) {
        res.status(404).json({ error: 'Payroll not found' });
        return;
      }

      const items = await PayrollItemModel.findByPayrollId(Number(id));

      const itemsToReconcile = items.filter(
        (item) => item.transaction_reference
      );

      if (itemsToReconcile.length === 0) {
        res.json({
          message: 'No items to reconcile (no transaction references found)',
          reconciled: 0,
        });
        return;
      }

      let updated = 0;
      let errors = 0;

      for (const item of itemsToReconcile) {
        try {
          const txStatus = await monnifyClient.getTransactionStatus(
            item.transaction_reference!
          );

          const responseBody = txStatus.responseBody || txStatus;
          const paymentStatus =
            responseBody.paymentStatus || responseBody.status;

          if (
            paymentStatus === 'PAID' &&
            item.status !== PayrollStatus.COMPLETED
          ) {
            await PayrollItemModel.updateStatus(
              item.id,
              PayrollStatus.COMPLETED,
              item.transaction_reference
            );
            updated++;
          } else if (
            paymentStatus === 'FAILED' &&
            item.status !== PayrollStatus.FAILED
          ) {
            const errorMessage =
              responseBody.paymentDescription ||
              responseBody.failureReason ||
              'Transaction failed';
            await PayrollItemModel.updateStatus(
              item.id,
              PayrollStatus.FAILED,
              item.transaction_reference,
              errorMessage
            );
            updated++;
          }
        } catch (error: any) {
          errors++;
          console.error(`Error reconciling item ${item.id}:`, error.message);
        }
      }

      // Update payroll stats
      await PayrollController.updatePayrollStats(Number(id));

      res.json({
        message: 'Payroll reconciled successfully',
        reconciled: updated,
        errors,
        total: itemsToReconcile.length,
      });
    } catch (error: any) {
      console.error('Error reconciling payroll:', error);
      res.status(500).json({
        error: error.message || 'Failed to reconcile payroll',
      });
    }

}

private static async updatePayrollStats(payrollId: number): Promise<void> {
const items = await PayrollItemModel.findByPayrollId(payrollId);

    const completed = items.filter(
      (i) => i.status === PayrollStatus.COMPLETED
    ).length;
    const failed = items.filter(
      (i) => i.status === PayrollStatus.FAILED
    ).length;
    const total = items.length;

    let status: PayrollStatus;
    if (completed === total) {
      status = PayrollStatus.COMPLETED;
    } else if (failed === total) {
      status = PayrollStatus.FAILED;
    } else if (completed > 0) {
      status = PayrollStatus.PARTIALLY_COMPLETED;
    } else {
      status = PayrollStatus.PROCESSING;
    }

    await PayrollModel.updateStatus(payrollId, status, completed, failed);

}

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
            completed: items.filter((i) => i.status === PayrollStatus.COMPLETED)
              .length,
            failed: items.filter((i) => i.status === PayrollStatus.FAILED)
              .length,
            pending: items.filter((i) => i.status === PayrollStatus.PENDING)
              .length,
            processing: items.filter(
              (i) => i.status === PayrollStatus.PROCESSING
            ).length,
          },
        },
      });
    } catch (error: any) {
      console.error('Error fetching payroll status:', error);
      res
        .status(500)
        .json({ error: error.message || 'Failed to fetch payroll status' });
    }

}

static async authorizeBulkTransfer(
req: Request,
res: Response
): Promise<void> {
try {
const { reference, authorizationCode, payrollId } = req.body;

      if (!reference) {
        res.status(400).json({ error: 'Batch reference is required' });
        return;
      }

      if (!authorizationCode) {
        res.status(400).json({ error: 'Authorization code (OTP) is required' });
        return;
      }

      const result = await monnifyClient.authorizeBulkTransfer(
        reference,
        authorizationCode
      );

      res.json({
        message: 'Bulk transfer authorized successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Error authorizing bulk transfer:', error);
      res.status(500).json({
        error: error.message || 'Failed to authorize bulk transfer',
      });
    }

}

static async checkTransactionStatus(
req: Request,
res: Response
): Promise<void> {
try {
const { reference } = req.params;

      if (!reference) {
        res.status(400).json({ error: 'Transaction reference is required' });
        return;
      }

      const status = await monnifyClient.getTransactionStatus(reference);
      res.json({ data: status });
    } catch (error: any) {
      console.error('Error checking transaction status:', error);
      res
        .status(500)
        .json({ error: error.message || 'Failed to check transaction status' });
    }

}

static async getAccountBalance(req: Request, res: Response): Promise<void> {
try {
const balance = await monnifyClient.getAccountBalance();
res.json({ data: balance });
} catch (error: any) {
console.error('Error fetching account balance:', error);
res
.status(500)
.json({ error: error.message || 'Failed to fetch account balance' });
}
}
}

```

## Setting Up Webhook Handlers

Webhooks are essential for receiving real-time payment status updates from Monnify. When a payment completes or fails, Monnify sends a notification to your webhook endpoint.

Create `src/routes/monnify.webhook.ts`:

```

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
PayrollItemModel,
PayrollModel,
PayrollStatus,
} from '../models/payroll';

const router = Router();

function verifySignature(req: Request): boolean {
const signature = req.headers['monnify-signature'] as string;
if (!signature) return false;

const secret = process.env.MONNIFY_WEBHOOK_SECRET!;
const hash = crypto
.createHmac('sha512', secret)
.update(JSON.stringify(req.body))
.digest('hex');

return hash === signature;
}

router.post('/monnify/webhook', async (req: Request, res: Response) => {
try {
console.log('Monnify Webhook:', JSON.stringify(req.body, null, 2));

    const { eventType, eventData } = req.body;

    if (!eventData?.reference) {
      console.warn('Missing reference, ignoring webhook');
      return res.status(200).send('Ignored');
    }

    const paymentReference = eventData.reference;
    const transactionReference = eventData.transactionReference;
    const description = eventData.transactionDescription || '';

    // Parse our reference format: PAYROLL_{payrollId}_{itemId}
    const [prefix, payrollIdStr, itemIdStr] = paymentReference.split('_');

    if (prefix !== 'PAYROLL') {
      console.warn('Invalid payment reference format:', paymentReference);
      return res.status(200).send('Ignored');
    }

    const payrollId = Number(payrollIdStr);
    const itemId = Number(itemIdStr);

    if (isNaN(payrollId) || isNaN(itemId)) {
      console.warn('Invalid payroll/item IDs:', paymentReference);
      return res.status(200).send('Ignored');
    }

    const item = await PayrollItemModel.findById(itemId);

    if (!item) {
      console.warn('Payroll item not found:', itemId);
      return res.status(200).send('Ignored');
    }

    // Idempotency check - don't process already finalized items
    if (
      item.status === PayrollStatus.COMPLETED ||
      item.status === PayrollStatus.FAILED
    ) {
      console.log(`Item ${itemId} already finalized (${item.status})`);
      return res.status(200).send('Already processed');
    }

    // Update status based on event type
    if (
      eventType === 'SUCCESSFUL_DISBURSEMENT' ||
      eventData.status === 'SUCCESS'
    ) {
      await PayrollItemModel.updateStatus(
        itemId,
        PayrollStatus.COMPLETED,
        transactionReference
      );
      console.log(`✅ Payroll item ${itemId} COMPLETED`);
    } else if (
      eventType === 'FAILED_DISBURSEMENT' ||
      eventType === 'REVERSED_DISBURSEMENT' ||
      eventData.status === 'FAILED'
    ) {
      await PayrollItemModel.updateStatus(
        itemId,
        PayrollStatus.FAILED,
        transactionReference,
        description
      );
      console.log(`Payroll item ${itemId} FAILED`);
    } else {
      console.log(`Unhandled Monnify eventType: ${eventType}`);
    }

    // Update overall payroll stats
    await updatePayrollStats(payrollId);

    return res.status(200).send('OK');

} catch (error: any) {
console.error('Monnify webhook error:', error.message);
return res.status(200).send('OK'); // Always return 200 to prevent retries
}
});

export default router;

async function updatePayrollStats(payrollId: number) {
const items = await PayrollItemModel.findByPayrollId(payrollId);

const completed = items.filter(
(i) => i.status === PayrollStatus.COMPLETED
).length;

const failed = items.filter((i) => i.status === PayrollStatus.FAILED).length;

let status = PayrollStatus.PROCESSING;

if (completed === items.length) {
status = PayrollStatus.COMPLETED;
} else if (failed === items.length) {
status = PayrollStatus.FAILED;
} else if (completed > 0) {
status = PayrollStatus.PARTIALLY_COMPLETED;
}

await PayrollModel.updateStatus(payrollId, status, completed, failed);
}

```

Key webhook implementation details:

1.  **Signature Verification**: The `verifySignature` function validates that webhooks actually come from Monnify.

2.  **Idempotency**: The handler checks if an item is already finalized before processing.

3.  **Always Return 200**: Even on errors, return 200 to prevent Monnify from retrying indefinitely.

4.  **Reference Parsing**: Our reference format `PAYROLL_{payrollId}_{itemId}` lets us identify which payment item to update.

## Wiring Up Routes

### Employee Routes

Create `src/routes/employee.routes.ts`:

```

import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller';

const router = Router();

router.post('/', EmployeeController.createEmployee);
router.get('/', EmployeeController.getAllEmployees);
router.get('/:id', EmployeeController.getEmployeeById);
router.put('/:id', EmployeeController.updateEmployee);
router.delete('/:id', EmployeeController.deleteEmployee);

export default router;

```

### Payroll Routes

Create `src/routes/payroll.routes.ts`:

```

import { Router } from 'express';
import { PayrollController } from '../controllers/payroll.controller';

const router = Router();

router.post('/', PayrollController.createPayroll);
router.get('/', PayrollController.getAllPayrolls);
router.get('/:id', PayrollController.getPayrollById);
router.post('/:id/process', PayrollController.processPayroll);
router.post('/batch/authorize', PayrollController.authorizeBulkTransfer);
router.get('/:id/status', PayrollController.getPayrollStatus);
router.get(
'/transaction/:reference/status',
PayrollController.checkTransactionStatus
);
router.get('/account/balance', PayrollController.getAccountBalance);
router.post('/:id/reconcile', PayrollController.reconcilePayroll);

export default router;

```

### Main Application Entry Point

Create `src/index.ts`:

```

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { pool } from './config/database';
import employeeRoutes from './routes/employee.routes';
import payrollRoutes from './routes/payroll.routes';
import monnifyWebhookRoutes from './routes/monnify.webhook';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3008;

// Middleware
app.use(
helmet({
contentSecurityPolicy: false,
})
);
app.use(
cors({
origin: '\*',
methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
allowedHeaders: ['Content-Type', 'Authorization'],
})
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
try {
await pool.query('SELECT 1');
res.json({ status: 'healthy', database: 'connected' });
} catch (error) {
res.status(500).json({ status: 'unhealthy', database: 'disconnected' });
}
});

// Routes
app.use('/api/employees', employeeRoutes);
app.use('/api/payrolls', payrollRoutes);
app.use('/api', monnifyWebhookRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
console.error('Error:', err);
res.status(err.status || 500).json({
error: err.message || 'Internal server error',
});
});

app.listen(PORT, () => {
console.log(`Server is running on port ${PORT}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
console.log('SIGTERM signal received: closing HTTP server');
await pool.end();
process.exit(0);
});

process.on('SIGINT', async () => {
console.log('SIGINT signal received: closing HTTP server');
await pool.end();
process.exit(0);
});

```

## Testing the System

Now let's test the complete payroll flow.

### Start the Application

```

docker-compose up -d
npm run dev

```

### Create Employees

```

curl -X POST http://localhost:3008/api/employees \
 -H "Content-Type: application/json" \
 -d '{
"name": "John Doe",
"email": "[email protected]",
"salary": 50000,
"account_number": "0123456789",
"bank_code": "058",
"bank_name": "GTBank"
}'

```

Create a few more employees with different salaries.

### Create a Payroll

```

curl -X POST http://localhost:3008/api/payrolls \
 -H "Content-Type: application/json" \
 -d '{
"payroll_period": "2024-12"
}'

```

This creates a payroll with all active employees.

### Process the Payroll

```

curl -X POST http://localhost:3008/api/payrolls/1/process

```

This queues the payroll for background processing. The system will:

1.  Create a bulk transfer request to Monnify

2.  Update each payroll item with a transaction reference

3.  Wait for webhooks to update final status

### Authorize the Bulk Transfer (if OTP is required)

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1766392280287/4d8ae61f-4ccf-4d63-86a1-a6f72d7286e1.png)

After processing, Monnify sends an OTP to your registered email. Use it to authorize:

```

curl -X POST http://localhost:3008/api/payrolls/batch/authorize \
 -H "Content-Type: application/json" \
 -d '{
"reference": "BATCH_1702123456789",
"authorizationCode": "123456",
"payrollId": 1
}'

```

### Check Payroll Status

```

curl http://localhost:3008/api/payrolls/1/status

```

This returns detailed status including a summary of completed, failed, and pending items.

### Reconcile if Needed

If webhooks were missed or you need to sync status:

```

curl -X POST http://localhost:3008/api/payrolls/1/reconcile

```

## Setting Up Webhooks for Production

For Monnify to send webhooks to your local development environment, you'll need to expose your local server. You can use ngrok:

```

ngrok http 3008

```

Then configure the webhook URL in your [Monnify dashboard](https://app.monnify.com/developer#webhook-urls):

```

https://your-ngrok-url.ngrok.io/api/monnify/webhook

```

For production, use your actual server URL and ensure HTTPS is enabled.

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1766392444369/440bc1a9-7c70-42b0-9157-892f1ef07861.png)

Then when transactions are successful it will be revealed on the monnify dashboard as well as the transactions that failed.

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1766392958199/e8abaa75-5a2f-44fd-b322-b110cf71e92d.png)

## Conclusion

You've built a complete payroll system that:

- **Manages employees** with their bank account details

- **Creates payroll batches** with automatic amount calculation

- **Processes bulk payments** using Monnify's disbursement API

- **Uses background jobs** to prevent request timeouts

- **Handles webhooks** for real-time status updates

- **Supports reconciliation** to ensure data consistency

### Key Takeaways

1.  **Background Jobs Are Essential**: Processing payments synchronously would timeout for large payrolls. Bull and Redis provide reliable async processing.

2.  **Idempotency Matters**: Both the webhook handler and reconciliation process check current status before updating, preventing duplicate processing.

3.  **Bulk Transfers Save Time**: Monnify's batch API lets you process hundreds of payments with a single OTP authorization.

4.  **Status Tracking Is Critical**: The system tracks status at both the payroll and individual item level, making it easy to identify and handle failures.

5.  **Reconciliation Is Your Safety Net**: When webhooks fail or get delayed, the reconciliation endpoint ensures your database stays in sync with actual payment status.

### References:

- [Monnify Docs](https://developers.monnify.com/)
