/**
 * SwapBot Local Fallback Responses
 * Used when ALL API providers (NVIDIA, Zhipu, OpenAI, Gemini) fail.
 * Each entry has:
 *   - keywords: string[] — words/phrases to match against user input (case-insensitive)
 *   - response: string   — the reply SwapBot will give
 */

const FALLBACK_RESPONSES = [
    // ── Greetings ──────────────────────────────────────────────────────────────
    {
        keywords: ["hello", "hi", "hey", "howdy", "sup", "what's up", "greetings"],
        response:
            "Hey there! 👋 I'm SwapBot, your AI companion on SwapChat! I'm running in offline mode right now, but I'm still here to help. What's on your mind?",
    },
    {
        keywords: ["good morning", "morning"],
        response: "Good morning! ☀️ Hope you're having a great start to your day! How can I help you?",
    },
    {
        keywords: ["good night", "goodnight", "night"],
        response: "Good night! 🌙 Sleep well and take care! I'll be here whenever you need me.",
    },
    {
        keywords: ["good afternoon", "afternoon"],
        response: "Good afternoon! 🌤️ Hope your day is going great! What can I do for you?",
    },
    {
        keywords: ["good evening", "evening"],
        response: "Good evening! 🌆 How was your day? Let me know if there's anything I can help with!",
    },

    // ── Identity / About SwapBot ───────────────────────────────────────────────
    {
        keywords: ["who are you", "what are you", "what is swapbot", "tell me about yourself", "introduce yourself"],
        response:
            "I'm SwapBot 🤖 — an AI assistant built right into SwapChat! I'm powered by multiple AI engines and here to help you draft messages, answer questions, brainstorm ideas, or just have a fun conversation. What can I do for you today?",
    },
    {
        keywords: ["what can you do", "your features", "help me", "capabilities", "abilities"],
        response:
            "Here's what I can help you with! 🚀\n\n• ✍️ **Draft messages** — Tell me the situation and I'll write it for you\n• 💡 **Brainstorm ideas** — Need inspiration? Just ask!\n• 😄 **Jokes & fun facts** — I love a good laugh\n• 📝 **Write poems or stories** — Creative writing? Yes!\n• 💬 **Answer questions** — I'll do my best!\n• 💪 **Motivational quotes** — When you need a boost\n\nJust type what's on your mind!",
    },

    // ── Drafting Messages ──────────────────────────────────────────────────────
    {
        keywords: ["draft a message", "write a message", "help me write", "compose", "write for me", "message to"],
        response:
            "I'd love to help you draft a message! ✍️ Here's a friendly template you can customize:\n\n*\"Hey [Name], I hope you're doing well! I wanted to reach out because [reason]. Looking forward to hearing from you!\"*\n\nTell me more about the situation and I'll make it more specific for you! 😊",
    },
    {
        keywords: ["apologize", "sorry message", "apology", "say sorry"],
        response:
            "Here's a heartfelt apology message for you: 💙\n\n*\"I sincerely apologize for [what happened]. I understand how that must have made you feel, and I truly regret it. I value our relationship and I'm committed to making things right. Please forgive me.\"*\n\nFeel free to personalize it!",
    },
    {
        keywords: ["thank you message", "thanks message", "appreciation", "gratitude message"],
        response:
            "Here's a warm thank-you message: 🙏\n\n*\"Thank you so much for [what they did]. It really means a lot to me and made a big difference. I'm truly grateful to have someone like you in my life!\"*\n\nAdjust it to fit your situation! 😊",
    },
    {
        keywords: ["birthday", "happy birthday", "birthday message"],
        response:
            "🎂 Happy Birthday message coming up!\n\n*\"Wishing you a day filled with joy, laughter, and all the things that make you smile! May this year bring you everything you've been hoping for. Happy Birthday! 🎉🎈\"*",
    },
    {
        keywords: ["congratulations", "congrats message", "well done"],
        response:
            "🎉 Congratulations message:\n\n*\"Congratulations on your incredible achievement! 🌟 All your hard work and dedication have truly paid off. I'm so proud of you and excited to see everything you accomplish next!\"*",
    },

    // ── Jokes ──────────────────────────────────────────────────────────────────
    {
        keywords: ["joke", "tell me a joke", "funny", "make me laugh", "humor"],
        response:
            "😄 Here's one for you:\n\nWhy don't scientists trust atoms?\n\n*Because they make up everything!* 🤣\n\nWant another one? Just say \"another joke\"!",
    },
    {
        keywords: ["another joke", "more jokes", "one more joke", "funnier"],
        response:
            "😂 Okay okay:\n\nWhy did the scarecrow win an award?\n\n*Because he was outstanding in his field!* 🌾\n\nI'll be here all week! 😄",
    },
    {
        keywords: ["pun", "puns", "dad joke"],
        response:
            "🤭 A classic dad joke:\n\n*I used to hate facial hair, but then it grew on me.*\n\nBa dum tss 🥁",
    },

    // ── Fun Facts ──────────────────────────────────────────────────────────────
    {
        keywords: ["fun fact", "interesting fact", "did you know", "tell me something interesting"],
        response:
            "🎉 Fun fact:\n\n*Honey never spoils! Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still perfectly edible.* 🍯\n\nPretty sweet, right? Want another one?",
    },
    {
        keywords: ["fact about space", "space fact", "universe", "planet", "stars"],
        response:
            "🌌 Space fact!\n\n*A day on Venus is longer than a year on Venus. It takes Venus about 243 Earth days to rotate on its axis, but only 225 Earth days to orbit the Sun!* 🪐\n\nMind-blowing, isn't it?",
    },
    {
        keywords: ["fact about animals", "animal fact", "wildlife"],
        response:
            "🐾 Animal fact!\n\n*Octopuses have three hearts, blue blood, and can taste with their arms! They're also incredibly intelligent and can solve puzzles.* 🐙\n\nNature is amazing!",
    },

    // ── Motivation / Quotes ────────────────────────────────────────────────────
    {
        keywords: ["motivational quote", "motivation", "inspire me", "inspirational", "encourage me", "uplift"],
        response:
            "💪 Here's something to fuel you:\n\n*\"The secret of getting ahead is getting started.\"* — Mark Twain\n\nYou've got this! 🚀 Every big journey starts with a single step.",
    },
    {
        keywords: ["quote", "life quote", "wisdom", "wise words"],
        response:
            "✨ Here's a timeless quote:\n\n*\"In the middle of every difficulty lies opportunity.\"* — Albert Einstein\n\nKind of makes you see things differently, doesn't it?",
    },

    // ── Poems ─────────────────────────────────────────────────────────────────
    {
        keywords: ["poem", "write a poem", "poetry", "short poem", "rhyme"],
        response:
            "📝 Here's a little poem for you:\n\n*In the hum of morning light,*\n*New possibilities take flight.*\n*Every step, a story told,*\n*Every day, a chance to be bold.*\n\nHope that brightens your day! ✨",
    },

    // ── Food ──────────────────────────────────────────────────────────────────
    {
        keywords: ["hungry", "food", "eat", "recipe", "what to eat", "snack"],
        response:
            "🍕 Feeling hungry? Here are some quick ideas:\n\n• 🥗 Fresh salad with avocado\n• 🍳 Scrambled eggs with toast\n• 🍜 Quick noodles with veggies\n• 🥪 A classic sandwich\n• 🍎 Fruits & nuts for a healthy snack\n\nWhat are you in the mood for?",
    },

    // ── Weather ───────────────────────────────────────────────────────────────
    {
        keywords: ["weather", "temperature", "rain", "sunny", "forecast"],
        response:
            "🌤️ I can't check live weather right now, but you can check:\n• Google: just type your city + weather\n• Weather.com\n• Your phone's built-in weather app\n\nStay prepared! ☂️",
    },

    // ── Time / Date ───────────────────────────────────────────────────────────
    {
        keywords: ["what time", "current time", "what day", "today's date", "what's today"],
        response: `🕐 Right now it's ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} and today is ${new Date().toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}. Hope that helps!`,
    },

    // ── Math / Calculations ───────────────────────────────────────────────────
    {
        keywords: ["calculate", "math", "what is", "solve", "addition", "subtract", "multiply", "divide"],
        response:
            "🔢 I can do basic math! For complex calculations, try Google or a calculator app. For quick sums, just type something like \"what is 15 × 8\" and I'll try my best! 😊",
    },

    // ── SwapChat Help ─────────────────────────────────────────────────────────
    {
        keywords: ["how to send", "how to message", "how to chat", "swapchat", "how does this app work"],
        response:
            "💬 SwapChat is super easy to use!\n\n1. 🔍 Search for a user in the sidebar\n2. 💬 Click their name to open a chat\n3. ✍️ Type your message and hit Send!\n\nYou can also make video calls, share media, and more. Enjoy chatting! 🎉",
    },
    {
        keywords: ["video call", "call someone", "start a call"],
        response:
            "📹 To start a video call in SwapChat:\n\n1. Open a conversation with the person you want to call\n2. Click the video camera icon at the top\n3. Wait for them to accept!\n\nMake sure your camera and microphone are allowed in your browser. 🎥",
    },

    // ── Feelings / Emotional Support ─────────────────────────────────────────
    {
        keywords: ["sad", "feeling down", "depressed", "unhappy", "upset", "lonely", "anxious", "stressed"],
        response:
            "💙 Hey, I hear you. It's completely okay to feel that way sometimes. You're not alone.\n\n*\"Even the darkest night will end, and the sun will rise.\"*\n\nTake a deep breath 🌬️, be kind to yourself, and remember — it gets better. I'm here if you want to talk! 🤗",
    },
    {
        keywords: ["happy", "excited", "great", "amazing", "wonderful", "awesome", "fantastic"],
        response:
            "🎉 That's amazing to hear!! Your energy is contagious! Keep that positivity going — you're doing great! 🌟",
    },
    {
        keywords: ["bored", "nothing to do", "boring"],
        response:
            "😄 Bored? Let's fix that! Try one of these:\n\n• 🎲 Ask me to tell you a fun fact\n• 😂 Ask me for a joke\n• 📝 Ask me to write a short story\n• 💡 Ask me to give you a challenge for the day\n\nWhat sounds fun?",
    },

    // ── Goodbye ───────────────────────────────────────────────────────────────
    {
        keywords: ["bye", "goodbye", "see you", "later", "take care", "farewell", "ciao", "gotta go"],
        response: "Goodbye! 👋 It was great chatting with you. Come back anytime — I'll be here! Take care! 😊",
    },

    // ── Thanks ────────────────────────────────────────────────────────────────
    {
        keywords: ["thank you", "thanks", "thank u", "ty", "thx", "appreciate"],
        response: "You're very welcome! 😊 Happy to help anytime. Is there anything else you'd like to know? 🌟",
    },

    // ── Love / Relationships ──────────────────────────────────────────────────
    {
        keywords: ["love message", "love letter", "crush", "propose", "romantic message", "express feelings"],
        response:
            "💕 Here's a heartfelt message:\n\n*\"Every time I see you, I'm reminded of how lucky I am. You bring so much warmth and joy into my life. I just wanted you to know — you mean everything to me.\"* 💌\n\nFeel free to personalize it with their name and your own words! 💝",
    },

    // ── Default (catch-all) ───────────────────────────────────────────────────
    {
        keywords: [],
        response:
            "🤔 Hmm, I'm in offline mode right now and may not have the best answer for that specific question. But I'm still here! Try asking me to:\n\n• 😄 Tell a joke\n• 🎉 Share a fun fact\n• ✍️ Draft a message\n• 💪 Give a motivational quote\n• 📝 Write a poem\n\nOr try again later when my AI brain is back online! 🚀",
    },
];

/**
 * Find the best matching response for a given user input.
 * Scans keywords in order; first match wins. Falls back to the default (last entry).
 */
export function getFallbackResponse(userInput) {
    const lower = userInput.toLowerCase();

    for (const entry of FALLBACK_RESPONSES) {
        if (entry.keywords.length === 0) continue; // skip default for now
        if (entry.keywords.some((kw) => lower.includes(kw))) {
            return entry.response;
        }
    }

    // Return the catch-all default
    return FALLBACK_RESPONSES[FALLBACK_RESPONSES.length - 1].response;
}

export default FALLBACK_RESPONSES;
