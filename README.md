# GuildKeeper

**Discord** bot to help you manage your next ttrpg sessions
## Features
- **Forum quest board:** GM can publish quests in structured Discord forum post.
- **Scheduling:** GM can set their available time slots.
- **Book a session:** Players can react on quest and book a session for a specific quest and a specific time slot.
- **Session reminders:** Automated notifications keep GM and player updated.

### Prerequisites
* [Node.js](https://nodejs.org) (v18 or higher recommended)
* A Discord account 

### Setup guide

1. **Create the discord server:** Here is the [standard template of Discord server](https://discord.new/DSesAScgVGJy) which allows this bot to fully work, use the link to create a fully operational discord server.

2. **Clone:** Retrieve the project and create a *.env* file at the root of the project
   ```
   git clone https://github.com/RoiTatouille/GuildKeeper.git
   cd GuildKeeper
   npm install
   ```

4. **Create your Discord app:** Go to the Discord developer portal and create a new app. Follow the instructions... When your app is created you should be able to retrieve 2 things:
- Discord token
- Discord client id

4. **Get your server ID:** You should also retrieve your discord server id in your server parameters (You must enable developer mode to retrieve it).

5. **Configure environment variables:** You can add those on the corresponding line in the created .env file like (look at .env.example):
```
DISCORD_TOKEN=<yourDiscordToken>
DISCORD_CLIENT_ID=<yourDiscordClientId>
DISCORD_GUILD_ID=<yourDiscordServerId>
```

6. **Invite your bot:** Add your app to your Discord server.

7. **Launch GuildKeeper:** Launch GuildKeeper on the computer hosting it with:
```
npm run deploy
npm run dev
```

### Initial configuration

 You can on your Discord server use: ```/config quest_channel <nameOfYourActiveChannel>``` (by default this quest channel is named "quêtes-actives", rename it however you want).

 For the other commands please refer to the commands sections in our wiki
