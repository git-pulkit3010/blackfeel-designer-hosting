// backend/services/openRouter.js
import axios from 'axios';

function buildDesignOnlyPrompt(prompt) {
    const cleanedPrompt = prompt.trim();

    return `
### ROLE
You are an elite Lead Graphic Designer specializing in high-end streetwear and premium apparel graphics. Your sole purpose is to generate production-ready, isolated design assets for professional printing (Screen Printing, DTF, and DTG).

### USER DESIGN REQUEST
"${cleanedPrompt}"

### TECHNICAL SPECIFICATIONS (MANDATORY)
- BACKGROUND: Use a flat, solid #FFFFFF (Pure White) background. No gradients, shadows, or textures.
- COMPOSITION: Center the artwork perfectly with a 10% safety margin (padding) from all edges.
- LINE WORK: Ensure all lines are crisp and deliberate. Avoid "whispy" or transparent outer glows.
- PRINTABILITY: Ensure elements are bold and production-friendly; avoid micro-details smaller than 1px.
- OUTPUT: Return only the isolated artwork/decal.

### STRICT NEGATIVE CONSTRAINTS
DO NOT include:
- T-shirts, clothing mockups, models, mannequins, hangers, or folded garments.
- Fabric textures, realistic scenes, rooms, or product photo framing.
- Hands, skin, or any human elements.
- 3D shadows or "drop shadows" beneath the artwork.
- Any "AI fluff" such as excessive lighting flares or messy overlapping shapes.

Final Output: High-resolution, clean-edge digital graphic asset only.
`.trim();
}

export const openRouterService = {
    async generateImage(prompt) {
        try {
            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: 'google/gemini-2.5-flash-image',
                    messages: [
                        {
                            role: 'user',
                            content: buildDesignOnlyPrompt(prompt)
                        }
                    ],
                    // FIX: Must include both for Gemini to trigger image generation
                    modalities: ["image", "text"] 
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
                        'X-Title': 'LUXE.AI'
                    }
                }
            );

            // OpenRouter returns images in the message.images array
            const message = response.data.choices[0].message;
            let imageUrl = '';
            
            if (message.images && message.images.length > 0) {
                 // Check if it's a direct URL or a nested object
                 imageUrl = message.images[0].url || message.images[0].image_url?.url || message.images[0];
            } else if (typeof message.content === 'string' && message.content.startsWith('data:image')) {
                 imageUrl = message.content;
            }

            if (!imageUrl) {
                console.error("OpenRouter Response Structure:", JSON.stringify(response.data, null, 2));
                throw new Error('No image returned in response');
            }

            return imageUrl;
        } catch (error) {
            console.error('OpenRouter generation error:', error.response?.data || error.message);
            throw new Error('Image generation failed.');
        }
    }
};