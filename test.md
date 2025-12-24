# Employee Model – Data Access and Employee Lifecycle Management

This module implements the **EmployeeModel**, which serves as the data-access layer for employee records in a payroll system using **Node.js + TypeScript + PostgreSQL**. It defines the employee data structure, enforces consistent employee identification, and provides methods for creating, reading, updating, and soft-deleting employees. By encapsulating all database operations behind a model interface, the rest of the application (controllers, payroll processors, queues) can interact with employees in a clean, consistent, and testable way.

## Employee Data Structure (`Employee` Interface)

The `Employee` interface represents a row in the `employees` database table and captures both operational and audit fields. It includes identifying fields (`id`, `employee_id`), personal fields (`name`, `email`), payroll fields (`salary`), banking details (`account_number`, `bank_code`, `bank_name`), operational state (`is_active`), and timestamps (`created_at`, `updated_at`). The `is_active` flag is used to support soft deletion and employee deactivation without permanently removing historical payroll relationships.

## Employee Creation Input (`CreateEmployeeInput`)

The `CreateEmployeeInput` interface defines the expected payload for creating an employee. It includes required fields such as name, email, salary, and bank details. The `employee_id` field is optional, allowing the system to auto-generate a unique identifier if one is not provided. This flexibility supports both automated workflows and manual HR data imports.

## Auto-Generating Employee IDs (`generateEmployeeId`)

The private `generateEmployeeId` method generates a unique employee identifier in a readable sequential format such as `EMP001`, `EMP002`, and so on. It queries the database for the highest existing employee ID that matches the expected pattern (`EMP` prefix followed by numeric digits), orders by the numeric suffix in descending order, and increments the latest number to produce the next ID. If no matching record exists, it starts from `EMP001`. The method also protects against malformed data by returning `EMP001` if parsing fails. Finally, it ensures formatting consistency by padding the number portion to at least three digits using `padStart(3, '0')`, which keeps IDs aligned and easy to sort visually.

## Creating an Employee (`create`)

The `create` method inserts a new employee record into the database. If the caller does not supply an `employee_id`, the method generates one automatically using `generateEmployeeId`. If an `employee_id` is manually provided, it validates uniqueness by checking if that ID already exists among active employees, preventing collisions and ensuring each employee has a distinct identifier. After validations, the employee is inserted into the `employees` table and the new record is returned. This method ensures every employee created has complete banking details required for payroll disbursement.

## Retrieving All Employees (`findAll`)

The `findAll` method returns all active employees (`is_active = true`) ordered by most recent creation date. This behavior supports common UI patterns such as HR dashboards and payroll selection screens, where only active employees should be visible by default.

## Retrieving an Employee by Database ID (`findById`)

The `findById` method retrieves a single employee by the internal numeric primary key (`id`). If the employee does not exist, it returns `null`. This is typically used for internal operations such as payroll processing, updates, or admin detail views.

## Retrieving an Employee by Employee Identifier (`findByEmployeeId`)

The `findByEmployeeId` method retrieves an active employee using the business-friendly `employee_id` (e.g., `EMP014`). Because it filters by `is_active = true`, it prevents accidentally selecting deactivated employees during operations like payroll runs or HR searches.

## Updating an Employee (`update`)

The `update` method supports partial updates by dynamically building the SQL `SET` clause based on the fields present in the update payload. It iterates through the provided properties, includes only those with defined values, and constructs a parameterized query to prevent SQL injection and preserve correctness. If no fields are provided, it throws an error to avoid performing a meaningless update. It also explicitly updates the `updated_at` timestamp to ensure accurate audit tracking. Finally, it returns the updated database record, making it easy for controllers to respond with the latest employee state.

## Soft-Deleting an Employee (`delete`)

Rather than permanently removing the employee record, the `delete` method performs a soft delete by setting `is_active = false` and updating the `updated_at` timestamp. This approach preserves historical payroll references and audit trails while excluding inactive employees from standard queries like `findAll`. It is especially important in payroll systems where historical payment records must remain valid and traceable even after an employee leaves the organization.

## Role in the Payroll System

The `EmployeeModel` is foundational to payroll operations because payroll items depend on employee salary and banking details for disbursement. By centralizing employee persistence logic—especially the generation of consistent identifiers and safe soft deletion—the model supports clean system boundaries, reliable payroll runs, and strong auditability across the employee lifecycle.
