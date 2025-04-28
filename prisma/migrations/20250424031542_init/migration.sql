-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "realName" TEXT,
    "organizationId" INTEGER,
    "status" INTEGER NOT NULL DEFAULT 1,
    "userType" INTEGER NOT NULL,
    "lastLoginTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" INTEGER,
    "level" INTEGER NOT NULL,
    "description" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_service_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "parentId" INTEGER,
    "description" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistics_service_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_services" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "serviceTypeId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "description" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistics_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "value_added_services" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "value_added_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "parentId" INTEGER,
    "level" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prices" (
    "id" SERIAL NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "serviceType" INTEGER NOT NULL,
    "originRegionId" INTEGER,
    "destinationRegionId" INTEGER,
    "weightStart" DECIMAL(10,2),
    "weightEnd" DECIMAL(10,2),
    "volumeStart" DECIMAL(10,2),
    "volumeEnd" DECIMAL(10,2),
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "priceUnit" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "expiryDate" DATE,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "remark" TEXT,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" SERIAL NOT NULL,
    "priceId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "serviceType" INTEGER NOT NULL,
    "originRegionId" INTEGER,
    "destinationRegionId" INTEGER,
    "weightStart" DECIMAL(10,2),
    "weightEnd" DECIMAL(10,2),
    "volumeStart" DECIMAL(10,2),
    "volumeEnd" DECIMAL(10,2),
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "priceUnit" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "expiryDate" DATE,
    "remark" TEXT,
    "operationType" TEXT NOT NULL,
    "operatedBy" INTEGER NOT NULL,
    "operatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_import_records" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "filePath" TEXT NOT NULL,
    "importStatus" INTEGER NOT NULL,
    "totalRecords" INTEGER,
    "successRecords" INTEGER,
    "failedRecords" INTEGER,
    "errorMessage" TEXT,
    "importedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_import_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_import_errors" (
    "id" SERIAL NOT NULL,
    "importId" INTEGER NOT NULL,
    "rowNumber" INTEGER,
    "errorMessage" TEXT NOT NULL,
    "rawData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_import_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configurations" (
    "id" SERIAL NOT NULL,
    "configKey" TEXT NOT NULL,
    "configValue" TEXT NOT NULL,
    "description" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "module" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "requestUrl" TEXT NOT NULL,
    "requestParams" TEXT,
    "ipAddress" TEXT,
    "executionTime" BIGINT,
    "status" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "userType" INTEGER NOT NULL,
    "queryType" TEXT NOT NULL,
    "queryParams" TEXT NOT NULL,
    "resultCount" INTEGER,
    "executionTime" BIGINT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON "user_roles"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "logistics_service_types_code_key" ON "logistics_service_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "logistics_services_code_key" ON "logistics_services"("code");

-- CreateIndex
CREATE UNIQUE INDEX "value_added_services_code_key" ON "value_added_services"("code");

-- CreateIndex
CREATE UNIQUE INDEX "regions_code_key" ON "regions"("code");

-- CreateIndex
CREATE INDEX "prices_serviceId_serviceType_idx" ON "prices"("serviceId", "serviceType");

-- CreateIndex
CREATE INDEX "prices_originRegionId_destinationRegionId_idx" ON "prices"("originRegionId", "destinationRegionId");

-- CreateIndex
CREATE INDEX "prices_effectiveDate_expiryDate_idx" ON "prices"("effectiveDate", "expiryDate");

-- CreateIndex
CREATE INDEX "prices_isCurrent_idx" ON "prices"("isCurrent");

-- CreateIndex
CREATE INDEX "price_history_priceId_idx" ON "price_history"("priceId");

-- CreateIndex
CREATE INDEX "price_history_serviceId_serviceType_idx" ON "price_history"("serviceId", "serviceType");

-- CreateIndex
CREATE INDEX "price_history_operatedAt_idx" ON "price_history"("operatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "configurations_configKey_key" ON "configurations"("configKey");

-- CreateIndex
CREATE INDEX "operation_logs_userId_idx" ON "operation_logs"("userId");

-- CreateIndex
CREATE INDEX "operation_logs_createdAt_idx" ON "operation_logs"("createdAt");

-- CreateIndex
CREATE INDEX "operation_logs_module_idx" ON "operation_logs"("module");

-- CreateIndex
CREATE INDEX "query_logs_userId_idx" ON "query_logs"("userId");

-- CreateIndex
CREATE INDEX "query_logs_createdAt_idx" ON "query_logs"("createdAt");

-- CreateIndex
CREATE INDEX "query_logs_queryType_idx" ON "query_logs"("queryType");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_service_types" ADD CONSTRAINT "logistics_service_types_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "logistics_service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_services" ADD CONSTRAINT "logistics_services_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "logistics_service_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_originRegionId_fkey" FOREIGN KEY ("originRegionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_destinationRegionId_fkey" FOREIGN KEY ("destinationRegionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_operatedBy_fkey" FOREIGN KEY ("operatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_originRegionId_fkey" FOREIGN KEY ("originRegionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_destinationRegionId_fkey" FOREIGN KEY ("destinationRegionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_import_records" ADD CONSTRAINT "price_import_records_importedBy_fkey" FOREIGN KEY ("importedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_import_errors" ADD CONSTRAINT "price_import_errors_importId_fkey" FOREIGN KEY ("importId") REFERENCES "price_import_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
