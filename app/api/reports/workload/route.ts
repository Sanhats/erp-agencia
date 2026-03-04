import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Allocation from '@/models/Allocation';
import AdminUser from '@/models/AdminUser';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : new Date().getMonth() + 1;

    // Obtener todas las asignaciones del período
    const allocations = await Allocation.find({
      year,
      month,
    })
      .populate('userId', 'name email')
      .populate('contractId', 'name monthlyPrice')
      .populate('clientId', 'name')
      .sort({ userId: 1 });

    // Agrupar por usuario
    const byUser = allocations.reduce((acc: any, alloc) => {
      const userId = (alloc.userId as any)?._id?.toString() || 'unknown';
      const userName = (alloc.userId as any)?.name || 'Sin nombre';

      if (!acc[userId]) {
        acc[userId] = {
          userId,
          userName,
          totalAllocation: 0,
          allocations: [],
        };
      }

      acc[userId].totalAllocation += alloc.percentage;
      acc[userId].allocations.push({
        _id: alloc._id,
        contractId: alloc.contractId,
        clientId: alloc.clientId,
        percentage: alloc.percentage,
        notes: alloc.notes,
      });

      return acc;
    }, {});

    const byUserArray = Object.values(byUser).map((user: any) => ({
      ...user,
      isOverAllocated: user.totalAllocation > 100,
      isUnderAllocated: user.totalAllocation < 100,
      availableCapacity: Math.max(0, 100 - user.totalAllocation),
    }));

    // Agrupar por cliente
    const byClient = allocations.reduce((acc: any, alloc) => {
      if (!alloc.clientId) return acc;

      const clientId = (alloc.clientId as any)?._id?.toString() || 'unknown';
      const clientName = (alloc.clientId as any)?.name || 'Sin nombre';

      if (!acc[clientId]) {
        acc[clientId] = {
          clientId,
          clientName,
          totalAllocation: 0,
          userCount: 0,
          allocations: [],
        };
      }

      acc[clientId].totalAllocation += alloc.percentage;
      acc[clientId].userCount += 1;
      acc[clientId].allocations.push({
        _id: alloc._id,
        userId: alloc.userId,
        percentage: alloc.percentage,
        contractId: alloc.contractId,
      });

      return acc;
    }, {});

    const byClientArray = Object.values(byClient).sort(
      (a: any, b: any) => b.totalAllocation - a.totalAllocation
    );

    // Estadísticas generales
    const totalUsers = byUserArray.length;
    const overAllocatedUsers = byUserArray.filter((u: any) => u.isOverAllocated).length;
    const underAllocatedUsers = byUserArray.filter((u: any) => u.isUnderAllocated).length;
    const fullyAllocatedUsers = byUserArray.filter((u: any) => u.totalAllocation === 100).length;

    const avgAllocation =
      byUserArray.length > 0
        ? byUserArray.reduce((sum: number, u: any) => sum + u.totalAllocation, 0) / byUserArray.length
        : 0;

    return NextResponse.json({
      period: { year, month },
      summary: {
        totalUsers,
        overAllocatedUsers,
        underAllocatedUsers,
        fullyAllocatedUsers,
        avgAllocation: Math.round(avgAllocation * 100) / 100,
        totalAllocations: allocations.length,
      },
      byUser: byUserArray,
      byClient: byClientArray,
      allocations: allocations.map((alloc) => ({
        _id: alloc._id,
        userId: alloc.userId,
        contractId: alloc.contractId,
        clientId: alloc.clientId,
        percentage: alloc.percentage,
        notes: alloc.notes,
      })),
    });
  } catch (error: any) {
    console.error('Error generating workload report:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar reporte de carga de trabajo' },
      { status: 500 }
    );
  }
}
