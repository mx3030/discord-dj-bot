import Discord from 'discord.js';

export class CommandProcessor {
    constructor(msg) {
        if (!(msg instanceof Discord.Message)) {
            throw new Error('Argument 1 is not an instance of Message!');
        }
        const prefix = '!';
        const text = msg.content;
        if(text.startsWith(prefix)){
            this._voiceChannel = msg.member.voice.channel;
            this._textChannel = msg.channel;
            this.textArr = text.trim().substring(prefix.length).split(/\s+/);
            this._cmd = this.textArr[0];
            this._args = this.textArr.slice(1);
        } else {
            this._cmd = null;
            this._args = [];
        } 
    }

    /**
     * Get all arguments as an array.
     * @returns {Array}
     */
    get args() {
        return this._args;
    }

    /**
     * Get the command.
     * @returns {string}
     */
    get cmd() {
        return this._cmd;
    }

    /**
     * Get the entire command object with command and arguments.
     * @returns {Object}
     */
    get all() {
        return {
            command: this._cmd,
            arguments: this._args
        };
    }

    get voiceChannel() {
        return this._voiceChannel;
    }

    get textChannel(){
        return this._textChannel;
    }

    /**
     * Check if a specific argument exists.
     * @param {string} arg The argument to check.
     * @returns {boolean}
     */
    hasArg(arg) {
        return this.arguments.includes(arg);
    }
}
