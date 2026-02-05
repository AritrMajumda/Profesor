// Profesor AI - Question generation and evaluation logic

// Sample questions template - Stricter "Viva Voce" style
const questionTemplates = [
    {
        type: 'conceptual',
        template: (topic) => `Explain the theoretical justification for ${topic} as presented in the paper. Why is this approach necessary?`,
        followUp: (topic) => `Crucially, what are the specific limitations of ${topic} mentioned by the authors?`,
    },
    {
        type: 'methodology',
        template: (topic) => `Critically analyze the methodology used for ${topic}. How does it differ from conventional approaches?`,
        followUp: (topic) => `If you were to replicate the study on ${topic}, what specific variables would you need to control?`,
    },
    {
        type: 'analysis',
        template: (topic) => `The paper discusses ${topic}. Evaluate the strength of the evidence provided for this claim.`,
        followUp: (topic) => `Are there alternative interpretations of the ${topic} results that the authors might have overlooked?`,
    },
    {
        type: 'critical',
        template: (topic) => `What is the most significant contribution of this paper regarding ${topic}, and why?`,
        followUp: (topic) => `How does the treatment of ${topic} here contradict or support previous literature?`,
    },
    {
        type: 'synthesis',
        template: (topic) => `Synthesize the findings on ${topic}. How do they support the paper's core hypothesis?`,
        followUp: (topic) => `What is the single weakest point in their argument about ${topic}?`,
    },
];

// Extract key topics from paper content
function extractTopics(content) {
    // Simple extraction - looking for capitalized phrases and key terms
    const sentences = content.split(/[.!?]+/);
    const topics = [];

    // Common academic keywords to look for
    const keywords = [
        'method', 'approach', 'framework', 'model', 'analysis', 'result',
        'finding', 'hypothesis', 'theory', 'experiment', 'data', 'study',
        'research', 'conclusion', 'implication', 'significance', 'contribution'
    ];

    sentences.forEach(sentence => {
        const words = sentence.trim().split(/\s+/);
        words.forEach((word, idx) => {
            // Look for capitalized words that might be key terms
            if (word.length > 4 && /^[A-Z]/.test(word) && !/^(The|This|That|These|Those|However|Therefore|Moreover)$/.test(word)) {
                topics.push(word.replace(/[^a-zA-Z]/g, ''));
            }
            // Look for phrases near keywords
            keywords.forEach(kw => {
                if (word.toLowerCase().includes(kw) && idx > 0) {
                    const phrase = words.slice(Math.max(0, idx - 2), idx + 2).join(' ');
                    if (phrase.length > 10) {
                        topics.push(phrase.replace(/[^a-zA-Z\s]/g, '').trim());
                    }
                }
            });
        });
    });

    // Remove duplicates and empty strings
    return [...new Set(topics.filter(t => t.length > 3))].slice(0, 10);
}

// Generate questions based on paper content
export function generateQuestions(content, numQuestions = 5) {
    const topics = extractTopics(content);
    const questions = [];

    if (topics.length === 0) {
        // Fallback generic questions
        topics.push('the main research question', 'the methodology', 'the key findings', 'the conclusions', 'future work');
    }

    for (let i = 0; i < numQuestions; i++) {
        const template = questionTemplates[i % questionTemplates.length];
        const topic = topics[i % topics.length];

        questions.push({
            id: i + 1,
            main: template.template(topic),
            followUp: template.followUp(topic),
            topic: topic,
            type: template.type,
        });
    }

    return questions;
}

