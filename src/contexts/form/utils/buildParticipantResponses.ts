
import { ParticipantQuestion } from "@/services/types/designTypes";

export function buildParticipantResponses(participantQuestions: ParticipantQuestion[], participantAnswers: Record<string, string>) {
  if (!participantQuestions || !Array.isArray(participantQuestions)) return [];
  return participantQuestions.map(question => {
    const rawAnswer = participantAnswers[question.id] || '';
    let choiceId = rawAnswer;
    let choiceText = rawAnswer;

    if (rawAnswer.startsWith('[') && rawAnswer.endsWith(']')) {
      try {
        const parsedIds = JSON.parse(rawAnswer);
        if (Array.isArray(parsedIds)) {
          const choiceLabels = parsedIds.map((id: string) => {
            const found = question.choices?.find(c => c.id === id);
            return found ? found.label : id;
          });
          choiceText = JSON.stringify(choiceLabels);
          choiceId = rawAnswer;
        }
      } catch {
        // Fallback to raw string
      }
    } else if (question.choices && Array.isArray(question.choices) && question.choices.length > 0) {
      const selectedChoice = question.choices.find(c => c.id === choiceId);
      choiceText = selectedChoice ? selectedChoice.label : choiceId;
    }

    return {
      questionId: question.id,
      questionText: question.label,
      choiceId,
      choiceText
    };
  });
}
