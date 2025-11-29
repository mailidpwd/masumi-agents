/**
 * Backend Test Panel
 * Simple UI to test backend services
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { testBackendServices } from '../tests/backendTest';
import { runEndToEndTests } from '../tests/endToEndFlowTest';

export const BackendTestPanel: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testType, setTestType] = useState<'backend' | 'e2e'>('backend');

  const runTests = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      // Redirect console.log to capture test output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
        originalLog(...args);
      };

      let success = false;
      
      if (testType === 'backend') {
        success = await testBackendServices();
        setTestResult(logs.join('\n') + '\n\n' + (success ? '✅ All backend tests passed!' : '❌ Tests failed'));
      } else {
        const results = await runEndToEndTests();
        success = results.every(r => r.success);
        const summary = results.map(r => 
          `${r.success ? '✅' : '❌'} ${r.testName} - ${r.duration}ms${r.error ? `\n   Error: ${r.error}` : ''}`
        ).join('\n');
        setTestResult(logs.join('\n') + '\n\n' + summary + '\n\n' + 
          (success ? '✅ All end-to-end tests passed!' : '❌ Some tests failed'));
      }
      
      console.log = originalLog;
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Backend Services Test</Text>
        <Text style={styles.subtitle}>Verify all services are working correctly</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.testTypeSelector}>
          <TouchableOpacity
            style={[styles.testTypeButton, testType === 'backend' && styles.testTypeButtonActive]}
            onPress={() => setTestType('backend')}
          >
            <Text style={[styles.testTypeText, testType === 'backend' && styles.testTypeTextActive]}>
              Backend Tests
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.testTypeButton, testType === 'e2e' && styles.testTypeButtonActive]}
            onPress={() => setTestType('e2e')}
          >
            <Text style={[styles.testTypeText, testType === 'e2e' && styles.testTypeTextActive]}>
              End-to-End Tests
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.testButton, testing && styles.testButtonDisabled]}
          onPress={runTests}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.testButtonText}>
              Run {testType === 'backend' ? 'Backend' : 'End-to-End'} Tests
            </Text>
          )}
        </TouchableOpacity>

        {testResult && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Test Results:</Text>
            <ScrollView style={styles.resultScroll}>
              <Text style={styles.resultText}>{testResult}</Text>
            </ScrollView>
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>
            {testType === 'backend' ? 'Backend Tests:' : 'End-to-End Tests:'}
          </Text>
          {testType === 'backend' ? (
            <>
              <Text style={styles.infoText}>• Marketplace Service</Text>
              <Text style={styles.infoText}>• HabitNFT Service</Text>
              <Text style={styles.infoText}>• Liquidity Pool Service</Text>
              <Text style={styles.infoText}>• Vault Service</Text>
              <Text style={styles.infoText}>• Agent Methods</Text>
            </>
          ) : (
            <>
              <Text style={styles.infoText}>• Marketplace Flow</Text>
              <Text style={styles.infoText}>• LP Creation & Investment</Text>
              <Text style={styles.infoText}>• Vault Creation & Unlock</Text>
              <Text style={styles.infoText}>• Complete Goal Flow</Text>
              <Text style={styles.infoText}>• Cross-Feature Integration</Text>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#0033AD',
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  content: {
    padding: 20,
  },
  testTypeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  testTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  testTypeButtonActive: {
    borderColor: '#0033AD',
    backgroundColor: '#E0E7FF',
  },
  testTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  testTypeTextActive: {
    color: '#0033AD',
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  testButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  resultScroll: {
    maxHeight: 400,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
  infoContainer: {
    backgroundColor: '#E0E7FF',
    borderRadius: 8,
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0033AD',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
});

