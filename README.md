# Payroll System with Express, Monnify, and Background Jobs

A comprehensive payroll management system built with Express.js, TypeScript, PostgreSQL, and Monnify payment integration. The system processes payroll payments asynchronously using background jobs (Bull Queue with Redis).

## Features

- **Employee Management**: Create, read, update, and delete employees with their banking details
- **Payroll Processing**: Create payroll batches and process payments asynchronously
- **Monnify Integration**: Secure payment processing through Monnify API
- **Background Jobs**: Asynchronous payroll processing using Bull Queue and Redis
- **Transaction Tracking**: Monitor payment status and transaction references
- **Error Handling**: Comprehensive error handling and retry mechanisms

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Cache/Queue**: Redis (for Bull Queue)
- **Payment Gateway**: Monnify API
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- Monnify API credentials (API Key, Secret Key, Contract Code)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the `.env.example` file to `.env` and fill in your Monnify credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your Monnify credentials and database configuration:

```
# Monnify API
MONNIFY_API_KEY=your_monnify_api_key
MONNIFY_SECRET_KEY=your_monnify_secret_key
MONNIFY_CONTRACT_CODE=your_contract_code
MONNIFY_BASE_URL=https://api.monnify.com

# Database (defaults shown - adjust if needed)
DB_HOST=localhost
DB_PORT=5433
DB_NAME=payroll_db
DB_USER=payroll_user
DB_PASSWORD=payroll_password

# Redis (defaults shown)
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3008
NODE_ENV=development
```

**Note**: The database port is set to `5433` by default to avoid conflicts with local PostgreSQL instances. If you don't have a local PostgreSQL running, you can change it back to `5432` in both `.env` and `docker-compose.yml`.

### 3. Start Docker Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d
```

### 4. Initialize Database

Run the database migrations:

```bash
# Make the script executable
chmod +x scripts/init-db.sh

# Run the initialization script
./scripts/init-db.sh
```

Or manually run the SQL files in the `migrations` directory.

### 5. Build and Run the Application

```bash
# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Or run in production mode
npm start
```

The server will start on `http://localhost:3000`

## API Documentation

Interactive Swagger documentation is available at:

- **Swagger UI**: `http://localhost:3000/api-docs`

You can use the Swagger UI to:

- View all available endpoints
- See request/response schemas
- Test API endpoints directly from the browser
- View example requests and responses

## API Endpoints

### Employee Management

- `POST /api/employees` - Create a new employee
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee (soft delete)

### Payroll Management

- `POST /api/payrolls` - Create a new payroll
- `GET /api/payrolls` - Get all payrolls
- `GET /api/payrolls/:id` - Get payroll by ID with items
- `POST /api/payrolls/:id/process` - Start processing payroll (initiates bulk transfer)
- `POST /api/payrolls/batch/authorize` - Authorize bulk transfer with OTP (required after processing)
- `POST /api/payrolls/:id/reconcile` - Reconcile payroll with Monnify transaction status
- `GET /api/payrolls/:id/status` - Get payroll processing status
- `GET /api/payrolls/transaction/:reference/status` - Check transaction status
- `GET /api/payrolls/account/balance` - Get Monnify account balance

### Health Check

- `GET /health` - Check server and database health

## Usage Examples

### 1. Create an Employee

```bash
curl -X POST http://localhost:3000/api/employees \
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

### 2. Create a Payroll

```bash
curl -X POST http://localhost:3000/api/payrolls \
  -H "Content-Type: application/json" \
  -d '{
    "payroll_period": "January 2024"
  }'
```

### 3. Process Payroll

```bash
curl -X POST http://localhost:3000/api/payrolls/1/process \
  -H "Content-Type: application/json" \
  -d '{
    "batch_size": 5
  }'
```

**Important:** After processing, you'll receive a batch reference. Check your registered email for an OTP from Monnify, then authorize the transfer:

### 3.5. Authorize Bulk Transfer

```bash
curl -X POST http://localhost:3000/api/payrolls/batch/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "BATCH_1702456789123",
    "authorizationCode": "491763"
  }'
```

### 4. Check Payroll Status

```bash
curl http://localhost:3000/api/payrolls/1/status
```

### 4.5. Reconcile Payroll (Optional but Recommended)

After authorizing a bulk transfer, reconcile to sync with actual Monnify transaction status:

```bash
curl -X POST http://localhost:3000/api/payrolls/1/reconcile
```

This will:
- Check each transaction's status with Monnify
- Update item statuses (PAID → completed, FAILED → failed)
- Update payroll statistics

## Background Jobs

The system uses Bull Queue with Redis to process payroll payments asynchronously. When you trigger payroll processing:

1. Payroll items are queued in batches (default: 5 items per batch)
2. Each item is processed individually with retry logic (3 attempts)
3. Failed payments are logged with error messages
4. Payroll status is updated automatically as items are processed

## Database Schema

### Employees Table

- Employee information and banking details
- Supports soft deletion (is_active flag)

### Payrolls Table

- Payroll batch information
- Tracks total amount, employee count, and processing status

### Payroll Items Table

- Individual payment records
- Links employees to payrolls
- Stores transaction references and error messages

## Error Handling

- Failed payments are retried up to 3 times with exponential backoff
- Error messages are stored in the database for debugging
- Payroll status reflects partial completion if some payments fail

## Security Considerations

- Environment variables for sensitive credentials
- Helmet.js for security headers
- Input validation (should be enhanced with express-validator)
- SQL injection protection via parameterized queries

## Development

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Docker Services

- **PostgreSQL**: Port 5433 (mapped from container port 5432 to avoid conflicts with local PostgreSQL)
- **Redis**: Port 6379

To stop services:

```bash
docker-compose down
```

To remove volumes (clean database):

```bash
docker-compose down -v
```

## Monnify Integration

The system integrates with Monnify's disbursement API to:

- Authenticate using API credentials
- Initiate bulk transfers (batch disbursements) to multiple employee accounts at once
- Initiate single transfers to employee accounts (fallback)
- Check transaction status
- Retrieve account balance

**Bulk Transfer Benefits:**
- Process multiple payments with a single API call
- Requires only ONE OTP/PIN for the entire batch (if enabled on your Monnify account)
- More efficient than individual transfers
- Better error handling with validation failure options

Make sure your Monnify account is configured for disbursements and you have sufficient balance. Bulk transfers use the `/api/v2/disbursements/batch` endpoint.

## Webhook Setup with ngrok

For local development, you'll need to expose your server to the internet so Monnify can send webhook notifications. See [NGROK_SETUP.md](./NGROK_SETUP.md) for detailed instructions.

**Quick Start:**
1. Install ngrok: `brew install ngrok` (or download from [ngrok.com](https://ngrok.com))
2. Start your app: `npm run dev`
3. In another terminal: `ngrok http 3008`
4. Copy the ngrok URL (e.g., `https://abc123.ngrok-free.app`)
5. Configure in Monnify dashboard: `https://abc123.ngrok-free.app/api/monnify/webhook`
6. Set `MONNIFY_WEBHOOK_SECRET` in your `.env` file

## License

ISC
