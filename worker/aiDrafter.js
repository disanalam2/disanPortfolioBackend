const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
require('dotenv').config();

const ai = process.env.GEMINI_API_KEY 
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) 
    : null;

async function generateColdEmail(businessName, niche, leadType, websiteIssues = null, abVersion = 'A', socialMediaContext = '', intentAnalysis = '', rating = null, screenshotUrl = null, availableDomain = null, competitors = [], decisionMaker = null) {
    if (!ai || !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key') {
        return {
            main: `Hi ${decisionMaker || 'Team'},\n\nI noticed ${businessName} might benefit from a strategic digital presence. Let's talk.\n\nBest,\nDisan`,
            follow_up_1: `Hi ${decisionMaker || 'Team'},\n\nJust following up on my previous email. Let me know if you're interested in discussing a potential partnership.\n\nBest,\nDisan`,
            follow_up_2: `Hi ${decisionMaker || 'Team'},\n\nThis is my final email. If you ever need digital strategy services, feel free to reach out.\n\nBest,\nDisan`
        };
    }

    try {
        const toneInstruction = "Use a HIGHLY PROFESSIONAL, consultative, and value-driven tone. Do not use negative, aggressive, or taunting language. Position yourself as a strategic partner offering constructive solutions.";

        const prompt = `You are an elite B2B Digital Strategist and Consultant. Write a 3-part cold email sequence for a business named "${businessName}" (Niche: ${niche}).
        
        CONTEXT:
        Lead Type: ${leadType} (bad_website or no_website)
        Website Issues (if any): ${websiteIssues || 'N/A'}
        Social Media Context: ${socialMediaContext || 'N/A'}
        Deep-Dive Intent & Lifecycle Analysis: ${intentAnalysis || 'N/A'}
        Google Maps Rating: ${rating || 'N/A'}
        
        CONSULTATIVE PITCHING STRATEGY:
        - If [NO WEBSITE / TRADITIONAL BUSINESS]: Educate them on the clear ROI (Return on Investment) of moving from an offline traditional model to having a digital presence. Explain how a digital presence acts as an automated system that brings in leads while they focus on their core business.
        - NICHE SPECIFIC PITCHING: If the niche is a Restaurant/Cafe, mention how Zomato/Swiggy takes 25% commission and they need their own direct ordering system to keep 100% profits. If Doctor/Clinic/Dentist, mention how people are searching for "Dentist near me" and they need a "Book Appointment" feature to reduce reception crowding. If Boutique/Retail/Shop, mention how people keep asking for prices in DMs and leaving, so they need an automated catalog website to filter serious buyers.
        - If Google Maps Rating is provided and is less than 4.0 (e.g. 3.5), gently and professionally mention: "I noticed your rating and I specialize in building seamless digital experiences (like online booking/ordering) that often help businesses significantly improve customer satisfaction and recover their 5-star reputation." DO NOT taunt them.
        - If [PREMIUM OFFLINE LEAD]: Tell them that since they are already the highest-rated offline, it is time to build a premium website to match their offline reputation and dominate online as well.
        - If [EXPIRED DOMAIN LEAD]: Politely inform them that their website is currently down ("This site can't be reached") and they are losing trust and customers. Offer to recover their digital presence immediately.
        - If [NEW DOMAIN LEAD]: Congratulate them on their new domain and offer a professional launch strategy.
        - If [FB AD LEAD]: Professionally advise that directing Meta Ad traffic to a dedicated landing page instead of WhatsApp can significantly increase ROI and reduce wasted ad spend.
        - If [FUNDED STARTUP LEAD]: Congratulate them on their recent funding (Seed/Series A). Pitch that now that they have funding and are scaling rapidly, it is time to upgrade their old "Jugaad" (workaround) MVP software into an "Enterprise Level Custom System".
        - If [WHATSAPP LEAD]: Tell them managing WhatsApp chats manually is exhausting and offer to automate it by turning their WhatsApp Catalog into a proper e-commerce/booking website.
        - If [LINKTREE LEAD]: Tell them that using Linktree reduces brand trust, and they need a custom domain to build real brand value.
        - If [DIRECTORY LEAD]: Tell them that JustDial/Directories put them right next to their competitors, and they need a direct website to capture exclusive leads.
        - If [ZOMATO LEAD]: Tell them to stop giving away 30% commission and let you build a direct-ordering website where they keep 100% of the profits.
        - If [HIRING LEAD]: Tell them that since they are expanding their team, it is the perfect time to build a robust digital presence that matches their new growth.
        - If [GOOGLE BUSINESS SITE LEAD]: Urgently inform them that Google has shut down their free .business.site websites, meaning they are losing customers right now, and they need a real custom domain immediately.
        - If [FREE DOMAIN LEAD]: Tell them that using a free domain (.wixsite or .blogspot) looks unprofessional to clients, and they need a premium .com domain to build brand authority.
        - THE FREE PR TRICK & SOCIAL SHOUTOUT: Congratulate them on having an excellent local reputation. Tell them you have featured their business in your agency's "Top 10 Rated Businesses" list (use the provided PR link) AND you will be giving them a free shoutout on your fast-growing social media page to your local followers. Then mention that you noticed they don't have an official website, and offer to build one to match their Top 10 status.
        
        - THE SLEEP MODE PITCH: Emphasize that business owners lose customers to competitors when their shop/office is closed or when they miss a call. Pitch the website as a "24/7 digital salesman" that works for free, taking orders and bookings even at 2 AM.
        
        - THE REVIEW MACHINE ANGLE: Pitch that you aren't just selling a website, you are offering a "Review Engine". Explain that anyone who books/orders through the new website will automatically receive a WhatsApp message the next day asking for a 5-star Google review, massively boosting their local ranking.

        **B2B PARTNERSHIP / WHITE-LABEL PITCH (USE ONLY IF LEAD IS A CA, ACCOUNTANT, MARKETING AGENCY, SEO AGENCY, OR DESIGNER)**:
        - Do NOT pitch them a website for themselves. They are B2B partners.
        - Pitch a lucrative partnership: "You already have the clients (startups/new registrations). Let me handle the tech/website building for your clients."
        - Offer a flat 15% to 20% commission (₹2000-₹5000) for every client they refer. Position it as a new revenue stream for their agency with zero extra work.
        
        PSYCHOLOGICAL TRIGGERS:
        ${availableDomain ? `- THE DOMAIN HIJACK WARNING: Urgently tell them that their exact business domain name (${availableDomain}) is currently available for a very low price. Warn them that if a competitor or domain squatter buys it, they will never be able to use their own name for their website. Offer to register it for them immediately.` : ''}
        ${competitors && competitors.length > 0 ? `- FOMO (FEAR OF MISSING OUT): Tell them that you noticed their local competitors like ${competitors.join(' and ')} are already taking online orders/bookings through their websites, meaning they are actively losing their local traffic to them.` : ''}
        
        General Strategy: Focus on revenue growth, operational efficiency, and ROI.
        
        CRITICAL: Address the email to "${decisionMaker ? 'Hi ' + decisionMaker : 'Hi Team'}" and NOT "Dear Business Owner".
        
        ${toneInstruction}
        `;

        let finalPrompt = prompt;        
        if (leadType === 'bad_website') {
            finalPrompt += `The purpose of the main email is to professionally inform them that you conducted a brief digital audit of their website and found some technical areas for improvement: ${websiteIssues}. Offer your expertise to resolve these bottlenecks to enhance their customer experience. 
            SPECIAL RULES FOR BAD WEBSITES:
            - If "mobile_responsive" is false in the issues, tell them aggressively but politely that their website is breaking on phones, meaning they are losing 80% of their mobile customers.
            - If "no_tracking" is true in the issues, tell them they are "marketing blind" because they don't have Facebook Pixel or Google Analytics installed, and offer to build a "Marketing-Ready" website.
            - If "is_wp_vulnerable" is true in the issues, tell them that their website is built on an outdated, vulnerable version of WordPress and can be easily hacked, risking their customer data. Tell them they need an immediate security migration to a modern platform.
            Main email should be under 150 words.`;
        } else {
            finalPrompt += `The purpose of the main email is to professionally offer a strategic digital presence. Mention how a proper website can unlock new local revenue streams and elevate their brand. Main email should be under 150 words.`;
        }

        finalPrompt += `
        Follow-up 1 should be very short (under 50 words), sent 3 days later, gently bumping the main email.
        Follow-up 2 should be a "breakup" email (under 50 words), sent 3 days after the first follow-up, saying goodbye but leaving the door open.
        
        CRITICAL INSTRUCTION: In the main email, you MUST explicitly tell the recipient to "Click the link below to watch the video audit I made for you" and ensure the video link provided in the context is prominently displayed. Do not ask them to reply directly.
        
        Do not include placeholders like [Your Name] in the signature.
        Respond ONLY with a valid JSON object in this exact format, with no markdown formatting or backticks:
        {
          "main": "main email text here",
          "follow_up_1": "follow up 1 text here",
          "follow_up_2": "follow up 2 text here"
        }`;

        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        let parts = [{ text: finalPrompt }];

        // Visual AI Check (Ugly Design Filter)
        if (screenshotUrl && leadType === 'bad_website') {
            try {
                const imgResp = await axios.get(screenshotUrl, { responseType: 'arraybuffer' });
                parts.push({
                    inlineData: {
                        data: Buffer.from(imgResp.data).toString("base64"),
                        mimeType: "image/jpeg"
                    }
                });
                parts[0].text += `\n\nCRITICAL VISUAL AI TASK: Look at the attached screenshot of their current website. Does the design look outdated (like it was made in 2010), cluttered, or ugly? If yes, explicitly mention in the email that their brand's visual identity feels a bit outdated and you can give them a Premium UI/UX overhaul to match their true brand value.`;
            } catch (e) {
                console.error("Failed to fetch screenshot for AI vision", e.message);
            }
        }

        const response = await model.generateContent(parts);

        const text = response.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        console.error('Error generating email with Gemini:', error);
        return fallbackJSON;
    }
}

