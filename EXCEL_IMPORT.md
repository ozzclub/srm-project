# Excel Import Feature for Materials

## Overview
This feature allows users to bulk import materials using Excel files (.xlsx/.xls) through the `/material` page.

---

## 📊 Excel File Structure

### Column Order & Requirements

| Column A | Column B | Column C | Column D | Column E | Column F | Column G |
|----------|----------|----------|----------|----------|----------|----------|
| **Material Code** | **Description** | **Material Type** | **Remarks** | **Unit** | **Unit Price** | **WHSE** |
| Optional | **Required** | Optional | Optional | Optional | Optional | Optional |

### Column Details

1. **Material Code** (Column A)
   - **Required:** No
   - **Format:** Text
   - **Auto-generation:** If left empty, system generates code in format `MTC-XXXXXXXX`
   - **Example:** `MTC-12345678`

2. **Description** (Column B)
   - **Required:** Yes ⚠️ (ONLY required field)
   - **Format:** Text
   - **Max Length:** 255 characters
   - **Example:** `Steel Pipe 2 inch`

3. **Material Type** (Column C)
   - **Required:** No
   - **Format:** Text (Type Name)
   - **Auto-create:** If type doesn't exist, it will be created automatically
   - **Example:** `Raw Material`, `Spare Part`, `Tool`

4. **Remarks** (Column D)
   - **Required:** No
   - **Format:** Text (Multi-line supported)
   - **Example:** `For production line A only`

5. **Unit** (Column E)
   - **Required:** No
   - **Format:** Text
   - **Max Length:** 20 characters
   - **Default:** `pcs` if empty
   - **Example:** `pcs`, `kg`, `m`, `liter`, `box`

6. **Unit Price** (Column F)
   - **Required:** No
   - **Format:** Number (Decimal)
   - **Default:** 0.00 if empty
   - **Example:** `150.50`, `1000`

7. **WHSE** (Column G)
   - **Required:** No
   - **Format:** Text (Warehouse Code)
   - **Max Length:** 50 characters
   - **Example:** `WH-01`, `MAIN-WH`

---

## 📝 Example Excel Data

| Material Code | Description | Material Type | Remarks | Unit | Unit Price | WHSE |
|--------------|-------------|---------------|---------|------|------------|------|
| | Steel Pipe 2 inch | Raw Material | For production | pcs | 150.50 | WH-01 |
| MTC-CUSTOM01 | Welding Wire | Consumable | | kg | 85.00 | |
| | Safety Helmet | PPE | Required for site | pcs | 25000 | MAIN-WH |

---

## 🚀 How to Use

### Step-by-Step Guide

1. **Navigate to Material Page**
   - Go to `/material` in the application
   - Ensure you're on the "Materials" tab (not "Types")

2. **Download Template (Recommended)**
   - Click the **"Import Excel"** button (green button)
   - Click **"Download Excel Template"** in the modal
   - This gives you a pre-formatted file with correct headers

3. **Prepare Your Excel File**
   - Open the template or create your own Excel file
   - Ensure headers match exactly (case-insensitive)
   - Fill in your data rows
   - **Important:** Description and Unit columns must have values

4. **Upload File**
   - Drag & drop your Excel file into the drop zone, OR
   - Click the zone to browse and select your file
   - File must be .xlsx or .xls format
   - Maximum file size: 5MB

5. **Import**
   - Click **"Import Materials"** button
   - Wait for processing (usually takes a few seconds)
   - View import results showing success/failure per row

6. **Review Results**
   - **Success:** All rows imported successfully
   - **Partial/Full Failure:** Review error messages per row
   - Click **"Done"** to close (if successful) or **"Import Another File"** to retry

---

## ⚙️ Technical Implementation

### Backend Components

#### 1. Import Service
**File:** `backend/src/modules/material/material.import.service.ts`

**Key Functions:**
- `parseExcelFile(buffer)`: Parses Excel file and validates structure
- `getOrCreateMaterialType(typeName)`: Matches or creates material types
- `importMaterials(rows)`: Bulk import with transaction support

**Features:**
- ✅ Transaction-based (all-or-nothing import)
- ✅ Row-level validation
- ✅ Auto-generates missing material codes
- ✅ Auto-creates missing material types
- ✅ Detailed error reporting

#### 2. Controller Handler
**File:** `backend/src/modules/material/material.controller.ts`

**Methods:**
- `importMaterials()`: Handles file upload and import
- `downloadTemplate()`: Generates and sends template Excel file

#### 3. Routes
**File:** `backend/src/modules/material/material.routes.ts`

**Endpoints:**
```
POST   /api/material/import    - Import Excel file (Admin only)
GET    /api/material/template  - Download template file (Public)
```

**Upload Configuration:**
- Storage: Memory storage (for parsing without saving to disk)
- Max file size: 5MB
- Allowed types: .xlsx, .xls
- Field name: `file`

### Frontend Components

#### 1. ImportModal Component
**File:** `frontend/src/components/ImportModal.tsx`

**Features:**
- Drag & drop file upload
- File type validation
- File size validation
- Import result display with row-level details
- Template download button
- Error handling and display

#### 2. Material Page Integration
**File:** `frontend/src/app/material/page.tsx`

**Changes:**
- Added "Import Excel" button (green, with FileSpreadsheet icon)
- Integrated ImportModal component
- Auto-refresh material list after successful import

#### 3. API Client
**File:** `frontend/src/lib/api.ts`

**New Methods:**
```typescript
materialApi.import(formData: FormData)     // POST /material/import
materialApi.downloadTemplate()             // GET /material/template
```

---

## 🔒 Security & Permissions

