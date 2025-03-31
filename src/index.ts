import { APIEmbedField, Channel, Client, EmbedBuilder, GatewayIntentBits, Message, RestOrArray, TextChannel } from "discord.js";
import weekOfYear from 'dayjs/plugin/weekOfYear' 
import dayjs from "dayjs";
import cron from "node-cron";
import { config } from "./config";
import { Survey } from "./survey";

dayjs.extend(weekOfYear);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessages
  ],
});

// Channel ID where you want to post the survey
const channelId = "1308827165101522975";
const survey = new Survey();

// Days of the week for the survey
const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Emoji reactions for voting
const reactions = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣"];

client.once("ready", () => {
  console.log("Bot is online!");
  client.channels.cache.get(channelId).send('Hello here!');
});

async function postAvailabilitySurvey() {
  const channel: TextChannel | undefined = client.channels.cache.get(channelId);
  
  if (channel) {
    const date = dayjs('2025-03-31');
    const weekNumber = date.week() + 1;
    const firstDateOfWeek = date.week(weekNumber).startOf('week');
    const lastDateOfWeek = date.week(weekNumber).endOf('week');
  
    // Create survey embed
    const surveyEmbed = new EmbedBuilder()
      .setTitle(`KW ${weekNumber}`)
      .setDescription(
        `
          Please react to indicate which days you are available next week 
          ${firstDateOfWeek.format('DD.MM.YYYY')} - ${lastDateOfWeek.format('DD.MM.YYYY')}:
        `
      )
      .setColor("#0099ff");
  
  
    const fields: RestOrArray<APIEmbedField> = weekdays.map((day, idx) => {
      return {
        name: `${reactions[idx]} ${day}`,
        value: "React to this message if you are available",
        inline: true
      }
    })
    surveyEmbed.addFields(...fields);
  
    if (survey.isAvailable()) {
      const resultMessage = await checkSurveyResults(survey.getId());
      const messages: Map<String, Message> = await channel.messages.fetch({limit: 100});

      for (let [key, value] of messages) {
        if (!value.embeds.some(embed => embed.data.title?.includes("Ergebnis"))) {
          await value.delete();
        }
      }
      
      await channel!.send({embeds: [resultMessage]});
    }
  
    // Send the survey and add reaction options
    const surveyMessage = await channel!.send({embeds: [surveyEmbed]});
  
    survey.saveSurvey(surveyMessage.id, weekNumber);
  
    // Add reaction options for each day
    for (let i = 0; i < weekdays.length; i++) {
      await surveyMessage.react(reactions[i]);
    }
  }
}


client.login(config.DISCORD_TOKEN);



// Schedule the survey to run every Sunday at 12 AM
cron.schedule('0 0 * * 0', () => {
// cron.schedule('*/10 * * * * *', () => {
  postAvailabilitySurvey();
  console.log(`Ran CRON-Job ${dayjs(new Date()).format('DD.MM.YYYY - HH:mm:ss')}`);
});

// Add this function to check results after a certain period (e.g., 24 hours)
const checkSurveyResults = async (id: number) => {
  const channel = client.channels.cache.get(channelId);
  if (channel) {
    const message = await channel.messages.fetch(
      id
    );
  
    const results = [];
    for (let i = 0; i < weekdays.length; i++) {
      const reaction = message.reactions.cache.get(reactions[i]);
      const count = reaction ? reaction.count - 1 : 0;
      results.push({ day: weekdays[i], count: count, dayIndex: i });
    }
    results.sort((a, b) => b.count - a.count);

    const maxCount = results[0].count;

    const potentialDays = results.filter(res => res.count === maxCount);

    const resultEmbed = new EmbedBuilder()
    .setTitle(`Ergebnis: KW ${survey.getKW()}`)
    .setDescription(
      `
        Mögliche Termine:
      `
    )
    .setColor("#0099ff");

    const days = getDaysOfWeek(survey.getKW());

    const fields: RestOrArray<APIEmbedField> = potentialDays.map((day) => {
      return {
        name: `${day.day}`,
        value: `${days[day.dayIndex].date}`
      }
    })
    resultEmbed.addFields(...fields);

    return resultEmbed;
  }
}


const getDaysOfWeek = (weekNumber: number) => {
  const date = dayjs(new Date()).add(1, "D");
  const targetDate = date.week(weekNumber);
  const firstDayOfWeek = targetDate.startOf('week');

  const daysOfWeek = [];
  
  for (let i = 0; i < 7; i++) {
    const currentDay = firstDayOfWeek.add(i, 'day');
    daysOfWeek.push({
      weekday: currentDay.format('dddd'),
      date: currentDay.format('DD.MM.YYYY')
    });
  }
  
  return daysOfWeek;
}