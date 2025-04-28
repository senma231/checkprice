import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

// 获取价格历史记录
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
    
    const id = parseInt(params.id);
    
    // 获取价格历史记录
    const history = await prisma.priceHistory.findMany({
      where: { priceId: id },
      include: {
        operator: {
          select: {
            id: true,
            username: true,
            realName: true,
          }
        },
        originRegion: true,
        destinationRegion: true,
      },
      orderBy: {
        operatedAt: "desc"
      }
    });
    
    return NextResponse.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error("获取价格历史记录错误:", error);
    return NextResponse.json(
      { success: false, message: "获取价格历史记录失败" },
      { status: 500 }
    );
  }
}
