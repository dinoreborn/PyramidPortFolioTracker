'use client'

import React, { useState, useEffect } from 'react';
import { Plus, Minus, TrendingUp, AlertTriangle, DollarSign, Settings, Save, Edit3, Check, X, Database,PieChart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AnalyticsDashboard from './AnalyticsDashboard';

const PortfolioTracker = () => {
  const [positions, setPositions] = useState([]);
  const [closedPositions, setClosedPositions] = useState([]);
  const [showClosedPositions, setShowClosedPositions] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeModal, setCloseModal] = useState({ positionId: null, exitPrice: '', quantity: '', position: null });
  const [importData, setImportData] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [newStock, setNewStock] = useState({ symbol: '', price: '', quantity: '' });
  const [pyramidInput, setPyramidInput] = useState({ positionId: null, quantity: '', useCustomQuantity: false });
  const [editingQuantity, setEditingQuantity] = useState({ positionId: null, quantity: '' });
  const [showPyramidModal, setShowPyramidModal] = useState(false);
  const [pyramidModal, setPyramidModal] = useState({ positionId: null, price: '', quantity: '', position: null });
  const [realizedPnL, setRealizedPnL] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const [settings, setSettings] = useState({
    totalCapital: 1200000,
    buffer: 200000,
    maxAllocation: 0.25,
    trancheSize: 125000,
    maxStocks: 8,
    maxPyramidsPerStock: 3,
    pyramidIncrementPercent: 50
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const [user, setUser] = useState(null);

  // Initialize user and load data
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUser(user);
        } else {
          // Sign in anonymously
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) {
            console.error('Error signing in:', error);
          } else {
            setUser(data.user);
          }
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        setIsLoading(false);
      }
    };

    initializeUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data when user is available
  useEffect(() => {
    if (user) {
      loadFromSupabase();
    }
  }, [user]);

  // Auto-calculate tranche size whenever relevant settings change
  useEffect(() => {
    const tradingCapital = settings.totalCapital - settings.buffer;
    const calculatedTranche = Math.floor(tradingCapital / settings.maxStocks);
    
    if (calculatedTranche !== settings.trancheSize) {
      setSettings(prev => ({
        ...prev,
        trancheSize: calculatedTranche
      }));
    }
  }, [settings.totalCapital, settings.buffer, settings.maxStocks]);

  // Auto-save positions when they change
  useEffect(() => {
    if (!isLoading && positions.length > 0 && user) {
      const timeoutId = setTimeout(() => {
        savePositionsToSupabase();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [positions, isLoading, user]);

  // Auto-save settings when they change
  useEffect(() => {
    if (!isLoading && user) {
      const timeoutId = setTimeout(() => {
        saveSettingsToSupabase();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [settings, isLoading, user]);

  const loadFromSupabase = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setSaveStatus('Loading...');

      // Load active positions
      const { data: positionsData, error: positionsError } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (positionsError) throw positionsError;

      // Load closed positions
      const { data: closedPositionsData, error: closedPositionsError } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .order('closed_at', { ascending: false });

      if (closedPositionsError) throw closedPositionsError;

      // Load settings - with better error handling for new users
      let settingsData = null;
      try {
        const { data, error: settingsError } = await supabase
          .from('portfolio_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          throw settingsError;
        }
        settingsData = data;
      } catch (settingsErr) {
        console.log('No settings found for user, will create defaults:', settingsErr.message);
        // Create default settings for new user
        const defaultSettings = {
          user_id: user.id,
          total_capital: 1200000,
          buffer: 200000,
          max_allocation: 0.250,
          max_stocks: 8,
          max_pyramid_count: 3,
          pyramid_increment_percent: 50
        };

        const { data: newSettings, error: createError } = await supabase
          .from('portfolio_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (createError) {
          console.error('Error creating default settings:', createError);
        } else {
          settingsData = newSettings;
        }
      }

      // Set active positions
      if (positionsData && positionsData.length > 0) {
        const formattedPositions = positionsData.map(pos => ({
          id: pos.id,
          symbol: pos.symbol,
          entryPrice: parseFloat(pos.entry_price),
          currentPrice: parseFloat(pos.current_price),
          baseQuantity: pos.base_quantity,
          currentQuantity: pos.current_quantity,
          baseSize: pos.base_size,
          currentSize: pos.current_size,
          pyramidCount: pos.pyramid_count,
          maxPyramidCount: pos.max_pyramid_count,
          totalInvested: pos.total_invested,
          pnl: pos.pnl,
          pnlPercent: parseFloat(pos.pnl_percent),
          status: pos.status || 'active'
        }));
        setPositions(formattedPositions);
      }

      // Set closed positions
      if (closedPositionsData && closedPositionsData.length > 0) {
        const formattedClosedPositions = closedPositionsData.map(pos => ({
          id: pos.id,
          symbol: pos.symbol,
          entryPrice: parseFloat(pos.entry_price),
          exitPrice: parseFloat(pos.exit_price || pos.current_price),
          quantity: pos.current_quantity,
          totalInvested: pos.total_invested,
          exitValue: pos.exit_value,
          realizedPnL: pos.realized_pnl,
          realizedPnLPercent: parseFloat(pos.realized_pnl_percent || 0),
          closedAt: pos.closed_at,
          status: 'closed'
        }));
        setClosedPositions(formattedClosedPositions);
        
        // Update total realized P&L
        const totalRealized = formattedClosedPositions.reduce((sum, pos) => sum + (pos.realizedPnL || 0), 0);
        setRealizedPnL(totalRealized);
      }

      // Set settings
      if (settingsData) {
        setSettings({
          totalCapital: settingsData.total_capital,
          buffer: settingsData.buffer,
          maxAllocation: parseFloat(settingsData.max_allocation),
          trancheSize: Math.floor((settingsData.total_capital - settingsData.buffer) / settingsData.max_stocks),
          maxStocks: settingsData.max_stocks,
          maxPyramidsPerStock: settingsData.max_pyramid_count || 3,
          pyramidIncrementPercent: settingsData.pyramid_increment_percent
        });
      }

      setSaveStatus('Loaded from database');
      setTimeout(() => setSaveStatus(''), 2000);

    } catch (error) {
      console.error('Error loading from Supabase:', error);
      setSaveStatus('Error loading data');
    } finally {
      setIsLoading(false);
    }
  };

  const savePositionsToSupabase = async () => {
    if (!user) return;
    
    try {
      setSaveStatus('Saving...');

      // Delete existing ACTIVE positions for this user (don't touch closed ones)
      await supabase
        .from('positions')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'active');

      // Insert new active positions
      if (positions.length > 0) {
        const formattedPositions = positions.map(pos => ({
          id: pos.id,
          user_id: user.id,
          symbol: pos.symbol,
          entry_price: pos.entryPrice,
          current_price: pos.currentPrice,
          base_quantity: pos.baseQuantity,
          current_quantity: pos.currentQuantity,
          base_size: pos.baseSize,
          current_size: pos.currentSize,
          pyramid_count: pos.pyramidCount,
          max_pyramid_count: pos.maxPyramidCount,
          total_invested: pos.totalInvested,
          pnl: pos.pnl,
          pnl_percent: pos.pnlPercent,
          status: 'active'
        }));

        const { error } = await supabase
          .from('positions')
          .insert(formattedPositions);

        if (error) throw error;
      }

      setSaveStatus('✅ Saved');
      setTimeout(() => setSaveStatus(''), 2000);

    } catch (error) {
      console.error('Error saving positions:', error);
      setSaveStatus('❌ Save failed');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const saveSettingsToSupabase = async () => {
    if (!user) return;
    
    try {
      const settingsData = {
        user_id: user.id,
        total_capital: settings.totalCapital,
        buffer: settings.buffer,
        max_allocation: settings.maxAllocation,
        max_stocks: settings.maxStocks,
        max_pyramid_count: settings.maxPyramidsPerStock,
        pyramid_increment_percent: settings.pyramidIncrementPercent,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('portfolio_settings')
        .upsert(settingsData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const TRADING_CAPITAL = settings.totalCapital - settings.buffer;
  const BASE_POSITION = settings.trancheSize;
  const PYRAMID_INCREMENT = BASE_POSITION * (settings.pyramidIncrementPercent / 100);

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatCurrencyLakhs = (amount) => {
    return `₹${(amount / 100000).toFixed(1)}L`;
  };

  const addNewPosition = () => {
    if (!newStock.symbol || !newStock.price || !newStock.quantity) return;
    
    if (positions.length >= settings.maxStocks) {
      alert(`Cannot exceed maximum of ${settings.maxStocks} stocks in portfolio`);
      return;
    }
    
    const quantity = parseInt(newStock.quantity);
    const positionSize = quantity * parseFloat(newStock.price);
    
    const maxAllowed = TRADING_CAPITAL * settings.maxAllocation;
    if (positionSize > maxAllowed) {
      alert(`Position size ₹${(positionSize/100000).toFixed(1)}L exceeds maximum allocation of ${formatCurrencyLakhs(maxAllowed)} (${(settings.maxAllocation * 100)}% limit)`);
      return;
    }
    
    const maxPyramidedPosition = settings.trancheSize * 2.5;
    if (positionSize > maxPyramidedPosition) {
      alert(`Position size ₹${(positionSize/100000).toFixed(1)}L exceeds 250% pyramid limit of ${formatCurrencyLakhs(maxPyramidedPosition)}`);
      return;
    }

    const newPosition = {
      id: crypto.randomUUID(),
      symbol: newStock.symbol.toUpperCase(),
      entryPrice: parseFloat(newStock.price),
      currentPrice: parseFloat(newStock.price),
      baseQuantity: quantity,
      currentQuantity: quantity,
      baseSize: positionSize,
      currentSize: positionSize,
      pyramidCount: 0,
      maxPyramidCount: settings.maxPyramidsPerStock,
      totalInvested: positionSize,
      pnl: 0,
      pnlPercent: 0
    };

    setPositions([...positions, newPosition]);
    setNewStock({ symbol: '', price: '', quantity: '' });
  };

  const addCustomPyramid = () => {
    if (pyramidModal.price && pyramidModal.quantity) {
      addPyramid(pyramidModal.positionId, pyramidModal.quantity, parseFloat(pyramidModal.price));
    }
  };

  const addPyramid = (id, customQuantity = null, customPrice = null) => {
    setPositions(positions.map(pos => {
      if (pos.id === id && pos.pyramidCount < pos.maxPyramidCount) {
        let pyramidQuantity;
        let pyramidIncrement;
        let pyramidPrice = customPrice || pos.currentPrice;
        
        if (customQuantity && customPrice) {
          pyramidQuantity = parseInt(customQuantity);
          pyramidIncrement = pyramidQuantity * pyramidPrice;
        } else {
          pyramidIncrement = pos.baseSize * (settings.pyramidIncrementPercent / 100);
          pyramidQuantity = Math.floor(pyramidIncrement / pyramidPrice);
        }
        
        const newSize = pos.currentSize + pyramidIncrement;
        const newQuantity = pos.currentQuantity + pyramidQuantity;
        const maxAllowed = TRADING_CAPITAL * settings.maxAllocation;
        
        if (newSize > maxAllowed) {
          alert(`Cannot exceed ${formatCurrencyLakhs(maxAllowed)} per stock (${(settings.maxAllocation * 100)}% limit)`);
          return pos;
        }

        const maxPyramidedPosition = pos.baseSize * 2.5;
        if (newSize > maxPyramidedPosition) {
          alert(`Cannot exceed 250% pyramid limit of ${formatCurrencyLakhs(maxPyramidedPosition)} for this position`);
          return pos;
        }

        const newTotalInvested = pos.totalInvested + pyramidIncrement;
        
        const currentValue = pos.currentPrice * newQuantity;
        const pnl = currentValue - newTotalInvested;
        const pnlPercent = (pnl / newTotalInvested) * 100;
        
        return {
          ...pos,
          currentSize: newSize,
          currentQuantity: newQuantity,
          pyramidCount: pos.pyramidCount + 1,
          totalInvested: newTotalInvested,
          pnl,
          pnlPercent
        };
      }
      return pos;
    }));
    
    setPyramidInput({ positionId: null, quantity: '', useCustomQuantity: false });
    setShowPyramidModal(false);
    setPyramidModal({ positionId: null, price: '', quantity: '', position: null });
  };

  const updateQuantity = (id, newQuantity) => {
    const qty = parseInt(newQuantity) || 0;
    if (qty <= 0) return;
    
    setPositions(positions.map(pos => {
      if (pos.id === id) {
        const newCurrentSize = qty * pos.currentPrice;
        const maxAllowed = TRADING_CAPITAL * settings.maxAllocation;
        
        if (newCurrentSize > maxAllowed) {
          alert(`Position would exceed ${formatCurrencyLakhs(maxAllowed)} limit (${(settings.maxAllocation * 100)}%)`);
          return pos;
        }
        
        const avgCostBasis = pos.totalInvested / pos.currentQuantity;
        const newTotalInvested = qty * avgCostBasis;
        
        const currentValue = pos.currentPrice * qty;
        const pnl = currentValue - newTotalInvested;
        const pnlPercent = (pnl / newTotalInvested) * 100;
        
        return {
          ...pos,
          currentQuantity: qty,
          currentSize: newCurrentSize,
          totalInvested: newTotalInvested,
          pnl,
          pnlPercent
        };
      }
      return pos;
    }));
    
    setEditingQuantity({ positionId: null, quantity: '' });
  };

  const updateLTP = (id, ltp) => {
    setPositions(positions.map(pos => {
      if (pos.id === id) {
        const price = parseFloat(ltp) || pos.currentPrice;
        const currentValue = price * pos.currentQuantity;
        const pnl = currentValue - pos.totalInvested;
        const pnlPercent = (pnl / pos.totalInvested) * 100;
        
        return {
          ...pos,
          currentPrice: price,
          pnl,
          pnlPercent
        };
      }
      return pos;
    }));
  };

  const removePosition = async (id, action = 'delete') => {
    const position = positions.find(pos => pos.id === id);
    if (!position) return;

    if (action === 'close') {
      setCloseModal({
        positionId: position.id,
        exitPrice: position.currentPrice.toString(),
        quantity: position.currentQuantity.toString(),
        position: position
      });
      setShowCloseModal(true);
    } else {
      if (!user) return;
      try {
        const { error } = await supabase
          .from('positions')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        setPositions(positions.filter(pos => pos.id !== id));
        
        setSaveStatus('✅ Position deleted');
        setTimeout(() => setSaveStatus(''), 2000);

      } catch (error) {
        console.error('Error deleting position:', error);
        setSaveStatus('❌ Error deleting position');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    }
  };

  const closePositionWithCustom = async () => {
    if (!closeModal.exitPrice || !closeModal.quantity || !user) return;

    const position = closeModal.position;
    const exitPrice = parseFloat(closeModal.exitPrice);
    const quantityToClose = parseInt(closeModal.quantity);
    const remainingQuantity = position.currentQuantity - quantityToClose;

    if (quantityToClose <= 0 || quantityToClose > position.currentQuantity) {
      alert('Invalid quantity to close');
      return;
    }

    try {
      if (remainingQuantity > 0) {
        // Partial close
        const closedPortion = quantityToClose / position.currentQuantity;
        const closedInvestment = position.totalInvested * closedPortion;
        const exitValue = exitPrice * quantityToClose;
        const realizedPnL = exitValue - closedInvestment;
        const realizedPnLPercent = (realizedPnL / closedInvestment) * 100;

        // Create closed position record
        const { error: closedError } = await supabase
          .from('positions')
          .insert({
            id: crypto.randomUUID(),
            user_id: user.id,
            symbol: position.symbol,
            entry_price: position.entryPrice,
            current_price: exitPrice,
            base_quantity: Math.round(position.baseQuantity * closedPortion),
            current_quantity: quantityToClose,
            base_size: position.baseSize * closedPortion,
            current_size: closedInvestment,
            pyramid_count: position.pyramidCount,
            max_pyramid_count: position.maxPyramidCount,
            total_invested: closedInvestment,
            pnl: realizedPnL,
            pnl_percent: realizedPnLPercent,
            status: 'closed',
            exit_price: exitPrice,
            exit_value: exitValue,
            realized_pnl: realizedPnL,
            realized_pnl_percent: realizedPnLPercent,
            closed_at: new Date().toISOString()
          });

        if (closedError) throw closedError;

        // Update remaining position
        const remainingInvestment = position.totalInvested * (1 - closedPortion);
        const currentValue = position.currentPrice * remainingQuantity;
        const newPnL = currentValue - remainingInvestment;
        const newPnLPercent = (newPnL / remainingInvestment) * 100;

        const { error: updateError } = await supabase
          .from('positions')
          .update({
            current_quantity: remainingQuantity,
            base_quantity: Math.round(position.baseQuantity * (1 - closedPortion)),
            current_size: remainingInvestment,
            base_size: position.baseSize * (1 - closedPortion),
            total_invested: remainingInvestment,
            pnl: newPnL,
            pnl_percent: newPnLPercent
          })
          .eq('id', position.id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        // Update local state
        setPositions(positions.map(pos => 
          pos.id === position.id 
            ? {
                ...pos,
                currentQuantity: remainingQuantity,
                baseQuantity: Math.round(position.baseQuantity * (1 - closedPortion)),
                currentSize: remainingInvestment,
                baseSize: position.baseSize * (1 - closedPortion),
                totalInvested: remainingInvestment,
                pnl: newPnL,
                pnlPercent: newPnLPercent
              }
            : pos
        ));

        // Add to closed positions
        const closedPosition = {
          id: crypto.randomUUID(),
          symbol: position.symbol,
          entryPrice: position.entryPrice,
          exitPrice: exitPrice,
          quantity: quantityToClose,
          totalInvested: closedInvestment,
          exitValue: exitValue,
          realizedPnL: realizedPnL,
          realizedPnLPercent: realizedPnLPercent,
          closedAt: new Date().toISOString(),
          status: 'closed'
        };

        setClosedPositions(prev => [closedPosition, ...prev]);
        setRealizedPnL(prev => prev + realizedPnL);

      } else {
        // Full close
        const exitValue = exitPrice * quantityToClose;
        const realizedPnL = exitValue - position.totalInvested;
        const realizedPnLPercent = (realizedPnL / position.totalInvested) * 100;

        const { error } = await supabase
          .from('positions')
          .update({
            status: 'closed',
            exit_price: exitPrice,
            exit_value: exitValue,
            realized_pnl: realizedPnL,
            realized_pnl_percent: realizedPnLPercent,
            closed_at: new Date().toISOString()
          })
          .eq('id', position.id)
          .eq('user_id', user.id);

        if (error) throw error;

        const closedPosition = {
          id: position.id,
          symbol: position.symbol,
          entryPrice: position.entryPrice,
          exitPrice: exitPrice,
          quantity: quantityToClose,
          totalInvested: position.totalInvested,
          exitValue: exitValue,
          realizedPnL: realizedPnL,
          realizedPnLPercent: realizedPnLPercent,
          closedAt: new Date().toISOString(),
          status: 'closed'
        };

        setClosedPositions(prev => [closedPosition, ...prev]);
        setRealizedPnL(prev => prev + realizedPnL);
        setPositions(positions.filter(pos => pos.id !== position.id));
      }

      setShowCloseModal(false);
      setCloseModal({ positionId: null, exitPrice: '', quantity: '', position: null });
      
      setSaveStatus('✅ Position closed');
      setTimeout(() => setSaveStatus(''), 2000);

    } catch (error) {
      console.error('Error closing position:', error);
      setSaveStatus('❌ Error closing position');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const getTotalInvested = () => {
    return positions.reduce((sum, pos) => sum + pos.totalInvested, 0);
  };

  const getTotalPnL = () => {
    return positions.reduce((sum, pos) => sum + pos.pnl, 0);
  };

  const getAvailableCapital = () => {
    return TRADING_CAPITAL - getTotalInvested();
  };

  const getMaxNewPositions = () => {
    return Math.max(0, settings.maxStocks - positions.length);
  };

  const getPortfolioUtilization = () => {
    return (getTotalInvested() / TRADING_CAPITAL) * 100;
  };

  const getUnrealizedPnL = () => {
    return positions.reduce((sum, pos) => sum + pos.pnl, 0);
  };

  const getTotalROI = () => {
    const totalInvested = getTotalInvested();
    if (totalInvested === 0) return 0;
    return ((realizedPnL + getUnrealizedPnL()) / totalInvested) * 100;
  };

  const updateSettings = (newSettings) => {
    setPositions(positions.map(pos => ({
      ...pos,
      maxPyramidCount: newSettings.maxPyramidsPerStock,
      pyramidCount: Math.min(pos.pyramidCount, newSettings.maxPyramidsPerStock)
    })));
    
    setSettings(newSettings);
    setShowSettings(false);
  };

  const adjustPyramidCount = (id, newCount) => {
    const count = parseInt(newCount) || 0;
    if (count < 0 || count > settings.maxPyramidsPerStock) return;
    
    setPositions(positions.map(pos => {
      if (pos.id === id) {
        return {
          ...pos,
          pyramidCount: count,
          maxPyramidCount: settings.maxPyramidsPerStock
        };
      }
      return pos;
    }));
  };

  const openPyramidModal = (position) => {
    setPyramidModal({
      positionId: position.id,
      price: position.currentPrice.toString(),
      quantity: '',
      position: position
    });
    setShowPyramidModal(true);
  };

  const importFromExcel = (csvData, showAlert = true) => {
    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',');
      
      const requiredHeaders = ['Symbol', 'Current_Price', 'Total_Quantity', 'Avg_Cost', 'Pyramid_Level'];
      const hasAllHeaders = requiredHeaders.every(header => 
        headers.some(h => h.trim().toLowerCase() === header.toLowerCase())
      );
      
      if (!hasAllHeaders) {
        alert('Invalid format. Required columns: Symbol, Current_Price, Total_Quantity, Avg_Cost, Pyramid_Level');
        return;
      }
      
      const importedPositions = [];
      const symbolGroups = {};
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length < 5) continue;
        
        const symbol = values[0].trim().toUpperCase();
        const currentPrice = parseFloat(values[1]) || 0;
        const quantity = parseInt(values[2]) || 0;
        const avgCost = parseFloat(values[3]) || 0;
        const pyramidLevel = parseInt(values[4]) || 0;
        
        if (!symbol || !currentPrice || !quantity || !avgCost) continue;
        
        if (!symbolGroups[symbol]) {
          symbolGroups[symbol] = [];
        }
        
        symbolGroups[symbol].push({
          currentPrice,
          quantity,
          avgCost,
          pyramidLevel,
          investment: quantity * avgCost
        });
      }
      
      Object.keys(symbolGroups).forEach(symbol => {
        const entries = symbolGroups[symbol];
        entries.sort((a, b) => a.pyramidLevel - b.pyramidLevel);
        
        const totalQuantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);
        const totalInvestment = entries.reduce((sum, entry) => sum + entry.investment, 0);
        const weightedAvgCost = totalInvestment / totalQuantity;
        const maxPyramidLevel = Math.max(...entries.map(e => e.pyramidLevel));
        
        const currentPrice = entries[entries.length - 1].currentPrice;
        
        const baseEntry = entries.find(e => e.pyramidLevel === 0) || entries[0];
        const baseQuantity = baseEntry.quantity;
        const baseSize = baseEntry.investment;
        
        const currentValue = currentPrice * totalQuantity;
        const pnl = currentValue - totalInvestment;
        const pnlPercent = (pnl / totalInvestment) * 100;
        
        const position = {
          id: crypto.randomUUID(),
          symbol: symbol,
          entryPrice: weightedAvgCost,
          currentPrice: currentPrice,
          baseQuantity: baseQuantity,
          currentQuantity: totalQuantity,
          baseSize: baseSize,
          currentSize: totalInvestment,
          pyramidCount: maxPyramidLevel,
          maxPyramidCount: settings.maxPyramidsPerStock,
          totalInvested: totalInvestment,
          pnl: pnl,
          pnlPercent: pnlPercent
        };
        
        importedPositions.push(position);
      });
      
      setPositions(importedPositions);
      setShowImport(false);
      setImportData('');
      
      if (importedPositions.length > 0 && showAlert) {
        alert(`Successfully imported ${importedPositions.length} positions!`);
      }
      
    } catch (error) {
      alert('Error importing data. Please check the format.');
      console.error('Import error:', error);
    }
  };

  const handleImportSubmit = () => {
    if (!importData.trim()) {
      alert('Please paste your Excel data first');
      return;
    }
    importFromExcel(importData, true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to database...</p>
        </div>
      </div>
    );
  }

    if (showAnalytics) {
    return (
      <AnalyticsDashboard
        positions={positions}
        closedPositions={closedPositions}
        settings={settings}
        realizedPnL={realizedPnL}
        onBack={() => setShowAnalytics(false)}
      />
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Point & Figure Portfolio Tracker</h1>
              <p className="text-gray-600">Manage your P&F positions with {(settings.maxAllocation * 100)}% max allocation per stock</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAnalytics(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
              >
                <PieChart size={16} />
                Analytics
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
              >
                📊 Import Excel
              </button>
              <button
                onClick={() => setShowClosedPositions(!showClosedPositions)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  showClosedPositions 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                }`}
              >
                📈 {showClosedPositions ? 'Hide' : 'Show'} Closed ({closedPositions.length})
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Settings size={16} />
                Settings
              </button>
              {saveStatus && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  saveStatus.includes('✅') ? 'bg-green-100 text-green-700' :
                  saveStatus.includes('❌') ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  <Database size={14} />
                  {saveStatus}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Import Modal */}
        {showImport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Import Excel Data</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste your Excel data (CSV format):
                  </label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Symbol,Current_Price,Total_Quantity,Avg_Cost,Pyramid_Level
RELIANCE,2650,75,2500,2
HDFC,1580,100,1520,1"
                  />
                </div>
                
                <div className="bg-blue-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Required Format:</h4>
                  <div className="text-xs text-blue-800 font-mono">
                    <div>Symbol,Current_Price,Total_Quantity,Avg_Cost,Pyramid_Level</div>
                    <div>DIXON,17512,4,16729,0</div>
                    <div>SARDA,602,223,560.50,2</div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">How to Export from Excel:</h4>
                  <ol className="text-xs text-gray-600 space-y-1">
                    <li>1. Select your data range (including headers)</li>
                    <li>2. Copy (Ctrl+C)</li>
                    <li>3. Paste here, or Save As CSV and copy from notepad</li>
                  </ol>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleImportSubmit}
                  disabled={!importData.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  📊 Import Data
                </button>
                <button
                  onClick={() => {
                    setShowImport(false);
                    setImportData('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Close Position Modal */}
        {showCloseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Close Position - {closeModal.position?.symbol}</h3>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-md">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Current Position:</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Quantity: {closeModal.position?.currentQuantity}</p>
                    <p>Avg Cost: ₹{closeModal.position ? (closeModal.position.totalInvested / closeModal.position.currentQuantity).toFixed(2) : 0}</p>
                    <p>Current LTP: ₹{closeModal.position?.currentPrice.toFixed(2)}</p>
                    <p>Invested: {formatCurrency(closeModal.position?.totalInvested || 0)}</p>
                    <p>Current P&L: {closeModal.position?.pnl >= 0 ? '+' : '-'}₹{Math.abs(closeModal.position?.pnl || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exit Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={closeModal.exitPrice}
                    onChange={(e) => setCloseModal({...closeModal, exitPrice: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter exit price"
                  />
                  <p className="text-xs text-gray-500 mt-1">Price at which you want to sell</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Close</label>
                  <input
                    type="number"
                    value={closeModal.quantity}
                    onChange={(e) => setCloseModal({...closeModal, quantity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter quantity to close"
                    max={closeModal.position?.currentQuantity}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Max: {closeModal.position?.currentQuantity} shares • 
                    {parseInt(closeModal.quantity || 0) < (closeModal.position?.currentQuantity || 0) ? ' Partial close' : ' Full close'}
                  </p>
                </div>

                {closeModal.exitPrice && closeModal.quantity && (
                  <div className="bg-blue-50 p-3 rounded-md">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Close Summary:</h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>Exit Value: {formatCurrency(parseFloat(closeModal.exitPrice || 0) * parseInt(closeModal.quantity || 0))}</p>
                      <p>Proportional Investment: {formatCurrency((closeModal.position?.totalInvested || 0) * (parseInt(closeModal.quantity || 0) / (closeModal.position?.currentQuantity || 1)))}</p>
                      <p>Realized P&L: {(() => {
                        const exitVal = parseFloat(closeModal.exitPrice || 0) * parseInt(closeModal.quantity || 0);
                        const propInvest = (closeModal.position?.totalInvested || 0) * (parseInt(closeModal.quantity || 0) / (closeModal.position?.currentQuantity || 1));
                        const pnl = exitVal - propInvest;
                        return `${pnl >= 0 ? '+' : ''}${formatCurrency(pnl)} (${((pnl / propInvest) * 100).toFixed(2)}%)`;
                      })()}</p>
                      {parseInt(closeModal.quantity || 0) < (closeModal.position?.currentQuantity || 0) && (
                        <p className="text-blue-700 font-medium">Remaining: {(closeModal.position?.currentQuantity || 0) - parseInt(closeModal.quantity || 0)} shares will stay active</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closePositionWithCustom}
                  disabled={!closeModal.exitPrice || !closeModal.quantity || parseInt(closeModal.quantity) <= 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  🏁 Close Position
                </button>
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pyramid Modal - Always Custom */}
        {showPyramidModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Add Pyramid - {pyramidModal.position?.symbol}</h3>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-md">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Current Position:</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Quantity: {pyramidModal.position?.currentQuantity}</p>
                    <p>Avg Cost: ₹{pyramidModal.position ? (pyramidModal.position.totalInvested / pyramidModal.position.currentQuantity).toFixed(2) : 0}</p>
                    <p>Current LTP: ₹{pyramidModal.position?.currentPrice.toFixed(2)}</p>
                    <p>Invested: {formatCurrency(pyramidModal.position?.totalInvested || 0)}</p>
                    <p>Pyramids: {pyramidModal.position?.pyramidCount}/{pyramidModal.position?.maxPyramidCount}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pyramid Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pyramidModal.price}
                    onChange={(e) => setPyramidModal({...pyramidModal, price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter pyramid price"
                  />
                  <p className="text-xs text-gray-500 mt-1">Price at which you want to add more shares</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Add</label>
                  <input
                    type="number"
                    value={pyramidModal.quantity}
                    onChange={(e) => setPyramidModal({...pyramidModal, quantity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter quantity"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of additional shares to buy</p>
                </div>

                {pyramidModal.price && pyramidModal.quantity && (
                  <div className="bg-blue-50 p-3 rounded-md">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Pyramid Summary:</h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>Investment: {formatCurrency(parseFloat(pyramidModal.price || 0) * parseInt(pyramidModal.quantity || 0))}</p>
                      <p>New Total Qty: {(pyramidModal.position?.currentQuantity || 0) + parseInt(pyramidModal.quantity || 0)}</p>
                      <p>New Total Invested: {formatCurrency((pyramidModal.position?.totalInvested || 0) + (parseFloat(pyramidModal.price || 0) * parseInt(pyramidModal.quantity || 0)))}</p>
                      <p>New Avg Cost: ₹{pyramidModal.position && pyramidModal.price && pyramidModal.quantity ? 
                        (((pyramidModal.position.totalInvested + (parseFloat(pyramidModal.price) * parseInt(pyramidModal.quantity))) / 
                        (pyramidModal.position.currentQuantity + parseInt(pyramidModal.quantity)))).toFixed(2) : 0}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={addCustomPyramid}
                  disabled={!pyramidModal.price || !pyramidModal.quantity || (pyramidModal.position?.pyramidCount >= pyramidModal.position?.maxPyramidCount)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                  Add Pyramid
                </button>
                <button
                  onClick={() => setShowPyramidModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Portfolio Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Capital (₹)</label>
                  <input
                    type="number"
                    value={settings.totalCapital}
                    onChange={(e) => setSettings({...settings, totalCapital: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1200000"
                  />
                  <p className="text-xs text-gray-500 mt-1">e.g., 1200000 for ₹12 lakhs</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buffer Amount (₹)</label>
                  <input
                    type="number"
                    value={settings.buffer}
                    onChange={(e) => setSettings({...settings, buffer: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="200000"
                  />
                  <p className="text-xs text-gray-500 mt-1">e.g., 200000 for ₹2 lakhs buffer</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Allocation per Stock (%)</label>
                  <input
                    type="number"
                    value={settings.maxAllocation * 100}
                    onChange={(e) => setSettings({...settings, maxAllocation: (parseFloat(e.target.value) || 0) / 100})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="20"
                    min="1"
                    max="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum % of trading capital per stock</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Stocks in Portfolio</label>
                  <input
                    type="number"
                    value={settings.maxStocks}
                    onChange={(e) => setSettings({...settings, maxStocks: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="8"
                    min="1"
                    max="20"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum number of different stocks you can hold</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tranche Size (Auto-Calculated)</label>
                  <input
                    type="number"
                    value={settings.trancheSize}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-calculated: Trading Capital ÷ Max Stocks = {formatCurrencyLakhs(settings.trancheSize)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Pyramids per Stock</label>
                  <input
                    type="number"
                    value={settings.maxPyramidsPerStock}
                    onChange={(e) => setSettings({...settings, maxPyramidsPerStock: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="5"
                    min="1"
                    max="10"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum number of pyramids allowed per stock</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => updateSettings(settings)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save size={16} />
                  Save Settings
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Capital</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrencyLakhs(settings.totalCapital)}</p>
                <p className="text-xs text-gray-500">({formatCurrencyLakhs(settings.buffer)} buffer)</p>
              </div>
              <DollarSign className="text-blue-500" size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Invested</p>
                <p className="text-xl font-bold text-green-600">{formatCurrencyLakhs(getTotalInvested())}</p>
                <p className="text-xs text-gray-500">{getPortfolioUtilization().toFixed(1)}% utilized</p>
              </div>
              <TrendingUp className="text-green-500" size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-xl font-bold text-purple-600">{formatCurrencyLakhs(getAvailableCapital())}</p>
                <p className="text-xs text-gray-500">Max {getMaxNewPositions()} more stocks</p>
              </div>
              <Plus className="text-purple-500" size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unrealized P&L</p>
                <p className={`text-xl font-bold ${getUnrealizedPnL() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {getUnrealizedPnL() >= 0 ? '+' : '-'}₹{Math.abs(getUnrealizedPnL()).toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-gray-500">
                  {getTotalInvested() > 0 ? ((getUnrealizedPnL() / getTotalInvested()) * 100).toFixed(2) : 0}%
                </p>
              </div>
              {getUnrealizedPnL() >= 0 ? 
                <TrendingUp className="text-green-500" size={24} /> : 
                <AlertTriangle className="text-red-500" size={24} />
              }
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total ROI</p>
                <p className={`text-xl font-bold ${getTotalROI() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {getTotalROI() >= 0 ? '+' : ''}{getTotalROI().toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500">
                  Realized: ₹{Math.abs(realizedPnL).toLocaleString('en-IN')}
                </p>
              </div>
              {getTotalROI() >= 0 ? 
                <TrendingUp className="text-green-500" size={24} /> : 
                <AlertTriangle className="text-red-500" size={24} />
              }
            </div>
          </div>
        </div>

        {/* Add New Position */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Position</h2>
          
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Symbol</label>
              <input
                type="text"
                value={newStock.symbol}
                onChange={(e) => setNewStock({...newStock, symbol: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., RELIANCE"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Entry Price (₹)</label>
              <input
                type="number"
                value={newStock.price}
                onChange={(e) => setNewStock({...newStock, price: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2500"
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                value={newStock.quantity}
                onChange={(e) => setNewStock({...newStock, quantity: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="40"
                required
              />
            </div>
            
            <div className="flex flex-col">
              <button
                onClick={addNewPosition}
                disabled={!newStock.symbol || !newStock.price || !newStock.quantity}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus size={16} />
                Add Position
              </button>
              {newStock.price && newStock.quantity && (
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Size: {formatCurrency(parseFloat(newStock.price) * parseInt(newStock.quantity || 0))}
                </p>
              )}
            </div>
          </div>
          
          {getMaxNewPositions() === 0 && (
            <p className="text-red-600 text-sm mt-2">Portfolio full - maximum {settings.maxStocks} stocks reached</p>
          )}
        </div>

        {/* Complete Positions Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">
              {showClosedPositions ? `Closed Positions (${closedPositions.length})` : `Active Positions (${positions.length})`}
            </h2>
          </div>
          
          {showClosedPositions ? (
            // Closed Positions Table
            closedPositions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                <p>No closed positions yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exit Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invested</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exit Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Realized P&L</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closed Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {closedPositions.map((position) => (
                      <tr key={position.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{position.symbol}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">₹{position.entryPrice.toFixed(2)}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">₹{position.exitPrice.toFixed(2)}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{position.quantity}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatCurrency(position.totalInvested)}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatCurrency(position.exitValue)}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className={`text-sm ${position.realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            <div className="font-medium">
                              {position.realizedPnL >= 0 ? '+' : '-'}₹{Math.abs(position.realizedPnL).toLocaleString('en-IN')}
                            </div>
                            <div className="text-xs opacity-75">
                              ({position.realizedPnLPercent >= 0 ? '+' : ''}{position.realizedPnLPercent.toFixed(2)}%)
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(position.closedAt).toLocaleDateString('en-IN')}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            // Active Positions Table
            positions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                <p>No positions yet. Add your first P&F position above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LTP</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invested</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P&L</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pyramids</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {positions.map((position) => (
                      <tr key={position.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{position.symbol}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">₹{position.entryPrice.toFixed(2)}</div>
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={position.currentPrice || ''}
                            onChange={(e) => updateLTP(position.id, e.target.value)}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="LTP"
                          />
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap">
                          {editingQuantity.positionId === position.id ? (
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                value={editingQuantity.quantity}
                                onChange={(e) => setEditingQuantity({...editingQuantity, quantity: e.target.value})}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Qty"
                                autoFocus
                              />
                              <button
                                onClick={() => updateQuantity(position.id, editingQuantity.quantity)}
                                className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                                title="Save"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setEditingQuantity({ positionId: null, quantity: '' })}
                                className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{position.currentQuantity}</div>
                                {position.pyramidCount > 0 && (
                                  <div className="text-xs text-blue-600">Base: {position.baseQuantity}</div>
                                )}
                              </div>
                              <button
                                onClick={() => setEditingQuantity({ positionId: position.id, quantity: position.currentQuantity.toString() })}
                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit quantity"
                              >
                                <Edit3 size={12} />
                              </button>
                            </div>
                          )}
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatCurrency(position.totalInvested)}</div>
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatCurrency(position.currentPrice * position.currentQuantity)}</div>
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className={`text-sm ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            <div className="font-medium">
                              {position.pnl >= 0 ? '+' : '-'}₹{Math.abs(position.pnl).toLocaleString('en-IN')}
                            </div>
                            <div className="text-xs opacity-75">
                              ({position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%)
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1">
                              {[...Array(position.maxPyramidCount)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full ${
                                    i < position.pyramidCount ? 'bg-green-500' : 'bg-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                value={position.pyramidCount}
                                onChange={(e) => adjustPyramidCount(position.id, e.target.value)}
                                className="w-8 px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                min="0"
                                max={position.maxPyramidCount}
                                title="Adjust pyramid count"
                              />
                              <span className="text-xs text-gray-500">/{position.maxPyramidCount}</span>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openPyramidModal(position)}
                              disabled={position.pyramidCount >= position.maxPyramidCount}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors"
                            >
                              <Plus size={12} />
                              <span>Pyramid</span>
                            </button>
                            <button
                              onClick={() => removePosition(position.id, 'close')}
                              className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center space-x-1 transition-colors"
                              title="Close position and record P&L"
                            >
                              🏁 Close
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to permanently delete ${position.symbol}? This cannot be undone.`)) {
                                  removePosition(position.id, 'delete');
                                }
                              }}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center space-x-1 transition-colors"
                              title="Delete position permanently"
                            >
                              <Minus size={12} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioTracker;