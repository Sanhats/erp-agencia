import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Invoice from '@/models/Invoice';
import Contract from '@/models/Contract';
import mongoose from 'mongoose';
import puppeteer from 'puppeteer';
import { uploadPDF } from '@/lib/cloudinary';
import { logAction, getRequestInfo } from '@/lib/audit';
import { AuditAction } from '@/models/AuditLog';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { type, id, regenerate } = body;

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Se requiere type (invoice/contract) e id' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Validar que el documento existe
    let document;
    if (type === 'invoice') {
      document = await Invoice.findById(id);
      if (!document) {
        return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
      }
    } else if (type === 'contract') {
      document = await Contract.findById(id);
      if (!document) {
        return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 });
      }
    } else {
      return NextResponse.json(
        { error: 'Tipo inválido. Use "invoice" o "contract"' },
        { status: 400 }
      );
    }

    // Si ya existe PDF y no se solicita regenerar, retornar URL existente
    if (document.pdfUrl && !regenerate) {
      return NextResponse.json({
        url: document.pdfUrl,
        publicId: document.pdfPublicId,
        cached: true,
      });
    }

    // Rutas públicas /print/* con token para que Puppeteer no reciba la página de login
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:3000';
    const pdfToken = process.env.PDF_SECRET || process.env.CRON_SECRET;
    if (!pdfToken) {
      throw new Error('PDF_SECRET o CRON_SECRET requerido para generar PDFs');
    }
    const printUrl = `${baseUrl}/print/${type}/${id}?token=${encodeURIComponent(pdfToken)}`;

    // Iniciar Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      
      // Navegar a la página de impresión
      await page.goto(printUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Generar PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1.5cm',
          right: '1.5cm',
          bottom: '1.5cm',
          left: '1.5cm',
        },
      });

      await browser.close();

      // Subir a Cloudinary
      const folder = `pdfs/${type}s`;
      const publicId = regenerate && document.pdfPublicId 
        ? document.pdfPublicId 
        : undefined;

      const { url, publicId: uploadedPublicId } = await uploadPDF(pdfBuffer, folder, publicId);

      // Actualizar documento en la base de datos
      if (type === 'invoice') {
        await Invoice.findByIdAndUpdate(id, {
          pdfUrl: url,
          pdfPublicId: uploadedPublicId,
        });
      } else if (type === 'contract') {
        await Contract.findByIdAndUpdate(id, {
          pdfUrl: url,
          pdfPublicId: uploadedPublicId,
        });
      }

      const { ipAddress, userAgent } = getRequestInfo(request);
      await logAction({
        userId: session.user.id,
        action: AuditAction.EXPORT,
        resourceType: type,
        resourceId: id,
        description: `PDF exportado: ${type} ${id}`,
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        url,
        publicId: uploadedPublicId,
        cached: false,
      });
    } catch (error: any) {
      await browser.close();
      throw error;
    }
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar PDF' },
      { status: 500 }
    );
  }
}