// Evaluate answer and generate feedback
export function evaluateAnswer(answer, question, paperContent) {
    // Score based on answer length and keyword presence
    const answerLower = answer.toLowerCase();
    const paperLower = paperContent.toLowerCase();

    let score = 5; // Base score
    let feedbackParts = [];

    // Check answer length
    const wordCount = answer.split(/\s+/).length;
    if (wordCount < 10) {
        score -= 2;
        feedbackParts.push("Your answer is too brief. A thorough explanation requires more detail.");
    } else if (wordCount > 30) {
        score += 1;
        feedbackParts.push("Good level of detail in your response.");
    }

    // Check if answer references key terms from the paper
    const keyTerms = extractTopics(paperContent).slice(0, 5);
    const termsUsed = keyTerms.filter(term =>
        answerLower.includes(term.toLowerCase())
    );

    if (termsUsed.length >= 2) {
        score += 2;
        feedbackParts.push("You correctly referenced key concepts from the paper.");
    } else if (termsUsed.length === 0) {
        score -= 1;
        feedbackParts.push("Your answer lacks specific references to the paper's terminology.");
    }

    // Check for vague language
    const vagueTerms = ['maybe', 'probably', 'i think', 'i guess', 'sort of', 'kind of'];
    const vagueCount = vagueTerms.filter(t => answerLower.includes(t)).length;
    if (vagueCount > 0) {
        score -= vagueCount;
        feedbackParts.push("Avoid vague language. Be more assertive and precise.");
    }

    // Check for structure indicators
    const structureTerms = ['first', 'second', 'because', 'therefore', 'however', 'specifically', 'for example'];
    const hasStructure = structureTerms.some(t => answerLower.includes(t));
    if (hasStructure) {
        score += 1;
        feedbackParts.push("Good use of structured argumentation.");
    }

    // Clamp score
    score = Math.max(1, Math.min(10, score));

    // Generate feedback message
    let feedbackMessage = feedbackParts.join(' ');

    if (score >= 8) {
        feedbackMessage = "Excellent response. " + feedbackMessage;
    } else if (score >= 6) {
        feedbackMessage = "Satisfactory answer, but there's room for improvement. " + feedbackMessage;
    } else if (score >= 4) {
        feedbackMessage = "Your understanding appears superficial. " + feedbackMessage;
    } else {
        feedbackMessage = "This response is inadequate. " + feedbackMessage;
    }

    return { score, feedback: feedbackMessage };
}

// Profesor persona responses
export const profesorResponses = {
    greeting: (paperTitle) =>
        `Good. I am Profesor. I have reviewed "${paperTitle || 'your submitted paper'}". Let us see if you truly understand its contents. I will ask you 5 questions. Answer precisely and cite the paper where relevant. We begin now.`,

    afterCorrect: [
        "Acceptable. But let's probe deeper.",
        "That is correct. However, I wonder if you understand the nuance.",
        "Yes. Now explain further.",
        "Adequate response. Moving on.",
    ],

    afterPartial: [
        "Partially correct. You missed a key aspect.",
        "You grasp the basics, but your understanding is incomplete.",
        "Hmm. Not entirely wrong, but far from comprehensive.",
        "You're circling the answer without hitting the mark.",
    ],

    afterIncorrect: [
        "That is incorrect based on the paper.",
        "No. That contradicts what the authors clearly stated.",
        "I'm afraid you've misunderstood this completely.",
        "Incorrect. Did you actually read this section?",
    ],

    followUp: [
        "Now, follow-up question: ",
        "Let me probe deeper: ",
        "Explain further: ",
        "But consider this: ",
    ],

    nextQuestion: [
        "Next question.",
        "Moving on.",
        "Let us proceed.",
        "Question {n}.",
    ],

    examComplete: (avgScore) => {
        if (avgScore >= 8) {
            return "The examination is complete. Your understanding is commendable. You have demonstrated genuine comprehension of the material.";
        } else if (avgScore >= 6) {
            return "The examination is complete. Your performance was adequate, though there are clear gaps in your understanding. More study is advised.";
        } else if (avgScore >= 4) {
            return "The examination is complete. Your grasp of this material is concerning. I strongly recommend revisiting the paper thoroughly.";
        } else {
            return "The examination is complete. I am... disappointed. Your responses suggest you may not have read this paper at all. This requires serious attention.";
        }
    },

    getRandomResponse: (type) => {
        const responses = profesorResponses[type];
        if (Array.isArray(responses)) {
            return responses[Math.floor(Math.random() * responses.length)];
        }
        return responses;
    },
};

// Format time duration
export function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Get score category
export function getScoreCategory(score) {
    if (score >= 8) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
}

// Get session score class
export function getSessionScoreClass(score) {
    if (score >= 8) return 'excellent';
    if (score >= 6) return 'good';
    if (score >= 4) return 'average';
    return 'poor';
}
