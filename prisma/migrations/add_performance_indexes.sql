-- Add performance indexes for better query performance
-- This migration adds indexes on frequently queried columns

-- User table indexes
CREATE INDEX IF NOT EXISTS "User_hospitalId_idx" ON "User"("hospitalId");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_isActive_idx" ON "User"("isActive");
CREATE INDEX IF NOT EXISTS "User_role_isActive_idx" ON "User"("role", "isActive");

-- Session table indexes
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");

-- Notification table indexes
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AuditLog table indexes
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_resource_idx" ON "AuditLog"("resource");
CREATE INDEX IF NOT EXISTS "AuditLog_action_resource_idx" ON "AuditLog"("action", "resource");

-- Disease table indexes
CREATE INDEX IF NOT EXISTS "Disease_isActive_idx" ON "Disease"("isActive");
CREATE INDEX IF NOT EXISTS "Disease_deletedAt_idx" ON "Disease"("deletedAt");
CREATE INDEX IF NOT EXISTS "Disease_isActive_deletedAt_idx" ON "Disease"("isActive", "deletedAt");

-- MasterData table indexes
CREATE INDEX IF NOT EXISTS "MasterData_category_idx" ON "MasterData"("category");
CREATE INDEX IF NOT EXISTS "MasterData_category_deletedAt_idx" ON "MasterData"("category", "deletedAt");

-- Patient table indexes
CREATE INDEX IF NOT EXISTS "Patient_deletedAt_idx" ON "Patient"("deletedAt");
CREATE INDEX IF NOT EXISTS "Patient_provinceId_idx" ON "Patient"("provinceId");
CREATE INDEX IF NOT EXISTS "Patient_amphoeId_idx" ON "Patient"("amphoeId");
CREATE INDEX IF NOT EXISTS "Patient_tambonId_idx" ON "Patient"("tambonId");
CREATE INDEX IF NOT EXISTS "Patient_phone_idx" ON "Patient"("phone");

-- CaseReport table indexes
CREATE INDEX IF NOT EXISTS "CaseReport_patientId_idx" ON "CaseReport"("patientId");
CREATE INDEX IF NOT EXISTS "CaseReport_sickProvinceId_idx" ON "CaseReport"("sickProvinceId");
CREATE INDEX IF NOT EXISTS "CaseReport_sickAmphoeId_idx" ON "CaseReport"("sickAmphoeId");
CREATE INDEX IF NOT EXISTS "CaseReport_sickTambonId_idx" ON "CaseReport"("sickTambonId");
CREATE INDEX IF NOT EXISTS "CaseReport_condition_idx" ON "CaseReport"("condition");
CREATE INDEX IF NOT EXISTS "CaseReport_createdAt_idx" ON "CaseReport"("createdAt");
CREATE INDEX IF NOT EXISTS "CaseReport_illnessDate_idx" ON "CaseReport"("illnessDate");
CREATE INDEX IF NOT EXISTS "CaseReport_hospitalId_deletedAt_idx" ON "CaseReport"("hospitalId", "deletedAt");
CREATE INDEX IF NOT EXISTS "CaseReport_diseaseId_illnessDate_deletedAt_idx" ON "CaseReport"("diseaseId", "illnessDate", "deletedAt");
CREATE INDEX IF NOT EXISTS "CaseReport_diseaseId_deletedAt_idx" ON "CaseReport"("diseaseId", "deletedAt");

-- Hospital table indexes
CREATE INDEX IF NOT EXISTS "Hospital_name_idx" ON "Hospital"("name");



