# SPP Dual-Path Delivery Workflow - Implementation Guide

## 📋 Document Purpose

This document provides a complete step-by-step roadmap for implementing the **Dual-Path Delivery Workflow** with **SITE Verification** for SPP Requests.

Use this guide to track progress and implement each phase systematically.

---

## 🎯 Objective

Implement a flexible workflow where:

1. **Workshop** can update delivery → **SITE must verify** → Inventory created
2. **SITE/Material_Site** can directly update received items without Workshop (optional path)
3. **SITE** can reject/adjust specific items (qty kurang, belum dikirim, salah input)
4. Clean audit trail: Workshop said "sent X" → SITE confirmed "received Y"

---

## ✅ Phase 1: Database Migration (COMPLETED ✓)

**Status:** ✅ **DONE** - Completed successfully

### What Was Done:

```sql
-- 1. Updated item_status enum
ALTER TABLE spp_items 
MODIFY COLUMN item_status ENUM('PENDING', 'IN_TRANSIT', 'PENDING_VERIFICATION', 'RECEIVED') DEFAULT 'PENDING';

-- 2. Updated delivery_status enum  
ALTER TABLE spp_items 
MODIFY COLUMN delivery_status ENUM('NOT_SENT', 'SENT', 'VERIFIED', 'REJECTED') DEFAULT 'NOT_SENT';

-- 3. Added verification columns
ALTER TABLE spp_items 
ADD COLUMN verified_by INT NULL,
ADD COLUMN verified_at TIMESTAMP NULL,
ADD COLUMN rejection_reason TEXT,
ADD CONSTRAINT fk_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;
```

### Result:

| Column | Type | Purpose |
|--------|------|---------|
| `item_status` | ENUM | Tracks item lifecycle |
| `delivery_status` | ENUM | Tracks delivery state |
| `verified_by` | INT | Who verified (user ID) |
| `verified_at` | TIMESTAMP | When verified |
| `rejection_reason` | TEXT | Why rejected |

### How to Verify:

```bash
cd /Users/gunzie/GitHub/srm-project/backend
npx ts-node -e "import { pool } from './src/config/database'; pool.query('DESCRIBE spp_items').then(([rows]: any) => console.table(rows));"
```

---

## 🔲 Phase 2: Backend Types Update

**Status:** ⏳ **PENDING**

### File to Update:
`backend/src/types/spp.types.ts`

### What to Add:

#### 1. Update `SPPItem` Interface:

```typescript
export interface SPPItem {
  id: number;
  spp_id: number;
  material_id: number | null;
  list_item_number: number;
  list_item: string;
  description: string;
  unit: string;
  request_qty: number;
  receive_qty: number;
  remaining_qty: number;
  request_status: 'PENDING' | 'PARTIAL' | 'FULFILLED';
  date_req: string;
  
  // UPDATED - Add PENDING_VERIFICATION
  item_status: 'PENDING' | 'IN_TRANSIT' | 'PENDING_VERIFICATION' | 'RECEIVED';
  
  // UPDATED - Add VERIFIED, REJECTED
  delivery_status: 'NOT_SENT' | 'SENT' | 'VERIFIED' | 'REJECTED';
  
  // NEW - Verification fields
  verified_by?: number | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
  
  created_at: string;
  material?: { /* existing */ };
}
```

#### 2. Add New DTOs:

```typescript
// Add at the end of the file, before closing brace

// DTO for SITE verification of Workshop delivery
export interface VerifyDeliveryDTO {
  item_id: number;
  action: 'VERIFY' | 'REJECT' | 'ADJUST';
  actual_qty?: number;          // For ADJUST action
  rejection_reason?: string;    // For REJECT action
  notes?: string;
}

// DTO for SITE direct receive (no Workshop)
export interface DirectReceiveDTO {
  item_id: number;
  receive_qty: number;
  notes?: string;
}
```

### Estimated Time: 10 minutes

---

## 🔲 Phase 3: Backend Service Layer

**Status:** ⏳ **PENDING**

### File to Update:
`backend/src/modules/spp/spp.service.ts`

### What to Add/Update:

#### 1. Update `updateItemDelivery()` Method:

**Current Behavior:**
```typescript
// Workshop updates → Item marked as RECEIVED → Inventory created
```

**New Behavior:**
```typescript
// Workshop updates → Item marked as PENDING_VERIFICATION → NO inventory yet
```

