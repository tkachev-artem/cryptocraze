import React from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { redirectToLogin } from '../lib/authUtils';

export function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Master Crypto Trading Risk-Free
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Learn cryptocurrency trading with virtual money and real market data. Build your skills, earn achievements, and become a confident trader.
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-4"
            onClick={redirectToLogin}
          >
            Start Trading Now
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="text-4xl mb-4">📈</div>
              <CardTitle className="text-xl">Real Market Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Practice with live cryptocurrency prices from major exchanges</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardHeader>
              <div className="text-4xl mb-4">💰</div>
              <CardTitle className="text-xl">Virtual Money</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Start with $10,000 virtual currency to practice without risk</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardHeader>
              <div className="text-4xl mb-4">🐼</div>
              <CardTitle className="text-xl">AI Mentor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Get guidance from Panda, your personal trading mentor</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardHeader>
              <div className="text-4xl mb-4">🎮</div>
              <CardTitle className="text-xl">Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Unlock rewards and track your progress as you improve</p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Ready to Start Your Trading Journey?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Join thousands of traders who have improved their skills with our risk-free simulator.
              </p>
              <Button
                size="lg"
                onClick={redirectToLogin}
              >
                Get Started Free
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}