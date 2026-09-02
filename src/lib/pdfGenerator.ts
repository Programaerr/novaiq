import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { ContractData } from '../types';

// The downloadable PDF used to be drawn line-by-line with jsPDF's own (Latin-only) fonts,
// hardcoded in English — jsPDF's built-in fonts have no Arabic glyphs, so an Arabic version
// of the same approach would render as blank boxes. Instead, this captures the already
// correctly-translated, correctly-RTL on-screen contract document (rendered by the browser,
// with real Arabic font + shaping) as an image, fitted to A4 width and paginated. This also
// guarantees the PDF can never drift out of sync with what the client sees on screen.
// Uses the `-pro` fork rather than plain html2canvas: Tailwind v4's default palette is
// defined in oklch(), which the original library's CSS parser throws on ("Attempting to
// parse an unsupported color function") — that exception silently killed every download.
/**
 * نفس مسار التوليد، لكن يعيد الملف بدل تنزيله — تستعمله أرشفة العقد المعتمد
 * (lib/contractArchive.ts) لرفع نسخة مجمَّدة إلى التخزين.
 *
 * مقتطعة من الدالة أدناه لا منسوخة: نسختان من منطق الالتقاط والتقسيم تعنيان أن نسخة العميل
 * المطبوعة قد تختلف يوماً عن النسخة المؤرشفة، وهو أسوأ خلل ممكن في وثيقة تعاقدية.
 */
export async function renderContractPdfBlob(element: HTMLElement, contract: ContractData): Promise<Blob> {
  const doc = await buildContractPdf(element, contract);
  if (!doc) throw new Error('Could not render the contract PDF');
  return doc.output('blob');
}

/** الالتقاط والتقسيم — المنطق المشترك بين التنزيل والأرشفة. */
async function buildContractPdf(element: HTMLElement, _contract: ContractData): Promise<jsPDF | null> {
  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    });
  } catch (err) {
    console.error('Failed to capture contract document as an image:', err);
    return null;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Fit to width, then paginate.
  //
  // This used to take the smaller of the width-fit and height-fit scale, so that however long
  // the contract ran it always landed on exactly one A4 page. That was reasonable while the
  // terms section was four clauses; with a full agreement it is not, because "always one page"
  // is achieved by shrinking — a two-page contract squeezed into 297mm is still entirely
  // present and no longer readable, which is the worst possible outcome for the one document
  // a client is meant to actually read before signing.
  //
  // Width-fitting instead keeps the type at a constant legible size no matter how long the
  // agreement is, and lets the overflow become a second page — which is what a contract of
  // this length genuinely is. Short contracts are unaffected: they still finish inside the
  // first page and no second one is ever added.
  const scale = pageWidth / canvas.width; // mm per canvas pixel
  const sliceHeightPx = Math.max(1, Math.floor(pageHeight / scale)); // canvas px that fill a page

  for (let offsetPx = 0, page = 0; offsetPx < canvas.height; offsetPx += sliceHeightPx, page++) {
    const height = Math.min(sliceHeightPx, canvas.height - offsetPx);

    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = height;
    const ctx = slice.getContext('2d');
    if (!ctx) break;
    // The captured canvas is already opaque white, but the final slice is usually shorter
    // than a full page; without this its remainder stays transparent, which some PDF viewers
    // render as black rather than as paper.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, offsetPx, canvas.width, height, 0, 0, canvas.width, height);

    if (page > 0) doc.addPage();
    doc.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, height * scale);
  }

  return doc;
}

export async function generateContractPDF(element: HTMLElement, contract: ContractData): Promise<void> {
  const doc = await buildContractPdf(element, contract);
  if (!doc) {
    alert('تعذر تجهيز ملف PDF. يرجى إعادة المحاولة أو تحديث الصفحة.');
    return;
  }

  const cleanCompanyName = (contract.companyName || 'Company').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `NUVAIQ_Contract_${cleanCompanyName}_${contract.contractNumber}.pdf`;

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
