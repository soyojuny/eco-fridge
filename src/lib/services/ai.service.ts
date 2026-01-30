import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateVoiceCommandPrompt } from '@/lib/prompts/voice-command-parser';
import { generateFoodScannerPrompt } from '@/lib/prompts/food-scanner';
import type { InventoryItem, VoiceCommand } from '@/types/command';
import type { ParsedResponse } from '@/types/scanner';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

/**
 * Parses a voice command using the AI model.
 * @param command The user's voice command string.
 * @param inventory A list of current inventory items.
 * @returns A promise that resolves to an array of parsed voice commands.
 */
export async function parseVoiceCommand(command: string, inventory: InventoryItem[]): Promise<VoiceCommand[]> {
  const prompt = generateVoiceCommandPrompt(inventory) + `\n\n# User Command:\n${command}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  try {
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/[\[][\s\S]*[]]/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr) as VoiceCommand[];
  } catch (error) {
    console.error('Failed to parse voice command JSON:', responseText, error);
    throw new Error('Could not understand the command from AI response.');
  }
}

/**
 * Parses an image of a receipt or product to extract item information.
 * @param base64Image The base64 encoded image string.
 * @returns A promise that resolves to the parsed item data.
 */
export async function parseImage(base64Image: string): Promise<ParsedResponse> {
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const mimeType = base64Image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
  const prompt = generateFoodScannerPrompt();

  const result = await model.generateContent([
    prompt,
    { inlineData: { data: base64Data, mimeType } },
  ]);

  const responseText = result.response.text();

  try {
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/[{][\s\S]*[}]/);
     if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr) as ParsedResponse;
  } catch (error) {
    console.error('Failed to parse image JSON:', responseText, error);
    throw new Error('Could not parse item data from AI response.');
  }
}
