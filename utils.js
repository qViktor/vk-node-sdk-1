'use strict'

const http = require('http')
const https = require('https')
const url = require('url')
const fs = require('fs')

class Utils {

	request(request_url, options, callback, attempt) {
		let self = this
		callback = callback || Function()
        attempt = attempt || 0
        attempt++
        if (attempt > 5) {
            callback(false, false)
            return
        }
        let url_parse = url.parse(request_url)
        let sendOptions = {
            host: url_parse.host,
            path: url_parse.path,
            port: url_parse.protocol == 'http:' ? 80 : 443,
            method: options.method || 'GET',
            headers: {'User-Agent': 'VK Bot lib 0.0.1'}
        }
        if (sendOptions.method == 'GET' && options.params) {
        	sendOptions.path += '?' + self.toURL(options.params)
        }
        let protocol = (url_parse.protocol == 'http:' ? http : https)
        let request = protocol.request(sendOptions, (response) => {
            var chunks = []
            response.on('data', (chunk) => {
                chunks.push(chunk)
            })
            response.on('end', () => {
            	if (options.encode) {
            		callback(Buffer.concat(chunks).toString('utf-8'), response)
            	} else {
            		callback(Buffer.concat(chunks), response)
            	}
            })
        })
        request.on('error', (e) => {
            setTimeout(() => {
                self.request(request_url, options, callback, attempt)
            }, self.rand(1000, 5000))
        })
        if (options.method == 'POST' && options.multipart) {
        	let field = Object.keys(options.multipart)[0]
        	let data = options.multipart[field]
        	if (data.file) {
        		data.buffer = fs.readFileSync(data.file)
        		delete data.file
        	}
        	let boundaryKey = '----WebKitFormBoundary' + self.rand() + 'time' + self.time()
        	let header = self.multipartHeader(boundaryKey, field, data) 
        	let endBoundary = "\r\n--" + boundaryKey + "--\r\n"
        	let length = Buffer.byteLength(data.buffer) + header.length + endBoundary.length
        	request.setHeader('Content-Type', 'multipart/form-data; boundary="' + boundaryKey + '"')
        	request.setHeader('Content-Length', length)
        	request.write(header)
        	request.write(data.buffer)
        	request.write(endBoundary)
        	request.end()
        } else if (options.method == 'POST' && options.params) {
        	request.setHeader('Content-Type', 'application/x-www-form-urlencoded')
        	let postbody = self.toURL(options.params)
            request.setHeader('Content-Length', Buffer.byteLength(postbody))
        	request.end(postbody)
        } else {
        	request.setHeader('Content-Length', 0)
        	request.end()
        }
	}

	multipartHeader(boundaryKey, field, data) {
		var header = "Content-Disposition: form-data; name=\"" + field + 
  	            "\"; filename=\"" + (data.filename || 'file') + "\"\r\n" +
  	            "Content-Length: " + data.buffer.length + "\r\n" +
  	            "Content-Transfer-Encoding: binary\r\n" + 
  	            "Content-Type: " + (data.mimetype || 'application/octet-stream');
  	    return "--" + boundaryKey + "\r\n" + header + "\r\n\r\n";
	}

	getBuffer(request_url, params, callback) {
		callback = callback || Function()
		let options = {
			method: 'POST'
		}
		if (!Object.keys(params).length) {
			options.method = 'GET'
		} else {
			options.params = params
		}
		this.request(request_url, options, callback)
	}

	upload(server, params, callback) {
		callback = callback || Function()
		let options = {
			method: 'POST',
			encode: true,
			multipart: params
		}
		this.request(server, options, callback)
    }

	post(request_url, params, callback) {
		callback = callback || Function()
		let options = {
			method: 'POST',
			params: params,
			encode: true
		}
		this.request(request_url, options, callback)
    }

    get(request_url, params, callback, attempt) {
    	callback = callback || Function()
		let options = {
			method: 'GET',
			params: params,
			encode: true
		}
		this.request(request_url, options, callback)
    }

    toURL(params) {
        return Object.keys(params).map((key) => {
            return encodeURIComponent(key) + "=" + encodeURIComponent(params[key])
        }).join('&')
    }

    rand(low, high) {
        low = low || 0
        high = high || (9 * 1000000)
        let r = Math.floor(Math.random() * (high - low + 1) + low)
        return r
    }

    randIndex(items) {
        return this.rand(0, Math.abs(items.length - 1))
    }

    time() {
        return Math.round(new Date().getTime() / 1000)
    }

    jsonFromFile(file) {
        return JSON.parse(fs.readFileSync(file, 'utf8'))
    }
    
    intval(value) {
        if (value === true) return 1
        value = parseInt(value) || 0
        return value == NaN ? 0 : value
    }
}

module.exports = new Utils()