- **Authentication:** Required (JWT token)
- **Authorization:** Admin role only for import
- **File Validation:** Type, size, and content validation
- **SQL Injection Protection:** Parameterized queries
- **Transaction Safety:** Rollback on any failure

---

## ⚠️ Important Notes

### Validation Rules
1. **Required Fields:** Only Description must not be empty
2. **Unit Default:** Defaults to 'pcs' if empty
3. **Unique Material Code:** If provided, must be unique (auto-generated if empty)
4. **All-or-Nothing:** If ANY row fails, the entire import is rolled back
5. **Empty Rows:** Automatically skipped
6. **Duplicate Types:** Matched by name (case-insensitive)

### Duplicate Handling

The system performs **strict duplicate detection** before import:

#### 1. Duplicate Material Codes Within Excel File

**Scenario:** You have the same material code multiple times in your Excel file

**Example:**
| Row | Material Code | Description |
|-----|---------------|-------------|
| 3   | MTC-00001     | Steel Pipe  |
| 7   | MTC-00001     | Copper Wire |

**Result:** ❌ Import rejected with error:
```
Duplicate material codes found in Excel file: 
Material code 'MTC-00001' appears in rows: 3, 7. 
Please ensure each material code is unique within the file, or leave empty for auto-generation.
```

**How to Fix:**
- **Option A:** Remove duplicate codes (leave empty for auto-generation)
- **Option B:** Change one of the codes to make them unique
- **Recommendation:** Leave Material Code column empty unless you have specific codes to maintain

#### 2. Duplicate Material Codes with Database

**Scenario:** You're importing a material code that already exists in the database

**Example:**
- Database has: `MTC-12345678` (Steel Pipe)
- Your Excel has: `MTC-12345678` (Different material)

**Result:** ❌ Import rejected with error:
```
Material codes already exist in database: MTC-12345678. 
Please use different codes or leave empty for auto-generation.
```

**How to Fix:**
- **Option A:** Leave Material Code empty → system will auto-generate unique code
- **Option B:** Use a different code that doesn't exist in database
- **Option C:** Check existing materials first (download current materials list)

#### 3. Duplicate Descriptions (Allowed)

**Scenario:** Multiple materials with the same description

**Example:**
| Description    | Unit | Unit Price |
|----------------|------|------------|
| Steel Pipe 2"  | pcs  | 150.00     |
| Steel Pipe 2"  | kg   | 85.00      |

**Result:** ✅ **Allowed** - Import succeeds

**Reason:** Descriptions can legitimately be the same if they differ in other fields (unit, price, type, etc.)

#### 4. Duplicate Unit Prices (Allowed)

**Scenario:** Multiple materials with the same unit price

**Result:** ✅ **Allowed** - No validation needed

**Reason:** Many materials can have the same price

### Limitations
- Maximum file size: 5MB
- No update/merge mode (import creates new records only)
- Material codes, if provided, must not already exist in database
- First row MUST be header row
- Only the first sheet is processed

### Error Handling
- **File Errors:** Invalid format, too large, wrong type
- **Parse Errors:** Missing required columns, empty file
- **Data Errors:** Missing required fields, duplicate codes
- **Database Errors:** Connection issues, constraint violations

---

## 🧪 Testing

### Manual Testing Steps

1. **Download Template Test**
   ```
   - Click "Import Excel" → Download template
   - Verify file downloads with correct name
   - Open and verify headers are present
   ```

2. **Valid Import Test**
   ```
   - Fill template with 5-10 valid materials
   - Upload and verify all import successfully
   - Check material list shows new items
   ```

3. **Error Handling Test**
   ```
   - Create file with missing Description in row 3
   - Upload and verify import fails
   - Verify error message shows row 3 failed
   - Verify no materials were added (rollback)
   ```

4. **Auto-Create Type Test**
   ```
   - Use a new material type name (e.g., "Test Type 123")
   - Import and verify material type was created
   - Check material_types table for new entry
   ```

5. **Code Generation Test**
   ```
   - Leave Material Code column empty
   - Import and verify codes were auto-generated
   - Verify format: MTC-XXXXXXXX (8 digits)
   ```

---

## 📦 Dependencies

### Backend
```json
{
  "xlsx": "^0.18.5"  // SheetJS for Excel parsing
}
```

### Frontend
- No new dependencies (uses existing React, Tailwind, Lucide icons)

---

## 🔄 Future Enhancements

Potential improvements for future versions:

1. **Update/Merge Mode:** Match existing materials by code and update
2. **Partial Import:** Allow successful rows even if some fail
3. **Progress Indicator:** Show import progress for large files
4. **File Preview:** Show parsed data before confirming import
5. **Export Functionality:** Download current materials as Excel
6. **Batch Size Limit:** Warn if importing >1000 rows
7. **Async Processing:** Queue large imports for background processing
8. **Import History:** Log past imports with user and timestamp

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** "Only Excel files (.xlsx, .xls) are allowed"
- **Solution:** Ensure file extension is .xlsx or .xls, not .csv

**Issue:** "No valid data rows found"
- **Solution:** Check that you have data rows beyond the header row

**Issue:** "Duplicate material codes found in Excel file"
- **Solution:** Remove duplicate codes or leave Material Code column empty for auto-generation

**Issue:** "Material codes already exist in database"
- **Solution:** Use different codes or leave Material Code empty for auto-generation

**Issue:** Import succeeds but materials don't appear
- **Solution:** Refresh the page or check if you're on correct tab

**Issue:** File too large error
- **Solution:** Split into smaller files or remove unnecessary formatting

---

## 📞 Support

For issues or questions about this feature, please contact the development team with:
- Error message displayed
- Excel file used (if possible)
- Number of rows attempted
- Browser and system information
