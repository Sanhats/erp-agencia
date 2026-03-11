import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Invoice from '@/models/Invoice';
import Contract from '@/models/Contract';
import mongoose from 'mongoose';
import puppeteer from 'puppeteer';

/**
 * GET /api/exports/pdf/view?type=invoice|contract&id=...
 * Genera el PDF al vuelo con Puppeteer y lo sirve (no depende de Cloudinary, evita 401).
 */
export async function GET(request: NextRequest) {
  let browser;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Se requiere type (invoice|contract) e id válido' },
        { status: 400 }
      );
    }

    if (type !== 'invoice' && type !== 'contract') {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    await connectDB();

    if (type === 'invoice') {
      const doc = await Invoice.findById(id).select('_id').lean();
      if (!doc) {
        return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
      }
    } else {
      const doc = await Contract.findById(id).select('_id').lean();
      if (!doc) {
        return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 });
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:3000';
    const pdfToken = process.env.PDF_SECRET || process.env.CRON_SECRET;
    if (!pdfToken) {
      return NextResponse.json(
        { error: 'Configuración PDF_SECRET o CRON_SECRET requerida' },
        { status: 500 }
      );
    }
    const printUrl = `${baseUrl}/print/${type}/${id}?token=${encodeURIComponent(pdfToken)}`;

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto(printUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1.5cm', right: '1.5cm', bottom: '1.5cm', left: '1.5cm' },
    });
    await browser.close();
    browser = undefined;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="documento.pdf"',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error: any) {
    if (browser) await browser.close();
    console.error('Error en pdf/view:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar el PDF' },
      { status: 500 }
    );
  }
}