async function findBusinessDetails(businessName, address) {
    if (!ai || !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key') {
        return { email: null, phone: null, timezone: 'Asia/Kolkata', social_media_context: '', intent_analysis: '' };
    }

    try {
        const prompt = `You are a highly advanced Omni-Channel Lead Scraper and Intent Detective.
        Your target is the business named "${businessName}" located near "${address}".
        
        CRITICAL TASKS:
        1. DEEP SEARCH: Use your search tool to check Facebook (site:facebook.com), Instagram (site:instagram.com), LinkedIn (site:linkedin.com), Threads, and JustDial/Yelp for this specific business.
        2. LIFECYCLE & QUALITY CHECK: Identify if this business is worth our time. CRITICAL RULE: If they have an active Instagram, Facebook, Threads, YouTube, or ANY social media presence, OR if they have a Google Business ID, YOU MUST CONSIDER THEM 100% QUALIFIED and NEVER skip them. Also, if they are selling on Amazon, Flipkart, Myntra, or Shopify, consider them highly qualified. DO NOT filter out small shops if they meet these criteria.
        3. EXTRACT MAXIMUM CONTACTS: Find EVERY public email address and EVERY phone number/WhatsApp associated with them across all platforms. DO NOT GUESS. Also extract their Instagram, Facebook, or LinkedIn URL if found.
        4. SNIPER TARGETING: Search deeply for the specific Name of the Owner, Founder, Director, or Manager of this business. If you find a human name, extract it into 'decision_maker_name'. If you cannot find a specific human name, return null.
        5. INTENT & LIFECYCLE ANALYSIS: Analyze their digital footprint. Are they newly opened? Are they overwhelmed with WhatsApp messages (wholesaler)? Are they a big restaurant relying on 3rd party delivery apps? Write a 2-3 sentence 'intent_analysis' explaining their exact lifecycle stage and WHY they need my web development/digital services. Append any social media URLs you found at the end of this analysis for the user to see.
        6. SOCIAL CONTEXT: Write a 1-sentence 'social_media_context' about a recent post they made to use as a personalized icebreaker in the email.
        7. TIMEZONE: Identify the IANA Timezone for "${address}" (e.g., "America/New_York", "Asia/Kolkata").
        
        Respond ONLY with a valid JSON object in this exact format, with no markdown formatting or backticks:
        {
          "email": "comma_separated_emails_or_null", 
          "phone": "comma_separated_phones_or_null", 
          "decision_maker_name": "exact_name_or_null",
          "timezone": "Asia/Kolkata", 
          "social_media_context": "context_sentence",
          "intent_analysis": "intent_analysis_paragraph_with_social_urls_appended"
        }`;

        const model = ai.getGenerativeModel({
             model: 'gemini-2.5-flash',
             tools: [{ googleSearch: {} }]
        });
        
        const response = await model.generateContent(prompt);

        const text = response.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(text);
        
        if (!data.timezone) data.timezone = 'Asia/Kolkata';
        if (!data.social_media_context) data.social_media_context = '';
        if (!data.intent_analysis) data.intent_analysis = '';
        if (!data.decision_maker_name) data.decision_maker_name = null;
        
        return data;
    } catch (error) {
        console.error('Error finding details with Gemini:', error);
        return { email: null, phone: null, timezone: 'Asia/Kolkata', social_media_context: '', intent_analysis: '', decision_maker_name: null };
    }
}

module.exports = { generateColdEmail, findBusinessDetails };
