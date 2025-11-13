# Language Pronunciation Evaluation App - Design Guidelines

## Design Approach: Design System (Material Design)

**Rationale**: Educational utility application requiring clarity, accessibility, and function-first design. Material Design provides excellent typography hierarchy for multilingual content and established patterns for interactive learning tools.

**Key Principles**:
- Clarity over decoration - minimize visual noise
- Information hierarchy that guides the learning flow
- Accessible, high-contrast design for script readability
- Confidence-building through clear visual feedback

---

## Typography System

### Multilingual Hierarchy
**Reference Sentence Display**:
- Original Script (Hindi Devanagari/Kannada): text-3xl to text-4xl, font-weight: 600
- English Transliteration: text-xl, font-weight: 400, reduced opacity for secondary emphasis
- Use system fonts with excellent Unicode support: 'Noto Sans Devanagari' for Hindi, 'Noto Sans Kannada' for Kannada via Google Fonts

**Feedback & UI Text**:
- Section Headings: text-lg, font-weight: 600
- Word Score Labels: text-base, font-weight: 500
- Coaching Feedback: text-base, font-weight: 400, line-height relaxed
- Button Labels: text-base, font-weight: 500

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **4, 6, 8, 12** consistently
- Component padding: p-6 to p-8
- Section gaps: gap-6 to gap-8
- Card spacing: space-y-6
- Button padding: px-6 py-3

**Container Structure**:
- Max-width: max-w-4xl for main content area (optimal for reading multilingual text)
- Centered layout: mx-auto
- Responsive padding: px-4 md:px-8

---

## Component Library

### Primary Interface Elements

**1. Language Selector**
- Toggle/tab interface at top of page
- Two options: Hindi | Kannada
- Active state clearly distinguished from inactive

**2. Sentence Display Card**
- Elevated card with subtle shadow (Material elevation-2)
- Generous internal padding (p-8)
- Vertical stack: Original script → Transliteration
- Gap between scripts: space-y-4

**3. Audio Control Buttons**
- Large, touch-friendly buttons (min-height: 56px)
- Icon + text label combination
- "Listen" (speaker icon) and "Record" (microphone icon) as primary actions
- Icons from Material Icons CDN
- Full-width on mobile, inline on desktop

**4. Pronunciation Results Display**
- Word-by-word breakdown in horizontal flex layout (flex-wrap enabled)
- Each word as individual pill/chip component
- Score percentage displayed below each word
- Smooth color gradient from success to error based on score (use opacity variations, not explicit colors)

**5. Feedback Section**
- Distinct card below word results
- Heading: "Pronunciation Tips"
- Bulleted list of specific coaching points
- Emphasis on phonetic guidance using `<strong>` tags

**6. Progress Indicator**
- While processing audio: Linear progress bar or spinner
- Positioned centrally in results area

### Navigation
- Minimal top bar with app title and language selector
- No complex navigation needed (single-page app)

---

## Visual Feedback System

**Score Visualization** (applied via opacity/intensity, not explicit colors):
- 90-100%: Maximum success indication
- 70-89%: Moderate success indication  
- 50-69%: Warning indication
- Below 50%: Error indication

**Interactive States**:
- Buttons: Subtle scale transform on hover (scale-105)
- Cards: No hover effects (static information)
- Recording button: Pulsing animation when actively recording

---

## Accessibility Requirements

- Minimum touch target: 48x48px for all interactive elements
- Clear focus indicators on all interactive elements (ring-2)
- High contrast between text and backgrounds
- Support for keyboard navigation
- ARIA labels for icon-only buttons
- Semantic HTML structure (main, section, article elements)

---

## Interaction Patterns

**User Flow**:
1. Select language → 2. View sentence → 3. Listen to reference → 4. Record pronunciation → 5. View results → 6. Read feedback → 7. Retry or new sentence

**Button Behaviors**:
- "Listen" button: Plays TTS, disabled during playback
- "Record" button: Transforms to "Stop Recording" when active
- "New Sentence": Generates fresh practice sentence
- All buttons show loading states during processing

---

## Responsive Behavior

**Mobile (< 768px)**:
- Single column layout
- Full-width buttons stacked vertically
- Sentence display optimized for portrait orientation
- Word results wrap to multiple rows

**Desktop (≥ 768px)**:
- Centered layout with max-width constraint
- Inline button group (Listen + Record side-by-side)
- Word results display in optimal multi-row grid
- More generous spacing throughout

---

## Images
No hero images or decorative imagery needed. This is a functional learning tool focused on text and audio interaction. Icons only (Material Icons via CDN for microphone, speaker, check, close, etc.).