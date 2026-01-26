import { updateUserPreferences, getCurrentUser, getPersonas } from "./api.js";
import { resetTo } from "./navigation.js";
import { state } from "./state.js";

// Persona details fetched from backend
let PERSONA_DETAILS = null;

const QUESTIONS = [
  {
    id: "goal",
    prompt: "What do you want most from Pixie?",
    options: [
      { value: "clarity", label: "Clear numbers, trends, and explanations", persona: "the_analyst" },
      { value: "push", label: "Fast, decisive action steps", persona: "the_driver" },
      { value: "hype", label: "Motivation and encouragement", persona: "the_promoter" },
      { value: "support", label: "A calm partner who guides me", persona: "the_supportive" },
    ],
  },
  {
    id: "tone",
    prompt: "What tone keeps you engaged?",
    options: [
      { value: "formal", label: "Formal and precise", persona: "the_analyst" },
      { value: "concise", label: "Short, direct, and confident", persona: "the_driver" },
      { value: "excited", label: "Upbeat with emojis", persona: "the_promoter" },
      { value: "warm", label: "Warm and empathetic", persona: "the_supportive" },
    ],
  },
  {
    id: "decision",
    prompt: "How do you prefer to make financial decisions?",
    options: [
      { value: "data", label: "After seeing data and comparisons", persona: "the_analyst" },
      { value: "decide", label: "Quickly with a recommended option", persona: "the_driver" },
      { value: "vision", label: "With a motivating story of the outcome", persona: "the_promoter" },
      { value: "talk", label: "With gentle guidance and reassurance", persona: "the_supportive" },
    ],
  },
  {
    id: "feedback",
    prompt: "What feedback style works best for you?",
    options: [
      { value: "nuanced", label: "Detailed breakdowns and assumptions", persona: "the_analyst" },
      { value: "blunt", label: "Direct and to the point", persona: "the_driver" },
      { value: "celebrate", label: "Highlight wins and momentum", persona: "the_promoter" },
      { value: "gentle", label: "Positive framing and small steps", persona: "the_supportive" },
    ],
  },
  {
    id: "planning",
    prompt: "When plans change, you want Pixie to…",
    options: [
      { value: "analyze", label: "Re-evaluate the numbers and options", persona: "the_analyst" },
      { value: "recalibrate", label: "Give a crisp new plan", persona: "the_driver" },
      { value: "inspire", label: "Keep me excited about the goal", persona: "the_promoter" },
      { value: "reassure", label: "Keep it calm and manageable", persona: "the_supportive" },
    ],
  },
  {
    id: "cadence",
    prompt: "How should Pixie check in?",
    options: [
      { value: "report", label: "Periodic reports with metrics", persona: "the_analyst" },
      { value: "prompt", label: "Short nudges with clear asks", persona: "the_driver" },
      { value: "cheer", label: "Friendly pings with encouragement", persona: "the_promoter" },
      { value: "care", label: "Supportive notes making sure I'm ok", persona: "the_supportive" },
    ],
  },
];

const TIE_BREAK_ORDER = ["the_supportive", "the_driver", "the_analyst", "the_promoter"];

const VALID_INTERESTS = [
  "restaurants", "food_delivery", "travel", "fitness", "fashion",
  "technology", "entertainment", "sports", "gaming", "education",
  "family", "home_improvement", "health"
];

const VALID_MOTIVATIONS = [
  "saving_money", "financial_independence", "family_time", "minimalism",
  "financial_security", "long_term_stability", "freedom", "peace_of_mind",
  "family_support", "goal_achievement"
];

let currentQuestionIndex = 0;
let answers = {};
let selectedInterests = [];
let selectedMotivations = [];

