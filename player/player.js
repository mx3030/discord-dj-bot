import ytdl from 'ytdl-core-discord';
import { Queue } from './queue.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } from '@discordjs/voice';
import { spawn } from 'child_process';
import { Readable, pipeline, Transform } from 'stream';
import prism from 'prism-media';

export class Player extends Queue {
    constructor() {
        super();
        this.connection = null;
        this.audio = createAudioPlayer();
        this.bitstream = null;
        this.currentVolume = 50;
        this.isSkipping = false;
        this.connectionState = 'disconnected';
        this.retryAttempts = 0; // Initialize retry attempts

        this.audio.on(AudioPlayerStatus.Idle, async () => {
            if (this.isSkipping) return;
            await this._handleIdle();
        });

        this.audio.on('error', async (error) => {
            console.error('Audio player error:', error);
            await this.skip();
        });
    }

    async join(channel) {
        try {
            this.connection = await joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });

            this.connection.on(VoiceConnectionStatus.Ready, () => {
                console.log('The bot has connected to the channel!');
                this.connectionState = 'connected';
            });

            this.connection.on(VoiceConnectionStatus.Disconnected, () => {
                console.log('The bot has been disconnected from the channel.');
                this.connectionState = 'disconnected';
            });
 
            return true;
        } catch (error) {
            console.error('Error while joining voice channel:', error);
            return false;
        }
    }

    async stream() {
        try {
            const queue = this.get();
            const item = queue[0];

            if (!item) {
                return false;
            }

            this.bitstream = await ytdl(item, { highWaterMark: 1 << 25 });

            //this.bitstream = ytdl(item, {
                //filter: "audioonly",
                //fmt: "mp3",
                //highWaterMark: 1 << 62,
                //liveBuffer: 1 << 62,
                //dlChunkSize: 0, //disabling chunking is recommended in discord bot
                //bitrate: 128,
                //quality: "lowestaudio",
            //});

            const resource = createAudioResource(this.bitstream, {
                inputType: 'opus',
                inlineVolume: true,
            });

            if (resource.volume) {
                resource.volume.setVolume(this.currentVolume / 100);
            }

            this.audio.play(resource);
            this.connection.subscribe(this.audio);

            this.retryAttempts = 0; // Reset retry attempts on successful stream

            return true;
        } catch (error) {
            console.error('Error while streaming:', error);
            await this._handleStreamError();
            return false;
        }
    }

    async streamSystemAudio() {
        try {
            
            console.log('Starting FFmpeg process to capture system audio and encode to Opus.');

            // Start FFmpeg process to capture system audio
            const ffmpeg = spawn('ffmpeg', [
                '-f', 'pulse',              // Input format (replace with appropriate for your OS)
                '-i', 'default',            // Input device (replace with specific device name if needed)
                '-c:a', 'pcm_s16le',        // Codec for audio (16-bit PCM, little-endian)
                '-ar', '48000',             // Audio sampling rate (48 kHz)
                '-ac', '2',                 // Audio channels (stereo)
                '-f', 's16le',              // Output format (16-bit little-endian PCM)
                'pipe:1'                    // Output to stdout
            ]);
            
            //const customTransformStream = new Transform({
                //highWaterMark: 32 * 1024 * 1024,  
                //transform(chunk, encoding, callback) {
                    //this.push(chunk);
                    //callback();
                //}
            //});
            //ffmpeg.stdout.pipe(customTransformStream);
            
            const ffmpegStream = new Readable().wrap(ffmpeg.stdout);
            
            const opusEncoder = new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 });

            this.bitstream = pipeline(
                ffmpegStream,
                opusEncoder,
                () => {}
            );
 
            const resource = createAudioResource(this.bitstream, {
                inputType: 'opus',  // Specify the input type as Opus
                inlineVolume: true,
            });

           if (resource.volume) {
                resource.volume.setVolume(this.currentVolume / 100);
            }

            this.audio.play(resource)
            this.connection.subscribe(this.audio);

            return true;
        } catch (error) {
            console.error('Error streaming system audio:', error);
            return false;
        }
    }

    async skip() {
        try {
            this.isSkipping = true;
            this.audio.stop();
            this.shift();
            if (this.length() > 0) {
                await this.stream();
            } else {
                this.finish();
            }
            this.isSkipping = false;
        } catch (error) {
            console.error('Error during skip operation:', error);
            this.isSkipping = false;
        }
    }

    playing() {
        return this.audio.state.status === AudioPlayerStatus.Playing;
    }

    pause(duration = false) {
        if (!this.audio) return -1;

        this.audio.pause();

        let durationInt = parseInt(duration);

        if (!Number.isNaN(durationInt)) {
            durationInt = Math.min(durationInt, 1440); // 24 hours limit

            const minutesToMilli = durationInt * 60 * 1000;
            setTimeout(() => this.resume(), minutesToMilli);
            return durationInt;
        }

        return 0;
    }

    resume() {
        if (this.audio.state.status === AudioPlayerStatus.Paused) {
            this.audio.unpause();
            return true;
        }
        return false;
    }

    volume(value) {
        if (Number.isInteger(value) && value >= 1 && value <= 100) {
            this.currentVolume = value;
            if (this.audio.state.resource?.volume) {
                this.audio.state.resource.volume.setVolume(value / 100);
            }
            return value;
        } else {
            return false;
        }
    }

    getVolume() {
        return this.currentVolume;
    }

    finish() {
        try {
            this.audio.stop();
            if (this.connectionState === 'connected') {
                this.connection?.destroy();
                this.connectionState = 'destroyed'; 
            }
            this.bitstream?.destroy();
        } catch (error) {
            console.error('Error during finish operation:', error);
        }
        return true;
    }

    async _handleIdle() {
        this.shift();
        if (this.length() > 0) {
            await this.stream();
        } else {
            this.finish();
        }
    }

    async _handleStreamError() { 
        if (this.retryAttempts < 3) { 
            console.log(`Retrying streaming... Attempt ${this.retryAttempts + 1}`);
            this.retryAttempts += 1;
            setTimeout(async () => await this.stream(), 1000); 
        } else {
            console.error('Maximum retry attempts reached. Skipping to next track.');
            this.retryAttempts = 0; 
            await this.skip(); 
        }
    }
}
