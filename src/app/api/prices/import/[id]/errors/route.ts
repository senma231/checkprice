import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";

// 获取导入错误记录
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // 检查权限
    if (!session) {
      return NextResponse.json(
        { success: false, message: "未授权访问" },
        { status: 401 }
      );
    }
    
    const importId = parseInt(params.id);
    
    // 检查导入记录是否存在
    const importRecord = await prisma.priceImportRecord.findUnique({
      where: { id: importId }
    });
    
    if (!importRecord) {
      return NextResponse.json(
        { success: false, message: "导入记录不存在" },
        { status: 404 }
      );
    }
    
    // 获取导入错误记录
    const errors = await prisma.priceImportError.findMany({
      where: { importId },
      orderBy: {
        rowNumber: "asc"
      }
    });
    
    return NextResponse.json({
      success: true,
      data: errors
    });
  } catch (error) {
    console.error("获取导入错误记录错误:", error);
    return NextResponse.json(
      { success: false, message: "获取导入错误记录失败" },
      { status: 500 }
    );
  }
}
