const fs = require('fs');
const path = require('path');
const http = require('http');

// Helper to create a minimal valid PDF binary
function createMinimalPdf(text) {
  // A standard minimal valid PDF 1.4 file
  const stream = `BT /F1 12 Tf 50 700 Td (${text}) Tj ET`;
  const streamLen = stream.length;
  const pdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length ${streamLen} >> stream
${stream}
endstream endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000224 00000 n 
0000000305 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
${370 + streamLen}
%%EOF`;
  return Buffer.from(pdfContent);
}

async function testPdfRag() {
  console.log('Testing Real PDF Ingestion & Extraction...');
  const pdfBuffer = createMinimalPdf('Project Apollo Budget: Total allocation is $450,000 for local infrastructure hardware.');
  const pdfPath = path.resolve(__dirname, 'test_sample.pdf');
  fs.writeFileSync(pdfPath, pdfBuffer);

  const pdfParse = require('pdf-parse');
  const data = await pdfParse(pdfBuffer);
  console.log('✓ Successfully extracted text from PDF:');
  console.log('  Content:', data.text.trim());
  console.log('  Number of pages:', data.numpages);

  if (!data.text.includes('$450,000')) {
    throw new Error('PDF parsing did not find expected text!');
  }

  // Cleanup
  fs.unlinkSync(pdfPath);
  console.log('✓ PDF Ingestion and text extraction test passed!');
}

testPdfRag().catch(console.error);

