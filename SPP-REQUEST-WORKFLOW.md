# SPP Request - Workflow Documentation

## Table of Contents
- [Overview](#overview)
- [User Roles](#user-roles)
- [Excel Import Format](#excel-import-format)
- [Complete Workflow](#complete-workflow)
  - [1. Creation Phase](#1-creation-phase)
  - [2. Approval Phase](#2-approval-phase)
  - [3. Fulfillment Phase](#3-fulfillment-phase)
  - [4. Inventory Integration](#4-inventory-integration)
- [Status Flow](#status-flow)
- [Approval Flow](#approval-flow)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Frontend Pages](#frontend-pages)

---

## Overview

**SPP (Surat Permintaan Barang / Material Request)** is a system for managing material and tool requests from workshop to site. The workflow covers request creation, multi-level approval, fulfillment tracking, and automatic inventory management.

**Key Features:**
- Manual creation or Excel import
- Draft/Pending workflow with validation
- Two-tier approval process (Workshop → Material Site)
- Real-time fulfillment tracking
- Automatic inventory creation upon final approval
- Role-based access control

---

## User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **workshop** | Workshop user who creates and manages requests | Create, edit, delete drafts, update received quantities, confirm & send |
| **material_site** | Site material manager who approves incoming requests | Approve/reject requests, view inventory, manage site materials |

---

## Excel Import Format

When importing via Excel, the file must follow this column structure:

| Column | Description | Required | Example |
|--------|-------------|----------|---------|
| **No** | Row number | Auto | 1, 2, 3 |
| **List Item** | Item code or identifier | Yes | `TOOL-001` |
| **Deskripsi Item** | Item description | Yes | `Safety Helmet` |
| **Unit** | Unit of measurement | Yes | `pcs`, `box`, `set` |
| **Request_Qty** | Quantity requested | Yes | `10`, `5.5` |
| **Request_Status** | Fulfillment status | Auto | `PENDING`, `PARTIAL`, `FULFILLED` |
| **Receive_Qty** | Quantity received | Auto | `0`, `5` |
| **Remaining_Qty** | Remaining quantity | Auto | `10`, `5` |
| **Date_Req** | Required date | Yes | `2026-04-13` |

**Supported Formats:** `.xlsx`, `.xls` (max 5MB)

---

## Complete Workflow

### 1. Creation Phase

#### Option A: Manual Creation
1. Navigate to `/spp-request/new`
2. Fill in request information:
   - **Request Date** (required)
   - **Requested By** (required)
   - **Notes** (optional)
3. Add items with details:
   - List Item, Description, Unit, Request Qty, Date Required
4. Choose action:
   - **Save Draft** → Status: `DRAFT`
   - **Submit Request** → Status: `PENDING`

#### Option B: Excel Import
1. Navigate to `/spp-request` list page
2. Click **"Import Excel"** button
3. **Step 1: Upload**
   - Download template (optional)
   - Drag & drop or browse Excel file
   - Click **"Preview Data"**
4. **Step 2: Preview & Edit**
   - Fill import settings:
     - Request Date (required, defaults to today)
     - Requested By (required)
     - Notes (optional)
   - Review and edit items in table
   - Add/remove rows as needed
   - Click **"Confirm Import"**
5. **Step 3: Result**
   - View import summary:
     - Total rows processed
     - Successfully imported count
     - Failed count with error details
   - SPP is created with status: `DRAFT`
   - System initializes approval records

#### Post-Creation
After creation (manual or import), the system:
- Generates unique SPP number (format: `SPP-10000001`, `SPP-10000002`, ...)
- Creates approval records for both roles:
  - `workshop` approval (PENDING)
  - `material_site` approval (PENDING)
- Sets initial status: `DRAFT`

---

### 2. Approval Phase

#### Step 1: Workshop Approval
**Who:** Workshop user  
**Where:** `/spp-request/{id}` detail page → Approval Section

1. Workshop user reviews the SPP request
2. Optionally updates received quantities for items
3. Can choose to:
   - **Confirm & Send to Site** → Status transitions to next stage
   - **Reject** → Must provide rejection reason

**Actions Available:**
- Update receive quantities per item
- Add approval notes
- Confirm & Send (Approve)
- Reject with reason

#### Step 2: Material Site Approval
**Who:** Material Site user  
**Where:** `/spp-request/{id}` detail page → Approval Section

1. Material site user reviews the request
2. Can choose to:
   - **Approve** → Creates inventory records, updates status to `RECEIVED`
   - **Reject** → Must provide rejection reason

**Actions Available:**
- Add approval notes
- Approve (creates inventory)
- Reject with reason

#### Approval Status Flow
```
PENDING → APPROVED (creates inventory)
PENDING → REJECTED (ends workflow)
```

---

### 3. Fulfillment Phase

#### Status Progression
The SPP request goes through these statuses:

| Status | Description | Trigger |
|--------|-------------|---------|
| **DRAFT** | Initial state, editable | Created manually or via import |
| **PENDING** | Awaiting approval | Submitted by workshop |
| **APPROVED** | Approved by workshop | Workshop user approves |
| **IN_TRANSIT** | Items being sent | Workshop updates status |
| **RECEIVED** | Items received at site | Material site approves |
| **COMPLETED** | All items fulfilled | System auto-sets when 100% complete |
| **CANCELLED** | Request cancelled | Manual action |

#### Valid Status Transitions
```
DRAFT → PENDING, CANCELLED
PENDING → APPROVED, IN_TRANSIT, CANCELLED
APPROVED → IN_TRANSIT, CANCELLED
IN_TRANSIT → RECEIVED, CANCELLED
RECEIVED → COMPLETED
COMPLETED → (terminal)
CANCELLED → (terminal)
```

#### Item-Level Status
Each item within an SPP has its own fulfillment status:

| Status | Condition |
|--------|-----------|
| **PENDING** | `receive_qty = 0` |
| **PARTIAL** | `0 < receive_qty < request_qty` |
| **FULFILLED** | `receive_qty >= request_qty` |

#### Fulfillment Calculation
- **Total Requested:** Sum of all `request_qty`
- **Total Received:** Sum of all `receive_qty`
- **Fulfillment %:** `(total_received / total_requested) × 100`
- **Remaining:** `total_requested - total_received`

---

### 4. Inventory Integration

#### Automatic Inventory Creation
When **material_site** approves an SPP request:

1. System checks all items with `receive_qty > 0`
2. For each item, determines type:
   - **TOOL:** If material type contains "tool", "equipment", or "durable"
   - **MATERIAL:** Default (consumable items)
3. Creates inventory record with:
   - `spp_item_id` - Link to original SPP item
   - `material_id` - Material reference (if exists)
   - `item_type` - TOOL or MATERIAL
   - `quantity` - From `receive_qty`
   - `received_from_spp` - SPP number for traceability
4. Updates SPP status to `RECEIVED`
5. Updates all items' `item_status` to `RECEIVED`

#### Inventory Schema
```
inventory (
  id,
  spp_item_id,        -- Links to spp_items
  material_id,        -- Links to materials (nullable)
  item_type,          -- 'TOOL' or 'MATERIAL'
  quantity,           -- Received quantity
  condition_status,   -- 'GOOD', 'DAMAGED', 'CONSUMED'
  location_id,        -- Storage location (nullable)
  received_from_spp,  -- SPP number for traceability
  received_at,
  created_at
)
```

#### Inventory Tabs
The Inventory page (`/inventory`) has two tabs:
- **Tools:** Durable equipment items (`item_type = 'TOOL'`)
- **Materials:** Consumable items (`item_type = 'MATERIAL'`)

---

## Status Flow

### Complete State Machine
```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
┌───────┐    ┌──────────┐    ┌──────────┐    ┌────────────┐    ┌──────────┐    ┌───────────┐
│ DRAFT │───>│ PENDING  │───>│ APPROVED │───>│ IN_TRANSIT │───>│ RECEIVED │───>│ COMPLETED │
└───────┘    └──────────┘    └──────────┘    └────────────┘    └──────────┘    └───────────┘
     │              │              │              │                │
     │              │              │              │                │
     ▼              ▼              ▼              ▼                ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   ┌───────────┐
│ CANCELLED │  │ CANCELLED │  │ CANCELLED │  │ CANCELLED │   │ CANCELLED │
└───────────┘  └───────────┘  └───────────┘  └───────────┘   └───────────┘
```

---

## Approval Flow

### Multi-Tier Approval Process

```
┌──────────────────────────────────────────────────────────────┐
│                      SPP Request Created                     │
│                        Status: DRAFT                         │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│           Tier 1: Workshop Review                            │
│  - Review request details                                    │
│  - Update received quantities (if applicable)               │
│  - Add notes                                                 │
│  - Action: Confirm & Send OR Reject                         │
└──────────────────────┬───────────────────────────────────────┘
                       │ (Approved)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│           Tier 2: Material Site Approval                     │
│  - Review request from workshop                             │
│  - Verify items and quantities                              │
│  - Add notes                                                 │
│  - Action: Approve OR Reject                                │
└──────────────────────┬───────────────────────────────────────┘
                       │ (Approved)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│           Automatic Actions:                                 │
│  1. Create inventory records                                 │
│  2. Update SPP status to RECEIVED                           │
│  3. Update all items status to RECEIVED                     │
│  4. Items appear in Inventory page                          │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                    Fulfillment Complete                      │
│              (Manual tracking continues)                     │
└──────────────────────────────────────────────────────────────┘
```

### Approval Database Schema
```
spp_approvals (
  id,
  spp_id,              -- Links to spp_requests
  approved_by,         -- User ID (nullable until approved)
  approval_role,       -- 'workshop' or 'material_site'
  approval_status,     -- 'PENDING', 'APPROVED', 'REJECTED'
  approval_notes,      -- Optional notes
  approved_at,
  created_at
)
```

---

## Database Schema

### Core Tables

#### `spp_requests`
```sql
CREATE TABLE spp_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  spp_number VARCHAR(50) UNIQUE NOT NULL,
  request_date DATE NOT NULL,
  requested_by VARCHAR(255) NOT NULL,
  status ENUM('DRAFT', 'PENDING', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'CANCELLED'),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### `spp_items`
```sql
CREATE TABLE spp_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  spp_id INT NOT NULL,
  material_id INT,
  list_item_number INT NOT NULL,
  list_item VARCHAR(255),
  description TEXT NOT NULL,
  unit VARCHAR(50) NOT NULL,
  request_qty DECIMAL(10,2) NOT NULL,
  receive_qty DECIMAL(10,2) DEFAULT 0,
  remaining_qty DECIMAL(10,2) GENERATED ALWAYS AS (request_qty - receive_qty) STORED,
  request_status ENUM('PENDING', 'PARTIAL', 'FULFILLED') DEFAULT 'PENDING',
  date_req DATE NOT NULL,
  item_status ENUM('PENDING', 'APPROVED', 'IN_TRANSIT', 'RECEIVED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (spp_id) REFERENCES spp_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
);
```

#### `spp_approvals`
```sql
CREATE TABLE spp_approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  spp_id INT NOT NULL,
  approved_by INT,
  approval_role ENUM('workshop', 'material_site') NOT NULL,
  approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  approval_notes TEXT,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (spp_id) REFERENCES spp_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);
```

---

## API Endpoints

### SPP Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/spp-requests` | Get all SPP requests (with pagination, filters) |
| GET | `/api/spp-requests/:id` | Get SPP request by ID with items and approvals |
| POST | `/api/spp-requests` | Create new SPP request |
| PUT | `/api/spp-requests/:id` | Update SPP request |
| DELETE | `/api/spp-requests/:id` | Delete SPP request |
| POST | `/api/spp-requests/:id/approve` | Approve/reject SPP request |
| POST | `/api/spp-requests/:id/import` | Import SPP from Excel |
| POST | `/api/spp-requests/:id/import/preview` | Preview Excel before import |
| GET | `/api/spp-requests/template/download` | Download Excel template |
| POST | `/api/spp-requests/:id/items` | Add item to SPP request |
| PUT | `/api/spp-requests/:id/items/:itemId` | Update SPP item |
| PUT | `/api/spp-requests/:id/items/:itemId/receive` | Update receive quantity |
| GET | `/api/spp-requests/:id/fulfillment` | Get fulfillment status |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | Get all inventory items |
| GET | `/api/inventory/stats` | Get inventory statistics |
| GET | `/api/inventory/tools` | Get tools only |
| GET | `/api/inventory/materials` | Get materials only |
| GET | `/api/inventory/:id` | Get inventory item by ID |
| POST | `/api/inventory` | Create inventory item |
| PUT | `/api/inventory/:id` | Update inventory item |
| DELETE | `/api/inventory/:id` | Delete inventory item |

---

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/spp-request` | `SPPRequestList` | List view with search, filters, pagination |
| `/spp-request/new` | `NewSPPRequest` | Create new SPP (manual entry) |
| `/spp-request/:id` | `SPPDetail` | Detail view with items, approvals, and actions |
| `/spp-request/:id/edit` | `EditSPPRequest` | Edit draft (only when status = DRAFT) |
| `/inventory` | Inventory Page | View inventory (Tools & Materials tabs) |

### Key Components
- `SPPImportModal` - Excel import wizard (3-step process)
- `SPPItemsForm` - Dynamic form for adding/editing items
- `SPPStatusBadge` - Status indicator with color coding
- `SPPApprovalTimeline` - Visual approval history timeline
- `SPPApprovalSection` - Role-based approval action panel

---

## Quick Reference

### Common Operations

#### Create SPP Request
```typescript
POST /api/spp-requests
{
  "request_date": "2026-04-13",
  "requested_by": "John Doe",
  "notes": "Urgent requirement",
  "status": "DRAFT", // or "PENDING"
  "items": [
    {
      "list_item": "TOOL-001",
      "description": "Safety Helmet",
      "unit": "pcs",
      "request_qty": 10,
      "date_req": "2026-04-13"
    }
  ]
}
```

#### Approve SPP
```typescript
POST /api/spp-requests/:id/approve
{
  "approval_role": "material_site", // or "workshop"
  "approval_status": "APPROVED",    // or "REJECTED"
  "approval_notes": "Approved for delivery"
}
```

#### Update Receive Quantity
```typescript
PUT /api/spp-requests/:id/items/:itemId
{
  "receive_qty": 5,
  "item_status": "IN_TRANSIT"
}
```

### Error Handling
- **Invalid status transition:** Returns 400 with allowed transitions
- **Missing required fields:** Returns 400 with field-specific errors
- **Import errors:** Returns partial success with error details per row

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Import fails | Invalid Excel format | Download and use the official template |
| Approval not showing | Approvals not initialized | System auto-initializes on creation |
| Inventory not created | No items with receive_qty > 0 | Update receive quantities before final approval |
| Cannot edit SPP | Status is not DRAFT | Only DRAFT status allows editing |

---

**Last Updated:** April 13, 2026  
**Version:** 1.0.0
