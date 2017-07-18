

function WorkerPool(numWorkers) {
    this._workers = [];
    this._c = 0;
    if (numWorkers) {
        for (var i=0; i<numWorkers; i++) {
            this.addWorker();
        }
    }
    this._cache = {};
}

WorkerPool.prototype.size = function() {
    return Object.keys(this._workers).length;
}

WorkerPool.prototype.addWorker = function() {
    var pool = this;

    var worker = new Worker("/static/moonshadow/ajax_worker.js");

    // worker._callbacks = {};
    worker.apiserver = "https://192.168.0.28:443";
    worker.api_key = "nltltolzwqzzomnpytsurxvozrlntzom";
    worker.secret_token = "vnkzmplunrutzzmuxyuwsqzlxukmvryk";

    worker.onmessage = function(event) {
        var self = this;
        if (event.data) {
            var job = pool._cache[event.data.id];
            job.error = event.data.error;
            job.results = event.data.results;

            while (0 != job.callbacks.length) {
                var callback = job.callbacks.shift();
                callback(event.data.error, event.data.results);
            }
            // delete self._callbacks[event.data.id];
        }
    }

    /**
     *	Internet Timestamp Generator
     *	Copyright (c) 2009 Sebastiaan Deckers
     *	License: GNU General Public License version 3 or later
     *	http://cbas.pandion.im/2009/10/generating-rfc-3339-timestamps-in.html
     *  http://stackoverflow.com/questions/2573521/how-do-i-output-an-iso-8601-formatted-string-in-javascript
     */
    worker._timestamp = function (date) {
        date = date ? date : new Date();
        function pad(n) {return n<10 ? '0'+n : n}
        return date.getUTCFullYear()+'-'
             + pad(date.getUTCMonth()+1)+'-'
             + pad(date.getUTCDate())+'T'
             + pad(date.getUTCHours())+':'
             + pad(date.getUTCMinutes())+':'
             + pad(date.getUTCSeconds())+'Z'
    },

    // http://docs.db4iot.com/
    worker._authentication = function(method, content, contentType, date, path) {
        var string_to_sign = method + "\n";
        if (content != "") {
            string_to_sign += md5(content) + "\n";
        }
        else {
            string_to_sign += "\n";
        }
        string_to_sign += contentType + "\n";
        string_to_sign += date + "\n";
        string_to_sign += path;
        var shaObj = new jsSHA("SHA-512", "TEXT");
        shaObj.setHMACKey(this.secret_token, "TEXT");
        shaObj.update(string_to_sign);
        var hmac = shaObj.getHMAC("B64");
        return encodeURIComponent(hmac);
    }

    worker.analyze = function(query, callback) {
    	var content = JSON.stringify({
    		"data": query
    	});
    	var url = "/v1/datasource/" + payload.datasource_id + "/analyze";
    	var date = this._timestamp();
    	var hmac_sig = this._authentication('POST', content, 'text/plain; charset=UTF-8', date, url);
    	this.runAjax(
    		this.apiserver + url + "?X-D4i-Date=" + date + "&X-D4i-APIKey=" + this.api_key + "&X-D4i-Signature=" + hmac_sig,
    		'POST',
    		content,
    		{
    			contentType: 'text/plain; charset=UTF-8',
    			dataType: 'text'
    		},
    		callback
    	);
    };

    worker.runAjax = function(url, method, content, opts, callback) {
        // var callbackKey = md5(JSON.stringify([content, url]));
        var jobKey = md5(JSON.stringify([content]));

        if (pool._cache[jobKey]) {
            var error = pool._cache[jobKey].error;
            var results = pool._cache[jobKey].results;
            if (error || results) {
                callback(error, results);
            } else {
                pool._cache[jobKey].callbacks.push(callback);
            }
            return;
        }

        pool._cache[jobKey] = {
            callbacks: [callback],
            error: null,
            results: null
        };
        this.postMessage({
            url: url,
            method: method,
            content: content,
            opts: opts,
            id: jobKey
        });
    }

    this._workers.push(worker);
}

WorkerPool.prototype.removeWorker = function() {
    var worker = this._workers.slice();
    worker.terminate();
    worker = undefined;
}

WorkerPool.prototype.addJob = function(query, callback) {
    this._workers[this._c].analyze(query, callback);
    this._c++;
    this._c = this._c % this.size();
}













var pool = new WorkerPool(4);

var payload = {
    "method": "export_csv",
    "datasource_id": "ec52ba62-bc9c-4a09-ab71-f8a688082c93",
    "columns": [
        {column_id: "event_timestamp"},
        {column_id: "location"},
        {column_id: "speed"}
    ],
    "event_timestamp_begin": 1492338000,
    "event_timestamp_end": 1492338066,
    "filter": {logical: "and", conditions: []}
}

pool.addJob(
    payload,
    function(error,results){
        console.log(error, results);
    }
);
