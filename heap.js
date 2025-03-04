class Heap {
    constructor() {
        this.heap = [];
    }

    push(item) {
        this.heap.push(item);
        this._heapifyUp();
    }

    pop() {
        if (this.heap.length === 0) return null;

        const root = this.heap[0];
        const last = this.heap.pop();

        if (this.heap.length > 0) {
            this.heap[0] = last;
            this._heapifyDown();
        }

        return root;
    }

    _heapifyUp() {
        let index = this.heap.length - 1;

        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.heap[index] >= this.heap[parentIndex]) break;

            [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
            index = parentIndex;
        }
    }

    _heapifyDown() {
        let index = 0;
        const length = this.heap.length;

        while (index < length) {
            let leftChildIndex = 2 * index + 1;
            let rightChildIndex = 2 * index + 2;
            let smallest = index;

            if (leftChildIndex < length && this.heap[leftChildIndex] < this.heap[smallest]) {
                smallest = leftChildIndex;
            }

            if (rightChildIndex < length && this.heap[rightChildIndex] < this.heap[smallest]) {
                smallest = rightChildIndex;
            }

            if (smallest === index) break;

            [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
            index = smallest;
        }
    }

    size() {
        return this.heap.length;
    }

    peek() {
        return this.heap[0];
    }
}

const heap = new Heap();
heap.push(10);
heap.push(5);
heap.push(15);

console.log(heap.pop());
console.log(heap.peek());
console.log(heap.size());
