const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require("dotenv").config();

const callGeminiAPI = async (question, context, filePath) => {
    console.log("Gemini API:", question, context);

    try {
        // Initialize the GoogleGenerativeAI client using the API key from environment variables
        const genAI = new GoogleGenerativeAI("AIzaSyAHhNmazp5J_xOOU52VJpzdJspZ6cduoE8");

        // Initialize the Gemini model (confirm that this is the correct initialization)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Create the content to be processed by the Gemini API
        const contents = [{
            parts: [{
                text: context,
            }],
        }];
        const pdfBuffer = fs.readFileSync("./uploads/upload.pdf"); // Replace with your PDF file
        const prompt = question;

        const pdf = {
            inlineData: {
                data: Buffer.from(pdfBuffer).toString("base64"),
                mimeType: "application/pdf",
            },
        };

        // Log or send your data
        console.log({ question, pdf });
        const result = await model.generateContent([prompt, pdf]);
        // console.log("Contents to be processed by Gemini:", contents);
        console.log("dsfa",result.response.text());

        // Use the appropriate method to generate the response (check API documentation)
        // const response = await model.generateContent([question,contents]);  // Use chat() instead of generate()

        console.log("Response from Gemini:", result.response.text());
        return result.response.text() || "No answer found";

    } catch (error) {
        console.error("Error calling Gemini API:", error.message);
        return `Error: ${error.message}`;
    }
};
const processQuery = async (filePath, question) => {
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();
  
    const context = docs.map(doc => doc.pageContent).join(" ");
  
    const answer = await callGeminiAPI(question, context);
    return answer;
  };
  

(async () => {
    try {
        const filePath = "./uploads/upload.pdf"; // Replace with the actual file path
        // const question = "GST?"; // Example question
        const question = "who is this letter of authorization by?"; // Example question
        const response = await processQuery(filePath, question);
        console.log("Response from Gemini:", response);
    } catch (error) {
        console.error("Error:", error);
    }
})();

module.exports = { processQuery };
