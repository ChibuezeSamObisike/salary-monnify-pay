import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Monnify Payroll System API',
      version: '1.0.0',
      description:
        'A comprehensive payroll management system with Express.js, TypeScript, PostgreSQL, and Monnify payment integration. The system processes payroll payments asynchronously using background jobs (Bull Queue with Redis).',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3008',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Employees',
        description: 'Employee management endpoints',
      },
      {
        name: 'Payrolls',
        description: 'Payroll management and processing endpoints',
      },
    ],
    components: {
      schemas: {
        Employee: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com',
            },
            employee_id: {
              type: 'string',
              example: 'EMP001',
            },
            salary: {
              type: 'number',
              format: 'float',
              example: 50000,
            },
            account_number: {
              type: 'string',
              example: '1234567890',
            },
            bank_code: {
              type: 'string',
              example: '058',
            },
            bank_name: {
              type: 'string',
              example: 'Guaranty Trust Bank',
            },
            is_active: {
              type: 'boolean',
              example: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        CreateEmployeeInput: {
          type: 'object',
          required: ['name', 'email', 'salary', 'account_number', 'bank_code'],
          properties: {
            name: {
              type: 'string',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com',
            },
            employee_id: {
              type: 'string',
              description:
                'Optional - will be auto-generated if not provided (format: EMP001, EMP002, etc.)',
              example: 'EMP001',
            },
            salary: {
              type: 'number',
              format: 'float',
              example: 50000,
            },
            account_number: {
              type: 'string',
              example: '1234567890',
            },
            bank_code: {
              type: 'string',
              example: '058',
            },
            bank_name: {
              type: 'string',
              example: 'Guaranty Trust Bank',
            },
          },
        },
        UpdateEmployeeInput: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com',
            },
            employee_id: {
              type: 'string',
              example: 'EMP001',
            },
            salary: {
              type: 'number',
              format: 'float',
              example: 50000,
            },
            account_number: {
              type: 'string',
              example: '1234567890',
            },
            bank_code: {
              type: 'string',
              example: '058',
            },
            bank_name: {
              type: 'string',
              example: 'Guaranty Trust Bank',
            },
          },
        },
        Payroll: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            payroll_period: {
              type: 'string',
              example: 'January 2024',
            },
            total_amount: {
              type: 'number',
              format: 'float',
              example: 500000,
            },
            total_employees: {
              type: 'integer',
              example: 10,
            },
            status: {
              type: 'string',
              enum: [
                'pending',
                'processing',
                'completed',
                'failed',
                'partially_completed',
              ],
              example: 'pending',
            },
            processed_count: {
              type: 'integer',
              example: 0,
            },
            failed_count: {
              type: 'integer',
              example: 0,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
            },
            processed_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
        PayrollItem: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Payroll item ID',
              example: 1,
            },
            payroll_id: {
              type: 'integer',
              description: 'ID of the parent payroll',
              example: 1,
            },
            employee_id: {
              type: 'integer',
              description: 'Employee database ID (foreign key)',
              example: 1,
            },
            employee_name: {
              type: 'string',
              description: 'Name of the employee',
              example: 'John Doe',
            },
            employee_identifier: {
              type: 'string',
              description: 'Employee identifier code (e.g., EMP001)',
              example: 'EMP001',
            },
            amount: {
              type: 'number',
              format: 'float',
              description: 'Payment amount',
              example: 50000,
            },
            status: {
              type: 'string',
              enum: [
                'pending',
                'processing',
                'completed',
                'failed',
                'partially_completed',
              ],
              description: 'Current status of the payroll item',
              example: 'pending',
            },
            transaction_reference: {
              type: 'string',
              nullable: true,
              description:
                'Monnify transaction reference (only present when status is "completed")',
              example: 'MNFY202412091234567890',
            },
            error_message: {
              type: 'string',
              nullable: true,
              description: 'Error message if processing failed',
            },
            account_number: {
              type: 'string',
              description: 'Employee bank account number',
              example: '1234567890',
            },
            bank_code: {
              type: 'string',
              description: 'Bank code (e.g., 058 for GTB)',
              example: '058',
            },
            bank_name: {
              type: 'string',
              description: 'Name of the bank',
              example: 'Guaranty Trust Bank',
            },
            processed_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Timestamp when the item was processed',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the item was created',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the item was last updated',
            },
          },
        },
        CreatePayrollInput: {
          type: 'object',
          required: ['payroll_period'],
          properties: {
            payroll_period: {
              type: 'string',
              example: 'January 2024',
            },
            employee_ids: {
              type: 'array',
              items: {
                type: 'integer',
              },
              description:
                'Optional array of employee IDs. If not provided, all active employees will be included.',
              example: [1, 2, 3],
            },
          },
        },
        ProcessPayrollInput: {
          type: 'object',
          properties: {
            batch_size: {
              type: 'integer',
              default: 5,
              description:
                'Deprecated: This parameter is kept for backward compatibility but is not used. All processing is done via bulk transfer.',
              example: 5,
            },
          },
          description:
            "Note: All payroll processing uses bulk transfer mode. All payments are processed as a single batch using Monnify's batch API (/api/v2/disbursements/batch). This requires only ONE OTP/PIN for the entire batch if enabled on your Monnify account.",
        },
        AuthorizeBulkTransferInput: {
          type: 'object',
          required: ['reference', 'authorizationCode'],
          properties: {
            reference: {
              type: 'string',
              description:
                'The unique batch reference returned when initiating the bulk transfer',
              example: 'BATCH_1702456789123',
            },
            authorizationCode: {
              type: 'string',
              description:
                "The OTP (One-Time Password) sent to the merchant's registered email address",
              example: '491763',
            },
            payrollId: {
              type: 'integer',
              description:
                'Optional: Payroll ID. If provided, the system will automatically fetch batch details, update transaction references, and reconcile the payroll status after authorization.',
              example: 1,
            },
          },
          description:
            'Request body for authorizing a bulk transfer. The OTP is sent to the email address registered with your Monnify account after initiating a bulk transfer. Including payrollId enables automatic transaction reference updates and reconciliation.',
        },
        PayrollStatusResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                },
                payroll_period: {
                  type: 'string',
                },
                total_amount: {
                  type: 'number',
                },
                total_employees: {
                  type: 'integer',
                },
                status: {
                  type: 'string',
                },
                processed_count: {
                  type: 'integer',
                },
                failed_count: {
                  type: 'integer',
                },
                items: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/PayrollItem',
                  },
                },
                summary: {
                  type: 'object',
                  properties: {
                    total: {
                      type: 'integer',
                    },
                    completed: {
                      type: 'integer',
                    },
                    failed: {
                      type: 'integer',
                    },
                    pending: {
                      type: 'integer',
                    },
                    processing: {
                      type: 'integer',
                    },
                  },
                },
              },
            },
          },
        },
        TransactionStatus: {
          type: 'object',
          properties: {
            reference: {
              type: 'string',
            },
            status: {
              type: 'string',
            },
            amount: {
              type: 'number',
            },
            currency: {
              type: 'string',
            },
            destinationAccountNumber: {
              type: 'string',
            },
            destinationBankCode: {
              type: 'string',
            },
            destinationBankName: {
              type: 'string',
            },
            transactionDate: {
              type: 'string',
            },
          },
        },
        AccountBalance: {
          type: 'object',
          properties: {
            availableBalance: {
              type: 'number',
            },
            ledgerBalance: {
              type: 'number',
            },
            currency: {
              type: 'string',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Operation successful',
            },
            data: {
              type: 'object',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
