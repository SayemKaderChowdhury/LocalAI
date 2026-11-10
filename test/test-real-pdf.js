const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function testRealPdf() {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Page 1
  const page1 = pdfDoc.addPage([600, 400]);
  page1.drawText('LocalAI Technical Specification\nPage 1: Architecture\nThe system uses Ollama as the local inference engine and SQLite for persistence.', {
    x: 50,
    y: 320,
    size: 14,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Page 2
  const page2 = pdfDoc.addPage([600, 400]);
  page2.drawText('Page 2: Security Guidelines\nUnder no circumstances shall chats or document embeddings be sent to any external server. Strict airgap is enforced.', {
    x: 50,
    y: 320,
    size: 14,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  const testPdfPath = path.resolve(__dirname, 'test_manual.pdf');
  fs.writeFileSync(testPdfPath, pdfBytes);
  console.log('✓ Generated valid multi-page PDF');

  // Parse with pdfParse
  const data = await pdfParse(pdfBytes);
  console.log('✓ Parsed PDF:');
  console.log('  Total Pages:', data.numpages);
  console.log('  Extracted text sample:\n', data.text.trim());

  if (data.text.includes('Strict airgap is enforced') && data.numpages === 2) {
    console.log('✓ Multi-page PDF text extraction verified successfully!');
  } else {
    throw new Error('PDF parsing failed verification');
  }

  fs.unlinkSync(testPdfPath);
}

testRealPdf().catch(console.error);

