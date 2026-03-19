// backend/services/openRouter.js
import axios from 'axios';

function buildDesignOnlyPrompt(prompt) {
    const cleanedPrompt = prompt.trim();

    return [
        cleanedPrompt,
        'Create a print-ready t-shirt graphic design asset only.',
        'Return only the isolated artwork/decal with no t-shirt, no clothing mockup, no model, no mannequin, no hanger, no folded garment, no fabric texture, no scene, no room, no hands, and no product photo framing.',
        'Center the composition and keep it tightly cropped around the artwork.',
        'Use a transparent background. If true transparency is not supported, use a pure white background with only the artwork present so the background can be removed cleanly.',
        'Do not show the design printed on anything.',
        'High detail, clean edges, production-friendly, suitable for screen print or DTF.'
    ].join(' ');
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
