-- Local-dev helper: clear all rows so the corrected d1-seed.sql can be reapplied.
-- Deferred FK checks let us delete in any order inside the implicit batch.
PRAGMA defer_foreign_keys=true;
DELETE FROM AuditLog;
DELETE FROM CatatanObjek;
DELETE FROM Inspeksi;
DELETE FROM "User";
DELETE FROM Periode;
DELETE FROM ObjekFasilitas;
DELETE FROM Fasilitas;
DELETE FROM KategoriFasilitas;
DELETE FROM Pelabuhan;
DELETE FROM Regional;
