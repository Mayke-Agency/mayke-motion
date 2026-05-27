-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "classEnrollmentId" TEXT,
    "classDate" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceRecord_businessId_classDate_idx" ON "AttendanceRecord"("businessId", "classDate");

-- CreateIndex
CREATE INDEX "AttendanceRecord_classId_classDate_idx" ON "AttendanceRecord"("classId", "classDate");

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentProfileId_classDate_idx" ON "AttendanceRecord"("studentProfileId", "classDate");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_businessId_classId_studentProfileId_classD_key" ON "AttendanceRecord"("businessId", "classId", "studentProfileId", "classDate");

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_classId_fkey" FOREIGN KEY ("classId") REFERENCES "StudioClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_classEnrollmentId_fkey" FOREIGN KEY ("classEnrollmentId") REFERENCES "ClassEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
