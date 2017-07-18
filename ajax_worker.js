
// https://code.tutsplus.com/articles/data-structures-with-javascript-stack-and-queue--cms-23348
function Queue() {
    this._oldestIndex = 1;
    this._newestIndex = 1;
    this._storage = {};
}

Queue.prototype.size = function() {
    return this._newestIndex - this._oldestIndex;
};

Queue.prototype.isEmpty = function() {
	return 0 == this.size();
};

Queue.prototype.enqueue = function(data) {
    this._storage[this._newestIndex] = data;
    this._newestIndex++;
};

Queue.prototype.dequeue = function() {
    var oldestIndex = this._oldestIndex,
        newestIndex = this._newestIndex,
        deletedData;

    if (oldestIndex !== newestIndex) {
        deletedData = this._storage[oldestIndex];
        delete this._storage[oldestIndex];
        this._oldestIndex++;

        return deletedData;
    }
};


var busy = false;
var queue = new Queue();

onmessage = function(e) {
    var data = e.data;
    queue.enqueue(data);
    if (!busy) {
        busy = true;
        processQueue();
    }
}

processQueue = function() {
    var data = queue.dequeue();
    sendRequest(data);
}

responseHandler = function(id, error, results) {
    postMessage(
        {
            id: id,
            error: error,
            results: results
        }
    );
    if (0 < queue.size()) {
        processQueue();
    } else {
        busy =false;
    }
}

function sendRequest(args) {
    console.log(args);
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (4 == this.readyState) {
            if (200 == this.status) {
                responseHandler(args.id, null, this.responseText);
            } else {
                console.log(this.readyState, this.status);
                responseHandler(args.id, this.responseText, null);
            }
        }
    };
    var async = true;
    xhttp.open(args.method, args.url, async);
    xhttp.setRequestHeader('Content-Type', args.opts.contentType);
    xhttp.send(args.content);
}
