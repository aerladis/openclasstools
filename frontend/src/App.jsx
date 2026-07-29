import React from 'react';
import { Routes, Route } from 'react-router-dom';
import GameHub from './components/Hub/GameHub';
import LingoPartyGame from './games/LingoParty/LingoPartyGame';

export default function App() {
  return (
    <div className="app-wrapper">
      <Routes>
        <Route path="/" element={<GameHub />} />
        <Route path="/lingoparty" element={<LingoPartyGame />} />
        <Route path="*" element={<GameHub />} />
      </Routes>
    </div>
  );
}
