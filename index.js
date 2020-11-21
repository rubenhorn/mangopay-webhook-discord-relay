const fs = require('fs');
const ini = require('ini');

const config = ini.parse(fs.readFileSync('config.ini', 'utf-8'));

// Environment variable overrides port from config (necessary for hosting on Heroku)
const PORT = process.env.PORT || config.port;

const express = require('express');
const app = express();
const discordWebhook = new (require('discord-webhook-node').Webhook)(config.discord.webhookUrl);

discordWebhook.setUsername(config.discord.username);
discordWebhook.setAvatar(config.discord.avatarUrl);

const getMangopayDashboardLink = (ressourceType, ressourceId) =>
  `https://dashboard.${ config.mangopay.baseUrl.split('api.')[1] }/${ ressourceType }/${ ressourceId }`;

// TODO add support for more event types
// TODO fetch more info from MANGOPAY using the ressourceId based on the eventType
function getMessage(ressourceId, eventType) {
  if(eventType.toLowerCase().includes('payin')) {
    return { message: 'Pay-In 💸⬆', link: `${ getMangopayDashboardLink('PayIn', ressourceId) }` };
  }
  else if(eventType.toLowerCase().includes('payout')) {
    return { message: 'Pay-Out 💸⬇', link: `${ getMangopayDashboardLink('PayOut', ressourceId) }` };
  }
  else {
    return { message: `Unknown event 🤔❓`, link: `RessourceId: ${ ressourceId }` };
  }
}

const handler = function(ressourceId, eventType) {
  const { message, link } = getMessage(ressourceId, eventType);
  if(eventType.toLowerCase().includes('succeeded')) {
    discordWebhook.success(`👍 ${ message }`, eventType, link);
  }
  else if(eventType.toLowerCase().includes('failed')) {
    discordWebhook.error(`☠ ${ message }`, eventType, link);
  }
  else {
    discordWebhook.info(`ℹ ${ message }`, eventType, link);
  }
}

app.get(config.route, (request, response) => {
  if('RessourceId' in request.query && 'EventType' in request.query && 'Date' in request.query) {
    console.log(`${ request.method } ${ request.originalUrl }`);
    response.status(200).end();   
    const eventType = request.query.EventType;
    handler(request.query.RessourceId, eventType);
  }
  else {
    response.status(400).end();
  }
});

const listener = app.listen(PORT, () => {
  console.log(`listening on port ${ listener.address().port }`);
});
