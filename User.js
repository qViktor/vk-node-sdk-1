'use strict'

const API = require('./API')
const Utils = require('./utils')

class User {

	constructor(token) {
        this.API = new API(typeof token === 'object' ? token : [token])
        this.LastMentions = []
	}

    onMentions(owner_id, callback) {
        var self = this
        if (self.LastMentions.length >= 500) self.LastMentions = self.LastMentions.slice(500)
        self.api('newsfeed.getMentions', {count: 50, owner_id: owner_id}, (data) => {
            setTimeout(() => {
                self.onMentions(owner_id, callback)
            }, 3000)
            if (data && data.items && data.items.length > 0) {
                for (var i = data.items.length - 1; i >= 0; i--) {
                    let post = data.items[i]
                    let object_id = post.post_type + '_' + post.to_id + '_' + post.id + '_' + post.from_id + '_' + post.date
                    if (self.LastMentions.indexOf(object_id) == -1) {
                        self.LastMentions.push(object_id)
                        if (1800 >= Math.abs(post.date - Utils.time())) callback(post)
                    }
                }
            }
        })
    }

    api(method, params, callback) {
        callback = callback || Function()
        return this.API.api(method, params, (data) => {
            if (data && data.error) {
                callback(false)
            } else {
                callback(data)
            }
        })
    }
}

module.exports = User