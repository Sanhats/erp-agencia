import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Contract, { ContractStatus } from '@/models/Contract';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const daysAhead = searchParams.get('daysAhead') ? parseInt(searchParams.get('daysAhead')!) : 90;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + daysAhead);

    // Contratos activos que vencen en el período
    const upcomingRenewals = await Contract.find({
      status: ContractStatus.ACTIVE,
      endDate: {
        $exists: true,
        $gte: today,
        $lte: futureDate,
      },
    })
      .populate('clientId', 'name email phone')
      .sort({ endDate: 1 });

    // Contratos activos sin fecha de fin
    const noEndDate = await Contract.find({
      status: ContractStatus.ACTIVE,
      endDate: { $exists: false },
    })
      .populate('clientId', 'name email phone');

    // Agrupar por mes de vencimiento
    const byMonth = upcomingRenewals.reduce((acc: any, contract) => {
      if (!contract.endDate) return acc;

      const endDate = new Date(contract.endDate);
      const monthKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;

      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          count: 0,
          contracts: [],
          totalMonthlyValue: 0,
        };
      }

      acc[monthKey].count += 1;
      acc[monthKey].totalMonthlyValue += contract.monthlyPrice;
      acc[monthKey].contracts.push({
        _id: contract._id,
        clientId: contract.clientId,
        monthlyPrice: contract.monthlyPrice,
        endDate: contract.endDate,
        daysUntilRenewal: Math.ceil(
          (contract.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        ),
      });

      return acc;
    }, {});

    const byMonthArray = Object.values(byMonth).sort((a: any, b: any) => a.month.localeCompare(b.month));

    // Calcular totales
    const totalValue = upcomingRenewals.reduce((sum, c) => sum + c.monthlyPrice, 0);
    const totalNoEndDate = noEndDate.reduce((sum, c) => sum + c.monthlyPrice, 0);

    return NextResponse.json({
      period: { daysAhead },
      summary: {
        upcomingCount: upcomingRenewals.length,
        noEndDateCount: noEndDate.length,
        totalUpcomingValue: totalValue,
        totalNoEndDateValue: totalNoEndDate,
      },
      byMonth: byMonthArray,
      upcomingRenewals: upcomingRenewals.map((contract) => ({
        _id: contract._id,
        clientId: contract.clientId,
        monthlyPrice: contract.monthlyPrice,
        endDate: contract.endDate,
        daysUntilRenewal: contract.endDate
          ? Math.ceil((contract.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })),
      noEndDate: noEndDate.map((contract) => ({
        _id: contract._id,
        clientId: contract.clientId,
        monthlyPrice: contract.monthlyPrice,
        startDate: contract.startDate,
      })),
    });
  } catch (error: any) {
    console.error('Error generating renewals report:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar reporte de renovaciones' },
      { status: 500 }
    );
  }
}
