#!/bin/bash

# Build the extension
echo "Building TextCraft AI extension..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "Build failed. Please check for errors."
  exit 1
fi

# Create zip file from dist directory
echo "Creating ZIP file for Chrome Web Store submission..."
cd dist
zip -r ../textcraft-ai.zip *
cd ..

echo "Done! Your extension is ready for submission."
echo "ZIP file created: textcraft-ai.zip"
echo "Follow the instructions in CHROME_STORE_PUBLISHING_GUIDE.md to publish your extension."
