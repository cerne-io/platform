import type { PGlite } from "@electric-sql/pglite";
import { DEFAULT_AI_PROMPTS } from "./prompts.ts";

export interface SeedOptions {
  seedSampleProject?: boolean;
}

const SAMPLE_PROJECT_ID = "10000000-0000-0000-0000-000000000001";
const STARTER_TEMPLATE_ID = "10000000-0000-0000-0000-000000000002";
const SAMPLE_FORM_ID = "sample-onboarding-form";

interface SampleStorySeed {
  id: string;
  title: string;
  text: string;
  emotional_response: string;
  feeling_sentiment: "positive" | "negative" | "neutral";
  sliders: [number, number, number];
  triangles: [{ x: number; y: number }, { x: number; y: number }];
  role: string;
  tenure: string;
}

const SLIDER_DEFS = [
  {
    id: 1,
    theme: "Clarity",
    question: "In the story you shared, how clear were expectations in your first weeks?",
    leftLabel: "Unclear expectations",
    rightLabel: "Crystal clear",
  },
  {
    id: 2,
    theme: "Autonomy",
    question: "How did support and autonomy balance out in that moment?",
    leftLabel: "Needed more guidance",
    rightLabel: "Right level of freedom",
  },
  {
    id: 3,
    theme: "Belonging",
    question: "How connected did you feel to the team around you?",
    leftLabel: "Isolated",
    rightLabel: "Deeply connected",
  },
] as const;

const TRIANGLE_DEFS = [
  {
    id: 1,
    theme: "Support",
    question: "Where did helpful context come from in your experience?",
    topLabel: "Documentation",
    bottomLeftLabel: "Peers",
    bottomRightLabel: "Manager",
  },
  {
    id: 2,
    theme: "Pacing",
    question: "What shaped how you handled the workload at that time?",
    topLabel: "Speed",
    bottomLeftLabel: "Quality",
    bottomRightLabel: "Alignment",
  },
] as const;

const SAMPLE_STORIES: SampleStorySeed[] = [
  {
    id: "20000000-0000-0000-0000-000000000001",
    title: "Paired deployment on day three",
    text: "On my third morning, a teammate pulled me into a pairing session to ship a small fix together. Walking through the deploy checklist side by side demystified the whole setup in forty minutes.",
    emotional_response: "Encouraged",
    feeling_sentiment: "positive",
    sliders: [82, 76, 90],
    triangles: [{ x: 35, y: 68 }, { x: 48, y: 58 }],
    role: "Engineering",
    tenure: "Under 3 months",
  },
  {
    id: "20000000-0000-0000-0000-000000000002",
    title: "Searching across three wikis for access",
    text: "During my second week I spent two afternoons waiting on repository permissions because instructions were split across old docs. Everyone I asked was kind, but nobody knew which checklist was current.",
    emotional_response: "Frustrated",
    feeling_sentiment: "negative",
    sliders: [24, 38, 62],
    triangles: [{ x: 42, y: 32 }, { x: 64, y: 40 }],
    role: "Engineering",
    tenure: "Under 3 months",
  },
  {
    id: "20000000-0000-0000-0000-000000000003",
    title: "First customer call shadow",
    text: "Sitting in on a discovery interview helped connect all the product acronyms I had read in my welcome packet. Afterwards my manager spent fifteen minutes unpacking why certain questions landed well.",
    emotional_response: "Curious",
    feeling_sentiment: "positive",
    sliders: [74, 80, 78],
    triangles: [{ x: 66, y: 54 }, { x: 52, y: 72 }],
    role: "Product & Design",
    tenure: "3-12 months",
  },
  {
    id: "20000000-0000-0000-0000-000000000004",
    title: "Timezone gap in sprint planning",
    text: "My first sprint planning happened before I had context on why certain tradeoffs were already settled. I stayed quiet rather than slow the meeting down, though later async notes filled part of the gap.",
    emotional_response: "Uncertain",
    feeling_sentiment: "neutral",
    sliders: [45, 52, 41],
    triangles: [{ x: 58, y: 38 }, { x: 72, y: 48 }],
    role: "Product & Design",
    tenure: "Under 3 months",
  },
  {
    id: "20000000-0000-0000-0000-000000000005",
    title: "Buddy coffee chat turned into project map",
    text: "My onboarding buddy drew a quick diagram of who owns which customer workflows on a shared whiteboard. Having that mental map saved me dozens of awkward pings over the following month.",
    emotional_response: "Supported",
    feeling_sentiment: "positive",
    sliders: [88, 84, 92],
    triangles: [{ x: 25, y: 65 }, { x: 40, y: 70 }],
    role: "Operations",
    tenure: "3-12 months",
  },
  {
    id: "20000000-0000-0000-0000-000000000006",
    title: "Unwritten expectations before quarterly review",
    text: "Right before my ninety-day check-in I realized teams wrote outcomes differently than the template suggested. Rewriting notes at the last minute felt rushed, even though the feedback conversation itself was constructive.",
    emotional_response: "Overwhelmed",
    feeling_sentiment: "negative",
    sliders: [36, 44, 58],
    triangles: [{ x: 70, y: 30 }, { x: 60, y: 34 }],
    role: "Operations",
    tenure: "3-12 months",
  },
];

