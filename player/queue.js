export class Queue {
    constructor() {
        this.queue = [];
    }

    /**
     * Add URL to the queue.
     * @param {string} url string
     * @return {object} video details
     */
    add(url) {
        // Adding URL to the queue
        this.queue.push(url);
        return { url, index: this.queue.length - 1 };
    }

    /**
     * Get queue items.
     * @return {object} url strings in queue
     */
    get() {
        return this.queue;
    }

    /**
     * Get the length of the queue.
     * @return {number} length
     **/
    length() {
        return this.queue.length;
    }

    /**
     * Clear the queue completely.
     **/
    clear() {
        this.queue = [];
    }

    /**
     * Remove an item from the right side of the queue (newest one).
     **/
    pop() {
        return this.queue.pop();
    }

    /**
     * Remove an item from the left side of the queue (oldest one).
     **/
    shift() {
        return this.queue.shift();
    }

    /**
     * Remove an item from the queue at a specific index.
     * @param {number} index of the queue item to remove
     **/
    remove(index) {
        if (index >= 0 && index < this.queue.length) {
            return this.queue.splice(index, 1)[0];
        }
        return null;
    }

    /**
     * Move queue item to another place.
     * @param {number} oldIndex The old index.
     * @param {number} newIndex The new index.
     **/
    move(oldIndex, newIndex) {
        if (oldIndex >= 0 && oldIndex < this.queue.length && newIndex >= 0 && newIndex < this.queue.length) {
            const [movedItem] = this.queue.splice(oldIndex, 1);
            this.queue.splice(newIndex, 0, movedItem);
        }
    }
}
