import FeedbackSection from '../FeedbackSection';

export default function FeedbackSectionExample() {
  const mockFeedback = [
    'Emphasize the "sh" sound in "eshtu" - make it sharper and clearer',
    'The "ai" in "kaise" should sound like the "i" in "ice"',
    'Try to soften the "h" sound at the end of "hain"',
  ];

  return <FeedbackSection feedback={mockFeedback} />;
}