**Changes:**
```typescript
static async updateItemDelivery(
  itemId: number,
  userId: number,
  data: {
    receive_qty?: number;
    delivery_status?: 'NOT_SENT' | 'SENT';
    item_status?: 'PENDING' | 'IN_TRANSIT' | 'PENDING_VERIFICATION';
  }
): Promise<SPPItem | null> {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Get current item
    const [itemRows] = await connection.query(
      'SELECT spp_id, request_qty, receive_qty FROM spp_items WHERE id = ?',
      [itemId]
    ) as [RowDataPacket[], any];

    if (itemRows.length === 0) return null;

    const currentItem = itemRows[0];
    const sppId = currentItem.spp_id;
    const requestQty = parseFloat(currentItem.request_qty);
    const newReceive = data.receive_qty !== undefined ? data.receive_qty : parseFloat(currentItem.receive_qty);

    // Workshop sends items → Mark as PENDING_VERIFICATION (not RECEIVED yet)
    const deliveryStatus = data.delivery_status || (newReceive > 0 ? 'SENT' : 'NOT_SENT');
    const itemStatus = 'PENDING_VERIFICATION'; // Requires SITE verification

    // Update item
    await connection.query(
      'UPDATE spp_items SET receive_qty = ?, delivery_status = ?, item_status = ? WHERE id = ?',
      [newReceive, deliveryStatus, itemStatus, itemId]
    );

    // Update request_status
    let requestStatus = 'PENDING';
    if (newReceive >= requestQty) {
      requestStatus = 'FULFILLED';
    } else if (newReceive > 0) {
      requestStatus = 'PARTIAL';
    }

    await connection.query(
      'UPDATE spp_items SET request_status = ? WHERE id = ?',
      [requestStatus, itemId]
    );

    // NOTE: NO inventory creation yet! Wait for SITE verification.

    // Update SPP overall status
    await this.updateSPPStatusBasedOnFulfillment(connection, sppId);

    await connection.commit();

    const [updatedRows] = await pool.query('SELECT * FROM spp_items WHERE id = ?', [itemId]);
    return updatedRows[0] as SPPItem;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
```

#### 2. Add `verifyDeliveryBySite()` Method:

```typescript
// SITE verifies delivery from Workshop
static async verifyDeliveryBySite(
  itemId: number,
  userId: number,
  data: {
    action: 'VERIFY' | 'REJECT' | 'ADJUST';
    actual_qty?: number;
    rejection_reason?: string;
    notes?: string;
  }
): Promise<SPPItem | null> {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Get current item
    const [itemRows] = await connection.query(
      'SELECT spp_id, request_qty, receive_qty, delivery_status FROM spp_items WHERE id = ?',
      [itemId]
    ) as [RowDataPacket[], any];

    if (itemRows.length === 0) {
      return null;
    }

    const currentItem = itemRows[0];
    const sppId = currentItem.spp_id;
    const requestQty = parseFloat(currentItem.request_qty);
    const currentReceive = parseFloat(currentItem.receive_qty);

    let newReceive = currentReceive;
    let newDeliveryStatus: string;
    let newItemStatus: string;
    let rejectionReason = null;

    if (data.action === 'VERIFY') {
      // SITE confirms what Workshop sent
      newDeliveryStatus = 'VERIFIED';
      newItemStatus = 'RECEIVED';
      // Keep current receive_qty (Workshop's qty)

      // Create inventory
      await this.createInventoryFromSPPItem(connection, itemId, sppId);

    } else if (data.action === 'ADJUST') {
      // SITE adjusts qty (different from Workshop)
      if (data.actual_qty === undefined) {
        throw new Error('actual_qty is required for ADJUST action');
      }
      newReceive = data.actual_qty;
      newDeliveryStatus = 'VERIFIED';
      newItemStatus = 'RECEIVED';

      // Update receive_qty
      await connection.query(
        'UPDATE spp_items SET receive_qty = ? WHERE id = ?',
        [newReceive, itemId]
      );

      // Create inventory with adjusted qty
      await this.createInventoryFromSPPItem(connection, itemId, sppId);

    } else if (data.action === 'REJECT') {
      // SITE rejects - item goes back to Workshop
      if (!data.rejection_reason) {
        throw new Error('rejection_reason is required for REJECT action');
      }
      newReceive = 0;
      newDeliveryStatus = 'REJECTED';
      newItemStatus = 'PENDING';
      rejectionReason = data.rejection_reason;

      // Reset receive_qty
      await connection.query(
        'UPDATE spp_items SET receive_qty = ? WHERE id = ?',
        [0, itemId]
      );
    }

    // Update verification fields
    await connection.query(
      'UPDATE spp_items SET delivery_status = ?, item_status = ?, verified_by = ?, verified_at = NOW(), rejection_reason = ? WHERE id = ?',
      [newDeliveryStatus, newItemStatus, userId, rejectionReason, itemId]
    );

    // Update request_status
    let requestStatus = 'PENDING';
    if (newReceive >= requestQty) {
      requestStatus = 'FULFILLED';
    } else if (newReceive > 0) {
      requestStatus = 'PARTIAL';
    }

    await connection.query(
      'UPDATE spp_items SET request_status = ? WHERE id = ?',
      [requestStatus, itemId]
    );

    // Update SPP overall status
    await this.updateSPPStatusBasedOnFulfillment(connection, sppId);

    await connection.commit();

    // Return updated item
    const [updatedRows] = await pool.query('SELECT * FROM spp_items WHERE id = ?', [itemId]);
    return updatedRows[0] as SPPItem;

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
```

