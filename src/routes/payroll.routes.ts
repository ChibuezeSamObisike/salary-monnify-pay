import { Router } from 'express';
import { PayrollController } from '../controllers/payroll.controller';

const router = Router();

/**
 * @swagger
 * /api/payrolls:
 *   post:
 *     summary: Create a new payroll
 *     tags: [Payrolls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePayrollInput'
 *     responses:
 *       201:
 *         description: Payroll created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Payroll created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Payroll'
 *       400:
 *         description: Bad request (missing payroll_period)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', PayrollController.createPayroll);

/**
 * @swagger
 * /api/payrolls:
 *   get:
 *     summary: Get all payrolls
 *     tags: [Payrolls]
 *     responses:
 *       200:
 *         description: List of payrolls retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payroll'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', PayrollController.getAllPayrolls);

/**
 * @swagger
 * /api/payrolls/{id}:
 *   get:
 *     summary: Get payroll by ID with items
 *     description: |
 *       Retrieve a payroll with all its items (employee payments).
 *       
 *       **Transaction References:**
 *       - Each item in the "items" array contains payment details
 *       - Items with status "completed" will have a "transaction_reference" field
 *       - Use the transaction_reference to check payment status via GET /api/payrolls/transaction/{reference}/status
 *     tags: [Payrolls]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payroll ID
 *     responses:
 *       200:
 *         description: Payroll retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     payroll_period:
 *                       type: string
 *                     total_amount:
 *                       type: number
 *                     total_employees:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     items:
 *                       type: array
 *                       description: Array of payroll items (one per employee)
 *                       items:
 *                         $ref: '#/components/schemas/PayrollItem'
 *       404:
 *         description: Payroll not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', PayrollController.getPayrollById);

/**
 * @swagger
 * /api/payrolls/{id}/process:
 *   post:
 *     summary: Start processing payroll (background job)
 *     description: |
 *       **IMPORTANT:** This endpoint MUST be called to start processing a payroll.
 *       
 *       After creating a payroll, it will have status "pending" until you call this endpoint.
 *       
 *       **Processing Mode:**
 *       
 *       **Bulk Processing (Always Used):**
 *       - All payments are processed as a single bulk disbursement using Monnify's batch API
 *       - Uses `/api/v2/disbursements/batch` endpoint
 *       - **Requires only ONE OTP/PIN for the entire batch** (if enabled on your Monnify account)
 *       - More efficient than individual transfers
 *       - Uses `onValidationFailure: 'CONTINUE'` to process valid transactions even if some fail
 *       - Example: For 185k total (50k + 75k + 60k) = ONE OTP for the entire batch
 *       - Note: Bulk disbursement requires Monnify account with batch transfer permissions
 *       
 *       **Processing Flow:**
 *       1. Create payroll → Status: "pending"
 *       2. Call this endpoint → Status: "processing"
 *       3. Background jobs process payments → Items change to "completed" or "failed"
 *       4. Check status via GET /api/payrolls/{id}/status to monitor progress
 *     tags: [Payrolls]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payroll ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProcessPayrollInput'
 *     responses:
 *       200:
 *         description: Payroll processing started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Payroll processing started
 *                 data:
 *                   type: object
 *                   properties:
 *                     payroll_id:
 *                       type: integer
 *                     status:
 *                       type: string
 *                       example: processing
 *       400:
 *         description: Bad request (payroll not found or already completed)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Payroll not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/process', PayrollController.processPayroll);

/**
 * @swagger
 * /api/payrolls/batch/authorize:
 *   post:
 *     summary: Authorize bulk transfer with OTP
 *     description: |
 *       **IMPORTANT:** After initiating a bulk transfer, you must authorize it with an OTP.
 *       
 *       **Authorization Flow:**
 *       1. Initiate bulk transfer via POST /api/payrolls/{id}/process
 *       2. Monnify sends an OTP to the merchant's registered email
 *       3. Call this endpoint with the batch reference and OTP to authorize
 *       4. Once authorized, the bulk transfer will be processed
 *       
 *       **Getting the Batch Reference:**
 *       - The batch reference is returned in the response when you initiate a bulk transfer
 *       - It can also be found in the payroll processing logs
 *       - Format: Usually starts with "BATCH_" followed by a timestamp
 *       
 *       **OTP Details:**
 *       - OTP is sent to the email address registered with your Monnify account
 *       - OTP is typically 6 digits
 *       - OTP expires after a certain period (check Monnify documentation)
 *       
 *       **Automatic Transaction Reference Updates:**
 *       - If `payrollId` is included in the request, the system will:
 *         1. Fetch batch details from Monnify after authorization
 *         2. Match transactions with payroll items using reference format
 *         3. Update items with transaction references
 *         4. Automatically reconcile to check transaction status
 *       - This ensures your database is updated with actual transaction references
 *       - **Recommended:** Always include `payrollId` for automatic updates
 *     tags: [Payrolls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthorizeBulkTransferInput'
 *     responses:
 *       200:
 *         description: Bulk transfer authorized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Bulk transfer authorized successfully
 *                 data:
 *                   type: object
 *                   description: Monnify API response
 *       400:
 *         description: Bad request (missing reference or authorization code)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error or Monnify API error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/batch/authorize', PayrollController.authorizeBulkTransfer);

/**
 * @swagger
 * /api/payrolls/{id}/status:
 *   get:
 *     summary: Get payroll processing status with summary
 *     tags: [Payrolls]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payroll ID
 *     responses:
 *       200:
 *         description: Payroll status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayrollStatusResponse'
 *       404:
 *         description: Payroll not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/status', PayrollController.getPayrollStatus);

/**
 * @swagger
 * /api/payrolls/transaction/{reference}/status:
 *   get:
 *     summary: Check transaction status by reference
 *     description: |
 *       Check the status of a Monnify transaction using its transaction reference.
 *       
 *       **How to get transaction references:**
 *       1. Call GET /api/payrolls/{id} to get payroll details with items
 *       2. Look for the "items" array in the response
 *       3. Each item with status "completed" will have a "transaction_reference" field
 *       4. Use that transaction_reference value in this endpoint
 *       
 *       **Note:** Only items with status "completed" will have a transaction_reference.
 *       Items with status "pending", "processing", or "failed" won't have one yet.
 *     tags: [Payrolls]
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction reference from Monnify (obtained from payroll items)
 *         example: MNFY202412091234567890
 *     responses:
 *       200:
 *         description: Transaction status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/TransactionStatus'
 *       400:
 *         description: Bad request (missing reference)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/transaction/:reference/status',
  PayrollController.checkTransactionStatus
);

/**
 * @swagger
 * /api/payrolls/account/balance:
 *   get:
 *     summary: Get Monnify account balance
 *     tags: [Payrolls]
 *     responses:
 *       200:
 *         description: Account balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/AccountBalance'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/account/balance', PayrollController.getAccountBalance);

/**
 * @swagger
 * /api/payrolls/{id}/reconcile:
 *   post:
 *     summary: Reconcile payroll with Monnify transaction status
 *     description: |
 *       **IMPORTANT:** This endpoint synchronizes your payroll database with actual transaction status from Monnify.
 *       
 *       **When to use:**
 *       - After authorizing a bulk transfer (to check final status)
 *       - Periodically to ensure database is in sync with Monnify
 *       - When transactions seem stuck in "processing" status
 *       - After webhook failures or missed webhook notifications
 *       
 *       **What it does:**
 *       1. Fetches all payroll items with transaction references
 *       2. Checks each transaction's status with Monnify API
 *       3. Updates item status based on actual Monnify status:
 *          - `PAID` → Updates to `completed`
 *          - `FAILED` → Updates to `failed` with error message
 *          - `PENDING`/`PROCESSING` → Leaves as is
 *       4. Updates payroll statistics (completed/failed counts)
 *       5. Updates overall payroll status
 *       
 *       **Response includes:**
 *       - Number of items reconciled
 *       - Number of errors encountered
 *       - Total items checked
 *     tags: [Payrolls]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payroll ID to reconcile
 *     responses:
 *       200:
 *         description: Payroll reconciled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Payroll reconciled successfully
 *                 reconciled:
 *                   type: integer
 *                   description: Number of items that were updated
 *                   example: 5
 *                 errors:
 *                   type: integer
 *                   description: Number of errors encountered
 *                   example: 0
 *                 total:
 *                   type: integer
 *                   description: Total number of items checked
 *                   example: 5
 *       404:
 *         description: Payroll not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/reconcile', PayrollController.reconcilePayroll);

export default router;
