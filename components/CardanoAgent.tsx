import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MasumiAgent } from '../services/masumiAgent';
import { AgentMessage } from '../types/agent';

interface CardanoAgentProps {
  onClose?: () => void;
}

export const CardanoAgent: React.FC<CardanoAgentProps> = ({ onClose }) => {
  const [agent] = useState(() => new MasumiAgent());
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    initializeAgent();
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const initializeAgent = async () => {
    setIsInitializing(true);
    const success = await agent.initialize();
    setIsInitialized(success);
    setIsInitializing(false);

    if (success) {
      // Add welcome message
      const welcomeMessage: AgentMessage = {
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I\'m your Cardano blockchain assistant. I can help you with questions about Cardano, wallets, transactions, staking, and more. How can I assist you today?',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    } else {
      Alert.alert(
        'Initialization Failed',
        'Failed to initialize the agent. Please check your internet connection and try again.'
      );
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isProcessing || !isInitialized) {
      return;
    }

    const query = inputText.trim();
    setInputText('');
    setIsProcessing(true);

    // Add user message to UI immediately
    const userMessage: AgentMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await agent.processQuery(query);
      const state = agent.getState();

      if (response.success && response.message) {
        // Update messages from agent state
        setMessages(state.messages);
      } else {
        // Show error message
        const errorMessage: AgentMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Sorry, I encountered an error: ${response.error || 'Unknown error'}. Please try again.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: AgentMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSampleQuery = async (queryType: 'cardano_basics' | 'wallet_help' | 'transaction_help' | 'staking') => {
    if (isProcessing || !isInitialized) return;

    setIsProcessing(true);
    try {
      const response = await agent.processSampleQuery(queryType);
      const state = agent.getState();
      setMessages(state.messages);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to process query');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cardano Assistant</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {isInitializing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0033AD" />
          <Text style={styles.loadingText}>Initializing agent...</Text>
        </View>
      ) : !isInitialized ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Agent not initialized</Text>
          <TouchableOpacity onPress={initializeAgent} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.role === 'user' ? styles.userMessage : styles.assistantMessage,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.role === 'user' ? styles.userMessageText : styles.assistantMessageText,
                  ]}
                >
                  {message.content}
                </Text>
                <Text style={styles.messageTime}>{formatTime(message.timestamp)}</Text>
              </View>
            ))}
            {isProcessing && (
              <View style={[styles.messageContainer, styles.assistantMessage]}>
                <ActivityIndicator size="small" color="#0033AD" />
                <Text style={styles.processingText}>Thinking...</Text>
              </View>
            )}
          </ScrollView>

          {/* Sample Query Buttons */}
          {messages.length === 1 && (
            <View style={styles.sampleQueriesContainer}>
              <Text style={styles.sampleQueriesTitle}>Try asking:</Text>
              <View style={styles.sampleButtonsRow}>
                <TouchableOpacity
                  style={styles.sampleButton}
                  onPress={() => handleSampleQuery('cardano_basics')}
                  disabled={isProcessing}
                >
                  <Text style={styles.sampleButtonText}>What is Cardano?</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sampleButton}
                  onPress={() => handleSampleQuery('wallet_help')}
                  disabled={isProcessing}
                >
                  <Text style={styles.sampleButtonText}>Wallet Help</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.sampleButtonsRow}>
                <TouchableOpacity
                  style={styles.sampleButton}
                  onPress={() => handleSampleQuery('transaction_help')}
                  disabled={isProcessing}
                >
                  <Text style={styles.sampleButtonText}>Transactions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sampleButton}
                  onPress={() => handleSampleQuery('staking')}
                  disabled={isProcessing}
                >
                  <Text style={styles.sampleButtonText}>Staking</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about Cardano..."
              placeholderTextColor="#999"
              multiline
              editable={!isProcessing}
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isProcessing) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0033AD',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#0033AD',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#0033AD',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: '#000000',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  processingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  sampleQueriesContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sampleQueriesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  sampleButtonsRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  sampleButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sampleButtonText: {
    fontSize: 13,
    color: '#0033AD',
    textAlign: 'center',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    backgroundColor: '#F9FAFB',
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#0033AD',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