#### 3. Add `directReceiveBySite()` Method:

```typescript
// SITE directly receives items (no Workshop update needed)
static async directReceiveBySite(
  itemId: number,
  userId: number,
  data: {
    receive_qty: number;
    notes?: string;
  }
): Promise<SPPItem | null> {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Get current item
    const [itemRows] = await connection.query(
      'SELECT spp_id, request_qty FROM spp_items WHERE id = ?',
      [itemId]
    ) as [RowDataPacket[], any];

    if (itemRows.length === 0) {
      return null;
    }

    const currentItem = itemRows[0];
    const sppId = currentItem.spp_id;
    const requestQty = parseFloat(currentItem.request_qty);

    // SITE directly receives - no verification needed (SITE is the authority)
    const newReceive = data.receive_qty;

    // Update item - Skip PENDING_VERIFICATION, go straight to RECEIVED
    await connection.query(
      'UPDATE spp_items SET receive_qty = ?, delivery_status = ?, item_status = ?, verified_by = ?, verified_at = NOW() WHERE id = ?',
      [newReceive, 'VERIFIED', 'RECEIVED', userId, itemId]
    );

    // Update request_status
    let requestStatus = 'PENDING';
    if (newReceive >= requestQty) {
      requestStatus = 'FULFILLED';
    } else if (newReceive > 0) {
      requestStatus = 'PARTIAL';
    }

    await connection.query(
      'UPDATE spp_items SET request_status = ? WHERE id = ?',
      [requestStatus, itemId]
    );

    // Create inventory immediately (SITE already confirmed)
    if (newReceive > 0) {
      await this.createInventoryFromSPPItem(connection, itemId, sppId);
    }

    // Update SPP overall status
    await this.updateSPPStatusBasedOnFulfillment(connection, sppId);

    await connection.commit();

    // Return updated item
    const [updatedRows] = await pool.query('SELECT * FROM spp_items WHERE id = ?', [itemId]);
    return updatedRows[0] as SPPItem;

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
```

### Estimated Time: 40 minutes

---

## 🔲 Phase 4: Backend API Endpoints

**Status:** ⏳ **PENDING**

### Files to Update:

1. `backend/src/modules/spp/spp.controller.ts`
2. `backend/src/modules/spp/spp.routes.ts`

### What to Add:

#### 1. New Controller Methods:

**File:** `backend/src/modules/spp/spp.controller.ts`

