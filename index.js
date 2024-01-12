import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import schedule from 'node-schedule';
import { TOKEN, USERNAME } from './credentials.js';

// Replace 'YOUR_BOT_TOKEN' with your actual bot token
const bot = new TelegramBot(TOKEN, {polling: true});

const dailyLCQuery = `
  query questionOfToday {
    activeDailyCodingChallengeQuestion {
      date
      userStatus
      link
      question {
        acRate
        difficulty
        freqBar
        frontendQuestionId: questionFrontendId
        isFavor
        paidOnly: isPaidOnly
        status
        title
      }
    }
  }
`;

function getDate(date){
    return date.substr(8,9);
}

function getMonth(date){
    const month = (date[5]-'0')*10+((date[6]-'0'));
    if (month == 1) return "January";
    else if (month == 2) return "February";
    else if (month == 3) return "March";
    else if (month == 4) return "April";
    else if (month == 5) return "May";
    else if (month == 6) return "June";
    else if (month == 7) return "July";
    else if (month == 8) return "August";
    else if (month == 9) return "September";
    else if (month == 10) return "October";
    else if (month == 11) return "November";
    else return "December";
}

function getYear(date){
    return date.substr(0,4);
}



function getLCQuestion(message) {
  console.log("Fetching...");
  axios.post('https://leetcode.com/graphql', {
    query: dailyLCQuery,
  }, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
  .then(response => {
    const data = response.data['data']['activeDailyCodingChallengeQuestion'];
    console.log(data);
    const date = data.date;
    const question = data.question;
    const title = question.title;
    const link = 'https://leetcode.com' + data.link;
    const difficulty = question.difficulty;
    let diffIndicator = '';
    if (difficulty === 'Easy') {
      diffIndicator = '👶';
    } else if (difficulty === 'Medium') {
      diffIndicator = '👨‍🎓';
    } else if (difficulty === 'Hard') {
      diffIndicator = '👨‍💻';
    }
    const msg = `*🔥Leetcode Daily🔥*\r\n*Date:* ${getDate(date)} ${getMonth(date)} ${getYear(date)}\r\n*Title: *${title}\r\n*Difficulty:* ${difficulty} ${diffIndicator}\r\n${link}`;
    bot.sendMessage(message.chat.id, msg, {parse_mode: 'Markdown'});
  })
  .catch(error => {
    console.error("Error processing response:", error);
    bot.sendMessage(message.chat.id, "Error fetching LC question. Please try again later.");
  });
}

const chatIdCronStatusMap = {};

function startLCSchedule(msg) {
  if (!checkAdmin(msg)) {
    return;
  }
  console.log("MASUK");
  const chatId = msg.chat.id;
  const msgThreadId = msg.message_thread_id;
  if (chatIdCronStatusMap[chatId]) {
    bot.sendMessage(chatId, 'Daily LC schedule already started.', {message_thread_id: msgThreadId});
    return;
  }
  const reply = 'Starting daily LC schedule.';
  bot.sendMessage(chatId, reply, {message_thread_id: msgThreadId});
  chatIdCronStatusMap[chatId] = true;
  console.log('Cron job has started');
  schedule.scheduleJob('*/1 * * * *', () => {
    getLCQuestion(msg);
  });
}

const admins = [
    'bryan_noel',
    'BebekJK'
];

function checkAdmin(msg) {
    return true;
  //return admins.includes(msg.from.id);
}

async function hasUserSolvedDailyQuestion(username) {
    // LeetCode GraphQL endpoint
    console.log(username)
    const graphqlEndpoint = 'https://leetcode.com/graphql';
  
    // GraphQL query to get user's submissions for the active daily coding challenge question
    const graphqlQuery = `
      query UserDailySubmission($username: String!) {
        user(username: $username) {
          activeDailyCodingChallengeSubmission {
            statusDisplay
          }
        }
      }
    `;
  
    try {
      // Make a GraphQL request to LeetCode API
      const response = await axios.post(
        graphqlEndpoint,
        {
          query: graphqlQuery,
          variables: {
            username,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
        console.log(response)
      // Extract the submission status from the response
      const statusDisplay =
        response.data.data.user.activeDailyCodingChallengeSubmission.statusDisplay;
  
      // Check if the status indicates a successful submission
      return statusDisplay === 'Accepted';
    } catch (error) {
      console.error('Error fetching user submissions:', error.message);
      return false;
    }
  }

bot.onText(/\/code/, (msg) => {
  startLCSchedule(msg);
});

bot.onText(/\/start|\/hello/, (msg) => {
  bot.sendMessage(msg.chat.id, "Howdy, how are you doing?");
});

// bot.onText(/^@/, (msg) => {
//     const username = msg.text.substr(1);
//     bot.sendMessage(msg.chat.id, hasUserSolvedDailyQuestion(username));
//   });

bot.onText(/.*/, (msg) => {
  bot.sendMessage(msg.chat.id, msg.text);
});
