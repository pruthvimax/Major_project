import { Request, Response } from 'express';
import Product from '../models/Product';
import Order from '../models/Order';

interface AuthRequest extends Request {
  user?: any;
}

export const handleChatbotQuery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message, language = 'en' } = req.body;
    const userId = req.user?._id;
    const userRole = req.user?.role || 'buyer';

    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, message: 'Message is required' });
      return;
    }

    const cleanMsg = message.trim().toLowerCase();

    // Query active products for agricultural & inventory context
    const products = await Product.find({ quantity: { $gt: 0 } })
      .limit(6)
      .select('name price unit category isOrganic quantity');

    let orderCount = 0;
    if (userId) {
      if (userRole === 'buyer') {
        orderCount = await Order.countDocuments({ buyer: userId });
      } else if (userRole === 'farmer') {
        orderCount = await Order.countDocuments({ farmer: userId });
      }
    }

    // Build intelligent multi-lingual response
    let reply = '';

    // Greetings
    if (cleanMsg.includes('hi') || cleanMsg.includes('hello') || cleanMsg.includes('नमस्ते') || cleanMsg.includes('ഹലോ') || cleanMsg.includes('ಹಲೋ')) {
      if (language === 'hi') {
        reply = `नमस्ते! मैं आपका कृषि सहायक हूँ। मैं आपकी कृषि बाजार में फसलें ढूंढने, ऑर्डर ट्रैक करने या बाजार भाव देखने में कैसे मदद कर सकता हूँ?`;
      } else if (language === 'kn') {
        reply = `ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಕೃಷಿ ಸಹಾಯಕ. ಉತ್ಪನ್ನಗಳನ್ನು ಹುಡುಕಲು, ಆರ್ಡರ್ ವೀಕ್ಷಿಸಲು ಅಥವಾ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ತಿಳಿಯಲು ಸಹಾಯ ಬೇಕೇ?`;
      } else if (language === 'ml') {
        reply = `നമസ്കാരം! ഞാൻ നിങ്ങളുടെ കൃഷി സഹായിയാണ്. ഉൽപ്പന്നങ്ങൾ തിരയാനും ഓർഡറുകൾ ട്രാക്ക് ചെയ്യാനും ഞാൻ സഹായിക്കാം.`;
      } else {
        reply = `Hello! I am your Krishi AI Assistant. How can I help you with crops, products, or order tracking today?`;
      }
    }
    // Vegetables & Fruits / Products query
    else if (cleanMsg.includes('vegetable') || cleanMsg.includes('fruit') || cleanMsg.includes('product') || cleanMsg.includes('सब्जी') || cleanMsg.includes('ತರಕಾರಿ') || cleanMsg.includes('പച്ചക്കറി')) {
      const productList = products.map((p) => `${p.name} (₹${p.price}/${p.unit})`).join(', ');
      if (language === 'hi') {
        reply = `ताजा उपलब्ध उत्पाद हैं: ${productList || 'कोई उत्पाद नहीं उपलब्ध है'}। आप ब्राउज़ सेक्शन से खरीद सकते हैं।`;
      } else if (language === 'kn') {
        reply = `ಪ್ರಸ್ತುತ ಲಭ್ಯವಿರುವ ಉತ್ಪನ್ನಗಳು: ${productList || 'ಯಾವುದೇ ಉತ್ಪನ್ನ ಲಭ್ಯವಿಲ್ಲ'}।`;
      } else if (language === 'ml') {
        reply = `ഇപ്പോൾ ലഭ്യമായ ഉൽപ്പന്നങ്ങൾ: ${productList || 'ഉൽപ്പന്നങ്ങൾ ലഭ്യമല്ല'}.`;
      } else {
        reply = `Currently available fresh produce: ${productList || 'No products available'}. You can browse and order from the marketplace!`;
      }
    }
    // Orders query
    else if (cleanMsg.includes('order') || cleanMsg.includes('ऑर्डर') || cleanMsg.includes('ಆರ್ಡರ್') || cleanMsg.includes('ഓർഡർ')) {
      if (language === 'hi') {
        reply = `आपके पास कुल ${orderCount} ऑर्डर हैं। अधिक विवरण के लिए 'मेरे ऑर्डर' सेक्शन पर जाएं।`;
      } else if (language === 'kn') {
        reply = `ನಿಮ್ಮ ಬಳಿ ಒಟ್ಟು ${orderCount} ಆರ್ಡರ್‌ಗಳಿವೆ. ವಿವರಗಳಿಗೆ 'ನನ್ನ ಆರ್ಡರ್‌ಗಳು' ನೋಡಿ.`;
      } else if (language === 'ml') {
        reply = `നിങ്ങൾക്ക് ആകെ ${orderCount} ഓർഡറുകൾ ഉണ്ട്. കൂടുതൽ വിവരങ്ങൾക്ക് 'എന്റെ ഓർഡറുകൾ' സന്ദർശിക്കുക.`;
      } else {
        reply = `You currently have ${orderCount} total orders. Check the 'My Orders' section for full status progression!`;
      }
    }
    // Organic products query
    else if (cleanMsg.includes('organic') || cleanMsg.includes('जैविक') || cleanMsg.includes('ಸಾವಯವ') || cleanMsg.includes('ജൈവം')) {
      const organicProds = products.filter((p) => p.isOrganic).map((p) => p.name).join(', ');
      if (language === 'hi') {
        reply = `100% प्रमाणित जैविक उत्पाद हैं: ${organicProds || 'ताजा जैविक सब्जियां उपलब्ध हैं'}।`;
      } else if (language === 'kn') {
        reply = `ಲಭ್ಯವಿರುವ ಸಾವಯವ ಉತ್ಪನ್ನಗಳು: ${organicProds || 'ಸಾವಯವ ತರಕಾರಿಗಳು ಲಭ್ಯವಿದೆ'}।`;
      } else if (language === 'ml') {
        reply = `ലഭ്യമായ ജൈവ ഉൽപ്പന്നങ്ങൾ: ${organicProds || 'ജൈവ പച്ചക്കറികൾ ലഭ്യമാണ്'}.`;
      } else {
        reply = `Verified organic products available: ${organicProds || 'Fresh organic vegetables available'}.`;
      }
    }
    // General agricultural help / default response
    else {
      if (language === 'hi') {
        reply = `कृषि बाजार सहायक में आपका स्वागत है। आप मुझसे उत्पादों, कीमतों, ऑर्डर स्थिति या खेती संबंधी सहायता पूछ सकते हैं।`;
      } else if (language === 'kn') {
        reply = `ಕೃಷಿ ಬಜಾರ್ ಸಹಾಯಕಕ್ಕೆ ಸ್ವಾಗತ. ನೀವು ಉತ್ಪನ್ನಗಳು, ಬೆಲೆಗಳು ಅಥವಾ ಆರ್ಡರ್ ಸ್ಥಿತಿಯ ಬಗ್ಗೆ ಕೇಳಬಹುದು.`;
      } else if (language === 'ml') {
        reply = `കൃഷി ബസാർ സഹായിയിലേക്ക് സ്വാഗതം. ഉൽപ്പന്നങ്ങൾ, വിലകൾ, അല്ലെങ്കിൽ ഓർഡർ വിവരങ്ങൾ ചോദിക്കാം.`;
      } else {
        reply = `Welcome to Krishi Market Assistant! I can help you search crops, compare prices, check active orders, or get farming support.`;
      }
    }

    res.json({
      success: true,
      reply,
      language,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to process AI query',
    });
  }
};
