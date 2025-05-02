const express = require("express");
const bodyParser = require("body-parser");
const tesseract = require("tesseract.js");

const app = express();
const port = 3000;

// Middleware to parse JSON payloads
app.use(bodyParser.json());

// Endpoint to handle GET requests (root route)
app.get("/", (req, res) => {
  console.log("Received a request at / endpoint");
  res.send("this is json challenge");
});

app.get("/test", (req, res) => {
  res.send("this is test");
  const validJsonString = '{"name": "John Doe", "age": 30}';
  const parsedData = JSON.parse(validJsonString);
  console.log(parsedData); // Should print the parsed object: { name: 'John Doe', age: 30 }
});

// Endpoint to handle POST requests for JSON extraction
app.post("/extract", (req, res) => {
  console.log("Received a request at /extract endpoint");
  console.log("Request body:", req.body);

  // Check if imageBase64 exists in the request body and is a valid string
  const imageBase64 = req.body.imageBase64;
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({
      success: false,
      message: "Missing or invalid 'imageBase64' in the request body.",
    });
  }

  try {
    // Remove the prefix (data:image/png;base64,) from the base64 string if present
    const base64Data = imageBase64.split(",")[1];
    if (!base64Data) {
      throw new Error("Invalid base64 data");
    }

    // Pass the base64 data to tesseract.js for OCR extraction
    tesseract
      .recognize(
        Buffer.from(base64Data, "base64"), // Decode base64 data to binary
        "eng", // Language (you can add other languages here if needed)
        {
          logger: (m) => console.log(m), // Log the OCR progress (optional)
        }
      )
      .then(({ data: { text } }) => {
        console.log("OCR extraction successful"); // Log OCR success

        // Clean the extracted text and try to parse it as JSON
        let extractedText = text.trim();
        console.log("Extracted text: ", extractedText); // Log extracted text

        // Step 1: Clean the text - Replace curly quotes with straight quotes
        extractedText = extractedText.replace(/[“”]/g, '"');

        // Step 2: Remove unwanted characters (e.g., lq, ¥, newlines)
        extractedText = extractedText
          .replace(/\blq\b/g, "") // Remove 'lq' if it exists
          .replace(/\¥/g, "") // Remove '¥' if it exists
          .replace(/\n/g, " ") // Remove newlines
          .replace(/\s+/g, " ") // Remove extra spaces
          .trim(); // Trim extra spaces at the beginning and end

        // Step 3: Wrap the text in curly braces to make it a valid JSON object
        extractedText = `{${extractedText}}`;

        // Attempt to parse the cleaned text as JSON
        let extractedData;
        try {
          extractedData = JSON.parse(extractedText); // Now it's valid JSON
          console.log("Parsed JSON:", extractedData);
        } catch (error) {
          console.log("Error parsing JSON:", error);
          return res.status(400).json({
            success: false,
            message: "Error parsing cleaned text as JSON",
          });
        }

        // Return the extracted data in the expected format
        res.json({
          success: true,
          data: extractedData,
          message: "Successfully extracted JSON from image",
        });
      })
      .catch((error) => {
        console.log("Error during OCR:", error); // Log OCR extraction error
        res.status(500).json({
          success: false,
          message: `Error extracting data from image: ${error.message}`,
        });
      });
  } catch (error) {
    console.log("Error in /extract endpoint:", error); // Log general error
    res.status(500).json({
      success: false,
      message: `Error processing request: ${error.message}`,
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
