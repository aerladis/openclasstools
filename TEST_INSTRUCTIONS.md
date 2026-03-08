# Test Instructions for Millionaire Game

Use this guide to test the "Who Wants to Be a Millionaire" game using Antigravity's Gemini integration.

## Quick Test Checklist

- [ ] Game appears in hub
- [ ] Start screen loads correctly
- [ ] Default questions work
- [ ] AI question generation works
- [ ] Timer counts down correctly
- [ ] Answer selection works
- [ ] Correct/wrong answer feedback works
- [ ] Prize ladder updates correctly
- [ ] 50:50 lifeline works
- [ ] Phone a Friend lifeline works
- [ ] Ask the Audience lifeline works
- [ ] Walk away works
- [ ] Safe haven calculation works
- [ ] Game over screen works
- [ ] Win condition works (all 15 questions)
- [ ] Admin panel sync works
- [ ] Game ID badge visible

---

## Test Cases

### Test 1: Basic Game Launch

**Steps:**
1. Open `http://localhost:8090` (or your deployed URL)
2. Look for the Millionaire game card

**Expected:** 
- Card shows with 💰 icon
- Title: "Millionaire"
- Description mentions "15 questions" and "$1,000,000"

---

### Test 2: Start Screen

**Steps:**
1. Click on Millionaire card
2. Observe the start screen

**Expected:**
- "Who Wants to Be a Millionaire?" title displayed
- Theme input field visible
- Two buttons: "Generate with AI" and "Default Questions"
- "How to Play?" button
- "Back to Hub" link
- Game ID badge visible in top-right corner

---

### Test 3: How to Play

**Steps:**
1. Click "How to Play?"
2. Read the instructions
3. Click "Got it!"

**Expected:**
- Modal shows game rules
- All 3 lifelines explained
- Safe havens mentioned
- Returns to start screen after clicking

---

### Test 4: Default Questions

**Steps:**
1. Click "Default Questions"
2. Play through 2-3 questions

**Expected:**
- Game screen loads immediately
- Question 1 displays with 4 options
- Timer starts at 30 seconds
- Prize ladder visible on right
- Can select answers

---

### Test 5: AI Question Generation

**Steps:**
1. Enter theme: "Science"
2. Click "Generate with AI"
3. Wait for generation
4. Play first question

**Expected:**
- Loading screen shows "Generating questions..."
- After ~5-10 seconds, game starts
- Questions are science-related
- Questions have progressive difficulty

**Alternative Themes to Test:**
- "Harry Potter"
- "World Geography"
- "Famous Scientists"
- "Sports"
- (Empty) - should use general knowledge

---

### Test 6: Answer Selection

**Steps:**
1. Start a game
2. Click on any answer

**Expected:**
- Selected answer highlighted in orange
- 2-second suspense delay
- Then shows correct (green) or wrong (red)
- If correct, loads next question
- If wrong, shows game over screen

---

### Test 7: Timer

**Steps:**
1. Start a game
2. Wait for timer to count down
3. Let it reach 0 without answering

**Expected:**
- Timer counts down from 30
- Circle progress bar updates
- At 20s: turns yellow
- At 10s: turns red
- At 0: game over with "Time's up!" message

---

### Test 8: Prize Ladder

**Steps:**
1. Play through multiple questions
2. Observe the prize ladder

**Expected:**
- Current question highlighted in gold
- Completed questions marked green
- Safe havens ($1,000 and $32,000) have gold border
- Ladder updates after each correct answer

---

### Test 9: 50:50 Lifeline

**Steps:**
1. Start a game
2. Click "50:50" button
3. Observe the answers

**Expected:**
- 2 wrong answers disappear (hidden)
- 50:50 button becomes disabled/grayed
- Correct answer + 1 wrong answer remain

---

### Test 10: Phone a Friend Lifeline

**Steps:**
1. Start a game
2. Click "📞" button
3. Wait for animation

**Expected:**
- Modal opens with "Phone a Friend"
- Shows "Calling..." for 2 seconds
- Then shows a hint message
- Hint may be correct (70% chance), wrong (30% chance), or uncertain

---

### Test 11: Ask the Audience Lifeline

**Steps:**
1. Start a game
2. Click "👥" button

**Expected:**
- Modal opens with bar chart
- 4 bars (A, B, C, D) with percentages
- Correct answer usually has highest percentage (40-75%)
- Bars animate up from 0

---

### Test 12: Walk Away

**Steps:**
1. Answer 3-4 questions correctly
2. Click "Walk Away" button
3. Click "Confirm"

