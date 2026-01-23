// Shared app state (kept minimal and close to original behavior)

export const state = {
  screenStack: ["screen-onboarding"],
  currentOnboardingSlide: 1,
  challengeCarouselIndex: 0,
  challengeCreated: false,
  chatStepIndex: -1,
  activeChatStory: "challenge",
  budgetAdjusted: false,
  notificationsUnread: 0,
  challengeExtended: false,
  currentUser: null,
};
