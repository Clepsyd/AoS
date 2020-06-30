const COMMAND_CHECK = "!AoSCheck";
const COMMAND_REROLL = "!AoSReroll";
const DICE_VALUE = 6


on("chat:message", function(msg) {
  if(msg.type == "api" && msg.content.indexOf(COMMAND_CHECK) !== -1) {
    AoS.check(msg)
  }
  
  if(msg.type == "api" && msg.content.indexOf(COMMAND_REROLL) !== -1) {
    AoS.reroll(msg);
  }
});

const AoS = {
    'check': (msg) => {
        let input = msg.content.replace(COMMAND_CHECK, "").trim();
        try {
            let [num_dice, al, rank] = AoS.parseInput('check', input);
            rolls = AoS.getDiceRolls(num_dice);
            successes = AoS.getSuccesses([...rolls], al, rank);
            AoS.sendCheckOutput(msg.who, rolls.join(" + "), successes);
        }
        catch (error) {
            log(error);
            AoS.errorMessage(input);
        }
    },
    
    'reroll': (msg) => {
        let input = msg.content.replace(COMMAND_REROLL, "").trim();
        try {
            let [rollsInput, al, rank] = AoS.parseInput('reroll', input);
            let keptRolls = rollsInput.filter(roll => roll != "?");
            let n_rerolls = rollsInput.length - keptRolls.length;
            let rerolls = AoS.getDiceRolls(n_rerolls);
            let newRolls = [...keptRolls];
            rerolls.forEach(newRoll => newRolls.push(newRoll));
            let successes = AoS.getSuccesses([...newRolls], al, rank);
            AoS.sendRerollOutput(msg.who, keptRolls.join(" + "), rerolls.join(" + "), successes);
        } catch (error) {
            log(error);
            AoS.errorMessage(input);
        }
    },

    'parseInput': (type, msg) => {
        const inputType = {
            'check': AoS._parseCheck,
            'reroll': AoS._parseReroll,
        }

        return inputType[type](msg);
    },

    '_parseCheck': (msg) => {
        return msg.split('-').map(input => parseInt(input.trim(), 10));
    },

    '_parseReroll': (msg) => {
        let rollsInput, al, rank;
        [rollsInput, al, rank] = msg.split('-');
        rollsInput = rollsInput.split(',');
        return [
            rollsInput.map((roll) => {
                r = roll.trim();
                return r == "?" ? r : parseInt(r, 10);
            }),
            parseInt(al.trim(), 10),
            parseInt(rank.trim(), 10)
        ]
    },
    
    'sendRerollOutput': (character, rolls, rerolls, successes) => {
        let baseMsg = ` re-rolls ${rerolls} with their previous ${rolls} `;
        let resultMsg = successes ? 
            AoS.getSuccessMessage(successes) : 
            AoS.getFailMessage();
        let final = baseMsg + resultMsg;
        sendChat(character, final);
    },
    
    'sendCheckOutput': (character, rolls, successes) => {
        let baseMsg = ` rolls ${rolls} `;
        let resultMsg = successes ? 
            AoS.getSuccessMessage(successes) : 
            AoS.getFailMessage();
        let final = baseMsg + resultMsg;
        sendChat(character, final);
    },

    'errorMessage': (input) => {
        let message = `Something went wrong with the input: "${input}"`;
        sendChat("GM", `<span style="color: red"> ${message} </span> `);
    },
    
    'getSuccessMessage': (successes) => {
        let successColor = "green"
        let incredible = ""
        
        if (successes >= 4) {
            successColor = "blue";
            incredible = "incredible! "
        }
        
        let message = `and ${incredible}gets <strong>${successes}</strong> Success`
        message += (successes > 1 ? "es" : "");
        return `<span style="color: ${successColor}">${message}!</span>`;
    },
    
    'getFailMessage': () => {
        let choices = [
            "but fails miserably!",
            "yet does not quite get it right.",
            "and regrets it immediately...",
            "... hahaha, no, seriously... no.",
            "but shouldn't have done that.",
            "this is just not good enough.",
            "and woops! Not good..."
        ]
        let message = choices[Math.floor(Math.random() * choices.length)];
        return `<span style="color: red">${message}</span>`;
    },

    'getSuccesses': (diceRolls, al, rank) => {
        let bonusForRoll1 = 0;
        
        diceRolls.forEach((roll, i) => {
            [roll, rank] = AoS.weighRank(roll, rank);
            bonusForRoll1 += (roll === 1) ? 1 : 0;
            diceRolls[i] = roll;
        });
    
        const total = diceRolls.reduce((acc, value) => acc + value, 0);
    
        return (total > al) ? 0 : (1 + bonusForRoll1);
        
    },

    'getDiceRolls': (num_dice) => {
        let rolls = []
        for (let i = 0; i < num_dice; i++) {
            roll = randomInteger(DICE_VALUE);
            rolls.push(roll);
        }
        rolls.sort((a, b) => a - b);
        return rolls;
    },

    'weighRank': (roll, rank) => {
        let newValue = rank <= 0 ? roll : Math.max(1, roll - rank);
        let newRank = rank - (roll - newValue);
        return [newValue, newRank];
    },
}