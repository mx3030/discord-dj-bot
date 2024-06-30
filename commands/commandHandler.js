import { CommandProcessor } from './commandProcessor.js';
import { Player } from '../player/player.js';

export class CommandHandler {
    constructor(player) {
        this.player = player;
        this.commandsMap = {
            'play':     (c) => this.handlePlay(c),
            'system':   (c) => this.handleSystemAudio(c),
            'add':      (c) => this.handleAdd(c),
            'queue':    (c) => this.handleQueue(c),
            'seek':     (c) => this.handleSeek(c),
            'pause':    (c) => this.handlePause(c),
            'resume':   (c) => this.handleResume(c),
            'skip':     (c) => this.handleSkip(c),
            'stop':     (c) => this.handleStop(c),
            'volume':   (c) => this.handleVolume(c),
            'commands': (c) => this.handleCommands(c),
        }
    }

    async handleMessage(data) {
        const command = new CommandProcessor(data);
        try {
            const handler = this.commandsMap[command.cmd];
            if (handler) {
                await handler(command); // Ensure async handlers are awaited
            } else {
                command.textChannel.send(`Error: Unknown command ${command.cmd}`);
            }
        } catch (error) {
            console.error(`Error handling command ${command.cmd}:`, error);
            command.textChannel.send(`Error: Command ${command.cmd} failed.`);
        }
    }

    async handlePlay(command) {
        const url = command.args[0];
        if (!url) {
            command.textChannel.send("Error: No URL provided.");
            return;
        }

        try {
            const playing = this.player.playing();
            const connected = await this.player.join(command.voiceChannel);

            if (!connected) {
                command.textChannel.send("Error: Bot didn't join the channel.");
                return;
            }

            if (playing) {
                command.textChannel.send("Adding to queue...");
            } else {
                command.textChannel.send("Starting playback...");
            }

            const video = this.player.add(url);
            if (video.videoDetails?.title) {
                command.textChannel.send(`Queued: ${video.videoDetails.title}`);
            }

            if (!playing) {
                await this.player.stream();
            }
        } catch (error) {
            console.error('Error while playing:', error);
            command.textChannel.send("Error: Unable to play the requested URL.");
        }
    }

    async handleSystemAudio(command){
        try{
            const playing = this.player.playing();
            if(playing){
                this.player.finish();
            }
            const connected = await this.player.join(command.voiceChannel);
            if (!connected) {
                command.textChannel.send("Error: Bot didn't join the channel.");
                return;
            }
            await this.player.streamSystemAudio();
        } catch (error) {
            console.error('Error while playing system audio:', error);
            command.textChannel.send("Error: Unable to play system audio.");
        }
    }

    handleAdd(command) {
        const url = command.args[0];
        if (!url) {
            command.textChannel.send("Error: No URL provided.");
            return;
        }

        try {
            const video = this.player.add(url);
            if (video.videoDetails?.title) {
                command.textChannel.send(`Added to queue: ${video.videoDetails.title}`);
            } else {
                command.textChannel.send("Added to queue: URL");
            }
        } catch (error) {
            console.error('Error while adding to queue:', error);
            command.textChannel.send("Error: Unable to add the URL to the queue.");
        }
    }

    async handleQueue(command) {
        try {
            const queue = this.player.get(); // Assuming this returns an array of queued items or URLs
            if (queue.length === 0) {
                command.textChannel.send("The queue is empty.");
            } else {
                let queueMessage = 'Current queue:\n';
                queue.forEach((item, index) => {
                    queueMessage += `${index + 1}. ${item}\n`; // Modify as per your Player class structure
                });
                command.textChannel.send(queueMessage);
            }
        } catch (error) {
            console.error('Error while fetching queue:', error);
            command.textChannel.send("Error: Unable to fetch the current queue.");
        }
    }    
    async handleSeek(command) {
        // TODO: check if seconds are longer than the song playing at the moment
        const seekTime = parseInt(command.args[0], 10);
        if (isNaN(seekTime) || seekTime < 0) {
            command.textChannel.send("Error: Seek time must be a positive number.");
            return;
        }
        try {
            await this.player.seek(seekTime);
            command.textChannel.send(`Skipped to ${seekTime} seconds.`);
        } catch (error) {
            console.error('Error while seeking:', error);
            command.textChannel.send("Error: Unable to seek the track.");
        }
    }

    handlePause(command) {
        try {
            const paused = this.player.pause();
            if (paused) {
                command.textChannel.send("Playback paused.");
            } else {
                command.textChannel.send("Error: Unable to pause playback.");
            }
        } catch (error) {
            console.error('Error while pausing:', error);
            command.textChannel.send("Error: Unable to pause playback.");
        }
    }

    handleResume(command) {
        try {
            const resumed = this.player.resume();
            if (resumed) {
                command.textChannel.send("Playback resumed.");
            } else {
                command.textChannel.send("Error: Unable to resume playback.");
            }
        } catch (error) {
            console.error('Error while resuming:', error);
            command.textChannel.send("Error: Unable to resume playback.");
        }
    }

    async handleSkip(command) {
        try {
            await this.player.skip();
            command.textChannel.send("Skipped current track.");
        } catch (error) {
            console.error('Error while skipping:', error);
            command.textChannel.send("Error: Unable to skip track.");
        }
    }

    handleStop(command) {
        try {
            this.player.finish();
            command.textChannel.send("Playback stopped and bot disconnected.");
        } catch (error) {
            console.error('Error while stopping:', error);
            command.textChannel.send("Error: Unable to stop playback.");
        }
    }

    handleVolume(command) {
        const volume = parseInt(command.args[0], 10);
        if (Number.isNaN(volume) || volume < 1 || volume > 100) {
            command.textChannel.send("Error: Volume must be a number between 1 and 100.");
            return;
        }

        try {
            this.player.volume(volume);
            command.textChannel.send(`Volume set to ${volume}.`);
        } catch (error) {
            console.error('Error while setting volume:', error);
            command.textChannel.send("Error: Unable to set volume.");
        }
    }

    handleCommands(command) {
        const commandsList = Object.keys(this.commandsMap).join(', ');
        command.textChannel.send(`Available commands: ${commandsList}`);
    }
}