```typescript
// Import new DTOs
import {
  // ... existing imports
  VerifyDeliveryDTO,
  DirectReceiveDTO,
} from '../../types/spp.types';

// Add new methods to SPPController class

// SITE verify delivery from Workshop
static async verifyDelivery(req: Request, res: Response): Promise<void> {
  try {
    const itemId = parseInt(req.params.itemId);
    const data: VerifyDeliveryDTO = req.body;

    // Validate authentication
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;

    if (isNaN(itemId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid item ID',
      });
      return;
    }

    if (!data.action) {
      res.status(400).json({
        success: false,
        message: 'Missing required field: action',
      });
      return;
    }

    const item = await SPPService.verifyDeliveryBySite(itemId, userId, data);

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'SPP item not found',
      });
      return;
    }

    res.json({
      success: true,
      data: item,
      message: `Delivery ${data.action.toLowerCase()}ed successfully`,
    });
  } catch (error) {
    console.error('Error verifying delivery:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify delivery',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// SITE direct receive (no Workshop)
static async directReceive(req: Request, res: Response): Promise<void> {
  try {
    const itemId = parseInt(req.params.itemId);
    const data: DirectReceiveDTO = req.body;

    // Validate authentication
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const userId = req.user.id;

    if (isNaN(itemId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid item ID',
      });
      return;
    }

    if (data.receive_qty === undefined || data.receive_qty < 0) {
      res.status(400).json({
        success: false,
        message: 'receive_qty must be a positive number',
      });
      return;
    }

    const item = await SPPService.directReceiveBySite(itemId, userId, data);

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'SPP item not found',
      });
      return;
    }

    res.json({
      success: true,
      data: item,
      message: 'Items received and added to inventory successfully',
    });
  } catch (error) {
    console.error('Error in direct receive:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process direct receive',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
```

#### 2. New Routes:

**File:** `backend/src/modules/spp/spp.routes.ts`

```typescript
// Add these routes BEFORE the general dynamic routes (/:id)
// Order matters! More specific routes first.

// SITE verify delivery
router.post('/items/:itemId/verify', SPPController.verifyDelivery);

// SITE direct receive
router.post('/items/:itemId/direct-receive', SPPController.directReceive);
```

**Complete route order should be:**
```typescript
// Static routes
router.get('/', SPPController.getAll);
router.get('/template', SPPController.downloadTemplate);
router.post('/import/preview', ...);
router.post('/import', ...);
router.post('/', SPPController.create);

// Specific dynamic routes
router.get('/:id/fulfillment', SPPController.getFulfillmentStatus);
router.post('/:id/approve', SPPController.approve);
router.post('/:id/site-approve', SPPController.siteApprove);
router.post('/:id/items', SPPController.addItem);
router.put('/items/:itemId', SPPController.updateItem);
router.post('/items/:itemId/receive', SPPController.receiveItem);
router.put('/items/:itemId/delivery', SPPController.updateDelivery);

// NEW ROUTES (add here):
router.post('/items/:itemId/verify', SPPController.verifyDelivery);
router.post('/items/:itemId/direct-receive', SPPController.directReceive);

router.delete('/items/:itemId', SPPController.deleteItem);

// General dynamic routes (must be last)
router.get('/:id', SPPController.getById);
router.put('/:id', SPPController.update);
router.delete('/:id', SPPController.delete);
```

### Estimated Time: 15 minutes

---

## 🔲 Phase 5: Frontend Types Update

**Status:** ⏳ **PENDING**

### File to Update:
`frontend/src/types/spp.types.ts`

### What to Add:

```typescript
// Update SPPItem interface
export interface SPPItem {
  // ... existing fields ...
  
  // UPDATED
  item_status: 'PENDING' | 'IN_TRANSIT' | 'PENDING_VERIFICATION' | 'RECEIVED';
  delivery_status: 'NOT_SENT' | 'SENT' | 'VERIFIED' | 'REJECTED';
  
  // NEW
  verified_by?: number | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
}

// Add new DTOs at the end of file
export interface VerifyDeliveryDTO {
  action: 'VERIFY' | 'REJECT' | 'ADJUST';
  actual_qty?: number;
  rejection_reason?: string;
  notes?: string;
}

export interface DirectReceiveDTO {
  receive_qty: number;
  notes?: string;
}
```

### Estimated Time: 5 minutes

---

## 🔲 Phase 6: Frontend API Client

**Status:** ⏳ **PENDING**

### File to Update:
`frontend/src/lib/api.ts`

### What to Add:

```typescript
export const sppApi = {
  // ... existing methods ...
  
  // NEW: SITE verify delivery from Workshop
  verifyDelivery: (itemId: number, data: any) =>
    api.post(`/spp/items/${itemId}/verify`, data),
  
  // NEW: SITE direct receive
  directReceive: (itemId: number, data: any) =>
    api.post(`/spp/items/${itemId}/direct-receive`, data),
};
```

