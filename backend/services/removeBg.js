import axios from 'axios';
import FormData from 'form-data';
import sharp from 'sharp';

const WHITE_THRESHOLD = 245;

function isDataUrl(value) {
    return typeof value === 'string' && value.startsWith('data:image');
}

function isHttpUrl(value) {
    return typeof value === 'string' && /^https?:\/\//i.test(value);
}

async function loadImageBuffer(imageSource) {
    if (isDataUrl(imageSource)) {
        const base64Data = imageSource.replace(/^data:image\/\w+;base64,/, '');
        return Buffer.from(base64Data, 'base64');
    }

    if (isHttpUrl(imageSource)) {
        const response = await axios.get(imageSource, {
            responseType: 'arraybuffer'
        });

        return Buffer.from(response.data);
    }

    throw new Error('Unsupported image source received for background removal');
}

function isNearWhite(raw, pixelIndex) {
    const offset = pixelIndex * 4;
    const alpha = raw[offset + 3];

    if (alpha === 0) return false;

    return (
        raw[offset] >= WHITE_THRESHOLD &&
        raw[offset + 1] >= WHITE_THRESHOLD &&
        raw[offset + 2] >= WHITE_THRESHOLD
    );
}

async function removeWhiteBackgroundLocally(imageSource) {
    const inputBuffer = await loadImageBuffer(imageSource);
    const { data, info } = await sharp(inputBuffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const raw = new Uint8ClampedArray(data);
    const { width, height } = info;
    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0;
    let tail = 0;

    const enqueueIfBackground = (x, y) => {
        const index = (y * width) + x;

        if (visited[index] || !isNearWhite(raw, index)) {
            return;
        }

        visited[index] = 1;
        queue[tail] = index;
        tail += 1;
    };

    for (let x = 0; x < width; x += 1) {
        enqueueIfBackground(x, 0);
        enqueueIfBackground(x, height - 1);
    }

    for (let y = 0; y < height; y += 1) {
        enqueueIfBackground(0, y);
        enqueueIfBackground(width - 1, y);
    }

    while (head < tail) {
        const index = queue[head];
        head += 1;

        raw[(index * 4) + 3] = 0;

        const x = index % width;
        const y = Math.floor(index / width);

        if (x > 0) enqueueIfBackground(x - 1, y);
        if (x < width - 1) enqueueIfBackground(x + 1, y);
        if (y > 0) enqueueIfBackground(x, y - 1);
        if (y < height - 1) enqueueIfBackground(x, y + 1);
    }

    const outputBuffer = await sharp(Buffer.from(raw), {
        raw: {
            width,
            height,
            channels: 4
        }
    })
        .png()
        .toBuffer();

    return `data:image/png;base64,${outputBuffer.toString('base64')}`;
}

export const removeBgService = {
    async process(imageSource) {
        if (!process.env.REMOVE_BG_API_KEY) {
            console.warn('REMOVE_BG_API_KEY missing, using local white-background removal fallback.');
            return removeWhiteBackgroundLocally(imageSource);
        }

        try {
            console.log('✂️ Removing background...');
            const buffer = await loadImageBuffer(imageSource);

            const formData = new FormData();
            formData.append('image_file', buffer, { filename: 'design.png' });
            formData.append('size', 'auto');
            formData.append('format', 'png');
            formData.append('type', 'auto');
            formData.append('alpha_matting', 'true');
            formData.append('alpha_matting_foreground_threshold', '240');
            formData.append('alpha_matting_background_threshold', '10');
            formData.append('alpha_matting_erode_size', '8');

            const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'X-Api-Key': process.env.REMOVE_BG_API_KEY
                },
                responseType: 'arraybuffer'
            });

            // Convert back to base64 so imageStorage can handle it as usual
            return `data:image/png;base64,${Buffer.from(response.data).toString('base64')}`;
        } catch (error) {
            console.error('Background removal failed:', error.response?.data?.toString() || error.message);
            return removeWhiteBackgroundLocally(imageSource);
        }
    }
};
