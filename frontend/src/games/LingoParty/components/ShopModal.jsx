import React from 'react';
import styles from './ShopModal.module.css';

const SHOP_ITEMS = [
  { id: 'trophy', name: 'Star Trophy', cost: 35, icon: '🏆', effect: '+1 Victory Trophy toward winning the game!' },
  { id: 'ufo_attack', name: 'UFO Zap Ray', cost: 20, icon: '🛸', effect: 'ATTACK: Zap the leading crew back -3 Planets!' },
  { id: 'meteor_strike', name: 'Meteor Robbery', cost: 18, icon: '☄️', effect: 'ATTACK: Steal 15 Coins directly from the leader crew!' },
  { id: 'clue_key', name: 'Clue Decoder', cost: 8, icon: '💡', effect: 'REVEAL HINT: Unlock secret hint clues during challenge cards!' },
  { id: 'double_dice', name: 'Warp Boost', cost: 12, icon: '🚀', effect: 'Advance +3 extra planets immediately!' },
  { id: 'shield', name: 'Grammar Shield', cost: 15, icon: '🛡️', effect: 'Protect your team against attacks & penalty hazards!' }
];

export default function ShopModal({ isOpen, activeTeam, onBuyItem, onClose, playSound }) {
  if (!isOpen || !activeTeam) return null;

  const handlePurchase = (item) => {
    if (activeTeam.coins < item.cost) return;
    if (playSound) playSound('trophy');
    onBuyItem && onBuyItem(item);
    onClose && onClose(); // Enforce ONLY ONE purchase per shop visit!
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`glass-card ${styles.shopCard}`}>
        <div className={styles.shopHeader}>
          <h2>🛸 Space Station Armory (1 Purchase Per Visit)</h2>
          <div className={styles.teamWallet}>
            🪙 {activeTeam.name}'s Wallet: {activeTeam.coins} Coins
          </div>
        </div>

        <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginTop: '-0.4rem' }}>
          Select 1 power-up or attack item for your crew. The station auto-docks after purchase!
        </p>

        <div className={styles.itemsGrid}>
          {SHOP_ITEMS.map((item) => {
            const canAfford = activeTeam.coins >= item.cost;
            const isAttack = item.id.includes('attack') || item.id.includes('strike');
            return (
              <div key={item.id} className={`${styles.itemCard} ${isAttack ? styles.attackItemCard : ''}`}>
                <div className={styles.itemIcon}>{item.icon}</div>
                <div className={styles.itemName}>{item.name}</div>
                <div className={styles.itemDesc}>{item.effect}</div>
                <button
                  className={isAttack ? styles.attackBuyBtn : `btn-primary ${styles.buyBtn}`}
                  disabled={!canAfford}
                  onClick={() => handlePurchase(item)}
                >
                  {isAttack ? '⚡ Launch Attack' : 'Buy'} ({item.cost} 🪙)
                </button>
              </div>
            );
          })}
        </div>

        <button
          className="btn-secondary"
          style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem', fontWeight: 800, marginTop: '0.6rem' }}
          onClick={onClose}
        >
          ❌ Exit Station Without Buying
        </button>
      </div>
    </div>
  );
}
