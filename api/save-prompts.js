// Simple API endpoint to save prompts
// This would typically be a proper backend endpoint

const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { prompts } = req.body;
    
    // Validate prompts object
    if (!prompts || typeof prompts !== 'object') {
      return res.status(400).json({ message: 'Invalid prompts data' });
    }

    // Write to prompts.json file
    const promptsPath = path.join(process.cwd(), 'prompts.json');
    fs.writeFileSync(promptsPath, JSON.stringify(prompts, null, 2));
    
    res.status(200).json({ message: 'Prompts saved successfully' });
  } catch (error) {
    console.error('Error saving prompts:', error);
    res.status(500).json({ message: 'Failed to save prompts' });
  }
}