type SliderDef = (typeof SLIDER_DEFS)[number];
type TriangleDef = (typeof TRIANGLE_DEFS)[number];

interface ParticipantQuestionSeed {
  id: string;
  label: string;
  questionType: string;
  checked: boolean;
  choices: Array<{ id: string; label: string }>;
}

/** Builds Form Builder canvas items matching CerneBuilderQuestion shape. */
function buildFormBuilderQuestions(params: {
  storyQuestion: string;
  sliders: readonly SliderDef[];
  triangles?: readonly TriangleDef[];
  participants?: readonly ParticipantQuestionSeed[];
}) {
  return [
    {
      id: "story-question-1",
      type: "story-question",
      label: params.storyQuestion,
      required: true,
    },
    {
      id: "emotional-response-1",
      type: "emotional-response",
      label: "What feeling best captures that moment?",
      required: false,
      includePreferNotToSay: false,
      options: [
        { id: "enthusiastic", label: "Enthusiastic" },
        { id: "confused", label: "Confused" },
        { id: "frustrated", label: "Frustrated" },
        { id: "engaged", label: "Engaged" },
        { id: "other", label: "Other" },
      ],
    },
    ...params.sliders.map((s) => ({
      id: `slider-${s.id}`,
      type: "slider",
      label: s.question,
      theme: s.theme,
      required: true,
      sliderConfig: {
        leftLabel: s.leftLabel,
        rightLabel: s.rightLabel,
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 50,
      },
    })),
    ...(params.triangles ?? []).map((t) => ({
      id: `triangle-${t.id}`,
      type: "triangle",
      label: t.question,
      theme: t.theme,
      required: true,
      triangleConfig: {
        topLabel: t.topLabel,
        bottomLeftLabel: t.bottomLeftLabel,
        bottomRightLabel: t.bottomRightLabel,
        defaultX: 50,
        defaultY: 66.67,
      },
    })),
    ...(params.participants ?? []).map((pq) => ({
      id: pq.id,
      type: "participant-questions",
      label: pq.label,
      required: false,
      includePreferNotToSay: true,
      options: pq.choices,
    })),
  ];
}

async function seedPrompts(db: PGlite): Promise<void> {
  for (const prompt of DEFAULT_AI_PROMPTS) {
    await db.query(
      `INSERT INTO public.ai_prompts (prompt_key, title, content, description, category)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (prompt_key) DO NOTHING`,
      [prompt.prompt_key, prompt.title, prompt.content, prompt.description, prompt.category]
    );
  }
}

