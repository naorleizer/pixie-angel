// Shared app state (kept minimal and close to original behavior)

export const state = {
  screenStack: ["screen-onboarding"],
  currentOnboardingSlide: 1,
  challengeCarouselIndex: 0,
  challengeCreated: false,
  chatStepIndex: -1,
};

// Chat demo sequence (copied from original)
export const chatSequence = [
  { id: "chat-step-1", delay: 0 },
  { id: "chat-step-2", delay: 0 },
  { id: "chat-step-3", delay: 0 },
  { id: "chat-step-4", delay: 0 },
  // chat-step-5 is gated by createChallenge() and shouldn't auto-advance
  { id: "chat-step-5", delay: 0, gatedByChallenge: true, noAutoAdvance: true },
  // chat-step-6 only appears when delete button is pressed
  { id: "chat-step-6", delay: 0, requiresDelete: true },
  { id: "chat-step-7", delay: 0 },
  { id: "chat-step-8", delay: 0 },
  { id: "chat-step-9", delay: 0 },
  { id: "chat-step-10", delay: 0 },
];
