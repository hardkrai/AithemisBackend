const fs = require('fs');
const pdfParse = require('pdf-parse');

// Extract text from a PDF file buffer
const extractPDFText = async (pdfBuffer) => {
  try {
    // Parse the PDF buffer using pdf-parse
    const data = await pdfParse(pdfBuffer);
    return data.text; // Returns the extracted text from the PDF
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return null;
  }
};

// Example of usage with file path or file buffer
const processPDFQuery = async (pdfBuffer, question) => {
  const extractedText = await extractPDFText(pdfBuffer);

  if (!extractedText) {
    return "Could not extract text from the provided PDF.";
  }

  // You can now send the extracted text along with the question to an AI API (e.g., Gemini API)
  const context = extractedText; // Use the extracted text as context
  const response = await callGeminiAPI(question, context, pdfBuffer);
  return response;
};

// Example of using the function with an in-memory buffer
(async () => {
  try {
    const pdfBuffer = fs.readFileSync("./uploads/upload.pdf"); // Replace with your file path
    const question = "Who is this letter of authorization by?"; // Example question
    const response = await processPDFQuery(pdfBuffer, question);
    console.log("Response:", response);
  } catch (error) {
    console.error("Error:", error);
  }
});

module.exports = { extractPDFText, processPDFQuery };