### Estimated Time: 5 minutes

---

## 🔲 Phase 7: Frontend UI Components

**Status:** ⏳ **PENDING**

### Files to Update:

1. `frontend/src/components/spp/SPPWorkshopDeliverySection.tsx`
2. `frontend/src/components/spp/SPPSiteApprovalSection.tsx`

### What to Change:

#### 7.1 Update `SPPWorkshopDeliverySection` (15 mins)

**Changes:**
- Update button text to indicate pending verification
- Update badge to show "SENT - Pending Verification"
- Add info text about verification requirement

**Example:**
```typescript
<button
  onClick={() => handleUpdateDelivery(item)}
  disabled={isUpdating || deliveryQtys[item.id] <= 0}
  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
>
  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update (Pending Verification)'}
</button>

{item.delivery_status === 'SENT' && (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
    ⏳ Pending Verification
  </span>
)}
```

#### 7.2 Update `SPPSiteApprovalSection` (35 mins)

**Major Changes:**

**Section 1: "Pending Verification" (from Workshop)**
```typescript
{/* Items that Workshop has sent - need verification */}
{spp.items.filter(item => item.delivery_status === 'SENT').length > 0 && (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
    <div className="p-4 border-b bg-yellow-50">
      <h3 className="text-lg font-semibold text-gray-900">
        ⏳ Pending Verification (from Workshop)
      </h3>
      <p className="text-sm text-gray-600 mt-1">
        Workshop has marked these items as sent. Please verify actual receipt.
      </p>
    </div>

    <div className="p-4 space-y-4">
      {spp.items
        .filter(item => item.delivery_status === 'SENT')
        .map((item) => (
          <div key={item.id} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium">{item.list_item}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                Workshop sent: {item.receive_qty} {item.unit}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                defaultValue={item.receive_qty}
                min="0"
                className="w-24 px-3 py-2 border rounded"
                placeholder="Actual qty"
              />
              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                ✅ Verify
              </button>
              <button className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
                🔧 Adjust
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                ❌ Reject
              </button>
            </div>
          </div>
        ))}
    </div>
  </div>
)}
```

**Section 2: "Direct Receive" (No Workshop Update)**
```typescript
{/* Items not yet updated - SITE can directly receive */}
{spp.items.filter(item => item.delivery_status === 'NOT_SENT').length > 0 && (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
    <div className="p-4 border-b bg-green-50">
      <h3 className="text-lg font-semibold text-gray-900">
        📦 Direct Receive (No Workshop Update)
      </h3>
      <p className="text-sm text-gray-600 mt-1">
        These items haven't been updated by Workshop. You can directly confirm receipt.
      </p>
    </div>

    <div className="p-4 space-y-4">
      {spp.items
        .filter(item => item.delivery_status === 'NOT_SENT')
        .map((item) => (
          <div key={item.id} className="p-4 border rounded-lg">
            <div className="mb-3">
              <h4 className="font-medium">{item.list_item}</h4>
              <p className="text-sm text-gray-600">{item.description}</p>
              <p className="text-xs text-gray-500">
                Requested: {item.request_qty} {item.unit}
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max={item.request_qty}
                className="w-24 px-3 py-2 border rounded"
                placeholder="Received qty"
              />
              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                ✅ Direct Receive & Add to Inventory
              </button>
            </div>
          </div>
        ))}
    </div>
  </div>
)}
```

### Estimated Time: 50 minutes total

---

## 🔲 Phase 8: Frontend Detail Page

**Status:** ⏳ **PENDING**

### File to Update:
`frontend/src/app/spp-request/[id]/page.tsx`

### What to Add:

```typescript
// Add new mutations
const verifyMutation = useMutation({
  mutationFn: ({ itemId, data }: { itemId: number; data: any }) =>
    sppApi.verifyDelivery(itemId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['spp-detail', sppId] });
  },
});

const directReceiveMutation = useMutation({
  mutationFn: ({ itemId, data }: { itemId: number; data: any }) =>
    sppApi.directReceive(itemId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['spp-detail', sppId] });
  },
});

const handleVerifyDelivery = async (itemId: number, data: any) => {
  await verifyMutation.mutateAsync({ itemId, data });
};

const handleDirectReceive = async (itemId: number, data: any) => {
  await directReceiveMutation.mutateAsync({ itemId, data });
};

// Pass handlers to components
{userRole === 'site' || userRole === 'material_site' ? (
  <SPPSiteApprovalSection
    spp={spp}
    onSiteApprove={handleSiteApprove}
    onVerifyDelivery={handleVerifyDelivery}
    onDirectReceive={handleDirectReceive}
  />
) : userRole === 'workshop' ? (
  <SPPWorkshopDeliverySection
    spp={spp}
    onUpdateDelivery={handleUpdateDelivery}
  />
) : null}
```

