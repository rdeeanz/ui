-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PETUGAS',
    "regionalId" TEXT,
    "pelabuhanId" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_regionalId_fkey" FOREIGN KEY ("regionalId") REFERENCES "Regional" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_pelabuhanId_fkey" FOREIGN KEY ("pelabuhanId") REFERENCES "Pelabuhan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Regional" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Pelabuhan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "operatorDefault" TEXT,
    "regionalId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pelabuhan_regionalId_fkey" FOREIGN KEY ("regionalId") REFERENCES "Regional" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KategoriFasilitas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Fasilitas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "konstruksi" TEXT,
    "operator" TEXT,
    "pelabuhanId" TEXT NOT NULL,
    "kategoriId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Fasilitas_pelabuhanId_fkey" FOREIGN KEY ("pelabuhanId") REFERENCES "Pelabuhan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Fasilitas_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "KategoriFasilitas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ObjekFasilitas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "satuan" TEXT NOT NULL DEFAULT 'unit',
    "panjang" REAL,
    "lebar" REAL,
    "luas" REAL,
    "jumlah" REAL,
    "fasilitasId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ObjekFasilitas_fasilitasId_fkey" FOREIGN KEY ("fasilitasId") REFERENCES "Fasilitas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Periode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bulan" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Inspeksi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pelabuhanId" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "pembuatId" TEXT,
    "verifikatorId" TEXT,
    "diverifikasiAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Inspeksi_pelabuhanId_fkey" FOREIGN KEY ("pelabuhanId") REFERENCES "Pelabuhan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Inspeksi_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Inspeksi_pembuatId_fkey" FOREIGN KEY ("pembuatId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Inspeksi_verifikatorId_fkey" FOREIGN KEY ("verifikatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CatatanObjek" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspeksiId" TEXT NOT NULL,
    "objekId" TEXT NOT NULL,
    "fasilitasId" TEXT NOT NULL,
    "periodeId" TEXT NOT NULL,
    "tersedia" REAL NOT NULL DEFAULT 0,
    "rusakRingan" REAL NOT NULL DEFAULT 0,
    "rusakSedang" REAL NOT NULL DEFAULT 0,
    "rusakBerat" REAL NOT NULL DEFAULT 0,
    "siapPakai" REAL NOT NULL DEFAULT 0,
    "keterangan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CatatanObjek_inspeksiId_fkey" FOREIGN KEY ("inspeksiId") REFERENCES "Inspeksi" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CatatanObjek_objekId_fkey" FOREIGN KEY ("objekId") REFERENCES "ObjekFasilitas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CatatanObjek_fasilitasId_fkey" FOREIGN KEY ("fasilitasId") REFERENCES "Fasilitas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CatatanObjek_periodeId_fkey" FOREIGN KEY ("periodeId") REFERENCES "Periode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "aksi" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitasId" TEXT,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Regional_kode_key" ON "Regional"("kode");

-- CreateIndex
CREATE INDEX "Pelabuhan_regionalId_idx" ON "Pelabuhan"("regionalId");

-- CreateIndex
CREATE UNIQUE INDEX "Pelabuhan_regionalId_nama_key" ON "Pelabuhan"("regionalId", "nama");

-- CreateIndex
CREATE UNIQUE INDEX "KategoriFasilitas_nama_key" ON "KategoriFasilitas"("nama");

-- CreateIndex
CREATE INDEX "Fasilitas_pelabuhanId_idx" ON "Fasilitas"("pelabuhanId");

-- CreateIndex
CREATE INDEX "Fasilitas_kategoriId_idx" ON "Fasilitas"("kategoriId");

-- CreateIndex
CREATE INDEX "ObjekFasilitas_fasilitasId_idx" ON "ObjekFasilitas"("fasilitasId");

-- CreateIndex
CREATE UNIQUE INDEX "Periode_bulan_tahun_key" ON "Periode"("bulan", "tahun");

-- CreateIndex
CREATE INDEX "Inspeksi_periodeId_idx" ON "Inspeksi"("periodeId");

-- CreateIndex
CREATE UNIQUE INDEX "Inspeksi_pelabuhanId_periodeId_key" ON "Inspeksi"("pelabuhanId", "periodeId");

-- CreateIndex
CREATE INDEX "CatatanObjek_objekId_idx" ON "CatatanObjek"("objekId");

-- CreateIndex
CREATE INDEX "CatatanObjek_periodeId_idx" ON "CatatanObjek"("periodeId");

-- CreateIndex
CREATE INDEX "CatatanObjek_fasilitasId_idx" ON "CatatanObjek"("fasilitasId");

-- CreateIndex
CREATE UNIQUE INDEX "CatatanObjek_inspeksiId_objekId_key" ON "CatatanObjek"("inspeksiId", "objekId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entitas_idx" ON "AuditLog"("entitas");