async function seedSampleWorkspace(db: PGlite): Promise<void> {
  const existingFlag = await db.query<{ value: unknown }>(
    `SELECT value FROM public.workspace_settings WHERE key = 'seeded_sample_data'`
  );
  if (existingFlag.rows.length > 0) {
    return;
  }

  await db.transaction(async (tx) => {
    // 1. Sample editable project + starter template project
    await tx.query(
      `INSERT INTO public.projects (id, name, description, is_template, is_active)
       VALUES
         ($1, $2, $3, false, true),
         ($4, $5, $6, true, true)
       ON CONFLICT (id) DO NOTHING`,
      [
        SAMPLE_PROJECT_ID,
        "Team Onboarding Retrospective",
        "Sample Cerne project collecting firsthand onboarding stories from new hires.",
        STARTER_TEMPLATE_ID,
        "Community Listening Template",
        "Starter template for gathering lived experiences and surfacing patterns across a community.",
      ]
    );

    const storyQuestion =
      "Think back to your first few weeks here. What specific moment made you feel either clearly supported or unsure about how things work?";

    const sliderPayload = { sliderQuestions: SLIDER_DEFS.map((s) => ({ ...s })) };
    const trianglePayload = { triangleQuestions: TRIANGLE_DEFS.map((t) => ({ ...t })) };
    const participantPayload = {
      includePreferNotToSay: true,
      participantQuestions: [
        {
          id: "role",
          label: "Which area do you work in?",
          questionType: "multiple-choice",
          checked: true,
          choices: [
            { id: "eng", label: "Engineering" },
            { id: "pd", label: "Product & Design" },
            { id: "ops", label: "Operations" },
          ],
        },
        {
          id: "tenure",
          label: "How long have you been with the team?",
          questionType: "multiple-choice",
          checked: true,
          choices: [
            { id: "lt3m", label: "Under 3 months" },
            { id: "3to12m", label: "3-12 months" },
          ],
        },
      ],
    };
    const appearancePayload = {
      backgroundColor: "#f8fafc",
      headerText: "Share Your Onboarding Moment",
      subheaderText: "Stories stay anonymous and help improve how new teammates settle in.",
    };

    const builderQuestions = buildFormBuilderQuestions({
      storyQuestion,
      sliders: SLIDER_DEFS,
      triangles: TRIANGLE_DEFS,
      participants: participantPayload.participantQuestions,
    });

    const activityEntries: Array<[string, string, string, unknown]> = [
      ["context", "project", "scope", { project_scope: "Understand how new team members experience their first 90 days across engineering, product, and operations." }],
      ["context", "project", "trigger", { project_trigger: "Feedback from recent hires showed tooling and unwritten norms varied widely between teams." }],
      ["context", "project", "success", { project_success: "Pinpoint recurring friction and helpful onboarding habits we can standardize next quarter." }],
      ["define", "topic", "investigate", { investigate_topic: "First-90-days team onboarding and ramp-up experience" }],
      ["define", "topic", "focus", { focus_description: "Moments of clarity, access bottlenecks, and peer support during early onboarding" }],
      ["define", "discover", "factors", { factors_description: "Documentation clarity, Peer pairing, Manager check-ins, Tool access" }],
      ["design", "questions", "question-type", { questionType: "both" }],
      ["design", "questions", "triangle-questions", trianglePayload],
      ["design", "form-builder", "form-builder-questions", builderQuestions],
      ["collection", "story-questions", "story-questions", { question: storyQuestion }],
      ["collection", "public-form", "question-type", { questionType: "both" }],
      ["collection", "public-form", "story-question", { storyQuestion }],
      ["collection", "public-form", "slider-questions", sliderPayload],
      ["collection", "public-form", "triangle-questions", trianglePayload],
      ["collection", "public-form", "participant-questions", participantPayload],
      ["collection", "public-form", "form-builder-questions", builderQuestions],
      ["collection", "questions", "slider-questions", sliderPayload],
      ["collection", "questions", "triangle-questions", trianglePayload],
      ["collection", "questions", "participant-questions", participantPayload],
      ["build", "form-appearance", "form-appearance-editor", appearancePayload],
      ["build", "form-appearance", "form-languages", { defaultLanguage: "en", enabledLanguages: ["en"] }],
    ];

    for (const [phase, step, activity, payload] of activityEntries) {
      await tx.query(
        `INSERT INTO public.activity_responses (ar_project_id, ar_phase_id, ar_step_id, ar_activity_id, ar_response)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT ON CONSTRAINT activity_responses_composite_key DO NOTHING`,
        [SAMPLE_PROJECT_ID, phase, step, activity, JSON.stringify(payload)]
      );
    }

    await tx.query(
      `INSERT INTO public.form_identifiers (fi_project_id, form_id)
       VALUES ($1, $2)
       ON CONFLICT (form_id) DO NOTHING`,
      [SAMPLE_PROJECT_ID, SAMPLE_FORM_ID]
    );

    // Seed template activity responses & 2 stories on the starter template
    const templateStoryQuestion =
      "Tell us about a recent experience in this community that stayed with you.";
    const templateSliders = SLIDER_DEFS.slice(0, 2);
    const templateParticipants = {
      includePreferNotToSay: true,
      participantQuestions: participantPayload.participantQuestions.slice(0, 1),
    };
    const templateBuilderQuestions = buildFormBuilderQuestions({
      storyQuestion: templateStoryQuestion,
      sliders: templateSliders,
      participants: templateParticipants.participantQuestions,
    });

    const templateEntries: Array<[string, string, string, unknown]> = [
      ["design", "questions", "question-type", { questionType: "slider" }],
      ["design", "form-builder", "form-builder-questions", templateBuilderQuestions],
      ["collection", "story-questions", "story-questions", { question: templateStoryQuestion }],
      ["collection", "public-form", "question-type", { questionType: "slider" }],
      ["collection", "public-form", "story-question", { storyQuestion: templateStoryQuestion }],
      ["collection", "public-form", "slider-questions", { sliderQuestions: templateSliders }],
      ["collection", "public-form", "participant-questions", templateParticipants],
      ["collection", "public-form", "form-builder-questions", templateBuilderQuestions],
      ["collection", "questions", "slider-questions", { sliderQuestions: templateSliders }],
      ["collection", "questions", "participant-questions", templateParticipants],
      [
        "build",
        "form-appearance",
        "form-appearance-editor",
        {
          backgroundColor: "#f8fafc",
          headerText: "Share Your Experience",
          subheaderText: "Your story helps surface what matters most to this community.",
        },
      ],
      ["build", "form-appearance", "form-languages", { defaultLanguage: "en", enabledLanguages: ["en"] }],
    ];

    for (const [phase, step, activity, payload] of templateEntries) {
      await tx.query(
        `INSERT INTO public.template_activity_responses (ar_project_id, ar_phase_id, ar_step_id, ar_activity_id, ar_response)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT ON CONSTRAINT unique_template_activity_response DO NOTHING`,
        [STARTER_TEMPLATE_ID, phase, step, activity, JSON.stringify(payload)]
      );
    }

    await tx.query(
      `INSERT INTO public.stories (id, st_project_id, title, text, emotional_response, feeling_sentiment, is_public)
       VALUES
         ('20000000-0000-0000-0000-000000000101', $1, 'Neighborhood welcome dinner', 'Neighbors organized a potluck table on the courtyard steps so newcomers could meet everyone in person.', 'Warm', 'positive', true),
         ('20000000-0000-0000-0000-000000000102', $1, 'Delayed notice on schedule change', 'The meeting moved buildings without an announcement at the entrance, leaving several first-timers outside.', 'Confused', 'negative', true)
       ON CONFLICT (id) DO NOTHING`,
      [STARTER_TEMPLATE_ID]
    );

    for (const story of SAMPLE_STORIES) {
      await tx.query(
        `INSERT INTO public.stories (
           id, st_project_id, title, text, emotional_response, feeling_sentiment, is_public, story_source
         )
         VALUES ($1, $2, $3, $4, $5, $6, true, 'sample_seed')
         ON CONFLICT (id) DO NOTHING`,
        [story.id, SAMPLE_PROJECT_ID, story.title, story.text, story.emotional_response, story.feeling_sentiment]
      );

      for (let i = 0; i < SLIDER_DEFS.length; i++) {
        const def = SLIDER_DEFS[i];
        await tx.query(
          `INSERT INTO public.slider_responses (
             story_id, sr_project_id, question_id, question_text, value, left_label, right_label, response_type
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'answered')`,
          [story.id, SAMPLE_PROJECT_ID, def.id, def.question, story.sliders[i], def.leftLabel, def.rightLabel]
        );
      }

      for (let i = 0; i < TRIANGLE_DEFS.length; i++) {
        const def = TRIANGLE_DEFS[i];
        const pos = story.triangles[i];
        await tx.query(
          `INSERT INTO public.triangle_responses (
             story_id, tr_project_id, question_id, question_text,
             top_label, bottom_left_label, bottom_right_label,
             x_position, y_position, response_type
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'answered')`,
          [
            story.id,
            SAMPLE_PROJECT_ID,
            def.id,
            def.question,
            def.topLabel,
            def.bottomLeftLabel,
            def.bottomRightLabel,
            pos.x,
            pos.y,
          ]
        );
      }

      await tx.query(
        `INSERT INTO public.participant_responses (story_id, pr_project_id, question_id, question_text, response)
         VALUES
           ($1, $2, 'role', 'Which area do you work in?', $3),
           ($1, $2, 'tenure', 'How long have you been with the team?', $4)`,
        [story.id, SAMPLE_PROJECT_ID, story.role, story.tenure]
      );

      await tx.query(
        `INSERT INTO public.sentiment_cache (emotion_text, sentiment)
         VALUES ($1, $2)
         ON CONFLICT (emotion_text) DO NOTHING`,
        [story.emotional_response.toLowerCase(), story.feeling_sentiment]
      );
    }

    await tx.query(
      `INSERT INTO public.saved_comparisons (
         id, project_id, name, analysis_type, primary_question_id, secondary_question_id,
         question_label, secondary_question_label, group_a_name, group_b_name,
         group_a_story_ids, group_b_story_ids, source_snapshot
       )
       VALUES (
         '30000000-0000-0000-0000-000000000001',
         $1,
         'Early Tenure Clarity vs Connection',
         'slider',
         '1',
         '3',
         $2,
         $3,
         'First 90 Days',
         '3-12 Months',
         $4::uuid[],
         $5::uuid[],
         '{"groupACountAtSave": 3, "groupBCountAtSave": 3, "sharedCountAtSave": 0}'::jsonb
       )
       ON CONFLICT (id) DO NOTHING`,
      [
        SAMPLE_PROJECT_ID,
        SLIDER_DEFS[0].question,
        SLIDER_DEFS[2].question,
        [SAMPLE_STORIES[0].id, SAMPLE_STORIES[1].id, SAMPLE_STORIES[3].id],
        [SAMPLE_STORIES[2].id, SAMPLE_STORIES[4].id, SAMPLE_STORIES[5].id],
      ]
    );

    await tx.query(
      `INSERT INTO public.workspace_settings (key, value)
       VALUES ('seeded_sample_data', 'true'::jsonb)
       ON CONFLICT (key) DO NOTHING`
    );
  });
}

/**
 * Seeds default AI prompts and (once, on first boot) the sample project + starter template.
 */
export async function seedDatabase(db: PGlite, options: SeedOptions = {}): Promise<void> {
  await seedPrompts(db);

  const shouldSeedSample =
    options.seedSampleProject ?? process.env.SEED_SAMPLE_PROJECT !== "false";

  if (shouldSeedSample) {
    await seedSampleWorkspace(db);
  }
}

