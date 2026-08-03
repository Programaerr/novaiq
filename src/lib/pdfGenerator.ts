import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { ContractData } from '../types';

// The downloadable PDF used to be drawn line-by-line with jsPDF's own (Latin-only) fonts,
// hardcoded in English — jsPDF's built-in fonts have no Arabic glyphs, so an Arabic version
// of the same approach would render as blank boxes. Instead, this captures the already
// correctly-translated, correctly-RTL on-screen contract document (rendered by the browser,
// with real Arabic font + shaping) as an image and paginates it across A4 pages. This also
// guarantees the PDF can never drift out of sync with what the client sees on screen.
// Uses the `-pro` fork rather than plain html2canvas: Tailwind v4's default palette is
// defined in oklch(), which the original library's CSS parser throws on ("Attempting to
// parse an unsupported color function") — that exception silently killed every download.
export async function generateContractPDF(element: HTMLElement, contract: ContractData): Promise<void> {
  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    });
  } catch (err) {
    console.error('Failed to capture contract document as an image:', err);
    alert('تعذر تجهيز ملف PDF. يرجى إعادة المحاولة أو تحديث الصفحة.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL('image/png');

  let heightLeft = imgHeight;
  let position = 0;

  doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    doc.addPage();
    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const cleanCompanyName = (contract.companyName || 'Company').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `NOVAIQ_Contract_${cleanCompanyName}_${contract.contractNumber}.pdf`;

  try {
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    // Attempt 1: Trigger programmatic download link
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Attempt 2: Also open in a new tab if popup blockers don't prevent it, or as a reliable viewer fallback
    try {
      window.open(blobUrl, '_blank');
    } catch {
      // ignore popup blocker warning
    }

    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch (err) {
    console.warn('Blob download failed, executing doc.save fallback:', err);
    try {
      doc.save(filename);
    } catch (fallbackErr) {
      console.error('All PDF download methods failed:', fallbackErr);
      alert('تعذر تحميل ملف PDF تلقائياً. يرجى التحقق من إعدادات المتصفح.');
    }
  }
}
