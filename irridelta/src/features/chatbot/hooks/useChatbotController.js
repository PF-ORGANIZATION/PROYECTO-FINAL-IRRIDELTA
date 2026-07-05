import { useCallback, useEffect, useRef, useState } from "react";
import {
  COOLDOWN_SECONDS,
  MAX_HISTORY_TURNS,
  buildAssistantMessages,
  getGuardrailResponse,
} from "../services/chatbotConfig";
import { streamAssistantResponse } from "../services/chatCompletionService";
import { getChatErrorMessage } from "../services/chatbotErrors";
import {
  STREAMING_PLACEHOLDER,
  appendConversationTurn,
  createBotMessage,
  createInitialMessages,
  createUserMessage,
} from "../services/chatbotMessages";
import { searchKnowledgeBase } from "../services/ragService";

function replaceMessage(messages, messageId, changes) {
  return messages.map((message) =>
    message.id === messageId ? { ...message, ...changes } : message
  );
}

export function useChatbotController({ user, userRole, isExamInProgress }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState(createInitialMessages);
  const messagesEndRef = useRef(null);
  const requestControllerRef = useRef(null);
  const cooldownTimerRef = useRef(null);
  const conversationHistory = useRef([]);
  const isExamInProgressRef = useRef(isExamInProgress);
  const sessionKey = `${user?.id ?? "sin-usuario"}:${userRole ?? "sin-rol"}`;
  const sessionKeyRef = useRef(sessionKey);

  const clearCooldown = useCallback(() => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  }, []);

  const abortActiveRequest = useCallback(() => {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN_SECONDS);
    clearCooldown();
    cooldownTimerRef.current = setInterval(() => {
      setCooldown((previousCooldown) => {
        if (previousCooldown <= 1) {
          clearCooldown();
          return 0;
        }

        return previousCooldown - 1;
      });
    }, 1000);
  }, [clearCooldown]);

  const resetSessionState = useCallback(() => {
    abortActiveRequest();
    clearCooldown();
    conversationHistory.current = [];
    setMessages(createInitialMessages());
    setInput("");
    setCooldown(0);
    setIsLoading(false);
    setIsOpen(false);
    setIsExpanded(false);
  }, [abortActiveRequest, clearCooldown]);

  const closeForExamLock = useCallback(() => {
    abortActiveRequest();
    clearCooldown();
    setInput("");
    setCooldown(0);
    setIsLoading(false);
    setIsOpen(false);
    setIsExpanded(false);
  }, [abortActiveRequest, clearCooldown]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    sessionKeyRef.current = sessionKey;
    resetSessionState();
  }, [resetSessionState, sessionKey]);

  useEffect(() => (
    () => {
      abortActiveRequest();
      clearCooldown();
    }
  ), [abortActiveRequest, clearCooldown]);

  useEffect(() => {
    isExamInProgressRef.current = isExamInProgress;

    if (isExamInProgress) {
      closeForExamLock();
    }
  }, [closeForExamLock, isExamInProgress]);

  const addGuardrailResponse = (userMessage, responseText) => {
    conversationHistory.current = appendConversationTurn(
      conversationHistory.current,
      userMessage,
      responseText,
      MAX_HISTORY_TURNS
    );
    setMessages((previousMessages) => [
      ...previousMessages,
      createBotMessage({ text: responseText }),
    ]);
    setIsLoading(false);
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!input.trim() || isLoading || cooldown > 0 || isExamInProgressRef.current) {
      return;
    }

    const userMessage = input.trim();
    const requestSessionKey = sessionKeyRef.current;
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const historyBeforeRequest = conversationHistory.current;
    const hadHistory = historyBeforeRequest.length > 0;

    setMessages((previousMessages) => [
      ...previousMessages,
      createUserMessage(userMessage),
    ]);
    setInput("");
    setIsLoading(true);

    try {
      const { context, sources } = await searchKnowledgeBase({
        userMessage,
        history: historyBeforeRequest,
      });

      if (sessionKeyRef.current !== requestSessionKey || isExamInProgressRef.current) {
        return;
      }

      const guardrailResponse = getGuardrailResponse({
        userMessage,
        hasContext: Boolean(context),
        hadHistory,
        history: historyBeforeRequest,
      });

      if (guardrailResponse) {
        addGuardrailResponse(userMessage, guardrailResponse);
        return;
      }

      const streamingMessage = createBotMessage({
        text: STREAMING_PLACEHOLDER,
        isStreaming: true,
        sources: userRole === "admin" ? sources : undefined,
      });

      setMessages((previousMessages) => [
        ...previousMessages,
        streamingMessage,
      ]);
      setIsLoading(false);

      const assistantMessages = buildAssistantMessages({
        context,
        history: historyBeforeRequest,
        userMessage,
      });
      const finalReply = await streamAssistantResponse({
        messages: assistantMessages,
        signal: controller.signal,
        shouldContinue: () =>
          sessionKeyRef.current === requestSessionKey &&
          !isExamInProgressRef.current,
        onToken: (fullReply) => {
          setMessages((previousMessages) =>
            replaceMessage(previousMessages, streamingMessage.id, {
              text: fullReply,
            })
          );
        },
      });

      if (
        !finalReply ||
        sessionKeyRef.current !== requestSessionKey ||
        isExamInProgressRef.current
      ) {
        return;
      }

      conversationHistory.current = appendConversationTurn(
        conversationHistory.current,
        userMessage,
        finalReply,
        MAX_HISTORY_TURNS
      );

      setMessages((previousMessages) =>
        replaceMessage(previousMessages, streamingMessage.id, {
          text: finalReply,
          isStreaming: false,
        })
      );
    } catch (error) {
      if (
        error?.name === "AbortError" ||
        sessionKeyRef.current !== requestSessionKey ||
        isExamInProgressRef.current
      ) {
        return;
      }

      console.error("Excepción general en el chatbot:", error);
      const userMessageError = getChatErrorMessage(error);
      setMessages((previousMessages) => {
        const hasStreamBubble = previousMessages.some((message) => message.isStreaming);

        if (hasStreamBubble) {
          return previousMessages.map((message) =>
            message.isStreaming
              ? { ...message, text: userMessageError, isStreaming: false }
              : message
          );
        }

        return [
          ...previousMessages,
          createBotMessage({ text: userMessageError }),
        ];
      });
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }

      if (sessionKeyRef.current === requestSessionKey && !isExamInProgressRef.current) {
        setIsLoading(false);
        startCooldown();
      }
    }
  };

  return {
    input,
    isExpanded,
    isLoading,
    isOpen,
    cooldown,
    messages,
    messagesEndRef,
    closeChat: () => setIsOpen(false),
    handleSend,
    setInput,
    setIsExpanded,
    toggleChat: () => setIsOpen((previousIsOpen) => !previousIsOpen),
  };
}
