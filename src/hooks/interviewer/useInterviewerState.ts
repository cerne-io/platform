import { useReducer, useCallback } from 'react';
import { ChatMessage } from "@/types/chatTypes";
import { InterviewPhase } from './types';

export interface InterviewerState {
    messages: ChatMessage[];
    isInterviewStarted: boolean;
    sliderResponses: Map<number, number>;
    triangleResponses: Map<number | string, { x: number, y: number }>;
    participantResponses: Map<string, string>;
    currentPhase: InterviewPhase;
    storyTitle: string;
    emotionalResponse: string;
    otherFeeling: string;
    additionalComments: string;
    assistantMessageCount: number;
    isThinking: boolean;
}

export const initialState: InterviewerState = {
    messages: [],
    isInterviewStarted: false,
    sliderResponses: new Map(),
    triangleResponses: new Map(),
    participantResponses: new Map(),
    currentPhase: 'story',
    storyTitle: '',
    emotionalResponse: '',
    otherFeeling: '',
    additionalComments: '',
    assistantMessageCount: 0,
    isThinking: false,
};

export type InterviewerAction =
    | { type: 'ADD_MESSAGE'; payload: ChatMessage }
    | { type: 'ADD_MESSAGES'; payload: ChatMessage[] }
    | { type: 'SET_INTERVIEW_STARTED'; payload: boolean }
    | { type: 'SET_PHASE'; payload: InterviewPhase }
    | { type: 'SET_SLIDER_RESPONSE'; payload: { id: number; value: number } }
    | { type: 'SET_MULTIPLE_SLIDER_RESPONSES'; payload: Map<number, number> }
    | { type: 'SET_TRIANGLE_RESPONSE'; payload: { id: number | string; value: { x: number; y: number } } }
    | { type: 'SET_MULTIPLE_TRIANGLE_RESPONSES'; payload: Map<number | string, { x: number; y: number }> }
    | { type: 'SET_PARTICIPANT_RESPONSE'; payload: { id: string; value: string } }
    | { type: 'SET_MULTIPLE_PARTICIPANT_RESPONSES'; payload: Map<string, string> }
    | { type: 'SET_STORY_TITLE'; payload: string }
    | { type: 'SET_EMOTIONAL_RESPONSE'; payload: string }
    | { type: 'SET_OTHER_FEELING'; payload: string }
    | { type: 'SET_ADDITIONAL_COMMENTS'; payload: string }
    | { type: 'INCREMENT_ASSISTANT_MESSAGE_COUNT' }
    | { type: 'RESET_ASSISTANT_MESSAGE_COUNT' }
    | { type: 'REMOVE_LAST_MESSAGE' }
    | { type: 'SET_THINKING'; payload: boolean }
    | { type: 'RESET_STATE' };

function interviewerReducer(state: InterviewerState, action: InterviewerAction): InterviewerState {
    switch (action.type) {
        case 'ADD_MESSAGE':
            return { ...state, messages: [...state.messages, action.payload] };
        case 'ADD_MESSAGES':
            return { ...state, messages: [...state.messages, ...action.payload] };
        case 'REMOVE_LAST_MESSAGE':
            return { ...state, messages: state.messages.slice(0, -1) };
        case 'SET_INTERVIEW_STARTED':
            return { ...state, isInterviewStarted: action.payload };
        case 'SET_PHASE':
            return { ...state, currentPhase: action.payload };
        case 'SET_SLIDER_RESPONSE':
            {
                const newResponses = new Map(state.sliderResponses);
                newResponses.set(action.payload.id, action.payload.value);
                return { ...state, sliderResponses: newResponses };
            }
        case 'SET_MULTIPLE_SLIDER_RESPONSES':
            return { ...state, sliderResponses: action.payload };
        case 'SET_TRIANGLE_RESPONSE':
            {
                const newResponses = new Map(state.triangleResponses);
                newResponses.set(action.payload.id, action.payload.value);
                return { ...state, triangleResponses: newResponses };
            }
        case 'SET_MULTIPLE_TRIANGLE_RESPONSES':
            return { ...state, triangleResponses: action.payload };
        case 'SET_PARTICIPANT_RESPONSE':
            {
                const newResponses = new Map(state.participantResponses);
                newResponses.set(action.payload.id, action.payload.value);
                return { ...state, participantResponses: newResponses };
            }
        case 'SET_MULTIPLE_PARTICIPANT_RESPONSES':
            return { ...state, participantResponses: action.payload };
        case 'SET_STORY_TITLE':
            return { ...state, storyTitle: action.payload };
        case 'SET_EMOTIONAL_RESPONSE':
            return { ...state, emotionalResponse: action.payload };
        case 'SET_OTHER_FEELING':
            return { ...state, otherFeeling: action.payload };
        case 'SET_ADDITIONAL_COMMENTS':
            return { ...state, additionalComments: action.payload };
        case 'INCREMENT_ASSISTANT_MESSAGE_COUNT':
            return { ...state, assistantMessageCount: state.assistantMessageCount + 1 };
        case 'RESET_ASSISTANT_MESSAGE_COUNT':
            return { ...state, assistantMessageCount: 0 };
        case 'SET_THINKING':
            return { ...state, isThinking: action.payload };
        case 'RESET_STATE':
            return initialState;
        default:
            return state;
    }
}

export const useInterviewerState = () => {
    const [state, dispatch] = useReducer(interviewerReducer, initialState);

    const addMessage = useCallback((message: ChatMessage) => dispatch({ type: 'ADD_MESSAGE', payload: message }), []);
    const addMessages = useCallback((messages: ChatMessage[]) => dispatch({ type: 'ADD_MESSAGES', payload: messages }), []);
    const setInterviewStarted = useCallback((started: boolean) => dispatch({ type: 'SET_INTERVIEW_STARTED', payload: started }), []);
    const setPhase = useCallback((phase: InterviewPhase) => dispatch({ type: 'SET_PHASE', payload: phase }), []);
    const setSliderResponse = useCallback((id: number, value: number) => dispatch({ type: 'SET_SLIDER_RESPONSE', payload: { id, value } }), []);
    const setTriangleResponse = useCallback((id: number | string, value: { x: number; y: number }) => dispatch({ type: 'SET_TRIANGLE_RESPONSE', payload: { id, value } }), []);
    const setParticipantResponse = useCallback((id: string, value: string) => dispatch({ type: 'SET_PARTICIPANT_RESPONSE', payload: { id, value } }), []);
    const setStoryTitle = useCallback((title: string) => dispatch({ type: 'SET_STORY_TITLE', payload: title }), []);
    const setEmotionalResponse = useCallback((response: string) => dispatch({ type: 'SET_EMOTIONAL_RESPONSE', payload: response }), []);
    const setOtherFeeling = useCallback((feeling: string) => dispatch({ type: 'SET_OTHER_FEELING', payload: feeling }), []);
    const setAdditionalComments = useCallback((comments: string) => dispatch({ type: 'SET_ADDITIONAL_COMMENTS', payload: comments }), []);
    const incrementAssistantMessageCount = useCallback(() => dispatch({ type: 'INCREMENT_ASSISTANT_MESSAGE_COUNT' }), []);
    const removeLastMessage = useCallback(() => dispatch({ type: 'REMOVE_LAST_MESSAGE' }), []);
    const setIsThinking = useCallback((isThinking: boolean) => dispatch({ type: 'SET_THINKING', payload: isThinking }), []);
    const resetState = useCallback(() => dispatch({ type: 'RESET_STATE' }), []);

    return {
        state,
        dispatch,
        actions: {
            addMessage,
            addMessages,
            removeLastMessage,
            setInterviewStarted,
            setPhase,
            setSliderResponse,
            setTriangleResponse,
            setParticipantResponse,
            setStoryTitle,
            setEmotionalResponse,
            setOtherFeeling,
            setAdditionalComments,
            incrementAssistantMessageCount,
            setIsThinking,
            resetState
        }
    };
};