function formatLabel(str) {
  return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function renderCurrentQuestion() {
  const container = document.getElementById("persona-quiz-question-container");
  if (!container) return;
  
  // Check if we're on interests or motivations page
  if (currentQuestionIndex === QUESTIONS.length) {
    renderInterestsPage(container);
  } else if (currentQuestionIndex === QUESTIONS.length + 1) {
    renderMotivationsPage(container);
  } else {
    // Regular persona question
    const q = QUESTIONS[currentQuestionIndex];
    const options = q.options.map((opt) => {
      const inputId = `persona-${q.id}-${opt.value}`;
      const isChecked = answers[q.id] === opt.persona ? 'checked' : '';
      return `
        <label for="${inputId}" class="flex items-start gap-3 p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition last:border-0">
          <input type="radio" name="${q.id}" id="${inputId}" value="${opt.persona}" class="mt-0.5 text-indigo-600" ${isChecked} />
          <span class="text-slate-900">${opt.label}</span>
        </label>
      `;
    }).join("\n");

    container.innerHTML = `
      <h3 class="text-xl font-bold text-slate-900 mb-6">${q.prompt}</h3>
      <div class="space-y-0 border border-slate-200 rounded-lg overflow-hidden">
        ${options}
      </div>
    `;
    
    // Attach change listeners to save answers
    QUESTIONS[currentQuestionIndex].options.forEach((opt) => {
      const input = document.getElementById(`persona-${q.id}-${opt.value}`);
      if (input) {
        input.addEventListener('change', () => {
          answers[q.id] = opt.persona;
          updateNavigationState();
        });
      }
    });
  }
  
  updateProgress();
  updateNavigationState();
}

function renderInterestsPage(container) {
  const interestsHtml = VALID_INTERESTS.map(interest => {
    const isSelected = selectedInterests.includes(interest);
    return `
      <button type="button" 
              data-interest="${interest}"
              class="px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                isSelected 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }">
        ${formatLabel(interest)} ${isSelected ? '✓' : ''}
      </button>
    `;
  }).join('\n');

  container.innerHTML = `
    <h3 class="text-xl font-bold text-slate-900 mb-2">What are your interests?</h3>
    <p class="text-slate-600 mb-6">Select all that apply. This helps Pixie personalize your experience.</p>
    <div class="flex flex-wrap gap-2">
      ${interestsHtml}
    </div>
  `;

  // Attach click handlers
  container.querySelectorAll('[data-interest]').forEach(btn => {
    btn.addEventListener('click', () => {
      const interest = btn.dataset.interest;
      const index = selectedInterests.indexOf(interest);
      if (index > -1) {
        selectedInterests.splice(index, 1);
      } else {
        selectedInterests.push(interest);
      }
      renderCurrentQuestion();
    });
  });
}

function renderMotivationsPage(container) {
  const motivationsHtml = VALID_MOTIVATIONS.map(motivation => {
    const isSelected = selectedMotivations.includes(motivation);
    return `
      <button type="button" 
              data-motivation="${motivation}"
              class="px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                isSelected 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }">
        ${formatLabel(motivation)} ${isSelected ? '✓' : ''}
      </button>
    `;
  }).join('\n');

  container.innerHTML = `
    <h3 class="text-xl font-bold text-slate-900 mb-2">What motivates you financially?</h3>
    <p class="text-slate-600 mb-6">Select all that apply. Understanding your goals helps Pixie guide you better.</p>
    <div class="flex flex-wrap gap-2">
      ${motivationsHtml}
    </div>
  `;

  // Attach click handlers
  container.querySelectorAll('[data-motivation]').forEach(btn => {
    btn.addEventListener('click', () => {
      const motivation = btn.dataset.motivation;
      const index = selectedMotivations.indexOf(motivation);
      if (index > -1) {
        selectedMotivations.splice(index, 1);
      } else {
        selectedMotivations.push(motivation);
      }
      renderCurrentQuestion();
    });
  });
}

function updateProgress() {
  const total = QUESTIONS.length + 2; // 6 persona questions + interests + motivations
  const dotsContainer = document.getElementById('persona-quiz-progress-dots');
  
  if (!dotsContainer) return;
  
  // Generate dots
  const dotsHtml = Array.from({ length: total }, (_, i) => {
    const isActive = i === currentQuestionIndex;
    return `<span class="h-2.5 w-2.5 rounded-full transition-all ${
      isActive ? 'bg-indigo-600 scale-125' : 'bg-slate-300'
    }"></span>`;
  }).join('');
  
  dotsContainer.innerHTML = dotsHtml;
}

function updateNavigationState() {
  const prevBtn = document.getElementById('persona-quiz-prev');
  const nextBtn = document.getElementById('persona-quiz-next');
  
  if (prevBtn) {
    prevBtn.disabled = currentQuestionIndex === 0;
  }
  
  if (nextBtn) {
    const isLastPage = currentQuestionIndex === QUESTIONS.length + 1; // After motivations
    let canProceed = false;
    
    if (currentQuestionIndex < QUESTIONS.length) {
      // On persona questions - need answer
      canProceed = !!answers[QUESTIONS[currentQuestionIndex].id];
    } else if (currentQuestionIndex === QUESTIONS.length) {
      // On interests page - at least one interest required
      canProceed = selectedInterests.length > 0;
    } else if (currentQuestionIndex === QUESTIONS.length + 1) {
      // On motivations page - at least one motivation required
      canProceed = selectedMotivations.length > 0;
    }
    
    if (isLastPage) {
      nextBtn.textContent = 'Complete Setup';
      nextBtn.disabled = !canProceed;
    } else {
      nextBtn.textContent = 'Next →';
      nextBtn.disabled = !canProceed;
    }
  }
}

function areAllQuestionsAnswered() {
  return QUESTIONS.every(q => !!answers[q.id]);
}

function calculatePersona() {
  const scores = {
    the_analyst: 0,
    the_driver: 0,
    the_promoter: 0,
    the_supportive: 0,
  };

  for (const q of QUESTIONS) {
    const persona = answers[q.id];
    if (persona) {
      scores[persona] = (scores[persona] || 0) + 1;
    }
  }

  const winningScore = Math.max(...Object.values(scores));
  const candidates = Object.entries(scores)
    .filter(([, score]) => score === winningScore)
    .map(([persona]) => persona);

  return TIE_BREAK_ORDER.find((p) => candidates.includes(p)) || candidates[0] || "the_supportive";
}

function setStatus(text, tone = "info") {
  const statusEl = document.getElementById("persona-quiz-status");
  if (!statusEl) return;
  const toneClass = tone === "error" ? "text-rose-600" : tone === "success" ? "text-green-600" : "text-slate-600";
  statusEl.textContent = text;
  statusEl.className = `text-sm ${toneClass}`;
}

function showResultModal(persona) {
  if (!PERSONA_DETAILS || !PERSONA_DETAILS[persona]) return;
  
  const result = PERSONA_DETAILS[persona];
  const modal = document.getElementById("persona-quiz-result-modal");
  const titleEl = document.getElementById("persona-result-title");
  const descEl = document.getElementById("persona-result-desc");
  
  if (!modal || !titleEl || !descEl) return;
  
  titleEl.textContent = result.display_name;
  descEl.textContent = result.description;
  modal.classList.remove("hidden");
}

async function syncUser() {
  try {
    const refreshed = await getCurrentUser();
    state.currentUser = refreshed;
    return refreshed;
  } catch (e) {
    return null;
  }
}

async function submitPersonaQuiz() {
  if (!areAllQuestionsAnswered() || selectedInterests.length === 0 || selectedMotivations.length === 0) {
    setStatus("Please complete all steps", "error");
    return;
  }

  const nextBtn = document.getElementById('persona-quiz-next');
  if (nextBtn) nextBtn.disabled = true;
  setStatus("Saving your preferences...");
  
  const persona = calculatePersona();

  try {
    await updateUserPreferences({ 
      preferred_persona: persona,
      interests: selectedInterests,
      motivations: selectedMotivations,
      // Enable all privacy toggles after quiz completion
      interests_enabled: true,
      motivations_enabled: true,
      communication_style: true
    });
    const user = await syncUser();
    setStatus("");
    showResultModal(persona);
    if (user) {
      state.currentUser = { ...user, has_completed_persona_quiz: true };
    }
  } catch (e) {
    console.error("Failed to save preferences", e);
    setStatus(e.message || "Could not save preferences", "error");
    if (nextBtn) nextBtn.disabled = false;
  }
}


export async function initPersonaQuiz() {
  // Fetch personas from backend if not already loaded
  if (!PERSONA_DETAILS) {
    try {
      PERSONA_DETAILS = await getPersonas();
    } catch (e) {
      console.error('Failed to load personas:', e);
      setStatus('Could not load quiz. Please refresh.', 'error');
      return;
    }
  }

  // Reset quiz state
  currentQuestionIndex = 0;
  answers = {};
  selectedInterests = [];
  selectedMotivations = [];

  renderCurrentQuestion();

  const prevBtn = document.getElementById('persona-quiz-prev');
  const nextBtn = document.getElementById('persona-quiz-next');
  const goDashboardBtn = document.getElementById('persona-quiz-go-dashboard');

  if (prevBtn) {
    prevBtn.onclick = () => {
      if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderCurrentQuestion();
      }
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      const isLastPage = currentQuestionIndex === QUESTIONS.length + 1;
      if (isLastPage) {
        submitPersonaQuiz();
      } else {
        // Check if can proceed from current page
        let canProceed = false;
        if (currentQuestionIndex < QUESTIONS.length) {
          canProceed = !!answers[QUESTIONS[currentQuestionIndex].id];
        } else if (currentQuestionIndex === QUESTIONS.length) {
          canProceed = selectedInterests.length > 0;
        } else if (currentQuestionIndex === QUESTIONS.length + 1) {
          canProceed = selectedMotivations.length > 0;
        }
        
        if (canProceed) {
          currentQuestionIndex++;
          renderCurrentQuestion();
        }
      }
    };
  }

  if (goDashboardBtn) goDashboardBtn.onclick = () => resetTo('dashboard');

  setStatus('');
  const modal = document.getElementById('persona-quiz-result-modal');
  if (modal) modal.classList.add('hidden');
}

export function skipPersonaQuiz() {
  // User skipped quiz - just go to dashboard with default persona (the_supportive)
  // The User model already has this as default
  resetTo('dashboard');
}
