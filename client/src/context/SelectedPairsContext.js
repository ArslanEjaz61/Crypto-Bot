import React, { createContext, useContext, useState, useCallback } from "react";
import { useCrypto } from "./CryptoContext";

const SelectedPairsContext = createContext();

export const useSelectedPairs = () => {
  const context = useContext(SelectedPairsContext);
  if (!context) {
    throw new Error(
      "useSelectedPairs must be used within a SelectedPairsProvider"
    );
  }
  return context;
};

export const SelectedPairsProvider = ({ children }) => {
  const [selectedPairs, setSelectedPairs] = useState(new Set());
  const { getFavoriteSymbols } = useCrypto();

  // Toggle selection of a single pair
  const togglePairSelection = useCallback((symbol) => {
    setSelectedPairs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(symbol)) {
        newSet.delete(symbol);
      } else {
        newSet.add(symbol);
      }
      console.log(`Toggled ${symbol}, selected pairs:`, Array.from(newSet));
      return newSet;
    });
  }, []);

  // Select all pairs from a given list
  const selectAllPairs = useCallback((pairs) => {
    const symbols = pairs.map((pair) => pair.symbol);
    setSelectedPairs(new Set(symbols));
    console.log("Selected all pairs:", symbols);
  }, []);

  // Clear all selections
  const clearAllSelections = useCallback(() => {
    setSelectedPairs(new Set());
    console.log("Cleared all selections");
  }, []);

  // Check if a pair is selected
  const isPairSelected = useCallback(
    (symbol) => {
      return selectedPairs.has(symbol);
    },
    [selectedPairs]
  );

  // Get all selected pairs as array
  const getSelectedPairsArray = useCallback(() => {
    return Array.from(selectedPairs);
  }, [selectedPairs]);

  // Get count of selected pairs
  const getSelectedCount = useCallback(() => {
    return selectedPairs.size;
  }, [selectedPairs]);

  // Select/deselect pairs based on array
  const setSelectedPairsFromArray = useCallback((symbolsArray) => {
    setSelectedPairs(new Set(symbolsArray));
    console.log("Set selected pairs from array:", symbolsArray);
  }, []);

  // Get favorite pairs for alert creation
  const getFavoritePairsForAlerts = useCallback(
    (cryptos) => {
      // Use the new favorites system instead of crypto.isFavorite
      const favoriteSymbols = getFavoriteSymbols();
      console.log(
        "getFavoritePairsForAlerts - favorite symbols:",
        favoriteSymbols
      );
      return favoriteSymbols;
    },
    [getFavoriteSymbols]
  );

  const value = {
    selectedPairs,
    togglePairSelection,
    selectAllPairs,
    clearAllSelections,
    isPairSelected,
    getSelectedPairsArray,
    getSelectedCount,
    setSelectedPairsFromArray,
    getFavoritePairsForAlerts,
  };

  return (
    <SelectedPairsContext.Provider value={value}>
      {children}
    </SelectedPairsContext.Provider>
  );
};
