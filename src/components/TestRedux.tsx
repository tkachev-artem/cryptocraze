import React from 'react';
import { useUser } from '../hooks/useUser';

export const TestRedux: React.FC = () => {
  const { 
    user, 
    isLoading, 
    isAuthenticated, 
    coins, 
    level, 
    balance,
    loadUser,
    updateUserGameData 
  } = useUser();

  const handleTestUpdate = () => {
    updateUserGameData({
      coins: coins + 10,
      level: level + 1,
    });
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-bold mb-4">Redux Test</h2>
      
      <div className="space-y-2">
        <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
        <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
        <p><strong>User:</strong> {user ? `${user.firstName} ${user.lastName}` : 'None'}</p>
        <p><strong>Coins:</strong> {coins}</p>
        <p><strong>Level:</strong> {level}</p>
        <p><strong>Balance:</strong> ${balance}</p>
      </div>

      <div className="mt-4 space-x-2">
        <button 
          onClick={loadUser}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Load User
        </button>
        
        <button 
          onClick={handleTestUpdate}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Add 10 Coins & +1 Level
        </button>
      </div>
    </div>
  );
}; 