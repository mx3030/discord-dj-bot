import { CommandProcessor } from './commandProcessor.js';
import { Player } from '../player/player.js';

export class CommandHandler {
    constructor(player) {
        this.player = player;
    }

    async handleMessage(data) {
        const command = new CommandProcessor(data);
        try {
            switch (command.cmd) {
                case 'play':
                    await this.handlePlay(command);
                    break;
                case 'system':
                    await this.handleSystemAudio(command);
                    break;
                case 'add':
                    this.handleAdd(command);
                    break;
                case 'pause':
                    this.handlePause(command);
                    break;
                case 'resume':
                    this.handleResume(command);
                    break;
                case 'skip':
                    await this.handleSkip(command);
                    break;
                case 'stop':
                    this.handleStop(command);
                    break;
                case 'volume':
                    this.handleVolume(command);
                    break;
                default:
                    command.textChannel.send(`Unknown command: ${command.cmd}`);
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
}
