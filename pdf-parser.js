const fs = require('fs');
const pdfParse = require('pdf-parse');

// Extract text from a PDF
const extractPDFText = async (filePath) => {
  try {
    const pdfBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(pdfBuffer);
    return data.text; // Returns the extracted text from the PDF
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return null;
  }
};

module.exports = { extractPDFText };
