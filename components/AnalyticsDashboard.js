// Create this file: components/AnalyticsDashboard.js

'use client'

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, PieChart, BarChart3, Target, Calendar, Award, AlertTriangle, ArrowLeft, Database } from 'lucide-react';

const AnalyticsDashboard = ({ positions, closedPositions, settings, realizedPnL, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeFilter, setTimeFilter] = useState('all'); // all, 1m, 3m, 6m, 1y

  // Utility functions
  const formatCurrency = (amount) => `₹${amount.toLocaleString('en-IN')}`;
  const formatCurrencyLakhs = (amount) => `₹${(amount / 100000).toFixed(1)}L`;

  // Calculate metrics
  const getTotalInvested = () => positions.reduce((sum, pos) => sum + pos.totalInvested, 0);
  const getUnrealizedPnL = () => positions.reduce((sum, pos) => sum + pos.pnl, 0);
  const getTotalRealizedPnL = () => closedPositions.reduce((sum, pos) => sum + (pos.realizedPnL || 0), 0);
  const getTotalPnL = () => getUnrealizedPnL() + getTotalRealizedPnL();
  
  const getOverallROI = () => {
    const totalInvested = getTotalInvested() + closedPositions.reduce((sum, pos) => sum + pos.totalInvested, 0);
    return totalInvested > 0 ? (getTotalPnL() / totalInvested) * 100 : 0;
  };

  // Filter closed positions by time
  const getFilteredClosedPositions = () => {
    if (timeFilter === 'all') return closedPositions;
    
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeFilter) {
      case '1m': cutoffDate.setMonth(now.getMonth() - 1); break;
      case '3m': cutoffDate.setMonth(now.getMonth() - 3); break;
      case '6m': cutoffDate.setMonth(now.getMonth() - 6); break;
      case '1y': cutoffDate.setFullYear(now.getFullYear() - 1); break;
    }
    
    return closedPositions.filter(pos => new Date(pos.closedAt) >= cutoffDate);
  };

  // Analytics calculations
  const getWinLossStats = () => {
    const filteredClosed = getFilteredClosedPositions();
    const winners = filteredClosed.filter(pos => pos.realizedPnL > 0);
    const losers = filteredClosed.filter(pos => pos.realizedPnL < 0);
    const totalWinnings = winners.reduce((sum, pos) => sum + pos.realizedPnL, 0);
    const totalLosses = Math.abs(losers.reduce((sum, pos) => sum + pos.realizedPnL, 0));
    
    return {
      totalTrades: filteredClosed.length,
      winners: winners.length,
      losers: losers.length,
      winRate: filteredClosed.length > 0 ? (winners.length / filteredClosed.length) * 100 : 0,
      totalWinnings,
      totalLosses,
      avgWin: winners.length > 0 ? totalWinnings / winners.length : 0,
      avgLoss: losers.length > 0 ? totalLosses / losers.length : 0,
      profitFactor: totalLosses > 0 ? totalWinnings / totalLosses : totalWinnings > 0 ? Infinity : 0
    };
  };

  const getTopPerformers = () => {
    // Active positions
    const activePerformers = positions
      .map(pos => ({
        ...pos,
        type: 'active',
        performance: pos.pnlPercent
      }))
      .sort((a, b) => b.performance - a.performance);

    // Closed positions
    const closedPerformers = getFilteredClosedPositions()
      .map(pos => ({
        ...pos,
        type: 'closed',
        performance: pos.realizedPnLPercent
      }))
      .sort((a, b) => b.performance - a.performance);

    return {
      topWinners: [...activePerformers, ...closedPerformers]
        .filter(pos => pos.performance > 0)
        .slice(0, 5),
      topLosers: [...activePerformers, ...closedPerformers]
        .filter(pos => pos.performance < 0)
        .sort((a, b) => a.performance - b.performance)
        .slice(0, 5)
    };
  };

  const getPortfolioComposition = () => {
    const totalValue = getTotalInvested();
    return positions.map(pos => ({
      ...pos,
      allocation: totalValue > 0 ? (pos.totalInvested / totalValue) * 100 : 0
    })).sort((a, b) => b.allocation - a.allocation);
  };

  const getRiskMetrics = () => {
    const composition = getPortfolioComposition();
    const maxAllocation = Math.max(...composition.map(pos => pos.allocation));
    const herfindahlIndex = composition.reduce((sum, pos) => sum + Math.pow(pos.allocation, 2), 0);
    
    return {
      maxAllocation,
      diversificationScore: 100 - herfindahlIndex,
      riskLevel: maxAllocation > 30 ? 'High' : maxAllocation > 20 ? 'Medium' : 'Low',
      concentrationRisk: herfindahlIndex > 2500 ? 'High' : herfindahlIndex > 1600 ? 'Medium' : 'Low'
    };
  };

  const stats = getWinLossStats();
  const performers = getTopPerformers();
  const composition = getPortfolioComposition();
  const riskMetrics = getRiskMetrics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Portfolio
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Portfolio Analytics</h1>
                <p className="text-gray-600">Comprehensive performance analysis and insights</p>
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="1y">Last Year</option>
                <option value="6m">Last 6 Months</option>
                <option value="3m">Last 3 Months</option>
                <option value="1m">Last Month</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'overview', name: 'Overview', icon: PieChart },
              { id: 'performance', name: 'Performance', icon: TrendingUp },
              { id: 'positions', name: 'Position Analysis', icon: Target },
              { id: 'risk', name: 'Risk Analysis', icon: AlertTriangle },
              { id: 'history', name: 'Trading History', icon: Calendar }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <tab.icon size={18} />
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total P&L</p>
                    <p className={`text-2xl font-bold ${getTotalPnL() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {getTotalPnL() >= 0 ? '+' : ''}{formatCurrency(getTotalPnL())}
                    </p>
                    <p className="text-xs text-gray-500">
                      ROI: {getOverallROI().toFixed(2)}%
                    </p>
                  </div>
                  <TrendingUp className={getTotalPnL() >= 0 ? 'text-green-500' : 'text-red-500'} size={24} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Positions</p>
                    <p className="text-2xl font-bold text-blue-600">{positions.length}</p>
                    <p className="text-xs text-gray-500">
                      {formatCurrencyLakhs(getTotalInvested())} invested
                    </p>
                  </div>
                  <Target className="text-blue-500" size={24} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Closed Trades</p>
                    <p className="text-2xl font-bold text-purple-600">{getFilteredClosedPositions().length}</p>
                    <p className="text-xs text-gray-500">
                      {stats.winRate.toFixed(1)}% win rate
                    </p>
                  </div>
                  <Calendar className="text-purple-500" size={24} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Profit Factor</p>
                    <p className={`text-2xl font-bold ${stats.profitFactor >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Wins/Losses ratio
                    </p>
                  </div>
                  <Award className={stats.profitFactor >= 1 ? 'text-green-500' : 'text-red-500'} size={24} />
                </div>
              </div>
            </div>

            {/* Win/Loss Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4">Trading Performance Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Winners */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-3">🏆 Winning Trades</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Count:</span>
                      <span className="font-medium text-green-700">{stats.winners} trades</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Winnings:</span>
                      <span className="font-medium text-green-700">+{formatCurrency(stats.totalWinnings)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Avg Win:</span>
                      <span className="font-medium text-green-700">+{formatCurrency(stats.avgWin)}</span>
                    </div>
                  </div>
                </div>

                {/* Losers */}
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-3">⚠️ Losing Trades</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Count:</span>
                      <span className="font-medium text-red-700">{stats.losers} trades</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Losses:</span>
                      <span className="font-medium text-red-700">-{formatCurrency(stats.totalLosses)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Avg Loss:</span>
                      <span className="font-medium text-red-700">-{formatCurrency(stats.avgLoss)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Win Rate Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Win Rate</span>
                  <span className="text-sm font-bold text-blue-600">{stats.winRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-500" 
                    style={{width: `${Math.min(stats.winRate, 100)}%`}}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Winners */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4 text-green-700">🏆 Top Winners</h3>
                <div className="space-y-3">
                  {performers.topWinners.length > 0 ? performers.topWinners.map((pos, idx) => (
                    <div key={`${pos.symbol}-${pos.type}-${idx}`} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-green-700">#{idx + 1}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-800">{pos.symbol}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              pos.type === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {pos.type === 'active' ? 'Active' : 'Closed'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          +{pos.performance.toFixed(2)}%
                        </div>
                        <div className="text-sm text-gray-500">
                          +{formatCurrency(pos.type === 'active' ? pos.pnl : pos.realizedPnL)}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-gray-500 text-center py-4">No winning positions yet</p>
                  )}
                </div>
              </div>

              {/* Top Losers */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4 text-red-700">⚠️ Needs Attention</h3>
                <div className="space-y-3">
                  {performers.topLosers.length > 0 ? performers.topLosers.map((pos, idx) => (
                    <div key={`${pos.symbol}-${pos.type}-${idx}`} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-red-700">#{idx + 1}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-800">{pos.symbol}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              pos.type === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {pos.type === 'active' ? 'Active' : 'Closed'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-600">
                          {pos.performance.toFixed(2)}%
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(pos.type === 'active' ? pos.pnl : pos.realizedPnL)}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-gray-500 text-center py-4">No losing positions</p>
                  )}
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4">Performance Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {((positions.filter(p => p.pnl > 0).length + getFilteredClosedPositions().filter(p => p.realizedPnL > 0).length) / 
                      (positions.length + getFilteredClosedPositions().length) * 100 || 0).toFixed(1)}%
                  </div>
                  <p className="text-gray-600">Overall Win Rate</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {formatCurrency(Math.max(...[...positions.map(p => p.pnl), ...getFilteredClosedPositions().map(p => p.realizedPnL)]) || 0)}
                  </div>
                  <p className="text-gray-600">Best Single Trade</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {(getTotalInvested() / settings.totalCapital * 100).toFixed(1)}%
                  </div>
                  <p className="text-gray-600">Capital Deployed</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'positions' && (
          <div className="space-y-6">
            {/* Portfolio Composition */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4">Current Portfolio Composition</h3>
              <div className="space-y-4">
                {composition.map((pos, idx) => (
                  <div key={pos.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="font-bold text-blue-700">{idx + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">{pos.symbol}</h4>
                        <p className="text-sm text-gray-500">
                          {pos.currentQuantity} shares • Pyramids: {pos.pyramidCount}/{pos.maxPyramidCount}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium text-gray-800">
                        {formatCurrency(pos.totalInvested)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {pos.allocation.toFixed(1)}% allocation
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-medium ${pos.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pos.pnl >= 0 ? '+' : ''}{formatCurrency(pos.pnl)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%
                      </div>
                    </div>

                    {/* Allocation Bar */}
                    <div className="w-20">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                          style={{width: `${Math.min(pos.allocation, 100)}%`}}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="space-y-6">
            {/* Risk Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h4 className="font-medium text-gray-800 mb-2">Portfolio Concentration</h4>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {riskMetrics.maxAllocation.toFixed(1)}%
                </div>
                <p className="text-sm text-gray-500">Max single position</p>
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                  riskMetrics.riskLevel === 'High' ? 'bg-red-100 text-red-700' :
                  riskMetrics.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {riskMetrics.riskLevel} Risk
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h4 className="font-medium text-gray-800 mb-2">Diversification Score</h4>
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {(riskMetrics.diversificationScore || 0).toFixed(0)}
                </div>
                <p className="text-sm text-gray-500">Out of 100</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                    style={{width: `${riskMetrics.diversificationScore || 0}%`}}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h4 className="font-medium text-gray-800 mb-2">Capital Utilization</h4>
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {((getTotalInvested() / (settings.totalCapital - settings.buffer)) * 100).toFixed(1)}%
                </div>
                <p className="text-sm text-gray-500">Of trading capital</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-500" 
                    style={{width: `${Math.min((getTotalInvested() / (settings.totalCapital - settings.buffer)) * 100, 100)}%`}}
                  ></div>
                </div>
              </div>
            </div>

            {/* Risk Analysis */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4">Risk Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">Position Size Analysis</h4>
                  <div className="space-y-3">
                    {composition.slice(0, 5).map((pos) => (
                      <div key={pos.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{pos.symbol}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                pos.allocation > 25 ? 'bg-red-500' :
                                pos.allocation > 15 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{width: `${Math.min((pos.allocation / 30) * 100, 100)}%`}}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-800">{pos.allocation.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-3">Risk Recommendations</h4>
                  <div className="space-y-2">
                    {riskMetrics.maxAllocation > 25 && (
                      <div className="flex items-start gap-2 text-sm text-red-600">
                        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                        <span>Consider reducing position size of largest holding</span>
                      </div>
                    )}
                    {positions.length < settings.maxStocks && (
                      <div className="flex items-start gap-2 text-sm text-blue-600">
                        <Target size={16} className="mt-0.5 flex-shrink-0" />
                        <span>Room for {settings.maxStocks - positions.length} more positions to improve diversification</span>
                      </div>
                    )}
                    {(riskMetrics.diversificationScore || 0) < 70 && (
                      <div className="flex items-start gap-2 text-sm text-yellow-600">
                        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                        <span>Portfolio could benefit from better diversification</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Closed Positions Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4">Trading History Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{getFilteredClosedPositions().length}</div>
                  <p className="text-sm text-gray-600">Total Trades</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.winners}</div>
                  <p className="text-sm text-gray-600">Winning Trades</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{stats.losers}</div>
                  <p className="text-sm text-gray-600">Losing Trades</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(getTotalRealizedPnL())}</div>
                  <p className="text-sm text-gray-600">Total Realized P&L</p>
                </div>
              </div>
            </div>

            {/* Closed Positions Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Closed Positions History</h3>
              </div>
              
              {getFilteredClosedPositions().length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No closed positions in selected time period</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invested</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exit Value</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">P&L</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Held</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Closed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getFilteredClosedPositions()
                        .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt))
                        .map((position) => {
                          const daysHeld = Math.floor((new Date(position.closedAt) - new Date(position.createdAt || position.closedAt)) / (1000 * 60 * 60 * 24));
                          return (
                            <tr key={position.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="font-medium text-gray-900">{position.symbol}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                                ₹{position.entryPrice.toFixed(2)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                                ₹{position.exitPrice.toFixed(2)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                                {position.quantity}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                                {formatCurrency(position.totalInvested)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                                {formatCurrency(position.exitValue)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className={`font-medium ${position.realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {position.realizedPnL >= 0 ? '+' : ''}{formatCurrency(position.realizedPnL)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ({position.realizedPnLPercent >= 0 ? '+' : ''}{position.realizedPnLPercent.toFixed(2)}%)
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                                {daysHeld > 0 ? `${daysHeld}d` : '<1d'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(position.closedAt).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Monthly Performance */}
            {getFilteredClosedPositions().length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4">Monthly Performance</h3>
                <div className="space-y-3">
                  {(() => {
                    const monthlyStats = {};
                    getFilteredClosedPositions().forEach(pos => {
                      const month = new Date(pos.closedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
                      if (!monthlyStats[month]) {
                        monthlyStats[month] = { pnl: 0, trades: 0, winners: 0 };
                      }
                      monthlyStats[month].pnl += pos.realizedPnL;
                      monthlyStats[month].trades += 1;
                      if (pos.realizedPnL > 0) monthlyStats[month].winners += 1;
                    });

                    return Object.entries(monthlyStats)
                      .sort(([a], [b]) => new Date(a) - new Date(b))
                      .reverse()
                      .slice(0, 6)
                      .map(([month, stats]) => (
                        <div key={month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-800">{month}</div>
                            <div className="text-sm text-gray-500">
                              {stats.trades} trades • {((stats.winners / stats.trades) * 100).toFixed(0)}% win rate
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-medium ${stats.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {stats.pnl >= 0 ? '+' : ''}{formatCurrency(stats.pnl)}
                            </div>
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;