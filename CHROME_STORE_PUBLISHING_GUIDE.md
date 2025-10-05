# TextCraft AI - Chrome Web Store Publishing Guide

This guide walks you through the process of publishing your TextCraft AI extension to the Chrome Web Store.

## Pre-Publication Checklist

1. **Extension Name**: "TextCraft AI" ✓
2. **Icons**: Make sure your extension has proper icons in all required sizes (16x16, 48x48, 128x128) ✓
3. **Manifest.json**: Ensure all required fields are properly filled out ✓
4. **Build**: Create a production build with `npm run build` ✓

## Step 1: Prepare Your Package

1. Navigate to your extension directory:
   ```
   cd /Users/sagar/Experiments/text-rephraser-extension
   ```

2. Create a ZIP file of your `dist` folder contents (not the folder itself):
   ```
   cd dist
   zip -r ../textcraft-ai.zip *
   cd ..
   ```

## Step 2: Create a Chrome Web Store Developer Account

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Sign in with your Google account
3. Pay the one-time $5 registration fee if you haven't already registered as a developer

## Step 3: Create a New Item in the Developer Dashboard

1. Click on "New Item" in the dashboard
2. Upload your `textcraft-ai.zip` file
3. Wait for the upload to complete

## Step 4: Complete the Store Listing

### Store Listing Tab
1. **Description**:
   - **Short Description** (up to 132 characters): "AI-powered text rephrasing with multiple modes and tones of voice."
   - **Detailed Description**: Copy content from your README.md, highlighting key features and benefits

2. **Screenshots** (at least one required):
   - Take screenshots of your extension in action (1280x800 or 640x400 px)
   - Show different rephrasing modes and settings
   - Include at least 3-5 high-quality screenshots

3. **Promotional Images** (optional but recommended):
   - Small Promo Tile (440x280 px)
   - Large Promo Tile (920x680 px)

4. **YouTube Video** (optional):
   - Consider creating a short demo video

5. **Category**: 
   - Select "Productivity" as your primary category

6. **Language**:
   - Select English and any other supported languages

### Privacy Tab
1. **Privacy Policy**:
   - Create a simple privacy policy explaining what data your extension collects
   - If you don't collect personal data, state this clearly
   - Host this on a website and provide the URL

2. **Permissions Justification**:
   - Explain why your extension needs the permissions it requests:
     - `storage`: "To save user preferences and history"
     - `clipboardWrite`: "To copy rephrased text to clipboard"
     - `http://localhost:*/`: "To connect to local Ollama instance for AI processing"

3. **Data Usage**:
   - Declare how you handle user data
   - Specify if data is sent to third-party services (like OpenAI, Gemini, etc.)

### Distribution Tab
1. **Visibility Options**:
   - Public: Available to all Chrome users
   - Private: Limited to specific users (good for testing)
   - Unlisted: Accessible only via direct link

2. **Geographic Distribution**:
   - Select regions where your extension will be available (typically "All regions")

## Step 5: Submit for Review

1. Click "Submit for Review"
2. Agree to the developer program policies
3. Wait for the review process (typically 1-3 business days)

## Step 6: Post-Publication Management

1. **Monitor User Feedback**:
   - Respond to user reviews and questions
   - Address any issues promptly

2. **Update Your Extension**:
   - Make improvements based on feedback
   - Upload new versions through the developer dashboard
   - Each update will require a new review

3. **Analytics**:
   - Monitor installation numbers and active users
   - Track user engagement metrics

## Common Rejection Reasons to Avoid

1. Insufficient description or screenshots
2. Requesting unnecessary permissions
3. Missing or inadequate privacy policy
4. Security vulnerabilities
5. Deceptive functionality claims
6. Poor user experience

## Helpful Resources

- [Chrome Web Store Developer Documentation](https://developer.chrome.com/docs/webstore/)
- [Chrome Extension Quality Guidelines](https://developer.chrome.com/docs/webstore/best_practices/)
- [Chrome Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/)
