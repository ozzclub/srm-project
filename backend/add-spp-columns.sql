-- Add missing columns to spp_requests table
ALTER TABLE spp_requests 
ADD COLUMN IF NOT EXISTS created_by_role ENUM('site', 'workshop') DEFAULT 'site' AFTER requested_by;

-- Add delivery_status column to spp_items table
ALTER TABLE spp_items 
ADD COLUMN IF NOT EXISTS delivery_status ENUM('NOT_SENT', 'PARTIAL', 'SENT') DEFAULT 'NOT_SENT' AFTER item_status;

-- Update approval_role enum in spp_approvals to include 'site'
ALTER TABLE spp_approvals 
MODIFY COLUMN approval_role ENUM('site', 'workshop', 'material_site') NOT NULL;

-- Update users role enum to include 'site' (if not already there)
ALTER TABLE users 
MODIFY COLUMN role ENUM('admin', 'staff', 'site', 'workshop', 'material_site') DEFAULT 'staff';

-- Show the updated table structure
DESCRIBE spp_requests;
DESCRIBE spp_items;
DESCRIBE spp_approvals;
