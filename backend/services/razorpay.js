import RazorpayModule from 'razorpay';
import crypto from 'crypto';

let razorpayInstance = null;

// Initialize inside a function to ensure process.env is populated
const getRazorpay = () => {
    if (razorpayInstance) return razorpayInstance;

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
        throw new Error('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing from .env');
    }

    razorpayInstance = new RazorpayModule({
        key_id: key_id,
        key_secret: key_secret
    });

    return razorpayInstance;
};

export const razorpayService = {
    async createOrder(amountInPaise, orderId, customerEmail, customerName) {
        try {
            console.log(`💳 Creating Razorpay order for ₹${amountInPaise / 100}...`);
            
            const rzp = getRazorpay();
            const order = await rzp.orders.create({
                amount: Math.round(amountInPaise), // Must be integer paise
                currency: 'INR',
                receipt: orderId.substring(0, 40), // Receipt limit is 40 chars
                notes: {
                    order_id: orderId,
                    email: customerEmail,
                    name: customerName
                }
            });

            return order;
        } catch (error) {
            // Razorpay errors are often objects, not standard Error instances
            const errorMsg = error.description || error.error?.description || JSON.stringify(error);
            console.error('Razorpay API Error:', errorMsg);
            throw new Error(errorMsg);
        }
    },

    async verifySignature(orderId, paymentId, signature) {
        try {
            const key_secret = process.env.RAZORPAY_KEY_SECRET;
            const generatedSignature = crypto
                .createHmac('sha256', key_secret)
                .update(`${orderId}|${paymentId}`)
                .digest('hex');

            return generatedSignature === signature;
        } catch (error) {
            console.error('Signature verification error:', error.message);
            return false;
        }
    }
};