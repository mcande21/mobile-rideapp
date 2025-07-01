'use client';

import { useState } from 'react';

interface DebugResult {
  timestamp: string;
  environment: string;
  baseUrl: string;
  userAgent: string;
  platform: string;
  bff_status: string;
  available_endpoints: string[];
  mobile_optimized: boolean;
  capacitor_detected: boolean;
  next_recommendations: string[];
}

interface TestResult {
  endpoint: string;
  status: 'loading' | 'success' | 'error';
  data?: any;
  error?: string;
}

export default function DebugPage() {
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runDebugTest = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      // First get debug info
      const debugResponse = await fetch('/api/bff/debug');
      const debugData = await debugResponse.json();
      
      if (debugData.success && debugData.data) {
        setDebugResult(debugData.data);
      }

      // Test individual endpoints
      const endpoints = [
        { url: '/api/bff/health', name: 'Health Check' },
        { url: '/api/bff/places-autocomplete?input=coffee', name: 'Places Autocomplete' },
        { url: '/api/bff/google-calendar/auth-url?userId=test123', name: 'Google Calendar Auth' },
      ];

      const results: TestResult[] = [];

      for (const endpoint of endpoints) {
        const testResult: TestResult = {
          endpoint: endpoint.name,
          status: 'loading'
        };
        results.push(testResult);
        setTestResults([...results]);

        try {
          const response = await fetch(endpoint.url);
          const data = await response.json();
          
          testResult.status = response.ok ? 'success' : 'error';
          testResult.data = data;
          if (!response.ok) {
            testResult.error = data.error || `HTTP ${response.status}`;
          }
        } catch (error) {
          testResult.status = 'error';
          testResult.error = (error as Error).message;
        }
        
        setTestResults([...results]);
      }
    } catch (error) {
      console.error('Debug test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          🔧 BFF API Debug Test
        </h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <p className="text-gray-600 mb-4">
            Test BFF API endpoints to verify mobile connectivity and functionality.
          </p>

          <button
            onClick={runDebugTest}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '🔄 Testing...' : '🚀 Run Debug Test'}
          </button>
        </div>

        {debugResult && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🌍 Environment Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Environment:</strong> {debugResult.environment}
              </div>
              <div>
                <strong>Platform:</strong> {debugResult.platform}
              </div>
              <div>
                <strong>Base URL:</strong> {debugResult.baseUrl}
              </div>
              <div>
                <strong>BFF Status:</strong> 
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                  {debugResult.bff_status}
                </span>
              </div>
              <div>
                <strong>Mobile Optimized:</strong> {debugResult.mobile_optimized ? '✅' : '❌'}
              </div>
              <div>
                <strong>Capacitor Detected:</strong> {debugResult.capacitor_detected ? '✅' : '❌'}
              </div>
            </div>
            
            <div className="mt-4">
              <strong>Available Endpoints:</strong>
              <ul className="mt-2 space-y-1">
                {debugResult.available_endpoints.map((endpoint) => (
                  <li key={endpoint} className="text-sm text-gray-600">
                    • {endpoint}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🧪 Endpoint Tests</h2>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{result.endpoint}</h3>
                    <span className={`px-2 py-1 rounded text-sm ${
                      result.status === 'loading' 
                        ? 'bg-blue-100 text-blue-800' 
                        : result.status === 'success'
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {result.status === 'loading' ? '🔄 Testing' : 
                       result.status === 'success' ? '✅ Pass' : '❌ Fail'}
                    </span>
                  </div>
                  
                  {result.error && (
                    <div className="text-sm text-red-600 mb-2">
                      Error: {result.error}
                    </div>
                  )}
                  
                  {result.data && result.status === 'success' && (
                    <div className="text-sm text-green-600">
                      ✅ Response received successfully
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