### Estimated Time: 10 minutes

---

## 🔲 Phase 9: Testing

**Status:** ⏳ **PENDING**

### Test Scenarios:

#### Scenario 1: Workshop → SITE Verification ✅
```
1. Workshop updates delivery: 5 pcs
2. Status: PENDING_VERIFICATION
3. SITE verifies: 5 pcs
4. Inventory created ✅
5. Check /inventory page
```

#### Scenario 2: SITE Reject Item ❌
```
1. Workshop updates delivery: 10 pcs
2. SITE rejects: "Item not received"
3. Status back to PENDING, qty reset to 0
4. Rejection reason saved
5. Workshop can update again
```

#### Scenario 3: SITE Adjust Qty 🔧
```
1. Workshop updates delivery: 10 pcs
2. SITE adjusts: Only 8 pcs received
3. Inventory created with 8 pcs
4. Discrepancy tracked
```

#### Scenario 4: SITE Direct Update 📦
```
1. Item not updated by Workshop
2. SITE direct receive: 15 pcs
3. Inventory created immediately
4. Status: VERIFIED, RECEIVED
```

### Estimated Time: 20 minutes

---

## 📊 Summary Table

| Phase | Task | Status | Time | Files |
|-------|------|--------|------|-------|
| 1 | Database Migration | ✅ DONE | 15 min | 1 SQL |
| 2 | Backend Types | ⏳ PENDING | 10 min | 1 file |
| 3 | Backend Service | ⏳ PENDING | 40 min | 1 file |
| 4 | Backend API | ⏳ PENDING | 15 min | 2 files |
| 5 | Frontend Types | ⏳ PENDING | 5 min | 1 file |
| 6 | Frontend API | ⏳ PENDING | 5 min | 1 file |
| 7 | Frontend UI | ⏳ PENDING | 50 min | 2 files |
| 8 | Detail Page | ⏳ PENDING | 10 min | 1 file |
| 9 | Testing | ⏳ PENDING | 20 min | Manual |
| **TOTAL** | | | **~3 hours** | **9 files** |

---

## 🚀 Quick Start Commands

### Run Backend:
```bash
cd /Users/gunzie/GitHub/srm-project/backend
npm run dev
```

### Run Frontend:
```bash
cd /Users/gunzie/GitHub/srm-project/frontend
npm run dev
```

### Build Frontend:
```bash
cd /Users/gunzie/GitHub/srm-project/frontend
npm run build
```

### Check Database:
```bash
cd /Users/gunzie/GitHub/srm-project/backend
npx ts-node -e "import { pool } from './src/config/database'; pool.query('DESCRIBE spp_items').then(([rows]: any) => console.table(rows));"
```

---

## ⚠️ Important Notes

1. **Route Order Matters:** More specific routes must come before general ones
2. **Transaction Safety:** Always use database transactions for multi-step operations
3. **Inventory Creation:** Only create inventory after SITE verification (not on Workshop update)
4. **Audit Trail:** Always set `verified_by` and `verified_at` when SITE confirms
5. **Rejection Handling:** Reset qty to 0 and keep rejection reason for tracking

---

## 📝 Implementation Checklist

Use this to track your progress:

- [ ] Phase 1: Database Migration ✅ **DONE**
- [ ] Phase 2: Backend Types
- [ ] Phase 3: Backend Service Layer
- [ ] Phase 4: Backend API Endpoints
- [ ] Phase 5: Frontend Types
- [ ] Phase 6: Frontend API Client
- [ ] Phase 7: Frontend UI Components
- [ ] Phase 8: Frontend Detail Page
- [ ] Phase 9: Testing
- [ ] Deploy to Production

---

**Document Created:** April 13, 2026  
**Last Updated:** April 13, 2026  
**Version:** 1.0  
**Status:** Phase 1 Complete - Ready for Phase 2
