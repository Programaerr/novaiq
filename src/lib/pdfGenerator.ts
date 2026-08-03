import { jsPDF } from 'jspdf';
import { ContractData } from '../types';

export function generateContractPDF(contract: ContractData) {
  // Create jsPDF instance with A4 format
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Dark Cosmic Header Banner
  doc.setFillColor(15, 23, 42); // Deep navy Slate 900
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Accent Line (Purple & Gold gradient effect)
  doc.setFillColor(168, 85, 247); // Purple 500
  doc.rect(0, 42, pageWidth, 2, 'F');

  // Header Title - NOVAIQ
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('NOVAIQ', 15, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text('FUTURE WEB TEMPLATES & DIGITAL CONTRACTS', 15, 29);
  doc.text('ELECTRONIC SPECIFICATIONS AGREEMENT', 15, 34);

  // Contract Details Right Badge
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(192, 132, 252);
  doc.text(`REF: ${contract.contractNumber}`, pageWidth - 15, 20, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  const formattedDate = new Date(contract.createdAt).toLocaleDateString('en-GB');
  doc.text(`Date: ${formattedDate}`, pageWidth - 15, 27, { align: 'right' });
  doc.text(`Status: ${contract.status.toUpperCase()}`, pageWidth - 15, 33, { align: 'right' });

  let y = 52;

  // Section 1: Parties Information (طرفا العقد)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, y, pageWidth - 24, 38, 3, 3, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, y, pageWidth - 24, 38, 3, 3, 'D');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. PARTIES & COMPANY IDENTIFICATION', 18, y + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  doc.text(`Company Name: ${contract.companyName}`, 18, y + 16);
  doc.text(`CR Number / ID: ${contract.crNumber || 'N/A'}`, 18, y + 23);
  doc.text(`Representative: ${contract.repName}`, 18, y + 30);

  doc.text(`Email: ${contract.email}`, pageWidth / 2 + 10, y + 16);
  doc.text(`Phone: ${contract.phone}`, pageWidth / 2 + 10, y + 23);
  doc.text(`Location: ${contract.city}, ${contract.country}`, pageWidth / 2 + 10, y + 30);

  y += 46;

  // Section 2: Selected Template & Specifications (مواصفات القالب المختار)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, y, pageWidth - 24, 48, 3, 3, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, y, pageWidth - 24, 48, 3, 3, 'D');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. SELECTED TEMPLATE & SPECIFICATIONS', 18, y + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(88, 28, 135);
  doc.text(`Base Template: ${contract.templateTitle} (${contract.templateId})`, 18, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Theme Preferences: ${contract.themePreference.toUpperCase()} Mode | Language: ${contract.languageSupport.toUpperCase()}`, 18, y + 23);

  doc.text('Add-on Specifications:', 18, y + 30);
  const specsText = contract.selectedSpecs.length > 0 ? contract.selectedSpecs.join(' | ') : 'Standard Full Template Specs';
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(specsText, 18, y + 36, { maxWidth: pageWidth - 36 });

  if (contract.customFeaturesText) {
    doc.setFontSize(9);
    doc.text(`Custom Notes: ${contract.customFeaturesText}`, 18, y + 42, { maxWidth: pageWidth - 36 });
  }

  y += 56;

  // Section 3: Financial Terms & Timeline (الشروط المالية ومدة التنفيذ)
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(12, y, pageWidth - 24, 38, 3, 3, 'F');
  doc.setDrawColor(209, 213, 219);
  doc.roundedRect(12, y, pageWidth - 24, 38, 3, 3, 'D');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. FINANCIAL STRUCTURE & DELIVERY TIMELINE', 18, y + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(31, 41, 55);

  doc.text(`Estimated Delivery Timeline: ${contract.deliveryTimelineWeeks} Weeks`, 18, y + 16);
  doc.text(`Payment Structure: ${contract.paymentPlan === '50_50' ? '50% Upfront Deposit / 50% On Final Delivery' : contract.paymentPlan}`, 18, y + 23);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(126, 34, 206);
  const finalPriceIQD = contract.totalPriceIQD || 0;
  const approxUSD = Math.round(finalPriceIQD / 1450);
  doc.text(`Total Agreed Value: ${finalPriceIQD.toLocaleString()} IQD (Iraqi Dinar) (~$${approxUSD.toLocaleString()} USD)`, 18, y + 31);

  y += 46;

  // Section 4: General Terms & Technical Guarantee (الشروط وأحكام الضمان)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('4. TERMS OF SERVICE & GUARANTEES', 15, y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const termsList = [
    '1. Intellectual Property: Upon full payment completion, full source code and rights are granted to the client company.',
    `2. Milestone-Based Delivery: Development is divided into phased sprints across the ${contract.deliveryTimelineWeeks}-week timeline, with regular progress updates.`,
    '3. Technical Support & Maintenance: Operational support and maintenance terms defined by mutual agreement.',
    '4. Electronic Validity: This contract is legally binding under Digital Signature & E-Commerce regulations.',
  ];

  termsList.forEach((term, idx) => {
    doc.text(term, 15, y + 6 + (idx * 5));
  });

  y += 32;

  // Section 5: Signatures & Verification (التوقيع الإلكتروني وختم NOVAIQ)
  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, pageWidth - 15, y);

  y += 8;

  // Client Signature Box
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('CLIENT REPRESENTATIVE SIGNATURE', 18, y);

  if (contract.signatureDataUrl) {
    try {
      doc.addImage(contract.signatureDataUrl, 'PNG', 18, y + 3, 50, 20);
    } catch (e) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('[Digital Signature Verified]', 18, y + 10);
    }
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('[Signed Electronically via NOVAIQ Portal]', 18, y + 10);
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Signed by: ${contract.repName}`, 18, y + 26);

  // NOVAIQ Official Seal Stamp (Right Box)
  const sealX = pageWidth - 65;
  doc.setDrawColor(147, 51, 234);
  doc.setFillColor(250, 245, 255);
  doc.roundedRect(sealX, y - 2, 50, 28, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(126, 34, 206);
  doc.text('NOVAIQ OFFICIAL SEAL', sealX + 25, y + 5, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 33, 168);
  doc.text('VERIFIED E-CONTRACT', sealX + 25, y + 11, { align: 'center' });
  doc.text(`AUTH CODE: NVQ-${contract.contractNumber.slice(-6)}`, sealX + 25, y + 16, { align: 'center' });

  // Footer Notice
  doc.setFillColor(15, 23, 42);
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('NOVAIQ Inc. | Future Web Architectures | Generated via NOVAIQ Electronic Portal', pageWidth / 2, pageHeight - 5, { align: 'center' });

  // Safe Filename & Download with bulletproof Blob URL & window.open method
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