**Expected:**
- Confirmation modal shows current winnings
- After confirm, shows result screen
- Displays walked away amount
- "Smart move!" message shown

---

### Test 13: Safe Haven

**Steps:**
1. Reach question 6+ (past $1,000 safe haven)
2. Answer incorrectly

**Expected:**
- Game over screen shows
- Message says "But you kept $1,000 from your safe haven!"
- Amount displayed is $1,000 (not $0)

**Steps 2:**
1. Reach question 11+ (past $32,000 safe haven)
2. Answer incorrectly

**Expected:**
- Keeps $32,000 instead of falling to $1,000

---

### Test 14: Wrong Answer (No Safe Haven)

**Steps:**
1. Start new game
2. Answer first question incorrectly

**Expected:**
- Selected answer turns red
- Correct answer turns green
- Game over screen shows
- Amount: $0
- Message: "Better luck next time!"

---

### Test 15: Winning the Game

**Steps:**
1. Play through and answer all 15 questions correctly

**Expected:**
- After question 15 correct, shows win screen
- Title: "Congratulations!"
- Amount: $1,000,000
- Message: "You are a Millionaire!"

---

### Test 16: Admin Panel Integration

**Steps:**
1. Open Millionaire game (note the Game ID)
2. Open `admin.html` in another tab
3. Enter the Game ID
4. Connect

**Expected:**
- Admin panel shows "Millionaire" as game type
- Shows current question and options
- Shows correct answer indicator
- Shows remaining time
- Can trigger lifelines remotely

---

### Test 17: Multiple Games (Security Test)

**Steps:**
1. Open Millionaire in Tab 1
2. Open Millionaire in Tab 2 (different browser/incognito)
3. Try to use same Game ID in Tab 2

**Expected:**
- Tab 1 works normally
- Tab 2 should fail to join (Game ID in use)
- Error message shown in console

---

### Test 18: Rate Limiting

**Steps:**
1. Generate AI questions 11 times quickly

**Expected:**
- First 10 requests succeed
- 11th request returns "API rate limit exceeded" error
- Falls back to default questions

---

## Gemini Testing Tips

### Using Antigravity's Gemini Integration:

1. **Check API Key**: Ensure `GEMINI_API_KEY` is set in `.env`

2. **Monitor Server Logs**: Watch for generation errors
   ```bash
   node server.js
   ```

3. **Test Different Themes**: Try various themes to test AI robustness
   - Single word: "Space"
   - Phrases: "Ancient Civilizations"
   - Specific: "Marvel Cinematic Universe"
   - Broad: "General Knowledge"

4. **Check Response Format**: Verify AI returns valid JSON:
   ```json
   [
     {
       "question": "...",
       "options": ["A", "B", "C", "D"],
       "correct": 0
     }
   ]
   ```

5. **Fallback Testing**: If AI fails, verify default questions load automatically

---

## Common Issues & Fixes

| Issue | Possible Cause | Fix |
|-------|---------------|-----|
| Game ID not visible | CSS not loaded | Hard refresh (Ctrl+F5) |
| AI generation fails | API key invalid | Check `.env` file |
| Questions not loading | Server not running | Start server with `node server.js` |
| Timer not animating | Browser issue | Try different browser |
| Admin panel not connecting | Wrong Game ID | Check uppercase 4-char code |
| Lifelines not working | JavaScript error | Check browser console |

---

## Automated Test Script (Optional)

Create `test-millionaire.js` for basic automated tests:

```javascript
// Simple test runner
const tests = {
    'Prize Ladder Length': () => PRIZE_LADDER.length === 15,
    'Safe Havens': () => SAFE_HAVEN_INDICES.length === 3,
    'Game ID Format': () => /^[A-Z0-9]{4}$/.test(gameId),
    'Timer Default': () => QUESTION_TIME === 30
};

// Run tests
Object.entries(tests).forEach(([name, test]) => {
    const result = test() ? '✅' : '❌';
    console.log(`${result} ${name}`);
});
```

---

## Sign-off Criteria

The Millionaire game is ready for production when:

- [ ] All 18 test cases pass
- [ ] AI generation works reliably (8/10 times)
- [ ] No JavaScript console errors
- [ ] Responsive design works on mobile
- [ ] Admin panel integration functional
- [ ] Rate limiting prevents abuse

---

## Deployment Checklist

Before deploying to `play.berkaybilge.space`:

- [ ] `npm install` executed
- [ ] `.env` file has valid `GEMINI_API_KEY`
- [ ] All files committed to git
- [ ] Server restarted after changes
- [ ] Tested on production URL
- [ ] Admin panel tested remotely
