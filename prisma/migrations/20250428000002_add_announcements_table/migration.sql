-- CreateTable
CREATE TABLE "announcements" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "publishTime" TIMESTAMP(3) NOT NULL,
    "expireTime" TIMESTAMP(3),
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 添加公告管理权限
INSERT INTO "permissions" ("name", "code", "description", "status", "createdAt", "updatedAt")
VALUES 
('公告查看', 'announcement:view', '查看系统公告', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('公告创建', 'announcement:create', '创建系统公告', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('公告编辑', 'announcement:edit', '编辑系统公告', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('公告删除', 'announcement:delete', '删除系统公告', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;
