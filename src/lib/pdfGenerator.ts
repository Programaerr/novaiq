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

  /* شريط رقم الصفحة أسفل كل ورقة. يُحجَز مكانه قبل التقسيم لا بعده — وإلا طُبع الرقم فوق
     آخر سطر من المحتوى. */
  const footerMm = 9;
  const usableHeightMm = pageHeight - footerMm;

  /* ── ترويسة تتكرّر في كل صفحة ────────────────────────────────────────────────────────
     صفحة ثانية بلا ترويسة هي ورقة بلا هوية: لا اسم، ولا رقم عقد، ولا تاريخ. ومن يطبع
     الوثيقة ويفصل أوراقها يبقى معه نصّ لا يُنسب إلى شيء. الترويسة موسومة في الوثيقة
     بـ`data-pdf-header` وتُعاد رسمها أعلى كل صفحة بعد الأولى، والمحتوى يبدأ تحتها. */
  const rootRect = element.getBoundingClientRect();
  const captureScale = canvas.width / rootRect.width;
  const headerEl = element.querySelector<HTMLElement>('[data-pdf-header]');
  const headerPx = headerEl
    ? Math.round((headerEl.getBoundingClientRect().bottom - rootRect.top) * captureScale)
    : 0;
  const headerMm = headerPx * scale;

  /* ── كتل لا تُقصّ ────────────────────────────────────────────────────────────────────
     كان التقسيم يقطع عند ارتفاع الصفحة بالضبط بلا علم بما تحت المقصّ، فيُقطع بند في منتصف
     جملته أو قسم التواقيع نصفين. الكتل الموسومة بـ`data-pdf-keep` تُقاس هنا بإحداثيات
     اللوحة؛ فإن وقع المقصّ داخل واحدة رُفع إلى أعلاها فتبدأ كاملة في الصفحة التالية. */
  const keepBlocks = Array.from(element.querySelectorAll<HTMLElement>('[data-pdf-keep]'))
    .map((node) => {
      const r = node.getBoundingClientRect();
      return {
        top: (r.top - rootRect.top) * captureScale,
        bottom: (r.bottom - rootRect.top) * captureScale,
      };
    })
    .filter((b) => b.bottom > b.top);

  let offsetPx = headerPx; // المحتوى يبدأ بعد الترويسة؛ الأولى تحملها ضمن التقاطها.
  let page = 0;

  while (offsetPx < canvas.height) {
    // مساحة المحتوى: الصفحة كاملة ناقص التذييل، وناقص الترويسة المعادة في الصفحات التالية.
    const contentMm = usableHeightMm - (page === 0 ? headerMm : headerMm);
    const maxContentPx = Math.max(1, Math.floor(contentMm / scale));

    let cut = Math.min(offsetPx + maxContentPx, canvas.height);
    if (cut < canvas.height) {
      for (const b of keepBlocks) {
        if (b.top > offsetPx && b.top < cut && b.bottom > cut) cut = b.top;
      }
      // كتلة أطول من صفحة كاملة لا تُنقَذ بالدفع — دفعها يعني صفحة فارغة ثم قصّها على أي حال.
      if (cut <= offsetPx) cut = Math.min(offsetPx + maxContentPx, canvas.height);
    }
    const contentPx = cut - offsetPx;

    const sheet = document.createElement('canvas');
    sheet.width = canvas.width;
    sheet.height = headerPx + contentPx;
    const ctx = sheet.getContext('2d');
    if (!ctx) break;
    /* اللوحة الملتقَطة بيضاء معتمة، لكن الورقة الأخيرة أقصر من صفحة كاملة؛ بدون هذه يبقى
       باقيها شفافاً، وبعض العارضات ترسم الشفاف أسود لا ورقاً. */
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    if (headerPx > 0) {
      ctx.drawImage(canvas, 0, 0, canvas.width, headerPx, 0, 0, canvas.width, headerPx);
    }
    ctx.drawImage(canvas, 0, offsetPx, canvas.width, contentPx, 0, headerPx, canvas.width, contentPx);

    if (page > 0) doc.addPage();
    doc.addImage(sheet.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, sheet.height * scale);

    offsetPx = cut;
    page += 1;
  }

  /* الترقيم بعد اكتمال الصفحات، لأن العدد الكلي لا يُعرف قبل ذلك.
     أرقام لاتينية بلا نصّ عربي: خطوط jsPDF المدمجة بلا حروف عربية، وأي كلمة عربية تُرسم بها
     تخرج مربّعات فارغة — وهذا سبب كون الوثيقة كلها صورة أصلاً. */
  const total = doc.getNumberOfPages();
  doc.setFontSize(9);
  doc.setTextColor(107, 113, 121);
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.text(`${i} / ${total}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
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
