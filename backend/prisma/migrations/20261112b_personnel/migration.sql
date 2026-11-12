-- Personel özlük dosyası
CREATE TABLE IF NOT EXISTS "employees" (
  "id" SERIAL PRIMARY KEY,
  "full_name" TEXT NOT NULL,
  "national_id" TEXT,
  "birth_date" DATE,
  "gender" TEXT,
  "blood_type" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "position" TEXT,
  "department" TEXT,
  "hire_date" DATE NOT NULL,
  "termination_date" DATE,
  "termination_reason" TEXT,
  "sgk_number" TEXT,
  "iban" TEXT,
  "net_salary" DECIMAL(14,2),
  "emergency_name" TEXT,
  "emergency_phone" TEXT,
  "notes" TEXT,
  "photo_path" TEXT,
  "user_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "created_by_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Devamsızlık / izin / erken çıkış / geç gelme kayıtları
CREATE TABLE IF NOT EXISTS "employee_attendance" (
  "id" SERIAL PRIMARY KEY,
  "employee_id" INTEGER NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "time" TEXT,
  "note" TEXT,
  "created_by_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "employee_attendance_employee_idx" ON "employee_attendance"("employee_id", "start_date");

-- Özlük belgeleri (sözleşme, kimlik fotokopisi, diploma, rapor...)
CREATE TABLE IF NOT EXISTS "employee_documents" (
  "id" SERIAL PRIMARY KEY,
  "employee_id" INTEGER NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "original_name" TEXT,
  "mime_type" TEXT,
  "created_by_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "employee_documents_employee_idx" ON "employee_documents"("employee_id");
