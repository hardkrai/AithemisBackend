const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
require("dotenv").config();

const callGeminiAPI = async (question, context, pdfBuffer) => {
    console.log("Gemini API:", question, context);

    try {
        // Initialize the GoogleGenerativeAI client using the API key from environment variables
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Initialize the Gemini model (confirm that this is the correct initialization)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Create the content to be processed by the Gemini API
        const contents = [{
            parts: [{
                text: context,
            }],
        }];
        
        // Convert the PDF buffer to base64 encoding
        const pdf = {
            inlineData: {
                data: pdfBuffer.toString("base64"),
                mimeType: "application/pdf",
            },
        };

        // Log or send your data
        console.log({ question, pdf });
        
        // Send the question and pdf data to the model
        const result = await model.generateContent([question, pdf]);

        console.log("Response from Gemini:", result.response.text());

        return result.response.text() || "No answer found";

    } catch (error) {
        console.error("Error calling Gemini API:", error.message);
        return `Error: ${error.message}`;
    }
};

// Updated processQuery function to handle file buffer instead of a file path
const processQuery = async (pdfBuffer, question) => {
    // Use PDFLoader to parse the PDF from the buffer instead of a file path
    const loader = new PDFLoader(pdfBuffer);
    const docs = await loader.load();

    const context = docs.map(doc => doc.pageContent).join(" ");

    const answer = await callGeminiAPI(question, context, pdfBuffer);
    return answer;
};

// Example call to test the processQuery function
(async () => {
    try {
        // Read the uploaded PDF file into a buffer (in-memory)
        const pdfBuffer = fs.readFileSync("./uploads/upload.pdf"); // Replace with actual path if needed

        const question = "Who is this letter of authorization by?"; // Example question
        const response = await processQuery(pdfBuffer, question);
        console.log("Response from Gemini:", response);
    } catch (error) {
        console.error("Error:", error);
    }
})();

module.exports = { processQuery };
